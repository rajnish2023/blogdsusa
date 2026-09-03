require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
 
const Role = require("../models/Role");
const User = require("../models/User");
const Category = require("../models/Category");
const Blog = require("../models/Blog");
const Media = require("../models/Media");
const Page = require("../models/Page");
const PageCategory = require("../models/PageCategory");
const https = require("https");

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: Status code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});  
      reject(err);
    });
  });
}

async function downloadAndMapUrl(oldUrl) {
  if (!oldUrl || typeof oldUrl !== 'string') return oldUrl;
  
  if (oldUrl.includes('blognew.dynamicssquare.com/upload/')) {
    const parts = oldUrl.split('blognew.dynamicssquare.com/upload/');
    const relativePart = parts[1]; // e.g. "blog/1768041258082378.jpg"
    
    const localDest = path.join(__dirname, "..", "uploads", relativePart);
    const localUrl = `/uploads/${relativePart}`;
    
    if (fs.existsSync(localDest)) {
      return localUrl;
    }
    
    try {
      console.log(`Downloading image: ${oldUrl} -> ${localDest}`);
      await downloadFile(oldUrl, localDest);
      return localUrl;
    } catch (err) {
      console.warn(`Warning: Failed to download image ${oldUrl}: ${err.message}`);
      return oldUrl;  
    }
  }
  
  return oldUrl;
}

async function downloadAndReplaceHtmlUrls(html) {
  if (!html) return html;
  
  const urlRegex = /https:\/\/blognew\.dynamicssquare\.com\/upload\/[^\s"'>\)]+/g;
  const urls = html.match(urlRegex) || [];
  
  const uniqueUrls = [...new Set(urls)];
  
  let newHtml = html;
  for (const oldUrl of uniqueUrls) {
    const localUrl = await downloadAndMapUrl(oldUrl);
    newHtml = newHtml.split(oldUrl).join(localUrl);
  }
  return newHtml;
}

// Helper to parse tuple values from SQL string
function parseTupleValues(tupleStr) {
  const values = [];
  let currentVal = '';
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
    } else if (char === '\\') {
      escapeNext = true;
    } else if (char === '\'') {
      inString = !inString;
    } else if (char === ',' && !inString) {
      values.push(cleanValue(currentVal));
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  values.push(cleanValue(currentVal));
  return values;
}

function cleanValue(val) {
  val = val.trim();
  if (val === 'NULL' || val === 'null') return null;
  // If it is enclosed in single quotes, strip them
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1);
  }
  return val;
}

// Main parser function for SQL dump file
function parseSqlDump(filePath) {
  console.log(`Reading SQL file from: ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`File read successfully. Parsing ${content.length} characters...`);

  let i = 0;
  let inString = false;
  let escapeNext = false;
  let inTuple = false;
  let currentTuple = '';
  
  let activeTable = '';
  let tableColumns = {};  
  
  const tablesData = {
    blog_categories: [],
    users: [],
    gallaries: [],
    pages: [],
    blogs: []
  };

  const insertKeyword = "INSERT INTO";

  while (i < content.length) {
    const char = content[i];

    if (escapeNext) {
      if (inTuple) currentTuple += char;
      escapeNext = false;
      i++;
      continue;
    }

    if (char === '\\') {
      if (inTuple) currentTuple += char;
      escapeNext = true;
      i++;
      continue;
    }

    if (char === '\'') {
      if (inTuple) currentTuple += char;
      inString = !inString;
      i++;
      continue;
    }

    if (!inString) {
      // Check for INSERT INTO keyword at current position
      if (content.substring(i, i + insertKeyword.length).toUpperCase() === insertKeyword) {
        const endOfHeader = content.indexOf("VALUES", i);
        if (endOfHeader !== -1) {
          const headerText = content.slice(i, endOfHeader + 6); // include "VALUES"
          const match = headerText.match(/INSERT INTO\s+`?(\w+)`?\s*\(([^)]+)\)\s*VALUES/i);
          if (match) {
            const tableName = match[1];
            if (tablesData[tableName]) {
              activeTable = tableName;
              const colList = match[2].replace(/`/g, '').split(',').map(s => s.trim());
              tableColumns[tableName] = colList;
            } else {
              activeTable = ''; // Ignored table
            }
          }
          i = endOfHeader + 6; // Move cursor past "VALUES"
          continue;
        }
      }

      if (char === '(' && !inTuple && activeTable) {
        inTuple = true;
        currentTuple = '';
      } else if (char === ')' && inTuple) {
        const nextChar = content[i + 1] || '';
        if (nextChar === ',' || nextChar === ';') {
          inTuple = false;
          const values = parseTupleValues(currentTuple);
          const cols = tableColumns[activeTable];
          
          const record = {};
          for (let j = 0; j < cols.length; j++) {
            record[cols[j]] = values[j];
          }
          
          tablesData[activeTable].push(record);
          currentTuple = '';
          
          if (nextChar === ';') {
            activeTable = '';
          }
          i += 2; // skip ) and separator
          continue;
        } else {
          currentTuple += char;
        }
      } else if (inTuple) {
        currentTuple += char;
      }
    } else {
      if (inTuple) currentTuple += char;
    }
    i++;
  }
  
  console.log("SQL file parsing complete. Records extracted:");
  for (const table in tablesData) {
    console.log(`  - ${table}: ${tablesData[table].length} records`);
  }
  return tablesData;
}

// Database migration runner
async function runMigration() {
  try {
    // 1. Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully.");

    // Clear existing collections to start a clean, self-hosted migration
    console.log("Clearing existing collections for a fresh self-hosted migration...");
    await Category.deleteMany({});
    await User.deleteMany({});
    await Media.deleteMany({});
    await Page.deleteMany({});
    await Blog.deleteMany({});
    console.log("Collections cleared.");

    // 2. Parse the SQL dump file
    const sqlFilePath = path.join(__dirname, "../../laravel_backup.sql");
    const data = parseSqlDump(sqlFilePath);

    // 3. Look up/Seed roles
    console.log("Checking roles...");
    let roles = await Role.find({});
    if (roles.length === 0) {
      console.log("No roles found in database. Please run the seeder first or seed default roles...");
      // Let's seed roles just in case
      const defaultRoles = [
        { name: "Super Admin", isSystem: true, isSuperAdmin: true },
        { name: "Admin", isSystem: true, isSuperAdmin: false },
        { name: "Editor", isSystem: true, isSuperAdmin: false },
        { name: "Viewer", isSystem: true, isSuperAdmin: false }
      ];
      roles = [];
      for (const r of defaultRoles) {
        const createdRole = await Role.create(r);
        roles.push(createdRole);
      }
      console.log("Default roles seeded.");
    }

    const superAdminRole = roles.find(r => r.isSuperAdmin) || roles.find(r => r.name === "Super Admin");
    const editorRole = roles.find(r => r.name === "Editor") || roles[0];

    // 4. Migrate Categories
    console.log("Migrating Categories...");
    const categoryMap = {}; // sql_id -> mongo_id
    for (const sqlCat of data.blog_categories) {
      let cat = await Category.findOne({ slug: sqlCat.category_slug });
      if (!cat) {
        cat = await Category.create({
          name: (sqlCat.category_name || "").substring(0, 60),
          slug: sqlCat.category_slug,
          description: `Category migrated from Laravel: ${sqlCat.category_name}`.substring(0, 200),
          color: "#3355FF",
          createdAt: sqlCat.created_at ? new Date(sqlCat.created_at) : new Date(),
          updatedAt: sqlCat.updated_at ? new Date(sqlCat.updated_at) : new Date()
        });
        console.log(`  Category created: ${cat.name}`);
      } else {
        console.log(`  Category already exists: ${cat.name}`);
      }
      categoryMap[sqlCat.id] = cat._id;
    }

    // 5. Migrate Users
    console.log("Migrating Users...");
    const userEmailMap = {}; // email -> mongo_id
    for (const sqlUser of data.users) {
      let user = await User.findOne({ email: sqlUser.email });
      if (!user) {
        let assignedRoleId = editorRole._id;
        if (sqlUser.name.toLowerCase() === "admin" || sqlUser.email.toLowerCase().includes("admin")) {
          assignedRoleId = superAdminRole._id;
        }

        // Download and map avatar locally
        const avatarLocalUrl = await downloadAndMapUrl(sqlUser.profile_photo_path);

        const userDoc = {
          name: (sqlUser.name || "").substring(0, 100),
          email: sqlUser.email,
          // Fix PHP bcrypt prefix: $2y$ -> $2b$ so Node.js bcryptjs can verify
          password: sqlUser.password
            ? sqlUser.password.replace(/^\$2y\$/, "$2b$")
            : sqlUser.password,
          role: assignedRoleId,
          // Parse as int — SQL parser returns strings, not numbers
          status: parseInt(sqlUser.status, 10) === 1 ? 'active' : 'suspended',
          about: (sqlUser.about || "").substring(0, 500),
          designation: (sqlUser.role_name || "").substring(0, 100),
          avatarUrl: avatarLocalUrl || '',
          createdAt: sqlUser.created_at ? new Date(sqlUser.created_at) : new Date(),
          updatedAt: sqlUser.updated_at ? new Date(sqlUser.updated_at) : new Date()
        };

        // Insert directly to collection to bypass mongoose password hashing pre-save hook
        const result = await User.collection.insertOne(userDoc);
        userDoc._id = result.insertedId;
        user = userDoc;
        console.log(`  User created: ${user.name} (${user.email})`);
      } else {
        console.log(`  User already exists: ${user.name} (${user.email})`);
      }
      userEmailMap[sqlUser.email.toLowerCase()] = user._id;
    }

    // 6. Migrate Media (Gallaries)
    console.log("Migrating Media/Gallaries...");
    for (const sqlImg of data.gallaries) {
      let media = await Media.findOne({ url: sqlImg.image_url });
      if (!media) {
        // Download and map media locally
        const mediaLocalUrl = await downloadAndMapUrl(sqlImg.image_url);

        const ext = path.extname(sqlImg.image_name).toLowerCase();
        let mimeType = "image/jpeg";
        if (ext === ".png") mimeType = "image/png";
        if (ext === ".gif") mimeType = "image/gif";
        if (ext === ".webp") mimeType = "image/webp";

        media = await Media.create({
          originalName: sqlImg.image_name,
          fileName: path.basename(mediaLocalUrl),
          type: "image",
          mimeType: mimeType,
          size: 0,
          url: mediaLocalUrl,
          uploadedBy: "Admin",
          createdAt: sqlImg.created_at ? new Date(sqlImg.created_at) : new Date(),
          updatedAt: sqlImg.updated_at ? new Date(sqlImg.updated_at) : new Date()
        });
        console.log(`  Media created: ${media.originalName}`);
      }
    }

    // 7. Migrate Pages
    console.log("Migrating Pages...");
    // Retrieve first category from PageCategory or seed general page category
    let pageCat = await PageCategory.findOne({ name: "General" });
    if (!pageCat) {
      pageCat = await PageCategory.create({ name: "General", slug: "general", description: "Uncategorized pages" });
    }

    const defaultAdmin = await User.findOne({ email: "admin@admin.com" }) || await User.findOne({});
    const defaultAuthorId = defaultAdmin ? defaultAdmin._id : null;

    for (const sqlPage of data.pages) {
      let page = await Page.findOne({ slug: sqlPage.page_slug });
      if (!page) {
        page = await Page.create({
          title: (sqlPage.page_name || "").substring(0, 200),
          slug: sqlPage.page_slug,
          content: { sections: [] },
          category: pageCat._id,
          // Parse status as int — SQL parser returns strings, not numbers
          status: parseInt(sqlPage.status, 10) === 1 ? 'published' : 'draft',
          author: defaultAuthorId,
          publishedAt: sqlPage.created_at ? new Date(sqlPage.created_at) : new Date(),
          createdAt: sqlPage.created_at ? new Date(sqlPage.created_at) : new Date(),
          updatedAt: sqlPage.updated_at ? new Date(sqlPage.updated_at) : new Date()
        });
        console.log(`  Page created: ${page.title}`);
      }
    }

    // 8. Migrate Blogs
    console.log("Migrating Blogs...");
    let skippedBlogs = 0;
    let importedBlogs = 0;

    for (const sqlBlog of data.blogs) {
      let blog = await Blog.findOne({ slug: sqlBlog.title_slug });
      if (!blog) {
        // Resolve category reference
        let catId = null;
        if (sqlBlog.category_slug) {
          let cat = await Category.findOne({ slug: sqlBlog.category_slug });
          if (!cat && sqlBlog.category) {
            cat = await Category.create({
              name: (sqlBlog.category || "").substring(0, 60),
              slug: sqlBlog.category_slug,
              color: "#3355FF"
            });
          }
          if (cat) catId = cat._id;
        }

        // Resolve author reference
        let authorId = null;
        if (sqlBlog.author_email) {
          authorId = userEmailMap[sqlBlog.author_email.toLowerCase()];
        }
        if (!authorId && sqlBlog.author) {
          // Find by name in case email mapping failed or author email was blank
          const authUser = await User.findOne({ name: sqlBlog.author });
          if (authUser) authorId = authUser._id;
        }
        if (!authorId) {
          authorId = defaultAuthorId;
        }

        // Parse reading time
        let readingTime = 1;
        if (sqlBlog.read_time) {
          const digits = sqlBlog.read_time.match(/\d+/);
          if (digits) {
            readingTime = parseInt(digits[0], 10);
          }
        }

        // Parse schema markup / additional scripts
        const schemaMarkup = [];
        if (sqlBlog.additional_script) {
          const rawScript = sqlBlog.additional_script.trim();
          const scriptRegex = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
          let match;
          let found = false;
          while ((match = scriptRegex.exec(rawScript)) !== null) {
            const jsonText = match[1].trim();
            if (jsonText) {
              schemaMarkup.push({ type: 'Custom', json: jsonText });
              found = true;
            }
          }
          if (!found && rawScript) {
            schemaMarkup.push({ type: 'Custom', json: rawScript });
          }
        }

        // Parse tags
        const tags = sqlBlog.meta_tags
          ? sqlBlog.meta_tags.split(',').map(t => t.trim()).filter(Boolean)
          : [];

        // Map status
        // Laravel db has status: 1 (published), 0 (draft)
        const statusStr = sqlBlog.status === 1 ? 'published' : 'draft';

        // Download and map featured image
        const featuredImageLocalUrl = await downloadAndMapUrl(sqlBlog.image);

        // Download and replace inline image URLs in description & short_description
        const localContent = await downloadAndReplaceHtmlUrls(sqlBlog.description || "");
        const localExcerpt = await downloadAndReplaceHtmlUrls(sqlBlog.short_description || "");

        blog = await Blog.create({
          title: (sqlBlog.title || "").substring(0, 200),
          slug: sqlBlog.title_slug,
          content: localContent,
          excerpt: localExcerpt.substring(0, 300),
          featuredImage: {
            url: featuredImageLocalUrl || "",
            alt: (sqlBlog.title || "").substring(0, 200)
          },
          category: catId,
          tags: tags,
          seo: {
            metaTitle: (sqlBlog.meta_title || "").substring(0, 70),
            metaDescription: (sqlBlog.meta_description || "").substring(0, 200),
            focusKeyword: (sqlBlog.meta_keyword || "").substring(0, 100)
          },
          schemaMarkup: schemaMarkup,
          status: statusStr,
          author: authorId,
          readingTimeMinutes: readingTime,
          publishedAt: sqlBlog.created_at ? new Date(sqlBlog.created_at) : new Date(),
          createdAt: sqlBlog.created_at ? new Date(sqlBlog.created_at) : new Date(),
          updatedAt: sqlBlog.updated_at ? new Date(sqlBlog.updated_at) : new Date()
        });

        console.log(`  Blog imported: ${blog.title}`);
        importedBlogs++;
      } else {
        console.log(`  Blog already exists (skipped): ${blog.title}`);
        skippedBlogs++;
      }
    }

    console.log("\n=================================");
    console.log("Migration complete!");
    console.log(`Blogs imported: ${importedBlogs}`);
    console.log(`Blogs skipped (already exist): ${skippedBlogs}`);
    console.log("=================================");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
