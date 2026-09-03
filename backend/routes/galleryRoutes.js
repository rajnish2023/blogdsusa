const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  uploadMedia,
  getMedia,
  deleteMedia,
  downloadMedia,
  bulkDeleteMedia,
} = require("../controllers/galleryController");
const { protect, authorize } = require("../middleware/auth");

// Every gallery route now requires a signed-in user; specific actions
// additionally require the matching permission on that user's role.
router.use(protect);

router.get("/", authorize("gallery:view"), getMedia);
router.post("/upload", authorize("gallery:upload"), upload.array("files", 20), uploadMedia);
router.post("/bulk-delete", authorize("gallery:delete"), bulkDeleteMedia);
router.delete("/:id", authorize("gallery:delete"), deleteMedia);
router.get("/:id/download", authorize("gallery:view"), downloadMedia);

module.exports = router;
