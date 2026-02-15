import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  boards: [],
  currentBoard: null,
  lists: [],
  tasks: {},
  activity: [],
  loading: false,
  error: null,
};

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    setBoards: (state, action) => {
      state.boards = action.payload;
    },
    setCurrentBoard: (state, action) => {
      state.currentBoard = action.payload;
    },
    setLists: (state, action) => {
      state.lists = action.payload;
    },
    addList: (state, action) => {
      state.lists.push(action.payload);
    },
    updateList: (state, action) => {
      const index = state.lists.findIndex(list => list._id === action.payload._id);
      if (index !== -1) {
        state.lists[index] = action.payload;
      }
    },
    removeList: (state, action) => {
      state.lists = state.lists.filter(list => list._id !== action.payload.listId);
      // Remove tasks from deleted list
      Object.keys(state.tasks).forEach(listId => {
        if (listId === action.payload.listId) {
          delete state.tasks[listId];
        }
      });
    },
    setTasks: (state, action) => {
      const { listId, tasks } = action.payload;
      if (listId === null && typeof tasks === 'object' && !Array.isArray(tasks)) {
        // Bulk set all tasks (tasks is an object with listId keys)
        state.tasks = tasks;
      } else {
        // Set tasks for a specific list
        state.tasks[listId] = tasks;
      }
    },
    addTask: (state, action) => {
      const task = action.payload;
      if (!state.tasks[task.list]) {
        state.tasks[task.list] = [];
      }
      state.tasks[task.list].push(task);
    },
    updateTask: (state, action) => {
      const task = action.payload;
      const listTasks = state.tasks[task.list] || [];
      const index = listTasks.findIndex(t => t._id === task._id);
      if (index !== -1) {
        listTasks[index] = task;
      } else {
        listTasks.push(task);
      }
      state.tasks[task.list] = listTasks;
    },
    removeTask: (state, action) => {
      const { taskId, listId } = action.payload;
      if (state.tasks[listId]) {
        state.tasks[listId] = state.tasks[listId].filter(t => t._id !== taskId);
      }
    },
    moveTask: (state, action) => {
      const { task, oldListId } = action.payload;
      
      // Remove from old list
      if (oldListId && state.tasks[oldListId]) {
        state.tasks[oldListId] = state.tasks[oldListId].filter(t => t._id !== task._id);
      }
      
      // Add to new list
      if (!state.tasks[task.list]) {
        state.tasks[task.list] = [];
      }
      const existingIndex = state.tasks[task.list].findIndex(t => t._id === task._id);
      if (existingIndex !== -1) {
        state.tasks[task.list][existingIndex] = task;
      } else {
        state.tasks[task.list].push(task);
      }
      
      // Sort by order
      state.tasks[task.list].sort((a, b) => a.order - b.order);
    },
    setActivity: (state, action) => {
      state.activity = action.payload;
    },
    addActivity: (state, action) => {
      state.activity.unshift(action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setBoards,
  setCurrentBoard,
  setLists,
  addList,
  updateList,
  removeList,
  setTasks,
  addTask,
  updateTask,
  removeTask,
  moveTask,
  setActivity,
  addActivity,
  setLoading,
  setError,
} = boardSlice.actions;

export default boardSlice.reducer;
