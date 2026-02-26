import axios from "axios";
import { getApiBaseUrl } from "./apiConfig";

const AuthAPI = axios.create({
  baseURL: `${getApiBaseUrl()}/patient/`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the JWT token
AuthAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token expiration
AuthAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        // Use environment-based base URL for token refresh
        const response = await axios.post(`${getApiBaseUrl()}/patient/api/auth/token/refresh/`, {
          refresh: refreshToken,
        });


        const { access } = response.data;
        localStorage.setItem("access_token", access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return AuthAPI(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userId");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ✅ NAMED EXPORTS
export const loginUser = (email, password) => {
  return AuthAPI.post("api/auth/login/", { email, password });
};

export const logoutUser = () => {
  return AuthAPI.post("api/auth/logout/");
};

export const getProfile = () => {
  return AuthAPI.get("api/profile/");
};

export const updateProfile = (data) => {
  return AuthAPI.patch("api/profile/", data);
};

export default AuthAPI;
