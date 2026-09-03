const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const {
  listBlogs,
  getBlog,
  createBlog,
  updateBlog,
  setBlogStatus,
  deleteBlog,
  previewSeoScore,
  bulkDeleteBlogs,
  bulkExportBlogs,
} = require("../controllers/blogController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", authorize("blog:view"), listBlogs);
router.post("/seo-preview", authorize("blog:view"), previewSeoScore);
router.get("/:id", authorize("blog:view"), getBlog);

router.post(
  "/",
  authorize("blog:create"),
  [
    body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }),
    body("category").optional({ values: "falsy" }).isMongoId(),
  ],
  validate,
  createBlog
);

router.patch(
  "/:id",
  authorize("blog:edit"),
  [
    body("title").optional().trim().isLength({ min: 1, max: 200 }),
    body("category").optional({ values: "falsy" }).isMongoId(),
    body("author").optional({ values: "falsy" }).isMongoId(),
    body("schemaMarkup").optional().isArray(),
  ],
  validate,
  updateBlog
);

router.patch("/:id/status", authorize("blog:publish"), setBlogStatus);
router.post("/bulk-delete", authorize("blog:delete"), bulkDeleteBlogs);
router.post("/bulk-export", authorize("blog:view"), bulkExportBlogs);
router.delete("/:id", authorize("blog:delete"), deleteBlog);

module.exports = router;
