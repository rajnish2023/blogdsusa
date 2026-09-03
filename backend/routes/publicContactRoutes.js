const express = require("express");
const rateLimit = require("express-rate-limit");
const { contactValidation, submitContact } = require("../controllers/contactController");

const router = express.Router();

// Strict rate limit for contact form: 5 submissions per 15 minutes per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many submissions. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/contact", contactLimiter, contactValidation, submitContact);

module.exports = router;
