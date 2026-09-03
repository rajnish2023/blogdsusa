const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getCatalog,
  calculateQuote,
  leadValidation,
  submitLead,
} = require("../controllers/licensingController");
const { verifyAccessToken } = require("../utils/tokens");
const User = require("../models/User");

const router = express.Router();


const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).populate("role");
    if (user && user.status !== "suspended") req.user = user;
  } catch {
    // an invalid or expired token simply means "treat as a visitor"
  }
  next();
};

// The calculator reprices on every tick, so this is deliberately generous.
const calcLimiter = rateLimit({
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

router.get("/catalog", optionalAuth, getCatalog);
router.post("/calculate", calcLimiter, optionalAuth, calculateQuote);
router.post("/lead", leadLimiter, leadValidation, submitLead);

module.exports = router;
