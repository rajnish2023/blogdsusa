export const fmt = (n) =>
  n % 1 === 0
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const flatCaps = (catalog) =>
  (catalog?.capabilities || []).flatMap((g) =>
    Array.isArray(g.group) ? g.group.map((c) => ({ ...c, group: g.name })) : [g]
  );

export function resolveVerdict(catalog, input) {
  const {
    capabilities = [],
    entities = 1,
    countries = 1,
    revenue = "5_25",
    fullUsers = 0,
  } = input;

  const capSet = capabilities instanceof Set ? capabilities : new Set(capabilities);
  const chosen = flatCaps(catalog).filter((c) => capSet.has(c.id));

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
    gated: true,
    platform,
    tier: platform === "bc" ? tier : null,
    platformLabel:
      platform === "fo"
        ? "Finance & Operations"
        : `Business Central ${tier === "premium" ? "Premium" : "Essentials"}`,
    // counts only — enough to hint at depth without disclosing anything priced
    capabilityCount: chosen.length,
    extensionCount: extensions.length,
    moduleCount: beyondDrivers.length,
  };
}

export function calculate(catalog, p, input, lead = {}) {
  const {
    capabilities = [],
    entities = 1,
    countries = 1,
    revenue = "5_25",
    fullUsers = 0,
    teamUsers = 0,
    deviceUsers = 0,
    activityUsers = 0,
  } = input;

  const capSet = capabilities instanceof Set ? capabilities : new Set(capabilities);
  const CAPS = flatCaps(catalog);
  const {
    appName: APP_NAME = {},
    foMinSeats: FO_MIN_SEATS = 20,
    scmForcingCaps: SCM_FORCING = [],
    warehouseExtensions: WAREHOUSE_EXT = [],
  } = catalog;

  const chosen = CAPS.filter((c) => capSet.has(c.id));
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
      chosen.some((c) => SCM_FORCING.includes(c.id));
    const base = p.fo.base;
    const seat = needsSCM ? round2(base + p.fo.attach) : base;
    if (fullUsers > 0) {
      foMinimumApplied = fullUsers < FO_MIN_SEATS;
      const billed = Math.max(fullUsers, FO_MIN_SEATS);
      lines.push({
        k: "full",
        qty: billed,
        label: needsSCM ? "Finance + Supply Chain Management" : "Dynamics 365 Finance",
        sub: foMinimumApplied
          ? `${FO_MIN_SEATS} full-user minimum (you entered ${fullUsers})`
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

  return {
    input: { capabilities: [...capSet], entities, countries, revenue, fullUsers, teamUsers, deviceUsers, activityUsers },
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
    foMinSeats: FO_MIN_SEATS,
    foMinimumApplied,
    premiumDrivers,
    beyondDrivers,
    extensions,
    scaleEscalation,
    applicationsRequired: [...new Set(beyondDrivers.map((d) => APP_NAME[d.app]))],
  };
}

/* The record sales receives — mirrors buildSalesPayload on the server. */
export function buildSalesPayload(model, lead = {}) {
  return {
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
  };
}
