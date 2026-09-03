const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 120 },
  email:    { type: String, required: true, trim: true, maxlength: 200 },
  phone:    { type: String, trim: true, maxlength: 30 },
  company:  { type: String, trim: true, maxlength: 150 },
  service:  { type: String, trim: true, maxlength: 200 },
  message:  { type: String, trim: true, maxlength: 2000 },
  source:   { type: String, trim: true, maxlength: 200 },   // page slug where form was submitted
  status:   { type: String, enum: ["new", "contacted", "qualified", "closed"], default: "new" },
  ip:       { type: String },
}, { timestamps: true });

leadSchema.index({ email: 1 });
leadSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Lead", leadSchema);
