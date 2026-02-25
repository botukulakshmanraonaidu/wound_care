import React, { useState } from 'react';
import './Onboarding.css';

import step1 from '../../assets/step1.png';
import step2 from '../../assets/step2.png';
import step3 from '../../assets/step3.png';

const IMAGES = {
    step1: step1,
    step2: step2,
    step3: step3,
};

const Onboarding = ({ onComplete }) => {
    const [step, setStep] = useState(1);

    const steps = [
        {
            title: "Automated Wound Measurement",
            description: "Our AI algorithms automatically measure surface area and depth, reducing documentation time by 40%. Eliminate manual ruler errors and get precise clinical data instantly.",
            features: ["Instant contour detection", "Tissue type segmentation"],
            image: IMAGES.step1
        },
        {
            title: "AI-Driven Measurement",
            description: "Our AI algorithms automatically calculates surface area and depth with 98% accuracy, removing subjectivity from your documentation and ensuring consistent longitudinal tracking.",
            features: ["Instant contour detection", "Tissue type segmentation"],
            image: IMAGES.step2
        },
        {
            title: "Start Your First Assessment",
            description: "The AI is calibrated and ready. You can now upload wound imagery for instant analysis and documentation. Click below to begin.",
            features: ["System is secured and HIPAA compliant."],
            image: IMAGES.step3,
            buttonText: "Get Started"
        }
    ];

    const currentStep = steps[step - 1];

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    return (
        <div className="onboarding-container">
            <header className="onboarding-header">
                <div className="onboarding-header-left">
                    <div className="logo-box">
                        <svg width="40" height="40" viewBox="0 0 116 116" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="116" height="116" rx="7.93162" fill="#2D63A9" fill-opacity="0.16" />
                            <path d="M51.3996 30.5735C49.6494 30.5735 47.9708 31.2688 46.7332 32.5064C45.4956 33.744 44.8003 35.4226 44.8003 37.1728V44.8721H38.2009C36.4507 44.8721 34.7721 45.5674 33.5345 46.805C32.2969 48.0426 31.6016 49.7212 31.6016 51.4715V64.6042C31.6016 66.3544 32.2969 68.033 33.5345 69.2706C34.7721 70.5082 36.4507 71.2035 38.2009 71.2035H44.8003V77.8029C44.8003 79.5532 45.4956 81.2317 46.7332 82.4693C47.9708 83.707 49.6494 84.4023 51.3996 84.4023H64.5984C66.3486 84.4023 68.0272 83.707 69.2648 82.4693C70.5024 81.2317 71.1977 79.5532 71.1977 77.8029V71.2035H77.7971C79.5473 71.2035 81.2259 70.5082 82.4635 69.2706C83.7011 68.033 84.3964 66.3544 84.3964 64.6042V51.4055C84.3964 49.6552 83.7011 47.9766 82.4635 46.739C81.2259 45.5014 79.5473 44.8061 77.7971 44.8061H71.1977V37.1728C71.1977 35.4226 70.5024 33.744 69.2648 32.5064C68.0272 31.2688 66.3486 30.5735 64.5984 30.5735H51.3996Z" fill="#2D63A9" />
                        </svg>
                    </div>
                    <div>
                        <h1>Wound Assessment Tool</h1>
                        <p>Hospital - Grade Diagnostics</p>
                    </div>
                </div>
                <a href="#" className="skip-intro" onClick={(e) => { e.preventDefault(); onComplete(); }}>Skip Intro</a>
            </header>

            <main className="onboarding-content">
                <div className="onboarding-card">
                    <div className="onboarding-image-section">
                        <img src={currentStep.image} alt={currentStep.title} />
                    </div>

                    <div className="onboarding-text-section">
                        <div className="onboarding-scrollable-content">
                            <div className="step-indicator">Step {step} of 3</div>
                            <h2>{currentStep.title}</h2>
                            <p>{currentStep.description}</p>

                            <ul className="feature-list">
                                {currentStep.features.map((feature, idx) => (
                                    <li key={idx} className="feature-item">
                                        <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${(step / 3) * 100}%` }}
                            ></div>
                        </div>

                        <div className="onboarding-footer">
                            {step > 1 && (
                                <button className="prev-btn" onClick={handlePrev}>Previous</button>
                            )}
                            <button className="next-btn" onClick={handleNext}>
                                {currentStep.buttonText || "Next Step"}
                                {!currentStep.buttonText && <span>&rarr;</span>}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Onboarding;
