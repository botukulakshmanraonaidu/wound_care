import React, { useState, useEffect } from 'react';
import {
    Activity,
    User,
    Calendar,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Search,
    AlertCircle,
    CheckCircle2,
    Clock,
    UserPlus,
    UserMinus,
    Edit3
} from 'lucide-react';
import './ChangeBoard.css';
import { adminApi } from '../../../API/adminApi';

const ChangeBoard = ({ limit = 10, showFilters = true }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await adminApi.getActivityLogs();
                const fetchedData = response.data;
                const fetchedLogs = Array.isArray(fetchedData) ? fetchedData : (fetchedData.results || []);

                // If limit is provided, slice the data
                setLogs(limit ? fetchedLogs.slice(0, limit) : fetchedLogs);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching activity logs:', error);
                setLoading(false);
            }
        };

        fetchLogs();
    }, [limit]);

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE': return <UserPlus size={16} className="text-green-500" />;
            case 'UPDATE': return <Edit3 size={16} className="text-blue-500" />;
            case 'DELETE': return <UserMinus size={16} className="text-red-500" />;
            case 'LOGIN': return <Clock size={16} className="text-purple-500" />;
            default: return <Activity size={16} className="text-gray-500" />;
        }
    };

    const getActionBadgeClass = (action) => {
        switch (action) {
            case 'CREATE': return 'badge-create';
            case 'UPDATE': return 'badge-update';
            case 'DELETE': return 'badge-delete';
            case 'LOGIN': return 'badge-login';
            default: return 'badge-default';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredLogs = logs.filter(log => {
        const searchStr = searchTerm.toLowerCase();

        const matchesSearch =
            (log.user_email?.toLowerCase() || '').includes(searchStr) ||
            (log.target_user?.toLowerCase() || '').includes(searchStr) ||
            (log.description?.toLowerCase() || '').includes(searchStr);

        const matchesAction = filterAction === 'all' || log.action === filterAction;

        return matchesSearch && matchesAction;
    });

    if (loading) {
        return <div className="loading-state">Loading activity logs...</div>;
    }

    return (
        <div className="change-board">
            {showFilters && (
                <div className="board-header">
                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search activity..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filters">
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="action-select"
                        >
                            <option value="all">All Actions</option>
                            <option value="CREATE">Created</option>
                            <option value="UPDATE">Updated</option>
                            <option value="DELETE">Deleted</option>
                            <option value="LOGIN">Logins</option>
                        </select>
                        <button className="btn-export-mini">
                            <Download size={16} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="board-table-container">
                <table className="board-table">
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Admin / System</th>
                            <th>Description</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="no-data">No activity logs found</td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id}>
                                    <td>
                                        <div className={`action-badge ${getActionBadgeClass(log.action)}`}>
                                            {getActionIcon(log.action)}
                                            <span>{log.action}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-mini">
                                                {log.user_email === 'system' ? <Activity size={12} /> : <User size={12} />}
                                            </div>
                                            <span>{log.user_email}</span>
                                        </div>
                                    </td>
                                    <td className="desc-cell">{log.description}</td>
                                    <td className="time-cell">
                                        <Clock size={14} />
                                        <span>{formatDate(log.timestamp)}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!showFilters && logs.length > 0 && (
                <div className="board-footer">
                    <a href="/logs" className="view-all-link">View All System Activity</a>
                </div>
            )}
        </div>
    );
};

export default ChangeBoard;
