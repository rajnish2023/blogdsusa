const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { sqlUploadMiddleware, runMigration } = require("../controllers/migrationController");

// Only Super Admin can run migrations
const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.role?.isSuperAdmin) {
    return res.status(403).json({ message: "Super Admin access required to run migrations." });
  }
  next();
};

// POST /api/migrate  — Super Admin only
router.post(
  "/",
  protect,
  requireSuperAdmin,
  (req, res, next) => {
    sqlUploadMiddleware(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  runMigration
);

module.exports = router;

