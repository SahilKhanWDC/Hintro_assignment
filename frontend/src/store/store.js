import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import boardReducer from './slices/boardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    board: boardReducer,
  },
});
