const Category = require("../models/Category");
const Blog = require("../models/Blog");
const { generateUniqueSlug } = require("../utils/slug");

exports.listCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    const counts = await Blog.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.filter((c) => c._id).map((c) => [c._id.toString(), c.count]));

    res.json({
      items: categories.map((c) => ({ ...c.toObject(), postCount: countMap[c._id.toString()] || 0 })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load categories" });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description = "", color } = req.body;
    const existing = await Category.findOne({ name: name.trim() });
    if (existing) return res.status(409).json({ message: "A category with that name already exists" });

    const slug = await generateUniqueSlug(Category, name);
    const category = await Category.create({ name: name.trim(), slug, description, color });
    res.status(201).json({ category });
  } catch (err) {
    res.status(500).json({ message: "Failed to create category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const { name, description, color } = req.body;
    if (name && name.trim() !== category.name) {
      const existing = await Category.findOne({ name: name.trim() });
      if (existing) return res.status(409).json({ message: "A category with that name already exists" });
      category.name = name.trim();
      category.slug = await generateUniqueSlug(Category, name, category._id);
    }
    if (description !== undefined) category.description = description;
    if (color) category.color = color;

    await category.save();
    res.json({ category });
  } catch (err) {
    res.status(500).json({ message: "Failed to update category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const inUse = await Blog.countDocuments({ category: category._id });
    if (inUse > 0) {
      return res.status(400).json({ message: `${inUse} post(s) still use this category. Reassign them first.` });
    }

    await category.deleteOne();
    res.json({ message: "Category deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete category" });
  }
};
