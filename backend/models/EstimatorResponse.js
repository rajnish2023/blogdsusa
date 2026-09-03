const mongoose = require("mongoose");

const answeredQuestionSchema = new mongoose.Schema(
  {
    ques_id:   { type: Number },
    ques_name: { type: String },
    // String for a radio, array of strings for a multi-select, null if skipped.
    answer:    { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const estimatorResponseSchema = new mongoose.Schema(
  {
    legacy_id: { type: Number, required: true, unique: true, index: true },

    // Estimator.legacy_id
    estimator_id: { type: Number, required: true, index: true },

    data: { type: [answeredQuestionSchema], default: [] },

    name:  { type: String, default: "", trim: true, maxlength: 255 },
    email: { type: String, default: "", trim: true, maxlength: 255 },
    phone: { type: String, default: "", trim: true, maxlength: 255 },

    // Legacy comment reads '0=> Agree, 1=> Not Agree'. Never actually written
    // by the controller — the assignment is commented out upstream — so every
    // migrated row is "0". Preserved for data fidelity.
    terms_agree: { type: String, enum: ["0", "1"], default: "0" },

    deleted_at: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

estimatorResponseSchema.index({ estimator_id: 1, created_at: -1 });

module.exports = mongoose.model("EstimatorResponse", estimatorResponseSchema);
