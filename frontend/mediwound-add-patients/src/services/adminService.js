import AuthAPI from '../API/authApi';

export const adminService = {
    // --- Activity Logs ---
    getLogs: async (params) => {
        try {
            // Use absolute path from root to bypass 'patient/' baseURL
            const response = await AuthAPI.get('/admin_page/logs/', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching logs:', error);
            throw error;
        }
    },

    // --- System Stats ---
    getSystemStats: async () => {
        try {
            const response = await AuthAPI.get('/admin_page/stats/');
            return response.data;
        } catch (error) {
            console.error('Error fetching system stats:', error);
            throw error;
        }
    },

    // --- Storage & Files ---
    getStorageStats: async () => {
        try {
            const response = await AuthAPI.get('/admin_page/storage-stats/');
            return response.data;
        } catch (error) {
            console.error('Error fetching storage stats:', error);
            throw error;
        }
    },

    getFiles: async (params) => {
        try {
            const response = await AuthAPI.get('/admin_page/files/', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching files:', error);
            throw error;
        }
    },

    uploadFile: async (fileData) => {
        try {
            const formData = new FormData();
            formData.append('file', fileData.file);
            formData.append('name', fileData.name);

            const response = await AuthAPI.post('/admin_page/files/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    },

    deleteFile: async (id) => {
        try {
            await AuthAPI.delete(`/admin_page/files/${id}/`);
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
};
