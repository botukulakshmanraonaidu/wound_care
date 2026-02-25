import React, { useState, useEffect } from 'react';
import { Camera, Save, X, ChevronLeft, Info, AlertCircle } from 'lucide-react';
import './Assessment.css';

const AddAssessment = ({ patient, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        assessmentDate: new Date().toISOString().split('T')[0],
        woundType: '',
        location: '',
        length: '',
        width: '',
        depth: '',
        area: '',
        granulation: 0,
        slough: 0,
        necrosis: 0,
        exudateType: 'None',
        exudateAmount: 'None',
        painLevel: 0,
        status: 'Stable',
        notes: ''
    });

    // Auto-calculate area if length and width are provided
    useEffect(() => {
        if (formData.length && formData.width) {
            const calculatedArea = (parseFloat(formData.length) * parseFloat(formData.width)).toFixed(2);
            setFormData(prev => ({ ...prev, area: `${calculatedArea} cm²` }));
        }
    }, [formData.length, formData.width]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const tissueTypes = [
        { label: 'Granulation', name: 'granulation', color: '#10b981' },
        { label: 'Slough', name: 'slough', color: '#f59e0b' },
        { label: 'Necrosis', name: 'necrosis', color: '#1e293b' }
    ];

    return (
        <div className="add-assessment-container">
            <div className="assessment-form-header">
                <div className="header-left">
                    <button className="back-btn" onClick={onCancel}>
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1>New Wound Assessment</h1>
                        <div className="patient-breadcrumb">
                            <span className="breadcrumb-label">PATIENT:</span>
                            <span className="breadcrumb-value">{patient?.name || 'Unknown Patient'}</span>
                            <span className="breadcrumb-mrn">{patient?.mrn || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn-primary" onClick={handleSubmit}>
                        <Save size={18} />
                        <span>Save Assessment</span>
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="assessment-main-form">
                <div className="form-grid">
                    {/* Left Column: Basic Info & Measurements */}
                    <div className="form-column">
                        <section className="form-section">
                            <h3 className="section-title">
                                <Info size={18} />
                                <span>Wound Details</span>
                            </h3>
                            <div className="section-content">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Wound Type *</label>
                                        <select
                                            name="woundType"
                                            value={formData.woundType}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select Wound Type</option>
                                            <option value="Pressure Ulcer">Pressure Ulcer</option>
                                            <option value="Venous Ulcer">Venous Ulcer</option>
                                            <option value="Arterial Ulcer">Arterial Ulcer</option>
                                            <option value="Diabetic Foot Ulcer">Diabetic Foot Ulcer</option>
                                            <option value="Surgical Wound">Surgical Wound</option>
                                            <option value="Traumatic Wound">Traumatic Wound</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Anatomical Location *</label>
                                        <input
                                            type="text"
                                            name="location"
                                            placeholder="e.g. Right Heel"
                                            value={formData.location}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Assessment Date</label>
                                    <input
                                        type="date"
                                        name="assessmentDate"
                                        value={formData.assessmentDate}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="form-section">
                            <h3 className="section-title">
                                <Camera size={18} />
                                <span>Measurements (cm)</span>
                            </h3>
                            <div className="section-content">
                                <div className="measurements-grid">
                                    <div className="form-group">
                                        <label>Length</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            name="length"
                                            placeholder="0.0"
                                            value={formData.length}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Width</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            name="width"
                                            placeholder="0.0"
                                            value={formData.width}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Depth</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            name="depth"
                                            placeholder="0.0"
                                            value={formData.depth}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Area</label>
                                        <input
                                            type="text"
                                            name="area"
                                            value={formData.area}
                                            readOnly
                                            className="readonly-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Tissue & Status */}
                    <div className="form-column">
                        <section className="form-section">
                            <h3 className="section-title">
                                <AlertCircle size={18} />
                                <span>Tissue Composition (%)</span>
                            </h3>
                            <div className="section-content">
                                <div className="tissue-inputs">
                                    {tissueTypes.map(tissue => (
                                        <div className="tissue-slider-group" key={tissue.name}>
                                            <div className="slider-header">
                                                <label>{tissue.label}</label>
                                                <span className="percentage">{formData[tissue.name]}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                name={tissue.name}
                                                value={formData[tissue.name]}
                                                onChange={handleChange}
                                                style={{ accentColor: tissue.color }}
                                            />
                                        </div>
                                    ))}
                                    <div className="tissue-total-warning">
                                        {parseInt(formData.granulation) + parseInt(formData.slough) + parseInt(formData.necrosis) !== 100 && (
                                            <p className="warning-text">Total composition must equal 100% (Current: {parseInt(formData.granulation) + parseInt(formData.slough) + parseInt(formData.necrosis)}%)</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="form-section">
                            <h3 className="section-title">
                                <Info size={18} />
                                <span>Clinical Findings</span>
                            </h3>
                            <div className="section-content">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Exudate Amount</label>
                                        <select name="exudateAmount" value={formData.exudateAmount} onChange={handleChange}>
                                            <option value="None">None</option>
                                            <option value="Scant">Scant</option>
                                            <option value="Small">Small</option>
                                            <option value="Moderate">Moderate</option>
                                            <option value="Large">Large</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Overall Status</label>
                                        <div className="status-toggle-group">
                                            {['Healing', 'Stable', 'Deteriorating'].map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    className={`status-toggle-btn ${formData.status === s ? 'active' : ''} ${s.toLowerCase()}`}
                                                    onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Clinical Notes</label>
                                    <textarea
                                        name="notes"
                                        placeholder="Add observations, odor, periwound condition, etc."
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows="3"
                                    ></textarea>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </form>

            <style>{`
                .add-assessment-container {
                    padding: 24px;
                    background-color: #f8fafc;
                    min-height: calc(100vh - 80px);
                }

                .assessment-form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .back-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .back-btn:hover {
                    background: #f1f5f9;
                    color: #1e293b;
                }

                .header-left h1 {
                    font-size: 24px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 4px 0;
                }

                .patient-breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                }

                .breadcrumb-label {
                    color: #94a3b8;
                    font-weight: 700;
                }

                .breadcrumb-value {
                    color: #475569;
                    font-weight: 600;
                }

                .breadcrumb-mrn {
                    color: #2563eb;
                    background: #eff6ff;
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-weight: 600;
                }

                .header-actions {
                    display: flex;
                    gap: 12px;
                }

                .btn-secondary {
                    padding: 10px 20px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #475569;
                    font-weight: 600;
                    cursor: pointer;
                }

                .btn-primary {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 24px;
                    border-radius: 10px;
                    border: none;
                    background: #2563eb;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }

                .form-section {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 24px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }

                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 16px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #334155;
                }

                .section-content {
                    padding: 20px;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .form-group label {
                    font-size: 12px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .form-group input, 
                .form-group select, 
                .form-group textarea {
                    padding: 12px 16px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    font-size: 14px;
                    color: #1e293b;
                    outline: none;
                    transition: all 0.2s;
                    background: #ffffff;
                }

                .form-group input:focus, 
                .form-group select:focus, 
                .form-group textarea:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
                }

                .readonly-input {
                    background: #f8fafc !important;
                    font-weight: 700;
                    color: #2563eb !important;
                }

                .measurements-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }

                .tissue-slider-group {
                    margin-bottom: 20px;
                }

                .slider-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .slider-header label {
                    font-size: 14px;
                    font-weight: 600;
                    color: #475569;
                }

                .slider-header .percentage {
                    font-weight: 700;
                    color: #2563eb;
                }

                .tissue-slider-group input[type="range"] {
                    width: 100%;
                    cursor: pointer;
                }

                .warning-text {
                    color: #ef4444;
                    font-size: 12px;
                    font-weight: 600;
                    margin-top: 8px;
                }

                .status-toggle-group {
                    display: flex;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 10px;
                    gap: 4px;
                }

                .status-toggle-btn {
                    flex: 1;
                    padding: 10px;
                    border: none;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: transparent;
                    color: #64748b;
                }

                .status-toggle-btn.active.healing {
                    background: #10b981;
                    color: white;
                }

                .status-toggle-btn.active.stable {
                    background: #2563eb;
                    color: white;
                }

                .status-toggle-btn.active.deteriorating {
                    background: #ef4444;
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default AddAssessment;
