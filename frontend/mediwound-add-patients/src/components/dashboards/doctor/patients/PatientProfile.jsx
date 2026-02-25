import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PatientProfile.css';
import useWebSocketChat from '../../../../hooks/useWebSocketChat';
import { patientService } from '../../../../services/patientService';
import AuthAPI from '../../../../API/authApi';

const PatientProfile = ({ patient, onBack, onNewAssessment, onEditPatient, user, onNotificationRefresh }) => {
    const navigate = useNavigate();

    console.log('[PatientProfile] Rendered with patient:', { id: patient?.id, mrn: patient?.mrn, firstName: patient?.firstName });

    const [patientAssessments, setPatientAssessments] = useState([]);
    const [vitals, setVitals] = useState({ bp: '120/80', hr: '72', temp: '36.6', spo2: '98', time: '08:00 AM' });
    const [careTeam, setCareTeam] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [availableNurses, setAvailableNurses] = useState([]);
    const [availableDoctors, setAvailableDoctors] = useState([]);

    // UI State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    // Form State
    const [selectedNurseId, setSelectedNurseId] = useState('');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDue, setNewTaskDue] = useState('Today, 05:00 PM');
    const [chatMessage, setChatMessage] = useState('');
    const [activeChatMember, setActiveChatMember] = useState(null);
    const chatContainerRef = React.useRef(null);
    const { messages: chatHistory, isConnected, sendMessage: performSendMessage } = useWebSocketChat(patient?.id, activeChatMember);

    // Auto-scroll chat to bottom when messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }

        // Clear notifications when chat is opened for this patient
        if (isChatModalOpen && patient?.id) {
            patientService.clearNotifications(patient.id);
        }
    }, [chatHistory, isChatModalOpen, patient?.id]);

    useEffect(() => {
        if (patient?.id) {
            fetchAssessments();
            fetchCareTeam();
            fetchTasks();
            if (user?.role?.toLowerCase() === 'doctor') {
                fetchAvailableNurses();
            } else if (user?.role?.toLowerCase() === 'nurse') {
                fetchAvailableDoctors();
            }
            // Mock vitals for now
            setVitals({ bp: '120/80', hr: '72', temp: '36.6', spo2: '98', time: '08:00 AM' });
        }
    }, [patient]);

    const fetchAssessments = async () => {
        try {
            const response = await AuthAPI.get(`api/assessments/?patient_id=${patient.id}`);
            if (response.status === 200) {
                setPatientAssessments(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch assessments", error);
        }
    };

    const fetchCareTeam = async () => {
        const team = [];
        // Add Doctor
        if (patient?.assignedDoctor) {
            const doc = patient.assignedDoctor;
            team.push({
                id: doc.id,
                name: doc.full_name || doc.email,
                role: 'Lead Physician',
                initials: (doc.full_name || doc.email).substring(0, 2).toUpperCase(),
                color: '#e0e7ff',
                text: '#3730a3'
            });
        }
        // Add Nurse
        if (patient?.assignedNurse) {
            const nurse = patient.assignedNurse;
            team.push({
                id: nurse.id,
                name: nurse.full_name || nurse.email,
                role: 'Wound Specialist',
                initials: (nurse.full_name || nurse.email).substring(0, 2).toUpperCase(),
                color: '#dcfce7',
                text: '#166534'
            });
        }
        setCareTeam(team);
    };

    const fetchTasks = async () => {
        try {
            const response = await AuthAPI.get(`api/patients/${patient.id}/tasks/`);
            if (response.status === 200) {
                setTasks(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        }
    };

    const fetchAvailableNurses = async () => {
        try {
            const response = await AuthAPI.get('api/patients/nurses/');
            if (response.status === 200) {
                const nurses = response.data;
                // Ensure each nurse has a name property for the dropdown
                const formattedNurses = nurses.map(n => ({
                    ...n,
                    displayName: n.full_name || n.name || n.email
                }));
                setAvailableNurses(formattedNurses);
            }
        } catch (error) {
            console.error("Failed to fetch nurses", error);
        }
    };

    const fetchAvailableDoctors = async () => {
        try {
            const response = await AuthAPI.get('api/patients/doctors/');
            if (response.status === 200) {
                const doctors = response.data;
                const formattedDoctors = doctors.map(d => ({
                    id: d.id,
                    name: d.full_name || d.email,
                    role: d.specialization || 'Medical Officer',
                    initials: (d.full_name || d.email).substring(0, 2).toUpperCase(),
                    color: '#e0e7ff',
                    text: '#3730a3'
                }));
                setAvailableDoctors(formattedDoctors);
            }
        } catch (error) {
            console.error("Failed to fetch doctors", error);
        }
    };

    const openAssignModal = () => {
        setIsAssignModalOpen(true);
    };

    const handleAssignSelf = async () => {
        try {
            // Update patient to set current doctor as assigning physician
            const response = await AuthAPI.patch(`api/patients/${patient.id}/`, {
                assigning_physician: user.name || user.username
            });
            if (response.status === 200) {
                // Clear notifications for this patient
                await AuthAPI.post('api/patients/notifications/clear_by_patient/', {
                    patient_id: patient.id
                });

                if (onNotificationRefresh) onNotificationRefresh();
                alert("You have assigned yourself as the Lead Physician.");
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to assign self", error);
            alert("Failed to assign self. Please try again.");
        }
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!selectedNurseId) return;
        setIsAssigning(true);
        try {
            // Update patient with assigned nurse - Use the standard patients API
            const response = await AuthAPI.patch(`api/patients/${patient.id}/`, {
                assigned_nurse_id: selectedNurseId
            });
            if (response.status === 200) {
                // Clear notifications for this patient
                await AuthAPI.post('api/patients/notifications/clear_by_patient/', {
                    patient_id: patient.id
                });

                if (onNotificationRefresh) onNotificationRefresh();

                // Auto-complete "Initial Patient Review" task if exists
                const reviewTask = tasks.find(t => t.title === "Initial Patient Review" && !t.completed);
                if (reviewTask) {
                    try {
                        await AuthAPI.patch(`api/patients/tasks/${reviewTask.id}/`, {
                            completed: true
                        });
                        console.log("Auto-completed Initial Patient Review task");
                    } catch (err) {
                        console.error("Failed to auto-complete review task", err);
                    }
                }

                // Manually update care team view
                const assignedNurse = availableNurses.find(n => String(n.id) === String(selectedNurseId));
                if (assignedNurse) {
                    const nurseMember = {
                        id: assignedNurse.id,
                        name: assignedNurse.displayName || assignedNurse.full_name || assignedNurse.name,
                        role: 'Wound Specialist',
                        initials: (assignedNurse.displayName || assignedNurse.full_name || assignedNurse.name || 'Nu').substring(0, 2).toUpperCase(),
                        color: '#dcfce7',
                        text: '#166534'
                    };

                    setCareTeam(prev => {
                        // Remove any existing nurse and add the new one
                        const others = prev.filter(m => m.role !== 'Wound Specialist');
                        return [...others, nurseMember];
                    });
                }

                setIsAssignModalOpen(false);
                setSelectedNurseId('');
                // fetchCareTeam(); // Removed because it relies on stale 'patient' prop
            } else {
                alert(response.data?.message || "Failed to assign nurse");
            }
        } catch (error) {
            console.error("Failed to assign nurse", error);
            alert("Error assigning nurse");
        } finally {
            setIsAssigning(false);
        }
    };

    const addTask = () => setIsTaskModalOpen(true);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (newTaskTitle.trim()) {
            try {
                const response = await AuthAPI.post(`api/patients/${patient.id}/tasks/`, {
                    title: newTaskTitle,
                    due: newTaskDue || 'Today, 05:00 PM',
                    completed: false
                });
                if (response.status === 201 || response.status === 200) {
                    fetchTasks();
                    setNewTaskTitle('');
                    setNewTaskDue('Today, 05:00 PM');
                    setIsTaskModalOpen(false);
                }
            } catch (error) {
                console.error("Failed to create task", error);
            }
        }
    };

    const toggleTask = async (taskId, completed) => {
        try {
            const response = await AuthAPI.patch(`api/patients/tasks/${taskId}/`, {
                completed: !completed
            });
            if (response.status === 200) {
                fetchTasks();
            }
        } catch (error) {
            console.error("Failed to update task", error);
        }
    };

    const openChat = (member) => {
        console.log('[PatientProfile] openChat called with member:', member);
        if (!member || !member.id) {
            console.error('[PatientProfile] Cannot open chat: member ID is missing');
            alert("This team member does not have a valid chat ID.");
            return;
        }
        setActiveChatMember(member);
        setChatMessage('');
        setIsChatModalOpen(true);
    };

    const closeChat = () => {
        setIsChatModalOpen(false);
        setChatMessage('');
        setActiveChatMember(null);
    };

    const openDefaultChat = () => {
        // Find the lead physician or any first team member to start chat
        if (careTeam.length > 0) {
            openChat(careTeam[0]);
        } else {
            alert("No care team members available to chat.");
        }
    };

    const sendChatMessage = async (e) => {
        e.preventDefault();
        const msgText = chatMessage.trim();
        if (!msgText) return;

        // ✅ Optimistic clear - the user sees instant feedback
        setChatMessage('');

        console.log('[PatientProfile] sendChatMessage triggered:', {
            msgText,
            activeChatMemberId: activeChatMember?.id,
            patientId: patient?.id
        });
        try {
            const result = await performSendMessage(msgText);
            console.log('[PatientProfile] performSendMessage result:', result);

            if (result && result.success) {
                if (onNotificationRefresh) onNotificationRefresh();
            } else {
                // Restore the message on failure so user can retry
                setChatMessage(msgText);
                alert(`Failed to send message: ${result?.error || 'Unknown error'}`);
            }
        } catch (err) {
            setChatMessage(msgText);
            console.error('[PatientProfile] Critical error in sendChatMessage:', err);
            alert("A critical error occurred while sending the message.");
        }
    };

    const handleDownloadReport = async (assessmentId) => {
        try {
            const response = await AuthAPI.get(`api/assessments/${assessmentId}/download_report/`, {
                responseType: 'blob'
            });
            if (response.status === 200) {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const a = document.createElement('a');
                a.href = url;
                a.download = `Assessment_Report_${assessmentId}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("Report is not ready yet. Generating it now...");
            }
        } catch (error) {
            console.error("Download failed", error);
        }
    };

    // Calculate age
    const getAge = (dob) => {
        if (!dob) return '';
        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        return `${dob} (${age}y)`;
    };

    const latestAssessment = patientAssessments.length > 0 ? patientAssessments[0] : null;

    const fullPatientData = {
        name: `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'Unknown Patient',
        mrn: patient?.mrn || 'N/A',
        dob: getAge(patient?.dateOfBirth),
        bed: patient?.roomNumber || 'Unassigned',

        // Conditions/Diagnosis
        conditions: patient?.conditions || (patient?.diagnosis ? [{ label: patient.diagnosis, type: 'info' }] : []),

        // Contact Info
        contact: {
            phone: patient?.contactNumber || '--',
            phoneLabel: 'Mobile',
            address: patient?.address || '--',
            addressLabel: 'Primary Residence',
            emergency: patient?.emergencyContactName || '--',
            emergencyPhone: patient?.emergencyContactNumber || '--',
            emergencyLabel: 'Emergency Contact'
        },

        vitals: {
            bp: vitals.bp,
            hr: vitals.hr,
            temp: vitals.temp,
            spo2: vitals.spo2,
            time: vitals.time
        },

        alerts: [],
        tasks: tasks,
        latestNote: {
            author: latestAssessment ? 'Clinician' : 'System',
            text: latestAssessment?.notes || 'Patient record created.'
        },
        team: careTeam,
        timeline: (() => {
            const events = [];

            // 1. Add Assessments
            patientAssessments.forEach(a => {
                const d = new Date(a.created_at);
                events.push({
                    type: 'ASSESSMENT',
                    date: d,
                    title: 'Wound Assessment',
                    desc: a.notes || 'Routine wound assessment performed.',
                    imageCount: a.images?.length || 0,
                    hasReport: true
                });
            });

            // 2. Add Completed Tasks (Medicare procedures)
            tasks.filter(t => t.completed).forEach(t => {
                const d = new Date(t.updated_at || t.created_at);
                events.push({
                    type: 'TASK',
                    date: d,
                    title: t.title,
                    desc: 'Procedure completed and verified by clinical staff.'
                });
            });

            // 3. Add Admission Event
            if (patient?.admissionDate) {
                events.push({
                    type: 'ADMISSION',
                    date: new Date(patient.admissionDate),
                    title: 'Patient Admitted',
                    desc: `Patient admitted to Ward ${patient.ward || 'N/A'}. Full clinical evaluation initiated.`
                });
            }

            // Sort all events descending (newest first)
            events.sort((a, b) => b.date - a.date);

            return events.map(event => {
                const d = event.date;
                const isToday = d.toDateString() === new Date().toDateString();
                const timeStr = isToday
                    ? `Today, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

                return { ...event, time: timeStr };
            });
        })()
    };

    // Helper to format assessment for card
    const getWoundCardData = (assess) => {
        const area = (assess.length && assess.width) ? (parseFloat(assess.length) * parseFloat(assess.width)).toFixed(1) : null;
        return {
            type: assess.wound_type?.replace('_', ' ').toUpperCase() || 'WOUND ASSESSMENT',
            stage: assess.stage || 'Stage 1',
            id: `#${assess.id}`,
            reduction: (assess.reduction_rate !== null && assess.reduction_rate !== undefined) ? `${assess.reduction_rate}%` : 'Initial',
            healingScore: (assess.healing_index !== null && assess.healing_index !== undefined) ? `${assess.healing_index}%` : '--%',
            size: area ? `${area} cm²` : '-- cm²',
            exudate: assess.exudate || 'None',
            tissueType: assess.tissue_composition ?
                `Gran: ${assess.tissue_composition.granulation || 0}%\nSlough: ${assess.tissue_composition.slough || 0}%\nNecro: ${assess.tissue_composition.necrotic || 0}%` :
                '0% Granulation',
            lastAssessment: new Date(assess.created_at).toLocaleDateString(),
            confidence: (assess.confidence_score !== null && assess.confidence_score !== undefined) ? `${assess.confidence_score}%` : 'N/A',
            image: assess.images && assess.images.length > 0
                ? (assess.images[0].full_image.startsWith('http')
                    ? assess.images[0].full_image
                    : `${API_BASE_URL.replace('/patient', '')}${assess.images[0].full_image}`)
                : null
        };
    };

    return (
        <div className="patient-profile-container">
            <div className="breadcrumb">
                <span className="breadcrumb-item link" onClick={onBack}>Home</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="breadcrumb-separator">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span className="breadcrumb-item link" onClick={onBack}>Patients</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="breadcrumb-separator">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span className="breadcrumb-item active">{fullPatientData.name}</span>
            </div>

            {/* Header Section */}
            <div className="patient-profile-header">
                <div className="header-content">
                    <div className="avatar-wrapper">
                        <div className="avatar-placeholder">
                            {patient?.firstName?.[0]}{patient?.lastName?.[0]}
                        </div>
                        <div className="status-dot"></div>
                    </div>

                    <div className="patient-info-main">
                        <div className="name-row">
                            <h1>{fullPatientData.name}</h1>
                        </div>

                        <div className="details-row">
                            <div className="detail-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                </svg>
                                <span className="label">MRN:</span>
                                <span className="value">{fullPatientData.mrn}</span>
                            </div>
                            <div className="detail-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span className="value">{fullPatientData.dob}</span>
                            </div>
                            <div className="detail-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                                <span className="label">Bed:</span>
                                <span className="value">{fullPatientData.bed}</span>
                            </div>
                        </div>

                        <div className="badges-row">
                            {fullPatientData.conditions.map((cond, idx) => (
                                <span key={idx} className={`condition-badge ${cond.type}`}>
                                    {cond.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="header-actions">
                    <button className="chat-shortcut-btn" onClick={openDefaultChat}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        CHAT
                    </button>
                    {(user?.role === 'DOCTOR' || user?.role === 'ADMIN') && (
                        <button className="edit-details-btn" onClick={() => onEditPatient(fullPatientData)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit Details
                        </button>
                    )}
                    {user?.role !== 'NURSE' && (
                        <button className="new-assessment-btn" onClick={() => {
                            // Store patient data for clinical portal
                            sessionStorage.setItem('clinical_portal_patient', JSON.stringify(patient));
                            navigate('/clinical-portal');
                        }}>
                            <span className="plus-icon">+</span> New Assessment
                        </button>
                    )}
                </div>
            </div>

            {/* Main Dashboard Grid - 3 Columns */}
            <div className="profile-dashboard-grid">

                {/* Column 1: Vitals, Team, Contact (Left Sidebar) */}
                <div className="dashboard-col-left">

                    {/* Vitals */}
                    <div className="card vitals-card">
                        <div className="card-header">
                            <h3>Latest Vitals</h3>
                            <span className="timestamp">Today, {fullPatientData.vitals.time}</span>
                        </div>
                        <div className="vitals-grid">
                            <div className="vital-item">
                                <label>BP</label>
                                <div className="vital-val">{fullPatientData.vitals.bp}</div>
                                <span className="vital-status normal">➔ Normal</span>
                            </div>
                            <div className="vital-item">
                                <label>HR</label>
                                <div className="vital-val">{fullPatientData.vitals.hr} <span className="unit">bpm</span></div>
                                <span className="vital-status normal">➔ Normal</span>
                            </div>
                            <div className="vital-item">
                                <label>TEMP</label>
                                <div className="vital-val">{fullPatientData.vitals.temp} <span className="unit">°C</span></div>
                                <span className="vital-status normal">➔ Normal</span>
                            </div>
                            <div className="vital-item">
                                <label>SPO2</label>
                                <div className="vital-val">{fullPatientData.vitals.spo2}<span className="unit">%</span></div>
                                <span className="vital-status normal">➔ Normal</span>
                            </div>
                        </div>
                    </div>

                    <div className="card care-team-card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Care Team</h3>
                            {(user?.role?.toLowerCase() === 'doctor' || user?.role?.toLowerCase() === 'admin') && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {!(patient?.assigning_physician === user?.name || patient?.assigning_physician === user?.username) && (
                                        <button onClick={handleAssignSelf} className="assign-mini-btn" style={{ background: '#10b981' }}>ASSIGN ME</button>
                                    )}
                                    <button onClick={openAssignModal} className="assign-mini-btn">ASSIGN NURSE</button>
                                </div>
                            )}
                        </div>
                        <div className="team-list">
                            {careTeam.length > 0 ? careTeam.map((member, idx) => (
                                <div key={idx} className="team-member" onClick={() => openChat(member)} style={{ cursor: 'pointer' }}>
                                    <div className="member-avatar" style={{ backgroundColor: member.color, color: member.text }}>
                                        {member.initials}
                                    </div>
                                    <div className="member-info">
                                        <span className="member-name">{member.name}</span>
                                        <span className="member-role">{member.role}</span>
                                    </div>
                                    <div className="chat-indicator">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                    </div>
                                </div>
                            )) : (
                                <div className="team-empty">No members assigned</div>
                            )}
                        </div>

                        {user?.role?.toLowerCase() === 'nurse' && availableDoctors.length > 0 && (
                            <>
                                <div className="card-header" style={{ marginTop: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                                    <h3>Medical Team</h3>
                                </div>
                                <div className="team-list">
                                    {availableDoctors.filter(d => !careTeam.some(m => m.id === d.id)).map((member, idx) => (
                                        <div key={idx} className="team-member" onClick={() => openChat(member)} style={{ cursor: 'pointer' }}>
                                            <div className="member-avatar" style={{ backgroundColor: member.color, color: member.text }}>
                                                {member.initials}
                                            </div>
                                            <div className="member-info">
                                                <span className="member-name">{member.name}</span>
                                                <span className="member-role">{member.role}</span>
                                            </div>
                                            <div className="chat-indicator">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}


                    </div>

                    {/* Contact Information */}
                    <div className="card contact-card">
                        <div className="card-header">
                            <h3>Contact Information</h3>
                        </div>
                        <div className="contact-list">
                            <div className="contact-item">
                                <div className="contact-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                </div>
                                <div className="contact-details">
                                    <span className="contact-label">{fullPatientData.contact.phoneLabel}:</span>
                                    <span className="contact-value">{fullPatientData.contact.phone}</span>
                                </div>
                            </div>
                            <div className="contact-item">
                                <div className="contact-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                </div>
                                <div className="contact-details">
                                    <span className="contact-label">{fullPatientData.contact.addressLabel}:</span>
                                    <span className="contact-value">{fullPatientData.contact.address}</span>
                                </div>
                            </div>
                            <div className="contact-item">
                                <div className="contact-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                </div>
                                <div className="contact-details">
                                    <span className="contact-label">{fullPatientData.contact.emergencyLabel}:</span>
                                    <span className="contact-value">{fullPatientData.contact.emergency} • {fullPatientData.contact.emergencyPhone}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Wounds & Timeline (Center) */}
                <div className="dashboard-col-center">
                    {/* Active Wounds Section */}
                    <div className="section-header">
                        <h3>Active Wounds</h3>
                        <a href="#" className="view-map-link">View Body Map</a>
                    </div>

                    {patientAssessments.length > 0 ? (
                        patientAssessments.map(assess => {
                            const activeWound = getWoundCardData(assess);
                            return (
                                <div className="wound-card" key={assess.id} style={{ marginBottom: '24px' }}>
                                    <div className="wound-image-col">
                                        {activeWound.image ? (
                                            <img src={activeWound.image} alt="Wound" className="wound-img" />
                                        ) : (
                                            <div className="wound-img-placeholder" style={{
                                                width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b'
                                            }}>
                                                <span>No Image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="wound-info-col">
                                        <div className="wound-header-row">
                                            <div className="wound-title-block">
                                                <span className="stage-badge stage-3">{activeWound.stage}</span>
                                                <span className="wound-id">{activeWound.id}</span>
                                            </div>
                                            <div className="reduction-badge" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    {activeWound.healingScore !== '--%' && (
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span className="reduction-val" style={{ color: '#16a34a', fontSize: '16px' }}>{activeWound.healingScore}</span>
                                                            <div className="reduction-label" style={{ fontSize: '9px' }}>HEALTH SCORE</div>
                                                        </div>
                                                    )}
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span className="reduction-val">{activeWound.reduction}</span>
                                                        <div className="reduction-label">{activeWound.reduction === 'Initial' ? 'PROGRESS' : 'REDUCTION'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <h2 className="wound-type-title">{activeWound.type}</h2>
                                        <div className="wound-metrics-grid">
                                            <div className="metric-box">
                                                <label>Size (Area)</label>
                                                <div className="metric-val">{activeWound.size}</div>
                                            </div>
                                            <div className="metric-box">
                                                <label>Exudate</label>
                                                <div className="metric-val">{activeWound.exudate}</div>
                                            </div>
                                            <div className="metric-box">
                                                <label>Tissue Type</label>
                                                <div className="metric-val" style={{ whiteSpace: 'pre-line' }}>{activeWound.tissueType}</div>
                                            </div>
                                            <div className="metric-box">
                                                <label>Last Assessment</label>
                                                <div className="metric-val">{activeWound.lastAssessment}</div>
                                            </div>
                                        </div>
                                        <div className="wound-action-row">
                                            {assess.cure_recommendation && (
                                                <div className="ai-recommendation-block">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <div className="ai-recommendation-tag">AI RECOMMENDATION</div>
                                                    </div>
                                                    <p className="ai-recommendation-text">{assess.cure_recommendation}</p>
                                                </div>
                                            )}
                                            <div className="ai-confidence">
                                                <div className="ai-icon">AI</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>AI Analysis:</span>
                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                        <span>Conf: <strong>{activeWound.confidence}</strong></span>
                                                        <span>Health: <strong>{activeWound.healingScore}</strong></span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="download-report-btn"
                                                    onClick={() => navigate('/reports', { state: { assessment: assess } })}
                                                    style={{
                                                        background: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '6px',
                                                        padding: '6px 12px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                    Report
                                                </button>
                                                <button className="analyze-link" onClick={() => navigate('/reports', { state: { assessment: assess } })}>Analyze &rarr;</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                            No assessments found for this patient.
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="care-timeline-section">
                        <h3>Care Timeline</h3>
                        <div className="timeline-list">
                            {fullPatientData.timeline && fullPatientData.timeline.length > 0 ? fullPatientData.timeline.map((item, idx) => (
                                <div key={idx} className="timeline-item">
                                    <div className="timeline-left">
                                        <div className={`timeline-dot ${item.type.toLowerCase()} ${idx === 0 ? 'active' : ''}`}>
                                            {item.type === 'ADMISSION' && '🏠'}
                                            {item.type === 'TASK' && '✅'}
                                            {item.type === 'ASSESSMENT' && '🩺'}
                                        </div>
                                        {idx !== fullPatientData.timeline.length - 1 && <div className="timeline-line"></div>}
                                    </div>
                                    <div className="timeline-content">
                                        <div className="timeline-time">{item.time}</div>
                                        <h4 className="timeline-title">{item.title}</h4>
                                        <p className="timeline-desc">{item.desc}</p>

                                        {(item.imageCount > 0 || item.hasReport) && (
                                            <div className="timeline-badges" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                {item.imageCount > 0 && (
                                                    <span className="timeline-pill">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                                            <circle cx="12" cy="13" r="4"></circle>
                                                        </svg>
                                                        {item.imageCount} {item.imageCount === 1 ? 'Image' : 'Images'}
                                                    </span>
                                                )}
                                                {item.hasReport && (
                                                    <span
                                                        className="timeline-pill"
                                                        onClick={() => {
                                                            const assess = patientAssessments.find(a => new Date(a.created_at).getTime() === item.date.getTime());
                                                            if (assess) navigate('/reports', { state: { assessment: assess } });
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                        title="Download Assessment Report"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
                                                        </svg>
                                                        PDF Report
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="timeline-empty">No recent activity</div>
                            )}
                        </div>
                        <div className="view-history-container">
                            <a href="#" className="view-full-history">View Full History</a>
                        </div>
                    </div>
                </div>

                {/* Column 3: Alerts, Tasks, Note (Right Sidebar) */}
                <div className="dashboard-col-right">
                    {/* Active Alerts */}
                    {fullPatientData.alerts && fullPatientData.alerts.length > 0 && fullPatientData.alerts.map((alert, idx) => (
                        <div key={idx} className={`alert-card ${alert.type}`}>
                            <div className="alert-header">
                                <span className="alert-tag">{alert.type === 'high' ? 'HIGH PRIORITY' : 'ATTENTION'}</span>
                            </div>
                            <h4>{alert.title}</h4>
                            <p>{alert.desc}</p>
                            {alert.link && <a href="#" className="alert-link">{alert.link}</a>}
                        </div>
                    ))}

                    {/* Pending Tasks */}
                    <div className="card pending-tasks-card">
                        <div className="card-header">
                            <h3>Pending Tasks</h3>
                            <span className="counter-badge">{fullPatientData.tasks.filter(t => !t.completed).length}</span>
                        </div>
                        <div className="task-list">
                            {fullPatientData.tasks && fullPatientData.tasks.length > 0 ? fullPatientData.tasks.map((task, idx) => (
                                <div key={idx} className={`task-item ${task.completed ? 'completed' : ''}`}>
                                    <div className="checkbox-wrapper">
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => toggleTask(task.id)}
                                        />
                                    </div>
                                    <div className="task-details" style={{ opacity: task.completed ? 0.6 : 1 }}>
                                        <span className="task-name" style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                                            {task.title}
                                        </span>
                                        <span className="task-due">Due: {task.due}</span>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ padding: '12px', color: '#94a3b8' }}>No pending tasks</div>
                            )}
                        </div>
                        <button className="add-task-btn" onClick={addTask}>+ Add Task</button>
                    </div>

                    {/* Latest Note */}
                    <div className="card latest-note-card">
                        <div className="card-header">
                            <h3>Latest Note</h3>
                            <span className="author-name">{fullPatientData.latestNote.author}</span>
                        </div>
                        <p className="note-text">{fullPatientData.latestNote.text}</p>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isTaskModalOpen && (
                <div className="modal-overlay" onClick={() => setIsTaskModalOpen(false)}>
                    <div className="modal-card task-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Add New Task
                            </h3>
                            <button className="close-btn" onClick={() => setIsTaskModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleAddTask}>
                            <div className="form-group">
                                <label>Task Description</label>
                                <textarea
                                    placeholder="e.g. Schedule follow-up MRI..."
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Due Date / Time</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Today, 05:00 PM"
                                    value={newTaskDue}
                                    onChange={e => setNewTaskDue(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Add Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAssignModalOpen && (
                <div className="modal-overlay" onClick={() => setIsAssignModalOpen(false)}>
                    <div className="modal-card task-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b', marginRight: '8px' }}>
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                Assign Nurse to Patient
                            </h3>
                            <button className="close-btn" onClick={() => setIsAssignModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleAssignSubmit}>
                            <div className="form-group">
                                <label>Select Nurse</label>
                                <select
                                    value={selectedNurseId}
                                    onChange={e => setSelectedNurseId(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                >
                                    <option value="">Choose from available nurses...</option>
                                    {availableNurses.map(nurse => (
                                        <option key={nurse.id} value={nurse.id}>
                                            {nurse.displayName} {nurse.department ? `(${nurse.department})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsAssignModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={isAssigning}>
                                    {isAssigning ? 'Assigning...' : 'Assign to Team'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isChatModalOpen && (
                <div className="modal-overlay" onClick={closeChat}>
                    <div className="modal-card chat-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header chat-header">
                            <div className="chat-user-info">
                                <div className="member-avatar" style={{ backgroundColor: activeChatMember?.color, color: activeChatMember?.text }}>
                                    {activeChatMember?.initials}
                                </div>
                                <div>
                                    <h3>{activeChatMember?.name}</h3>
                                    <span className="online-status">Online</span>
                                </div>
                            </div>
                            <button className="close-btn" onClick={closeChat}>×</button>
                        </div>
                        <div className="chat-body" id="chat-history-container" ref={chatContainerRef}>
                            {chatHistory.length > 0 ? chatHistory.map((msg, i) => (
                                <div key={i} className={`chat-bubble ${msg.isMe ? 'me' : 'other'}`}>
                                    {!msg.isMe && <div className="bubble-name" style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '2px', opacity: 0.8 }}>{msg.sender}</div>}
                                    {msg.text}
                                    <div className="bubble-time">{msg.time}</div>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 'auto', marginBottom: 'auto', padding: '0 20px' }}>
                                    Clinical messages are ephemeral. Connection is encrypted.
                                </div>
                            )}
                        </div>
                        <form className="chat-footer" onSubmit={sendChatMessage}>
                            <input
                                type="text"
                                placeholder="Type your message..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                            />
                            <button type="submit" className="send-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientProfile;
