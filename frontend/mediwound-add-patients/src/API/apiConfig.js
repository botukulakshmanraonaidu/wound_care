// =============================================================
// Centralized API Configuration
// Allows switching between Local and Live servers at runtime.
// The choice is stored in localStorage so it persists across refreshes.
// =============================================================

const SERVERS = {
    local: "http://localhost:8000",
    live: "https://wound-care.onrender.com",
    ml_local: "http://localhost:8001",
    ml_live: import.meta.env.VITE_ML_API_URL || import.meta.env.VITE_FASTAPI_URL || "http://localhost:8001",
};

// Key used in localStorage
const STORAGE_KEY = "api_server_mode";

/**
 * Get the current server mode ("local" or "live").
 */
export const getServerMode = () => {
    const savedMode = localStorage.getItem(STORAGE_KEY);
    if (savedMode) return savedMode;

    // Default logic: If running on localhost, default to 'local'. 
    // If running on Netlify/Production, default to 'live'.
    const isLocalhost = window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    return isLocalhost ? "local" : "live";
};

/**
 * Set the server mode and reload the page to apply.
 * @param {"local" | "live"} mode
 */
export const setServerMode = (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    window.location.reload(); // Reload so all API clients pick up the new URL
};

/**
 * Get the current API base URL based on the selected mode.
 */
export const getApiBaseUrl = () => {
    const mode = getServerMode();
    return SERVERS[mode] || SERVERS.local;
};

/**
 * Get the current ML base URL based on the selected mode.
 */
export const getMlBaseUrl = () => {
    const mode = getServerMode();
    return mode === "live" ? SERVERS.ml_live : SERVERS.ml_local;
};

/**
 * Get the available server options (for UI display).
 */
export const getServerOptions = () => {
    return [
        { key: "local", label: "Local Server", url: SERVERS.local },
        { key: "live", label: "Live Server (Render)", url: SERVERS.live },
    ];
};

export default { getApiBaseUrl, getMlBaseUrl, getServerMode, setServerMode, getServerOptions };
