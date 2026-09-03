const express = require("express");
const { updateSetting, uploadLogo } = require("../controllers/settingController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// Require logged in user for all settings operations
router.use(protect);

router.put("/", updateSetting);
router.post("/upload-logo", upload.single("logo"), uploadLogo);

module.exports = router;
