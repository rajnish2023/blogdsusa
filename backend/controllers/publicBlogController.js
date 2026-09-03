const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const Category = require("../models/Category");
const User = require("../models/User");

const SAFE_AUTHOR_FIELDS = "name designation avatarUrl avatarColor about authorSlug socialLinks schemaMarkup";

const SAFE_CATEGORY_FIELDS = "name slug description color";

//  1. Get Paginated Published Blogs  
exports.listPublicBlogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Filter defaults
    const query = { status: "published" };

    // Search query parameter
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
      query.$or = [{ title: searchRegex }, { content: searchRegex }, { excerpt: searchRegex }];
    }

    // Category filter by Slug (more user-friendly than ID)
    if (req.query.categorySlug) {
      const category = await Category.findOne({ slug: req.query.categorySlug.trim() });
      if (category) {
        query.category = category._id;
      } else {
        // If category parameter passed but not found, return empty results
        return res.status(200).json({
          blogs: [],
          pagination: { page, limit, totalPages: 0, totalBlogs: 0 },
        });
      }
    }

    // Sorting
    let sort = { publishedAt: -1, createdAt: -1 }; // default: latest
    if (req.query.sort === "oldest") {
      sort = { publishedAt: 1, createdAt: 1 };
    } else if (req.query.sort === "views") {
      sort = { views: -1, publishedAt: -1 };
    } else if (req.query.sort === "title") {
      sort = { title: 1 };
    }

    const [blogs, totalBlogs] = await Promise.all([
      Blog.find(query)
        .select("title slug excerpt featuredImage readingTimeMinutes publishedAt updatedAt")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("category", "name slug")
        .populate("author", "name authorSlug")
        .lean(),
      Blog.countDocuments(query),
    ]);

    res.status(200).json({
      blogs,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalBlogs / limit),
        totalBlogs,
      },
    });
  } catch (err) {
    console.error("listPublicBlogs error:", err);
    res.status(500).json({ message: "Error fetching blogs" });
  }
};

// 2. Get Single Blog details by Slug 
exports.getPublicBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== "string") {
      return res.status(400).json({ message: "Valid slug is required" });
    }

 
    const blog = await Blog.findOneAndUpdate(
      { slug: slug.trim(), status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("category", SAFE_CATEGORY_FIELDS)
      .populate("author", SAFE_AUTHOR_FIELDS)
      .lean();

    if (!blog) {
      return res.status(404).json({ message: "Blog post not found or not published" });
    }

    res.status(200).json(blog);
  } catch (err) {
    console.error("getPublicBlogBySlug error:", err);
    res.status(500).json({ message: "Error fetching blog details" });
  }
};

// 2a. Get Latest Blog
exports.getLatestBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ status: "published" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .populate("category", SAFE_CATEGORY_FIELDS)
      .populate("author", SAFE_AUTHOR_FIELDS)
      .lean();

    if (!blog) {
      return res.status(404).json({ message: "No published blogs found" });
    }
    res.status(200).json(blog);
  } catch (err) {
    console.error("getLatestBlog error:", err);
    res.status(500).json({ message: "Error fetching latest blog" });
  }
};

// 2b. Get Archive Blogs (All except latest)
exports.getArchiveBlogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    // Skip 1 for the absolute latest, plus pagination skip
    const skip = 1 + (page - 1) * limit;

    const query = { status: "published" };
    
    // Search query parameter
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
      query.$or = [{ title: searchRegex }, { content: searchRegex }, { excerpt: searchRegex }];
    }

    // Category filter by Slug
    if (req.query.categorySlug) {
      const category = await Category.findOne({ slug: req.query.categorySlug.trim() });
      if (category) {
        query.category = category._id;
      } else {
        return res.status(200).json({
          blogs: [],
          pagination: { page, limit, totalPages: 0, totalBlogs: 0 },
        });
      }
    }

    const sort = { publishedAt: -1, createdAt: -1 };

    const [blogs, totalDocs] = await Promise.all([
      Blog.find(query)
        .select("title slug excerpt featuredImage readingTimeMinutes publishedAt updatedAt")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("category", "name slug")
        .populate("author", "name authorSlug")
        .lean(),
      Blog.countDocuments(query),
    ]);
    
    // totalBlogs for this specific endpoint means all minus 1
    const totalBlogs = Math.max(0, totalDocs - 1);

    res.status(200).json({
      blogs,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalBlogs / limit),
        totalBlogs,
      },
    });
  } catch (err) {
    console.error("getArchiveBlogs error:", err);
    res.status(500).json({ message: "Error fetching archive blogs" });
  }
};

//  3. Get Trending Blogs 
exports.getTrendingBlogs = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 5));

    const blogs = await Blog.find({ status: "published" })
      .select("title slug excerpt featuredImage readingTimeMinutes publishedAt updatedAt")
      .sort({ views: -1, publishedAt: -1 })
      .limit(limit)
      .populate("category", "name slug")
      .populate("author", "name authorSlug")
      .lean();

    res.status(200).json(blogs);
  } catch (err) {
    console.error("getTrendingBlogs error:", err);
    res.status(500).json({ message: "Error fetching trending posts" });
  }
};

// 4. Get Random / Suggested Blogs 
exports.getRandomBlogs = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(20, parseInt(req.query.limit) || 3));
    const excludeSlug = req.query.excludeSlug;

    const pipeline = [{ $match: { status: "published" } }];

    // Exclude current blog if reading one
    if (excludeSlug && typeof excludeSlug === "string") {
      pipeline.push({ $match: { slug: { $ne: excludeSlug.trim() } } });
    }

    // Get random samples
    pipeline.push({ $sample: { size: limit } });

    pipeline.push({ 
      $project: { 
        title: 1, slug: 1, excerpt: 1, featuredImage: 1, 
        readingTimeMinutes: 1, publishedAt: 1, updatedAt: 1, 
        category: 1, author: 1 
      } 
    });

    const rawBlogs = await Blog.aggregate(pipeline);

    // Populate using Mongoose since aggregate doesn't do populate automatically
    const blogs = await Blog.populate(rawBlogs, [
      { path: "category", select: "name slug" },
      { path: "author", select: "name authorSlug" },
    ]);

    res.status(200).json(blogs);
  } catch (err) {
    console.error("getRandomBlogs error:", err);
    res.status(500).json({ message: "Error fetching random suggestions" });
  }
};

//  5. Get Blogs by Category Slug 
exports.getBlogsByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    if (!categorySlug) return res.status(400).json({ message: "Category slug is required" });

    const category = await Category.findOne({ slug: categorySlug.trim() });
    if (!category) return res.status(404).json({ message: "Category not found" });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = { category: category._id, status: "published" };

    const [blogs, totalBlogs] = await Promise.all([
      Blog.find(query)
        .select("title slug excerpt featuredImage readingTimeMinutes publishedAt updatedAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("category", "name slug")
        .populate("author", "name authorSlug")
        .lean(),
      Blog.countDocuments(query),
    ]);

    res.status(200).json({
      category,
      blogs,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalBlogs / limit),
        totalBlogs,
      },
    });
  } catch (err) {
    console.error("getBlogsByCategory error:", err);
    res.status(500).json({ message: "Error fetching category blogs" });
  }
};

// 5a. Get All Categories
exports.listPublicCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).select(SAFE_CATEGORY_FIELDS).sort({ name: 1 }).lean();
    res.status(200).json(categories);
  } catch (err) {
    console.error("listPublicCategories error:", err);
    res.status(500).json({ message: "Error fetching categories" });
  }
};

//  6. Get Blogs by Author Slug  
exports.getBlogsByAuthor = async (req, res) => {
  try {
    const { authorSlug } = req.params;
    if (!authorSlug) {
      return res.status(400).json({ message: "Author slug is required" });
    }

    const author = await User.findOne({ authorSlug: authorSlug.trim() }).select(SAFE_AUTHOR_FIELDS).lean();
    if (!author) return res.status(404).json({ message: "Author not found" });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = { author: author._id, status: "published" };

    const [blogs, totalBlogs] = await Promise.all([
      Blog.find(query)
        .select("title slug excerpt featuredImage readingTimeMinutes publishedAt updatedAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("category", "name slug")
        .populate("author", "name authorSlug")
        .lean(),
      Blog.countDocuments(query),
    ]);

    res.status(200).json({
      author,
      blogs,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalBlogs / limit),
        totalBlogs,
      },
    });
  } catch (err) {
    console.error("getBlogsByAuthor error:", err);
    res.status(500).json({ message: "Error fetching author blogs" });
  }
};

// 6a. Get All Authors
exports.listPublicAuthors = async (req, res) => {
  try {
    // Find all authors that have at least one published blog
    const publishedBlogs = await Blog.find({ status: "published" }).distinct("author");
    
    let authors = await User.find({ _id: { $in: publishedBlogs } })
      .select(`${SAFE_AUTHOR_FIELDS} authorSlug`)
      .lean();

    // Sort authors by designation alphabetically (since no specific rank logic is requested)
    // Authors without designation go to the end
    authors.sort((a, b) => {
      if (a.designation && !b.designation) return -1;
      if (!a.designation && b.designation) return 1;
      if (!a.designation && !b.designation) return a.name.localeCompare(b.name);
      return a.designation.localeCompare(b.designation) || a.name.localeCompare(b.name);
    });

    res.status(200).json(authors);
  } catch (err) {
    console.error("listPublicAuthors error:", err);
    res.status(500).json({ message: "Error fetching authors" });
  }
};
