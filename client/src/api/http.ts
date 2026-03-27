import axios from "axios";
import { API_BASE_URL } from "../config/runtime";

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default http;
