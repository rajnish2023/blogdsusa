const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true }, // name on disk
    type: { type: String, enum: ["image", "video"], required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },  
    url: { type: String, required: true },  
    thumbnailUrl: { type: String }, 
    alt: { type: String, trim: true, maxlength: 250, default: "" },
    width: { type: Number },
    height: { type: Number },
    uploadedBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

MediaSchema.index({ createdAt: -1 });
MediaSchema.index({ originalName: "text" });

module.exports = mongoose.model("Media", MediaSchema);
