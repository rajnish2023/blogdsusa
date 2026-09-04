const {
  CAPABILITIES,
  CAPABILITY_MAP,
  FO_MIN_SEATS,
  APP_NAME,
  SCM_FORCING_CAPS,
  WAREHOUSE_EXTENSIONS,
  INPUT_LIMITS,
  REVENUE_BAND_IDS,
} = require("../config/licensingCatalog");

const fmt = (n) =>
  n % 1 === 0
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const clamp = (value, { min, max }) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
};

const makeCtx = (ctx = {}) => {
  const capabilities = ctx.capabilities?.length ? ctx.capabilities : CAPABILITIES;
  return {
    capabilities,
    capabilityMap: Object.fromEntries(capabilities.map((c) => [c.id, c])),
    foMinSeats: ctx.foMinSeats ?? FO_MIN_SEATS,
    appName: ctx.appName ?? APP_NAME,
    scmForcingCaps: ctx.scmForcingCaps ?? SCM_FORCING_CAPS,
    warehouseExtensions: ctx.warehouseExtensions ?? WAREHOUSE_EXTENSIONS,
  };
};

const normaliseInput = (raw = {}, ctx) => {
  const { capabilityMap } = makeCtx(ctx);
  const capabilities = Array.isArray(raw.capabilities) ? raw.capabilities : [];
  const seen = new Set();
  const caps = [];
  for (const id of capabilities) {
    if (typeof id !== "string" || !capabilityMap[id] || seen.has(id)) continue;
    seen.add(id);
    caps.push(id);
  }

  const revenue = REVENUE_BAND_IDS.includes(raw.revenue) ? raw.revenue : "5_25";

  return {
    capabilities: caps,
    entities: clamp(raw.entities ?? 1, INPUT_LIMITS.entities),
    countries: clamp(raw.countries ?? 1, INPUT_LIMITS.countries),
    revenue,
    fullUsers: clamp(raw.fullUsers ?? 0, INPUT_LIMITS.fullUsers),
    teamUsers: clamp(raw.teamUsers ?? 0, INPUT_LIMITS.teamUsers),
    deviceUsers: clamp(raw.deviceUsers ?? 0, INPUT_LIMITS.deviceUsers),
    activityUsers: clamp(raw.activityUsers ?? 0, INPUT_LIMITS.activityUsers),
  };
};

const resolveVerdict = (rawInput, ctx) => {
  const cx = makeCtx(ctx);
  const input = normaliseInput(rawInput, cx);
  const { capabilities, entities, countries, revenue, fullUsers } = input;

  const capSet = new Set(capabilities);
  const chosen = cx.capabilities.filter((x) => capSet.has(x.id));
  const premiumDrivers = chosen.filter((c) => c.tier === "premium");
  const beyondDrivers = chosen.filter((c) => c.tier === "beyond");
  const extensions = chosen.filter((c) => c.tier === "addon");

  const scaleEscalation = [];
  if (fullUsers >= 150) scaleEscalation.push(`${fullUsers} full users`);
  if (entities >= 10) scaleEscalation.push(`${entities} legal entities`);
  if (revenue === "100p") scaleEscalation.push("revenue over 100m");
  if (countries >= 5) scaleEscalation.push(`operations in ${countries} countries`);

  const platform = beyondDrivers.length || scaleEscalation.length ? "fo" : "bc";
  const tier = premiumDrivers.length ? "premium" : "essentials";

  return {
    input, capSet, chosen, premiumDrivers, beyondDrivers, extensions, scaleEscalation,
    platform,
    tier,
    platformLabel:
      platform === "fo"
        ? "Finance & Operations"
        : `Business Central ${tier === "premium" ? "Premium" : "Essentials"}`,
  };
};

/* Everything a gated visitor is allowed to see: the verdict, nothing priced. */
const buildLockedModel = (rawInput, ctx) => {
  const v = resolveVerdict(rawInput, ctx);
  return {
    gated: true,
    input: v.input,
    platform: v.platform,
    platformLabel: v.platformLabel,
    tier: v.platform === "bc" ? v.tier : null,
  };
};

const calculate = (rawInput, p, lead = {}, ctx) => {
  const cx = makeCtx(ctx);
  const v = resolveVerdict(rawInput, cx);
  const { input, capSet, chosen, premiumDrivers, beyondDrivers, extensions, scaleEscalation, platform, tier } = v;
  const { fullUsers, teamUsers, deviceUsers, activityUsers, entities } = input;

  const lines = [];
  let foMinimumApplied = false;

  if (platform === "bc") {
    const seat = p.bc[tier];
    if (fullUsers > 0)
      lines.push({
        k: "full",
        qty: fullUsers,
        label: tier === "premium" ? "Business Central Premium" : "Business Central Essentials",
        sub: "Full user",
        rate: seat,
      });
    if (teamUsers > 0)
      lines.push({ k: "team", qty: teamUsers, label: "Team Members", sub: "Read, approve, time and expense", rate: p.bc.team });
    if (deviceUsers > 0)
      lines.push({ k: "device", qty: deviceUsers, label: "Device licence", sub: "Shared terminal, unlimited users", rate: p.bc.device });
  } else {
    const needsSCM =
      chosen.some((c) => c.app === "scm" || c.app === "commerce") ||
      chosen.some((x) => cx.scmForcingCaps.includes(x.id));
    const base = p.fo.base;
    const seat = needsSCM ? round2(base + p.fo.attach) : base;

    if (fullUsers > 0) {
      foMinimumApplied = fullUsers < cx.foMinSeats;
      const billed = Math.max(fullUsers, cx.foMinSeats);
      lines.push({
        k: "full",
        qty: billed,
        label: needsSCM ? "Finance + Supply Chain Management" : "Dynamics 365 Finance",
        sub: foMinimumApplied
          ? `${cx.foMinSeats} full-user minimum (you entered ${fullUsers})`
          : needsSCM
          ? `Base ${p.symbol}${fmt(base)} + attach ${p.symbol}${fmt(p.fo.attach)}`
          : "Full user",
        rate: seat,
      });
    }
    if (activityUsers > 0)
      lines.push({ k: "activity", qty: activityUsers, label: "Operations Activity", sub: "Single-function operational access", rate: p.fo.activity });
    if (teamUsers > 0)
      lines.push({ k: "team", qty: teamUsers, label: "Team Members", sub: "Read, approve, time and expense", rate: p.fo.team });
    if (deviceUsers > 0)
      lines.push({ k: "device", qty: deviceUsers, label: "Operations Device", sub: "Shared terminal, unlimited users", rate: p.fo.device });
  }

  lines.forEach((l) => {
    l.rate = round2(l.rate);
    l.total = round2(l.qty * l.rate);
  });

  const monthly = round2(lines.reduce((s, l) => s + l.total, 0));
  const annual = round2(monthly * 12);
  const threeYear = round2(annual * 3);

  // The Finance & Operations applications the beyond-tier picks map onto.
  const applicationsRequired = [...new Set(beyondDrivers.map((d) => cx.appName[d.app]).filter(Boolean))];

  return {
    input,
    currency: p.code,
    symbol: p.symbol,
    pricingVerified: p.verified,
    pricingTrusted: p.trusted,
    platform,
    platformLabel:
      platform === "fo"
        ? "Finance & Operations"
        : `Business Central ${tier === "premium" ? "Premium" : "Essentials"}`,
    tier: platform === "bc" ? tier : null,
    lines,
    monthly,
    annual,
    threeYear,
    foMinSeats: cx.foMinSeats,
    foMinimumApplied,
    premiumDrivers: premiumDrivers.map((d) => ({ id: d.id, label: d.label })),
    beyondDrivers: beyondDrivers.map((d) => ({ id: d.id, label: d.label, fo: d.fo, app: d.app })),
    extensions: extensions.map((e) => ({ id: e.id, label: e.label })),
    scaleEscalation,
    applicationsRequired,
  };
};

const buildSalesPayload = (model, lead = {}) => ({
  platform: model.platform === "fo" ? "Finance & Operations" : "Business Central",
  tier: model.tier,
  premium_drivers: model.premiumDrivers.map((d) => d.label),
  escalation_drivers: [
    ...model.beyondDrivers.map((d) => `${d.label} → ${d.fo}`),
    ...model.scaleEscalation,
  ],
  applications_required: model.applicationsRequired,
  extensions_required: model.extensions.map((e) => e.label),
  users: {
    full: model.input.fullUsers,
    team: model.input.teamUsers,
    device: model.input.deviceUsers,
    activity: model.input.activityUsers,
  },
  entities: model.input.entities,
  countries: model.input.countries,
  revenue_band: model.input.revenue,
  annual_licence_value: Number(model.annual.toFixed(2)),
  currency: model.currency,
  renewal_month: lead.renewal || null,
});

module.exports = { calculate, resolveVerdict, buildLockedModel, buildSalesPayload, normaliseInput, fmt, round2 };
