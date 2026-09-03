const mongoose = require("mongoose");
const { PERMISSION_KEYS } = require("../config/permissions");

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 200, default: "" },
    permissions: {
      type: [String],
      enum: PERMISSION_KEYS,
      default: [],
    },
   
    isSystem: { type: Boolean, default: false },
    isSuperAdmin: { type: Boolean, default: false }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", RoleSchema);
