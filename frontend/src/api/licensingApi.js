import axios from "axios";
import client from "./client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const fetchLicensingCatalog = async (unlockToken) => {
  const { data } = await axios.get(`${API_URL}/public/licensing/catalog`, {
    headers: unlockToken ? { "x-unlock-token": unlockToken } : {},
  });
  return data;
};

// Optional: server-side pricing. The card previews locally; this is here for
// parity checks or if you'd rather not mirror the engine in the browser.
export const calculateLicensing = async (payload, unlockToken) => {
  const { data } = await axios.post(`${API_URL}/public/licensing/calculate`, payload, {
    headers: unlockToken ? { "x-unlock-token": unlockToken } : {},
  });
  return data;
};

export const submitLicensingLead = async (payload) => {
  const { data } = await axios.post(`${API_URL}/public/licensing/lead`, payload);
  return data;
};

export const fetchLicensingLeads = async (params) => {
  const { data } = await client.get("/licensing/leads", { params });
  return data;
};

export const fetchLicensingStats = async () => {
  const { data } = await client.get("/licensing/leads/stats");
  return data;
};

export const fetchLicensingLead = async (id) => {
  const { data } = await client.get(`/licensing/leads/${id}`);
  return data.lead;
};

export const updateLicensingLead = async (id, payload) => {
  const { data } = await client.patch(`/licensing/leads/${id}`, payload);
  return data.lead;
};

export const deleteLicensingLead = async (id) => {
  const { data } = await client.delete(`/licensing/leads/${id}`);
  return data;
};

/* ---- capability catalogue: the rows, labels and rules on the rate card ---- */

export const fetchCapabilities = async () => {
  const { data } = await client.get("/licensing/capabilities");
  return data;
};

export const createCapability = async (payload) => {
  const { data } = await client.post("/licensing/capabilities", payload);
  return data.capability;
};

export const updateCapability = async (id, payload) => {
  const { data } = await client.put(`/licensing/capabilities/${id}`, payload);
  return data.capability;
};

export const deleteCapability = async (id, force = false) => {
  const { data } = await client.delete(`/licensing/capabilities/${id}`, { params: force ? { force: true } : {} });
  return data;
};

export const reorderCapabilities = async (order) => {
  const { data } = await client.put("/licensing/capabilities/reorder", { order });
  return data;
};

export const createLicensingGroup = async (payload) => {
  const { data } = await client.post("/licensing/groups", payload);
  return data.group;
};

export const updateLicensingGroup = async (id, payload) => {
  const { data } = await client.put(`/licensing/groups/${id}`, payload);
  return data;
};

export const deleteLicensingGroup = async (id) => {
  const { data } = await client.delete(`/licensing/groups/${id}`);
  return data;
};

export const fetchLicensingContent = async () => {
  const { data } = await client.get("/licensing/content");
  return data;
};

export const updateLicensingContent = async (content) => {
  const { data } = await client.put("/licensing/content", { content });
  return data.content;
};

export const resetLicensingContent = async () => {
  const { data } = await client.post("/licensing/content/reset");
  return data.content;
};

export const fetchLicensingPricing = async () => {
  const { data } = await client.get("/licensing/pricing");
  return data;
};

export const updateLicensingPricing = async (currency, payload) => {
  const { data } = await client.put(`/licensing/pricing/${currency}`, payload);
  return data.pricing;
};

export const resetLicensingPricing = async (currency) => {
  const { data } = await client.post(`/licensing/pricing/${currency}/reset`);
  return data.pricing;
};
