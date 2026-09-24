import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 15000,
});

/**
 * Attach authentication token to every request
 * when the user is logged in.
 *
 * Public endpoints still work because no
 * Authorization header is added when there
 * is no token.
 */
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("barter_token");

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;