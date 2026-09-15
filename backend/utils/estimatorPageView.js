const SECTION_TEMPLATE = [
  ["heading", "paragraph", "paragraph_2", "listing"],
  ["heading", "listing"],
  ["heading", "paragraph", "listing", "paragraph_1"],
  ["heading", "paragraph"],
  ["heading", "paragraph", "listing"],
  ["heading", "paragraph"],
  ["heading", "paragraph", "listing"],
];

const SECTION_COUNT = SECTION_TEMPLATE.length;

const trimOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
};

const RICH_FIELDS = new Set(["paragraph", "paragraph_1", "paragraph_2"]);

const isBlankHtml = (html) => {
  if (!/<[a-z][^>]*>/i.test(html)) return false;
  if (/<(img|iframe|video|audio|hr|table)\b/i.test(html)) return false;
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z]+;/gi, "")
    .trim();
  return text === "";
};

const richOrNull = (v) => {
  const t = trimOrNull(v);
  return t === null || isBlankHtml(t) ? null : t;
};

const listingRows = (listing) => {
  if (Array.isArray(listing)) return listing;
  if (listing && typeof listing === "object") {
    return Object.keys(listing)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => listing[k]);
  }
  return [];
};

const buildListing = (listing) => {
  const kept = listingRows(listing)
    .filter((r) => r && typeof r === "object")
    .map((r) => ({ text: trimOrNull(r.text), textarea: trimOrNull(r.textarea) }))
    .filter((r) => r.text !== null || r.textarea !== null);

  if (!kept.length) return undefined;

  const out = {};
  kept.forEach((r, i) => {
    out[String(i + 1)] = r;
  });
  return out;
};

const normalisePageView = (input) => {
  if (input === null || input === undefined || input === "") return null;

  let parsed = input;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  const sections = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed && parsed.page)
    ? parsed.page
    : null;
  if (!sections) return null;

  return {
    page: SECTION_TEMPLATE.map((fields, i) => {
      const raw = sections[i];
      const section = raw && typeof raw === "object" ? raw : {};
      const out = {};

      // Emitted in template order, so the stored JSON reads like the page.
      for (const field of fields) {
        if (field === "listing") {
          const listing = buildListing(section.listing);
          if (listing) out.listing = listing;
        } else {
          out[field] = RICH_FIELDS.has(field)
            ? richOrNull(section[field])
            : trimOrNull(section[field]);
        }
      }

      return out;
    }),
  };
};

const migrateLegacyFaqListing = (input) => {
  let parsed = input;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return input;
    }
  }
  const sections = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed && parsed.page)
    ? parsed.page
    : null;
  if (!sections || sections.length < 7) return parsed;

  const from = sections[5];
  const to = sections[6];
  if (!from || !to || typeof from !== "object" || typeof to !== "object") return parsed;
  if (!listingRows(from.listing).length) return parsed;
  if (listingRows(to.listing).length) return parsed; // already in the right place

  const moved = sections.map((s, i) => {
    if (i === 5) {
      const { listing, ...rest } = s;
      return rest;
    }
    if (i === 6) return { ...s, listing: from.listing };
    return s;
  });

  return { page: moved };
};

module.exports = {
  normalisePageView,
  migrateLegacyFaqListing,
  listingRows,
  trimOrNull,
  SECTION_TEMPLATE,
  SECTION_COUNT,
};
