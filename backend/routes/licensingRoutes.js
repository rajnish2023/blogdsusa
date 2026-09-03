const express = require("express");
const {
  listLeads,
  getLeadStats,
  getLead,
  updateLead,
  deleteLead,
  listPricing,
  updatePricing,
  resetPricing,
  listCapabilities,
  createCapability,
  updateCapability,
  deleteCapability,
  reorderCapabilities,
  createGroup,
  updateGroup,
  deleteGroup,
  getContent,
  updateContent,
  resetContent,
} = require("../controllers/licensingController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// /stats before /:id so it isn't swallowed by the id param
router.get("/leads/stats", authorize("licensing:view"), getLeadStats);
router.get("/leads", authorize("licensing:view"), listLeads);
router.get("/leads/:id", authorize("licensing:view"), getLead);
router.patch("/leads/:id", authorize("licensing:manage"), updateLead);
router.delete("/leads/:id", authorize("licensing:delete"), deleteLead);

router.get("/pricing", authorize("licensing:view"), listPricing);
router.put("/pricing/:currency", authorize("licensing:pricing"), updatePricing);
router.post("/pricing/:currency/reset", authorize("licensing:pricing"), resetPricing);

// Capability catalogue — the tickable rows on the rate card
router.get("/capabilities", authorize("licensing:view"), listCapabilities);
router.post("/capabilities", authorize("licensing:catalogue"), createCapability);
// /reorder before /:id so it isn't captured as an id
router.put("/capabilities/reorder", authorize("licensing:catalogue"), reorderCapabilities);
router.put("/capabilities/:id", authorize("licensing:catalogue"), updateCapability);
router.delete("/capabilities/:id", authorize("licensing:catalogue"), deleteCapability);

router.get("/content", authorize("licensing:view"), getContent);
router.put("/content", authorize("licensing:catalogue"), updateContent);
router.post("/content/reset", authorize("licensing:catalogue"), resetContent);

router.post("/groups", authorize("licensing:catalogue"), createGroup);
router.put("/groups/:id", authorize("licensing:catalogue"), updateGroup);
router.delete("/groups/:id", authorize("licensing:catalogue"), deleteGroup);

module.exports = router;
