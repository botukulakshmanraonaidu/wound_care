import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../patients/config';

const useWebSocketChat = (patientId, activeChatMember) => {
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (patientId && activeChatMember?.id) {
            fetchHistory();
        } else {
            setMessages([]);
        }
    }, [patientId, activeChatMember?.id]);

    const fetchHistory = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/chat/?patient_id=${patientId}&partner_id=${activeChatMember.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Map backend messages to frontend format
                const formatted = data.map(msg => ({
                    text: msg.message,
                    sender: msg.sender_role === (localStorage.getItem('userRole') || 'DOCTOR').toLowerCase() ? 'me' : 'other',
                    time: msg.time
                }));
                setMessages(formatted);
            }
        } catch (error) {
            console.error("Failed to fetch chat history:", error);
        }
    };

    const sendMessage = (text) => {
        console.log('Attempting to send via WebSocket:', text);
        return false; // Fallback to REST API for now
    };

    const addManualMessage = (text) => {
        setMessages(prev => [...prev, {
            text,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    };

    return {
        messages,
        sendMessage,
        addManualMessage,
        connectionStatus: isConnected ? 'Connected' : 'Disconnected (REST Fallback)',
        isConnected
    };
};

export default useWebSocketChat;
