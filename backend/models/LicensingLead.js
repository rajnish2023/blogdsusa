const mongoose = require("mongoose");
const { CURRENCY_CODES, REVENUE_BAND_IDS } = require("../config/licensingCatalog");

const lineSchema = new mongoose.Schema(
  {
    k:     { type: String },
    qty:   { type: Number },
    label: { type: String },
    sub:   { type: String },
    rate:  { type: Number },
    total: { type: Number },
  },
  { _id: false }
);

const licensingLeadSchema = new mongoose.Schema(
  {
    // --- contact ---
    name:    { type: String, required: true, trim: true, maxlength: 120 },
    email:   { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    company: { type: String, trim: true, maxlength: 150, default: "" },
    phone:   { type: String, trim: true, maxlength: 30, default: "" },
    renewal: { type: String, trim: true, maxlength: 60, default: "" }, // free text, e.g. "March 2027"
    source:  { type: String, trim: true, maxlength: 200, default: "licence-rate-card" },

    // --- what they asked the system to do ---
    capabilities: { type: [String], default: [] },
    entities:      { type: Number, default: 1 },
    countries:     { type: Number, default: 1 },
    revenueBand:   { type: String, enum: REVENUE_BAND_IDS, default: "5_25" },
    fullUsers:     { type: Number, default: 0 },
    teamUsers:     { type: Number, default: 0 },
    deviceUsers:   { type: Number, default: 0 },
    activityUsers: { type: Number, default: 0 },

    // --- what the engine priced (server-side, authoritative) ---
    currency:      { type: String, enum: CURRENCY_CODES, default: "USD" },
    platform:      { type: String, enum: ["bc", "fo"], default: "bc" },
    tier:          { type: String, enum: ["essentials", "premium", null], default: null },
    lines:         { type: [lineSchema], default: [] },
    monthlyTotal:  { type: Number, default: 0 },
    annualTotal:   { type: Number, default: 0 },
    threeYearTotal:{ type: Number, default: 0 },
    premiumDrivers:      { type: [String], default: [] },
    escalationDrivers:   { type: [String], default: [] },
    applicationsRequired:{ type: [String], default: [] },
    extensionsRequired:  { type: [String], default: [] },
    pricingVerified: { type: String, default: "" },
    pricingTrusted:  { type: Boolean, default: false },

    status:  { type: String, enum: ["new", "contacted", "qualified", "closed"], default: "new" },
    notes:   { type: String, trim: true, maxlength: 2000, default: "" },

    ip:        { type: String },
    userAgent: { type: String, maxlength: 400 },
  },
  { timestamps: true }
);

licensingLeadSchema.index({ email: 1 });
licensingLeadSchema.index({ status: 1, createdAt: -1 });
licensingLeadSchema.index({ platform: 1, createdAt: -1 });

module.exports = mongoose.model("LicensingLead", licensingLeadSchema);
