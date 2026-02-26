// =============================================================
// Centralized API Configuration
// Allows switching between Local and Live servers at runtime.
// The choice is stored in localStorage so it persists across refreshes.
// =============================================================

const SERVERS = {
    local: "http://localhost:8000",
    live: "https://wound-analysis-cl7c.onrender.com",
};

// Key used in localStorage
const STORAGE_KEY = "api_server_mode";

/**
 * Get the current server mode ("local" or "live").
 */
export const getServerMode = () => {
    return localStorage.getItem(STORAGE_KEY) || "local";
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
 * Get the available server options (for UI display).
 */
export const getServerOptions = () => {
    return [
        { key: "local", label: "Local Server", url: SERVERS.local },
        { key: "live", label: "Live Server (Render)", url: SERVERS.live },
    ];
};

export default { getApiBaseUrl, getServerMode, setServerMode, getServerOptions };
