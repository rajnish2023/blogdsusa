const express = require("express");
const { getPublicSettings } = require("../controllers/settingController");

const router = express.Router();

router.get("/settings", getPublicSettings);

module.exports = router;
