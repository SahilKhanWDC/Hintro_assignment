import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { adminService } from '../../services/adminService';
import './AdminPanel.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsData, activeUsersData] = await Promise.all([
        adminService.getSystemStats(),
        adminService.getActiveUsers()
      ]);
      setStats(statsData);
      setActiveUsers(activeUsersData.users || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
      if (error.response?.status === 403) {
        navigate('/dashboard');
      }
    }
  }, [navigate]);

  const loadActiveUsers = useCallback(async () => {
    try {
      const data = await adminService.getActiveUsers();
      setActiveUsers(data.users || []);
    } catch (error) {
      console.error('Error loading active users:', error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllUsers(page, 20, searchTerm);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadData();
    const interval = setInterval(loadActiveUsers, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [currentUser, navigate, loadData, loadActiveUsers]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      loadUsers();
      loadData();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await adminService.deleteUser(userId);
      loadUsers();
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  if (currentUser?.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div className="admin-header-left">
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back to Dashboard
          </button>
          <h1>Admin Panel</h1>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-tabs">
          <button
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            All Users
          </button>
          <button
            className={activeTab === 'active' ? 'active' : ''}
            onClick={() => setActiveTab('active')}
          >
            Live Users ({activeUsers.length})
          </button>
        </div>

        <div className="admin-tab-content">
          {activeTab === 'stats' && stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-number">{stats.users.total}</p>
                <div className="stat-details">
                  <span>Admins: {stats.users.admins}</span>
                  <span>Regular: {stats.users.regular}</span>
                  <span className="active">Active: {stats.users.active}</span>
                </div>
              </div>
              <div className="stat-card">
                <h3>Total Boards</h3>
                <p className="stat-number">{stats.boards}</p>
              </div>
              <div className="stat-card">
                <h3>Total Tasks</h3>
                <p className="stat-number">{stats.tasks}</p>
              </div>
              <div className="stat-card">
                <h3>Total Activities</h3>
                <p className="stat-number">{stats.activities}</p>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-section">
              <div className="users-header">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="search-input"
                />
              </div>

              {loading ? (
                <div className="loading">Loading users...</div>
              ) : (
                <>
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.users?.map((user) => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user._id, e.target.value)}
                              className="role-select"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              className="delete-button"
                              disabled={user?._id === currentUser?._id}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {users.pagination && (
                    <div className="pagination">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </button>
                      <span>
                        Page {page} of {users.pagination.pages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(users.pagination.pages, p + 1))}
                        disabled={page === users.pagination.pages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'active' && (
            <div className="active-users-section">
              <h2>Currently Active Users ({activeUsers.length})</h2>
              {activeUsers.length === 0 ? (
                <div className="empty-state">No active users at the moment</div>
              ) : (
                <div className="active-users-grid">
                  {activeUsers.map((item) => (
                    <div key={item.user.id} className="active-user-card">
                      <div className="user-info">
                        <div className="user-avatar">
                          {item.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4>{item.user.name}</h4>
                          <p>{item.user.email}</p>
                        </div>
                      </div>
                      <div className="user-boards">
                        <strong>Active in {item.boards.length} board(s)</strong>
                        <div className="board-badges">
                          {item.boards.map((boardId) => (
                            <span key={boardId} className="board-badge">
                              {boardId.substring(0, 8)}...
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
