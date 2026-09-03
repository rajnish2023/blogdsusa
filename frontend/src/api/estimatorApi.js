import client from "./client";

export const fetchEstimators = async (params) => {
  const { data } = await client.get("/estimator", { params });
  return data.estimators;
};

export const fetchEstimatorCurrencies = async () => {
  const { data } = await client.get("/estimator/currencies");
  return data.currencies;
};

export const fetchEstimator = async (id) => {
  const { data } = await client.get(`/estimator/${id}`);
  return data;
};

export const createEstimator = async (payload) => {
  const { data } = await client.post("/estimator", payload);
  return data;
};

export const updateEstimator = async (id, payload) => {
  const { data } = await client.put(`/estimator/${id}`, payload);
  return data;
};

export const deleteEstimator = async (id) => {
  const { data } = await client.delete(`/estimator/${id}`);
  return data;
};

export const saveEstimatorQuestions = async (id, payload) => {
  const { data } = await client.put(`/estimator/${id}/questions`, payload);
  return data;
};

export const saveEstimatorResult = async (id, payload) => {
  const { data } = await client.put(`/estimator/${id}/result`, payload);
  return data;
};

export const fetchEstimatorResponses = async (id, params) => {
  const { data } = await client.get(`/estimator/${id}/responses`, { params });
  return data;
};

export const fetchEstimatorResponse = async (responseId) => {
  const { data } = await client.get(`/estimator/responses/${responseId}`);
  return data;
};

export const deleteEstimatorResponse = async (responseId) => {
  const { data } = await client.delete(`/estimator/responses/${responseId}`);
  return data;
};

export const resendEstimatorReport = async (responseId) => {
  const { data } = await client.post(`/estimator/responses/${responseId}/resend`);
  return data;
};
