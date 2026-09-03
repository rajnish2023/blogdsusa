const Blog = require("../models/Blog");
const Category = require("../models/Category");
const User = require("../models/User");
const { sanitizeBlogContent } = require("../utils/sanitizeContent");
const { calculateSeoScore } = require("../utils/seoScore");
const { generateUniqueSlug } = require("../utils/slug");

const stripHtml = (html = "") => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const validateSchemaMarkup = (entries = []) => {
  if (!Array.isArray(entries)) return { valid: true, cleaned: [] };
  const cleaned = [];
  for (const entry of entries) {
    const json = (entry.json || "").trim();
    if (!json) continue; // skip empty entries rather than error
    try {
      JSON.parse(json);
    } catch {
      return { valid: false, error: `Invalid JSON in "${entry.type || "Custom"}" schema block` };
    }
    cleaned.push({ type: entry.type || "Custom", json });
  }
  return { valid: true, cleaned };
};

const buildExcerpt = (content) => {
  const text = stripHtml(content);
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
};

const readingTime = (content) => {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

const populateOpts = [
  { path: "category", select: "name slug color" },
  { path: "author", select: "name avatarUrl avatarColor designation authorSlug socialLinks about schemaMarkup" },
];

// GET /api/blogs?search=&category=&status=&page=
exports.listBlogs = async (req, res) => {
  try {
    const { search = "", category = "", status = "", page = 1, limit = 12 } = req.query;

    const query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    if (category) query.category = category;
    if (status) query.status = status;

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(parseInt(limit, 10) || 12, 50);

    const [items, total] = await Promise.all([
      Blog.find(query)
        .populate(populateOpts)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Blog.countDocuments(query),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      counts: {
        all: await Blog.countDocuments({}),
        draft: await Blog.countDocuments({ status: "draft" }),
        published: await Blog.countDocuments({ status: "published" }),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load blog posts" });
  }
};

// GET /api/blogs/:id
exports.getBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate(populateOpts);
    if (!blog) return res.status(404).json({ message: "Post not found" });
    res.json({ blog });
  } catch (err) {
    res.status(500).json({ message: "Failed to load post" });
  }
};

// POST /api/blogs
exports.createBlog = async (req, res) => {
  try {
    const { title, content = "", excerpt, category, tags = [], seo = {}, status, featuredImage, slug: requestedSlug, schemaMarkup = [], faqs = [] } = req.body;

    if (category) {
      const cat = await Category.findById(category);
      if (!cat) return res.status(400).json({ message: "Selected category does not exist" });
    }

    const schemaResult = validateSchemaMarkup(schemaMarkup);
    if (!schemaResult.valid) return res.status(400).json({ message: schemaResult.error });

    const cleanContent = sanitizeBlogContent(content);
    const slug = await generateUniqueSlug(Blog, requestedSlug || title);

    const wantsPublish = status === "published";
     
    const canPublish = req.user.role.isSuperAdmin || req.user.role.permissions.includes("blog:publish");
    const finalStatus = wantsPublish && canPublish ? "published" : "draft";

    const seoScore = calculateSeoScore({
      title,
      content: cleanContent,
      metaDescription: seo.metaDescription || "",
      slug,
      focusKeyword: seo.focusKeyword || "",
    }).score;

    const blog = await Blog.create({
      title,
      slug,
      content: cleanContent,
      excerpt: excerpt?.trim() || buildExcerpt(cleanContent),
      featuredImage: featuredImage || undefined,
      category: category || undefined,
      tags: Array.isArray(tags) ? tags.slice(0, 15).map((t) => t.trim()).filter(Boolean) : [],
      seo,
      seoScore,
      schemaMarkup: schemaResult.cleaned,
      faqs: Array.isArray(faqs)
        ? faqs.map((f) => ({
            question: (f.question || "").trim(),
            answer: sanitizeBlogContent(f.answer || ""),
          }))
        : [],
      status: finalStatus,
      author: req.user.id,
      publishedAt: finalStatus === "published" ? new Date() : undefined,
      readingTimeMinutes: readingTime(cleanContent),
    });

    const populated = await blog.populate(populateOpts);
    res.status(201).json({ blog: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create post" });
  }
};

// PATCH /api/blogs/:id
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Post not found" });

    const { title, content, excerpt, category, tags, seo, featuredImage, slug: requestedSlug, schemaMarkup, author, faqs } = req.body;

    if (category !== undefined) {
      if (category) {
        const cat = await Category.findById(category);
        if (!cat) return res.status(400).json({ message: "Selected category does not exist" });
      }
      blog.category = category || undefined;
    }
 
    if (author && author !== blog.author.toString()) {
      const newAuthor = await User.findById(author);
      if (!newAuthor) return res.status(400).json({ message: "Selected author does not exist" });
      blog.author = newAuthor._id;
    }

    if (schemaMarkup !== undefined) {
      const schemaResult = validateSchemaMarkup(schemaMarkup);
      if (!schemaResult.valid) return res.status(400).json({ message: schemaResult.error });
      blog.schemaMarkup = schemaResult.cleaned;
    }

    if (title) blog.title = title;

    if (requestedSlug && requestedSlug !== blog.slug) {
      blog.slug = await generateUniqueSlug(Blog, requestedSlug, blog._id);
    }

    if (content !== undefined) {
      blog.content = sanitizeBlogContent(content);
      blog.readingTimeMinutes = readingTime(blog.content);
      if (!excerpt) blog.excerpt = buildExcerpt(blog.content);
    }
    if (excerpt !== undefined && excerpt.trim()) blog.excerpt = excerpt.trim();
    if (featuredImage !== undefined) blog.featuredImage = featuredImage;
    if (Array.isArray(tags)) blog.tags = tags.slice(0, 15).map((t) => t.trim()).filter(Boolean);
    if (seo) blog.seo = { ...blog.seo.toObject(), ...seo };

    if (faqs !== undefined) {
      blog.faqs = Array.isArray(faqs)
        ? faqs.map((f) => ({
            question: (f.question || "").trim(),
            answer: sanitizeBlogContent(f.answer || ""),
          }))
        : [];
    }

    blog.seoScore = calculateSeoScore({
      title: blog.title,
      content: blog.content,
      metaDescription: blog.seo.metaDescription || "",
      slug: blog.slug,
      focusKeyword: blog.seo.focusKeyword || "",
    }).score;

    await blog.save();
    const populated = await blog.populate(populateOpts);
    res.json({ blog: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update post" });
  }
};
 
exports.setBlogStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Post not found" });

    blog.status = status;
    if (status === "published" && !blog.publishedAt) blog.publishedAt = new Date();
    await blog.save();

    const populated = await blog.populate(populateOpts);
    res.json({ blog: populated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
};

// DELETE /api/blogs/:id
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete post" });
  }
};
 
exports.previewSeoScore = async (req, res) => {
  try {
    const { title = "", content = "", metaDescription = "", slug = "", focusKeyword = "" } = req.body;
    const result = calculateSeoScore({ title, content: sanitizeBlogContent(content), metaDescription, slug, focusKeyword });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to compute SEO score" });
  }
};

exports.bulkDeleteBlogs = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: "Invalid payload. 'ids' array is required." });
    }
    await Blog.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: `${ids.length} blogs deleted successfully` });
  } catch (err) {
    console.error("Bulk delete blogs error:", err);
    res.status(500).json({ message: "Failed to delete blogs" });
  }
};

exports.bulkExportBlogs = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: "Invalid payload. 'ids' array is required." });
    }
    const blogs = await Blog.find({ _id: { $in: ids } })
      .populate("author", "name email")
      .populate("category", "name slug")
      .lean();
      
    // Send as a downloadable JSON file
    res.setHeader("Content-Disposition", "attachment; filename=blogs_export.json");
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(blogs, null, 2));
  } catch (err) {
    console.error("Bulk export blogs error:", err);
    res.status(500).json({ message: "Failed to export blogs" });
  }
};
