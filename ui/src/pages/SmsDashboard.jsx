import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp, Search, Play } from 'lucide-react';
import { apiClient } from '../api/client';
import './SmsDashboard.css';

export default function SmsDashboard() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);
  
  // Filters & Search
  const [searchPhone, setSearchPhone] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Action Loading states
  const [retryingIds, setRetryingIds] = useState(new Set());

  const fetchLogs = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError('');
      const data = await apiClient.getSmsLogs();
      setLogs(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch SMS logs');
      console.error('Fetch SMS logs error:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto refresh logs every 5 seconds to track real-time delivery status & retries
    const interval = setInterval(() => {
      fetchLogs(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (logId, e) => {
    e.stopPropagation(); // Avoid expanding/collapsing row when clicking button
    try {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.add(logId);
        return next;
      });
      await apiClient.retrySms(logId);
      // Immediately refresh logs
      await fetchLogs(false);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to retry SMS');
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
    }
  };

  const toggleExpand = (logId) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    const matchesPhone = log.phone_number.toLowerCase().includes(searchPhone.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : log.status === statusFilter;
    return matchesPhone && matchesStatus;
  });

  return (
    <div className="sms-dashboard-page">
      <div className="dashboard-header glass-panel">
        <div className="header-left">
          <button onClick={() => navigate('/')} className="back-btn">
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="gradient-text">SMS Delivery Outbox</h1>
        </div>
        <button onClick={() => fetchLogs()} className="refresh-btn" disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="dashboard-filters glass-panel">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by phone number..."
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
          />
        </div>
        <div className="status-selector">
          <span>Status:</span>
          <button
            className={statusFilter === 'all' ? 'active' : ''}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={statusFilter === 'sent' ? 'active' : ''}
            onClick={() => setStatusFilter('sent')}
          >
            Sent
          </button>
          <button
            className={statusFilter === 'pending' ? 'active' : ''}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button
            className={statusFilter === 'failed' ? 'active' : ''}
            onClick={() => setStatusFilter('failed')}
          >
            Failed
          </button>
        </div>
      </div>

      {error && <div className="error-banner glass-panel">{error}</div>}

      <div className="logs-container glass-panel">
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} />
            <p>{loading ? 'Loading SMS logs...' : 'No SMS logs found matching the filters.'}</p>
          </div>
        ) : (
          <div className="logs-table">
            <div className="table-header">
              <div className="col-status">Status</div>
              <div className="col-recipient">Recipient</div>
              <div className="col-provider">Gateway</div>
              <div className="col-retries">Retries</div>
              <div className="col-date">Date Sent</div>
              <div className="col-actions"></div>
            </div>

            {filteredLogs.map(log => {
              const isExpanded = expandedLogId === log.id;
              const isRetrying = retryingIds.has(log.id);
              
              let statusIcon = <Clock className="status-pending" size={18} />;
              let statusClass = 'status-pending-badge';
              
              if (log.status === 'sent' || log.status === 'delivered') {
                statusIcon = <CheckCircle2 className="status-success" size={18} />;
                statusClass = 'status-success-badge';
              } else if (log.status === 'failed') {
                statusIcon = <AlertCircle className="status-failed" size={18} />;
                statusClass = 'status-failed-badge';
              }

              return (
                <div key={log.id} className={`log-row-container ${isExpanded ? 'expanded' : ''}`}>
                  <div className="log-row" onClick={() => toggleExpand(log.id)}>
                    <div className="col-status">
                      <span className={`status-badge ${statusClass}`}>
                        {statusIcon}
                        {log.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="col-recipient font-mono">{log.phone_number}</div>
                    <div className="col-provider font-mono">{log.provider}</div>
                    <div className="col-retries">{log.retry_count} / 3</div>
                    <div className="col-date">{new Date(log.created_at).toLocaleString()}</div>
                    <div className="col-actions">
                      <div className="actions-wrapper">
                        {log.status === 'failed' && (
                          <button
                            onClick={(e) => handleRetry(log.id, e)}
                            className="btn-retry"
                            disabled={isRetrying}
                            title="Retry sending SMS"
                          >
                            <Play size={12} /> {isRetrying ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="log-details font-mono">
                      <div className="detail-item">
                        <strong>Message:</strong>
                        <p className="detail-message">{log.message}</p>
                      </div>
                      
                      {log.error_message && (
                        <div className="detail-item error-text">
                          <strong>Error Details:</strong>
                          <p>{log.error_message}</p>
                        </div>
                      )}

                      <div className="detail-item">
                        <strong>Raw Provider Response:</strong>
                        <pre>{log.provider_response ? JSON.stringify(JSON.parse(log.provider_response), null, 2) : 'No provider response received.'}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
