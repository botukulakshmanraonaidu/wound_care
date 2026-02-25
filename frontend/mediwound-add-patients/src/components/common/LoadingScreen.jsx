import React from 'react';
import { Plus } from 'lucide-react';
import './LoadingScreen.css';

const LoadingScreen = () => {
    return (
        <div className="loading-screen">
            <div className="loading-logo-wrapper">
                <Plus size={32} strokeWidth={3} />
            </div>
            <h1 className="loading-title">Wound Assessment Tool</h1>
            <p className="loading-subtitle">Hospital - Grade Diagnostics</p>
            <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
            </div>
        </div>
    );
};

export default LoadingScreen;
