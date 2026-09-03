const Estimator = require("../models/Estimator");
const EstimatorQuestion = require("../models/EstimatorQuestion");
const EstimatorResult = require("../models/EstimatorResult");
const EstimatorService = require("../models/EstimatorService");
const EstimatorResponse = require("../models/EstimatorResponse");
const Currency = require("../models/Currency");
const { calculateEstimate } = require("../utils/estimatorEngine");
const { sendEstimateEmail } = require("./publicEstimatorController");
const { nextLegacyId, nextLegacyIds, COUNTERS } = require("../utils/legacyId");

const flag = (v, fallback = "0") => (String(v) === "1" || v === true ? "1" : v === undefined || v === null ? fallback : "0");

const normaliseAnswers = (answers) =>
  (Array.isArray(answers) ? answers : [])
    .filter((a) => a && typeof a === "object")
    .map((a) => ({
      option: a.option === null || a.option === undefined ? "" : String(a.option),
      type: a.type || "range",
      min: a.min === null || a.min === undefined || a.min === "" ? null : String(a.min),
      max: a.max === null || a.max === undefined || a.max === "" ? null : String(a.max),
      cost: a.cost === null || a.cost === undefined || a.cost === "" ? null : String(a.cost),
      percentage:
        a.percentage === null || a.percentage === undefined || a.percentage === ""
          ? null
          : String(a.percentage),
    }));

const serviceNamesFor = async (estimator) => {
  if (!estimator.service_id?.length) return [];
  const services = await EstimatorService.find({ legacy_id: { $in: estimator.service_id } }).lean();
  const order = new Map(estimator.service_id.map((id, i) => [id, i]));
  return services.sort((a, b) => order.get(a.legacy_id) - order.get(b.legacy_id));
};

/* ------------------------------------------------------------ estimators -- */

/** GET /api/estimator - the list screen, with live response counts. */
const listEstimators = async (req, res) => {
  const includeDeleted = req.query.includeDeleted === "true";
  const filter = includeDeleted ? {} : { deleted_at: null };

  const estimators = await Estimator.find(filter).sort({ legacy_id: 1 }).lean();
  const currencies = await Currency.find().lean();
  const byCurrency = new Map(
    currencies.map((c) => [c.legacy_id, { id: c.legacy_id, name: c.name, symbol: c.symbol }])
  );

  const ids = estimators.map((e) => e.legacy_id);

  // One grouped count instead of a query per row.
  const counts = await EstimatorResponse.aggregate([
    { $match: { estimator_id: { $in: ids }, deleted_at: null } },
    { $group: { _id: "$estimator_id", count: { $sum: 1 } } },
  ]);
  const countBy = new Map(counts.map((c) => [c._id, c.count]));

  const questionCounts = await EstimatorQuestion.aggregate([
    { $match: { estimator_id: { $in: ids }, deleted_at: null } },
    { $group: { _id: "$estimator_id", count: { $sum: 1 } } },
  ]);
  const questionCountBy = new Map(questionCounts.map((c) => [c._id, c.count]));

  res.json({
    estimators: estimators.map((e) => ({
      id: e.legacy_id,
      estimator_name: e.estimator_name,
      base_cost: e.base_cost,
      status: e.status,
      currency: byCurrency.get(e.currency) || null,
      currency_id: e.currency,
      service_id: e.service_id,
      responseCount: countBy.get(e.legacy_id) || 0,
      questionCount: questionCountBy.get(e.legacy_id) || 0,
      created_at: e.created_at,
      updated_at: e.updated_at,
      deleted_at: e.deleted_at,
    })),
  });
};

/** GET /api/estimator/currencies - for the create form's dropdown. */
const listCurrencies = async (req, res) => {
  const currencies = await Currency.find({ status: "1" }).sort({ legacy_id: 1 }).lean();
  res.json({
    currencies: currencies.map((c) => ({ id: c.legacy_id, name: c.name, symbol: c.symbol })),
  });
};

/** GET /api/estimator/:id - everything the editor needs in one payload. */
const getEstimator = async (req, res) => {
  const id = Number(req.params.id);
  const estimator = await Estimator.findOne({ legacy_id: id }).lean();
  if (!estimator) return res.status(404).json({ message: "Estimator not found" });

  const [questions, result, services, currency] = await Promise.all([
    EstimatorQuestion.find({ estimator_id: id, deleted_at: null }).lean(),
    EstimatorResult.findOne({ est_id: id }).lean(),
    serviceNamesFor(estimator),
    Currency.findOne({ legacy_id: estimator.currency }).lean(),
  ]);

  // Same varchar ordering the public API uses, so the admin previews the real order.
  questions.sort((a, b) => {
    const x = String(a.order ?? "");
    const y = String(b.order ?? "");
    return x === y ? 0 : x < y ? -1 : 1;
  });

  res.json({
    estimator: {
      id: estimator.legacy_id,
      estimator_name: estimator.estimator_name,
      base_cost: estimator.base_cost,
      base_ques: estimator.base_ques,
      base_details: estimator.base_details,
      status: estimator.status,
      currency_id: estimator.currency,
      currency: currency ? { id: currency.legacy_id, name: currency.name, symbol: currency.symbol } : null,
      service_id: estimator.service_id,
      deleted_at: estimator.deleted_at,
    },
    services: services.map((s) => ({ id: s.legacy_id, service_name: s.service_name })),
    questions: questions.map((q) => ({
      ques_id: q.legacy_id,
      ques_name: q.ques_name,
      ques_details: q.ques_details,
      answers: q.answers,
      multi_select: q.multi_select,
      require_single_select: q.require_single_select,
      order: q.order,
    })),
    result: result
      ? {
          intro_heading: result.intro_heading,
          intro_text: result.intro_text,
          pricing_explanation: result.pricing_explanation,
        }
      : null,
  });
};

/** POST /api/estimator - create, optionally with its services in one go. */
const createEstimator = async (req, res) => {
  const { estimator_name, currency, base_cost, status, service_names } = req.body || {};
  if (!estimator_name || !String(estimator_name).trim()) {
    return res.status(400).json({ message: "An estimator name is required" });
  }
  if (currency === undefined || currency === null || currency === "") {
    return res.status(400).json({ message: "A currency is required" });
  }

  const names = (Array.isArray(service_names) ? service_names : [])
    .map((n) => String(n).trim())
    .filter(Boolean);

  const serviceIds = await nextLegacyIds(COUNTERS.SERVICE, names.length);
  if (names.length) {
    await EstimatorService.insertMany(
      names.map((service_name, i) => ({ legacy_id: serviceIds[i], service_name, status: "1" }))
    );
  }

  const legacy_id = await nextLegacyId(COUNTERS.ESTIMATOR);
  const estimator = await Estimator.create({
    legacy_id,
    estimator_name: String(estimator_name).trim(),
    currency: Number(currency),
    base_cost: base_cost === undefined || base_cost === null ? "0" : String(base_cost),
    status: flag(status, "1"),
    service_id: serviceIds,
  });

  res.status(201).json({ id: estimator.legacy_id });
};

/** PUT /api/estimator/:id */
const updateEstimator = async (req, res) => {
  const id = Number(req.params.id);
  const { estimator_name, currency, base_cost, status, base_ques, base_details } = req.body || {};

  const update = {};
  if (estimator_name !== undefined) update.estimator_name = String(estimator_name).trim();
  if (currency !== undefined && currency !== null && currency !== "") update.currency = Number(currency);
  if (base_cost !== undefined) update.base_cost = String(base_cost);
  if (status !== undefined) update.status = flag(status, "1");
  if (base_ques !== undefined) update.base_ques = base_ques;
  if (base_details !== undefined) update.base_details = base_details;

  const estimator = await Estimator.findOneAndUpdate({ legacy_id: id }, update, { new: true });
  if (!estimator) return res.status(404).json({ message: "Estimator not found" });

  res.json({ id: estimator.legacy_id });
};

const deleteEstimator = async (req, res) => {
  const id = Number(req.params.id);
  const now = new Date();

  const estimator = await Estimator.findOneAndUpdate({ legacy_id: id }, { deleted_at: now });
  if (!estimator) return res.status(404).json({ message: "Estimator not found" });

  await EstimatorQuestion.updateMany({ estimator_id: id, deleted_at: null }, { deleted_at: now });
  await EstimatorResponse.updateMany({ estimator_id: id, deleted_at: null }, { deleted_at: now });

  res.json({ message: "Estimator deleted" });
};

/* ------------------------------------------------------------- questions -- */

const saveQuestions = async (req, res) => {
  const id = Number(req.params.id);
  const estimator = await Estimator.findOne({ legacy_id: id });
  if (!estimator) return res.status(404).json({ message: "Estimator not found" });

  const incoming = Array.isArray(req.body?.questions) ? req.body.questions : [];

  if (req.body?.base_cost !== undefined) {
    estimator.base_cost = String(req.body.base_cost);
    await estimator.save();
  }

  const existing = await EstimatorQuestion.find({ estimator_id: id, deleted_at: null }).lean();
  const existingIds = existing.map((q) => q.legacy_id);
  const keptIds = incoming.map((q) => Number(q.ques_id)).filter((n) => n && !Number.isNaN(n));
  const toDelete = existingIds.filter((qid) => !keptIds.includes(qid));

  if (toDelete.length) {
    await EstimatorQuestion.updateMany({ legacy_id: { $in: toDelete } }, { deleted_at: new Date() });
  }

  const newCount = incoming.filter((q) => !q.ques_id).length;
  const freshIds = await nextLegacyIds(COUNTERS.QUESTION, newCount);
  let freshIdx = 0;

  const saved = [];
  for (let i = 0; i < incoming.length; i++) {
    const q = incoming[i];
    const payload = {
      estimator_id: id,
      ques_name: String(q.ques_name || "").trim(),
      ques_details: q.ques_details ?? null,
      answers: normaliseAnswers(q.answers),
      multi_select: flag(q.multi_select),
      require_single_select: flag(q.require_single_select),
      priority: 1,
      // Position in the submitted array is the source of truth for order.
      order: String(q.order ?? i + 1),
      deleted_at: null,
    };

    if (q.ques_id) {
      await EstimatorQuestion.updateOne({ legacy_id: Number(q.ques_id) }, payload);
      saved.push(Number(q.ques_id));
    } else {
      const legacy_id = freshIds[freshIdx++];
      await EstimatorQuestion.create({ legacy_id, ...payload });
      saved.push(legacy_id);
    }
  }

  res.json({ questionIds: saved, deleted: toDelete.length });
};

/* ---------------------------------------------------------- result page -- */

/** PUT /api/estimator/:id/result - upsert the post-submission copy. */
const saveResult = async (req, res) => {
  const id = Number(req.params.id);
  const estimator = await Estimator.findOne({ legacy_id: id }).lean();
  if (!estimator) return res.status(404).json({ message: "Estimator not found" });

  const { intro_heading, intro_text, pricing_explanation } = req.body || {};

  const existing = await EstimatorResult.findOne({ est_id: id });
  if (existing) {
    existing.intro_heading = intro_heading ?? existing.intro_heading;
    existing.intro_text = intro_text ?? existing.intro_text;
    existing.pricing_explanation = pricing_explanation ?? existing.pricing_explanation;
    await existing.save();
  } else {
    const legacy_id = await nextLegacyId(COUNTERS.RESULT);
    await EstimatorResult.create({
      legacy_id,
      est_id: id,
      intro_heading: intro_heading || "",
      intro_text: intro_text || "",
      pricing_explanation: pricing_explanation || "",
    });
  }

  res.json({ message: "Result page saved" });
};

/* ------------------------------------------------------------- responses -- */

/** GET /api/estimator/:id/responses - paginated submissions for one estimator. */
const listResponses = async (req, res) => {
  const id = Number(req.params.id);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const search = (req.query.search || "").trim();

  const filter = { estimator_id: id, deleted_at: null };
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [items, total] = await Promise.all([
    EstimatorResponse.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EstimatorResponse.countDocuments(filter),
  ]);

  res.json({
    responses: items.map((r) => ({
      id: r.legacy_id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      answered: (r.data || []).filter((d) => d.answer !== null && d.answer !== undefined).length,
      created_at: r.created_at,
    })),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
};

const getResponse = async (req, res) => {
  const responseId = Number(req.params.responseId);
  const response = await EstimatorResponse.findOne({ legacy_id: responseId }).lean();
  if (!response) return res.status(404).json({ message: "Response not found" });

  const estimator = await Estimator.findOne({ legacy_id: response.estimator_id }).lean();
  if (!estimator) return res.status(404).json({ message: "Estimator not found" });

  const [currency, questions] = await Promise.all([
    Currency.findOne({ legacy_id: estimator.currency }).lean(),
    EstimatorQuestion.find({ estimator_id: response.estimator_id }).lean(),
  ]);

  const { results, sumMin, sumMax } = calculateEstimate(response.data, questions, estimator.base_cost);

  res.json({
    response: {
      id: response.legacy_id,
      name: response.name,
      email: response.email,
      phone: response.phone,
      created_at: response.created_at,
      answers: response.data,
    },
    estimator: { id: estimator.legacy_id, estimator_name: estimator.estimator_name },
    currency: currency ? currency.symbol : "",
    baseCost: estimator.base_cost,
    results,
    sumMin,
    sumMax,
  });
};

/** DELETE /api/estimator/responses/:responseId - soft delete. */
const deleteResponse = async (req, res) => {
  const responseId = Number(req.params.responseId);
  const updated = await EstimatorResponse.findOneAndUpdate(
    { legacy_id: responseId },
    { deleted_at: new Date() }
  );
  if (!updated) return res.status(404).json({ message: "Response not found" });
  res.json({ message: "Response deleted" });
};

/** POST /api/estimator/responses/:responseId/resend - re-send the report email. */
const resendResponseEmail = async (req, res) => {
  try {
    await sendEstimateEmail(Number(req.params.responseId));
    res.json({ message: "Report email sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listEstimators,
  listCurrencies,
  getEstimator,
  createEstimator,
  updateEstimator,
  deleteEstimator,
  saveQuestions,
  saveResult,
  listResponses,
  getResponse,
  deleteResponse,
  resendResponseEmail,
};
