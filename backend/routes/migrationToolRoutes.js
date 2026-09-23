const express = require("express");
const {
  listLeads,
  getLeadStats,
  getLead,
  updateLead,
  deleteLead,
  getModel,
} = require("../controllers/migrationToolController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// /stats and /model before /:id so they are not swallowed by the id param
router.get("/leads/stats", authorize("migration:view"), getLeadStats);
router.get("/model", authorize("migration:view"), getModel);
router.get("/leads", authorize("migration:view"), listLeads);
router.get("/leads/:id", authorize("migration:view"), getLead);
router.patch("/leads/:id", authorize("migration:manage"), updateLead);
router.delete("/leads/:id", authorize("migration:delete"), deleteLead);

module.exports = router;
