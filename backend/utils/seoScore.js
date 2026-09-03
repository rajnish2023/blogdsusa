 

const stripHtml = (html = "") => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const countOccurrences = (haystack, needle) => {
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = haystack.toLowerCase().match(new RegExp(escaped, "gi"));
  return matches ? matches.length : 0;
};

const calculateSeoScore = ({ title = "", content = "", metaDescription = "", slug = "", focusKeyword = "" }) => {
  const keyword = focusKeyword.trim().toLowerCase();
  const plainText = stripHtml(content);
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const checks = [];

  if (!keyword) {
    return {
      score: 0,
      grade: "No focus keyword",
      wordCount,
      checks: [{ label: "Focus keyword", passed: false, message: "Add a focus keyword to get an SEO score" }],
    };
  }

  const push = (label, passed, points, message) => {
    checks.push({ label, passed, points: passed ? points : 0, maxPoints: points, message });
    return passed ? points : 0;
  };

  let score = 0;

  score += push("Keyword in title", title.toLowerCase().includes(keyword), 15, title.toLowerCase().includes(keyword) ? "Great — the keyword appears in your title" : "Add the focus keyword to your title");

  score += push("Keyword in slug", slug.toLowerCase().includes(keyword.replace(/\s+/g, "-")), 10, slug.toLowerCase().includes(keyword.replace(/\s+/g, "-")) ? "The keyword appears in the URL slug" : "Include the keyword in the URL slug");

  const metaHas = metaDescription.toLowerCase().includes(keyword);
  score += push("Keyword in meta description", metaHas, 15, metaHas ? "The meta description includes the keyword" : "Mention the keyword in the meta description");

  const firstChunk = plainText.slice(0, Math.max(150, Math.floor(plainText.length * 0.15))).toLowerCase();
  const inIntro = firstChunk.includes(keyword);
  score += push("Keyword in introduction", inIntro, 10, inIntro ? "The keyword appears early in the content" : "Mention the keyword in the first paragraph");

  const density = wordCount ? (countOccurrences(plainText, keyword) / wordCount) * 100 : 0;
  const densityGood = density >= 0.5 && density <= 2.5;
  const densityPresent = density > 0;
  const densityPoints = densityGood ? 20 : densityPresent ? 10 : 0;
  checks.push({
    label: "Keyword density",
    passed: densityGood,
    points: densityPoints,
    maxPoints: 20,
    message: densityGood
      ? `Good density (${density.toFixed(1)}%)`
      : densityPresent
      ? `Density is ${density.toFixed(1)}% — aim for 0.5–2.5%`
      : "The keyword doesn't appear in the content body",
  });
  score += densityPoints;

  const lengthPoints = wordCount >= 600 ? 15 : wordCount >= 300 ? 8 : 0;
  checks.push({
    label: "Content length",
    passed: wordCount >= 300,
    points: lengthPoints,
    maxPoints: 15,
    message: wordCount >= 600 ? `${wordCount} words — comprehensive length` : wordCount >= 300 ? `${wordCount} words — acceptable, 600+ is stronger` : `Only ${wordCount} words — aim for at least 300`,
  });
  score += lengthPoints;

  const metaLen = metaDescription.length;
  const metaLenGood = metaLen >= 120 && metaLen <= 160;
  score += push("Meta description length", metaLenGood, 10, metaLenGood ? `${metaLen} characters — good length` : `${metaLen} characters — aim for 120–160`);

  const titleLen = title.length;
  const titleLenGood = titleLen >= 40 && titleLen <= 60;
  score += push("Title length", titleLenGood, 5, titleLenGood ? `${titleLen} characters — good length` : `${titleLen} characters — aim for 40–60`);

  const rounded = Math.round(score);
  const grade = rounded >= 90 ? "Excellent" : rounded >= 70 ? "Good" : rounded >= 50 ? "Fair" : "Needs work";

  return { score: rounded, grade, wordCount, checks };
};

module.exports = { calculateSeoScore };
