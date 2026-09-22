const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getCatalog,
  assessQuote,
  leadValidation,
  submitLead,
} = require("../controllers/migrationToolController");

const router = express.Router();

// The assessment re-scores on every answer, so reads are deliberately generous.
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { message: "Too many requests. Please slow down and try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Same strictness as the contact form: 5 submissions per 15 minutes per IP.
const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many submissions. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/catalog", readLimiter, getCatalog);
router.post("/assess", readLimiter, assessQuote);
router.post("/lead", leadLimiter, leadValidation, submitLead);

module.exports = router;
