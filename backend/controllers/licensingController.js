const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const LicensingPricing = require("../models/LicensingPricing");
const LicensingLead = require("../models/LicensingLead");
const LicensingCapability = require("../models/LicensingCapability");
const LicensingGroup = require("../models/LicensingGroup");
const LicensingContent = require("../models/LicensingContent");
const { calculate, buildLockedModel, buildSalesPayload, fmt } = require("../utils/licensingEngine");
const { sendEmail } = require("../utils/mailer");
const { sendTemplate } = require("../utils/mailPortal");
const { buildLicensingMailFields } = require("../utils/licensingMailPayload");
const {
  DEFAULT_PRICING,
  CURRENCY_CODES,
  CAPABILITIES,
  CAPABILITY_IDS,
  GROUPS,
  COLLAPSIBLE,
  GROUP_SUB,
  TIER_TAG,
  APP_NAME,
  APP_SHORT,
  REVENUE_BANDS,
  REVENUE_BAND_IDS,
  FO_MIN_SEATS,
  INPUT_LIMITS,
  DEFAULT_CONTENT,
  SCM_FORCING_CAPS,
  WAREHOUSE_EXTENSIONS,
} = require("../config/licensingCatalog");

const loadPricing = async () => {
  const docs = await LicensingPricing.find().lean();
  const byCode = Object.fromEntries(docs.map((d) => [d.code, d]));

  const missing = CURRENCY_CODES.filter((c) => !byCode[c]);
  if (missing.length) {
    try {
      const seeded = await LicensingPricing.insertMany(
        missing.map((c) => DEFAULT_PRICING[c]),
        { ordered: false }
      );
      seeded.forEach((d) => {
        byCode[d.code] = d.toObject();
      });
    } catch {
      // A concurrent request won the unique index. Fall back to defaults.
      missing.forEach((c) => {
        if (!byCode[c]) byCode[c] = DEFAULT_PRICING[c];
      });
    }
  }

  if (!Object.values(byCode).some((d) => d.isDefault)) {
    await Promise.all(
      CURRENCY_CODES.filter((code) => byCode[code]?._id).map((code) =>
        LicensingPricing.updateOne(
          { code },
          {
            $set: {
              countries: DEFAULT_PRICING[code].countries,
              isDefault: DEFAULT_PRICING[code].isDefault,
            },
          }
        )
      )
    ).catch(() => {});
    CURRENCY_CODES.forEach((code) => {
      if (byCode[code]) {
        byCode[code].countries = DEFAULT_PRICING[code].countries;
        byCode[code].isDefault = DEFAULT_PRICING[code].isDefault;
      }
    });
  }

  return Object.fromEntries(
    CURRENCY_CODES.map((code) => {
      const d = byCode[code] || DEFAULT_PRICING[code];
      return [
        code,
        {
          code: d.code,
          symbol: d.symbol,
          verified: d.verified,
          trusted: !!d.trusted,
          countries: d.countries || [],
          isDefault: !!d.isDefault,
          bc: { essentials: d.bc.essentials, premium: d.bc.premium, team: d.bc.team, device: d.bc.device },
          fo: {
            base: d.fo.base,
            premiumBase: d.fo.premiumBase,
            attach: d.fo.attach,
            activity: d.fo.activity,
            team: d.fo.team,
            device: d.fo.device,
          },
        },
      ];
    })
  );
};

const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-appengine-country",
  "x-country-code",
  "x-geo-country",
];

const countryFromRequest = (req) => {
  for (const h of COUNTRY_HEADERS) {
    const v = req.headers[h];
    if (v && /^[A-Za-z]{2}$/.test(v) && v.toUpperCase() !== "XX") return v.toUpperCase();
  }
  // e.g. "en-GB,en;q=0.9" -> GB
  const lang = req.headers["accept-language"] || "";
  const m = lang.match(/[a-z]{2}-([A-Z]{2})/);
  return m ? m[1] : null;
};

const resolveDefaultCurrency = (pricing, req) => {
  const entries = Object.values(pricing);
  const country = countryFromRequest(req);
  if (country) {
    const hit = entries.find((p) => (p.countries || []).includes(country));
    if (hit) return hit.code;
  }
  return entries.find((p) => p.isDefault)?.code || entries[0]?.code || "USD";
};

const orderedCurrencies = (pricing) =>
  [...CURRENCY_CODES].sort(
    (a, b) => (pricing[b]?.isDefault ? 1 : 0) - (pricing[a]?.isDefault ? 1 : 0)
  );

const resolveCurrency = (value, fallback = "USD") =>
  CURRENCY_CODES.includes(String(value || "").toUpperCase()) ? String(value).toUpperCase() : fallback;

const seedCatalogue = async () => {
  const [capCount, groupCount] = await Promise.all([
    LicensingCapability.estimatedDocumentCount(),
    LicensingGroup.estimatedDocumentCount(),
  ]);

  if (!groupCount) {
    await LicensingGroup.insertMany(
      GROUPS.map((name, i) => ({
        name,
        subtitle: GROUP_SUB[name] || "",
        collapsible: COLLAPSIBLE.includes(name),
        sortOrder: i,
      })),
      { ordered: false }
    ).catch(() => {});
  }

  if (!capCount) {
    await LicensingCapability.insertMany(
      CAPABILITIES.map((c, i) => ({
        capId: c.id,
        group: c.group,
        label: c.label,
        note: c.note || "",
        tier: c.tier,
        fo: c.fo || "",
        app: c.app || null,
        forcesScmAttach: SCM_FORCING_CAPS.includes(c.id),
        isWarehouseExtension: WAREHOUSE_EXTENSIONS.includes(c.id),
        sortOrder: i,
      })),
      { ordered: false }
    ).catch(() => {});
  }
};

/* Shapes the DB rows into exactly what the engine and the rate card expect. */
const loadCatalogue = async () => {
  await seedCatalogue();

  const [capDocs, groupDocs] = await Promise.all([
    LicensingCapability.find({ active: true }).sort({ sortOrder: 1, label: 1 }).lean(),
    LicensingGroup.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean(),
  ]);

  const capabilities = capDocs.map((c) => ({
    id: c.capId,
    group: c.group,
    label: c.label,
    note: c.note,
    tier: c.tier,
    ...(c.fo ? { fo: c.fo } : {}),
    ...(c.app ? { app: c.app } : {}),
  }));

  const named = groupDocs.map((g) => g.name);
  const orphans = [...new Set(capabilities.map((c) => c.group))].filter((g) => !named.includes(g));

  return {
    capabilities,
    groups: [...named, ...orphans],
    groupSub: Object.fromEntries(groupDocs.filter((g) => g.subtitle).map((g) => [g.name, g.subtitle])),
    collapsible: groupDocs.filter((g) => g.collapsible).map((g) => g.name),
    scmForcingCaps: capDocs.filter((c) => c.forcesScmAttach).map((c) => c.capId),
    warehouseExtensions: capDocs.filter((c) => c.isWarehouseExtension).map((c) => c.capId),
    foMinSeats: FO_MIN_SEATS,
    appName: APP_NAME,
  };
};

const mergeContent = (saved = {}) =>
  Object.fromEntries(
    Object.entries(DEFAULT_CONTENT).map(([section, fields]) => [
      section,
      Object.fromEntries(
        Object.entries(fields).map(([k, fallback]) => {
          const value = saved?.[section]?.[k];
          return [k, typeof value === "string" && value.trim() !== "" ? value : fallback];
        })
      ),
    ])
  );

const loadContent = async () => {
  let doc = await LicensingContent.findOne({ key: "default" }).lean();
  if (!doc) {
    try {
      doc = (await LicensingContent.create({ key: "default", ...DEFAULT_CONTENT })).toObject();
    } catch {
      // a concurrent request won the unique index
      doc = await LicensingContent.findOne({ key: "default" }).lean();
    }
  }
  return mergeContent(doc);
};

/* What the engine needs, without the presentation-only fields. */
const engineCtx = (cat) => ({
  capabilities: cat.capabilities,
  scmForcingCaps: cat.scmForcingCaps,
  warehouseExtensions: cat.warehouseExtensions,
  foMinSeats: cat.foMinSeats,
  appName: cat.appName,
});

const GATE_ENABLED = process.env.LICENSING_GATE_PRICING !== "false";

const UNLOCK_TTL = process.env.LICENSING_UNLOCK_TTL || "12h";

const signUnlockToken = (leadId) =>
  jwt.sign({ sub: String(leadId), scope: "licensing-unlock" }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: UNLOCK_TTL,
  });

const hasUnlockToken = (req) => {
  const token = req.headers["x-unlock-token"] || req.body?.unlockToken;
  if (!token) return false;
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET).scope === "licensing-unlock";
  } catch {
    return false;
  }
};

const isGated = (req) => GATE_ENABLED && !req.user && !hasUnlockToken(req);

const stripRates = (pricing) =>
  Object.fromEntries(
    Object.entries(pricing).map(([code, p]) => [
      code,
      { code: p.code, symbol: p.symbol, verified: p.verified, trusted: p.trusted },
    ])
  );

// GET /api/public/licensing/catalog
const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const groupCapabilities = (cat) =>
  (cat.groups || []).map((group) => ({
    name: group,
    id: slug(group),
    sub: (cat.groupSub || {})[group] || null,
    collapsible: (cat.collapsible || []).includes(group),
    group: (cat.capabilities || [])
      .filter((c) => c.group === group)
   
      .map(({ id, label, note, tier, fo, app }) => ({
        id,
        label,
        note,
        tier,
        ...(fo ? { fo } : {}),
        ...(app ? { app } : {}),
      })),
  }));

const buildSections = (content) => {
  const s = content.sections || {};
  const st = content.steppers || {};
  const lim = INPUT_LIMITS;

  const num = (key, label, extra = {}) => ({
    key,
    type: "number",
    label,
    ...(lim[key] || {}),
    ...extra,
  });

  return [
    {
      id: "shape-of-the-business",
      name: s.shapeTitle,
      sub: null,
      fields: [
        num("entities", s.entitiesLabel),
        num("countries", s.countriesLabel),
        {
          key: "revenue",
          type: "choice",
          label: s.revenueLabel,
          options: REVENUE_BANDS,
        },
      ],
    },
    {
      id: "who-touches-the-system",
      name: s.usersTitle,
      sub: s.usersSubtitle,
      fields: [
        // `emphasis` drives the larger treatment on the primary stepper.
        num("fullUsers", st.fullLabel, { hint: st.fullHint, emphasis: true }),
        num("teamUsers", st.teamLabel, { hint: st.teamHint }),
        num("deviceUsers", st.deviceLabel, { hint: st.deviceHint }),
        // Only meaningful once the answer is Finance & Operations.
        num("activityUsers", st.activityLabel, {
          hint: st.activityHint,
          showWhen: "platform:fo",
        }),
      ],
    },
  ];
};

const statementView = (model) => ({
  currency: model.currency,
  symbol: model.symbol,
  platform: model.platform,
  platformLabel: model.platformLabel,
  tier: model.tier,
  lines: model.lines,
  monthly: model.monthly,
  annual: model.annual,
  threeYear: model.threeYear,
  foMinSeats: model.foMinSeats,
  foMinimumApplied: model.foMinimumApplied,
  // the two blocks under the totals
  beyondDrivers: model.beyondDrivers,
  extensions: model.extensions,
  // drives the footnote
  pricingVerified: model.pricingVerified,
  pricingTrusted: model.pricingTrusted,
});

exports.getCatalog = async (req, res) => {
  try {
    const [pricing, cat, content] = await Promise.all([loadPricing(), loadCatalogue(), loadContent()]);
    const gated = isGated(req);
    // sections and steppers are emitted as the grouped `sections` array below,
    // so they are not repeated inside `content`.
    const { sections: _s, steppers: _st, ...copy } = content;

    res.json({
      gated,
      content: copy,
      pricing: gated ? stripRates(pricing) : pricing,
      currencies: orderedCurrencies(pricing),
      defaultCurrency: resolveDefaultCurrency(pricing, req),
      // Admin-managed, read live from the database. Grouped rather than flat so
      // the client renders straight from it with nothing to join.
      capabilities: groupCapabilities(cat),
      sections: buildSections(content),
      // the id lists the preview engine needs, so the client holds no rules of its own
      scmForcingCaps: cat.scmForcingCaps,
      warehouseExtensions: cat.warehouseExtensions,
      foMinSeats: cat.foMinSeats,
      appName: cat.appName,
      tierTag: TIER_TAG,
      appShort: APP_SHORT,
    });
  } catch (err) {
    console.error("[licensing] catalog error:", err);
    res.status(500).json({ message: "Failed to load the licence rate card" });
  }
};

// POST /api/public/licensing/calculate
exports.calculateQuote = async (req, res) => {
  try {
    // Gated: the verdict is computed without touching a rate, so nothing
    // priced is serialised at all.
    const cat = await loadCatalogue();

    if (isGated(req)) {
      return res.json({ gated: true, model: buildLockedModel(req.body, engineCtx(cat)) });
    }

    const pricing = await loadPricing();
    const currency = resolveCurrency(req.body.currency, resolveDefaultCurrency(pricing, req));
    const lead = req.body.lead && typeof req.body.lead === "object" ? req.body.lead : {};

    const model = calculate(req.body, pricing[currency], lead, engineCtx(cat));
    res.json({ gated: false, model: statementView(model) });
  } catch (err) {
    console.error("[licensing] calculate error:", err);
    res.status(500).json({ message: "Failed to price the licence statement" });
  }
};

exports.leadValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }),
  body("email").trim().isEmail().withMessage("Valid email is required").isLength({ max: 200 }),
  body("company").optional().trim().isLength({ max: 150 }),
  body("phone").optional().trim().isLength({ max: 30 }),
  body("renewal").optional().trim().isLength({ max: 60 }),
  body("source").optional().trim().isLength({ max: 200 }),
  body("currency").optional().isIn(CURRENCY_CODES).withMessage("Unsupported currency"),
  body("revenue").optional().isIn(REVENUE_BAND_IDS).withMessage("Unknown revenue band"),
  body("capabilities").optional().isArray({ max: CAPABILITY_IDS.length }).withMessage("Invalid capability list"),
];

const leadEmailHtml = (lead, model, payload) => {
  const s = model.symbol;
  const row = (k, v) =>
    `<tr><td style="padding: 7px 0; color: #64748b; width: 150px; vertical-align: top;">${k}</td><td style="padding: 7px 0; color: #0f172a;">${v}</td></tr>`;

  const lineRows = model.lines
    .map(
      (l) =>
        `<tr><td style="padding: 6px 0; color: #0f172a;">${l.qty} &times; ${l.label}</td><td style="padding: 6px 0; color: #0f172a; text-align: right; font-variant-numeric: tabular-nums;">${s}${fmt(l.total)}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; color: #ffffff; font-size: 18px;">🧮 Licence Rate Card Enquiry</h2>
        <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 12px;">${model.platformLabel} &middot; ${s}${fmt(model.annual)} per year</p>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${row("Name", lead.name)}
          ${row("Email", `<a href="mailto:${lead.email}" style="color: #2563eb;">${lead.email}</a>`)}
          ${lead.company ? row("Company", lead.company) : ""}
          ${lead.phone ? row("Phone", lead.phone) : ""}
          ${lead.renewal ? row("Renewal", lead.renewal) : ""}
        </table>

        <h3 style="font-size: 13px; color: #0f172a; margin: 20px 0 6px;">Licence statement (${model.currency})</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${lineRows || `<tr><td style="color: #94a3b8;">No users entered</td></tr>`}
          <tr><td style="padding: 10px 0 0; border-top: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">Per year</td><td style="padding: 10px 0 0; border-top: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: 600;">${s}${fmt(model.annual)}</td></tr>
          <tr><td style="padding: 4px 0; color: #64748b;">Over three years</td><td style="padding: 4px 0; text-align: right; color: #64748b;">${s}${fmt(model.threeYear)}</td></tr>
        </table>

        ${
          model.extensions.length
            ? `<h3 style="font-size: 13px; color: #0f172a; margin: 20px 0 6px;">Quoted separately</h3><p style="font-size: 12px; color: #475569; margin: 0;">${model.extensions.map((e) => e.label).join(", ")}</p>`
            : ""
        }
        ${
          model.applicationsRequired.length
            ? `<h3 style="font-size: 13px; color: #0f172a; margin: 20px 0 6px;">Applications required</h3><p style="font-size: 12px; color: #475569; margin: 0;">${model.applicationsRequired.join(", ")}</p>`
            : ""
        }

        <h3 style="font-size: 13px; color: #0f172a; margin: 20px 0 6px;">CRM payload</h3>
        <pre style="background: #0f172a; color: #c9d6c9; font-size: 11px; padding: 12px; border-radius: 6px; overflow-x: auto;">${JSON.stringify(payload, null, 2)}</pre>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Automated notification from Dynamics Square CMS. List prices ${
          model.pricingTrusted ? `verified ${model.pricingVerified}` : "are placeholders pending verification"
        }.</p>
      </div>
    </div>
  `;
};

// POST /api/public/licensing/lead
exports.submitLead = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  try {
    const { name, email, company = "", phone = "", renewal = "", source = "" } = req.body;
    const contact = { name, email, company, phone, renewal };

    const [pricing, cat] = await Promise.all([loadPricing(), loadCatalogue()]);
    const currency = resolveCurrency(req.body.currency, resolveDefaultCurrency(pricing, req));

    // Price it here rather than trusting the browser.s numbers.
    const model = calculate(req.body, pricing[currency], contact, engineCtx(cat));
    const payload = buildSalesPayload(model, contact);

    const lead = await LicensingLead.create({
      name,
      email,
      company,
      phone,
      renewal,
      source: source || "licence-rate-card",

      capabilities: model.input.capabilities,
      entities: model.input.entities,
      countries: model.input.countries,
      revenueBand: model.input.revenue,
      fullUsers: model.input.fullUsers,
      teamUsers: model.input.teamUsers,
      deviceUsers: model.input.deviceUsers,
      activityUsers: model.input.activityUsers,

      currency: model.currency,
      platform: model.platform,
      tier: model.tier,
      lines: model.lines,
      monthlyTotal: model.monthly,
      annualTotal: model.annual,
      threeYearTotal: model.threeYear,
      premiumDrivers: model.premiumDrivers.map((d) => d.label),
      escalationDrivers: payload.escalation_drivers,
      applicationsRequired: model.applicationsRequired,
      extensionsRequired: model.extensions.map((e) => e.label),
      pricingVerified: model.pricingVerified,
      pricingTrusted: model.pricingTrusted,

      ip: req.ip,
      userAgent: (req.headers["user-agent"] || "").slice(0, 400),
    });

    const adminEmail =
      process.env.LEAD_NOTIFY_EMAIL || process.env.SEED_ADMIN_EMAIL || "admin@dynamicssquare.com";

    // Sent after the reply, not before it: the lead is already saved, and an
    // unreachable SMTP host takes about a minute to give up - long enough to
    // look like a broken form.
    sendEmail({
      to: adminEmail,
      subject: `Licence enquiry: ${name}${company ? ` – ${company}` : ""} – ${model.symbol}${fmt(
        model.annual
      )}/yr`,
      html: leadEmailHtml(contact, model, payload),
    }).catch((mailErr) => {
      console.error("[licensing] notification email failed:", mailErr.message);
    });
    (async () => {
      try {
        const capDocs = await LicensingCapability.find({ capId: { $in: lead.capabilities || [] } })
          .select("capId label group tier")
          .lean();
        const details = (lead.capabilities || []).map((id) => {
          const d = capDocs.find((c) => c.capId === id);
          return d ? { id, label: d.label, group: d.group, tier: d.tier } : { id, label: id, group: "Other" };
        });

        const fields = buildLicensingMailFields({ lead, model, details, source, internalTo: adminEmail });

        await Promise.all([
          sendTemplate("licensingInternal", fields.internal),
          sendTemplate("licensingCustomer", fields.customer),
        ]);
      } catch (err) {
        console.error("[licensing] mail portal send failed:", err.message);
      }
    })();

    res.status(201).json({
      message: "Thank you! Your breakdown is on its way.",
      id: lead._id,
      // unlocks live repricing from here on
      unlockToken: signUnlockToken(lead._id),
      // The rates this was priced against, unstripped. Submitting is what
      // unlocks pricing, so returning the card here saves the client an
      // immediate re-fetch of /catalog just to carry on repricing.
      currency,
      pricing,
      model: statementView(model),
    });
  } catch (err) {
    console.error("[licensing] lead error:", err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// GET /api/licensing/leads?search=&status=&platform=&page=&limit=
exports.listLeads = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      platform = "",
      currency = "",
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (search) {
      const rx = { $regex: search, $options: "i" };
      query.$or = [{ name: rx }, { email: rx }, { company: rx }];
    }
    if (status) query.status = status;
    if (platform) query.platform = platform;
    if (currency) query.currency = currency.toUpperCase();

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

    const [items, total] = await Promise.all([
      LicensingLead.find(query)
        .select("-lines")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      LicensingLead.countDocuments(query),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("[licensing] listLeads error:", err);
    res.status(500).json({ message: "Failed to load licence enquiries" });
  }
};

// GET /api/licensing/leads/stats
exports.getLeadStats = async (req, res) => {
  try {
    const [total, byStatus, byPlatform, pipeline, recent] = await Promise.all([
      LicensingLead.countDocuments(),
      LicensingLead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      LicensingLead.aggregate([{ $group: { _id: "$platform", count: { $sum: 1 } } }]),
      LicensingLead.aggregate([
        { $group: { _id: "$currency", annualValue: { $sum: "$annualTotal" }, count: { $sum: 1 } } },
      ]),
      LicensingLead.find()
        .select("name email company platform annualTotal currency status createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const asMap = (rows) => Object.fromEntries(rows.filter((r) => r._id).map((r) => [r._id, r.count]));

    res.json({
      total,
      byStatus: asMap(byStatus),
      byPlatform: asMap(byPlatform),
      pipelineByCurrency: pipeline
        .filter((r) => r._id)
        .map((r) => ({ currency: r._id, annualValue: Math.round(r.annualValue), count: r.count })),
      recent,
    });
  } catch (err) {
    console.error("[licensing] getLeadStats error:", err);
    res.status(500).json({ message: "Failed to load licence enquiry stats" });
  }
};

// GET /api/licensing/leads/:id
exports.getLead = async (req, res) => {
  try {
    const lead = await LicensingLead.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ message: "Enquiry not found" });

    const docs = await LicensingCapability.find({ capId: { $in: lead.capabilities || [] } })
      .select("capId label note tier group")
      .lean();
    const byId = Object.fromEntries(docs.map((d) => [d.capId, d]));

    lead.capabilityDetails = (lead.capabilities || []).map((id) =>
      byId[id]
        ? { id, label: byId[id].label, note: byId[id].note, tier: byId[id].tier, group: byId[id].group }
        : { id, label: id, tier: "unknown", group: "No longer in the catalogue", missing: true }
    );

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: "Failed to load the enquiry" });
  }
};

// PATCH /api/licensing/leads/:id
exports.updateLead = async (req, res) => {
  try {
    const lead = await LicensingLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Enquiry not found" });

    const { status, notes } = req.body;
    if (status !== undefined) {
      if (!["new", "contacted", "qualified", "closed"].includes(status)) {
        return res.status(400).json({ message: "Unknown status" });
      }
      lead.status = status;
    }
    if (notes !== undefined) lead.notes = String(notes).slice(0, 2000);

    await lead.save();
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: "Failed to update the enquiry" });
  }
};

// DELETE /api/licensing/leads/:id
exports.deleteLead = async (req, res) => {
  try {
    const lead = await LicensingLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Enquiry not found" });
    await lead.deleteOne();
    res.json({ message: "Enquiry deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete the enquiry" });
  }
};

// GET /api/licensing/pricing
exports.listPricing = async (req, res) => {
  try {
    const pricing = await loadPricing();
    res.json({ pricing, currencies: orderedCurrencies(pricing), defaults: DEFAULT_PRICING });
  } catch (err) {
    console.error("[licensing] listPricing error:", err);
    res.status(500).json({ message: "Failed to load licence pricing" });
  }
};

const BC_KEYS = ["essentials", "premium", "team", "device"];
const FO_KEYS = ["base", "premiumBase", "attach", "activity", "team", "device"];

const readRates = (source = {}, keys, current = {}) => {
  const out = {};
  for (const key of keys) {
    const raw = source[key];
    if (raw === undefined) {
      out[key] = current[key];
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { error: `"${key}" must be a positive number` };
    out[key] = n;
  }
  return { rates: out };
};

// PUT /api/licensing/pricing/:currency
exports.updatePricing = async (req, res) => {
  try {
    const code = String(req.params.currency || "").toUpperCase();
    if (!CURRENCY_CODES.includes(code)) {
      return res.status(400).json({ message: "Unsupported currency" });
    }

    let doc = await LicensingPricing.findOne({ code });
    if (!doc) doc = new LicensingPricing(DEFAULT_PRICING[code]);

    const bc = readRates(req.body.bc, BC_KEYS, doc.bc?.toObject?.() || doc.bc);
    if (bc.error) return res.status(400).json({ message: bc.error });
    const fo = readRates(req.body.fo, FO_KEYS, doc.fo?.toObject?.() || doc.fo);
    if (fo.error) return res.status(400).json({ message: fo.error });

    doc.bc = bc.rates;
    doc.fo = fo.rates;
    if (req.body.symbol !== undefined) doc.symbol = String(req.body.symbol).slice(0, 5);
    if (req.body.verified !== undefined) doc.verified = String(req.body.verified).slice(0, 60);
    if (req.body.trusted !== undefined) doc.trusted = !!req.body.trusted;

    if (req.body.countries !== undefined) {
      const list = Array.isArray(req.body.countries)
        ? req.body.countries
        : String(req.body.countries).split(/[,\s]+/);
      const cleaned = [...new Set(list.map((s) => String(s).trim().toUpperCase()).filter((s) => /^[A-Z]{2}$/.test(s)))];
      doc.countries = cleaned;
    }

    if (req.body.isDefault !== undefined) doc.isDefault = !!req.body.isDefault;
    doc.updatedBy = req.user?._id;

    await doc.save();

    // Exactly one currency may be the fallback, so clear the others.
    if (doc.isDefault) {
      await LicensingPricing.updateMany({ _id: { $ne: doc._id } }, { $set: { isDefault: false } });
    }
    res.json({ pricing: doc });
  } catch (err) {
    console.error("[licensing] updatePricing error:", err);
    res.status(500).json({ message: "Failed to update licence pricing" });
  }
};

// POST /api/licensing/pricing/:currency/reset — back to the catalogue defaults
exports.resetPricing = async (req, res) => {
  try {
    const code = String(req.params.currency || "").toUpperCase();
    if (!CURRENCY_CODES.includes(code)) {
      return res.status(400).json({ message: "Unsupported currency" });
    }

    const defaults = DEFAULT_PRICING[code];
    const doc = await LicensingPricing.findOneAndUpdate(
      { code },
      { ...defaults, updatedBy: req.user?._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ pricing: doc });
  } catch (err) {
    console.error("[licensing] resetPricing error:", err);
    res.status(500).json({ message: "Failed to reset licence pricing" });
  }
};

const CAP_TIERS = ["essentials", "premium", "addon", "beyond"];
const CAP_APPS = ["finance", "scm", "commerce", "hr"];

// GET /api/licensing/capabilities
exports.listCapabilities = async (req, res) => {
  try {
    await seedCatalogue();
    const [capabilities, groups] = await Promise.all([
      LicensingCapability.find().sort({ sortOrder: 1, label: 1 }).lean(),
      LicensingGroup.find().sort({ sortOrder: 1, name: 1 }).lean(),
    ]);
    res.json({ capabilities, groups, tiers: CAP_TIERS, apps: CAP_APPS });
  } catch (err) {
    console.error("[licensing] listCapabilities error:", err);
    res.status(500).json({ message: "Failed to load the capability catalogue" });
  }
};

/* Reads the editable fields off the body, leaving anything absent untouched. */
const applyCapabilityFields = (doc, body) => {
  if (body.group !== undefined) doc.group = String(body.group).trim();
  if (body.label !== undefined) doc.label = String(body.label).trim();
  if (body.note !== undefined) doc.note = String(body.note).trim();
  if (body.tier !== undefined) doc.tier = body.tier;
  if (body.fo !== undefined) doc.fo = String(body.fo).trim();
  if (body.app !== undefined) doc.app = body.app || null;
  if (body.forcesScmAttach !== undefined) doc.forcesScmAttach = !!body.forcesScmAttach;
  if (body.isWarehouseExtension !== undefined) doc.isWarehouseExtension = !!body.isWarehouseExtension;
  if (body.sortOrder !== undefined) doc.sortOrder = Number(body.sortOrder) || 0;
  if (body.active !== undefined) doc.active = !!body.active;
};

const validateCapability = (doc) => {
  if (!doc.capId) return "An id is required";
  if (!doc.label) return "A label is required";
  if (!doc.group) return "A group is required";
  if (!CAP_TIERS.includes(doc.tier)) return `Tier must be one of: ${CAP_TIERS.join(", ")}`;
  // A "beyond" capability drives the Finance & Operations mapping, so it needs one.
  if (doc.tier === "beyond" && !doc.app) return 'A "Finance & Ops" capability needs an application';
  if (doc.app && !CAP_APPS.includes(doc.app)) return `App must be one of: ${CAP_APPS.join(", ")}`;
  return null;
};

// POST /api/licensing/capabilities
exports.createCapability = async (req, res) => {
  try {
    const capId = String(req.body.capId || "").trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(capId)) {
      return res.status(400).json({ message: "Id must use lowercase letters, numbers and underscores only" });
    }
    if (await LicensingCapability.findOne({ capId })) {
      return res.status(409).json({ message: `A capability with the id "${capId}" already exists` });
    }

    const doc = new LicensingCapability({ capId });
    applyCapabilityFields(doc, req.body);
    const invalid = validateCapability(doc);
    if (invalid) return res.status(400).json({ message: invalid });

    if (req.body.sortOrder === undefined) {
      const last = await LicensingCapability.findOne().sort({ sortOrder: -1 }).lean();
      doc.sortOrder = (last?.sortOrder ?? 0) + 1;
    }
    doc.updatedBy = req.user?._id;

    await doc.save();
    res.status(201).json({ capability: doc });
  } catch (err) {
    console.error("[licensing] createCapability error:", err);
    res.status(500).json({ message: "Failed to create the capability" });
  }
};

// PUT /api/licensing/capabilities/:id
exports.updateCapability = async (req, res) => {
  try {
    const doc = await LicensingCapability.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Capability not found" });

    applyCapabilityFields(doc, req.body);
    const invalid = validateCapability(doc);
    if (invalid) return res.status(400).json({ message: invalid });

    doc.updatedBy = req.user?._id;
    await doc.save();
    res.json({ capability: doc });
  } catch (err) {
    console.error("[licensing] updateCapability error:", err);
    res.status(500).json({ message: "Failed to update the capability" });
  }
};

// DELETE /api/licensing/capabilities/:id
exports.deleteCapability = async (req, res) => {
  try {
    const doc = await LicensingCapability.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Capability not found" });

    const used = await LicensingLead.countDocuments({ capabilities: doc.capId });
    if (used > 0 && req.query.force !== "true") {
      doc.active = false;
      doc.updatedBy = req.user?._id;
      await doc.save();
      return res.json({
        message: `Used by ${used} enquir${used === 1 ? "y" : "ies"}, so it has been hidden rather than deleted.`,
        capability: doc,
        deactivated: true,
      });
    }

    await doc.deleteOne();
    res.json({ message: "Capability deleted", id: req.params.id });
  } catch (err) {
    console.error("[licensing] deleteCapability error:", err);
    res.status(500).json({ message: "Failed to delete the capability" });
  }
};

// PUT /api/licensing/capabilities/reorder  { order: [{ id, sortOrder, group }] }
exports.reorderCapabilities = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order) || !order.length) {
      return res.status(400).json({ message: "Expected an array of { id, sortOrder }" });
    }

    await LicensingCapability.bulkWrite(
      order.map((o) => ({
        updateOne: {
          filter: { _id: o.id },
          update: {
            $set: {
              sortOrder: Number(o.sortOrder) || 0,
              ...(o.group ? { group: String(o.group).trim() } : {}),
            },
          },
        },
      })),
      { ordered: false }
    );

    res.json({ message: "Order saved" });
  } catch (err) {
    console.error("[licensing] reorderCapabilities error:", err);
    res.status(500).json({ message: "Failed to save the new order" });
  }
};

/* ---- groups ---- */

// POST /api/licensing/groups
exports.createGroup = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "A group name is required" });
    if (await LicensingGroup.findOne({ name })) {
      return res.status(409).json({ message: "A group with that name already exists" });
    }

    const last = await LicensingGroup.findOne().sort({ sortOrder: -1 }).lean();
    const group = await LicensingGroup.create({
      name,
      subtitle: String(req.body.subtitle || "").trim(),
      collapsible: !!req.body.collapsible,
      sortOrder: req.body.sortOrder !== undefined ? Number(req.body.sortOrder) || 0 : (last?.sortOrder ?? 0) + 1,
      updatedBy: req.user?._id,
    });
    res.status(201).json({ group });
  } catch (err) {
    console.error("[licensing] createGroup error:", err);
    res.status(500).json({ message: "Failed to create the group" });
  }
};

// PUT /api/licensing/groups/:id
exports.updateGroup = async (req, res) => {
  try {
    const group = await LicensingGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const previousName = group.name;
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: "A group name is required" });
      const clash = await LicensingGroup.findOne({ name, _id: { $ne: group._id } });
      if (clash) return res.status(409).json({ message: "A group with that name already exists" });
      group.name = name;
    }
    if (req.body.subtitle !== undefined) group.subtitle = String(req.body.subtitle).trim();
    if (req.body.collapsible !== undefined) group.collapsible = !!req.body.collapsible;
    if (req.body.sortOrder !== undefined) group.sortOrder = Number(req.body.sortOrder) || 0;
    if (req.body.active !== undefined) group.active = !!req.body.active;
    group.updatedBy = req.user?._id;

    await group.save();

    // Capabilities reference their group by name, so carry the rename across.
    let moved = 0;
    if (group.name !== previousName) {
      const r = await LicensingCapability.updateMany({ group: previousName }, { $set: { group: group.name } });
      moved = r.modifiedCount || 0;
    }

    res.json({ group, moved });
  } catch (err) {
    console.error("[licensing] updateGroup error:", err);
    res.status(500).json({ message: "Failed to update the group" });
  }
};

// DELETE /api/licensing/groups/:id
exports.deleteGroup = async (req, res) => {
  try {
    const group = await LicensingGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const inUse = await LicensingCapability.countDocuments({ group: group.name });
    if (inUse > 0) {
      return res.status(400).json({
        message: `${inUse} capabilit${inUse === 1 ? "y" : "ies"} still sit in this group. Move them first.`,
      });
    }

    await group.deleteOne();
    res.json({ message: "Group deleted", id: req.params.id });
  } catch (err) {
    console.error("[licensing] deleteGroup error:", err);
    res.status(500).json({ message: "Failed to delete the group" });
  }
};

// GET /api/licensing/content
exports.getContent = async (req, res) => {
  try {
    res.json({ content: await loadContent(), defaults: DEFAULT_CONTENT });
  } catch (err) {
    console.error("[licensing] getContent error:", err);
    res.status(500).json({ message: "Failed to load the rate card copy" });
  }
};

// PUT /api/licensing/content
exports.updateContent = async (req, res) => {
  try {
    const incoming = req.body?.content;
    if (!incoming || typeof incoming !== "object") {
      return res.status(400).json({ message: "Expected a content object" });
    }

    const doc = (await LicensingContent.findOne({ key: "default" })) || new LicensingContent({ key: "default" });

    for (const [section, fields] of Object.entries(DEFAULT_CONTENT)) {
      if (!incoming[section] || typeof incoming[section] !== "object") continue;
      for (const key of Object.keys(fields)) {
        const value = incoming[section][key];
        if (value === undefined) continue;
        doc.set(`${section}.${key}`, String(value).slice(0, 2000));
      }
    }
    doc.updatedBy = req.user?._id;

    await doc.save();
    res.json({ content: mergeContent(doc.toObject()) });
  } catch (err) {
    console.error("[licensing] updateContent error:", err);
    res.status(500).json({ message: "Failed to save the rate card copy" });
  }
};

// POST /api/licensing/content/reset — back to the shipped wording
exports.resetContent = async (req, res) => {
  try {
    await LicensingContent.findOneAndUpdate(
      { key: "default" },
      { ...DEFAULT_CONTENT, updatedBy: req.user?._id },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ content: await loadContent() });
  } catch (err) {
    console.error("[licensing] resetContent error:", err);
    res.status(500).json({ message: "Failed to reset the rate card copy" });
  }
};

exports.loadPricing = loadPricing;
exports.loadCatalogue = loadCatalogue;
exports.loadContent = loadContent;
