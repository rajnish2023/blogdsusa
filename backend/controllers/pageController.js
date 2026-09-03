const Page = require("../models/Page");
const PageCategory = require("../models/PageCategory");
const { calculateSeoScore } = require("../utils/seoScore");
const { generateUniqueSlug } = require("../utils/slug");
const { sanitizePageContent, extractTextFromContent } = require("../utils/sanitizePageContent");

const populateOpts = [
  { path: "category", select: "name slug color" },
  { path: "author", select: "name avatarUrl avatarColor" },
];

// GET /api/pages?search=&category=&status=&page=
exports.listPages = async (req, res) => {
  try {
    const { search = "", category = "", status = "", page = 1, limit = 12 } = req.query;

    const query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    if (category) query.category = category;
    if (status) query.status = status;

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(parseInt(limit, 10) || 12, 50);

    const [items, total] = await Promise.all([
      Page.find(query)
        .select("-content")
        .populate(populateOpts)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Page.countDocuments(query),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      counts: {
        all: await Page.countDocuments({}),
        draft: await Page.countDocuments({ status: "draft" }),
        published: await Page.countDocuments({ status: "published" }),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load pages" });
  }
};

// GET /api/pages/:id
exports.getPage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id).populate(populateOpts);
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json({ page });
  } catch (err) {
    res.status(500).json({ message: "Failed to load page" });
  }
};

// POST /api/pages
exports.createPage = async (req, res) => {
  try {
    const { title, content, category, seo = {}, status, slug: requestedSlug } = req.body;

    if (category) {
      const cat = await PageCategory.findById(category);
      if (!cat) return res.status(400).json({ message: "Selected category does not exist" });
    }

    const cleanContent = sanitizePageContent(content);
    const slug = await generateUniqueSlug(Page, requestedSlug || title);

    const wantsPublish = status === "published";
    const canPublish = req.user.role.isSuperAdmin || req.user.role.permissions.includes("pages:publish");
    const finalStatus = wantsPublish && canPublish ? "published" : "draft";

    const seoScore = calculateSeoScore({
      title,
      content: extractTextFromContent(cleanContent),
      metaDescription: seo.metaDescription || "",
      slug,
      focusKeyword: seo.focusKeyword || "",
    }).score;

    const page = await Page.create({
      title,
      slug,
      content: cleanContent,
      category: category || undefined,
      seo,
      seoScore,
      status: finalStatus,
      author: req.user.id,
      publishedAt: finalStatus === "published" ? new Date() : undefined,
    });

    const populated = await page.populate(populateOpts);
    res.status(201).json({ page: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create page" });
  }
};

// PATCH /api/pages/:id
exports.updatePage = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const { title, content, category, seo, slug: requestedSlug } = req.body;

    if (category !== undefined) {
      if (category) {
        const cat = await PageCategory.findById(category);
        if (!cat) return res.status(400).json({ message: "Selected category does not exist" });
      }
      page.category = category || undefined;
    }

    if (title) page.title = title;

    if (requestedSlug && requestedSlug !== page.slug) {
      page.slug = await generateUniqueSlug(Page, requestedSlug, page._id);
    }

    if (content !== undefined) {
      page.content = sanitizePageContent(content);
    }
    if (seo) page.seo = { ...page.seo.toObject(), ...seo };

    page.seoScore = calculateSeoScore({
      title: page.title,
      content: extractTextFromContent(page.content),
      metaDescription: page.seo.metaDescription || "",
      slug: page.slug,
      focusKeyword: page.seo.focusKeyword || "",
    }).score;

    await page.save();
    const populated = await page.populate(populateOpts);
    res.json({ page: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update page" });
  }
};

// PATCH /api/pages/:id/status   { status: "draft" | "published" }
exports.setPageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found" });

    page.status = status;
    if (status === "published" && !page.publishedAt) page.publishedAt = new Date();
    await page.save();

    const populated = await page.populate(populateOpts);
    res.json({ page: populated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
};

// DELETE /api/pages/:id
exports.deletePage = async (req, res) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json({ message: "Page deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete page" });
  }
};
