import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../API/adminApi';
import { Search, Filter, RefreshCw, CircleAlert, Info, CircleCheck, CircleAlert as AlertOctagon } from 'lucide-react';
import './SystemLogs.css';
import Pagination from '../../common/Pagination';

function SystemLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Helper to get date string in YYYY-MM-DD
    const formatDateISO = (date) => date.toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        search: '',
        severity: '',
        action: '',
        start_date: formatDateISO(new Date(Date.now() - 30 * 86400000)), // 30 days ago
        end_date: formatDateISO(new Date())
    });
    const [error, setError] = useState(null);
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isServerPaginated, setIsServerPaginated] = useState(false);
    const pageSize = 10;

    const fetchLogs = async (pageNum = page) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                ...filters,
                page: pageNum,
                page_size: pageSize
            };
            const response = await adminApi.getActivityLogs(params);
            const data = response.data;
            
            if (data && data.results) {
                setLogs(data.results);
                setTotalCount(data.count || data.results.length);
                setIsServerPaginated(true);
            } else if (Array.isArray(data)) {
                setLogs(data);
                setTotalCount(data.length);
                setIsServerPaginated(false);
            } else {
                setLogs([]);
                setTotalCount(0);
                setIsServerPaginated(false);
            }
        } catch (err) {
            console.error('Failed to load logs', err);
            setError(`Failed to load activity logs: ${err.response?.data?.detail || err.message}`);
            setLogs([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setPage(1);
        fetchLogs(1);
    };

    const clearFilters = () => {
        const today = formatDateISO(new Date());
        const thirtyDaysAgo = formatDateISO(new Date(Date.now() - 30 * 86400000));
        const defaultFilters = {
            search: '',
            severity: '',
            action: '',
            start_date: thirtyDaysAgo,
            end_date: today
        };

        setFilters(defaultFilters);
        setPage(1);
        // fetchLogs will be triggered by the page change or we can call it manually
        setLoading(true);
        setError(null);

        const params = { ...defaultFilters, page: 1, page_size: pageSize };
        adminApi.getActivityLogs(params).then(response => {
            const data = response.data;
            if (data && data.results) {
                setLogs(data.results);
                setTotalCount(data.count || data.results.length);
                setIsServerPaginated(true);
            } else if (Array.isArray(data)) {
                setLogs(data);
                setTotalCount(data.length);
                setIsServerPaginated(false);
            } else {
                setLogs([]);
                setTotalCount(0);
                setIsServerPaginated(false);
            }
        }).catch(err => {
            console.error(err);
            setError('Failed to load activity logs.');
        }).finally(() => setLoading(false));
    };

    const getSeverityIcon = (severity) => {
        switch (severity?.toUpperCase()) {
            case 'ERROR': return <AlertOctagon size={16} color="#ef4444" />;
            case 'WARNING': return <CircleAlert size={16} color="#f59e0b" />;
            case 'INFO': return <Info size={16} color="#3b82f6" />;
            case 'SUCCESS': return <CircleCheck size={16} color="#10b981" />;
            default: return <Info size={16} color="#94a3b8" />;
        }
    };

    return (
        <div className="system-logs-container">
            <div className="logs-header">
                <h2>System Activity Logs</h2>
                <button className="btn-refresh" onClick={fetchLogs} title="Refresh Logs">
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="logs-filters">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        name="search"
                        placeholder="Search logs..."
                        value={filters.search}
                        onChange={handleFilterChange}
                    />
                </div>

                <select name="severity" value={filters.severity} onChange={handleFilterChange} className="filter-select">
                    <option value="">All Severities</option>
                    <option value="INFO">Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="ERROR">Error</option>
                </select>

                <select name="action" value={filters.action} onChange={handleFilterChange} className="filter-select">
                    <option value="">All Actions</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                    <option value="LOGIN">Login</option>
                </select>

                <div className="filter-group">
                    <label>From:</label>
                    <input
                        type="date"
                        name="start_date"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                        className="filter-date"
                    />
                </div>

                <div className="filter-group">
                    <label>To:</label>
                    <input
                        type="date"
                        name="end_date"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                        className="filter-date"
                    />
                </div>

                <div className="filter-actions">
                    <button className="btn-primary" onClick={applyFilters}>Apply Filters</button>
                    <button className="btn-secondary" onClick={clearFilters}>Clear</button>
                </div>
            </div>

            <div className="logs-table-wrapper">
                <table className="logs-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Severity</th>
                            <th>Action</th>
                            <th>User</th>
                            <th>IP Address</th>
                            <th>Target</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="text-center">Loading logs...</td></tr>
                        ) : error ? (
                            <tr><td colSpan="6" className="text-center text-red-500">{error}</td></tr>
                        ) : (isServerPaginated ? logs : logs.slice((page - 1) * pageSize, page * pageSize)).length === 0 ? (
                            <tr><td colSpan="7" className="text-center">No logs found.</td></tr>
                        ) : (
                            (() => {
                                const rows = [];
                                let lastDate = null;

                                (isServerPaginated ? logs : logs.slice((page - 1) * pageSize, page * pageSize)).forEach((log, index) => {
                                    const logDate = new Date(log.timestamp);
                                    const dateStr = logDate.toLocaleDateString();

                                    // Check if we need a date header
                                    if (dateStr !== lastDate) {
                                        const today = new Date().toLocaleDateString();
                                        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

                                        let headerText = dateStr;
                                        if (dateStr === today) headerText = "Today";
                                        else if (dateStr === yesterday) headerText = "Yesterday";
                                        else {
                                            headerText = logDate.toLocaleDateString(undefined, {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            });
                                        }

                                        rows.push(
                                            <tr key={`header-${dateStr}`} className="log-date-header">
                                                <td colSpan="7">{headerText}</td>
                                            </tr>
                                        );
                                        lastDate = dateStr;
                                    }

                                    rows.push(
                                        <tr key={log.id || index}>
                                            <td className="whitespace-nowrap text-sm text-gray-500">
                                                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    {getSeverityIcon(log.severity)}
                                                    <span className={`badge badge-${(log.severity || 'info').toLowerCase()}`}>{log.severity || 'INFO'}</span>
                                                </div>
                                            </td>
                                            <td><span className="font-medium text-slate-700">{log.action || 'ACTIVITY'}</span></td>
                                            <td>
                                                <span className="text-sm text-gray-900">{log.user_name || log.user_email || 'System'}</span>
                                            </td>
                                            <td className="text-sm font-mono text-gray-500">
                                                {log.ip_address || '-'}
                                            </td>
                                            <td className="text-sm text-gray-600">{log.target_user || '-'}</td>
                                            <td className="log-description text-sm text-gray-600" title={log.description || ''}>
                                                {log.description || 'No details provided'}
                                            </td>
                                        </tr>
                                    );
                                });
                                return rows;
                            })()
                        )}
                    </tbody>
                </table>
            </div>
            
            <Pagination 
                currentPage={page}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                loading={loading}
            />
        </div>
    );
}

export default SystemLogs;
