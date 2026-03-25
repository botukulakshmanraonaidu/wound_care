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
import Pagination from '../../common/Pagination';

const ChangeBoard = ({ limit = 10, showFilters = true }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isServerPaginated, setIsServerPaginated] = useState(false);
    const pageSize = limit || 10;

    const fetchLogs = async (pageNum = page) => {
        setLoading(true);
        try {
            const params = {
                page: pageNum,
                page_size: pageSize,
                search: searchTerm,
                action: filterAction !== 'all' ? filterAction : undefined
            };
            const response = await adminApi.getActivityLogs(params);
            const fetchedData = response.data;
            
            if (fetchedData && fetchedData.results) {
                setLogs(fetchedData.results);
                setTotalCount(fetchedData.count || fetchedData.results.length);
                setIsServerPaginated(true);
            } else if (Array.isArray(fetchedData)) {
                setLogs(fetchedData);
                setTotalCount(fetchedData.length);
                setIsServerPaginated(false);
            } else {
                setLogs([]);
                setTotalCount(0);
                setIsServerPaginated(false);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching activity logs:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
    }, [searchTerm, filterAction, limit]);

    useEffect(() => {
        fetchLogs(page);
    }, [page, searchTerm, filterAction, limit]);

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

    // Filtering is now handled on the server side if supported
    const displayedLogs = isServerPaginated ? logs : logs.slice((page - 1) * pageSize, page * pageSize);

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
                        {displayedLogs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="no-data">No activity logs found</td>
                            </tr>
                        ) : (
                            displayedLogs.map((log) => (
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

            {showFilters && (
                <Pagination 
                    currentPage={page}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={(p) => setPage(p)}
                    loading={loading}
                />
            )}

            {!showFilters && logs.length > 0 && (
                <div className="board-footer">
                    <a href="/logs" className="view-all-link">View All System Activity</a>
                </div>
            )}
        </div>
    );
};

export default ChangeBoard;
