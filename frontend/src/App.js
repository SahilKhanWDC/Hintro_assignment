import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import BoardView from './components/Board/BoardView';
import AdminPanel from './components/Admin/AdminPanel';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import './App.css';
import { authService } from './services/authService';
import { setUser } from './store/slices/authSlice';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);

  // Restore user on app start if token exists but user is not populated
  useEffect(() => {
    const restoreUser = async () => {
      if (token && !user) {
        try {
          const data = await authService.getCurrentUser();
          if (data?.user) {
            dispatch(setUser(data.user));
          }
        } catch (err) {
          // token invalid or expired; clear local storage
          console.warn('Failed to restore user from token:', err?.response?.data || err?.message);
          localStorage.removeItem('token');
        }
      }
    };
    restoreUser();
  }, [token, user, dispatch]);

  return (
    <div className="App">
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/signup" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />} 
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/board/:id"
          element={
            <ProtectedRoute>
              <BoardView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </div>
  );
}

export default App;
