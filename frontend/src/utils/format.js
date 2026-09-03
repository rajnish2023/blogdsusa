export const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

export const truncate = (str, n = 28) => (str?.length > n ? `${str.slice(0, n - 1)}…` : str);
