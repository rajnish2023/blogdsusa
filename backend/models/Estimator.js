const mongoose = require("mongoose");

const estimatorSchema = new mongoose.Schema(
  {
    legacy_id: { type: Number, required: true, unique: true, index: true },

    estimator_name: { type: String, required: true, trim: true, maxlength: 255 },
    estimator_slug: { type: String, default: null, trim: true },

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

    selectedPage: { type: Number, default: 1 },

    isLive: { type: Number, enum: [0, 1], default: 0 },

    /* --- SEO for the public landing page ---------------------------------- */

    meta_title:       { type: String, default: null },
    meta_keyword:     { type: String, default: null },
    meta_description: { type: String, default: null },
    meta_tag:         { type: String, default: null },
    meta_image:       { type: String, default: null },

    // 1 => index,follow. 0 => noindex,nofollow.
    isindex: { type: Number, enum: [0, 1], default: 0 },

    short_description: { type: String, default: null },
    additional_script: { type: String, default: null },

    page_view: { type: mongoose.Schema.Types.Mixed, default: null },

    // Laravel SoftDeletes. Null means live.
    deleted_at: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

estimatorSchema.index(
  { estimator_slug: 1 },
  { unique: true, partialFilterExpression: { estimator_slug: { $type: "string" } } }
);

estimatorSchema.statics.activeFilter = function () {
  return { status: "1", deleted_at: null };
};

estimatorSchema.statics.liveFilter = function () {
  return { status: "1", isLive: 1, deleted_at: null };
};

module.exports = mongoose.model("Estimator", estimatorSchema);
