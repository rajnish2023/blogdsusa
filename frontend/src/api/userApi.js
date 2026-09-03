import client from "./client";

export const fetchUsers = async ({ search = "", role = "", status = "", page = 1, limit = 10 } = {}) => {
  const { data } = await client.get("/users", { params: { search, role, status, page, limit } });
  return data;
};

export const createUser = async (payload) => {
  const { data } = await client.post("/users", payload);
  return data;
};

export const updateUser = async (id, payload) => {
  const { data } = await client.patch(`/users/${id}`, payload);
  return data;
};

export const setUserStatus = async (id, status) => {
  const { data } = await client.patch(`/users/${id}/status`, { status });
  return data;
};

export const deleteUser = async (id) => {
  const { data } = await client.delete(`/users/${id}`);
  return data;
};

// --- Self-service profile ---
export const fetchMyProfile = async () => {
  const { data } = await client.get("/users/me");
  return data.user;
};

export const updateMyProfile = async (payload) => {
  const { data } = await client.patch("/users/me", payload);
  return data.user;
};

export const uploadMyAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await client.post("/users/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.user;
};

export const changeMyPassword = async (currentPassword, newPassword) => {
  const { data } = await client.patch("/users/me/password", { currentPassword, newPassword });
  return data;
};

// Lightweight author list for the blog's "reassign author" dropdown.
export const fetchAuthors = async () => {
  const { data } = await client.get("/users/authors");
  return data.items;
};
