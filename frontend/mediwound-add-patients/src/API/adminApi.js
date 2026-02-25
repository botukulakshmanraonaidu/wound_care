import axios from "axios";

const AdminAPI = axios.create({
    // Prefers VITE_API_BASE_URL from .env, fallback to empty string (current domain)
    baseURL: `${import.meta.env.VITE_API_BASE_URL || ""}/admin_page/`,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to inject the JWT token
AdminAPI.interceptors.request.use(
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
AdminAPI.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) throw new Error("No refresh token");

                // Use Render production backend for token refresh
                const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || "https://wound-analysis.onrender.com"}/patient/api/auth/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access } = response.data;
                localStorage.setItem("access_token", access);

                // Update authorization header and retry
                originalRequest.headers.Authorization = `Bearer ${access}`;
                return AdminAPI(originalRequest);
            } catch (refreshError) {
                // If refresh fails, clear tokens and redirect to login
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const adminApi = {
    // User Management
    getUsers: () => AdminAPI.get("users/"),
    createUser: (userData) => {
        const adminEmail = localStorage.getItem("email") || "system";
        return AdminAPI.post("users/create/", { ...userData, admin_email: adminEmail });
    },
    updateUser: (id, userData) => {
        const adminEmail = localStorage.getItem("email") || "system";
        return AdminAPI.patch(`users/${id}/`, { ...userData, admin_email: adminEmail });
    },
    deleteUser: (id) => {
        const adminEmail = localStorage.getItem("email") || "system";
        return AdminAPI.delete(`users/${id}/`, { data: { admin_email: adminEmail } });
    },

    // Activity Tracking
    getActivityLogs: (params) => AdminAPI.get("logs/", { params }),

    // Dashboard Stats
    getSystemStats: () => AdminAPI.get("stats/"),
    getStorageStats: () => AdminAPI.get("storage-stats/"),
};

export default adminApi;
