const Estimator = require("../models/Estimator");
const EstimatorQuestion = require("../models/EstimatorQuestion");
const EstimatorResponse = require("../models/EstimatorResponse");
const EstimatorResult = require("../models/EstimatorResult");
const Currency = require("../models/Currency");
const Setting = require("../models/Setting");
const { calculateEstimate } = require("../utils/estimatorEngine");
const { renderEstimatorEmail } = require("../utils/estimatorMailTemplate");
const { sendTemplate, htmlRows, esc, titleCase } = require("../utils/mailPortal");
const { sendEmail } = require("../utils/mailer");
const { nextLegacyId, COUNTERS } = require("../utils/legacyId");

const byLegacyOrder = (a, b) => {
  const x = a.order === null || a.order === undefined ? "" : String(a.order);
  const y = b.order === null || b.order === undefined ? "" : String(b.order);
  return x === y ? 0 : x < y ? -1 : 1;
};

const liveQuestions = (estimatorId) =>
  EstimatorQuestion.find({ estimator_id: estimatorId, deleted_at: null }).lean();

const getAllEstimators = async (req, res) => {
  try {
    const estimators = await Estimator.find(Estimator.activeFilter()).lean();
    const currencies = await Currency.find().lean();
    const byId = new Map(currencies.map((c) => [c.legacy_id, c]));

    const payload = estimators.map((e) => {
      const currency = byId.get(e.currency);
      return {
        id: e.legacy_id,
        estimator_name: e.estimator_name,
        estimator_slug: e.estimator_slug,
        service_id: JSON.stringify(e.service_id || []),
        base_cost: e.base_cost,
        base_ques: e.base_ques,
        base_details: e.base_details,
        status: e.status,
        isLive: e.isLive,
        short_description: e.short_description,
        // The relation the original meant to load: id, symbol and name only.
        currency: currency
          ? { id: currency.legacy_id, symbol: currency.symbol, name: currency.name }
          : null,
        created_at: e.created_at,
        updated_at: e.updated_at,
        deleted_at: e.deleted_at,
      };
    });

    return res.json(payload);
  } catch (err) {
    // Laravel caught everything and returned 200 with an {error} body.
    return res.json({ error: err.message });
  }
};

/* GET /api/get-all-questions/:id - the endpoint the live calculator uses. */
const getAllQuestions = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const estimator = await Estimator.findOne({ ...Estimator.activeFilter(), legacy_id: id }).lean();
    if (!estimator) return res.json({ error: "Estimator not found" });

    const questions = (await liveQuestions(id)).sort(byLegacyOrder);

    const payload = questions.map((q) => ({
      ques_id: q.legacy_id,
      ques_name: q.ques_name,
      ques_details: q.ques_details,
      type: q.multi_select === "1" ? "multi_select" : "radio",
      mandatory: q.require_single_select,
      // "1" asks the calculator to render a picker with a free-text field
      // instead of the default radio/checkbox list.
      input_field: q.input_field,
      // Kept as bare strings so the calculator that already reads this endpoint
      // keeps working; `answers` carries the per-option detail alongside it.
      options: (q.answers || []).map((a) => a.option),
      answers: (q.answers || []).map((a) => ({
        option: a.option,
        // The open-ended choice ("4+", "40+") the visitor types a value against.
        other: a.other === "1" ? "1" : "0",
      })),
    }));

    return res.json(payload);
  } catch (err) {
    return res.json({ error: err.message });
  }
};

const NEW_ENDPOINT_QUES_DETAILS =
  "<p><ul><li>Environment Setup for 1 Company (legal entity)</li><li>Permissions and Role Setup for up to 10 user profiles</li><li>General Ledger</li><li>Dimensions</li><li>Accounts Payable</li><li>Accounts Receivable</li><li>Inventory</li><li>Fixed Assets</li><li>Bank Reconciliation</li><li>Financial Reporting</li><li>1 Base Income Statement and 1 Base Balance Sheet</li><li>Migration of Data for Chart of Accounts, Customer Master, Vendor Master, Open Balance</li></ul></p>";

const getAllQuestionsNew = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const estimator = await Estimator.findOne({ ...Estimator.activeFilter(), legacy_id: id }).lean();
    if (!estimator) return res.json({ error: "Estimator not found" });

    // No ORDER BY in the original, so this follows primary-key order.
    const questions = (await liveQuestions(id)).sort((a, b) => a.legacy_id - b.legacy_id);

    const payload = questions.map((q) => ({
      ques_id: q.legacy_id,
      ques_title: q.ques_name,
      ques_details: NEW_ENDPOINT_QUES_DETAILS,
      type: q.multi_select === "1" ? "multi_select" : "radio",
      mandatory: q.require_single_select,
      options: ["Yes", "No"],
    }));

    return res.json(payload);
  } catch (err) {
    return res.json({ error: err.message });
  }
};

/* GET /api/public/estimators/page/:slug */
const getEstimatorPage = async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();
    const estimator = await Estimator.findOne({
      ...Estimator.liveFilter(),
      estimator_slug: slug,
    }).lean();
    if (!estimator) return res.status(404).json({ error: "Estimator not found" });

    const [currency, result, questions] = await Promise.all([
      Currency.findOne({ legacy_id: estimator.currency }).lean(),
      EstimatorResult.findOne({ est_id: estimator.legacy_id }).lean(),
      liveQuestions(estimator.legacy_id),
    ]);

    return res.json({
      estimator: {
        id: estimator.legacy_id,
        estimator_name: estimator.estimator_name,
        estimator_slug: estimator.estimator_slug,
        base_ques: estimator.base_ques,
        base_details: estimator.base_details,
        base_cost: estimator.base_cost,
        short_description: estimator.short_description,
        currency: currency
          ? { id: currency.legacy_id, symbol: currency.symbol, name: currency.name }
          : null,
      },
      seo: {
        meta_title: estimator.meta_title,
        meta_keyword: estimator.meta_keyword,
        meta_description: estimator.meta_description,
        meta_tag: estimator.meta_tag,
        meta_image: estimator.meta_image,
        robots: estimator.isindex === 1 ? "index, follow" : "noindex, nofollow",
        isindex: estimator.isindex,
      },
      additional_script: estimator.additional_script,
      page_view: estimator.page_view,
      questions: questions.sort(byLegacyOrder).map((q) => ({
        ques_id: q.legacy_id,
        ques_name: q.ques_name,
        ques_details: q.ques_details,
        type: q.multi_select === "1" ? "multi_select" : "radio",
        mandatory: q.require_single_select,
        input_field: q.input_field,
        options: (q.answers || []).map((a) => a.option),
        answers: (q.answers || []).map((a) => ({
          option: a.option,
          other: a.other === "1" ? "1" : "0",
        })),
      })),
      result: result
        ? {
            intro_heading: result.intro_heading,
            intro_text: result.intro_text,
            pricing_explanation: result.pricing_explanation,
          }
        : null,
    });
  } catch (err) {
    return res.json({ error: err.message });
  }
};

const resolveBcc = async () => {
  const setting = await Setting.findOne({ key: "estimator_bcc" }).lean();
  const raw =
    (setting && setting.value) ||
    process.env.ESTIMATOR_BCC ||
    "nitika.gupta@dynamicssquare.com";
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const sendEstimateEmail = async (responseLegacyId) => {
  const response = await EstimatorResponse.findOne({ legacy_id: responseLegacyId }).lean();
  if (!response) throw new Error("Response not found");

  const estimator = await Estimator.findOne({ legacy_id: response.estimator_id }).lean();
  if (!estimator) throw new Error("Estimator not found");

  const currency = await Currency.findOne({ legacy_id: estimator.currency }).lean();

  const questions = await EstimatorQuestion.find({ estimator_id: response.estimator_id }).lean();

  const { results, sumMin, sumMax } = calculateEstimate(
    response.data,
    questions,
    estimator.base_cost
  );

  const html = renderEstimatorEmail({
    results,
    currency: (currency && currency.symbol) || "",
    baseCost: estimator.base_cost,
    sumMin,
    sumMax,
    name: response.name,
    email: response.email,
    phone: response.phone,
  });

  await sendEmail({
    to: response.email,
    bcc: await resolveBcc(),
    subject: "ERP Pricing Report",
    html,
  });

  try {
    const sym = (currency && currency.symbol) || "";
    const range =
      sumMin === sumMax ? `${sym} ${sumMin}` : `${sym} ${sumMin} - ${sym} ${sumMax}`;

    const rows = results
      .map(
        (item) => `
        <tr>
            <td style='padding:10px;border:1px solid #ddd;'>${esc(item.ques_name ?? "")}</td>
            <td style='padding:10px;border:1px solid #ddd;'>${esc(item.option ?? "")}</td>
        </tr>
    `
      )
      .join("");

    const submitData = `
     <table style='width:100%;border-collapse:collapse;table-layout:fixed;'>
    <colgroup>
        <col style='width:50%;'>
        <col style='width:50%;'>
    </colgroup>
    ${rows}
</table>
   `;

    const common = {
      submitData,
      currencyName: sym,
      baseCost: String(estimator.base_cost ?? "0"),
      sumMin: String(sumMin),
      sumMax: String(sumMax),
      name: titleCase(response.name),
      phone: response.phone || "",
      company: response.company || "",
      customerEmail: response.email,
      estimatorName: estimator.estimator_name || `Estimator ${estimator.legacy_id}`,
      estimateRange: range,
      reference: String(response.legacy_id),
      submittedAt: new Date(response.created_at || response.createdAt || Date.now()).toUTCString(),
    };

    await Promise.all([
      sendTemplate("estimatorInternal", {
        ...common,
        title: `New estimator submission — ${titleCase(response.name)}`,
      }),
      sendTemplate("estimatorCustomer", { ...common, email: response.email }),
    ]);
  } catch (portalErr) {
    console.error("[estimator] mail portal send failed:", portalErr.message);
  }

  return { results, sumMin, sumMax };
};

const submitFormData = async (req, res) => {
  try {
    const data = req.body || {};
    const estimatorId = Number(data.est_id);

    const estimator = await Estimator.findOne({
      ...Estimator.activeFilter(),
      legacy_id: estimatorId,
    }).lean();
    if (!estimator) return res.json({ error: "Estimator not found" });

    const questions = await liveQuestions(estimatorId);

    const snapshot = questions.map((q) => ({
      ques_id: q.legacy_id,
      ques_name: q.ques_name,
      answer: data[String(q.legacy_id)] === undefined ? null : data[String(q.legacy_id)],
    }));

    const legacy_id = await nextLegacyId(COUNTERS.RESPONSE);
    const created = await EstimatorResponse.create({
      legacy_id,
      estimator_id: estimatorId,
      data: snapshot,
      name: data.name,
      email: data.email,
      phone: data.phone,
      // terms_agree was commented out in the original and is left at its default.
    });

    sendEstimateEmail(created.legacy_id).catch((mailErr) => {
      console.error(
        `[estimator] response ${created.legacy_id} saved but the report email failed:`,
        mailErr.message
      );
    });

    return res.json({ error: "Data submitted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* GET /api/trigger/:id - resend the report for a stored response.
   The original returned no body; kept that way. */
const triggerEmail = async (req, res) => {
  try {
    await sendEstimateEmail(Number(req.params.id));
    return res.send("");
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllEstimators,
  getEstimatorPage,
  getAllQuestions,
  getAllQuestionsNew,
  submitFormData,
  triggerEmail,
  sendEstimateEmail,
};
