const User = require("../models/User");
const Role = require("../models/Role");
const { verifyAccessToken } = require("../utils/tokens");
 
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({ message: "Session expired, please sign in again" });
    }

    const user = await User.findById(payload.sub).populate("role");
    if (!user) return res.status(401).json({ message: "Account no longer exists" });
    if (user.status === "suspended") {
      return res.status(403).json({ message: "This account has been suspended" });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: "Authentication check failed" });
  }
};
 
const authorize = (...required) => (req, res, next) => {
  const role = req.user?.role;
  if (!role) return res.status(403).json({ message: "No role assigned to this account" });
  if (role.isSuperAdmin) return next();

  const missing = required.filter((perm) => !role.permissions.includes(perm));
  if (missing.length) {
    return res.status(403).json({ message: "You don't have permission to do that" });
  }
  next();
};

 
const authorizeAny = (...anyOf) => (req, res, next) => {
  const role = req.user?.role;
  if (!role) return res.status(403).json({ message: "No role assigned to this account" });
  if (role.isSuperAdmin) return next();

  const hasOne = anyOf.some((perm) => role.permissions.includes(perm));
  if (!hasOne) {
    return res.status(403).json({ message: "You don't have permission to do that" });
  }
  next();
};

module.exports = { protect, authorize, authorizeAny };
