const Blog = require("../models/Blog");
const Media = require("../models/Media");
const User = require("../models/User");

exports.getStats = async (req, res) => {
  try {
    const [
      totalBlogs,
      totalMedia,
      totalUsers,
      publishedBlogs,
      draftBlogs,
      latestBlogs,
      topBlogs
    ] = await Promise.all([
      Blog.countDocuments(),
      Media.countDocuments(),
      User.countDocuments(),
      Blog.countDocuments({ status: "published" }),
      Blog.countDocuments({ status: "draft" }),
      Blog.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("author", "name avatarUrl")
        .select("title slug status views createdAt author"),
      Blog.find({ status: "published" })
        .sort({ views: -1 })
        .limit(5)
        .populate("author", "name avatarUrl")
        .select("title slug status views publishedAt author")
    ]);

    res.json({
      totalBlogs,
      totalMedia,
      totalUsers,
      publishedBlogs,
      draftBlogs,
      latestBlogs,
      topBlogs
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};
