import client from "./client";

export const fetchBlogs = async ({ search = "", category = "", status = "", page = 1 } = {}) => {
  const { data } = await client.get("/blogs", { params: { search, category, status, page } });
  return data;
};

export const fetchBlog = async (id) => {
  const { data } = await client.get(`/blogs/${id}`);
  return data.blog;
};

export const createBlog = async (payload) => {
  const { data } = await client.post("/blogs", payload);
  return data.blog;
};

export const updateBlog = async (id, payload) => {
  const { data } = await client.patch(`/blogs/${id}`, payload);
  return data.blog;
};

export const setBlogStatus = async (id, status) => {
  const { data } = await client.patch(`/blogs/${id}/status`, { status });
  return data.blog;
};

export const deleteBlog = async (id) => {
  const { data } = await client.delete(`/blogs/${id}`);
  return data;
};

export const bulkDeleteBlogs = async (ids) => {
  const { data } = await client.post("/blogs/bulk-delete", { ids });
  return data;
};

export const bulkExportBlogs = async (ids) => {
  const { data } = await client.post("/blogs/bulk-export", { ids }, { responseType: "blob" });
  const url = window.URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `blogs_export_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
