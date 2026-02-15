import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';
import { setBoards } from '../../store/slices/boardSlice';
import { boardService } from '../../services/boardService';
import socketService from '../../services/socketService';
import './Dashboard.css';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { boards } = useSelector((state) => state.board);
  const { user } = useSelector((state) => state.auth);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBoards = async () => {
    try {
      const data = await boardService.getBoards();
      dispatch(setBoards(data));
    } catch (error) {
      console.error('Error loading boards:', error);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    setLoading(true);
    try {
      const board = await boardService.createBoard(newBoardTitle.trim());
      dispatch(setBoards([...boards, board]));
      setNewBoardTitle('');
      setShowCreateForm(false);
      navigate(`/board/${board._id}`);
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // ensure socket is closed on explicit logout
    socketService.disconnect();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>My Boards</h1>
        <div className="header-actions">
          <span className="user-name">Welcome, {user?.name}</span>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="admin-button"
            >
              Admin Panel
            </button>
          )}
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {showCreateForm ? (
          <form onSubmit={handleCreateBoard} className="create-board-form">
            <input
              type="text"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              placeholder="Enter board title"
              autoFocus
              className="board-input"
            />
            <div className="form-actions">
              <button type="submit" disabled={loading} className="create-button">
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewBoardTitle('');
                }}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="create-board-button"
          >
            + Create New Board
          </button>
        )}

        <div className="boards-grid">
          {boards.map((board) => (
            <div
              key={board._id}
              className="board-card"
              onClick={() => navigate(`/board/${board._id}`)}
            >
              <h3>{board.title}</h3>
              <p className="board-meta">
                Created by {board.createdBy?.name || 'Unknown'}
              </p>
            </div>
          ))}
        </div>

        {boards.length === 0 && !showCreateForm && (
          <div className="empty-state">
            <p>No boards yet. Create your first board to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
