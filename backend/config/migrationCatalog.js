const ROUTING = { foAt: 15, bcAt: -15 };

const SOURCES = [
  { id: "nav", group: "Microsoft Dynamics", label: "Dynamics NAV / Navision", target: "bc", weight: 35,
    path: "The shortest migration on this list. Business Central is the direct successor to NAV — same data model, same lineage, and Microsoft-supported migration tooling.",
    lifecycle: "NAV 2018, the final release, left mainstream support in January 2023 and its extended support ends 11 January 2028. NAV 2017 ends 11 January 2027. NAV 2016 and everything earlier is already out of support — no security updates, no guaranteed tax or VAT changes." },
  { id: "gp", group: "Microsoft Dynamics", label: "Dynamics GP / Great Plains", target: "bc", weight: 28,
    path: "A rebuild rather than an upgrade, but Microsoft provides migration tooling for the ledger, customers, vendors, items and open transactions.",
    lifecycle: "Microsoft ends GP product support and updates on 31 December 2029, with security patches to 30 April 2031. New licence sales have already stopped. Note that GP 2016 and GP 2016 R2 left support on 14 July 2026 — if you are on either, you are unsupported today." },
  { id: "ax", group: "Microsoft Dynamics", label: "Dynamics AX 2009 / 2012", target: "fo", weight: 35,
    path: "Finance & Operations is the direct continuation of AX. Microsoft publishes an upgrade route from AX 2012 R3, and AX 2009 or 2012 R2 customers step through R3 first.",
    lifecycle: "AX 2012 R3, the final version, reached end of life in January 2023. There are no supported versions of Dynamics AX. You are running unsupported software today." },
  { id: "sl", group: "Microsoft Dynamics", label: "Dynamics SL", target: "bc", weight: 26,
    path: "A rebuild. Project-heavy SL users should look closely at whether Business Central's job costing covers their contract accounting before assuming it does.",
    lifecycle: "Mainstream support for SL 2018 ended January 2024. Extended support — security updates only — ends 11 July 2028." },
  { id: "bcprem", group: "Microsoft Dynamics", label: "Business Central on-premises", target: "bc", weight: 40,
    path: "A cloud move rather than a replatform. The work is in extensions, integrations and any customisations written outside the extension model.",
    lifecycle: "On-premises Business Central versions carry fixed end dates, unlike the cloud service which stays current automatically." },

  { id: "sage50", group: "Sage", label: "Sage 50 / Sage 50cloud", target: "bc", weight: 32,
    path: "A clean rebuild. Sage 50 is accounting software rather than an ERP, so expect the project to be as much about designing new processes as moving data." },
  { id: "sage200", group: "Sage", label: "Sage 200", target: "bc", weight: 30,
    path: "A well-worn route in the UK market. Business Central covers the Sage 200 footprint and adds the manufacturing and service depth Sage 200 lacks." },
  { id: "sage300", group: "Sage", label: "Sage 300 / Accpac", target: "bc", weight: 25,
    path: "A rebuild. Multi-entity Sage 300 estates need their intercompany and consolidation design checked against Business Central before scoping." },
  { id: "intacct", group: "Sage", label: "Sage Intacct", target: "bc", weight: 12,
    path: "Intacct is finance-only, so the question is usually what else you need. If you are moving to get operations, inventory or manufacturing in the same system, that shapes the answer more than the source." },
  { id: "sagex3", group: "Sage", label: "Sage X3", target: "fo", weight: 22,
    path: "X3 sits at the top of Sage's range. Most X3 estates carry the process manufacturing, distribution or multi-country complexity that points to Finance & Operations — but not all of them." },

  { id: "sapb1", group: "SAP", label: "SAP Business One", target: "bc", weight: 30,
    path: "Business One and Business Central serve the same segment. This is a like-for-like replacement, and the usual driver is the Microsoft 365 and Power Platform estate rather than function." },
  { id: "byd", group: "SAP", label: "SAP Business ByDesign", target: "bc", weight: 8,
    path: "ByDesign spans a wide range of sizes, so the answer here rests almost entirely on your scale and complexity rather than the system you are leaving." },
  { id: "ecc", group: "SAP", label: "SAP ECC / R/3", target: "fo", weight: 32,
    path: "A full reimplementation either way. The real comparison is Finance & Operations against S/4HANA, and cost, timeline and internal skills usually decide it rather than function.",
    lifecycle: "SAP mainstream maintenance for ECC 6 EHP 6–8 ends 31 December 2027, with optional extended maintenance to the end of 2030 at a premium. EHP 0–5 already left mainstream maintenance at the end of 2025." },
  { id: "s4", group: "SAP", label: "SAP S/4HANA", target: "fo", weight: 38,
    path: "Organisations on S/4HANA carry enterprise-grade process complexity. Finance & Operations is the only realistic Microsoft equivalent — Business Central would be a functional step down." },

  { id: "qb", group: "Accounting and spreadsheets", label: "QuickBooks", target: "bc", weight: 34,
    path: "A first real ERP rather than a migration. Data volumes are usually small; the project is about process design, and the risk is under-scoping the change management." },
  { id: "xero", group: "Accounting and spreadsheets", label: "Xero", target: "bc", weight: 34,
    path: "Same picture as QuickBooks. Businesses leaving Xero are normally hitting inventory, manufacturing or multi-entity limits rather than accounting ones." },
  { id: "myob", group: "Accounting and spreadsheets", label: "MYOB", target: "bc", weight: 30,
    path: "A first ERP. Expect the effort to sit in process design and data cleansing rather than technical migration." },
  { id: "sheets", group: "Accounting and spreadsheets", label: "Spreadsheets, or no central system", target: "bc", weight: 30,
    path: "Nothing to migrate technically, which is deceptive — the work is defining processes that have never been written down, and cleansing data that has never been governed." },

  { id: "netsuite", group: "Other ERP", label: "NetSuite", target: "bc", weight: 6,
    path: "NetSuite spans small single-entity businesses through to OneWorld estates. Your entity count and user base decide this one, not the badge." },
  { id: "oracle", group: "Other ERP", label: "Oracle EBS, Fusion or JD Edwards", target: "fo", weight: 34,
    path: "Enterprise-scale estates with deep customisation. Finance & Operations is the like-for-like Microsoft answer." },
  { id: "infor", group: "Other ERP", label: "Infor (M3, LN, CloudSuite, SyteLine)", target: "fo", weight: 22,
    path: "Infor's manufacturing products carry complexity that usually needs Supply Chain Management, though smaller SyteLine estates can land on Business Central." },
  { id: "epicor", group: "Other ERP", label: "Epicor Kinetic or Prophet 21", target: "fo", weight: 10,
    path: "Epicor covers both mid-market and enterprise. Manufacturing mode and warehouse complexity decide this, not the product name." },
  { id: "syspro", group: "Other ERP", label: "SYSPRO", target: "bc", weight: 6,
    path: "SYSPRO sits squarely in the overlap. Expect the manufacturing questions below to do the deciding." },
  { id: "ifs", group: "Other ERP", label: "IFS", target: "fo", weight: 28,
    path: "IFS estates are typically asset-intensive or service-heavy at enterprise scale, which points to Finance & Operations with Asset Management." },
  { id: "acumatica", group: "Other ERP", label: "Acumatica", target: "bc", weight: 14,
    path: "Direct mid-market equivalent to Business Central. The move is usually driven by the Microsoft stack rather than function." },
  { id: "odoo", group: "Other ERP", label: "Odoo", target: "bc", weight: 18,
    path: "Usually a move for supportability and compliance rather than features. Watch for custom modules with no equivalent." },
  { id: "custom", group: "Other ERP", label: "A custom or in-house built system", target: "bc", weight: 0,
    path: "The hardest kind to scope. Undocumented business rules live in the code, and finding them is most of the discovery work." },
  { id: "other", group: "Other ERP", label: "Something else", target: "bc", weight: 0,
    path: "We will need a conversation to place this properly." },
];

const SOURCE_GROUPS = ["Microsoft Dynamics", "Sage", "SAP", "Accounting and spreadsheets", "Other ERP"];

const COMPLEXITY = [
  { id: "proc",  label: "Process or formula manufacturing", note: "Recipes, co-products and by-products, catch weight", w: 16 },
  { id: "awm",   label: "Advanced warehouse execution", note: "Wave picking, directed workflows, cross-docking", w: 15 },
  { id: "pos",   label: "Retail point of sale across stores", note: "Tills, in-store fulfilment, unified commerce", w: 15 },
  { id: "cons",  label: "Consolidate ten or more legal entities", note: "Eliminations, currency translation, group reporting", w: 15 },
  { id: "gtax",  label: "Statutory tax or e-invoicing in several countries", note: "Country tax engines and government mandates", w: 13 },
  { id: "subs",  label: "Subscription billing with revenue recognition", note: "Deferrals under ASC 606 or IFRS 15", w: 12 },
  { id: "trans", label: "Freight planning and landed cost", note: "Carrier rating, load building, duty apportionment", w: 12 },
  { id: "hr",    label: "Payroll across multiple countries", note: "Multi-country statutory payroll and benefits", w: 12 },
  { id: "asset", label: "Plant, fleet or facility maintenance", note: "Preventive schedules, work orders, spare parts", w: 10 },
  { id: "mfg",   label: "Discrete manufacturing", note: "Production orders, bills of materials, routings", w: 0, prem: true },
  { id: "svc",   label: "Field service or service contracts", note: "Service orders, contracts, dispatch", w: 0, prem: true },
];

const SCM_DRIVERS = ["proc", "awm", "pos", "trans", "asset"];

const BANDS = {
  users: [
    { id: "u25",   label: "Under 25", w: -20 },
    { id: "u75",   label: "25 – 74",  w: -6 },
    { id: "u150",  label: "75 – 149", w: 10 },
    { id: "u300",  label: "150 – 299", w: 25 },
    { id: "u300p", label: "300+",     w: 40 },
  ],
  entities: [
    { id: "e1",   label: "One",   w: -10 },
    { id: "e4",   label: "2 – 4", w: 0 },
    { id: "e9",   label: "5 – 9", w: 12 },
    { id: "e10p", label: "10+",   w: 28 },
  ],
  countries: [
    { id: "c1",  label: "One",   w: -8 },
    { id: "c3",  label: "2 – 3", w: 0 },
    { id: "c6",  label: "4 – 6", w: 12 },
    { id: "c7p", label: "7+",    w: 25 },
  ],
  revenue: [
    { id: "r10",   label: "Under 10m",  w: -20 },
    { id: "r50",   label: "10m – 50m",  w: -5 },
    { id: "r250",  label: "50m – 250m", w: 15 },
    { id: "r250p", label: "Over 250m",  w: 35 },
  ],
  volume: [
    { id: "v1",    label: "Under 1,000",      w: -10 },
    { id: "v10",   label: "1,000 – 10,000",   w: 0 },
    { id: "v100",  label: "10,000 – 100,000", w: 12 },
    { id: "v100p", label: "Over 100,000",     w: 28 },
  ],
};

const CUSTOMISATIONS = [
  { id: "none",    label: "None worth keeping", w: 0 },
  { id: "few",     label: "A handful",          w: 8 },
  { id: "some",    label: "Quite a few",        w: 18 },
  { id: "many",    label: "Heavily customised", w: 28 },
  { id: "unknown", label: "Nobody knows",       w: 22 },
];

const HISTORY = [
  { id: "h2",   label: "Balances only", w: 2 },
  { id: "h5",   label: "2 – 5 years",   w: 7 },
  { id: "h7",   label: "5 – 7 years",   w: 11 },
  { id: "hall", label: "Everything",    w: 16 },
];

const IT = [
  { id: "none",  label: "No internal IT",    w: 8 },
  { id: "small", label: "One or two people", w: 4 },
  { id: "team",  label: "A dedicated team",  w: 0 },
];

const YEARS = [
  { id: "y2",   label: "Under 2 years", w: 3 },
  { id: "y5",   label: "2 – 5 years",   w: 8 },
  { id: "y10",  label: "5 – 10 years",  w: 14 },
  { id: "y10p", label: "Over 10 years", w: 20 },
];

const GOLIVE = [
  { id: "g6",  label: "Within 6 months",  months: 6 },
  { id: "g12", label: "6 – 12 months",    months: 12 },
  { id: "g18", label: "12 – 18 months",   months: 18 },
  { id: "g24", label: "Longer than that", months: 24 },
  { id: "gx",  label: "Not decided",      months: null },
];

const BUDGET = [
  { id: "approved",  label: "Approved",      w: 30 },
  { id: "building",  label: "Being built",   w: 20 },
  { id: "exploring", label: "Just exploring", w: 0 },
];

/* Entity count also makes the move harder, separately from what it says about
   the platform. */
const ENTITY_EFFORT = { e1: 0, e4: 4, e9: 9, e10p: 14 };

/* How much migration tooling exists between the source and Dynamics 365.
   Negative means a supported, well-trodden path. */
const SOURCE_EFFORT = [
  { ids: ["nav", "bcprem"], w: -8 },
  { ids: ["gp", "sl"], w: -4 },
  { ids: ["sheets", "qb", "xero", "myob"], w: -6 },
  { ids: ["ecc", "s4", "oracle", "ifs", "infor"], w: 10 },
  { ids: ["custom"], w: 12 },
];
const SOURCE_EFFORT_DEFAULT = 4;
/* Every migration carries this much work before anything specific to the site. */
const EFFORT_FLOOR = 12;

/* Duration in months before complexity stretches it. */
const DURATION = {
  bc: { min: 4, max: 9, stretchMin: 3, stretchMax: 5 },
  fo: { min: 12, max: 18, stretchMin: 6, stretchMax: 10 },
};

const DEFAULT_CONTENT = {
  header: {
    eyebrow: "Dynamics Square · Migration assessment",
    heading: "Which Dynamics 365 platform are you actually moving to?",
    dek: "The system you are leaving is the strongest single signal, not the whole answer. Twelve questions and the assessment will tell you where you land, what the move involves, and how long it takes.",
  },
  form: {
    heading: "Get the migration readiness report",
    body: "Phase plan, data migration scope, a decision on each customisation, and the risks above written up against your answers.",
    ctaLabel: "Send me the report",
    sendingLabel: "Sending…",
    namePlaceholder: "Full name",
    emailPlaceholder: "Work email",
    companyPlaceholder: "Company",
    phonePlaceholder: "Phone (optional)",
    sourceHint: "Choose your current system first.",
  },
  success: {
    heading: "On its way",
    body: "A consultant will follow up within one working day with your migration readiness report.",
  },
  errors: { submitFailed: "That did not send. Please try again, or email us directly." },
};

const SOURCE_IDS = SOURCES.map((s) => s.id);
const COMPLEXITY_IDS = COMPLEXITY.map((c) => c.id);
const bandIds = (set) => BANDS[set].map((b) => b.id);

module.exports = {
  ROUTING,
  SOURCES,
  SOURCE_GROUPS,
  SOURCE_IDS,
  COMPLEXITY,
  COMPLEXITY_IDS,
  SCM_DRIVERS,
  BANDS,
  CUSTOMISATIONS,
  HISTORY,
  IT,
  YEARS,
  GOLIVE,
  BUDGET,
  ENTITY_EFFORT,
  SOURCE_EFFORT,
  SOURCE_EFFORT_DEFAULT,
  EFFORT_FLOOR,
  DURATION,
  DEFAULT_CONTENT,
  bandIds,
};
