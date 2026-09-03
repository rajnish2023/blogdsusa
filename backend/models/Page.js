const mongoose = require("mongoose");

const PageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, index: true },
 
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ sections: [] }),
    },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "PageCategory" },

    seo: {
      metaTitle: { type: String, trim: true, maxlength: 70, default: "" },
      metaDescription: { type: String, trim: true, maxlength: 200, default: "" },
      focusKeyword: { type: String, trim: true, maxlength: 100, default: "" },
    },
    seoScore: { type: Number, default: 0 },

    status: { type: String, enum: ["draft", "published"], default: "draft" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

PageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Page", PageSchema);
