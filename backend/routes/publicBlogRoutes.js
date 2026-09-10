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
  getTagsList,
  getBlogsByTag,
  getPublicBlogPreviewBySlug,
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
router.get("/tags", getTagsList);
router.get("/slug/:slug", getPublicBlogBySlug);
router.get("/preview/:slug", getPublicBlogPreviewBySlug);
router.get("/category/:categorySlug", getBlogsByCategory);
router.get("/author/:authorSlug", getBlogsByAuthor);
router.get("/tag/:tagSlug", getBlogsByTag);

module.exports = router;
