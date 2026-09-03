const sanitizeHtml = require("sanitize-html");
const { sanitizeBlogContent } = require("./sanitizeContent");

const MAX_SECTIONS = 60;
const MAX_BLOCKS_PER_COLUMN = 40;
const ALLOWED_BLOCK_TYPES = new Set(["heading", "text", "image", "button", "divider", "spacer", "list", "video", "html", "iconbox", "testimonial", "accordion", "socials", "contactform"]);
const ALLOWED_VIDEO_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "player.vimeo.com", "vimeo.com"];
 
const sanitizeHtmlBlock = (html = "") =>
  sanitizeHtml(html, {
    allowedTags: ["div", "span", "p", "br", "hr", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre"],
    allowedAttributes: { a: ["href", "title", "target", "rel"], "*": [] },
    allowedSchemes: ["http", "https", "mailto"],
  }).trim();

const isAllowedVideoUrl = (url = "") => {
  try {
    const parsed = new URL(url);
    return ALLOWED_VIDEO_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
};

const isSafeUrl = (url = "") => {
  if (!url) return true;  
  return /^https?:\/\//.test(url) || url.startsWith("/");
};
 
const stripTags = (str = "") => String(str).replace(/<[^>]*>/g, "").trim();

const sanitizeStyles = (style) => {
  if (!style || typeof style !== "object") return {};
  const res = {};
  if (typeof style.color === "string") res.color = style.color.slice(0, 50);
  if (typeof style.backgroundColor === "string") res.backgroundColor = style.backgroundColor.slice(0, 50);
  if (typeof style.fontSize === "string") res.fontSize = style.fontSize.slice(0, 20);
  if (typeof style.fontWeight === "string") res.fontWeight = style.fontWeight.slice(0, 20);
  if (typeof style.borderRadius === "string") res.borderRadius = style.borderRadius.slice(0, 20);
  if (typeof style.textAlign === "string") res.textAlign = style.textAlign.slice(0, 20);

  if (style.margin && typeof style.margin === "object") {
    res.margin = {
      top: parseInt(style.margin.top, 10) || 0,
      right: parseInt(style.margin.right, 10) || 0,
      bottom: parseInt(style.margin.bottom, 10) || 0,
      left: parseInt(style.margin.left, 10) || 0,
    };
  }
  if (style.padding && typeof style.padding === "object") {
    res.padding = {
      top: parseInt(style.padding.top, 10) || 0,
      right: parseInt(style.padding.right, 10) || 0,
      bottom: parseInt(style.padding.bottom, 10) || 0,
      left: parseInt(style.padding.left, 10) || 0,
    };
  }
  return res;
};

 
const sanitizeBlock = (block) => {
  if (!block || typeof block !== "object" || !ALLOWED_BLOCK_TYPES.has(block.type)) return null;
  const id = typeof block.id === "string" ? block.id.slice(0, 60) : `block_${Math.random().toString(36).slice(2, 10)}`;
  const props = block.props && typeof block.props === "object" ? block.props : {};
  const style = sanitizeStyles(block.style);

  let sanitizedProps = {};

  switch (block.type) {
    case "heading":
      sanitizedProps = {
        text: stripTags(props.text).slice(0, 300),
        level: ["h1", "h2", "h3", "h4"].includes(props.level) ? props.level : "h2",
        align: ["left", "center", "right"].includes(props.align) ? props.align : "left",
      };
      break;
    case "text":
      sanitizedProps = { html: sanitizeBlogContent(String(props.html || "")).slice(0, 20000) };
      break;
    case "image":
      sanitizedProps = {
        url: isSafeUrl(props.url) ? String(props.url || "").slice(0, 2000) : "",
        alt: stripTags(props.alt).slice(0, 250),
        link: isSafeUrl(props.link) ? String(props.link || "").slice(0, 2000) : "",
        align: ["left", "center", "right"].includes(props.align) ? props.align : "center",
      };
      break;
    case "button":
      sanitizedProps = {
        text: stripTags(props.text || "Click here").slice(0, 100),
        url: isSafeUrl(props.url) ? String(props.url || "#").slice(0, 2000) : "#",
        style: ["primary", "secondary"].includes(props.style) ? props.style : "primary",
        align: ["left", "center", "right"].includes(props.align) ? props.align : "left",
      };
      break;
    case "divider":
      sanitizedProps = { style: ["solid", "dashed"].includes(props.style) ? props.style : "solid" };
      break;
    case "spacer":
      sanitizedProps = { height: ["sm", "md", "lg"].includes(props.height) ? props.height : "md" };
      break;
    case "list":
      sanitizedProps = {
        items: Array.isArray(props.items) ? props.items.slice(0, 30).map((i) => stripTags(i).slice(0, 300)) : [],
        ordered: !!props.ordered,
      };
      break;
    case "video":
      sanitizedProps = { url: isAllowedVideoUrl(props.url) ? props.url : "", caption: stripTags(props.caption).slice(0, 200) };
      break;
    case "html":
      sanitizedProps = { code: sanitizeHtmlBlock(String(props.code || "")).slice(0, 20000) };
      break;
    case "iconbox":
      sanitizedProps = {
        icon: stripTags(props.icon || "HelpCircle").slice(0, 100),
        title: stripTags(props.title || "").slice(0, 300),
        description: stripTags(props.description || "").slice(0, 1000),
        link: isSafeUrl(props.link) ? String(props.link || "").slice(0, 2000) : "",
        align: ["left", "center", "right"].includes(props.align) ? props.align : "center",
      };
      break;
    case "testimonial":
      sanitizedProps = {
        quote: stripTags(props.quote || "").slice(0, 2000),
        name: stripTags(props.name || "").slice(0, 200),
        designation: stripTags(props.designation || "").slice(0, 200),
        avatar: isSafeUrl(props.avatar) ? String(props.avatar || "").slice(0, 2000) : "",
      };
      break;
    case "accordion":
      sanitizedProps = {
        items: Array.isArray(props.items) ? props.items.slice(0, 50).map(item => ({
          title: stripTags(item.title || "").slice(0, 300),
          content: sanitizeBlogContent(String(item.content || "")).slice(0, 10000),
        })) : [],
      };
      break;
    case "socials":
      sanitizedProps = {
        align: ["left", "center", "right"].includes(props.align) ? props.align : "center",
        items: Array.isArray(props.items) ? props.items.slice(0, 20).map(item => ({
          platform: stripTags(item.platform || "globe").slice(0, 50),
          url: isSafeUrl(item.url) ? String(item.url || "#").slice(0, 2000) : "#",
        })) : [],
      };
      break;
    case "contactform":
      sanitizedProps = {
        heading: stripTags(props.heading || "").slice(0, 300),
        subtitle: stripTags(props.subtitle || "").slice(0, 500),
        buttonText: stripTags(props.buttonText || "").slice(0, 100),
        buttonColor: typeof props.buttonColor === "string" ? props.buttonColor.slice(0, 50) : "#dc2626",
        fields: Array.isArray(props.fields) ? props.fields.slice(0, 10).map((f) => stripTags(f).slice(0, 50)) : [],
        serviceOptions: Array.isArray(props.serviceOptions) ? props.serviceOptions.slice(0, 30).map((o) => stripTags(o).slice(0, 200)) : [],
        source: stripTags(props.source || "").slice(0, 250),
        customEndpoint: isSafeUrl(props.customEndpoint) ? String(props.customEndpoint || "").slice(0, 2000) : "",
      };
      break;
    default:
      return null;
  }

  return { id, type: block.type, props: sanitizedProps, style };
};

const sanitizeSection = (section) => {
  if (!section || typeof section !== "object") return null;
  const columns = [1, 2, 3, 4, 5, 6].includes(section.columns) ? section.columns : 1;
  const rawColumnBlocks = Array.isArray(section.columnBlocks) ? section.columnBlocks : [];

  const columnBlocks = Array.from({ length: columns }, (_, i) => {
    const col = Array.isArray(rawColumnBlocks[i]) ? rawColumnBlocks[i] : [];
    return col.slice(0, MAX_BLOCKS_PER_COLUMN).map(sanitizeBlock).filter(Boolean);
  });

  return {
    id: typeof section.id === "string" ? section.id.slice(0, 60) : `section_${Math.random().toString(36).slice(2, 10)}`,
    columns,
    background: typeof section.background === "string" ? section.background.slice(0, 1000) : "",
    paddingY: ["compact", "normal", "spacious", "custom"].includes(section.paddingY) ? section.paddingY : "normal",
    style: sanitizeStyles(section.style),
    columnStyles: Array.isArray(section.columnStyles) ? section.columnStyles.map(sanitizeStyles) : [],
    columnBlocks,
  };
};
 
const sanitizePageContent = (content) => {
  const sections = Array.isArray(content?.sections) ? content.sections : [];
  return { sections: sections.slice(0, MAX_SECTIONS).map(sanitizeSection).filter(Boolean) };
};
 
const extractTextFromContent = (content) => {
  const sections = Array.isArray(content?.sections) ? content.sections : [];
  const parts = [];
  for (const section of sections) {
    for (const col of section.columnBlocks || []) {
      for (const block of col) {
        if (block.type === "heading") parts.push(block.props.text);
        else if (block.type === "text") parts.push(block.props.html.replace(/<[^>]*>/g, " "));
        else if (block.type === "button") parts.push(block.props.text);
        else if (block.type === "list") parts.push(block.props.items.join(" "));
        else if (block.type === "image") parts.push(block.props.alt);
      }
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
};

module.exports = { sanitizePageContent, extractTextFromContent };
