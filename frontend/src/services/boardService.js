import api from './api';

export const boardService = {
  getBoards: async () => {
    const response = await api.get('/boards');
    return response.data;
  },

  getBoardById: async (id) => {
    const response = await api.get(`/boards/${id}`);
    return response.data;
  },

  createBoard: async (title) => {
    const response = await api.post('/boards', { title });
    return response.data;
  },

  addMember: async (boardId, userId) => {
    const response = await api.post(`/boards/${boardId}/members`, { userId });
    return response.data;
  },

  inviteMember: async (boardId, email) => {
    const response = await api.post(`/boards/${boardId}/invite`, { email });
    return response.data;
  },

  getLists: async (boardId) => {
    const response = await api.get(`/boards/${boardId}/lists`);
    return response.data;
  },

  createList: async (title, board) => {
    const response = await api.post('/lists', { title, board });
    return response.data;
  },

  updateList: async (id, title) => {
    const response = await api.put(`/lists/${id}`, { title });
    return response.data;
  },

  deleteList: async (id) => {
    const response = await api.delete(`/lists/${id}`);
    return response.data;
  },

  getTasks: async (boardId, listId, search, page, limit) => {
    const params = { boardId, page, limit };
    if (listId) params.listId = listId;
    if (search) params.search = search;
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  deleteTask: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  moveTask: async (id, listId, order) => {
    const response = await api.patch(`/tasks/${id}/move`, { listId, order });
    return response.data;
  },

  getActivity: async (boardId, page, limit) => {
    const response = await api.get(`/boards/${boardId}/activity`, {
      params: { page, limit },
    });
    return response.data;
  },
};
