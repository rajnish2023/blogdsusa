import client from "./client";

export const loginRequest = async (email, password) => {
  const { data } = await client.post("/auth/login", { email, password });
  return data;
};

export const refreshRequest = async () => {
  const { data } = await client.post("/auth/refresh");
  return data;
};

export const logoutRequest = async () => {
  const { data } = await client.post("/auth/logout");
  return data;
};

export const meRequest = async () => {
  const { data } = await client.get("/auth/me");
  return data;
};

export const forgotPasswordRequest = async (email) => {
  const { data } = await client.post("/auth/forgot-password", { email });
  return data;
};

export const resetPasswordRequest = async (token, password) => {
  const { data } = await client.post(`/auth/reset-password/${token}`, { password });
  return data;
};

