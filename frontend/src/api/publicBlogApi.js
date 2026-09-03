import client from "./client";
 
export const fetchPublicBlogs = async (params = {}) => {
  const { data } = await client.get("/public/blogs", { params });
  return data;
};
 
export const fetchPublicBlogBySlug = async (slug) => {
  const { data } = await client.get(`/public/blogs/slug/${encodeURIComponent(slug)}`);
  return data;
};
 
export const fetchTrendingBlogs = async (limit = 5) => {
  const { data } = await client.get("/public/blogs/trending", { params: { limit } });
  return data;
};
 
export const fetchRandomBlogs = async (params = {}) => {
  const { data } = await client.get("/public/blogs/random", { params });
  return data;
};
 
export const fetchBlogsByCategory = async (categorySlug, params = {}) => {
  const { data } = await client.get(`/public/blogs/category/${encodeURIComponent(categorySlug)}`, { params });
  return data;
};
 
export const fetchBlogsByAuthor = async (authorId, params = {}) => {
  const { data } = await client.get(`/public/blogs/author/${encodeURIComponent(authorId)}`, { params });
  return data;
};
