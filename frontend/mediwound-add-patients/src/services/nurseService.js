import NurseAPI from '../API/nurseApi';

export const nurseService = {
    // Tasks
    getTasks: async () => {
        try {
            const response = await NurseAPI.get('tasks/');
            return response.data;
        } catch (error) {
            console.error('Error fetching nurse tasks:', error);
            return [];
        }
    },

    updateTaskStatus: async (taskId, status) => {
        try {
            const response = await NurseAPI.patch(`tasks/${taskId}/`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    },

    createTask: async (data) => {
        try {
            const response = await NurseAPI.post('tasks/', data);
            return response.data;
        } catch (error) {
            console.error('Error creating nurse task:', error);
            throw error;
        }
    },

    // Announcements
    getAnnouncements: async () => {
        try {
            const response = await NurseAPI.get('announcements/');
            return response.data;
        } catch (error) {
            console.error('Error fetching announcements:', error);
            return [];
        }
    },

    // Shift Logs
    getShifts: async () => {
        try {
            const response = await NurseAPI.get('shifts/');
            return response.data;
        } catch (error) {
            console.error('Error fetching shift logs:', error);
            return [];
        }
    },

    startShift: async (ward, shiftType) => {
        try {
            const response = await NurseAPI.post('shifts/start_shift/', { ward, shiftType });
            return response.data;
        } catch (error) {
            console.error('Error starting shift:', error);
            throw error;
        }
    },

    endShift: async (notes) => {
        try {
            const response = await NurseAPI.post('shifts/end_shift/', { notes });
            return response.data;
        } catch (error) {
            console.error('Error ending shift:', error);
            throw error;
        }
    },

    getStats: async () => {
        try {
            const response = await NurseAPI.get('shifts/get_stats/');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return { active_patients: 0, doc_due: 0, scans: 0, completed: 0 };
        }
    },

    getRecentDocumentation: async () => {
        try {
            const response = await NurseAPI.get('shifts/get_recent_documentation/');
            return response.data;
        } catch (error) {
            console.error('Error fetching recent documentation:', error);
            return [];
        }
    }
};
