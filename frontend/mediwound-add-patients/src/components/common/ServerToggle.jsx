import React from "react";
import { getServerMode, setServerMode, getServerOptions } from "../../API/apiConfig";

/**
 * A small toggle component that lets you switch between
 * Local Server and Live Server at runtime.
 *
 * Place this anywhere in your app (e.g., Login page, Settings, Navbar).
 */
const ServerToggle = () => {
    const currentMode = getServerMode();
    const options = getServerOptions();

    const handleChange = (e) => {
        const newMode = e.target.value;
        if (newMode !== currentMode) {
            setServerMode(newMode); // This will reload the page
        }
    };

    const currentOption = options.find((o) => o.key === currentMode);

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                background: currentMode === "live" ? "#dcfce7" : "#e0f2fe",
                border: `1px solid ${currentMode === "live" ? "#86efac" : "#7dd3fc"}`,
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 500,
            }}
        >
            {/* Status dot */}
            <span
                style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: currentMode === "live" ? "#22c55e" : "#3b82f6",
                    display: "inline-block",
                }}
            />

            {/* Dropdown */}
            <select
                value={currentMode}
                onChange={handleChange}
                style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: currentMode === "live" ? "#166534" : "#1e40af",
                    cursor: "pointer",
                    outline: "none",
                }}
            >
                {options.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {/* Current URL hint */}
            <span style={{ color: "#94a3b8", fontSize: "11px" }}>
                ({currentOption?.url})
            </span>
        </div>
    );
};

export default ServerToggle;
