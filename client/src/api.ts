import axios from "axios";

const baseURL = import.meta.env.VITE_RATIONSWEB_API_URL;

if (!baseURL) {
  throw new Error("Missing VITE_RATIONSWEB_API_URL");
}

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    const h: any = config.headers;
    if (h && typeof h.set === "function") {
      h.set("Authorization", `Bearer ${token}`);
    } else {
      config.headers = { ...(config.headers as any), Authorization: `Bearer ${token}` };
    }
  }

  return config;
});

export default api;
