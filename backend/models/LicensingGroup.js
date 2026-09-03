const mongoose = require("mongoose");

const licensingGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    subtitle: { type: String, trim: true, maxlength: 600, default: "" },
    collapsible: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

licensingGroupSchema.index({ sortOrder: 1 });

module.exports = mongoose.model("LicensingGroup", licensingGroupSchema);
