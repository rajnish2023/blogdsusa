const mongoose = require("mongoose");

const estimatorSchema = new mongoose.Schema(
  {
    legacy_id: { type: Number, required: true, unique: true, index: true },

    estimator_name: { type: String, required: true, trim: true, maxlength: 255 },

    // Legacy stored this as a JSON string, e.g. '[1]'. Modelled as a real array
    // of EstimatorService.legacy_id values; the API layer re-encodes it.
    service_id: { type: [Number], default: [] },

    // Kept as a string because Laravel typed the column varchar(255) and the
    // pricing maths casts it numerically. "16000" must not become 16000.
    base_cost: { type: String, default: "0" },

    base_ques:    { type: String, default: null },
    base_details: { type: String, default: null },

    // "0" => Draft, "1" => Active
    status: { type: String, enum: ["0", "1"], default: "1" },

    // Currency.legacy_id, not an ObjectId — matches the legacy int column.
    currency: { type: Number, required: true },

    // Laravel SoftDeletes. Null means live.
    deleted_at: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

estimatorSchema.statics.activeFilter = function () {
  return { status: "1", deleted_at: null };
};

module.exports = mongoose.model("Estimator", estimatorSchema);
