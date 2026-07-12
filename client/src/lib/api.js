import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Attach JWT from storage on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("af_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error messages and auto-logout on 401.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.error || error.message || "Something went wrong";
    if (status === 401 && localStorage.getItem("af_token")) {
      localStorage.removeItem("af_token");
      localStorage.removeItem("af_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(new Error(message));
  }
);

export default api;
