const mongoose = require("mongoose");
const { SOURCE_IDS, COMPLEXITY_IDS, bandIds } = require("../config/migrationCatalog");
const { CURRENCY_CODES } = require("../config/licensingCatalog");

const migrationLeadSchema = new mongoose.Schema(
  {
    // --- contact ---
    name:    { type: String, required: true, trim: true, maxlength: 120 },
    email:   { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    company: { type: String, trim: true, maxlength: 150, default: "" },
    phone:   { type: String, trim: true, maxlength: 30, default: "" },
    source:  { type: String, trim: true, maxlength: 200, default: "migration-assessment" },

    // --- what they told us ---
    currentSystem: { type: String, enum: [...SOURCE_IDS, ""], default: "" },
    currentSystemLabel: { type: String, default: "" },
    version:       { type: String, trim: true, maxlength: 120, default: "" },
    yearsOnIt:     { type: String, default: "" },
    usersBand:     { type: String, enum: bandIds("users"), default: "u75" },
    entitiesBand:  { type: String, enum: bandIds("entities"), default: "e1" },
    countriesBand: { type: String, enum: bandIds("countries"), default: "c1" },
    revenueBand:   { type: String, enum: bandIds("revenue"), default: "r50" },
    volumeBand:    { type: String, enum: bandIds("volume"), default: "v10" },
    requirements:  { type: [String], enum: COMPLEXITY_IDS, default: [] },
    customisations:{ type: String, default: "few" },
    integrations:  { type: Number, default: 0 },
    history:       { type: String, default: "h5" },
    itCapability:  { type: String, default: "small" },
    golive:        { type: String, default: "g12" },
    budget:        { type: String, default: "exploring" },
    fullUsers:     { type: Number, default: 0 },
    lightUsers:    { type: Number, default: 0 },

    // --- what the engine decided (authoritative) ---
    routingScore: { type: Number, default: 0 },
    platform:     { type: String, enum: ["bc", "fo", "overlap"], default: "overlap" },
    lean:         { type: String, enum: ["bc", "fo"], default: "bc" },
    verdict:      { type: String, default: "" },
    decisiveRequirements: { type: [String], default: [] },

    complexityScore:   { type: Number, default: 0 },
    complexityDrivers: { type: [String], default: [] },
    minMonths:         { type: Number, default: 0 },
    maxMonths:         { type: Number, default: 0 },
    timelineConflict:  { type: Boolean, default: false },
    lifecycleExposure: { type: Boolean, default: false },

    currency:     { type: String, enum: CURRENCY_CODES, default: "USD" },
    licenceTier:  { type: String, default: "" },
    billedFullUsers: { type: Number, default: 0 },
    monthlyTotal: { type: Number, default: 0 },
    annualTotal:  { type: Number, default: 0 },
    pricingVerified: { type: String, default: "" },
    pricingTrusted:  { type: Boolean, default: false },

    leadScore:   { type: Number, default: 0 },
    leadRouting: { type: String, default: "" },

    status: { type: String, enum: ["new", "contacted", "qualified", "closed"], default: "new" },
    notes:  { type: String, trim: true, maxlength: 2000, default: "" },

    ip:        { type: String },
    userAgent: { type: String, maxlength: 400 },
  },
  { timestamps: true }
);

migrationLeadSchema.index({ email: 1 });
migrationLeadSchema.index({ status: 1, createdAt: -1 });
migrationLeadSchema.index({ platform: 1, createdAt: -1 });
migrationLeadSchema.index({ leadScore: -1, createdAt: -1 });

module.exports = mongoose.model("MigrationLead", migrationLeadSchema);
