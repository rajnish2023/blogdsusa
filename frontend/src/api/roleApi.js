import client from "./client";

export const fetchPermissions = async () => {
  const { data } = await client.get("/roles/permissions");
  return data.permissions;
};

export const fetchRoles = async () => {
  const { data } = await client.get("/roles");
  return data.items;
};

export const createRole = async (payload) => {
  const { data } = await client.post("/roles", payload);
  return data.role;
};

export const updateRole = async (id, payload) => {
  const { data } = await client.patch(`/roles/${id}`, payload);
  return data.role;
};

export const deleteRole = async (id) => {
  const { data } = await client.delete(`/roles/${id}`);
  return data;
};
