const mongoose = require("mongoose");

/* Ported from the Laravel `estimator_services` table. An estimator points at
   these by id through its `service_id` array. */

const estimatorServiceSchema = new mongoose.Schema(
  {
    legacy_id: { type: Number, required: true, unique: true, index: true },

    service_name: { type: String, required: true, trim: true, maxlength: 255 },
    status:       { type: String, enum: ["0", "1"], default: "1" },
    added_by:     { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("EstimatorService", estimatorServiceSchema);
