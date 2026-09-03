const PageCategory = require("../models/PageCategory");
const Page = require("../models/Page");
const { generateUniqueSlug } = require("../utils/slug");

exports.listPageCategories = async (req, res) => {
  try {
    const categories = await PageCategory.find().sort({ name: 1 });
    const counts = await Page.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.filter((c) => c._id).map((c) => [c._id.toString(), c.count]));

    res.json({
      items: categories.map((c) => ({ ...c.toObject(), postCount: countMap[c._id.toString()] || 0 })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load page categories" });
  }
};

exports.createPageCategory = async (req, res) => {
  try {
    const { name, description = "", color } = req.body;
    const existing = await PageCategory.findOne({ name: name.trim() });
    if (existing) return res.status(409).json({ message: "A category with that name already exists" });

    const slug = await generateUniqueSlug(PageCategory, name);
    const category = await PageCategory.create({ name: name.trim(), slug, description, color });
    res.status(201).json({ category });
  } catch (err) {
    res.status(500).json({ message: "Failed to create category" });
  }
};

exports.updatePageCategory = async (req, res) => {
  try {
    const category = await PageCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const { name, description, color } = req.body;
    if (name && name.trim() !== category.name) {
      const existing = await PageCategory.findOne({ name: name.trim() });
      if (existing) return res.status(409).json({ message: "A category with that name already exists" });
      category.name = name.trim();
      category.slug = await generateUniqueSlug(PageCategory, name, category._id);
    }
    if (description !== undefined) category.description = description;
    if (color) category.color = color;

    await category.save();
    res.json({ category });
  } catch (err) {
    res.status(500).json({ message: "Failed to update category" });
  }
};

exports.deletePageCategory = async (req, res) => {
  try {
    const category = await PageCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const inUse = await Page.countDocuments({ category: category._id });
    if (inUse > 0) {
      return res.status(400).json({ message: `${inUse} page(s) still use this category. Reassign them first.` });
    }

    await category.deleteOne();
    res.json({ message: "Category deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete category" });
  }
};
