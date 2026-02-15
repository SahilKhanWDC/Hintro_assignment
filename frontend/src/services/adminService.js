import api from './api';

export const adminService = {
  getAllUsers: async (page = 1, limit = 20, search = '') => {
    const params = { page, limit };
    if (search) params.search = search;
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUserRole: async (id, role) => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getSystemStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getActiveUsers: async (boardId = null) => {
    const params = boardId ? { boardId } : {};
    const response = await api.get('/admin/active-users', { params });
    return response.data;
  },
};
