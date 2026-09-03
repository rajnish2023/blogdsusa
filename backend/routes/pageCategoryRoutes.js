const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const {
  listPageCategories,
  createPageCategory,
  updatePageCategory,
  deletePageCategory,
} = require("../controllers/pageCategoryController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", authorize("pages:view"), listPageCategories);

router.post(
  "/",
  authorize("pages:create"),
  [body("name").trim().notEmpty().withMessage("Category name is required").isLength({ max: 60 })],
  validate,
  createPageCategory
);

router.patch(
  "/:id",
  authorize("pages:edit"),
  [body("name").optional().trim().isLength({ min: 1, max: 60 })],
  validate,
  updatePageCategory
);

router.delete("/:id", authorize("pages:delete"), deletePageCategory);

module.exports = router;
