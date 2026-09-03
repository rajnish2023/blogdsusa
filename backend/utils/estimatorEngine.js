/** PHP's `(float)` cast: leading numeric prefix, anything else is 0. */
const phpNum = (v) => {
  if (v === null || v === undefined || v === false || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const m = String(v).trim().match(/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/);
  return m ? parseFloat(m[0]) : 0;
};

const phpNotNull = (v) => {
  if (v === null || v === undefined) return false;
  if (v === false || v === "") return false;
  if (typeof v === "number") return v !== 0;
  if (Array.isArray(v)) return v.length > 0;
  return true; // includes the string "0"
};

const isNumericString = (v) =>
  typeof v === "number" ||
  (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v.trim())));

/** PHP's comparison rules for two scalars: numeric when both sides look
 *  numeric, plain string comparison otherwise. Returns <0, 0 or >0. */
const phpCompare = (a, b) => {
  if (isNumericString(a) && isNumericString(b)) {
    const na = Number(String(a).trim());
    const nb = Number(String(b).trim());
    return na === nb ? 0 : na < nb ? -1 : 1;
  }
  const sa = a === null || a === undefined ? "" : String(a);
  const sb = b === null || b === undefined ? "" : String(b);
  return sa === sb ? 0 : sa < sb ? -1 : 1;
};

// PHP's min()/max() return the original operand, preserving its string form.
const phpMin = (a, b) => (phpCompare(b, a) < 0 ? b : a);
const phpMax = (a, b) => (phpCompare(b, a) > 0 ? b : a);

const sumBy = (rows, key) => rows.reduce((acc, r) => acc + phpNum(r[key]), 0);

const calculateEstimate = (answeredQuestions = [], questions = [], baseCost = "0") => {
  const chosen = Array.isArray(answeredQuestions) ? answeredQuestions : [];
  const matched = [];

  for (const question of questions) {
    for (const answered of chosen) {
      // Loose == in PHP; the ids are numbers on both sides after the import.
      if (Number(answered.ques_id) !== Number(question.legacy_id)) continue;

      const options = Array.isArray(question.answers) ? question.answers : [];
      // A multi-select arrives as an array, a radio as a bare string.
      const picked = Array.isArray(answered.answer) ? answered.answer : [answered.answer];

      for (const option of options) {
        for (const value of picked) {
          if (value !== option.option) continue;
          matched.push({
            ques_name:  question.ques_name,
            ques_id:    answered.ques_id,
            option:     option.option,
            // Carried through so the quote can print the number the admin
            // actually configured, rather than guessing from the values.
            type:       option.type || "cost",
            min:        option.min,
            max:        option.max,
            cost:       option.cost,
            percentage: option.percentage,
          });
        }
      }
    }
  }

  const merged = new Map();
  for (const row of matched) {
    const key = String(row.ques_id);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row });
    } else {
      existing.option += ", " + row.option;
      existing.min = phpMin(existing.min, row.min);
      existing.max = phpMax(existing.max, row.max);
    }
  }

  const results = Array.from(merged.values());

  const flat = sumBy(results, "cost") + sumBy(results, "percentage") + phpNum(baseCost);
  const sumMin = sumBy(results, "min") + flat;
  const sumMax = sumBy(results, "max") + flat;

  return { results, sumMin, sumMax };
};

module.exports = { calculateEstimate, phpNotNull, phpCompare };
