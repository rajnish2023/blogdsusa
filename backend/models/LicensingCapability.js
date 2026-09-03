const mongoose = require("mongoose");

const licensingCapabilitySchema = new mongoose.Schema(
  {
    capId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 40,
      match: [/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores only"],
    },
    group: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 160 },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    tier: { type: String, required: true, enum: ["essentials", "premium", "addon", "beyond"] },

    // Finance & Operations mapping — only meaningful when tier === "beyond"
    fo: { type: String, trim: true, maxlength: 120, default: "" },
    app: { type: String, enum: ["finance", "scm", "commerce", "hr", null], default: null },

    /* Engine behaviour flags, previously hardcoded id lists. */
    forcesScmAttach: { type: Boolean, default: false },
    isWarehouseExtension: { type: Boolean, default: false },

    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

licensingCapabilitySchema.index({ group: 1, sortOrder: 1 });
licensingCapabilitySchema.index({ active: 1 });

module.exports = mongoose.model("LicensingCapability", licensingCapabilitySchema);
