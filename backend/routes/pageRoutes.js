const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const {
  listPages,
  getPage,
  createPage,
  updatePage,
  setPageStatus,
  deletePage,
} = require("../controllers/pageController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", authorize("pages:view"), listPages);
router.get("/:id", authorize("pages:view"), getPage);

router.post(
  "/",
  authorize("pages:create"),
  [
    body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }),
    body("category").optional({ values: "falsy" }).isMongoId(),
  ],
  validate,
  createPage
);

router.patch(
  "/:id",
  authorize("pages:edit"),
  [
    body("title").optional().trim().isLength({ min: 1, max: 200 }),
    body("category").optional({ values: "falsy" }).isMongoId(),
  ],
  validate,
  updatePage
);

router.patch("/:id/status", authorize("pages:publish"), setPageStatus);
router.delete("/:id", authorize("pages:delete"), deletePage);

module.exports = router;
