const User = require("../models/User");
const Role = require("../models/Role");
const crypto = require("crypto");

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
  role: user.role && { id: user.role._id, name: user.role.name, isSuperAdmin: user.role.isSuperAdmin },
});
 
exports.listAuthors = async (req, res) => {
  try {
    const users = await User.find({ status: { $ne: "suspended" } })
      .select("name avatarUrl avatarColor designation")
      .sort({ name: 1 });
    res.json({ items: users.map((u) => ({ id: u._id, name: u.name, avatarUrl: u.avatarUrl, avatarColor: u.avatarColor, designation: u.designation })) });
  } catch (err) {
    res.status(500).json({ message: "Failed to load authors" });
  }
};

// GET /api/users?search=&role=&status=&page=
exports.listUsers = async (req, res) => {
  try {
    const { search = "", role = "", status = "", page = 1, limit = 20 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

    const [users, total] = await Promise.all([
      User.find(query)
        .populate("role")
        .sort({ createdAt: -1, _id: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.countDocuments(query),
    ]);

    res.json({
      items: users.map(sanitize),
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load team members" });
  }
};

// POST /api/users  — admin creates/invites a teammate
exports.createUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "A user with that email already exists" });

    const roleDoc = await Role.findById(role);
    if (!roleDoc) return res.status(400).json({ message: "Selected role does not exist" });

   
    const tempPassword = password || crypto.randomBytes(9).toString("base64url");

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: tempPassword,
      role: roleDoc._id,
      status: "invited",
    });

    const populated = await user.populate("role");
    res.status(201).json({
      user: sanitize(populated),
      temporaryPassword: password ? undefined : tempPassword,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create user" });
  }
};

// PATCH /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, designation } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ message: "A user with that email already exists" });
      user.email = email.toLowerCase();
    }
    if (name) user.name = name;
    if (designation !== undefined) user.designation = designation;
    if (role) {
      const roleDoc = await Role.findById(role);
      if (!roleDoc) return res.status(400).json({ message: "Selected role does not exist" });
      user.role = roleDoc._id;
    }

    await user.save();
    const populated = await user.populate("role");
    res.json({ user: sanitize(populated) });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user" });
  }
};

// PATCH /api/users/:id/status  { status: "active" | "suspended" }
exports.setUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    if (req.user.id.toString() === req.params.id) {
      return res.status(400).json({ message: "You can't change your own status" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate("role");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.id.toString() === req.params.id) {
      return res.status(400).json({ message: "You can't delete your own account" });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user" });
  }
};
