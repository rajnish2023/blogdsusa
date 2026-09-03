const DEFAULT_PRICING = {
  USD: {
    code: "USD", symbol: "$", verified: "August 2026", trusted: true,
    countries: ["US"], isDefault: false,
    bc: { essentials: 80, premium: 110, team: 8, device: 45 },
    fo: { base: 210, premiumBase: 300, attach: 30, activity: 50, team: 8, device: 75 },
  },
  GBP: {
    code: "GBP", symbol: "£", verified: "placeholder", trusted: false,
    // Dynamics Square is a UK business, so GBP is the fallback for the world.
    countries: ["GB", "IE"], isDefault: true,
    bc: { essentials: 67.8, premium: 93.2, team: 6.8, device: 38.1 },
    fo: { base: 178, premiumBase: 254.2, attach: 25.4, activity: 42.4, team: 6.8, device: 63.6 },
  },
  CAD: {
    code: "CAD", symbol: "CA$", verified: "placeholder", trusted: false,
    countries: ["CA"], isDefault: false,
    bc: { essentials: 108.5, premium: 149.2, team: 10.9, device: 61 },
    fo: { base: 284.9, premiumBase: 407, attach: 40.7, activity: 67.8, team: 10.9, device: 101.8 },
  },
};

const CURRENCY_CODES = Object.keys(DEFAULT_PRICING);

const FO_MIN_SEATS = 20;

const CAPABILITIES = [
  { id: "fin",    group: "Core finance & operations", label: "Financial management and accounting",      note: "GL, AP, AR, bank reconciliation, VAT/sales tax", tier: "essentials" },
  { id: "sales",  group: "Core finance & operations", label: "Sales orders and customer management",      note: "Quotes, orders, invoicing, contact management", tier: "essentials" },
  { id: "purch",  group: "Core finance & operations", label: "Purchasing and payables",                   note: "Requisitions, purchase orders, vendor management", tier: "essentials" },
  { id: "inv",    group: "Core finance & operations", label: "Inventory management",                      note: "Items, locations, costing, transfers", tier: "essentials" },
  { id: "wh",     group: "Core finance & operations", label: "Basic warehousing",                         note: "Bins, put-away, pick and ship", tier: "essentials" },
  { id: "proj",   group: "Core finance & operations", label: "Project and job costing",                   note: "Jobs, resources, WIP, time sheets", tier: "essentials" },
  { id: "fa",     group: "Core finance & operations", label: "Fixed assets",                              note: "Depreciation, disposal, maintenance", tier: "essentials" },

  { id: "mfg",    group: "Manufacturing and service", label: "Manufacturing",                             note: "Production orders, bills of materials, routings", tier: "premium" },
  { id: "cap",    group: "Manufacturing and service", label: "Capacity and production planning",          note: "Machine centres, MPS, MRP, finite loading", tier: "premium" },
  { id: "svc",    group: "Manufacturing and service", label: "Service management",                        note: "Service orders, contracts, dispatch, service items", tier: "premium" },

  { id: "cap_inv", group: "Beyond the core platform", label: "Capture supplier invoices automatically",    note: "Read emailed and scanned invoices, match to purchase orders, no keying", tier: "addon" },
  { id: "appr",    group: "Beyond the core platform", label: "Approval workflows with spending limits",    note: "Route purchases and payments to approvers with a full audit trail", tier: "addon" },
  { id: "exp",     group: "Beyond the core platform", label: "Employee expenses and company card claims",  note: "Photograph receipts, submit mileage, reconcile card transactions", tier: "addon" },
  { id: "scan",    group: "Beyond the core platform", label: "Barcode scanning on handheld devices",       note: "Receive, pick, count and ship scanned in the warehouse", tier: "addon" },
  { id: "ship",    group: "Beyond the core platform", label: "Advanced packing, shipping and freight",     note: "Licence plates, container packing, carrier rates and shipping labels", tier: "addon" },
  { id: "shop",    group: "Beyond the core platform", label: "Shop floor time and output recording",       note: "Operators log job time, quantities and downtime at the machine", tier: "addon" },
  { id: "qc",      group: "Beyond the core platform", label: "Quality inspection and compliance records",  note: "Inspection checklists, test results, non-conformance tracking", tier: "addon" },
  { id: "label",   group: "Beyond the core platform", label: "Barcode and product label printing",         note: "Design and print labels straight from live ERP data", tier: "addon" },
  { id: "portal",  group: "Beyond the core platform", label: "A customer self-service ordering portal",    note: "Customers see their own pricing, stock and order history, and reorder", tier: "addon" },
  { id: "store",   group: "Beyond the core platform", label: "Sell through an online store",               note: "Keep orders, stock, pricing and customers in step with the web store", tier: "addon" },
  { id: "bank",    group: "Beyond the core platform", label: "Connect business bank accounts directly",    note: "Initiate payments and reconcile statements without manual files", tier: "addon" },

  { id: "cons",    group: "Financial depth and compliance", label: "Consolidate ten or more legal entities",        note: "Eliminations, currency translation, group statutory reporting", tier: "beyond", fo: "Consolidations", app: "finance" },
  { id: "subs",    group: "Financial depth and compliance", label: "Subscription or recurring contract billing",    note: "Deferred revenue, milestone billing, ASC 606 and IFRS 15 recognition", tier: "beyond", fo: "Subscription billing", app: "finance" },
  { id: "lease",   group: "Financial depth and compliance", label: "Lease accounting under IFRS 16 or ASC 842",     note: "Right-of-use assets, lease liabilities, payment schedules", tier: "beyond", fo: "Asset leasing", app: "finance" },
  { id: "credit",  group: "Financial depth and compliance", label: "Credit control and collections at scale",       note: "Credit limits and holds, collection cases, promise-to-pay, dunning", tier: "beyond", fo: "Credit and collections", app: "finance" },
  { id: "gtax",    group: "Financial depth and compliance", label: "Statutory tax and e-invoicing in many countries", note: "Country tax engines and government e-invoicing mandates", tier: "beyond", fo: "Globalization and electronic invoicing", app: "finance" },
  { id: "budget",  group: "Financial depth and compliance", label: "Budget planning with funds checking",           note: "Workflow-driven budget preparation, hard and soft budget control", tier: "beyond", fo: "Budgeting", app: "finance" },
  { id: "costacc", group: "Financial depth and compliance", label: "Cost accounting and profitability analysis",    note: "Overhead allocation, cost centres, secondary cost elements", tier: "beyond", fo: "Cost accounting", app: "finance" },
  { id: "projacc", group: "Financial depth and compliance", label: "Project accounting on large contract projects", note: "Work in progress, percentage of completion, multi-currency billing", tier: "beyond", fo: "Project management and accounting", app: "finance" },

  { id: "proc",    group: "Operational depth and scale", label: "Process or formula manufacturing",          note: "Recipes, co-products and by-products, catch weight, potency", tier: "beyond", fo: "Production control, process mode", app: "scm" },
  { id: "awm",     group: "Operational depth and scale", label: "Advanced warehouse execution",              note: "Wave picking, directed workflows, cross-docking, cluster picking", tier: "beyond", fo: "Warehouse management (WMS)", app: "scm" },
  { id: "demand",  group: "Operational depth and scale", label: "Statistical demand forecasting and S&OP",   note: "Forecast models, safety stock policies, planning across multiple sites", tier: "beyond", fo: "Demand planning and Planning Optimization", app: "scm" },
  { id: "trans",   group: "Operational depth and scale", label: "Plan freight, carriers and routes",         note: "Rate shopping, load building, inbound and outbound logistics", tier: "beyond", fo: "Transportation management", app: "scm" },
  { id: "landed",  group: "Operational depth and scale", label: "Cost imported goods accurately",            note: "Apportion duty, freight and insurance; track goods in transit", tier: "beyond", fo: "Landed cost", app: "scm" },
  { id: "asset",   group: "Operational depth and scale", label: "Maintain plant, machinery or a vehicle fleet", note: "Preventive maintenance schedules, work orders, spare parts", tier: "beyond", fo: "Asset management", app: "scm" },
  { id: "config",  group: "Operational depth and scale", label: "Configure products to order from rules",    note: "Rules-based configurator, variants, configure-to-order pricing", tier: "beyond", fo: "Product configurator", app: "scm" },
  { id: "ecm",     group: "Operational depth and scale", label: "Formal engineering change control",         note: "Versioned bills of materials, change requests, approvals, effectivity dates", tier: "beyond", fo: "Engineering change management", app: "scm" },
  { id: "rebate",  group: "Operational depth and scale", label: "Customer rebates, royalties and trade allowances", note: "Rebate agreements, accruals, deductions and claim settlement", tier: "beyond", fo: "Rebate management", app: "scm" },
  { id: "procure", group: "Operational depth and scale", label: "Requisitions, tenders and a vendor portal", note: "Approval hierarchies, sourcing events, vendor collaboration", tier: "beyond", fo: "Procurement and sourcing", app: "scm" },
  { id: "pos",     group: "Operational depth and scale", label: "Retail point of sale and omnichannel",      note: "Store tills, in-store fulfilment, unified online and offline commerce", tier: "beyond", fo: "Dynamics 365 Commerce", app: "commerce" },
  { id: "hr",      group: "Operational depth and scale", label: "Payroll and HR across multiple countries",  note: "Multi-country statutory payroll, benefits, workforce management", tier: "beyond", fo: "Dynamics 365 Human Resources", app: "hr" },
];

const CAPABILITY_IDS = CAPABILITIES.map((c) => c.id);
const CAPABILITY_MAP = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c]));

const GROUPS = [
  "Core finance & operations",
  "Manufacturing and service",
  "Beyond the core platform",
  "Financial depth and compliance",
  "Operational depth and scale",
];

const COLLAPSIBLE = ["Financial depth and compliance", "Operational depth and scale"];

const GROUP_SUB = {
  "Beyond the core platform":
    "Business Central does not do these out of the box. They are delivered by a separate solution on its own subscription — they do not change your Essentials or Premium tier.",
  "Financial depth and compliance":
    "Business Central cannot do these, or handles them in a much lighter form. Any one of them moves the answer to Dynamics 365 Finance.",
  "Operational depth and scale":
    "The same applies here. These map to Supply Chain Management, Commerce or Human Resources — separate applications on the Finance & Operations platform.",
};

const TIER_TAG = {
  essentials: { label: "Essentials",    cls: "tag-ess" },
  premium:    { label: "Premium",       cls: "tag-prem" },
  addon:      { label: "Extension",     cls: "tag-addon" },
  beyond:     { label: "Finance & Ops", cls: "tag-beyond" },
};

const APP_SHORT = { finance: "Finance", scm: "Supply Chain", commerce: "Commerce", hr: "HR" };

const APP_NAME = {
  finance: "Dynamics 365 Finance",
  scm: "Supply Chain Management",
  commerce: "Dynamics 365 Commerce",
  hr: "Dynamics 365 Human Resources",
};

const REVENUE_BANDS = [
  { id: "u5",     label: "Under 5m" },
  { id: "5_25",   label: "5m – 25m" },
  { id: "25_100", label: "25m – 100m" },
  { id: "100p",   label: "Over 100m" },
];

const REVENUE_BAND_IDS = REVENUE_BANDS.map((b) => b.id);

/* Capabilities that force the Supply Chain attach onto the F&O statement. */
const SCM_FORCING_CAPS = ["inv", "wh", "mfg", "cap"];

/* Extensions that can usually keep a warehouse on Business Central. */
const WAREHOUSE_EXTENSIONS = ["scan", "ship", "label"];

const DEFAULT_CONTENT = {
  header: {
    eyebrow: "Dynamics Square · Licence rate card",
    heading: "What do you need the system to do?",
    dek: "Tick the capabilities. The statement reprices as you go — including the parts of Microsoft licensing that quietly cost people money.",
  },
  sections: {
    shapeTitle: "Shape of the business",
    entitiesLabel: "Legal entities",
    countriesLabel: "Countries of operation",
    revenueLabel: "Annual revenue",
    usersTitle: "Who touches the system",
    usersSubtitle: "Count people by what they do, not by department. This is where most licence bills go wrong.",
  },
  steppers: {
    fullLabel: "Create, post and process transactions",
    fullHint: "Full user",
    teamLabel: "Approve, view reports, enter time or expenses",
    teamHint: "Team Member",
    deviceLabel: "Shared shop floor, warehouse or POS terminals",
    deviceHint: "Device",
    activityLabel: "Single-function operational access",
    activityHint: "Operations Activity",
  },
  statement: {
    kicker: "Licence statement",
    emptyText: "Add users to price the licences.",
    perMonth: "Per month",
    perYear: "Per year",
    perThreeYears: "Over three years",
    modulesKicker: "Modules this maps to",
    extensionsKicker: "Also needed · quoted separately",
    extensionsNote:
      "Each is its own subscription, priced per user or per transaction volume depending on the capability. None of them change your {tier} tier.",
    footnote:
      "Licence subscription only. Implementation, data migration, integrations and support are separate.",
    coreOnlyPrefix: "Core platform licences only.",
    peekLabel: "Show the record sales receives",
  },
  locked: {
    kicker: "Based on what you have ticked",
    verdictPrefix: "You need",
    capabilitiesSuffix: "capabilities selected",
    modulesSuffix: "Finance & Operations modules",
    extensionsSuffix: "quoted separately",
    ctaText:
      "Your per-user rates, annual cost and three-year total are ready. Fill in the form below and they appear here instantly.",
  },
  form: {
    heading: "Get the full breakdown",
    body: "Three-year cost model, licence-by-licence detail, and the optimisation notes above written up against your numbers.",
    ctaLabel: "Send me the breakdown",
    lockedHeading: "Show me the pricing",
    lockedBody:
      "Your per-user rates, annual cost and three-year total appear straight away, and we send the full written breakdown to your inbox.",
    lockedCtaLabel: "Unlock my pricing",
    sendingLabel: "Sending…",
    namePlaceholder: "Full name",
    emailPlaceholder: "Work email",
    companyPlaceholder: "Company",
    phonePlaceholder: "Phone (optional)",
    renewalLabel: "If you already run Dynamics, when does your subscription renew?",
    renewalPlaceholder: "e.g. March 2027",
  },
  success: {
    heading: "On its way",
    body: "A consultant will follow up within one working day.",
    unlockedHeading: "Pricing unlocked",
    unlockedBody:
      "Your full statement is above and reprices as you keep adjusting. A consultant will follow up within one working day.",
  },
  errors: {
    // Only this one is servable — the loading and load-failure strings render
    // before the catalog request resolves, so they stay in the component.
    submitFailed: "Something went wrong. Please try again.",
  },
};

const INPUT_LIMITS = {
  entities:      { min: 1, max: 60 },
  countries:     { min: 1, max: 40 },
  fullUsers:     { min: 0, max: 1000 },
  teamUsers:     { min: 0, max: 1000 },
  deviceUsers:   { min: 0, max: 500 },
  activityUsers: { min: 0, max: 1000 },
};

module.exports = {
  DEFAULT_PRICING,
  CURRENCY_CODES,
  FO_MIN_SEATS,
  CAPABILITIES,
  CAPABILITY_IDS,
  CAPABILITY_MAP,
  GROUPS,
  COLLAPSIBLE,
  GROUP_SUB,
  TIER_TAG,
  APP_SHORT,
  APP_NAME,
  REVENUE_BANDS,
  REVENUE_BAND_IDS,
  SCM_FORCING_CAPS,
  WAREHOUSE_EXTENSIONS,
  INPUT_LIMITS,
  DEFAULT_CONTENT,
};
