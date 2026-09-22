import axios from "axios";
import client from "./client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ---- public: the assessment itself ---- */

export const fetchMigrationCatalog = async () => {
  const { data } = await axios.get(`${API_URL}/public/migration/catalog`);
  return data;
};

export const assessMigration = async (payload) => {
  const { data } = await axios.post(`${API_URL}/public/migration/assess`, payload);
  return data;
};

export const submitMigrationLead = async (payload) => {
  const { data } = await axios.post(`${API_URL}/public/migration/lead`, payload);
  return data;
};

/* ---- admin ---- */

export const fetchMigrationLeads = async (params) => {
  const { data } = await client.get("/migration-tool/leads", { params });
  return data;
};

export const fetchMigrationStats = async () => {
  const { data } = await client.get("/migration-tool/leads/stats");
  return data;
};

export const fetchMigrationLead = async (id) => {
  const { data } = await client.get(`/migration-tool/leads/${id}`);
  return data.lead;
};

export const updateMigrationLead = async (id, payload) => {
  const { data } = await client.patch(`/migration-tool/leads/${id}`, payload);
  return data.lead;
};

export const deleteMigrationLead = async (id) => {
  const { data } = await client.delete(`/migration-tool/leads/${id}`);
  return data;
};

export const fetchMigrationModel = async () => {
  const { data } = await client.get("/migration-tool/model");
  return data;
};
