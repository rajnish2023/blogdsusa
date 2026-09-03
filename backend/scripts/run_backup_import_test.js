const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const Role = require("../models/Role");
const User = require("../models/User");
const Category = require("../models/Category");
const Media = require("../models/Media");
const Page = require("../models/Page");
const PageCategory = require("../models/PageCategory");
const Blog = require("../models/Blog");

const filePath = path.join(__dirname, "..", "uploads", "_backup_uploads", "backup_restore_1784039428199.json");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const raw = fs.readFileSync(filePath, "utf8");
  const backup = JSON.parse(raw);
  const { roles, users, categories, media, pages, pageCategories, blogs } = backup.collections;

  try {
    console.log("Testing Roles insert...");
    if (Array.isArray(roles) && roles.length) {
      await Role.collection.insertMany(roles.map(r => ({ ...r, _id: new mongoose.Types.ObjectId(r._id) })));
    }

    console.log("Testing Users insert...");
    if (Array.isArray(users) && users.length) {
      await User.collection.insertMany(users.map(u => ({
        ...u,
        _id: new mongoose.Types.ObjectId(u._id),
        role: u.role ? new mongoose.Types.ObjectId(u.role) : null,
      })));
    }

    console.log("Testing Categories insert...");
    if (Array.isArray(categories) && categories.length) {
      await Category.collection.insertMany(categories.map(c => ({ ...c, _id: new mongoose.Types.ObjectId(c._id) })));
    }

    console.log("Testing Media insert...");
    if (Array.isArray(media) && media.length) {
      await Media.collection.insertMany(media.map(m => ({ ...m, _id: new mongoose.Types.ObjectId(m._id) })));
    }

    console.log("Testing PageCategories insert...");
    if (Array.isArray(pageCategories) && pageCategories.length) {
      await PageCategory.collection.insertMany(pageCategories.map(pc => ({ ...pc, _id: new mongoose.Types.ObjectId(pc._id) })));
    }

    console.log("Testing Pages insert...");
    if (Array.isArray(pages) && pages.length) {
      await Page.collection.insertMany(pages.map(p => ({
        ...p,
        _id: new mongoose.Types.ObjectId(p._id),
        category: p.category ? new mongoose.Types.ObjectId(p.category) : null,
        author: p.author ? new mongoose.Types.ObjectId(p.author) : null,
      })));
    }

    console.log("Testing Blogs insert...");
    if (Array.isArray(blogs) && blogs.length) {
      await Blog.collection.insertMany(blogs.map(b => ({
        ...b,
        _id: new mongoose.Types.ObjectId(b._id),
        category: b.category ? new mongoose.Types.ObjectId(b.category) : null,
        author: b.author ? new mongoose.Types.ObjectId(b.author) : null,
      })));
    }

    console.log("Success!");
  } catch (err) {
    console.error("CRITICAL IMPORT FAILURE:", err);
  } finally {
    // Clear whatever we inserted in the test to keep it clean
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      Category.deleteMany({}),
      Media.deleteMany({}),
      Page.deleteMany({}),
      PageCategory.deleteMany({}),
      Blog.deleteMany({}),
    ]);
    await mongoose.disconnect();
  }
}

main().catch(console.error);
