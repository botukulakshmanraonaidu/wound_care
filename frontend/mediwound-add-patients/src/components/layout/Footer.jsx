import React from 'react';
import './Footer.css';
import { Shield, Activity } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    
    return (
        <footer className="app-footer">
            <div className="footer-container">
                <div className="footer-left">
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <Activity size={16} />
                        </div>
                        <span className="footer-brand-name">MediWound AI</span>
                    </div>
                    <span className="footer-divider">|</span>
                    <span className="footer-tagline">Clinical Precision, Data-Driven Care</span>
                </div>
                
                <div className="footer-center">
                    <p className="copyright">&copy; {currentYear} Healthcare Systems Inc. All rights reserved.</p>
                </div>
                
                <div className="footer-right">
                    <div className="system-status">
                        <Shield size={14} className="status-icon" />
                        <span>System Encrypted & HIPAA Compliant</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
