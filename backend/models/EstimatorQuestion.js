const mongoose = require("mongoose");

/* Ported from the Laravel `estimator_questions` table. */

const answerSchema = new mongoose.Schema(
  {
    option:     { type: String, default: "" },
    type:       { type: String, default: "range" }, // "range" | "cost" | "percentage"
    min:        { type: String, default: null },
    max:        { type: String, default: null },
    cost:       { type: String, default: null },
    percentage: { type: String, default: null },
  },
  { _id: false }
);

const estimatorQuestionSchema = new mongoose.Schema(
  {
    legacy_id: { type: Number, required: true, unique: true, index: true },

    // Estimator.legacy_id, matching the legacy int column.
    estimator_id: { type: Number, required: true, index: true },

    ques_name:    { type: String, required: true },
    ques_details: { type: String, default: null }, // HTML bullet list shown under the question

    answers: { type: [answerSchema], default: [] },

    multi_select:          { type: String, enum: ["0", "1"], default: "0" },
    require_single_select: { type: String, enum: ["0", "1"], default: "0" },
    input_field:           { type: String, enum: ["0", "1"], default: "0" },

    priority: { type: Number, default: 1 },

    // Legacy column is varchar; the public API sorts on it ascending.
    order: { type: String, default: null },

    deleted_at: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

estimatorQuestionSchema.index({ estimator_id: 1, deleted_at: 1 });

module.exports = mongoose.model("EstimatorQuestion", estimatorQuestionSchema);
