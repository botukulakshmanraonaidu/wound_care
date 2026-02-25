import React, { useState, useEffect } from 'react';
import { Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../patients/config';
import './Assessment.css';

const Assessment = () => {
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssessments();
    }, []);

    const fetchAssessments = async () => {
        const token = localStorage.getItem('access_token');
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/assessments/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAssessments(data);
            }
        } catch (error) {
            console.error("Failed to fetch assessments", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '--:--';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const handleViewReport = (assessment) => {
        // Store in sessionStorage for ReportPreview as fallback
        sessionStorage.setItem('nurse_report_assessment', JSON.stringify(assessment));
        navigate('/reports', { state: { assessment } });
    };

    return (
        <div className="assessments-container">
            <div className="assessments-header">
                <div className="header-info">
                    <h1>Assessment Reports</h1>
                    <p>Access and download detailed clinical assessment data.</p>
                </div>
            </div>

            <div className="assessments-table-wrapper">
                {loading ? (
                    <div className="loading-state" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        Loading assessments...
                    </div>
                ) : (
                    <table className="assessments-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Patient</th>
                                <th>Wound</th>
                                <th>Dimensions</th>
                                <th>Tissue Comp.</th>
                                <th>Health Score</th>
                                <th>AI Conf.</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assessments.length > 0 ? (
                                assessments.map((assessment) => (
                                    <tr key={assessment.id}>
                                        <td className="date-cell">
                                            <div className="date-wrapper">
                                                <Calendar className="date-icon" size={16} />
                                                <div className="date-time">
                                                    <span className="date-text">{formatDate(assessment.created_at)}</span>
                                                    <span className="time-text">{formatTime(assessment.created_at)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="patient-cell">
                                            <div className="patient-info">
                                                <span className="patient-name">{assessment.patient_name} {assessment.patient_last_name}</span>
                                                <span className="patient-mrn">{assessment.patient_mrn}</span>
                                            </div>
                                        </td>
                                        <td className="wound-cell">
                                            <div className="wound-info">
                                                <span className="wound-location">{assessment.body_location || 'Unspecified'}</span>
                                                <span className="wound-type">{assessment.wound_type}</span>
                                            </div>
                                        </td>
                                        <td className="dimensions-cell">
                                            <div className="dimensions-grid">
                                                <div className="dim-item">
                                                    <span className="dim-label">AREA</span>
                                                    <span className="dim-value">{(parseFloat(assessment.length || 0) * parseFloat(assessment.width || 0)).toFixed(1)} cm²</span>
                                                </div>
                                                <div className="dim-item">
                                                    <span className="dim-label">DEPTH</span>
                                                    <span className="dim-value">{assessment.depth || 0} cm</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tissue-cell">
                                            <div className="tissue-progress">
                                                <span className="tissue-label">Granulation</span>
                                                <div className="progress-bar-container">
                                                    <div
                                                        className="progress-fill healing"
                                                        style={{ width: `${assessment.tissue_composition?.granulation || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className="tissue-value">{assessment.tissue_composition?.granulation || 0}%</span>
                                            </div>
                                        </td>
                                        <td className="health-cell">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', minWidth: '60px' }}>
                                                    <div
                                                        style={{ width: `${assessment.healing_index || 0}%`, height: '100%', background: '#10b981' }}
                                                    />
                                                </div>
                                                <span style={{ fontWeight: '600', color: '#059669', fontSize: '13px' }}>{assessment.healing_index || 0}%</span>
                                            </div>
                                        </td>
                                        <td className="conf-cell">
                                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#6366f1' }}>{assessment.confidence_score || 0}%</span>
                                        </td>
                                        <td className="status-cell">
                                            <span className={`status-badge healing`}>
                                                {assessment.stage || 'N/A'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        No assessments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="assessments-footer">
                <span className="results-count">Showing {assessments.length} results</span>
                <div className="pagination">
                    <button className="pagination-btn" disabled><ChevronLeft size={18} /></button>
                    <button className="pagination-btn" disabled><ChevronRight size={18} /></button>
                </div>
            </div>
        </div>
    );
};

export default Assessment;
