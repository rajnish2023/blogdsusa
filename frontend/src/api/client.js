import axios from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const client = axios.create({ baseURL: API_URL, withCredentials: true });
client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

 
let refreshPromise = null;
let onLogout = null; 

export const setLogoutHandler = (handler) => {
  onLogout = handler;
};

export const doRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .catch((err) => {
        // Only log out if the server explicitly rejected the refresh token (401/403).
        // Ignore network errors, timeouts, or 5xx errors so the user stays logged in.
        const status = err.response?.status;
        if (status === 401 || status === 403 || status === 400) {
          clearAccessToken();
          if (onLogout) onLogout();
        }
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};
 
let refreshTimer = null;

export const scheduleTokenRefresh = () => {
  if (refreshTimer) clearTimeout(refreshTimer);

  const token = getAccessToken();
  if (!token) return;
 
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiresAt = payload.exp * 1000; // convert to ms
    const now = Date.now();
 
    const MAX_TIMEOUT = 2147483647; // 32-bit signed max (approx 24.8 days)
    const refreshIn = Math.min(Math.max(expiresAt - now - 60_000, 10_000), MAX_TIMEOUT);

    refreshTimer = setTimeout(async () => {
      try {
        await doRefresh();
   
        scheduleTokenRefresh();
      } catch {
     
      }
    }, refreshIn);
  } catch {
   
  }
};

export const cancelTokenRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

 
const SERVER_BASE = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;

const resolveRelativeUrls = (data) => {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    let cleaned = data;
    cleaned = cleaned.replace(/https?:\/\/blognew\.dynamicssquare\.(ca|com)\/(public\/)?upload\/([^"'\s>)]+)/g, `${SERVER_BASE}/uploads/$3`);
    cleaned = cleaned.replace(/(src|href)=["']\/uploads\/([^"']+)["']/g, `$1="${SERVER_BASE}/uploads/$2"`);
    if (cleaned.startsWith("/uploads/")) {
      cleaned = `${SERVER_BASE}${cleaned}`;
    }
    return cleaned;
  }

  if (Array.isArray(data)) {
    return data.map(resolveRelativeUrls);
  }

  if (typeof data === "object") {
    if (data instanceof File || data instanceof Blob) return data;
    const copy = {};
    for (const key of Object.keys(data)) {
      copy[key] = resolveRelativeUrls(data[key]);
    }
    return copy;
  }

  return data;
};
 
client.interceptors.response.use(
  (res) => {
    if (res.data) {
      res.data = resolveRelativeUrls(res.data);
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");
 
    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const newToken = await doRefresh();
        original.headers.Authorization = `Bearer ${newToken}`;
   
        scheduleTokenRefresh();
        return client(original);
      } catch (refreshErr) {
   
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export const API_BASE = API_URL;
export default client;
