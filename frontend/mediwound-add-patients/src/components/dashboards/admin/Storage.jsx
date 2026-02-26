import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../API/adminApi';
import { adminService } from '../../../services/adminService';
import { HardDrive, Upload, FileText, Trash2, PieChart, File, Folder, RefreshCw } from 'lucide-react';
import './Storage.css';

function Storage() {
    const [stats, setStats] = useState(null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async (refresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const params = refresh ? { refresh: 'true' } : {};

            // Re-fetch all data
            const [statsRes, filesData] = await Promise.all([
                adminApi.getSystemStats(params),
                adminApi.getFiles(params)
            ]);

            try {
                // Fetch storage stats with refresh params
                const storageData = await adminApi.getStorageStats(params);
                setStats(storageData.data);
            } catch (sErr) {
                console.warn('Detailed storage stats fetch failed', sErr);
                // Don't fail the whole page, just show zeros for this part
                setStats({
                    used_storage_bytes: 0,
                    used_percentage: 0,
                    total_storage_bytes: 10 * 1024 * 1024 * 1024,
                    breakdown: []
                });
            }

            const filesList = filesData.data;
            setFiles(Array.isArray(filesList) ? filesList : (filesList.results || []));
        } catch (error) {
            console.error('Failed to load storage data', error);
            const msg = error.response ?
                `Server Error (${error.response.status}): ${JSON.stringify(error.response.data)}` :
                `Connection Error: ${error.message}. Please check if the production Backend is reachable.`;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = () => {
        fetchData(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            await adminService.uploadFile({ file, name: file.name });
            await fetchData(); // Refresh list
        } catch (error) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;
        try {
            await adminService.deleteFile(id);
            await fetchData();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    return (
        <div className="storage-container">
            <div className="page-header-flex">
                <h2 className="page-title">Storage Management</h2>
                <button
                    className={`btn-refresh ${loading ? 'spinning' : ''}`}
                    onClick={handleRefresh}
                    disabled={loading}
                    title="Refresh Storage Stats"
                >
                    <RefreshCw size={18} />
                    <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
            </div>

            {error && (
                <div className="storage-error-alert" style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px'
                }}>
                    <strong>Update Error:</strong> {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info-group">
                        <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                            <HardDrive size={20} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{formatBytes(stats?.used_storage_bytes || 0)}</span>
                            <span className="stat-label">Total Cloud Used</span>
                        </div>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${stats?.used_percentage || 0}%`, background: '#3b82f6' }}
                        ></div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info-group">
                        <div className="stat-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}>
                            <PieChart size={20} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats?.file_count || 0}</span>
                            <span className="stat-label">Cloudinary Images</span>
                        </div>
                    </div>
                    <div className="stat-sub-label">Active Media Resources</div>
                </div>

                <div className="stat-card">
                    <div className="stat-info-group">
                        <div className="stat-icon" style={{ background: '#faf5ff', color: '#a855f7' }}>
                            <File size={20} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{files.length}</span>
                            <span className="stat-label">System Reports</span>
                        </div>
                    </div>
                    <div className="stat-sub-label">Managed PDFs & Logs</div>
                </div>

                <div className="stat-card upload-card" onClick={() => document.getElementById('file-upload').click()}>
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                    />
                    <div className="upload-label">
                        <Upload size={24} className={uploading ? 'animate-bounce' : ''} />
                        <span className="upload-text">{uploading ? 'Uploading...' : 'Upload New File'}</span>
                    </div>
                </div>
            </div>

            <div className="storage-layout">
                <div className="files-section">
                    <h3>Services Breakdown</h3>
                    <div className="breakdown-list">
                        {stats?.breakdown?.map((item, index) => (
                            <div key={index} className="breakdown-item">
                                <div className="item-header">
                                    <div className="item-label">
                                        <span className="color-indicator" style={{ backgroundColor: item.color }}></span>
                                        <span className="category-name">{item.category}</span>
                                    </div>
                                    <span className="item-value">{item.label}</span>
                                </div>
                                <div className="item-progress">
                                    <div
                                        className="item-progress-fill"
                                        style={{
                                            width: `${(item.size_bytes / (stats?.total_storage_bytes || 1)) * 100}%`,
                                            backgroundColor: item.color
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="files-section">
                    <h3>System Files</h3>
                    <div className="files-table-wrapper">
                        <table className="files-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Size</th>
                                    <th>Uploaded By</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center">No files uploaded.</td></tr>
                                ) : (
                                    files.map(file => (
                                        <tr key={file.id}>
                                            <td>
                                                <div className="file-name">
                                                    <File size={16} className="text-gray-400" />
                                                    {file.name}
                                                </div>
                                            </td>
                                            <td><span className="badge badge-gray">{file.file_type}</span></td>
                                            <td>{file.size}</td>
                                            <td>{file.uploaded_by_name || 'System'}</td>
                                            <td>{new Date(file.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="btn-icon-danger"
                                                    onClick={() => handleDelete(file.id)}
                                                    title="Delete File"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Storage;
