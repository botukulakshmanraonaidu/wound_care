import React, { useState, useEffect } from 'react';
import { Upload, X, Camera, Info, AlertCircle, Save, ChevronLeft, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ANTERIOR_REGIONS, POSTERIOR_REGIONS } from './bodyRegions';
import AuthAPI from '../../../../API/authApi';
import { getMlBaseUrl } from '../../../../API/apiConfig';
import { API_BASE_URL } from './config';
import './Clinicalportal.css';

const WoundAssessmentDashboard = () => {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState('anterior');
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [uploadedImages, setUploadedImages] = useState([]);
    const [viewerState, setViewerState] = useState({ index: null, zoom: 1, rotation: 0, isPointing: false });
    const [imageAnnotations, setImageAnnotations] = useState({}); // { [index]: [{x, y}] }
    const [imageFilters, setImageFilters] = useState({}); // { [index]: { brightness, contrast, grayscale, invert } }
    const [patientData, setPatientData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [previousArea, setPreviousArea] = useState(null);
    const [reductionRate, setReductionRate] = useState(null);
    const [formData, setFormData] = useState({
        woundType: '',
        onsetDate: '',
        woundStage: '',
        exudateAmount: '',
        length: '',
        width: '',
        depth: '',
        painLevel: 4,
        notes: ''
    });

    // Retrieve patient data and previous assessments
    useEffect(() => {
        const storedPatient = sessionStorage.getItem('clinical_portal_patient');
        if (storedPatient) {
            try {
                const parsed = JSON.parse(storedPatient);
                setPatientData(parsed);

                // Fetch previous assessment area for reduction rate
                const fetchPreviousArea = async () => {
                    try {
                        const response = await AuthAPI.get(`api/assessments/?patient_id=${parsed.id}`);
                        if (response.status === 200) {
                            const data = response.data;
                            if (data.length > 0) {
                                // Find latest assessment with dimensions
                                const lastWithDims = data.find(a => a.length && a.width);
                                if (lastWithDims) {
                                    setPreviousArea(parseFloat(lastWithDims.length) * parseFloat(lastWithDims.width));
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Failed to fetch previous area:', e);
                    }
                };
                fetchPreviousArea();
            } catch (e) {
                console.error('Failed to parse patient data:', e);
            }
        }
    }, []);

    const runAIAnalysis = async (imageData) => {
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            // Convert base64 to blob
            const base64Response = await fetch(imageData);
            const blob = await base64Response.blob();
            const uploadData = new FormData();
            uploadData.append('file', blob, 'wound.jpg');

            const mlResponse = await fetch(`${getMlBaseUrl()}/analyze-wound`, {
                method: 'POST',
                body: uploadData
            });

            if (mlResponse.ok) {
                const result = await mlResponse.json();
                setAiAnalysis(result);

                // Calculate estimated reduction rate
                let reductionInfo = "";
                let localReduction = null;
                if (previousArea && result.dimensions?.length && result.dimensions?.width) {
                    const currentArea = result.dimensions.length * result.dimensions.width;
                    localReduction = ((previousArea - currentArea) / previousArea) * 100;
                    setReductionRate(localReduction.toFixed(1));
                    reductionInfo = `\n\n[AI HEALING PROGRESS]: Wound area has reduced by ${localReduction.toFixed(1)}% since last assessment.`;
                } else {
                    setReductionRate(null);
                }

                // Auto-fill form
                setFormData(prev => ({
                    ...prev,
                    woundType: result.wound_type || prev.woundType,
                    woundStage: result.stage || prev.woundStage,
                    length: result.dimensions?.length || prev.length,
                    width: result.dimensions?.width || prev.width,
                    notes: prev.notes + `\n\n[AI SUGGESTION]: ${result.cure_recommendation}${reductionInfo}`
                }));
            } else {
                setAnalysisError("ML Service responded with an error. Please ensure the service is running.");
            }
        } catch (error) {
            console.error("AI Analysis failed", error);
            setAnalysisError("Could not connect to ML Service. Please check if FastAPI is running on port 8001.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageData = reader.result;
                setUploadedImages(prev => [...prev, imageData]);
                // Automatically run AI analysis for the first image
                if (uploadedImages.length === 0) {
                    runAIAnalysis(imageData);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
        if (viewerState.index === index) {
            setViewerState({ index: null, zoom: 1, rotation: 0 });
        } else if (viewerState.index > index) {
            setViewerState(prev => ({ ...prev, index: prev.index - 1 }));
        }
    };

    const handleViewerAction = (action) => {
        if (action === 'zoomIn') setViewerState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.2, 3) }));
        if (action === 'zoomOut') setViewerState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.2, 0.5) }));
        if (action === 'rotate') setViewerState(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
        if (action === 'togglePoint') setViewerState(prev => ({ ...prev, isPointing: !prev.isPointing, isEditing: false }));
        if (action === 'toggleEdit') setViewerState(prev => ({ ...prev, isEditing: !prev.isEditing, isPointing: false }));
        if (action === 'clearPoints') setImageAnnotations(prev => ({ ...prev, [viewerState.index]: [] }));
        if (action === 'resetEdits') setImageFilters(prev => ({ ...prev, [viewerState.index]: defaultFilters }));
    };

    const defaultFilters = { brightness: 100, contrast: 100, grayscale: 0, invert: 0 };

    const updateFilter = (property, value) => {
        setImageFilters(prev => ({
            ...prev,
            [viewerState.index]: {
                ...(prev[viewerState.index] || defaultFilters),
                [property]: value
            }
        }));
    };

    const handleCanvasClick = (e) => {
        if (!viewerState.isPointing || viewerState.index === null) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setImageAnnotations(prev => ({
            ...prev,
            [viewerState.index]: [...(prev[viewerState.index] || []), { x, y }]
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const cropImage = (imageSrc, points) => {
        return new Promise((resolve) => {
            if (!points || points.length < 3) return resolve(null);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 1. Find bounding box
                const xCoords = points.map(p => p.x);
                const yCoords = points.map(p => p.y);
                const minX = Math.min(...xCoords);
                const maxX = Math.max(...xCoords);
                const minY = Math.min(...yCoords);
                const maxY = Math.max(...yCoords);

                // Convert percentages to pixels
                const pixelMinX = (minX / 100) * img.width;
                const pixelMaxX = (maxX / 100) * img.width;
                const pixelMinY = (minY / 100) * img.height;
                const pixelMaxY = (maxY / 100) * img.height;

                const width = pixelMaxX - pixelMinX;
                const height = pixelMaxY - pixelMinY;

                // 2. Set canvas size to bounding box (with some padding)
                const padding = 20;
                canvas.width = width + (padding * 2);
                canvas.height = height + (padding * 2);

                // 3. Draw clipped image
                ctx.beginPath();
                points.forEach((p, i) => {
                    const px = (p.x / 100) * img.width - pixelMinX + padding;
                    const py = (p.y / 100) * img.height - pixelMinY + padding;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.closePath();
                ctx.clip();

                ctx.drawImage(
                    img,
                    pixelMinX - padding, pixelMinY - padding, width + (padding * 2), height + (padding * 2),
                    0, 0, canvas.width, canvas.height
                );

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.9);
            };
            img.src = imageSrc;
        });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!patientData || !patientData.id) {
            alert("Patient data is missing. Please return to the patient profile and try again.");
            return;
        }

        try {
            const uploadData = new FormData();
            uploadData.append('patient', patientData.id);
            uploadData.append('wound_type', formData.woundType);
            uploadData.append('wound_stage', formData.woundStage);
            uploadData.append('exudate_amount', formData.exudateAmount);
            uploadData.append('length', formData.length);
            uploadData.append('width', formData.width);
            uploadData.append('depth', formData.depth);
            uploadData.append('pain_level', formData.painLevel);
            uploadData.append('notes', formData.notes);
            uploadData.append('body_location', selectedRegion ? selectedRegion.label : '');
            if (formData.onsetDate) uploadData.append('onset_date', formData.onsetDate);

            // Process Images
            for (let i = 0; i < uploadedImages.length; i++) {
                const imgData = uploadedImages[i];
                const points = imageAnnotations[i];

                // Full Image
                const response = await fetch(imgData);
                const fullBlob = await response.blob();
                uploadData.append(`images[${i}][full]`, fullBlob, `wound_${i}_full.jpg`);

                // Cropped Area
                if (points && points.length >= 3) {
                    const selectedBlob = await cropImage(imgData, points);
                    if (selectedBlob) {
                        uploadData.append(`images[${i}][selected]`, selectedBlob, `wound_${i}_selected.jpg`);
                    }
                    uploadData.append(`images[${i}][annotations]`, JSON.stringify(points));
                }
            }

            const response = await AuthAPI.post('api/assessments/', uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.status === 201 || response.status === 200) {
                alert("Assessment saved successfully!");
                navigate(`/patients/profile/${patientData.id}`);
            } else {
                console.error("Submission failed:", response.data);
                alert("Failed to save assessment. Check console for details.");
            }
        } catch (error) {
            console.error("Error submitting assessment:", error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            alert(`An error occurred: ${errorMsg}. Check console for details.`);
        }
    };

    return (
        <div className="clinical-portal-container">
            {/* Header */}
            <div className="clinical-portal-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1>Add New Wound Assessment</h1>
                        <div className="patient-breadcrumb">
                            <span className="breadcrumb-label">PATIENT:</span>
                            <span className="breadcrumb-value">{patientData?.name || 'Unknown'}</span>
                            <span className="breadcrumb-mrn">{patientData?.mrn || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
                    <button className="btn-primary" onClick={handleSubmit}>
                        <Save size={18} />
                        <span>Save Assessment</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="clinical-portal-content">
                <form onSubmit={handleSubmit} className="assessment-form">
                    <div className="form-grid-layout">
                        {/* Left Column */}
                        <div className="form-column-left">
                            {/* Wound Location Section */}
                            <section className="form-card">
                                <h3 className="card-title">
                                    <Info size={18} />
                                    <span>Wound Location</span>
                                </h3>
                                <div className="card-content">
                                    <div className="tab-buttons">
                                        <button
                                            type="button"
                                            className={`tab-btn ${selectedTab === 'anterior' ? 'active' : ''}`}
                                            onClick={() => { setSelectedTab('anterior'); setSelectedRegion(null); }}
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            type="button"
                                            className={`tab-btn ${selectedTab === 'posterior' ? 'active' : ''}`}
                                            onClick={() => { setSelectedTab('posterior'); setSelectedRegion(null); }}
                                        >
                                            Posterior
                                        </button>
                                    </div>

                                    {/* Body Diagram */}
                                    <div className="body-diagram-container">
                                        <div className="diagram-instruction">Click to mark location</div>
                                        <div className="body-diagram">
                                            <svg viewBox="0 0 200 450" className="body-svg">
                                                <defs>
                                                    <filter id="smooth">
                                                        <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
                                                    </filter>
                                                </defs>

                                                {/* Realistic Human Silhouette */}
                                                {/* Dynamic Silhouette based on View */}
                                                {selectedTab === 'anterior' ? (
                                                    <g fill="#2d3748" filter="url(#smooth)">
                                                        {/* Anterior Organic Silhouette */}
                                                        <path d="
                                                                M 100 12 C 114 12, 124 22, 124 38 C 124 54, 114 62, 100 62 C 86 62, 76 54, 76 38 C 76 22, 86 12, 100 12 Z
                                                                M 92 62 C 93 72, 95 78, 97 82 L 103 82 C 105 78, 107 72, 108 62 Z
                                                                M 97 82 L 72 88 C 68 88, 65 92, 65 100 C 65 130, 72 165, 78 178 L 122 178 C 128 165, 135 130, 135 100 C 135 92, 132 88, 128 88 L 103 82 Z
                                                                M 78 178 C 75 195, 72 215, 72 230 L 128 230 C 128 215, 125 195, 122 178 Z
                                                                M 61 92 C 52 92, 45 95, 42 105 C 38 140, 36 185, 36 245 C 36 260, 44 260, 46 260 C 52 260, 52 250, 52 245 C 52 190, 52 150, 55 115 C 56 102, 58 92, 61 92 Z
                                                                M 139 92 C 148 92, 155 95, 158 105 C 162 140, 164 185, 164 245 C 164 260, 156 260, 154 260 C 148 260, 148 250, 148 245 C 148 190, 148 150, 145 115 C 144 102, 142 92, 139 92 Z
                                                                M 72 230 C 68 280, 65 330, 65 370 C 65 405, 72 435, 75 440 L 93 440 C 91 405, 88 340, 92 270 C 93 255, 95 240, 97 230 Z
                                                                M 128 230 C 132 280, 135 330, 135 370 C 135 405, 128 435, 125 440 L 107 440 C 109 405, 112 340, 108 270 C 107 255, 105 240, 103 230 Z
                                                            " />
                                                        {/* Anterior Anatomical details (Chest/Abdomen lines) */}
                                                        <path d="M 85 110 Q 100 115, 115 110" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
                                                        <path d="M 88 145 Q 100 148, 112 145" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
                                                    </g>
                                                ) : (
                                                    <g fill="#2d3748" filter="url(#smooth)">
                                                        {/* Posterior Organic Silhouette */}
                                                        <path d="
                                                                M 100 12 C 114 12, 124 22, 124 38 C 124 54, 114 62, 100 62 C 86 62, 76 54, 76 38 C 76 22, 86 12, 100 12 Z
                                                                M 92 62 C 93 72, 95 78, 97 82 L 103 82 C 105 78, 107 72, 108 62 Z
                                                                M 97 82 L 72 88 C 68 88, 65 92, 65 100 C 65 130, 72 165, 78 178 L 122 178 C 128 165, 135 130, 135 100 C 135 92, 132 88, 128 88 L 103 82 Z
                                                                M 78 178 C 75 195, 72 215, 72 230 L 128 230 C 128 215, 125 195, 122 178 Z
                                                                M 61 92 C 52 92, 45 95, 42 105 C 38 140, 36 185, 36 245 C 36 260, 44 260, 46 260 C 52 260, 52 250, 52 245 C 52 190, 52 150, 55 115 C 56 102, 58 92, 61 92 Z
                                                                M 139 92 C 148 92, 155 95, 158 105 C 162 140, 164 185, 164 245 C 164 260, 156 260, 154 260 C 148 260, 148 250, 148 245 C 148 190, 148 150, 145 115 C 144 102, 142 92, 139 92 Z
                                                                M 72 230 C 68 280, 65 330, 65 370 C 65 405, 72 435, 75 440 L 93 440 C 91 405, 88 340, 92 270 C 93 255, 95 240, 97 230 Z
                                                                M 128 230 C 132 280, 135 330, 135 370 C 135 405, 128 435, 125 440 L 107 440 C 109 405, 112 340, 108 270 C 107 255, 105 240, 103 230 Z
                                                            " />
                                                        {/* Posterior Anatomical details (Spine/Gluteal lines) */}
                                                        <path d="M 100 85 L 100 200" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
                                                        <path d="M 80 185 C 85 190, 95 190, 100 185 C 105 190, 115 190, 120 185" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
                                                        <path d="M 85 230 C 90 240, 95 242, 100 240 C 105 242, 110 240, 115 230" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" />
                                                    </g>
                                                )}


                                                {/* Clickable regions Overlay */}
                                                {(selectedTab === 'anterior' ? ANTERIOR_REGIONS : POSTERIOR_REGIONS).map((r) =>
                                                    r.r ? (
                                                        <circle
                                                            key={r.id}
                                                            cx={r.cx}
                                                            cy={r.cy}
                                                            r={r.r}
                                                            className={`region ${selectedRegion?.id === r.id ? 'selected' : ''}`}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedRegion(r); }}
                                                            fill="transparent"
                                                        />
                                                    ) : (
                                                        <rect
                                                            key={r.id}
                                                            x={r.x}
                                                            y={r.y}
                                                            width={r.w}
                                                            height={r.h}
                                                            rx="4"
                                                            className={`region ${selectedRegion?.id === r.id ? 'selected' : ''}`}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedRegion(r); }}
                                                            fill="transparent"
                                                        />
                                                    )
                                                )}

                                                {/* Dynamic On-Diagram Marker & Label */}
                                                {selectedRegion && (() => {
                                                    const x = selectedRegion.r ? selectedRegion.cx : selectedRegion.x + selectedRegion.w / 2;
                                                    const y = selectedRegion.r ? selectedRegion.cy : selectedRegion.y + selectedRegion.h / 2;
                                                    const labelDir = x > 100 ? -1 : 1; // Show label to the right if marker is left, and vice versa

                                                    return (
                                                        <g key="marker-group">
                                                            {/* Line to marker (if needed, but image shows it close) */}

                                                            {/* Label Pill */}
                                                            <rect
                                                                x={x + (labelDir * 10) - (labelDir === -1 ? 90 : 0)}
                                                                y={y - 12}
                                                                width="85"
                                                                height="24"
                                                                rx="12"
                                                                fill="#1e293b"
                                                            />
                                                            <text
                                                                x={x + (labelDir * 10) + (labelDir === -1 ? -45 : 42.5)}
                                                                y={y + 4}
                                                                fill="white"
                                                                fontSize="10"
                                                                fontWeight="600"
                                                                textAnchor="middle"
                                                            >
                                                                {selectedRegion.label}
                                                            </text>

                                                            {/* Pulsating Marker Dot */}
                                                            <circle cx={x} cy={y} r="6" fill="#2563eb" stroke="white" strokeWidth="2">
                                                                <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
                                                            </circle>
                                                            <circle cx={x} cy={y} r="12" fill="#2563eb" fillOpacity="0.15">
                                                                <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
                                                            </circle>
                                                        </g>
                                                    );
                                                })()}
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Selection Info */}
                                    <div className="selection-badge">
                                        <div className="badge-icon">
                                            <div className="badge-dot" style={{ background: selectedRegion ? '#2563eb' : '#cbd5e1' }}></div>
                                        </div>
                                        <div>
                                            <div className="badge-label">
                                                {selectedRegion ? `Selected: ${selectedRegion.label}` : 'No location selected'}
                                            </div>
                                            {selectedRegion && (
                                                <button
                                                    type="button"
                                                    className="badge-clear"
                                                    onClick={() => setSelectedRegion(null)}
                                                >
                                                    Clear Selection
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Previous Assessments */}
                                    <div className="previous-assessments-card">
                                        <div className="assessment-icon">
                                            <Camera size={20} />
                                        </div>
                                        <div className="assessment-info">
                                            <div className="assessment-title">Previous Assessments</div>
                                            <div className="assessment-details">
                                                Last assessment on Oct 12, 2023 showed signs of healing. Measurements: 4.2cm x 2.1cm.
                                            </div>
                                            <button type="button" className="assessment-link">View History</button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column */}
                        <div className="form-column-right">
                            {/* Clinical Details */}
                            <section className="form-card">
                                <h3 className="card-title">
                                    <AlertCircle size={18} />
                                    <span>Clinical Details</span>
                                </h3>
                                <div className="card-content">
                                    <div className="form-row-2">
                                        <div className="form-field">
                                            <label>Wound Type</label>
                                            <select name="woundType" value={formData.woundType} onChange={handleChange}>
                                                <option value="">Select Type</option>
                                                <option value="Pressure Ulcer">Pressure Ulcer</option>
                                                <option value="Diabetic Ulcer">Diabetic Ulcer</option>
                                                <option value="Venous Ulcer">Venous Ulcer</option>
                                                <option value="Arterial Ulcer">Arterial Ulcer</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Onset Date</label>
                                            <input
                                                type="date"
                                                name="onsetDate"
                                                value={formData.onsetDate}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row-2">
                                        <div className="form-field">
                                            <label>Wound Stage</label>
                                            <select name="woundStage" value={formData.woundStage} onChange={handleChange}>
                                                <option value="">Select Stage</option>
                                                <option value="Stage 1">Stage 1</option>
                                                <option value="Stage 2">Stage 2</option>
                                                <option value="Stage 3">Stage 3</option>
                                                <option value="Stage 4">Stage 4</option>
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Exudate Amount</label>
                                            <select name="exudateAmount" value={formData.exudateAmount} onChange={handleChange}>
                                                <option value="">Select Amount</option>
                                                <option value="None">None</option>
                                                <option value="Minimal">Minimal</option>
                                                <option value="Moderate">Moderate</option>
                                                <option value="Heavy">Heavy</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Measurements */}
                            <section className="form-card">
                                <h3 className="card-title">
                                    <Camera size={18} />
                                    <span>Measurements</span>
                                </h3>
                                <div className="card-content">
                                    <div className="form-row-3">
                                        <div className="form-field">
                                            <label>Length</label>
                                            <div className="input-with-unit">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    name="length"
                                                    placeholder="0.0"
                                                    value={formData.length}
                                                    onChange={handleChange}
                                                    readOnly={!!aiAnalysis}
                                                    className={aiAnalysis ? 'ai-populated' : ''}
                                                />
                                                <span className="unit">cm</span>
                                                {aiAnalysis && <div className="ai-indicator" title="AI Measured">AI</div>}
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Width</label>
                                            <div className="input-with-unit">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    name="width"
                                                    placeholder="0.0"
                                                    value={formData.width}
                                                    onChange={handleChange}
                                                    readOnly={!!aiAnalysis}
                                                    className={aiAnalysis ? 'ai-populated' : ''}
                                                />
                                                <span className="unit">cm</span>
                                                {aiAnalysis && <div className="ai-indicator" title="AI Measured">AI</div>}
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label>Depth</label>
                                            <div className="input-with-unit">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    name="depth"
                                                    placeholder="0.0"
                                                    value={formData.depth}
                                                    onChange={handleChange}
                                                    readOnly={!!aiAnalysis}
                                                    className={aiAnalysis ? 'ai-populated' : ''}
                                                />
                                                <span className="unit">cm</span>
                                                {aiAnalysis && <div className="ai-indicator" title="AI Measured">AI</div>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pain Level */}
                                    <div className="pain-level-section">
                                        <div className="pain-header">
                                            <label>Pain Level</label>
                                            <span className="pain-value">{formData.painLevel} - Moderate</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10"
                                            name="painLevel"
                                            value={formData.painLevel}
                                            onChange={handleChange}
                                            className="pain-slider"
                                        />
                                        <div className="pain-labels">
                                            <span>No Pain (0)</span>
                                            <span>Severe Pain (10)</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Visual Documentation */}
                            <section className="form-card">
                                <h3 className="card-title">
                                    <Camera size={18} />
                                    <span>Visual Documentation</span>
                                </h3>
                                <div className="card-content">
                                    <div className="upload-section-wrapper">
                                        <div className="upload-zone">
                                            <Upload size={40} className="upload-icon" />
                                            <div className="upload-text">Click to upload or drag and drop</div>
                                            <div className="upload-hint">PNG, JPG up to 10MB</div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="upload-input"
                                            />
                                        </div>

                                        {isAnalyzing && (
                                            <div className="ai-analyzing-overlay" style={{ marginTop: '12px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid #0284c7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                <span style={{ fontSize: '14px', color: '#0369a1', fontWeight: '500' }}>AI is analyzing wound characteristics...</span>
                                            </div>
                                        )}

                                        {analysisError && (
                                            <div className="ai-error-panel" style={{ marginTop: '12px', padding: '16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                                <div style={{ color: '#991b1b', fontSize: '13px', marginBottom: '12px' }}>
                                                    <strong>AI Analysis Error:</strong> {analysisError}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    style={{ fontSize: '12px', padding: '8px 16px' }}
                                                    onClick={() => runAIAnalysis(uploadedImages[0])}
                                                >
                                                    Retry Analysis
                                                </button>
                                            </div>
                                        )}

                                        {aiAnalysis && !isAnalyzing && (
                                            <div className="ai-insights-panel" style={{ marginTop: '12px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <div style={{ background: '#16a34a', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>AI INSIGHTS</div>
                                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>Analysis Complete</span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                                                    <div>
                                                        <div style={{ color: '#15803d', fontWeight: '500' }}>Detected Type</div>
                                                        <div style={{ color: '#166534' }}>{aiAnalysis.wound_type || 'Unknown'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: '#15803d', fontWeight: '500' }}>Suggested Stage</div>
                                                        <div style={{ color: '#166534' }}>{aiAnalysis.stage || 'N/A'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: '#15803d', fontWeight: '500' }}>Dimensions</div>
                                                        <div style={{ color: '#166534' }}>{aiAnalysis.dimensions?.length || 0} x {aiAnalysis.dimensions?.width || 0} cm</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: '#15803d', fontWeight: '500' }}>Tissue Health</div>
                                                        <div style={{ color: '#166534' }}>{aiAnalysis.tissue_composition?.granulation || 0}% Granulation</div>
                                                    </div>
                                                    {reductionRate !== null && (
                                                        <div>
                                                            <div style={{ color: '#15803d', fontWeight: '500' }}>Healing Progress</div>
                                                            <div style={{ color: reductionRate > 0 ? '#16a34a' : '#ef4444', fontWeight: '700' }}>
                                                                {reductionRate}% Area Reduction
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ color: '#15803d', fontWeight: '500' }}>AI Confidence</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <div style={{ flex: 1, height: '6px', background: '#dcfce7', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${aiAnalysis.confidence_score || 0}%`, height: '100%', background: (aiAnalysis.confidence_score || 0) > 80 ? '#16a34a' : '#eab308' }} />
                                                            </div>
                                                            <span style={{ fontWeight: '700', color: '#166534' }}>{aiAnalysis.confidence_score || 0}%</span>
                                                        </div>
                                                    </div>
                                                    {aiAnalysis.healing_index !== undefined && (
                                                        <div>
                                                            <div style={{ color: '#15803d', fontWeight: '500' }}>Health Score</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <div style={{ flex: 1, height: '6px', background: '#dcfce7', borderRadius: '3px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${aiAnalysis.healing_index || 0}%`, height: '100%', background: '#10b981' }} />
                                                                </div>
                                                                <span style={{ fontWeight: '700', color: '#166534' }}>{aiAnalysis.healing_index || 0}%</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setShowAnalysis(!showAnalysis)}
                                                    style={{ marginTop: '16px', width: '100%', padding: '8px', background: 'white', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#15803d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                >
                                                    <Info size={14} />
                                                    {showAnalysis ? 'Hide Algorithm Analysis' : 'Show Algorithm Analysis'}
                                                </button>

                                                {showAnalysis && (
                                                    <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '11px', color: '#475569', maxHeight: '150px', overflowY: 'auto' }}>
                                                        <div style={{ fontWeight: '700', marginBottom: '8px', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ML Processing Steps:</div>
                                                        <ul style={{ paddingLeft: '16px', margin: 0 }}>
                                                            {aiAnalysis.algorithm_analysis?.map((step, i) => (
                                                                <li key={i} style={{ marginBottom: '4px' }}>{step}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {uploadedImages.length > 0 && (
                                            <div className="preview-container">
                                                <div className="preview-header">
                                                    <span className="preview-title">Uploaded Images ({uploadedImages.length})</span>
                                                    {uploadedImages.length > 0 && (
                                                        <button
                                                            type="button"
                                                            className="clear-all-btn"
                                                            onClick={() => setUploadedImages([])}
                                                        >
                                                            Clear All
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="images-grid">
                                                    {uploadedImages.map((img, index) => (
                                                        <div className={`grid-item ${viewerState.index === index ? 'active' : ''}`} onClick={() => setViewerState({ index, zoom: 1, rotation: 0 })}>
                                                            <img src={img} alt={`Wound ${index + 1}`} />

                                                            {/* Mini Area Overlay on Thumbnail */}
                                                            {imageAnnotations[index]?.length > 2 && (
                                                                <svg className="mini-area-overlay" viewBox="0 0 100 100">
                                                                    <polygon
                                                                        points={imageAnnotations[index].map(p => `${p.x},${p.y}`).join(' ')}
                                                                        className="mini-wound-polygon"
                                                                    />
                                                                </svg>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                                                className="grid-remove-btn"
                                                                title="Remove image"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Advanced Image Viewer */}
                                                {viewerState.index !== null && (
                                                    <div className="advanced-viewer">
                                                        <div className="viewer-header">
                                                            <div className="viewer-info">
                                                                <span className="viewer-badge">Active View</span>
                                                                <span className="viewer-name">Image #{viewerState.index + 1}</span>
                                                            </div>
                                                            <div className="viewer-controls">
                                                                <button
                                                                    type="button"
                                                                    className={`control-btn ${viewerState.isPointing ? 'active' : ''}`}
                                                                    onClick={() => handleViewerAction('togglePoint')}
                                                                    title="Add Point"
                                                                >
                                                                    <div className={`point-indicator ${viewerState.isPointing ? 'pulsing' : ''}`} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={`control-btn ${viewerState.isEditing ? 'active' : ''}`}
                                                                    onClick={() => handleViewerAction('toggleEdit')}
                                                                    title="Edit & Enhance"
                                                                >
                                                                    <Camera size={16} />
                                                                </button>
                                                                <div className="control-divider"></div>
                                                                <button type="button" className="control-btn" onClick={() => handleViewerAction('zoomOut')} title="Zoom Out">
                                                                    <ZoomOut size={16} />
                                                                </button>
                                                                <span className="zoom-level">{Math.round(viewerState.zoom * 100)}%</span>
                                                                <button type="button" className="control-btn" onClick={() => handleViewerAction('zoomIn')} title="Zoom In">
                                                                    <ZoomIn size={16} />
                                                                </button>
                                                                <div className="control-divider"></div>
                                                                <button type="button" className="control-btn" onClick={() => handleViewerAction('rotate')} title="Rotate 90°">
                                                                    <RotateCw size={16} />
                                                                </button>
                                                                <div className="control-divider"></div>
                                                                <button type="button" className="control-close" onClick={() => setViewerState({ index: null, zoom: 1, rotation: 0, isPointing: false, isEditing: false })}>
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="viewer-canvas-outer">
                                                            {viewerState.isEditing && (
                                                                <div className="editorial-panel">
                                                                    <div className="panel-section">
                                                                        <label>Brightness</label>
                                                                        <input
                                                                            type="range" min="50" max="200"
                                                                            value={(imageFilters[viewerState.index]?.brightness || 100)}
                                                                            onChange={(e) => updateFilter('brightness', parseInt(e.target.value))}
                                                                        />
                                                                    </div>
                                                                    <div className="panel-section">
                                                                        <label>Contrast</label>
                                                                        <input
                                                                            type="range" min="50" max="250"
                                                                            value={(imageFilters[viewerState.index]?.contrast || 100)}
                                                                            onChange={(e) => updateFilter('contrast', parseInt(e.target.value))}
                                                                        />
                                                                    </div>
                                                                    <div className="quick-filters">
                                                                        <button type="button" onClick={() => { updateFilter('contrast', 180); updateFilter('brightness', 110); }}>Boost</button>
                                                                        <button type="button" onClick={() => updateFilter('grayscale', 100)}>B&W</button>
                                                                        <button type="button" onClick={() => updateFilter('invert', 100)}>Invert</button>
                                                                        <button type="button" className="reset-lnk" onClick={() => handleViewerAction('resetEdits')}>Reset</button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="viewer-canvas">
                                                                <div
                                                                    className={`canvas-constraint ${viewerState.isPointing ? 'pointing-mode' : ''}`}
                                                                >
                                                                    <div
                                                                        className="transform-layer"
                                                                        style={{
                                                                            transform: `scale(${viewerState.zoom}) rotate(${viewerState.rotation}deg)`,
                                                                            transition: 'transform 0.3s ease-out',
                                                                            width: '100%',
                                                                            height: '100%',
                                                                            display: 'flex',
                                                                            justifyContent: 'center',
                                                                            alignItems: 'center',
                                                                            position: 'relative'
                                                                        }}
                                                                    >
                                                                        <div className="viewer-image-container" onClick={handleCanvasClick}>
                                                                            <img
                                                                                src={uploadedImages[viewerState.index]}
                                                                                alt="Focused view"
                                                                                className="viewer-image"
                                                                                style={{
                                                                                    filter: `
                                                                                        brightness(${imageFilters[viewerState.index]?.brightness || 100}%) 
                                                                                        contrast(${imageFilters[viewerState.index]?.contrast || 100}%) 
                                                                                        grayscale(${imageFilters[viewerState.index]?.grayscale || 0}%) 
                                                                                        invert(${imageFilters[viewerState.index]?.invert || 0}%)
                                                                                    `
                                                                                }}
                                                                            />

                                                                            {/* Wound Area Polygon */}
                                                                            {imageAnnotations[viewerState.index]?.length > 2 && (
                                                                                <svg className="wound-area-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                                                    <polygon
                                                                                        points={imageAnnotations[viewerState.index].map(p => `${p.x},${p.y}`).join(' ')}
                                                                                        className="wound-polygon"
                                                                                    />
                                                                                </svg>
                                                                            )}

                                                                            {/* Render Markers */}
                                                                            {(imageAnnotations[viewerState.index] || []).map((pt, i) => (
                                                                                <div
                                                                                    key={i}
                                                                                    className="wound-marker"
                                                                                    style={{
                                                                                        left: `${pt.x}%`,
                                                                                        top: `${pt.y}%`,
                                                                                        transform: `translate(-50%, -50%) rotate(${-viewerState.rotation}deg) scale(${1 / viewerState.zoom})`
                                                                                    }}
                                                                                >
                                                                                    <div className="marker-inner" />
                                                                                    <div className="marker-ring" />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Clinical Notes */}
                            <section className="form-card">
                                <h3 className="card-title">
                                    <Info size={18} />
                                    <span>Clinical Notes</span>
                                </h3>
                                <div className="card-content">
                                    <textarea
                                        name="notes"
                                        placeholder="Add detailed observations regarding tissue type, wound edge, surrounding skin, etc..."
                                        rows="4"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        className="notes-textarea"
                                    ></textarea>
                                </div>
                            </section>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WoundAssessmentDashboard;
