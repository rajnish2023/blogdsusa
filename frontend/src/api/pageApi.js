import client from "./client";

export const fetchPages = async ({ search = "", category = "", status = "", page = 1 } = {}) => {
  const { data } = await client.get("/pages", { params: { search, category, status, page } });
  return data;
};

export const fetchPage = async (id) => {
  const { data } = await client.get(`/pages/${id}`);
  return data.page;
};

export const createPage = async (payload) => {
  const { data } = await client.post("/pages", payload);
  return data.page;
};

export const updatePage = async (id, payload) => {
  const { data } = await client.patch(`/pages/${id}`, payload);
  return data.page;
};

export const setPageStatus = async (id, status) => {
  const { data } = await client.patch(`/pages/${id}/status`, { status });
  return data.page;
};

export const deletePage = async (id) => {
  const { data } = await client.delete(`/pages/${id}`);
  return data;
};
