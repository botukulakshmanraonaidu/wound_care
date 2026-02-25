import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Clock, CheckCircle, AlertCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { patientService } from '../../../services/patientService';
import { nurseService } from '../../../services/nurseService';

export const ShiftTaskList = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                setLoading(true);
                const data = await nurseService.getTasks();
                setTasks(data);
            } catch (err) {
                console.error("Failed to fetch nurse tasks", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const toggleStatus = async (id, currentStatus) => {
        try {
            const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
            await nurseService.updateTaskStatus(id, nextStatus);
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
        } catch (err) {
            alert("Failed to update task status");
        }
    };

    if (loading) return <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading shift tasks...</p>;

    return (
        <div className="placeholder-task-list">
            {tasks.map((t) => (
                <div
                    key={t.id}
                    className="placeholder-list-item"
                    onClick={() => toggleStatus(t.id, t.status)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid #f1f5f9',
                        marginBottom: '12px',
                        background: t.status === 'completed' ? '#f8fafc' : 'white',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.status === 'completed' ? '#22c55e' : '#e2e8f0' }} />
                        <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: t.status === 'completed' ? '#64748b' : '#0f172a' }}>{t.title}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{t.due_time}</p>
                        </div>
                    </div>
                    {t.status === 'completed' ? <CheckCircle size={18} color="#22c55e" /> : <Clock size={18} color="#94a3b8" />}
                </div>
            ))}
            {tasks.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No shift tasks found.</p>}
        </div>
    );
};

export const MyPatientsList = ({ searchQuery }) => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                setLoading(true);
                const data = await patientService.getPatients('my');
                setPatients(data);
            } catch (err) {
                console.error("Failed to fetch nurse's patients", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, []);

    const filtered = patients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Loading patients...</p>;
    }

    return (
        <div className="placeholder-patient-list">
            {filtered.map((p) => (
                <div
                    key={p.id}
                    className="placeholder-list-item"
                    onClick={async () => {
                        await patientService.clearNotifications(p.id);
                        navigate('/reports');
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid #f1f5f9',
                        marginBottom: '12px',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                        <User size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{p.firstName} {p.lastName}</p>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: p.status === 'Critical' ? '#ef4444' : '#22c55e', padding: '2px 8px', borderRadius: '4px', background: p.status === 'Critical' ? '#fef2f2' : '#f0fdf4' }}>{p.status.toUpperCase()}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Room {p.roomNumber} • MRN: {p.mrn}</p>
                    </div>
                    <ChevronRight size={18} color="#94a3b8" />
                </div>
            ))}
            {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No patients assigned.</p>}
        </div>
    );
};

export const StaffNotice = () => {
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const data = await nurseService.getAnnouncements();
                setAnnouncements(data);
            } catch (err) {
                console.error("Failed to fetch announcements", err);
            }
        };
        fetchAnnouncements();
    }, []);

    return (
        <div className="section-card" style={{ background: 'linear-gradient(to right, #f8fafc, #eff6ff)', border: '1px solid #dbeafe' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <AlertCircle color="#2563eb" size={20} />
                <h3 className="section-title" style={{ margin: 0 }}>STAFF ANNOUNCEMENTS</h3>
            </div>
            {announcements.map((a) => (
                <div key={a.id} style={{ padding: '16px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{a.title}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{a.message}</p>
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                            {a.author_name ? a.author_name.substring(0, 2).toUpperCase() : '??'}
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{a.author_name} • {new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            ))}
            {announcements.length === 0 && <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>No active announcements.</p>}
        </div>
    );
};

export const PatientIntakeModal = ({ onClose, onSuccess }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '440px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '20px' }}>
                <User size={28} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Patient Intake</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>Fill in the details to register a new patient for wound monitoring.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>FULL NAME</label>
                    <input type="text" placeholder="e.g. John Doe" style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '14px', color: '#475569', background: 'white' }}>Cancel</button>
                <button onClick={() => { onSuccess?.(); onClose(); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, fontSize: '14px' }}>Register Patient</button>
            </div>
        </div>
    </div>
);

export const WoundUploadModal = ({ onClose, onSuccess }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '440px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '20px' }}>
                <CheckCircle size={28} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Wound Analysis</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>Take or upload a clinical photo for AI-powered tissue segmentation.</p>

            <div style={{ height: '160px', borderRadius: '16px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', marginBottom: '24px', cursor: 'pointer', background: '#f8fafc' }}>
                <CheckCircle color="#94a3b8" size={32} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Click to upload or drag & drop</span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '14px', color: '#475569', background: 'white' }}>Close</button>
                <button onClick={() => { onSuccess?.(); onClose(); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 700, fontSize: '14px' }}>Analyze Photo</button>
            </div>
        </div>
    </div>
);

export const VitalsModal = ({ onClose, onSuccess }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '440px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', marginBottom: '20px' }}>
                <Clock size={28} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Record Vitals</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>Quickly log patient vitals for the current shift.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>TEMP (°C)</label>
                    <input type="number" placeholder="36.5" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>BLOOD PRESSURE</label>
                    <input type="text" placeholder="120/80" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '14px', color: '#475569', background: 'white' }}>Cancel</button>
                <button onClick={() => { onSuccess?.(); onClose(); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#22c55e', color: 'white', border: 'none', fontWeight: 700, fontSize: '14px' }}>Save Vitals</button>
            </div>
        </div>
    </div>
);
