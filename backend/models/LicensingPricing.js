const mongoose = require("mongoose");
const { CURRENCY_CODES } = require("../config/licensingCatalog");

const bcRatesSchema = new mongoose.Schema(
  {
    essentials: { type: Number, required: true, min: 0 },
    premium:    { type: Number, required: true, min: 0 },
    team:       { type: Number, required: true, min: 0 },
    device:     { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const foRatesSchema = new mongoose.Schema(
  {
    base:        { type: Number, required: true, min: 0 },
    premiumBase: { type: Number, required: true, min: 0 },
    attach:      { type: Number, required: true, min: 0 },
    activity:    { type: Number, required: true, min: 0 },
    team:        { type: Number, required: true, min: 0 },
    device:      { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const licensingPricingSchema = new mongoose.Schema(
  {
    code:     { type: String, required: true, unique: true, uppercase: true, trim: true, enum: CURRENCY_CODES },
    symbol:   { type: String, required: true, trim: true, maxlength: 5 },
    verified: { type: String, required: true, trim: true, maxlength: 60, default: "placeholder" },
    trusted:  { type: Boolean, default: false },
    bc:       { type: bcRatesSchema, required: true },
    fo:       { type: foRatesSchema, required: true },

    countries: { type: [String], default: [] },
    isDefault: { type: Boolean, default: false },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LicensingPricing", licensingPricingSchema);
