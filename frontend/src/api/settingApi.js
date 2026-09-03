import client from "./client";
 
export const fetchPublicSettings = async () => {
  const { data } = await client.get("/public/settings");
  return data;
};

 
export const updateSettingValue = async (key, value) => {
  const { data } = await client.put("/settings", { key, value });
  return data;
};

 
export const uploadCustomLogo = async (file) => {
  const formData = new FormData();
  formData.append("logo", file);

  const { data } = await client.post("/settings/upload-logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};
