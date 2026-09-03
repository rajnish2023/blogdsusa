const mongoose = require("mongoose");

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, default: "" },  
    excerpt: { type: String, trim: true, maxlength: 300, default: "" },

    featuredImage: {
      url: { type: String, default: "" },
      alt: { type: String, default: "" },
    },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    tags: { type: [String], default: [] },

    seo: {
      metaTitle: { type: String, trim: true, maxlength: 70, default: "" },
      metaDescription: { type: String, trim: true, maxlength: 200, default: "" },
      focusKeyword: { type: String, trim: true, maxlength: 100, default: "" },
      noIndex: { type: Boolean, default: false },
    },
    seoScore: { type: Number, default: 0 },
 
    schemaMarkup: [
      {
        type: {
          type: String,
          enum: ["Article", "BlogPosting", "FAQPage", "HowTo", "Product", "Review", "Custom"],
          default: "Article",
        },
        json: { type: String, default: "" }, // raw JSON-LD, validated on save
      },
    ],

    status: { type: String, enum: ["draft", "published"], default: "draft" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    publishedAt: { type: Date },
    readingTimeMinutes: { type: Number, default: 1 },
    views: { type: Number, default: 0, index: true },
 
    faqs: [
      {
        question: { type: String, default: "" },
        answer: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

BlogSchema.index({ title: "text", content: "text" });
BlogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Blog", BlogSchema);
