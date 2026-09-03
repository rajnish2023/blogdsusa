const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const {
  listUsers,
  createUser,
  updateUser,
  setUserStatus,
  deleteUser,
  listAuthors,
} = require("../controllers/userController");
const {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  changeMyPassword,
} = require("../controllers/profileController");
const { protect, authorize } = require("../middleware/auth");
const uploadAvatar = require("../middleware/uploadAvatar");
const validate = require("../middleware/validate");

router.use(protect);

const strongPassword = (field) =>
  body(field)
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password needs an uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password needs a number");
 
router.get("/me", getMyProfile);

router.patch(
  "/me",
  [
    body("name").optional().trim().isLength({ min: 1, max: 100 }),
    body("about").optional().trim().isLength({ max: 500 }),
  ],
  validate,
  updateMyProfile
);

router.post("/me/avatar", uploadAvatar.single("avatar"), uploadMyAvatar);

router.patch(
  "/me/password",
  [body("currentPassword").notEmpty().withMessage("Current password is required"), strongPassword("newPassword")],
  validate,
  changeMyPassword
);
 
router.get("/authors", authorize("blog:edit"), listAuthors);

// --- Admin-managed team routes ---
router.get("/", authorize("users:view"), listUsers);

router.post(
  "/",
  authorize("users:create"),
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 100 }),
    body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
    body("role").isMongoId().withMessage("A valid role must be selected"),
    body("password").optional({ values: "falsy" }).isLength({ min: 8 }),
  ],
  validate,
  createUser
);

router.patch(
  "/:id",
  authorize("users:edit"),
  [
    body("name").optional().trim().isLength({ min: 1, max: 100 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("role").optional().isMongoId(),
    body("designation").optional().trim().isLength({ max: 100 }),
  ],
  validate,
  updateUser
);

router.patch("/:id/status", authorize("users:edit"), setUserStatus);
router.delete("/:id", authorize("users:delete"), deleteUser);

module.exports = router;
