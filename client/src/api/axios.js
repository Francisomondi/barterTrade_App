// UPDATE — EXISTING AXIOS API FILE

import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api",

  timeout: 15000,
  withCredentials: true,
});


api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "barter_token"
      );

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(
      error
    );
  }
);

export default api;