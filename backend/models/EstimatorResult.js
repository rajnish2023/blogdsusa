const mongoose = require("mongoose");

const estimatorResultSchema = new mongoose.Schema(
  {
    legacy_id: { type: Number, required: true, unique: true, index: true },

    // Estimator.legacy_id
    est_id: { type: Number, required: true, unique: true, index: true },

    intro_heading:       { type: String, default: "" },
    intro_text:          { type: String, default: "" },
    pricing_explanation: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("EstimatorResult", estimatorResultSchema);
