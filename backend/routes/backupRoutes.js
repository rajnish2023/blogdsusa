const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { exportBackup, importBackup, backupUploadMiddleware } = require("../controllers/backupController");

// Only Super Admin can run backups and restores
const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.role?.isSuperAdmin) {
    return res.status(403).json({ message: "Super Admin access required for backups." });
  }
  next();
};

// GET /api/backup/export  — Export entire db as JSON
router.get("/export", protect, requireSuperAdmin, exportBackup);

// POST /api/backup/import — Restore db from uploaded JSON
router.post(
  "/import",
  protect,
  requireSuperAdmin,
  (req, res, next) => {
    backupUploadMiddleware(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  importBackup
);

module.exports = router;
