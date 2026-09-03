const fs = require("fs");
const path = require("path");
const User = require("../models/User");

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  status: user.status,
  avatarColor: user.avatarColor,
  avatarUrl: user.avatarUrl,
  designation: user.designation,
  about: user.about,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  socialLinks: user.socialLinks || { linkedin: "", twitter: "", facebook: "", instagram: "" },
  schemaMarkup: user.schemaMarkup || [],
  role: user.role && {
    id: user.role._id,
    name: user.role.name,
    isSuperAdmin: user.role.isSuperAdmin,
    permissions: user.role.permissions,
  },
});

// GET /api/users/me
exports.getMyProfile = async (req, res) => {
  const user = await req.user.populate("role");
  res.json({ user: sanitize(user) });
};
 
exports.updateMyProfile = async (req, res) => {
  try {
    const { name, about, socialLinks, schemaMarkup } = req.body;
    if (name !== undefined) req.user.name = name;
    if (about !== undefined) req.user.about = about;
    
    if (socialLinks) {
      req.user.socialLinks = {
        linkedin: socialLinks.linkedin !== undefined ? socialLinks.linkedin : req.user.socialLinks?.linkedin,
        twitter: socialLinks.twitter !== undefined ? socialLinks.twitter : req.user.socialLinks?.twitter,
        facebook: socialLinks.facebook !== undefined ? socialLinks.facebook : req.user.socialLinks?.facebook,
        instagram: socialLinks.instagram !== undefined ? socialLinks.instagram : req.user.socialLinks?.instagram,
      };
    }
    
    if (Array.isArray(schemaMarkup)) {
      req.user.schemaMarkup = schemaMarkup;
    }
    
    await req.user.save();
    const populated = await req.user.populate("role");
    res.json({ user: sanitize(populated) });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// POST /api/users/me/avatar
exports.uploadMyAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image was uploaded" });
 
    if (req.user.avatarUrl) {
      const oldFile = req.user.avatarUrl.split("/uploads/avatars/")[1];
      if (oldFile) {
        const oldPath = path.join(__dirname, "..", "uploads", "avatars", oldFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    req.user.avatarUrl = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;
    await req.user.save();
    const populated = await req.user.populate("role");
    res.json({ user: sanitize(populated) });
  } catch (err) {
    res.status(500).json({ message: "Failed to upload profile picture" });
  }
};

// PATCH /api/users/me/password
exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+password");

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword; // pre-save hook re-hashes
    await user.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to change password" });
  }
};
