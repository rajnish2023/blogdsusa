const sanitizeHtml = require("sanitize-html");

const ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "a", "img",
  "table", "thead", "tbody", "tr", "td", "th",
  "code", "pre", "figure", "figcaption",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
  "*": [], 
};

const sanitizeBlogContent = (html = "") =>
  sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { div: "p" },
  }).trim();

module.exports = { sanitizeBlogContent };
