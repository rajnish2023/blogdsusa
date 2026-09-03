const mongoose = require("mongoose");

const currencySchema = new mongoose.Schema(
  {
    legacy_id: { type: Number, required: true, unique: true, index: true },

    name:   { type: String, required: true, trim: true, maxlength: 255 },
    symbol: { type: String, required: true, trim: true, maxlength: 255 },
    status: { type: String, enum: ["0", "1"], default: "1" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Mirrors Laravel's Currency::active() scope.
currencySchema.statics.active = function () {
  return this.find({ status: "1" });
};

module.exports = mongoose.model("Currency", currencySchema);
