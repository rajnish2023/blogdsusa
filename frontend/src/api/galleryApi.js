import client from "./client";

export const fetchMedia = async ({ type = "all", search = "", sort = "newest", page = 1, limit } = {}) => {
  const { data } = await client.get("/gallery", { params: { type, search, sort, page, limit } });
  return data;
};

export const uploadMedia = async (files, alts = [], onProgress) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("alts", JSON.stringify(files.map((_, i) => alts[i] || "")));

  const { data } = await client.post("/gallery/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (onProgress) onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });
  return data;
};

export const deleteMedia = async (id) => {
  const { data } = await client.delete(`/gallery/${id}`);
  return data;
};
 
export const downloadMedia = async (id, filename) => {
  const { data } = await client.get(`/gallery/${id}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const bulkDeleteMedia = async (ids) => {
  const { data } = await client.post("/gallery/bulk-delete", { ids });
  return data;
};

export default client;
