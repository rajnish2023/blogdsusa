const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
 
const Role = require("../models/Role");
const User = require("../models/User");
const Category = require("../models/Category");
const Media = require("../models/Media");
const Page = require("../models/Page");
const PageCategory = require("../models/PageCategory");
const Blog = require("../models/Blog");
const Currency = require("../models/Currency");
const Estimator = require("../models/Estimator");
const EstimatorQuestion = require("../models/EstimatorQuestion");
const EstimatorResponse = require("../models/EstimatorResponse");
const EstimatorResult = require("../models/EstimatorResult");
const EstimatorService = require("../models/EstimatorService");
const Lead = require("../models/Lead");
const LicensingCapability = require("../models/LicensingCapability");
const LicensingContent = require("../models/LicensingContent");
const LicensingGroup = require("../models/LicensingGroup");
const LicensingLead = require("../models/LicensingLead");
const LicensingPricing = require("../models/LicensingPricing");
const Setting = require("../models/Setting");

const os = require("os");

const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => cb(null, `backup_restore_${Date.now()}.json`),
});
const backupUpload = multer({
  storage: backupStorage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith(".json") || file.mimetype === "application/json") {
      cb(null, true);
    } else {
      cb(new Error("Only JSON backup files are allowed"), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // increased to 100MB
});

exports.backupUploadMiddleware = backupUpload.single("backupFile");
 
exports.exportBackup = async (req, res) => {
  try {
   
    const [
      roles, users, categories, media, pages, pageCategories, blogs,
      currencies, estimators, estimatorQuestions, estimatorResponses, estimatorResults,
      estimatorServices, leads, licensingCapabilities, licensingContents, licensingGroups,
      licensingLeads, licensingPricings, settings
    ] = await Promise.all([
      Role.find({}),
      User.find({}).select("+password +failedLoginAttempts +lockUntil +refreshTokenHash +passwordResetToken +passwordResetExpires"),
      Category.find({}),
      Media.find({}),
      Page.find({}),
      PageCategory.find({}),
      Blog.find({}),
      Currency.find({}),
      Estimator.find({}),
      EstimatorQuestion.find({}),
      EstimatorResponse.find({}),
      EstimatorResult.find({}),
      EstimatorService.find({}),
      Lead.find({}),
      LicensingCapability.find({}),
      LicensingContent.find({}),
      LicensingGroup.find({}),
      LicensingLead.find({}),
      LicensingPricing.find({}),
      Setting.find({})
    ]);

    const backupData = {
      metadata: {
        version: "1.1",
        exportedAt: new Date().toISOString(),
        database: mongoose.connection.name,
      },
      collections: {
        roles, users, categories, media, pages, pageCategories, blogs,
        currencies, estimators, estimatorQuestions, estimatorResponses, estimatorResults,
        estimatorServices, leads, licensingCapabilities, licensingContents, licensingGroups,
        licensingLeads, licensingPricings, settings
      },
    };

    const fileName = `mongodb_backup_${new Date().toISOString().replace(/T/, "_").replace(/\..+/, "").replace(/:/g, "-")}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error("Backup export error:", err);
    res.status(500).json({ message: "Could not export backup. Please try again." });
  }
};
 
exports.importBackup = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No backup file uploaded." });
  
  const filePath = req.file.path;
  
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    let backup;
    try {
      backup = JSON.parse(raw);
    } catch {
      return res.status(400).json({ message: "Invalid JSON format in backup file." });
    }
 
    if (!backup.metadata || !backup.collections) {
      return res.status(400).json({ message: "Invalid backup file structure. Metadata or collections missing." });
    }

    const {
      roles, users, categories, media, pages, pageCategories, blogs,
      currencies, estimators, estimatorQuestions, estimatorResponses, estimatorResults,
      estimatorServices, leads, licensingCapabilities, licensingContents, licensingGroups,
      licensingLeads, licensingPricings, settings
    } = backup.collections;
 
    const totalRecords =
      (roles || []).length +
      (users || []).length +
      (categories || []).length +
      (media || []).length +
      (pages || []).length +
      (pageCategories || []).length +
      (blogs || []).length +
      (currencies || []).length +
      (estimators || []).length +
      (licensingCapabilities || []).length;

    if (totalRecords === 0) {
      return res.status(400).json({
        message: "The backup file contains no database records (roles, users, blogs, pages, etc.). Restore aborted to prevent database wipe."
      });
    }
 
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      Category.deleteMany({}),
      Media.deleteMany({}),
      Page.deleteMany({}),
      PageCategory.deleteMany({}),
      Blog.deleteMany({}),
      Currency.deleteMany({}),
      Estimator.deleteMany({}),
      EstimatorQuestion.deleteMany({}),
      EstimatorResponse.deleteMany({}),
      EstimatorResult.deleteMany({}),
      EstimatorService.deleteMany({}),
      Lead.deleteMany({}),
      LicensingCapability.deleteMany({}),
      LicensingContent.deleteMany({}),
      LicensingGroup.deleteMany({}),
      LicensingLead.deleteMany({}),
      LicensingPricing.deleteMany({}),
      Setting.deleteMany({})
    ]);
 
    if (Array.isArray(roles) && roles.length) await Role.collection.insertMany(roles.map(r => ({ ...r, _id: new mongoose.Types.ObjectId(r._id) })));
    if (Array.isArray(categories) && categories.length) await Category.collection.insertMany(categories.map(c => ({ ...c, _id: new mongoose.Types.ObjectId(c._id) })));
    if (Array.isArray(media) && media.length) await Media.collection.insertMany(media.map(m => ({ ...m, _id: new mongoose.Types.ObjectId(m._id) })));
    if (Array.isArray(pageCategories) && pageCategories.length) await PageCategory.collection.insertMany(pageCategories.map(pc => ({ ...pc, _id: new mongoose.Types.ObjectId(pc._id) })));
    if (Array.isArray(currencies) && currencies.length) await Currency.collection.insertMany(currencies.map(c => ({ ...c, _id: new mongoose.Types.ObjectId(c._id) })));
    if (Array.isArray(estimators) && estimators.length) await Estimator.collection.insertMany(estimators.map(e => ({ ...e, _id: new mongoose.Types.ObjectId(e._id) })));
    if (Array.isArray(estimatorQuestions) && estimatorQuestions.length) await EstimatorQuestion.collection.insertMany(estimatorQuestions.map(e => ({ ...e, _id: new mongoose.Types.ObjectId(e._id) })));
    if (Array.isArray(estimatorResponses) && estimatorResponses.length) await EstimatorResponse.collection.insertMany(estimatorResponses.map(e => ({ ...e, _id: new mongoose.Types.ObjectId(e._id) })));
    if (Array.isArray(estimatorResults) && estimatorResults.length) await EstimatorResult.collection.insertMany(estimatorResults.map(e => ({ ...e, _id: new mongoose.Types.ObjectId(e._id) })));
    if (Array.isArray(estimatorServices) && estimatorServices.length) await EstimatorService.collection.insertMany(estimatorServices.map(e => ({ ...e, _id: new mongoose.Types.ObjectId(e._id) })));
    if (Array.isArray(leads) && leads.length) await Lead.collection.insertMany(leads.map(l => ({ ...l, _id: new mongoose.Types.ObjectId(l._id) })));
    if (Array.isArray(licensingCapabilities) && licensingCapabilities.length) await LicensingCapability.collection.insertMany(licensingCapabilities.map(l => ({ ...l, _id: new mongoose.Types.ObjectId(l._id) })));
    if (Array.isArray(licensingContents) && licensingContents.length) await LicensingContent.collection.insertMany(licensingContents.map(l => ({ ...l, _id: new mongoose.Types.ObjectId(l._id) })));
    if (Array.isArray(licensingGroups) && licensingGroups.length) await LicensingGroup.collection.insertMany(licensingGroups.map(l => ({ ...l, _id: new mongoose.Types.ObjectId(l._id) })));
    if (Array.isArray(licensingLeads) && licensingLeads.length) await LicensingLead.collection.insertMany(licensingLeads.map(l => ({ ...l, _id: new mongoose.Types.ObjectId(l._id) })));
    if (Array.isArray(licensingPricings) && licensingPricings.length) await LicensingPricing.collection.insertMany(licensingPricings.map(l => ({ ...l, _id: new mongoose.Types.ObjectId(l._id) })));
    if (Array.isArray(settings) && settings.length) await Setting.collection.insertMany(settings.map(s => ({ ...s, _id: new mongoose.Types.ObjectId(s._id) })));
 
    if (Array.isArray(users) && users.length) {
      await User.collection.insertMany(users.map(u => ({
        ...u,
        _id: new mongoose.Types.ObjectId(u._id),
        role: u.role ? new mongoose.Types.ObjectId(u.role) : null,
      })));
    }
 
    if (Array.isArray(pages) && pages.length) {
      await Page.collection.insertMany(pages.map(p => ({
        ...p,
        _id: new mongoose.Types.ObjectId(p._id),
        category: p.category ? new mongoose.Types.ObjectId(p.category) : null,
        author: p.author ? new mongoose.Types.ObjectId(p.author) : null,
      })));
    }
 
    if (Array.isArray(blogs) && blogs.length) {
      await Blog.collection.insertMany(blogs.map(b => ({
        ...b,
        _id: new mongoose.Types.ObjectId(b._id),
        category: b.category ? new mongoose.Types.ObjectId(b.category) : null,
        author: b.author ? new mongoose.Types.ObjectId(b.author) : null,
      })));
    }
 
    fs.unlink(filePath, () => {});

    res.status(200).json({
      message: "Database restored successfully!",
      stats: {
        roles: (roles || []).length,
        users: (users || []).length,
        categories: (categories || []).length,
        media: (media || []).length,
        pages: (pages || []).length,
        blogs: (blogs || []).length,
        estimators: (estimators || []).length,
        licensing: (licensingCapabilities || []).length,
      },
    });
  } catch (err) {
    console.error("Backup import error:", err);
    res.status(500).json({ message: err.message || "Failed to restore backup." });
    if (req.file?.path) fs.unlink(req.file.path, () => {});
  }
};
