const express = require("express");
const router = express.Router();
const { apiLimiter } = require("../middleware/rateLimiter");
const { requireApiKey } = require("../middleware/publicAuth");
const {
  listPublicBlogs,
  getLatestBlog,
  getArchiveBlogs,
  getPublicBlogBySlug,
  getTrendingBlogs,
  getRandomBlogs,
  listPublicCategories,
  getBlogsByCategory,
  listPublicAuthors,
  getBlogsByAuthor,
} = require("../controllers/publicBlogController");
 
router.use(apiLimiter);
router.use(requireApiKey);
 
router.get("/", listPublicBlogs);
router.get("/latest", getLatestBlog);
router.get("/archive", getArchiveBlogs);
router.get("/trending", getTrendingBlogs);
router.get("/random", getRandomBlogs);
router.get("/categories", listPublicCategories);
router.get("/authors", listPublicAuthors);
router.get("/slug/:slug", getPublicBlogBySlug);
router.get("/category/:categorySlug", getBlogsByCategory);
router.get("/author/:authorSlug", getBlogsByAuthor);

module.exports = router;
