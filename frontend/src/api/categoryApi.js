import client from "./client";

export const fetchCategories = async () => {
  const { data } = await client.get("/categories");
  return data.items;
};

export const createCategory = async (payload) => {
  const { data } = await client.post("/categories", payload);
  return data.category;
};

export const updateCategory = async (id, payload) => {
  const { data } = await client.patch(`/categories/${id}`, payload);
  return data.category;
};

export const deleteCategory = async (id) => {
  const { data } = await client.delete(`/categories/${id}`);
  return data;
};
