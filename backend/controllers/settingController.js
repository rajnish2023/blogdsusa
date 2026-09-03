const Setting = require("../models/Setting");
const fs = require("fs");
const path = require("path");
 
const getPublicSettings = async (req, res) => {
  try {
    const list = await Setting.find({});
    const settings = {};
    list.forEach((s) => {
      settings[s.key] = s.value;
    });
   
    if (!settings.companyName) settings.companyName = "Dynamics Square";
    if (!settings.customLogo) settings.customLogo = "";

    res.json(settings);
  } catch (err) {
    console.error("[settings] Get error:", err);
    res.status(500).json({ message: "Failed to retrieve settings" });
  }
};
 
const updateSetting = async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ message: "Setting key is required" });
  }

  try {
    const setting = await Setting.findOneAndUpdate(
      { key },
      { value: String(value || "").trim() },
      { new: true, upsert: true }
    );
    res.json({ message: "Setting updated", setting });
  } catch (err) {
    console.error("[settings] Update error:", err);
    res.status(500).json({ message: "Failed to update setting" });
  }
};

 
const uploadLogo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
   
    const fileUrl = `/uploads/${req.file.filename}`;

    // Update in database setting key "customLogo"
    await Setting.findOneAndUpdate(
      { key: "customLogo" },
      { value: fileUrl },
      { new: true, upsert: true }
    );

    res.json({
      message: "Logo uploaded successfully",
      url: fileUrl,
    });
  } catch (err) {
    console.error("[settings] Logo upload error:", err);
    res.status(500).json({ message: "Failed to process logo upload" });
  }
};

module.exports = { getPublicSettings, updateSetting, uploadLogo };
