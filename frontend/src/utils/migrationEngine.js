export const fmt = (n) =>
  Number(n || 0) % 1 === 0
    ? Number(n || 0).toLocaleString("en-US")
    : Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const pick = (list, id, i = 0) => (list || []).find((x) => x.id === id) || (list || [])[i] || { w: 0 };

/* Effort weights that are not in the catalog's band lists. */
const ENTITY_EFFORT = { e1: 0, e4: 4, e9: 9, e10p: 14 };
const SOURCE_EFFORT = [
  { ids: ["nav", "bcprem"], w: -8 },
  { ids: ["gp", "sl"], w: -4 },
  { ids: ["sheets", "qb", "xero", "myob"], w: -6 },
  { ids: ["ecc", "s4", "oracle", "ifs", "infor"], w: 10 },
  { ids: ["custom"], w: 12 },
];
const SOURCE_EFFORT_DEFAULT = 4;
const EFFORT_FLOOR = 12;
const SCM_DRIVERS = ["proc", "awm", "pos", "trans", "asset"];
const DURATION = {
  bc: { min: 4, max: 9, stretchMin: 3, stretchMax: 5 },
  fo: { min: 12, max: 18, stretchMin: 6, stretchMax: 10 },
};

const flatSources = (catalog) => (catalog?.sources || []).flatMap((g) => g.items || []);

export function assess(catalog, p, input) {
  const B = catalog?.bands || {};
  const band = (set, id) => pick(B[set], id);
  const sources = flatSources(catalog);
  const src = sources.find((s) => s.id === input.source) || null;
  const routing = catalog?.routing || { foAt: 15, bcAt: -15 };

  const forBC = [];
  const forFO = [];
  let score = 0;

  if (src && src.weight > 0) {
    const w = src.target === "fo" ? src.weight : -src.weight;
    score += w;
    (w < 0 ? forBC : forFO).push({ label: `Currently on ${src.label}`, w: Math.abs(w) });
  } else if (src) {
    forBC.push({ label: `${src.label} does not point either way on its own`, w: 0, neutral: true });
  }

  const addBand = (set, text) => {
    const b = band(set, input[set]);
    score += b.w || 0;
    if (b.w) (b.w < 0 ? forBC : forFO).push({ label: `${text}: ${b.label}`, w: Math.abs(b.w) });
  };
  addBand("users", "Full users");
  addBand("entities", "Legal entities");
  addBand("countries", "Countries");
  addBand("revenue", "Revenue");
  addBand("volume", "Transactions a month");

  const chosen = (catalog?.complexity || []).filter((c) => input.complexity.includes(c.id));
  chosen.forEach((c) => {
    if (c.w > 0) {
      score += c.w;
      forFO.push({ label: c.label, w: c.w });
    }
  });

  const platform = score >= routing.foAt ? "fo" : score <= routing.bcAt ? "bc" : "overlap";
  const lean = score > 0 ? "fo" : "bc";
  const target = platform === "fo" || (platform === "overlap" && lean === "fo") ? "fo" : "bc";

  /* ---- how hard the move itself is, regardless of platform ---- */
  const yearsW = pick(catalog?.years, input.years, 1).w;
  const customW = pick(catalog?.customisations, input.customisations, 1).w;
  const histW = pick(catalog?.history, input.history, 1).w;
  const itW = pick(catalog?.it, input.it, 1).w;
  const intW = Math.min(20, input.integrations * 4);
  const entW = ENTITY_EFFORT[input.entities] || 0;
  const srcW = src ? SOURCE_EFFORT.find((r) => r.ids.includes(src.id))?.w ?? SOURCE_EFFORT_DEFAULT : 0;
  const complexity = clamp(yearsW + customW + histW + itW + intW + entW + srcW + EFFORT_FLOOR, 5, 100);

  const complexityDrivers = [
    customW >= 18 && "the state of your customisations",
    intW >= 12 && `${input.integrations} integrations to rebuild`,
    histW >= 11 && "the volume of history you want to carry",
    srcW >= 10 && "no supported migration tooling from your current system",
    itW >= 8 && "no internal IT capacity to absorb the work",
    entW >= 9 && "the number of legal entities in scope",
  ].filter(Boolean);

  /* ---- timeline ---- */
  const d = DURATION[target];
  const stretch = complexity / 100;
  const minMonths = Math.round(d.min + stretch * d.stretchMin);
  const maxMonths = Math.round(d.max + stretch * d.stretchMax);
  const wantedMonths = pick(catalog?.golive, input.golive, 1).months ?? null;

  /* ---- indicative licence ---- */
  let licence = null;
  if (p?.bc && p?.fo) {
    const foMinSeats = catalog?.foMinSeats ?? 20;
    const needsPremium = input.complexity.includes("mfg") || input.complexity.includes("svc");
    const needsSCM = chosen.some((c) => SCM_DRIVERS.includes(c.id)) || needsPremium;
    const seat =
      target === "fo"
        ? needsSCM ? round2(p.fo.base + p.fo.attach) : p.fo.base
        : needsPremium ? p.bc.premium : p.bc.essentials;
    const lightRate = target === "fo" ? p.fo.team : p.bc.team;
    const minimumApplied = target === "fo" && input.fullUsers < foMinSeats;
    const billedFull = minimumApplied ? foMinSeats : input.fullUsers;
    const monthly = round2(billedFull * seat + input.lightUsers * lightRate);

    licence = {
      symbol: p.symbol, seat, lightRate, billedFull, minimumApplied, foMinSeats,
      needsPremium, needsSCM, monthly, annual: round2(monthly * 12),
      tier: target === "bc" ? (needsPremium ? "premium" : "essentials") : null,
      verified: p.verified || "", trusted: !!p.trusted,
    };
  }

  /* ---- flags ---- */
  const risks = [];
  const srcFull = (catalog?.sourceDetail || {})[input.source];
  if (srcFull?.lifecycle) risks.push({ kind: "eol", title: `${src.label} lifecycle`, body: srcFull.lifecycle });
  if (wantedMonths && wantedMonths < minMonths)
    risks.push({
      kind: "cost",
      title: "Your target date does not fit the work",
      body: `You want to be live in about ${wantedMonths} months. On this scope a realistic range is ${minMonths} to ${maxMonths} months. Either the go-live moves, or the scope does — phasing the rollout is usually the cheaper concession.`,
    });
  if (["many", "unknown"].includes(input.customisations))
    risks.push({
      kind: "cost",
      title: "Customisations are the largest unknown here",
      body:
        input.customisations === "unknown"
          ? "Nobody knowing what was customised is the single most common cause of budget overrun on these projects. A code and configuration audit should happen before anyone quotes you a fixed price."
          : "Heavily customised systems carry business rules that exist nowhere else. Expect a decision on each one: rebuild it as an extension, replace it with standard functionality, or retire it.",
    });
  if (input.integrations >= 4)
    risks.push({
      kind: "cost",
      title: `${input.integrations} integrations to rebuild`,
      body: "Integration work is routinely underestimated because it is invisible until it breaks. Each connection needs its own specification, test plan and cutover sequence.",
    });
  if (target === "fo" && input.it === "none")
    risks.push({
      kind: "cost",
      title: "Finance & Operations with no internal IT",
      body: "F&O needs environment management, release governance and a security model maintained after go-live. With no internal capacity, that has to be bought as a managed service — budget for it from day one rather than discovering it in month nine.",
    });
  if (platform === "overlap")
    risks.push({
      kind: "prompt",
      title: "You are in the overlap zone",
      body: "Both platforms would technically work. Choosing Finance & Operations when Business Central would do wastes budget and gives your team a system too heavy to run. Choosing Business Central when you needed Finance & Operations means hitting a ceiling inside three years. This is the case for a scoping workshop rather than a quote.",
    });
  if (licence?.minimumApplied)
    risks.push({
      kind: "cost",
      title: `Finance & Operations carries a ${licence.foMinSeats} user minimum`,
      body: `You have ${input.fullUsers} full users. Microsoft bills a minimum of ${licence.foMinSeats} on Finance and Supply Chain, so the figure above is a floor, not a calculation. This is usually where Business Central becomes the better commercial answer.`,
    });
  if (input.history === "hall")
    risks.push({
      kind: "prompt",
      title: "Carrying all history is rarely worth what it costs",
      body: "Most organisations migrate open items and balances, then keep the old system read-only for a defined retention period. It is cheaper, faster and lower risk than transforming a decade of transactions into a new data model.",
    });

  const verdict =
    platform === "fo" ? "Dynamics 365 Finance & Operations"
    : platform === "bc" ? "Dynamics 365 Business Central"
    : lean === "fo" ? "Overlap zone, leaning Finance & Operations"
    : "Overlap zone, leaning Business Central";

  return {
    score, platform, lean, target, verdict,
    forBC, forFO,
    decisive: chosen.filter((c) => c.w >= 15).map((c) => c.label),
    complexity, complexityDrivers,
    minMonths, maxMonths, wantedMonths,
    timelineConflict: !!(wantedMonths && wantedMonths < minMonths),
    licence, risks,
    sourcePath: srcFull?.path || null,
  };
}
