const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getAllEstimators,
  getAllQuestions,
  getAllQuestionsNew,
  submitFormData,
  triggerEmail,
} = require("../controllers/publicEstimatorController");

const router = express.Router();

// Visitors step through the questions before submitting, so reads are generous.
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { error: "Too many requests. Please slow down and try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Submissions send an email each, so they get the same ceiling as the contact form.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many submissions. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/get-all-estimators", readLimiter, getAllEstimators);
// -new before the bare :id form so it is not swallowed by the param route.
router.get("/get-all-questions-new/:id", readLimiter, getAllQuestionsNew);
router.get("/get-all-questions/:id", readLimiter, getAllQuestions);
router.post("/estimation-submit", submitLimiter, submitFormData);
router.get("/trigger/:id", submitLimiter, triggerEmail);

module.exports = router;
