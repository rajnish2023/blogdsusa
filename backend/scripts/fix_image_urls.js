/**
 * fix_image_urls.js
 * Downloads all missing images from blognew.dynamicssquare.ca
 * and rewrites every external URL in MongoDB to local /uploads/... paths.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const https = require("https");
const http  = require("http");
const path  = require("path");
const fs    = require("fs");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// ── Image downloader ────────────────────────────────────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(destPath);
    const lib  = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(destPath); });
    }).on("error", (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

function mapUrl(oldUrl) {
  if (!oldUrl || typeof oldUrl !== "string") return null;
  const m = oldUrl.match(/https?:\/\/blognew\.dynamicssquare\.(ca|com)\/(public\/)?upload\/(.+)/);
  return m ? { rel: m[3], local: `/uploads/${m[3]}` } : null;
}

async function resolveUrl(oldUrl) {
  const mapped = mapUrl(oldUrl);
  if (!mapped) return oldUrl;
  const destPath = path.join(UPLOADS_DIR, mapped.rel);
  if (fs.existsSync(destPath)) return mapped.local;
  try {
    await downloadFile(oldUrl, destPath);
    return mapped.local;
  } catch (e) {
    console.warn(`  ⚠ Download failed: ${oldUrl} — ${e.message}`);
    return oldUrl; // keep original if download fails
  }
}

async function replaceHtmlUrls(html) {
  if (!html) return html;
  const regex = /https?:\/\/blognew\.dynamicssquare\.(ca|com)\/(public\/)?upload\/[^\s"'>)]+/g;
  const urls  = [...new Set(html.match(regex) || [])];
  let result  = html;
  for (const u of urls) {
    const local = await resolveUrl(u);
    result = result.split(u).join(local);
  }
  return result;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  // ── Blogs ─────────────────────────────────────────────────────────────────
  const blogs = await db.collection("blogs").find({}).toArray();
  console.log(`Processing ${blogs.length} blogs…\n`);

  let fixed = 0, already = 0, failed = 0;

  for (let i = 0; i < blogs.length; i++) {
    const blog   = blogs[i];
    const update = {};

    // Featured image
    const imgUrl = blog.featuredImage?.url || "";
    if (imgUrl.startsWith("http")) {
      const local = await resolveUrl(imgUrl);
      update["featuredImage.url"] = local;
    }

    // Body content — inline images
    const newContent = await replaceHtmlUrls(blog.content);
    if (newContent !== blog.content) update["content"] = newContent;

    if (Object.keys(update).length > 0) {
      await db.collection("blogs").updateOne({ _id: blog._id }, { $set: update });
      fixed++;
      process.stdout.write(`\r[${i + 1}/${blogs.length}] Fixed: ${fixed}  `);
    } else {
      already++;
    }
  }

  console.log(`\n\nBlogs fixed: ${fixed}`);
  console.log(`Already local: ${already}`);

  // ── Media collection ──────────────────────────────────────────────────────
  const mediaItems = await db.collection("media").find({ url: /^http/ }).toArray();
  console.log(`\nProcessing ${mediaItems.length} media items…`);
  let mediaFixed = 0;
  for (const m of mediaItems) {
    const local = await resolveUrl(m.url);
    if (local !== m.url) {
      await db.collection("media").updateOne({ _id: m._id }, { $set: { url: local } });
      mediaFixed++;
    }
  }
  console.log(`Media fixed: ${mediaFixed}`);

  // ── Users (avatars) ───────────────────────────────────────────────────────
  const users = await db.collection("users").find({ avatarUrl: /^http/ }).toArray();
  console.log(`\nProcessing ${users.length} user avatars…`);
  let usersFixed = 0;
  for (const u of users) {
    const local = await resolveUrl(u.avatarUrl);
    if (local !== u.avatarUrl) {
      await db.collection("users").updateOne({ _id: u._id }, { $set: { avatarUrl: local } });
      usersFixed++;
    }
  }
  console.log(`Avatars fixed: ${usersFixed}`);

  // ── Final count ───────────────────────────────────────────────────────────
  const remaining = await db.collection("blogs").countDocuments({ "featuredImage.url": /^http/ });
  console.log(`\n✅ Done! Remaining external blog image URLs: ${remaining}`);

  await mongoose.disconnect();
}

main().catch(console.error);
