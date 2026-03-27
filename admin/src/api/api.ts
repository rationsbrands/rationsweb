import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rations_admin_token") || ''

  if (token) {
    config.headers = {
      ...(config.headers as any),
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

export default api;
