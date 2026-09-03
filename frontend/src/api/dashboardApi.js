import client from "./client";

export const fetchDashboardStats = async () => {
  const { data } = await client.get("/dashboard/stats");
  return data;
};
