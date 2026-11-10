import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api").replace(/\/$/, "");

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// When the access token expires, get a new one with the refresh token (once),
// then retry the original request.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh });
    setTokens(data.access, data.refresh);
    return data.access as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.includes("/auth/token");
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      clearTokens();
    }
    return Promise.reject(error);
  },
);

/** Turn a DRF error response into a readable message. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (!error.response) return "Cannot reach the server. Is the backend running?";
    if (typeof data === "string") return data.slice(0, 200) || fallback;
    if (data && typeof data === "object") {
      const parts = Object.entries(data as Record<string, unknown>).map(([key, value]) => {
        const text = Array.isArray(value) ? value.join(" ") : String(value);
        return key === "detail" || key === "non_field_errors" ? text : `${key}: ${text}`;
      });
      if (parts.length) return parts.join(" • ");
    }
  }
  return error instanceof Error ? error.message : fallback;
}
