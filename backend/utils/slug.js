const slugify = require("slugify");
 
const generateUniqueSlug = async (Model, text, excludeId = null) => {
  const base = slugify(text, { lower: true, strict: true }).slice(0, 180) || "post";
  let slug = base;
  let counter = 2;

  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Model.findOne(query);
    if (!exists) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
};

module.exports = { generateUniqueSlug };
