import React from 'react';
import { ChevronRight, Printer, Edit, Share2, ZoomIn, ZoomOut, Download, FileText } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import './ReportPreview.css';
import { API_BASE_URL } from '../patients/config';

function ReportPreview() {
    const location = useLocation();
    const navigate = useNavigate();

    // Use state to keep the assessment data across re-renders
    const [assessment, setAssessment] = React.useState(() => {
        // Primary: router state (doctor dashboard sets this)
        if (location.state?.assessment) {
            return location.state.assessment;
        }
        // Fallback: sessionStorage (nurse dashboard sets this before navigating)
        const stored = sessionStorage.getItem('nurse_report_assessment');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Clean up sessionStorage after reading
                sessionStorage.removeItem('nurse_report_assessment');
                return parsed;
            } catch (_) {
                return null;
            }
        }
        return null;
    });

    const patientId = assessment?.patient;

    const patientData = {
        name: assessment?.patient_name
            ? `${assessment.patient_name} ${assessment.patient_last_name || ''}`.trim()
            : assessment?.patient?.name || "Patient Not Found",
        mrn: assessment?.patient_mrn || assessment?.patient?.mrn || "N/A",
        dob: assessment?.patient_dob || assessment?.patient?.dob || "N/A",
        location: assessment?.body_location || "N/A"
    };

    const assessmentInfo = {
        reportId: `Assessment Report #${assessment?.id || 'NEW'}`,
        date: assessment?.created_at ? new Date(assessment.created_at).toLocaleString() : "N/A",
        status: "Finalized"
    };

    const measurements = [
        { metric: "Max Length", value: assessment?.length != null ? `${assessment.length} cm` : "--", change: "-", improvement: null },
        { metric: "Max Width", value: assessment?.width != null ? `${assessment.width} cm` : "--", change: "-", improvement: null },
        { metric: "Avg Depth", value: assessment?.depth != null ? `${assessment.depth} cm` : "--", change: "-", improvement: null },
    ];

    const mlResult = assessment?.ml_analysis_result || {};
    // Extract tissue composition from top-level field (serializer) or nested ML result
    const compData = assessment?.tissue_composition || mlResult.tissue_composition || {};

    const tissueComposition = [
        { label: "Granulation", value: compData.granulation || 0, color: "#22c55e" },
        { label: "Slough", value: compData.slough || 0, color: "#f59e0b" },
        { label: "Necrotic", value: compData.necrotic || 0, color: "#ef4444" },
    ];

    const handleDownloadReport = async () => {
        if (!assessment?.id) return;
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/assessments/${assessment.id}/download_report/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Assessment_Report_${assessment.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("Report is not ready yet. Please try again in a moment.");
            }
        } catch (error) {
            console.error("Download failed", error);
        }
    };

    return (
        <div className="report-preview-container">
            {/* Breadcrumbs */}
            <div className="report-breadcrumbs">
                <Link to="/patients" className="breadcrumb-nav-link">Patients</Link>
                <ChevronRight size={14} />
                <Link to={patientId ? `/patients/profile/${patientId}` : "/patients"} className="breadcrumb-nav-link">
                    {patientData.name}
                </Link>
                <ChevronRight size={14} />
                <span className="current">Report Preview</span>
            </div>

            {/* Control Bar */}
            <div className="report-control-bar">
                <h2 className="report-title">{assessmentInfo.reportId}</h2>
                <div className="report-controls">
                    <div className="zoom-controls">
                        <button className="icon-btn"><ZoomOut size={18} /></button>
                        <span className="zoom-level">100%</span>
                        <button className="icon-btn"><ZoomIn size={18} /></button>
                    </div>
                    <div className="pagination-controls">
                        <button className="nav-btn">{"<"}</button>
                        <span className="page-count">1 / 3</span>
                        <button className="nav-btn">{">"}</button>
                    </div>
                    <div className="action-buttons">
                        <button className="btn btn-outline" onClick={() => navigate(patientId ? `/patients/profile/${patientId}` : "/patients")}>
                            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                            <span>Back to Patient</span>
                        </button>
                        <button className="btn btn-outline">
                            <Edit size={16} />
                            <span>Edit</span>
                        </button>
                        <button className="btn btn-primary" onClick={handleDownloadReport}>
                            <Download size={16} />
                            <span>Export PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Document */}
            <div className="report-document-wrapper">
                <div className="report-document">
                    {/* Watermark */}
                    <div className="document-watermark">
                        <svg width="400" height="400" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M51.3996 30.5735C49.6494 30.5735 47.9708 31.2688 46.7332 32.5064C45.4956 33.744 44.8003 35.4226 44.8003 37.1728V44.8721H38.2009C36.4507 44.8721 34.7721 45.5674 33.5345 46.805C32.2969 48.0426 31.6016 49.7212 31.6016 51.4715V64.6042C31.6016 66.3544 32.2969 68.033 33.5345 69.2706C34.7721 70.5082 36.4507 71.2035 38.2009 71.2035H44.8003V77.8029C44.8003 79.5532 45.4956 81.2317 46.7332 82.4693C47.9708 83.707 49.6494 84.4023 51.3996 84.4023H64.5984C66.3486 84.4023 68.0272 83.707 69.2648 82.4693C70.5024 81.2317 71.1977 79.5532 71.1977 77.8029V71.2035H77.7971C79.5473 71.2035 81.2259 70.5082 82.4635 69.2706C83.7011 68.033 84.3964 66.3544 84.3964 64.6042V51.4055C84.3964 49.6552 83.7011 47.9766 82.4635 46.739C81.2259 45.5014 79.5473 44.8061 77.7971 44.8061H71.1977V37.1728C71.1977 35.4226 70.5024 33.744 69.2648 32.5064C68.0272 31.2688 66.3486 30.5735 64.5984 30.5735H51.3996Z" fill="#2D63A9" />
                        </svg>
                    </div>

                    {/* Document Header */}
                    <div className="document-header" style={{ alignItems: 'center', marginBottom: '40px', paddingBottom: '25px', paddingLeft: '0' }}>
                        <div className="brand-logo" style={{ gap: '4px', marginLeft: '-25px' }}>
                            <div className="logo-icon" style={{ background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="72" height="72" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M51.3996 30.5735C49.6494 30.5735 47.9708 31.2688 46.7332 32.5064C45.4956 33.744 44.8003 35.4226 44.8003 37.1728V44.8721H38.2009C36.4507 44.8721 34.7721 45.5674 33.5345 46.805C32.2969 48.0426 31.6016 49.7212 31.6016 51.4715V64.6042C31.6016 66.3544 32.2969 68.033 33.5345 69.2706C34.7721 70.5082 36.4507 71.2035 38.2009 71.2035H44.8003V77.8029C44.8003 79.5532 45.4956 81.2317 46.7332 82.4693C47.9708 83.707 49.6494 84.4023 51.3996 84.4023H64.5984C66.3486 84.4023 68.0272 83.707 69.2648 82.4693C70.5024 81.2317 71.1977 79.5532 71.1977 77.8029V71.2035H77.7971C79.5473 71.2035 81.2259 70.5082 82.4635 69.2706C83.7011 68.033 84.3964 66.3544 84.3964 64.6042V51.4055C84.3964 49.6552 83.7011 47.9766 82.4635 46.739C81.2259 45.5014 79.5473 44.8061 77.7971 44.8061H71.1977V37.1728C71.1977 35.4226 70.5024 33.744 69.2648 32.5064C68.0272 31.2688 66.3486 30.5735 64.5984 30.5735H51.3996Z" fill="#2D63A9" />
                                </svg>
                            </div>
                            <div className="brand-text-stack">
                                <div className="logo-text" style={{ fontSize: '24px', fontWeight: '900', lineHeight: '1.1', color: '#0F172A', letterSpacing: '-0.5px' }}>Wound Assessment Tool</div>
                                <div className="brand-subtitle" style={{ fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Hospital - Grade Diagnostics</div>
                            </div>
                        </div>
                        <div className="report-info" style={{ textAlign: 'right' }}>
                            <div className="doc-meta" style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>
                                Generated on {assessmentInfo.date}
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <span className="status-badge" style={{ padding: '6px 16px', fontSize: '12px', fontWeight: '800', background: '#F0FDF4', color: '#166534', borderRadius: '20px', border: '1px solid #DCFCE7', textTransform: 'uppercase' }}>Finalized Report</span>
                            </div>
                        </div>
                    </div>

                    {/* Patient Details Table */}
                    <div className="patient-details-grid">
                        <div className="detail-item">
                            <label>NAME</label>
                            <div className="detail-value">{patientData.name}</div>
                        </div>
                        <div className="detail-item">
                            <label>MRN</label>
                            <div className="detail-value">{patientData.mrn}</div>
                        </div>
                        <div className="detail-item">
                            <label>DOB</label>
                            <div className="detail-value">{patientData.dob}</div>
                        </div>
                        <div className="detail-item">
                            <label>LOCATION</label>
                            <div className="detail-value">{patientData.location}</div>
                        </div>
                    </div>

                    <div className="assessment-grid">
                        {/* Left Column: Visual Assessment & Measurements */}
                        <div className="assessment-col">
                            <div className="assessment-section">
                                <h3 className="section-title">
                                    <span className="section-number">1</span> Visual Assessment
                                </h3>
                                <div className="visual-scan-placeholder" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'transparent', height: 'auto', border: 'none' }}>
                                    {assessment?.images && assessment.images.length > 0 ? (
                                        assessment.images.map((img, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                                <img
                                                    src={img.full_image}
                                                    alt={`Wound assessment ${idx + 1}`}
                                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                                />
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', fontSize: '10px' }}>
                                                    Captured on {new Date(img.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '40px', background: '#f8fafc', borderRadius: '8px', border: '2px dashed #e2e8f0', color: '#94a3b8', textAlign: 'center' }}>
                                            No assessment images available
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="assessment-section">
                                <h3 className="section-title">
                                    <span className="section-number">2</span> Measurements
                                </h3>
                                <table className="measurements-table">
                                    <thead>
                                        <tr>
                                            <th>METRIC</th>
                                            <th>VALUE</th>
                                            <th>CHANGE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {measurements.map((m, i) => (
                                            <tr key={i}>
                                                <td>{m.metric}</td>
                                                <td>{m.value}</td>
                                                <td className={m.improvement === true ? "trend-up" : m.improvement === false ? "trend-down" : ""}>
                                                    {m.change}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right Column: Tissue Composition & AI Analysis */}
                        <div className="assessment-col">
                            <div className="assessment-section">
                                <h3 className="section-title">
                                    <span className="section-number">3</span> Tissue Composition
                                </h3>
                                <div className="composition-list">
                                    {tissueComposition.map((item, i) => (
                                        <div key={i} className="composition-item">
                                            <div className="comp-label">
                                                <span>{item.label}</span>
                                                <span className="comp-value">{item.value}%</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="assessment-section">
                                <h3 className="section-title">
                                    <span className="section-number">4</span> AI Analysis Notes
                                </h3>
                                <div className="analysis-notes">
                                    <div className="note-group">
                                        <h4>AI Wound Analysis:</h4>
                                        <p>{assessment?.ml_analysis_result?.wound_type || 'N/A' || 'Pressure Ulcer'} - {assessment?.ml_analysis_result?.stage || 'N/A' || 'Stage 2'}</p>
                                    </div>
                                    <div className="note-group">
                                        <h4>Clinical Notes:</h4>
                                        <p>{assessment?.notes || 'No notes provided.'}</p>
                                    </div>
                                    {assessment?.cure_recommendation && (
                                        <div className="note-group" style={{ borderLeft: '4px solid #0284c7', paddingLeft: '12px', background: '#f0f9ff' }}>
                                            <h4 style={{ color: '#0369a1' }}>Recommended Cure Process:</h4>
                                            <p style={{ color: '#0c4a6e', fontWeight: '500' }}>{assessment?.cure_recommendation}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="document-footer">
                        <span>Page 1 of 1</span>
                        <span>Confidential Medical Record • Do Not Distribute</span>
                        <span>ID: RPT-{patientData.mrn}-{assessment?.id || 'NEW'}</span>
                    </div>
                </div>
            </div>

            {!assessment && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ color: '#0f172a', marginBottom: '12px' }}>Loading Report Data...</h2>
                        <p style={{ color: '#64748b' }}>If the report doesn't load in a few seconds, please try opening it again from the dashboard.</p>
                        <button className="btn btn-primary" onClick={() => window.history.back()} style={{ marginTop: '20px' }}>Go Back</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReportPreview;
