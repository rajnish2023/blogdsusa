const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const { login, refresh, logout, me, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login
);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Enter a valid email").normalizeEmail()],
  validate,
  forgotPassword
);

router.post(
  "/reset-password/:token",
  [
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  validate,
  resetPassword
);

router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, me);

module.exports = router;

