const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const mongoose = require("mongoose");
const multer = require("multer");

const Role = require("../models/Role");
const User = require("../models/User");
const Category = require("../models/Category");
const Blog = require("../models/Blog");
const Media = require("../models/Media");
const Page = require("../models/Page");
const PageCategory = require("../models/PageCategory");

const os = require("os");

const sqlStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => cb(null, `migration_${Date.now()}.sql`),
});
const sqlUpload = multer({
  storage: sqlStorage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith(".sql") || file.mimetype === "application/octet-stream" || file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Only .sql files are allowed"), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

exports.sqlUploadMiddleware = sqlUpload.single("sqlFile");
 
function parseTupleValues(tupleStr) {
  const values = [];
  let currentVal = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < tupleStr.length; i++) {
    const char = tupleStr[i];
    if (escapeNext) {
      if (char === "n") currentVal += "\n";
      else if (char === "r") currentVal += "\r";
      else if (char === "t") currentVal += "\t";
      else currentVal += char;
      escapeNext = false;
    }
    else if (char === "\\") { escapeNext = true; }
    else if (char === "'") { inString = !inString; }
    else if (char === "," && !inString) { values.push(cleanValue(currentVal)); currentVal = ""; }
    else { currentVal += char; }
  }
  values.push(cleanValue(currentVal));
  return values;
}

function cleanValue(val) {
  val = val.trim();
  if (val === "NULL" || val === "null") return null;
  if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
  return val;
}

function parseSqlDump(content) {
  const TARGET_TABLES = ["blog_categories", "users", "gallaries", "pages", "blogs"];
  let i = 0, inString = false, escapeNext = false, inTuple = false;
  let currentTuple = "", activeTable = "";
  const tableColumns = {};
  const tablesData = {};
  TARGET_TABLES.forEach((t) => (tablesData[t] = []));

  const INSERT_KW = "INSERT INTO";

  while (i < content.length) {
    const char = content[i];
    if (escapeNext) { if (inTuple) currentTuple += char; escapeNext = false; i++; continue; }
    if (char === "\\") { if (inTuple) currentTuple += char; escapeNext = true; i++; continue; }
    if (char === "'") { if (inTuple) currentTuple += char; inString = !inString; i++; continue; }

    if (!inString) {
      if (content.substring(i, i + INSERT_KW.length).toUpperCase() === INSERT_KW) {
        const endOfHeader = content.indexOf("VALUES", i);
        if (endOfHeader !== -1) {
          const header = content.slice(i, endOfHeader + 6);
          const match = header.match(/INSERT INTO\s+`?(\w+)`?\s*\(([^)]+)\)\s*VALUES/i);
          if (match) {
            const tbl = match[1];
            activeTable = TARGET_TABLES.includes(tbl) ? tbl : "";
            if (activeTable) {
              tableColumns[tbl] = match[2].replace(/`/g, "").split(",").map((s) => s.trim());
            }
          }
          i = endOfHeader + 6;
          continue;
        }
      }

      if (char === "(" && !inTuple && activeTable) { inTuple = true; currentTuple = ""; }
      else if (char === ")" && inTuple) {
        const next = content[i + 1] || "";
        if (next === "," || next === ";") {
          inTuple = false;
          const vals = parseTupleValues(currentTuple);
          const cols = tableColumns[activeTable];
          if (cols) {
            const record = {};
            cols.forEach((c, idx) => (record[c] = vals[idx]));
            tablesData[activeTable].push(record);
          }
          currentTuple = "";
          if (next === ";") activeTable = "";
          i += 2;
          continue;
        } else { currentTuple += char; }
      } else if (inTuple) { currentTuple += char; }
    } else { if (inTuple) currentTuple += char; }
    i++;
  }
  return tablesData;
}
 
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(destPath);
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(destPath); });
    }).on("error", (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

async function downloadAndMapUrl(oldUrl) {
  if (!oldUrl || typeof oldUrl !== "string") return oldUrl;
  // Match any TLD (.com, .ca, .co.uk, etc) and support optional /public/ prefix before upload/
  const domainMatch = oldUrl.match(/https?:\/\/blognew\.dynamicssquare\.[a-z.]+\/(public\/)?upload\/(.+)/);
  if (domainMatch) {
    const rel = domainMatch[2];
    
    const uploadDir = process.env.UPLOAD_PATH 
      ? path.resolve(process.env.UPLOAD_PATH) 
      : path.join(__dirname, "..", "uploads");
      
    const localDest = path.join(uploadDir, rel);
    const localUrl = `/uploads/${rel}`;
    if (fs.existsSync(localDest)) return localUrl;
    try { await downloadFile(oldUrl, localDest); return localUrl; }
    catch { return oldUrl; }
  }
  return oldUrl;
}

async function downloadAndReplaceHtmlUrls(html) {
  if (!html) return html;
  // Match any TLD (.com, .ca, .co.uk, etc) with optional /public/ prefix
  const urlRegex = /https?:\/\/blognew\.dynamicssquare\.[a-z.]+\/(public\/)?upload\/[^\s"'>\)]+/g;
  const urls = [...new Set(html.match(urlRegex) || [])];
  let result = html;
  for (const oldUrl of urls) {
    const localUrl = await downloadAndMapUrl(oldUrl);
    result = result.split(oldUrl).join(localUrl);
  }
  // Clean up inline CSS (strip style="..." entirely)
  result = result.replace(/\sstyle\s*=\s*("|')[^"']*("|')/gi, "");
  
  // Clean up completely empty tags (h1-h6, p, div, span, strong, b, em, i)
  // We use a while loop to catch deeply nested empty tags like <div><p><br></p></div>
  const emptyTagRegex = /<(p|h[1-6]|div|span|strong|em|b|i)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi;
  let previousResult;
  do {
    previousResult = result;
    result = result.replace(emptyTagRegex, "");
  } while (result !== previousResult);
  
  // Add proper formatting: Insert newlines BEFORE and AFTER major block tags so it's perfectly readable in the editor!
  result = result.replace(/>\s*</g, "><"); // First, strip all weird arbitrary spacing between tags
  
  // Newline BEFORE opening tags
  result = result.replace(/(<(p|h[1-6]|div|ul|ol|li|table|blockquote|figure)[^>]*>)/gi, "\n$1");
  
  // Newline AFTER closing tags
  result = result.replace(/(<\/(p|h[1-6]|div|ul|ol|li|table|blockquote|figure)>)/gi, "$1\n");
  
  // Strip any accidental double-newlines created by nesting
  result = result.replace(/\n\s*\n/g, "\n");

  return result.trim();
}
 
exports.runMigration = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No SQL file uploaded." });
 
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  const sqlFilePath = req.file.path;

  try {
    send("log", { msg: "Reading SQL file…" });
    const content = fs.readFileSync(sqlFilePath, "utf8");

    send("log", { msg: "Parsing SQL dump…" });
    const data = parseSqlDump(content);
    
    const totalParsed =
      (data.blog_categories || []).length +
      (data.users || []).length +
      (data.gallaries || []).length +
      (data.pages || []).length +
      (data.blogs || []).length;

    if (totalParsed === 0) {
      throw new Error("No valid SQL tables (blog_categories, users, gallaries, pages, or blogs) parsed from the file. Migration aborted to prevent database wipe.");
    }

    send("log", { msg: `Parsed: ${data.blog_categories.length} categories, ${data.users.length} users, ${data.gallaries.length} media, ${data.pages.length} pages, ${data.blogs.length} blogs` });

    // Clear existing data
    send("log", { msg: "Clearing existing collections…" });
    await Category.deleteMany({});
    await User.deleteMany({});
    await Media.deleteMany({});
    await Page.deleteMany({});
    await Blog.deleteMany({});

    // Roles
    send("log", { msg: "Checking roles…" });
    let roles = await Role.find({});
    if (roles.length === 0) {
      const defaults = [
        { name: "Super Admin", isSystem: true, isSuperAdmin: true },
        { name: "Admin", isSystem: true, isSuperAdmin: false },
        { name: "Editor", isSystem: true, isSuperAdmin: false },
        { name: "Viewer", isSystem: true, isSuperAdmin: false },
      ];
      roles = await Promise.all(defaults.map((r) => Role.create(r)));
      send("log", { msg: "Default roles seeded." });
    }
    const superAdminRole = roles.find((r) => r.isSuperAdmin) || roles[0];
    const editorRole = roles.find((r) => r.name === "Editor") || roles[roles.length - 1];
 
    send("stage", { stage: "categories", total: data.blog_categories.length, done: 0 });
    for (let idx = 0; idx < data.blog_categories.length; idx++) {
      const sqlCat = data.blog_categories[idx];
      const catName = (sqlCat.category_name || "").substring(0, 60);
      let cat = await Category.findOne({
        $or: [{ slug: sqlCat.category_slug }, { name: catName }]
      });
      
      if (!cat) {
        cat = await Category.create({
          name: catName,
          slug: sqlCat.category_slug,
          description: `Migrated: ${sqlCat.category_name}`.substring(0, 200),
          color: "#3355FF",
        });
      }
      send("stage", { stage: "categories", total: data.blog_categories.length, done: idx + 1, current: cat.name });
    }

 
    send("stage", { stage: "users", total: data.users.length, done: 0 });
    const userEmailMap = {};
    for (let idx = 0; idx < data.users.length; idx++) {
      const sqlUser = data.users[idx];
      let user = await User.findOne({ email: sqlUser.email });
      if (!user) {
        const isAdmin = (sqlUser.name || "").toLowerCase() === "admin" || (sqlUser.email || "").toLowerCase().includes("admin");
        const avatarLocalUrl = await downloadAndMapUrl(sqlUser.profile_photo_path);
        
        const baseSlug = (sqlUser.name || "").toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 100);
        
        let uniqueSlug = baseSlug;
        let counter = 1;
        while (await User.findOne({ authorSlug: uniqueSlug })) {
          uniqueSlug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        let userSchema = [];
        if (sqlUser.schema_script || sqlUser._script) {
          const rawScript = sqlUser.schema_script || sqlUser._script;
          const rx = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
          let m; let found = false;
          while ((m = rx.exec(rawScript.trim())) !== null) {
            if (m[1].trim()) { userSchema.push({ type: "Person", json: m[1].trim() }); found = true; }
          }
          if (!found && rawScript.trim()) userSchema.push({ type: "Person", json: rawScript.trim() });
        }
        
        const userDoc = {
          name: (sqlUser.name || "").substring(0, 100),
          email: sqlUser.email,
          password: sqlUser.password ? sqlUser.password.replace(/^\$2y\$/, "$2b$") : "ChangeMe123!",
          role: isAdmin ? superAdminRole._id : editorRole._id,
          status: parseInt(sqlUser.status, 10) === 1 ? "active" : "suspended",
          about: (sqlUser.about || "").substring(0, 500),
          designation: (sqlUser.role_name || "").substring(0, 100),
          avatarUrl: avatarLocalUrl || "",
          authorSlug: uniqueSlug,
          schemaMarkup: userSchema,
          socialLinks: {
            linkedin: sqlUser.linkedin || sqlUser.linkedin_url || "",
            twitter: sqlUser.twitter || sqlUser.twitter_url || "",
            facebook: sqlUser.facebook || sqlUser.facebook_url || "",
            instagram: sqlUser.instagram || sqlUser.instagram_url || "",
          }
        };
        const result = await User.collection.insertOne(userDoc);
        user = { ...userDoc, _id: result.insertedId };
      }
      userEmailMap[(sqlUser.email || "").toLowerCase()] = user._id;
      send("stage", { stage: "users", total: data.users.length, done: idx + 1, current: sqlUser.name });
    }
 
    send("stage", { stage: "media", total: data.gallaries.length, done: 0 });
    for (let idx = 0; idx < data.gallaries.length; idx++) {
      const sqlImg = data.gallaries[idx];
      let media = await Media.findOne({ originalName: sqlImg.image_name });
      if (!media) {
        const mediaLocalUrl = await downloadAndMapUrl(sqlImg.image_url);
        const ext = path.extname(sqlImg.image_name).toLowerCase();
        const mimeMap = { ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp" };
        media = await Media.create({
          originalName: sqlImg.image_name,
          fileName: path.basename(mediaLocalUrl),
          type: "image",
          mimeType: mimeMap[ext] || "image/jpeg",
          size: 0,
          url: mediaLocalUrl,
          uploadedBy: "Admin",
        });
      }
      send("stage", { stage: "media", total: data.gallaries.length, done: idx + 1, current: sqlImg.image_name });
    }

  
    send("stage", { stage: "pages", total: data.pages.length, done: 0 });
    let pageCat = await PageCategory.findOne({ name: "General" });
    if (!pageCat) pageCat = await PageCategory.create({ name: "General", slug: "general", description: "Uncategorized pages" });
    const defaultAuthor = await User.findOne({ email: "admin@admin.com" }) || await User.findOne({});
    const defaultAuthorId = defaultAuthor?._id || null;

    for (let idx = 0; idx < data.pages.length; idx++) {
      const sqlPage = data.pages[idx];
      let page = await Page.findOne({ slug: sqlPage.page_slug });
      if (!page) {
        page = await Page.create({
          title: (sqlPage.page_name || "").substring(0, 200),
          slug: sqlPage.page_slug,
          content: { sections: [] },
          category: pageCat._id,
          status: parseInt(sqlPage.status, 10) === 1 ? "published" : "draft",
          author: defaultAuthorId,
        });
      }
      send("stage", { stage: "pages", total: data.pages.length, done: idx + 1, current: sqlPage.page_name });
    }

 
    send("stage", { stage: "blogs", total: data.blogs.length, done: 0 });
    let imported = 0, skipped = 0;
    for (let idx = 0; idx < data.blogs.length; idx++) {
      const sqlBlog = data.blogs[idx];
      let blog = await Blog.findOne({ slug: sqlBlog.title_slug });
      if (blog) { skipped++; send("stage", { stage: "blogs", total: data.blogs.length, done: idx + 1, current: sqlBlog.title, skipped: true }); continue; }
 
      let catId = null;
      if (sqlBlog.category_slug) {
        const fallbackCatName = (sqlBlog.category || "").substring(0, 60);
        let cat = await Category.findOne({
          $or: [{ slug: sqlBlog.category_slug }, ...(fallbackCatName ? [{ name: fallbackCatName }] : [])]
        });
        if (!cat && fallbackCatName) {
          cat = await Category.create({ name: fallbackCatName, slug: sqlBlog.category_slug, color: "#3355FF" });
        }
        if (cat) catId = cat._id;
      }
 
      let authorId = userEmailMap[(sqlBlog.author_email || "").toLowerCase()];
      if (!authorId && sqlBlog.author) {
        const au = await User.findOne({ name: sqlBlog.author });
        if (au) authorId = au._id;
      }
      if (!authorId) authorId = defaultAuthorId;

      // Reading time
      let readingTime = 1;
      if (sqlBlog.read_time) { const d = sqlBlog.read_time.match(/\d+/); if (d) readingTime = parseInt(d[0], 10); }

      // Schema markup
      const schemaMarkup = [];
      if (sqlBlog.additional_script) {
        const rx = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
        let m; let found = false;
        while ((m = rx.exec(sqlBlog.additional_script.trim())) !== null) {
          if (m[1].trim()) { schemaMarkup.push({ type: "Custom", json: m[1].trim() }); found = true; }
        }
        if (!found && sqlBlog.additional_script.trim()) schemaMarkup.push({ type: "Custom", json: sqlBlog.additional_script.trim() });
      }

      // Download images
      const featuredUrl = await downloadAndMapUrl(sqlBlog.image);
      const localContent = await downloadAndReplaceHtmlUrls(sqlBlog.description || "");
      const localExcerpt = await downloadAndReplaceHtmlUrls(sqlBlog.short_description || "");
      const tags = sqlBlog.meta_tags ? sqlBlog.meta_tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

      const blogDoc = {
        title: (sqlBlog.title || "").substring(0, 200),
        slug: sqlBlog.title_slug,
        content: localContent,
        excerpt: localExcerpt.substring(0, 300),
        featuredImage: { url: featuredUrl || "", alt: (sqlBlog.title || "").substring(0, 200) },
        category: catId,
        tags,
        seo: {
          metaTitle: (sqlBlog.meta_title || "").substring(0, 70),
          metaDescription: (sqlBlog.meta_description || "").substring(0, 200),
          focusKeyword: (sqlBlog.meta_keyword || "").substring(0, 100),
        },
        schemaMarkup,
        status: parseInt(sqlBlog.status, 10) === 1 ? "published" : "draft",
        author: authorId,
        readingTimeMinutes: readingTime,
        publishedAt: sqlBlog.publish_date ? new Date(sqlBlog.publish_date) : (sqlBlog.created_at ? new Date(sqlBlog.created_at) : new Date()),
        createdAt: sqlBlog.created_at ? new Date(sqlBlog.created_at) : new Date(),
        updatedAt: sqlBlog.updated_at ? new Date(sqlBlog.updated_at) : null,
      };
      
      const result = await Blog.collection.insertOne(blogDoc);
      blog = { ...blogDoc, _id: result.insertedId };
      imported++;
      send("stage", { stage: "blogs", total: data.blogs.length, done: idx + 1, current: blog.title, skipped: false });
    }

    // Clean up uploaded SQL file
    fs.unlink(sqlFilePath, () => {});

    send("done", {
      msg: "Migration complete!",
      stats: {
        categories: data.blog_categories.length,
        users: data.users.length,
        media: data.gallaries.length,
        pages: data.pages.length,
        blogsImported: imported,
        blogsSkipped: skipped,
      },
    });
    res.end();
  } catch (err) {
    console.error("Migration error:", err);
    send("error", { msg: err.message || "Migration failed." });
    res.end();
    if (req.file?.path) fs.unlink(req.file.path, () => {});
  }
};
