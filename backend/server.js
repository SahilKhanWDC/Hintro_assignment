const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import models at the top
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database connection with proper error handling and reconnection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lightweight_trello', {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB initial connection error:', error);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
  // Auto-reconnect after 5 seconds
  setTimeout(() => {
    if (mongoose.connection.readyState === 0) {
      connectDB();
    }
  }, 5000);
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to application termination');
  process.exit(0);
});

// Start database connection
connectDB();

// Database connection check middleware (after connection setup)
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      message: 'Database connection unavailable. Please try again later.' 
    });
  }
  next();
});

// Store active users per board: { boardId: { userId: { sockets: Set<socketId>, user } } }
// This allows a single user to have multiple open sockets (tabs/devtools) without
// being removed from the active list until their last socket disconnects.
const activeUsers = {}; 

// Socket.IO connection handling
io.on('connection', async (socket) => {
  // Log handshake auth so we can trace why a socket might be disconnected
  console.log('Socket connected:', socket.id, 'handshake.auth=', socket.handshake?.auth);

  // Validate JWT from handshake.auth.token (if present)
  const token = socket.handshake?.auth?.token;
  let handshakeUserId = null;
  try {
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production');
      handshakeUserId = decoded.userId;
      // attach lightweight user info to socket for later use
      try {
        const userDoc = await User.findById(handshakeUserId).select('name email');
        if (userDoc) {
          socket.user = { id: userDoc._id.toString(), name: userDoc.name, email: userDoc.email };
        }
      } catch (err) {
        console.warn('Failed to load handshake user info:', err.message);
      }
    } else {
      console.warn(`Socket ${socket.id} connected without token in handshake`);
    }
  } catch (err) {
    console.warn(`Socket ${socket.id} handshake token invalid:`, err.message);
    socket.disconnect(true);
    return;
  }

  let currentUserId = null;
  let currentBoardId = null;

  // surface connect errors on the server for easier debugging
  socket.on('connect_error', (err) => {
    console.warn(`Socket ${socket.id} connect_error:`, err && err.message ? err.message : err);
  });

  socket.on('join_board', async (data) => {
    const { boardId } = data;
    // prefer authenticated user id from handshake when available
    const userId = handshakeUserId || data.userId;
    if (!boardId || !userId) return;

    // Leave previous board if any
    if (currentBoardId) {
      socket.leave(`board_${currentBoardId}`);
      if (activeUsers[currentBoardId] && activeUsers[currentBoardId][userId]) {
        delete activeUsers[currentBoardId][userId];
        io.to(`board_${currentBoardId}`).emit('user_left', { userId, boardId: currentBoardId });
        io.to(`board_${currentBoardId}`).emit('active_users', {
          boardId: currentBoardId,
          users: Object.values(activeUsers[currentBoardId] || {}).map(u => u.user)
        });
      }
    }

    // Join new board
    socket.join(`board_${boardId}`);
    currentBoardId = boardId;
    currentUserId = userId;

    // Add to active users (support multiple sockets per user)
    if (!activeUsers[boardId]) {
      activeUsers[boardId] = {};
    }

    // Get user info (prefer socket.user populated from handshake)
    let user = socket.user;
    if (!user) {
      user = await User.findById(userId).select('name email');
    }

    if (user) {
      const userObj = typeof user.toObject === 'function'
        ? { id: user._id.toString(), name: user.name, email: user.email }
        : user;

      if (!activeUsers[boardId][userId]) {
        activeUsers[boardId][userId] = { sockets: new Set(), user: userObj };
      }

      activeUsers[boardId][userId].sockets.add(socket.id);

      // If this is the first socket for the user on the board, notify others
      if (activeUsers[boardId][userId].sockets.size === 1) {
        io.to(`board_${boardId}`).emit('user_joined', {
          userId,
          user: userObj,
          boardId
        });
      }

      // Send current active users to the new socket
      socket.emit('active_users', {
        boardId,
        users: Object.values(activeUsers[boardId]).map(u => u.user)
      });
    }

    console.log(`Socket ${socket.id} joined board ${boardId} (user=${userId})`);
  });

  socket.on('leave_board', (boardId) => {
    socket.leave(`board_${boardId}`);
    if (boardId && currentUserId && activeUsers[boardId] && activeUsers[boardId][currentUserId]) {
      const entry = activeUsers[boardId][currentUserId];
      if (entry?.sockets) {
        entry.sockets.delete(socket.id);
        // only remove user entirely when no sockets remain
        if (entry.sockets.size === 0) {
          delete activeUsers[boardId][currentUserId];
          io.to(`board_${boardId}`).emit('user_left', { userId: currentUserId, boardId });
        }
      }

      io.to(`board_${boardId}`).emit('active_users', {
        boardId,
        users: Object.values(activeUsers[boardId] || {}).map(u => u.user)
      });
    }
    currentBoardId = null;
    currentUserId = null;
    console.log(`Socket ${socket.id} left board ${boardId}`);
  });

  socket.on('disconnect', (reason) => {
    // Include reason in logs and provide additional debug context
    console.log(`User disconnected: ${socket.id} (reason=${reason})`);
    if (socket.handshake?.auth) {
      console.log(`  handshake.auth:`, socket.handshake.auth);
    }

    if (currentBoardId && currentUserId && activeUsers[currentBoardId] && activeUsers[currentBoardId][currentUserId]) {
      const entry = activeUsers[currentBoardId][currentUserId];
      if (entry?.sockets) {
        entry.sockets.delete(socket.id);
        console.log(`  removed socket ${socket.id} for user ${currentUserId} — remaining sockets: ${entry.sockets.size}`);
        if (entry.sockets.size === 0) {
          delete activeUsers[currentBoardId][currentUserId];
          io.to(`board_${currentBoardId}`).emit('user_left', { userId: currentUserId, boardId: currentBoardId });
        }

        io.to(`board_${currentBoardId}`).emit('active_users', {
          boardId: currentBoardId,
          users: Object.values(activeUsers[currentBoardId] || {}).map(u => u.user)
        });
      }
    }
  });
});

// Make activeUsers available to routes
app.set('activeUsers', activeUsers);

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/boards', require('./routes/boards'));
app.use('/api/lists', require('./routes/lists'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/admin', require('./routes/admin'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
