import React, { useEffect, useRef } from 'react';
import './ActivitySidebar.css';

const ActivitySidebar = ({ activity, onClose }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activity]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="activity-sidebar">
      <div className="activity-sidebar-header">
        <h2>Activity</h2>
        <button onClick={onClose} className="close-button">
          ×
        </button>
      </div>
      <div className="activity-content" ref={scrollRef}>
        {activity.length === 0 ? (
          <div className="empty-activity">No activity yet</div>
        ) : (
          activity.map((item) => (
            <div key={item._id} className="activity-item">
              <div className="activity-message">{item.message}</div>
              <div className="activity-meta">
                <span className="activity-user">
                  {item.performedBy?.name || 'Unknown'}
                </span>
                <span className="activity-time">{formatDate(item.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivitySidebar;
