const {
  ROUTING, SOURCES, COMPLEXITY, SCM_DRIVERS, BANDS, CUSTOMISATIONS, HISTORY, IT,
  YEARS, GOLIVE, BUDGET, ENTITY_EFFORT, SOURCE_EFFORT, SOURCE_EFFORT_DEFAULT,
  EFFORT_FLOOR, DURATION,
} = require("../config/migrationCatalog");

const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const fmt = (n) =>
  Number(n || 0) % 1 === 0
    ? Number(n || 0).toLocaleString("en-US")
    : Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pick = (list, id, fallbackIndex = 0) => list.find((x) => x.id === id) || list[fallbackIndex];
const band = (set, id) => pick(BANDS[set], id);

/** Whatever the client sent -> the exact shape the engine scores. */
const normaliseInput = (raw = {}) => {
  const int = (v, d, lo, hi) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? clamp(n, lo, hi) : d;
  };
  const chosen = Array.isArray(raw.complexity) ? raw.complexity : [];

  return {
    source: SOURCES.some((s) => s.id === raw.source) ? raw.source : "",
    version: typeof raw.version === "string" ? raw.version.trim().slice(0, 120) : "",
    years: pick(YEARS, raw.years, 1).id,
    users: band("users", raw.users).id,
    entities: band("entities", raw.entities).id,
    countries: band("countries", raw.countries).id,
    revenue: band("revenue", raw.revenue).id,
    volume: band("volume", raw.volume).id,
    complexity: COMPLEXITY.filter((c) => chosen.includes(c.id)).map((c) => c.id),
    customisations: pick(CUSTOMISATIONS, raw.customisations, 1).id,
    integrations: int(raw.integrations, 2, 0, 30),
    history: pick(HISTORY, raw.history, 1).id,
    it: pick(IT, raw.it, 1).id,
    golive: pick(GOLIVE, raw.golive, 1).id,
    budget: pick(BUDGET, raw.budget, 2).id,
    fullUsers: int(raw.fullUsers, 30, 1, 2000),
    lightUsers: int(raw.lightUsers, 0, 0, 2000),
  };
};

/* ------------------------------------------------------------- routing -- */

const routeFor = (input) => {
  const src = SOURCES.find((s) => s.id === input.source) || null;
  const forBC = [];
  const forFO = [];
  let score = 0;

  if (src && src.weight > 0) {
    // A source pointing at Business Central pulls the score negative.
    const w = src.target === "fo" ? src.weight : -src.weight;
    score += w;
    (w < 0 ? forBC : forFO).push({ label: `Currently on ${src.label}`, w: Math.abs(w) });
  } else if (src) {
    forBC.push({ label: `${src.label} does not point either way on its own`, w: 0, neutral: true });
  }

  const addBand = (set, text) => {
    const b = band(set, input[set]);
    score += b.w;
    if (b.w !== 0) (b.w < 0 ? forBC : forFO).push({ label: `${text}: ${b.label}`, w: Math.abs(b.w) });
  };
  addBand("users", "Full users");
  addBand("entities", "Legal entities");
  addBand("countries", "Countries");
  addBand("revenue", "Revenue");
  addBand("volume", "Transactions a month");

  const chosen = COMPLEXITY.filter((c) => input.complexity.includes(c.id));
  chosen.forEach((c) => {
    if (c.w > 0) {
      score += c.w;
      forFO.push({ label: c.label, w: c.w });
    }
  });

  const platform = score >= ROUTING.foAt ? "fo" : score <= ROUTING.bcAt ? "bc" : "overlap";
  const lean = score > 0 ? "fo" : "bc";
  // In the overlap the lean decides what we cost and time, while the verdict
  // still says plainly that both would work.
  const target = platform === "fo" || (platform === "overlap" && lean === "fo") ? "fo" : "bc";

  return { src, score, platform, lean, target, forBC, forFO, chosen };
};

/* -------------------------------------------- how hard the move itself is -- */

const effortFor = (input, src) => {
  const yearsW = pick(YEARS, input.years, 1).w;
  const customW = pick(CUSTOMISATIONS, input.customisations, 1).w;
  const histW = pick(HISTORY, input.history, 1).w;
  const itW = pick(IT, input.it, 1).w;
  const intW = Math.min(20, input.integrations * 4);
  const entW = ENTITY_EFFORT[input.entities] || 0;
  const srcW = src
    ? (SOURCE_EFFORT.find((r) => r.ids.includes(src.id))?.w ?? SOURCE_EFFORT_DEFAULT)
    : 0;

  const complexity = clamp(yearsW + customW + histW + itW + intW + entW + srcW + EFFORT_FLOOR, 5, 100);

  const drivers = [
    customW >= 18 && "the state of your customisations",
    intW >= 12 && `${input.integrations} integrations to rebuild`,
    histW >= 11 && "the volume of history you want to carry",
    srcW >= 10 && "no supported migration tooling from your current system",
    itW >= 8 && "no internal IT capacity to absorb the work",
    entW >= 9 && "the number of legal entities in scope",
  ].filter(Boolean);

  return { complexity, drivers, customW, histW, itW, intW, entW, srcW };
};

/* ----------------------------------------------------------- the licence -- */

const licenceFor = (input, target, chosen, p, foMinSeats) => {
  if (!p) return null;
  const needsPrem = input.complexity.includes("mfg") || input.complexity.includes("svc");
  const needsSCM = chosen.some((c) => SCM_DRIVERS.includes(c.id)) || needsPrem;

  const seat =
    target === "fo"
      ? needsSCM
        ? round2(p.fo.base + p.fo.attach)
        : p.fo.base
      : needsPrem
      ? p.bc.premium
      : p.bc.essentials;
  const lightRate = target === "fo" ? p.fo.team : p.bc.team;

  // Microsoft bills a floor of foMinSeats on Finance & Operations, and it
  // cannot be split across core applications.
  const minimumApplied = target === "fo" && input.fullUsers < foMinSeats;
  const billedFull = minimumApplied ? foMinSeats : input.fullUsers;

  const monthly = round2(billedFull * seat + input.lightUsers * lightRate);

  return {
    symbol: p.symbol,
    seat,
    lightRate,
    billedFull,
    minimumApplied,
    foMinSeats,
    needsPremium: needsPrem,
    needsSCM,
    monthly,
    annual: round2(monthly * 12),
    tier: target === "bc" ? (needsPrem ? "premium" : "essentials") : null,
    verified: p.verified || "",
    trusted: !!p.trusted,
  };
};

/* ----------------------------------------------------------------- risks -- */

const risksFor = (input, r, effort, licence, minM, maxM, wantedMonths) => {
  const risks = [];

  if (r.src?.lifecycle) {
    risks.push({ kind: "eol", title: `${r.src.label} lifecycle`, body: r.src.lifecycle });
  }

  if (wantedMonths && wantedMonths < minM) {
    risks.push({
      kind: "cost",
      title: "Your target date does not fit the work",
      body: `You want to be live in about ${wantedMonths} months. On this scope a realistic range is ${minM} to ${maxM} months. Either the go-live moves, or the scope does — phasing the rollout is usually the cheaper concession.`,
    });
  }

  if (["many", "unknown"].includes(input.customisations)) {
    risks.push({
      kind: "cost",
      title: "Customisations are the largest unknown here",
      body:
        input.customisations === "unknown"
          ? "Nobody knowing what was customised is the single most common cause of budget overrun on these projects. A code and configuration audit should happen before anyone quotes you a fixed price."
          : "Heavily customised systems carry business rules that exist nowhere else. Expect a decision on each one: rebuild it as an extension, replace it with standard functionality, or retire it.",
    });
  }

  if (input.integrations >= 4) {
    risks.push({
      kind: "cost",
      title: `${input.integrations} integrations to rebuild`,
      body: "Integration work is routinely underestimated because it is invisible until it breaks. Each connection needs its own specification, test plan and cutover sequence.",
    });
  }

  if (r.target === "fo" && input.it === "none") {
    risks.push({
      kind: "cost",
      title: "Finance & Operations with no internal IT",
      body: "F&O needs environment management, release governance and a security model maintained after go-live. With no internal capacity, that has to be bought as a managed service — budget for it from day one rather than discovering it in month nine.",
    });
  }

  if (r.platform === "overlap") {
    risks.push({
      kind: "prompt",
      title: "You are in the overlap zone",
      body: "Both platforms would technically work. Choosing Finance & Operations when Business Central would do wastes budget and gives your team a system too heavy to run. Choosing Business Central when you needed Finance & Operations means hitting a ceiling inside three years. This is the case for a scoping workshop rather than a quote.",
    });
  }

  if (licence?.minimumApplied) {
    risks.push({
      kind: "cost",
      title: `Finance & Operations carries a ${licence.foMinSeats} user minimum`,
      body: `You have ${input.fullUsers} full users. Microsoft bills a minimum of ${licence.foMinSeats} on Finance and Supply Chain, so the figure above is a floor, not a calculation. This is usually where Business Central becomes the better commercial answer.`,
    });
  }

  if (input.history === "hall") {
    risks.push({
      kind: "prompt",
      title: "Carrying all history is rarely worth what it costs",
      body: "Most organisations migrate open items and balances, then keep the old system read-only for a defined retention period. It is cheaper, faster and lower risk than transforming a decade of transactions into a new data model.",
    });
  }

  return risks;
};

/* ------------------------------------------------------------ lead score -- */

const leadScoreFor = (input, r, contact = {}) => {
  let ls = 0;
  if (r.src && r.src.id !== "other") ls += 15;
  if (String(input.version || "").trim().length > 1) ls += 20;
  if (r.src?.lifecycle) ls += 15;
  ls += pick(BUDGET, input.budget, 2).w;

  const wanted = pick(GOLIVE, input.golive, 1).months;
  if (wanted && wanted <= 12) ls += 15;
  if (["u150", "u300", "u300p"].includes(input.users)) ls += 10;
  // A work address is the cheapest signal that this is a real project.
  if (contact.email && !/gmail|yahoo|hotmail|outlook\.com|icloud/i.test(contact.email)) ls += 20;

  const routing =
    ls >= 70 ? "SQL — call within 10 minutes" : ls >= 40 ? "MQL — nurture" : "Content nurture";
  return { score: ls, routing };
};

/* ---------------------------------------------------------------- assess -- */

/**
 * The whole assessment. `pricing` may be null, in which case everything except
 * the licence estimate is returned — that is how the gated view works.
 */
const assess = (rawInput, pricing, contact = {}, ctx = {}) => {
  const foMinSeats = ctx.foMinSeats ?? 20;
  const input = normaliseInput(rawInput);
  const r = routeFor(input);
  const effort = effortFor(input, r.src);

  const d = DURATION[r.target];
  const stretch = effort.complexity / 100;
  const minM = Math.round(d.min + stretch * d.stretchMin);
  const maxM = Math.round(d.max + stretch * d.stretchMax);
  const wantedMonths = pick(GOLIVE, input.golive, 1).months;

  const licence = licenceFor(input, r.target, r.chosen, pricing, foMinSeats);
  const risks = risksFor(input, r, effort, licence, minM, maxM, wantedMonths);
  const lead = leadScoreFor(input, r, contact);

  const verdict =
    r.platform === "fo"
      ? "Dynamics 365 Finance & Operations"
      : r.platform === "bc"
      ? "Dynamics 365 Business Central"
      : r.lean === "fo"
      ? "Overlap zone, leaning Finance & Operations"
      : "Overlap zone, leaning Business Central";

  return {
    input,
    score: r.score,
    platform: r.platform,
    lean: r.lean,
    target: r.target,
    verdict,
    sourcePath: r.src?.path || null,
    lifecycle: r.src?.lifecycle || null,
    forBC: r.forBC,
    forFO: r.forFO,
    decisive: r.chosen.filter((c) => c.w >= 15).map((c) => c.label),
    complexity: effort.complexity,
    complexityDrivers: effort.drivers,
    minMonths: minM,
    maxMonths: maxM,
    wantedMonths,
    timelineConflict: !!(wantedMonths && wantedMonths < minM),
    licence,
    risks,
    lead,
  };
};

/** The flat record sales receives, mirroring the licence tool's payload. */
const buildSalesPayload = (model, contact = {}) => ({
  name: contact.name || "",
  email: contact.email || "",
  company: contact.company || "",
  phone: contact.phone || "",
  current_system: SOURCES.find((s) => s.id === model.input.source)?.label || null,
  version: model.input.version || null,
  lifecycle_exposure: model.lifecycle ? "yes" : "no",
  routing_score: model.score,
  recommendation: model.verdict,
  complexity_score: model.complexity,
  complexity_drivers: model.complexityDrivers,
  decisive_requirements: model.decisive,
  duration_months: `${model.minMonths}-${model.maxMonths}`,
  target_golive: pick(GOLIVE, model.input.golive, 1).label,
  timeline_conflict: model.timelineConflict,
  budget: pick(BUDGET, model.input.budget, 2).label,
  annual_licence_value: model.licence ? Number(model.licence.annual.toFixed(2)) : null,
  currency: model.licence ? model.currency || null : null,
  lead_score: model.lead.score,
  routing: model.lead.routing,
});

module.exports = { assess, normaliseInput, buildSalesPayload, fmt, round2 };
