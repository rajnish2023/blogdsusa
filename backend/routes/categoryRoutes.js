const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", authorize("blog:view"), listCategories);

router.post(
  "/",
  authorize("blog:create"),
  [body("name").trim().notEmpty().withMessage("Category name is required").isLength({ max: 60 })],
  validate,
  createCategory
);

router.patch(
  "/:id",
  authorize("blog:edit"),
  [body("name").optional().trim().isLength({ min: 1, max: 60 })],
  validate,
  updateCategory
);

router.delete("/:id", authorize("blog:delete"), deleteCategory);

module.exports = router;
