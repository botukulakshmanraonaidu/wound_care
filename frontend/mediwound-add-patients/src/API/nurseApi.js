import axios from "axios";

const NurseAPI = axios.create({
    baseURL: `${import.meta.env.VITE_API_BASE_URL || ""}/nurse_page/`,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to inject the JWT token
NurseAPI.interceptors.request.use(
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
NurseAPI.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem("refresh_token");
                if (!refreshToken) throw new Error("No refresh token");

                const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || ""}/patient/api/auth/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access } = response.data;
                localStorage.setItem("access_token", access);

                originalRequest.headers.Authorization = `Bearer ${access}`;
                return NurseAPI(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default NurseAPI;
