import client from "./client";

export const fetchPageCategories = async () => {
  const { data } = await client.get("/page-categories");
  return data.items;
};

export const createPageCategory = async (payload) => {
  const { data } = await client.post("/page-categories", payload);
  return data.category;
};

export const updatePageCategory = async (id, payload) => {
  const { data } = await client.patch(`/page-categories/${id}`, payload);
  return data.category;
};

export const deletePageCategory = async (id) => {
  const { data } = await client.delete(`/page-categories/${id}`);
  return data;
};
