const express = require("express");
const {
  listEstimators,
  listCurrencies,
  getEstimator,
  createEstimator,
  updateEstimator,
  deleteEstimator,
  saveQuestions,
  saveResult,
  listResponses,
  getResponse,
  deleteResponse,
  resendResponseEmail,
} = require("../controllers/estimatorController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

/* Static and nested segments are declared before the bare /:id routes so they
   are not captured as an estimator id. */

router.get("/currencies", authorize("estimator:view"), listCurrencies);

// Response endpoints are keyed on the response id, not the estimator id.
router.get("/responses/:responseId", authorize("estimator:responses"), getResponse);
router.delete("/responses/:responseId", authorize("estimator:delete"), deleteResponse);
router.post("/responses/:responseId/resend", authorize("estimator:responses"), resendResponseEmail);

router.get("/", authorize("estimator:view"), listEstimators);
router.post("/", authorize("estimator:create"), createEstimator);

router.get("/:id/responses", authorize("estimator:responses"), listResponses);
router.put("/:id/questions", authorize("estimator:edit"), saveQuestions);
router.put("/:id/result", authorize("estimator:edit"), saveResult);

router.get("/:id", authorize("estimator:view"), getEstimator);
router.put("/:id", authorize("estimator:edit"), updateEstimator);
router.delete("/:id", authorize("estimator:delete"), deleteEstimator);

module.exports = router;
