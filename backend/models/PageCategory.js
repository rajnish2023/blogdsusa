const mongoose = require("mongoose");
const slugify = require("slugify");

const PageCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 200, default: "" },
    color: { type: String, default: "#3355FF" },
  },
  { timestamps: true }
);

PageCategorySchema.pre("validate", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model("PageCategory", PageCategorySchema);
