const Role = require("../models/Role");
const User = require("../models/User");
const { PERMISSIONS } = require("../config/permissions");

exports.listPermissions = async (req, res) => {
  res.json({ permissions: PERMISSIONS });
};

exports.listRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ isSuperAdmin: -1, isSystem: -1, name: 1 });
    const canViewFull = req.user.role.isSuperAdmin || req.user.role.permissions.includes("roles:view");

    if (!canViewFull) {
      
      return res.json({ items: roles.map((r) => ({ _id: r._id, name: r.name })) });
    }

    const counts = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    res.json({
      items: roles.map((r) => ({ ...r.toObject(), userCount: countMap[r._id.toString()] || 0 })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load roles" });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, description = "", permissions = [] } = req.body;

    const existing = await Role.findOne({ name: name.trim() });
    if (existing) return res.status(409).json({ message: "A role with that name already exists" });

    const role = await Role.create({ name: name.trim(), description, permissions });
    res.status(201).json({ role });
  } catch (err) {
    res.status(500).json({ message: "Failed to create role" });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    if (role.isSuperAdmin) {
      return res.status(400).json({ message: "The Super Admin role can't be modified" });
    }

    const { name, description, permissions } = req.body;

    if (role.isSystem && name && name.trim() !== role.name) {
      return res.status(400).json({ message: "Built-in role names can't be changed" });
    }

    if (name && !role.isSystem) role.name = name.trim();
    if (description !== undefined) role.description = description;
    if (Array.isArray(permissions)) role.permissions = permissions;

    await role.save();
    res.json({ role });
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.isSystem) return res.status(400).json({ message: "Built-in roles can't be deleted" });

    const inUse = await User.countDocuments({ role: role._id });
    if (inUse > 0) {
      return res.status(400).json({ message: `${inUse} user(s) still have this role. Reassign them first.` });
    }

    await role.deleteOne();
    res.json({ message: "Role deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete role" });
  }
};
