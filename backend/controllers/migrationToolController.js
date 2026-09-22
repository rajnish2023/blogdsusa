const { body, validationResult } = require("express-validator");
const MigrationLead = require("../models/MigrationLead");
const { assess, fmt } = require("../utils/migrationEngine");
const {
  SOURCES, SOURCE_GROUPS, SOURCE_IDS, COMPLEXITY, COMPLEXITY_IDS, BANDS,
  CUSTOMISATIONS, HISTORY, IT, YEARS, GOLIVE, BUDGET, ROUTING, DEFAULT_CONTENT, bandIds,
} = require("../config/migrationCatalog");
const { CURRENCY_CODES, FO_MIN_SEATS } = require("../config/licensingCatalog");
// Rates are the licence tool's, so the two tools can never disagree on a seat.
const { loadPricing } = require("./licensingController");
const { sendEmail } = require("../utils/mailer");
const { sendTemplate, htmlRows, esc, titleCase } = require("../utils/mailPortal");

/* ------------------------------------------------------------- currency -- */

const COUNTRY_HEADERS = [
  "cf-ipcountry", "x-vercel-ip-country", "x-appengine-country", "x-country-code", "x-geo-country",
];

const countryFromRequest = (req) => {
  for (const h of COUNTRY_HEADERS) {
    const v = req.headers[h];
    if (v && /^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  }
  return null;
};

/** The visitor's country decides the currency, falling back to the default. */
const resolveDefaultCurrency = (pricing, req) => {
  const entries = Object.values(pricing);
  const country = countryFromRequest(req);
  if (country) {
    const hit = entries.find((p) => (p.countries || []).includes(country));
    if (hit) return hit.code;
  }
  return entries.find((p) => p.isDefault)?.code || entries[0]?.code || "USD";
};

const resolveCurrency = (value, fallback) =>
  CURRENCY_CODES.includes(String(value || "").toUpperCase()) ? String(value).toUpperCase() : fallback;

const orderedCurrencies = (pricing) =>
  [...CURRENCY_CODES].sort((a, b) => (pricing[b]?.isDefault ? 1 : 0) - (pricing[a]?.isDefault ? 1 : 0));

const labelOf = (list, id) => list.find((x) => x.id === id)?.label || "";

/* --------------------------------------------------------------- public -- */

// GET /api/public/migration/catalog
exports.getCatalog = async (req, res) => {
  try {
    const pricing = await loadPricing();
    res.json({
      content: DEFAULT_CONTENT,
      // Grouped so the client renders straight from it with nothing to join.
      sources: SOURCE_GROUPS.map((group) => ({
        group,
        items: SOURCES.filter((s) => s.group === group).map((s) => ({
          id: s.id, label: s.label, target: s.target, weight: s.weight,
        })),
      })),
      // The prose for the chosen source: what the move involves, and the
      // support dates that turn a "later" project into a dated one.
      sourceDetail: Object.fromEntries(
        SOURCES.map((s) => [s.id, { path: s.path, lifecycle: s.lifecycle || null }])
      ),
      complexity: COMPLEXITY,
      bands: BANDS,
      customisations: CUSTOMISATIONS,
      history: HISTORY,
      it: IT,
      years: YEARS,
      golive: GOLIVE,
      budget: BUDGET,
      routing: ROUTING,
      foMinSeats: FO_MIN_SEATS,
      pricing,
      currencies: orderedCurrencies(pricing),
      defaultCurrency: resolveDefaultCurrency(pricing, req),
    });
  } catch (err) {
    console.error("[migration] catalog error:", err);
    res.status(500).json({ message: "Failed to load the migration assessment" });
  }
};

// POST /api/public/migration/assess — the authoritative version of what the
// browser is already showing, used for parity and for anything scripted.
exports.assessQuote = async (req, res) => {
  try {
    const pricing = await loadPricing();
    const currency = resolveCurrency(req.body.currency, resolveDefaultCurrency(pricing, req));
    const model = assess(req.body, pricing[currency], {}, { foMinSeats: FO_MIN_SEATS });
    // Lead scoring is how sales triages the visitor; it is never shown to them.
    const { lead: _internal, ...visible } = model;
    res.json({ currency, model: visible });
  } catch (err) {
    console.error("[migration] assess error:", err);
    res.status(500).json({ message: "Failed to run the assessment" });
  }
};

exports.leadValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }),
  body("email").trim().isEmail().withMessage("Valid email is required").isLength({ max: 200 }),
  body("company").optional().trim().isLength({ max: 150 }),
  body("phone").optional().trim().isLength({ max: 30 }),
  // `source` is the system being left — the same field /assess scores — so a
  // client sends one answers object to both endpoints. `channel` records where
  // the lead came from, and must never share a name with an answer.
  body("source").optional().isIn([...SOURCE_IDS, ""]).withMessage("Unknown source system"),
  body("channel").optional().trim().isLength({ max: 200 }),
  body("currency").optional().isIn(CURRENCY_CODES).withMessage("Unsupported currency"),
  body("complexity").optional().isArray({ max: COMPLEXITY_IDS.length }).withMessage("Invalid requirement list"),
];

const leadEmailHtml = (contact, model, currency) => {
  const row = (k, v) =>
    `<tr><td style="padding:7px 0;color:#64748b;width:170px;vertical-align:top;">${esc(k)}</td><td style="padding:7px 0;color:#0f172a;">${v}</td></tr>`;
  const money = model.licence ? `${model.licence.symbol}${fmt(model.licence.annual)}` : "—";

  return `<div style="font-family:'Segoe UI',sans-serif;font-size:14px;color:#0f172a;">
    <h2 style="margin:0 0 4px;font-size:18px;">${esc(model.verdict)}</h2>
    <p style="margin:0 0 16px;color:#64748b;">Routing score ${model.score} · complexity ${model.complexity}/100 · ${model.minMonths}–${model.maxMonths} months</p>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Name", esc(contact.name))}
      ${row("Email", `<a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>`)}
      ${row("Company", esc(contact.company || "—"))}
      ${row("Phone", esc(contact.phone || "—"))}
      ${row("Currently on", esc(model.input.source ? labelOf(SOURCES, model.input.source) : "—"))}
      ${row("Version", esc(model.input.version || "—"))}
      ${row("Lifecycle exposure", model.lifecycle ? "Yes" : "No")}
      ${row("Decisive requirements", model.decisive.length ? esc(model.decisive.join(", ")) : "—")}
      ${row("Users", `${model.input.fullUsers} full · ${model.input.lightUsers} light`)}
      ${row("Indicative licences", `${money} a year (${currency})`)}
      ${row("Target go-live", esc(labelOf(GOLIVE, model.input.golive)))}
      ${row("Budget", esc(labelOf(BUDGET, model.input.budget)))}
      ${row("Lead score", `${model.lead.score} — ${esc(model.lead.routing)}`)}
    </table>
    ${model.risks.length ? `<h3 style="margin:18px 0 6px;font-size:15px;">Flags</h3><ul style="margin:0;padding-left:18px;color:#334155;">${model.risks.map((r) => `<li style="margin-bottom:4px;"><strong>${esc(r.title)}</strong></li>`).join("")}</ul>` : ""}
  </div>`;
};

// POST /api/public/migration/lead
exports.submitLead = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  try {
    const { name, email, company = "", phone = "", channel = "" } = req.body;
    const contact = { name, email, company, phone };

    const pricing = await loadPricing();
    const currency = resolveCurrency(req.body.currency, resolveDefaultCurrency(pricing, req));
    // Re-run the assessment here rather than trusting the browser's numbers.
    const model = assess(req.body, pricing[currency], contact, { foMinSeats: FO_MIN_SEATS });

    const lead = await MigrationLead.create({
      name, email, company, phone,
      source: channel || "migration-assessment",

      currentSystem: model.input.source,
      currentSystemLabel: labelOf(SOURCES, model.input.source),
      version: model.input.version,
      yearsOnIt: model.input.years,
      usersBand: model.input.users,
      entitiesBand: model.input.entities,
      countriesBand: model.input.countries,
      revenueBand: model.input.revenue,
      volumeBand: model.input.volume,
      requirements: model.input.complexity,
      customisations: model.input.customisations,
      integrations: model.input.integrations,
      history: model.input.history,
      itCapability: model.input.it,
      golive: model.input.golive,
      budget: model.input.budget,
      fullUsers: model.input.fullUsers,
      lightUsers: model.input.lightUsers,

      routingScore: model.score,
      platform: model.platform,
      lean: model.lean,
      verdict: model.verdict,
      decisiveRequirements: model.decisive,
      complexityScore: model.complexity,
      complexityDrivers: model.complexityDrivers,
      minMonths: model.minMonths,
      maxMonths: model.maxMonths,
      timelineConflict: model.timelineConflict,
      lifecycleExposure: !!model.lifecycle,

      currency,
      licenceTier: model.licence?.tier || "",
      billedFullUsers: model.licence?.billedFull || 0,
      monthlyTotal: model.licence?.monthly || 0,
      annualTotal: model.licence?.annual || 0,
      pricingVerified: model.licence?.verified || "",
      pricingTrusted: !!model.licence?.trusted,

      leadScore: model.lead.score,
      leadRouting: model.lead.routing,

      ip: req.ip,
      userAgent: (req.headers["user-agent"] || "").slice(0, 400),
    });

    const adminEmail =
      process.env.LEAD_NOTIFY_EMAIL || process.env.SEED_ADMIN_EMAIL || "admin@dynamicssquare.com";

    // Sent after the reply, not before it: the lead is already saved, and an
    // unreachable SMTP host takes about a minute to give up.
    sendEmail({
      to: adminEmail,
      subject: `Migration assessment: ${name}${company ? ` – ${company}` : ""} – ${model.verdict}`,
      html: leadEmailHtml(contact, model, currency),
    }).catch((mailErr) => console.error("[migration] notification email failed:", mailErr.message));

    // Skipped with a warning until the template ids are configured.
    (async () => {
      try {
        const common = {
          name: titleCase(name),
          customerEmail: email,
          company,
          phone,
          currentSystem: labelOf(SOURCES, model.input.source),
          version: model.input.version || "",
          recommendation: model.verdict,
          complexityScore: String(model.complexity),
          durationMonths: `${model.minMonths}–${model.maxMonths}`,
          annualLicence: model.licence ? `${model.licence.symbol}${fmt(model.licence.annual)}` : "",
          currencyCode: currency,
          reference: String(lead._id),
          submittedAt: new Date(lead.createdAt || Date.now()).toUTCString(),
          shapeData: htmlRows([
            ["Currently on", esc(labelOf(SOURCES, model.input.source))],
            ["Version", esc(model.input.version)],
            ["Full users", model.input.fullUsers],
            ["Light users", model.input.lightUsers],
            ["Legal entities", esc(labelOf(BANDS.entities, model.input.entities))],
            ["Countries", esc(labelOf(BANDS.countries, model.input.countries))],
            ["Integrations", model.input.integrations],
            ["Target go-live", esc(labelOf(GOLIVE, model.input.golive))],
            ["Budget", esc(labelOf(BUDGET, model.input.budget))],
          ]),
        };
        await Promise.all([
          sendTemplate("migrationInternal", {
            ...common,
            title: `New migration assessment — ${titleCase(name)}`,
            leadScore: String(model.lead.score),
            leadRouting: model.lead.routing,
          }),
          sendTemplate("migrationCustomer", { ...common, email, firstName: titleCase(name).split(" ")[0] }),
        ]);
      } catch (err) {
        console.error("[migration] mail portal send failed:", err.message);
      }
    })();

    // The stored lead carries the scoring sales works from; the visitor only
    // needs confirmation, so nothing internal is echoed back.
    res.status(201).json({
      message: "Thank you! Your migration readiness report is on its way.",
      id: lead._id,
    });
  } catch (err) {
    console.error("[migration] lead error:", err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

/* ---------------------------------------------------------------- admin -- */

// GET /api/migration-tool/leads
exports.listLeads = async (req, res) => {
  try {
    const { search = "", status = "", platform = "", page = 1, limit = 20 } = req.query;

    const query = {};
    if (search) {
      const rx = { $regex: search, $options: "i" };
      query.$or = [{ name: rx }, { email: rx }, { company: rx }, { currentSystemLabel: rx }];
    }
    if (status) query.status = status;
    if (platform) query.platform = platform;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

    const [items, total] = await Promise.all([
      MigrationLead.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      MigrationLead.countDocuments(query),
    ]);

    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 });
  } catch (err) {
    console.error("[migration] listLeads error:", err);
    res.status(500).json({ message: "Failed to load migration enquiries" });
  }
};

// GET /api/migration-tool/leads/stats
exports.getLeadStats = async (req, res) => {
  try {
    const [total, byStatus, byPlatform, bySource, pipeline] = await Promise.all([
      MigrationLead.countDocuments(),
      MigrationLead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      MigrationLead.aggregate([{ $group: { _id: "$platform", count: { $sum: 1 } } }]),
      MigrationLead.aggregate([
        { $group: { _id: "$currentSystemLabel", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      MigrationLead.aggregate([
        { $group: { _id: "$currency", annualValue: { $sum: "$annualTotal" }, count: { $sum: 1 } } },
      ]),
    ]);

    const asMap = (rows) => Object.fromEntries(rows.filter((r) => r._id).map((r) => [r._id, r.count]));

    res.json({
      total,
      byStatus: asMap(byStatus),
      byPlatform: asMap(byPlatform),
      topSources: bySource.filter((r) => r._id).map((r) => ({ label: r._id, count: r.count })),
      pipelineByCurrency: pipeline
        .filter((r) => r._id)
        .map((r) => ({ currency: r._id, annualValue: Math.round(r.annualValue), count: r.count })),
    });
  } catch (err) {
    console.error("[migration] getLeadStats error:", err);
    res.status(500).json({ message: "Failed to load migration enquiry stats" });
  }
};

// GET /api/migration-tool/leads/:id
exports.getLead = async (req, res) => {
  try {
    const lead = await MigrationLead.findById(req.params.id).lean();
    if (!lead) return res.status(404).json({ message: "Enquiry not found" });

    // Labels are resolved here so the client holds no copy of the catalogue.
    lead.requirementDetails = (lead.requirements || []).map((id) => {
      const c = COMPLEXITY.find((x) => x.id === id);
      return c
        ? { id, label: c.label, note: c.note, decisive: c.w >= 15 }
        : { id, label: id, missing: true };
    });
    lead.labels = {
      years: labelOf(YEARS, lead.yearsOnIt),
      users: labelOf(BANDS.users, lead.usersBand),
      entities: labelOf(BANDS.entities, lead.entitiesBand),
      countries: labelOf(BANDS.countries, lead.countriesBand),
      revenue: labelOf(BANDS.revenue, lead.revenueBand),
      volume: labelOf(BANDS.volume, lead.volumeBand),
      customisations: labelOf(CUSTOMISATIONS, lead.customisations),
      history: labelOf(HISTORY, lead.history),
      it: labelOf(IT, lead.itCapability),
      golive: labelOf(GOLIVE, lead.golive),
      budget: labelOf(BUDGET, lead.budget),
    };

    res.json({ lead });
  } catch (err) {
    console.error("[migration] getLead error:", err);
    res.status(500).json({ message: "Failed to load the enquiry" });
  }
};

// PATCH /api/migration-tool/leads/:id
exports.updateLead = async (req, res) => {
  try {
    const update = {};
    if (req.body.status !== undefined) update.status = req.body.status;
    if (req.body.notes !== undefined) update.notes = String(req.body.notes).slice(0, 2000);

    const lead = await MigrationLead.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!lead) return res.status(404).json({ message: "Enquiry not found" });

    res.json({ lead });
  } catch (err) {
    console.error("[migration] updateLead error:", err);
    res.status(500).json({ message: "Failed to update the enquiry" });
  }
};

// DELETE /api/migration-tool/leads/:id
exports.deleteLead = async (req, res) => {
  try {
    const lead = await MigrationLead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: "Enquiry not found" });
    res.json({ message: "Enquiry deleted" });
  } catch (err) {
    console.error("[migration] deleteLead error:", err);
    res.status(500).json({ message: "Failed to delete the enquiry" });
  }
};

/* The scoring model, read-only, so the admin can see exactly how the tool
   decides without reading the source. */
exports.getModel = async (req, res) => {
  res.json({
    routing: ROUTING,
    sources: SOURCES.map((s) => ({
      id: s.id, group: s.group, label: s.label, target: s.target, weight: s.weight,
      hasLifecycle: !!s.lifecycle,
    })),
    complexity: COMPLEXITY,
    bands: BANDS,
    customisations: CUSTOMISATIONS,
    history: HISTORY,
    it: IT,
    years: YEARS,
    budget: BUDGET,
    bandIds: Object.fromEntries(Object.keys(BANDS).map((k) => [k, bandIds(k)])),
  });
};
