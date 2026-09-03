const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const uploadBaseDir = process.env.UPLOAD_PATH 
  ? path.resolve(process.env.UPLOAD_PATH) 
  : path.join(__dirname, "..", "uploads");

const avatarDir = path.join(uploadBaseDir, "avatars");

if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Profile pictures must be JPG, PNG, GIF, or WebP"), false);
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is plenty for a profile picture
});

module.exports = uploadAvatar;
