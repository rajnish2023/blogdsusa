const fs = require("fs");
const path = require("path");
const Media = require("../models/Media");

const uploadDir = process.env.UPLOAD_PATH 
  ? path.resolve(process.env.UPLOAD_PATH) 
  : path.join(__dirname, "..", "uploads");

const buildUrl = (req, fileName) =>
  `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
 
exports.uploadMedia = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "No files were uploaded." });
    }
 
    let alts = [];
    if (req.body.alts) {
      try {
        const parsed = JSON.parse(req.body.alts);
        if (Array.isArray(parsed)) alts = parsed;
      } catch {
        
      }
    }

    const docs = await Promise.all(
      files.map((file, idx) =>
        Media.create({
          originalName: file.originalname,
          fileName: file.filename,
          type: file.mimetype.startsWith("video") ? "video" : "image",
          mimeType: file.mimetype,
          size: file.size,
          url: buildUrl(req, file.filename),
          alt: typeof alts[idx] === "string" ? alts[idx].slice(0, 250).trim() : "",
          uploadedBy: req.user?.name || "Admin",
        })
      )
    );

    res.status(201).json({ message: "Upload successful", items: docs });
  } catch (err) {
    res.status(500).json({ message: err.message || "Upload failed" });
  }
};

 
exports.getMedia = async (req, res) => {
  try {
    const { type = "all", search = "", sort = "newest", page = 1, limit = 24 } = req.query;

    const query = {};
    if (type !== "all") query.type = type;
    if (search) query.originalName = { $regex: search, $options: "i" };

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { originalName: 1 },
    };

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.min(parseInt(limit, 10) || 24, 100);

    const [items, total] = await Promise.all([
      Media.find(query)
        .sort(sortMap[sort] || sortMap.newest)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Media.countDocuments(query),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      counts: {
        all: await Media.countDocuments({}),
        image: await Media.countDocuments({ type: "image" }),
        video: await Media.countDocuments({ type: "video" }),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch media" });
  }
};

 
exports.deleteMedia = async (req, res) => {
  try {
    const item = await Media.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "File not found" });

    const filePath = path.join(uploadDir, item.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await item.deleteOne();
    res.json({ message: "Deleted successfully", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message || "Delete failed" });
  }
};

 
exports.downloadMedia = async (req, res) => {
  try {
    const item = await Media.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "File not found" });

    const filePath = path.join(uploadDir, item.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File missing on server" });
    }
    res.download(filePath, item.originalName);
  } catch (err) {
    res.status(500).json({ message: err.message || "Download failed" });
  }
};

exports.bulkDeleteMedia = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: "Invalid payload. 'ids' array is required." });
    }

    const items = await Media.find({ _id: { $in: ids } });
    
    // Delete files from file system
    for (const item of items) {
      const filePath = path.join(uploadDir, item.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete records from database
    await Media.deleteMany({ _id: { $in: ids } });

    res.status(200).json({ message: `${items.length} files deleted successfully` });
  } catch (err) {
    console.error("Bulk delete media error:", err);
    res.status(500).json({ message: "Failed to delete files" });
  }
};

