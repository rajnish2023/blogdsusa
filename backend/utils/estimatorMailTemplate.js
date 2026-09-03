const { phpNotNull, phpCompare } = require("./estimatorEngine");

const { head, row, tail } = require("./estimatorMailTemplate.json");

/** Blade's {{ }} escapes with htmlspecialchars(ENT_QUOTES). */
const e = (v) => {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/* Which number to print for a priced row.
 *
 * Driven by the option's own `type`, which is what the admin picks in the
 * "Pricing" dropdown when building the question — so a "Fixed cost" of 2500
 * prints as 2500.
 *
 * Laravel instead tested `percentage != null` first, and because every live
 * option stores the STRING "0" in `percentage` (and "0" is not loosely equal
 * to null in PHP) that branch always won — printing 0 against every line while
 * the total stayed correct. `type` is unambiguous, so it is used instead. */
const renderItemValue = (item, currency) => {
  const cur = e(currency);

  if (item.type === "percentage") return `${cur} ${e(item.percentage)}`;

  if (item.type === "range") {
    return `${cur} ${e(item.min)} - ${cur} ${e(item.max)}`;
  }

  // Negative costs are floored at zero rather than shown as a discount.
  const cost = phpCompare(item.cost, 0) < 0 ? 0 : item.cost;
  return `${cur} ${e(cost)}</strong>`;
};

const renderTotal = (sumMin, sumMax, currency) =>
  sumMin === sumMax
    ? `<strong>${e(currency)} ${e(sumMin)}</strong>`
    : `<strong>${e(currency)} ${e(sumMin)} -\n${e(currency)} ${e(sumMax)}</strong>`;

const renderEstimatorEmail = ({ results = [], currency = "", baseCost = "0", sumMin = 0, sumMax = 0, name = "", email = "", phone = "" }) => {
  const rows = results
    .map((item) =>
      row
        .replace("__OPTION__", e(item.option))
        .replace("__QUES_NAME__", e(item.ques_name))
        .replace("__ITEM_VALUE__", renderItemValue(item, currency))
    )
    .join("\n");

  return (
    head.replace("__BASE_COST__", `${e(currency)} ${e(baseCost)}`) +
    "\n" +
    rows +
    "\n" +
    tail
      .replace("__TOTAL__", renderTotal(sumMin, sumMax, currency))
      .replace("__NAME__", e(name))
      .replace("__EMAIL__", e(email))
      .replace("__PHONE__", e(phone))
  );
};

module.exports = { renderEstimatorEmail };
