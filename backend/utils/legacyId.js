const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String },      // collection name, e.g. "estimator_questions"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.LegacyCounter || mongoose.model("LegacyCounter", counterSchema);

/** Reserve the next legacy id for `key`. */
const nextLegacyId = async (key) => {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

/** Reserve `count` consecutive ids and return them as an array. */
const nextLegacyIds = async (key, count) => {
  if (count <= 0) return [];
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: count } },
    { new: true, upsert: true }
  );
  const end = doc.seq;
  return Array.from({ length: count }, (_, i) => end - count + 1 + i);
};

const seedLegacyCounter = async (key, highestExistingId) => {
  await Counter.findByIdAndUpdate(
    key,
    { $max: { seq: highestExistingId || 0 } },
    { upsert: true }
  );
};

const COUNTERS = {
  ESTIMATOR: "estimators",
  QUESTION: "estimator_questions",
  RESULT: "estimator_results",
  SERVICE: "estimator_services",
  RESPONSE: "responses",
  CURRENCY: "currencies",
};

module.exports = { nextLegacyId, nextLegacyIds, seedLegacyCounter, COUNTERS, Counter };
