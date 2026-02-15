import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this._pending = {}; // store listeners registered before socket exists
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    });

    // attach any pending listeners that were registered before socket was ready
    Object.keys(this._pending).forEach((event) => {
      this._pending[event].forEach((cb) => this.socket.on(event, cb));
    });
    this._pending = {};

    // process any queued joins (e.g., joinBoard called before socket was created)
    if (this._queuedJoins && this._queuedJoins.length) {
      this._queuedJoins.forEach(({ boardId, userId }) => {
        this.socket.once('connect', () => this.socket.emit('join_board', { boardId, userId }));
      });
      this._queuedJoins = [];
    }

    // helpful client-side logging for debugging connection lifecycle
    this.socket.on('connect', () => console.log('socket connected:', this.socket.id));
    this.socket.on('disconnect', (reason) => console.log('socket disconnected:', reason));
    this.socket.on('connect_error', (err) => console.warn('socket connect_error:', err && err.message ? err.message : err));

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinBoard(boardId, userId) {
    if (this.socket?.connected) {
      this.socket.emit('join_board', { boardId, userId });
      return;
    }

    // if socket exists but hasn't connected yet, wait for connect then emit
    if (this.socket) {
      this.socket.once('connect', () => {
        this.socket.emit('join_board', { boardId, userId });
      });
      return;
    }

    // no socket yet — create one without token (caller should call connect first), but queue the join
    if (!this._queuedJoins) this._queuedJoins = [];
    this._queuedJoins.push({ boardId, userId });
  }

  leaveBoard(boardId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_board', boardId);
      return;
    }

    if (this.socket) {
      this.socket.once('connect', () => {
        this.socket.emit('leave_board', boardId);
      });
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      return;
    }

    if (!this._pending[event]) this._pending[event] = [];
    this._pending[event].push(callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      return;
    }

    if (this._pending[event]) {
      this._pending[event] = this._pending[event].filter((cb) => cb !== callback);
      if (this._pending[event].length === 0) delete this._pending[event];
    }
  }
}

const socketService = new SocketService();
export default socketService;
