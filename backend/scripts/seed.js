require("dotenv").config();
const mongoose = require("mongoose");
const Role = require("../models/Role");
const User = require("../models/User");
const Category = require("../models/Category");
const PageCategory = require("../models/PageCategory");
const { PERMISSION_KEYS } = require("../config/permissions");

const galleryOnly = PERMISSION_KEYS.filter((k) => k.startsWith("gallery:"));
const blogOnly = PERMISSION_KEYS.filter((k) => k.startsWith("blog:"));
const pagesOnly = PERMISSION_KEYS.filter((k) => k.startsWith("pages:"));
const viewOnly = PERMISSION_KEYS.filter((k) => k.endsWith(":view"));

const SYSTEM_ROLES = [
  {
    name: "Super Admin",
    description: "Full access to every module. Cannot be edited or deleted.",
    isSystem: true,
    isSuperAdmin: true,
    permissions: PERMISSION_KEYS,
  },
  {
    name: "Admin",
    description: "Manages content and team members, but not roles.",
    isSystem: true,
    isSuperAdmin: false,
    permissions: PERMISSION_KEYS.filter((k) => !k.startsWith("roles:")),
  },
  {
    name: "Editor",
    description: "Creates and manages gallery and blog content.",
    isSystem: true,
    isSuperAdmin: false,
    permissions: [...galleryOnly, ...blogOnly, ...pagesOnly],
  },
  {
    name: "Viewer",
    description: "Read-only access across modules.",
    isSystem: true,
    isSuperAdmin: false,
    permissions: viewOnly,
  },
];

const runSeed = async () => {
  // If not already connected (e.g. running standalone), connect.
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  
  console.log("Seeding database...");

  const roleDocs = {};
  for (const roleDef of SYSTEM_ROLES) {
    const role = await Role.findOneAndUpdate(
      { name: roleDef.name },
      roleDef,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    roleDocs[roleDef.name] = role;
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@dynamicssquare.com").toLowerCase();
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (!existingAdmin) {
    await User.create({
      name: process.env.SEED_ADMIN_NAME || "Super Admin",
      email: adminEmail,
      password: process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!",
      role: roleDocs["Super Admin"]._id,
      status: "active",
    });
  }

  const existingCategory = await Category.findOne({ name: "General" });
  if (!existingCategory) {
    await Category.create({ name: "General", slug: "general", description: "Uncategorized posts", color: "#3355FF" });
  }

  const existingPageCategory = await PageCategory.findOne({ name: "General" });
  if (!existingPageCategory) {
    await PageCategory.create({ name: "General", slug: "general", description: "Uncategorized pages", color: "#3355FF" });
  }

  return "Database successfully seeded!";
};

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log("Seed complete.");
      mongoose.disconnect();
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}

module.exports = { runSeed };
