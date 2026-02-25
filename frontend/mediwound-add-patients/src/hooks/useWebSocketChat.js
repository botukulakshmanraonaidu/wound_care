import { useState, useEffect, useCallback, useRef } from 'react';
import AuthAPI from '../API/authApi';

const useWebSocketChat = (patientId, activeChatPartner) => {
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const partnerId = activeChatPartner?.id;
    const pollingIntervalRef = useRef(null);
    const currentUserId = localStorage.getItem('userId');

    // ✅ Clear messages immediately when the chat partner changes
    useEffect(() => {
        setMessages([]);
        setIsConnected(false);
    }, [partnerId]);

    const fetchMessages = useCallback(async () => {
        if (!patientId || !partnerId) {
            console.log('[Chat] fetchMessages skipped: ', { patientId, partnerId });
            return;
        }

        try {
            console.log(`[Chat] Fetching messages: patient=${patientId}, partner=${partnerId}, me=${currentUserId}`);
            const response = await AuthAPI.get(`api/chat/?patient_id=${patientId}&partner_id=${partnerId}`);
            if (response.status === 200) {
                const data = response.data;
                console.log(`[Chat] Fetched ${data.length} messages`);
                const formatted = data.map(msg => ({
                    id: msg.id,
                    text: msg.message,
                    sender: msg.sender_name,
                    senderId: msg.sender,
                    senderRole: msg.sender_role,
                    time: msg.time,
                    isMe: String(msg.sender) === String(currentUserId)
                }));
                setMessages(formatted);
                setIsConnected(true);
            }
        } catch (error) {
            console.error('[Chat] Failed to fetch chat messages:', error);
            setIsConnected(false);
        }
    }, [patientId, partnerId, currentUserId]);

    // Initial fetch and start polling
    useEffect(() => {
        if (patientId && partnerId) {
            console.log('[Chat] Starting polling for', { patientId, partnerId });
            fetchMessages();
            pollingIntervalRef.current = setInterval(fetchMessages, 5000); // Poll every 5 seconds
        }

        return () => {
            if (pollingIntervalRef.current) {
                console.log('[Chat] Stopping polling');
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [patientId, partnerId, fetchMessages]);

    const sendMessage = async (text) => {
        if (!patientId || !partnerId || !text.trim()) {
            const reason = !patientId ? 'Missing patient ID' : !partnerId ? 'No chat partner selected' : 'Message is empty';
            console.warn('[Chat] sendMessage aborted:', reason, { patientId, partnerId });
            return { success: false, error: reason };
        }

        try {
            console.log(`[Chat] Sending message: to=${partnerId}, patient=${patientId}`);
            const payload = {
                patient: parseInt(patientId),
                receiver: parseInt(partnerId),
                message: text
            };
            console.log('[Chat] POSTing payload:', payload);

            const response = await AuthAPI.post('api/chat/', payload);
            console.log('[Chat] Send response status:', response.status);

            if (response.status === 201 || response.status === 200) {
                fetchMessages();
                return { success: true };
            }
            return { success: false, error: `Server returned ${response.status}` };
        } catch (error) {
            console.error('[Chat] Failed to send message:', error);
            let errorMsg = 'Check your internet connection';
            if (error.response) {
                console.error('[Chat] Server error:', error.response.status, error.response.data);
                const data = error.response.data;
                if (data && typeof data === 'object') {
                    errorMsg = Object.entries(data)
                        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
                        .join(' | ');
                } else if (data && typeof data === 'string') {
                    errorMsg = data;
                } else {
                    errorMsg = `Server error ${error.response.status}`;
                }
            }
            return { success: false, error: errorMsg || 'Unknown error' };
        }
    };

    const addManualMessage = (text) => {
        setMessages(prev => [...prev, {
            text,
            sender: 'Me',
            isMe: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    };

    return {
        messages,
        sendMessage,
        addManualMessage,
        connectionStatus: isConnected ? 'Connected (Polling)' : 'Disconnected/Searching...',
        isConnected
    };
};

export default useWebSocketChat;
