// Runs the instant a paste happens in the Summernote editor, before the
// browser's own paste behavior would otherwise carry over inline styles,
// classes, and Word/Google-Docs junk markup (mso- comments, empty spans,
// font tags, tracking attributes, etc). The backend re-sanitizes on save
// as a second, authoritative pass — this one just keeps the editor clean
// and WYSIWYG-accurate as you type.

const ALLOWED_TAGS = new Set([
  "P", "BR", "HR",
  "H1", "H2", "H3", "H4", "H5", "H6",
  "STRONG", "B", "EM", "I", "U", "S", "SUB", "SUP",
  "UL", "OL", "LI",
  "BLOCKQUOTE", "A", "IMG",
  "TABLE", "THEAD", "TBODY", "TR", "TD", "TH",
  "CODE", "PRE",
]);

const ALLOWED_ATTRS = {
  A: ["href", "title"],
  IMG: ["src", "alt", "title"],
};

function cleanNode(node) {
  // Text nodes are always safe to keep as-is.
  if (node.nodeType === Node.TEXT_NODE) return node;

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName;

  // Strip script/style/meta/link entirely — content and all.
  if (["SCRIPT", "STYLE", "META", "LINK", "IFRAME", "OBJECT", "EMBED"].includes(tag)) {
    return null;
  }

  const children = Array.from(node.childNodes)
    .map(cleanNode)
    .filter(Boolean);

  if (!ALLOWED_TAGS.has(tag)) {
    // Unwrap unknown/formatting-only tags (span, div, font, etc) — keep the
    // children (the actual text/content) but drop the wrapper and its inline styles.
    const frag = document.createDocumentFragment();
    children.forEach((c) => frag.appendChild(c));
    return frag;
  }

  const clean = document.createElement(tag.toLowerCase());
  const allowedAttrs = ALLOWED_ATTRS[tag] || [];
  allowedAttrs.forEach((attr) => {
    const val = node.getAttribute?.(attr);
    if (val && !/^\s*javascript:/i.test(val)) clean.setAttribute(attr, val);
  });
  children.forEach((c) => clean.appendChild(c));
  return clean;
}

export function sanitizePastedHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const wrapper = document.createElement("div");

  Array.from(doc.body.childNodes)
    .map(cleanNode)
    .filter(Boolean)
    .forEach((node) => wrapper.appendChild(node));

  return wrapper.innerHTML;
}
