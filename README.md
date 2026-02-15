# Lightweight Trello – Real-Time Task Collaboration Platform

A full-stack real-time task collaboration platform inspired by Trello/Notion.  
Built with React, Node.js, Express, MongoDB, and Socket.IO.

---

## Tech Stack

### Backend
- Node.js
- Express
- MongoDB (Mongoose)
- Socket.IO
- JWT Authentication
- bcryptjs

### Frontend
- React 18
- Redux Toolkit
- React Router
- @dnd-kit (Drag & Drop)
- Socket.IO Client
- Axios

---

## Project Structure

```
lightweight_trello/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── store/
│   │   ├── services/
│   │   └── App.js
│   └── public/
└── README.md
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### 2. Environment Variables

#### Backend (.env)

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lightweight_trello
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

### 3. Run Application

**Terminal 1 – Backend**
```bash
cd backend
npm run dev
```

**Terminal 2 – Frontend**
```bash
cd frontend
npm start
```

Frontend: http://localhost:3000  
Backend API: http://localhost:5000/api  

---

## Core Features

- JWT-based user authentication
- Board creation and member management
- List CRUD operations within boards
- Task CRUD operations
- Task assignment to users
- Drag-and-drop task movement
- Real-time updates using Socket.IO
- Activity history tracking
- Pagination and search support
- Board-level access control

---

## API Summary

### Authentication
- POST `/api/auth/signup`
- POST `/api/auth/login`

### Boards
- GET `/api/boards`
- POST `/api/boards`
- GET `/api/boards/:id`
- POST `/api/boards/:id/members`

### Lists
- POST `/api/lists`
- PUT `/api/lists/:id`
- DELETE `/api/lists/:id`
- GET `/api/boards/:boardId/lists`

### Tasks
- POST `/api/tasks`
- GET `/api/tasks`
- PUT `/api/tasks/:id`
- DELETE `/api/tasks/:id`
- PATCH `/api/tasks/:id/move`

### Activity
- GET `/api/boards/:boardId/activity`

All protected routes require `Authorization: Bearer <token>` header.

---

## Real-Time Synchronization

- Client connects via Socket.IO after login.
- When entering a board, client joins a board-specific room.
- On task/list changes, server emits events to that board room.
- All connected clients update their Redux store instantly.
- No page refresh required.

Events:
- `task_created`
- `task_updated`
- `task_deleted`
- `task_moved`
- `list_created`
- `list_updated`
- `list_deleted`

---

## Database Models

Collections:
- Users
- Boards
- Lists
- Tasks
- Activities

Indexes applied on:
- board
- list
- order
- title (for search)

---

## Demo Credentials

You may create new accounts or use:

User 1  
Email: user1@test.com  
Password: password123  

User 2  
Email: user2@test.com  
Password: password123  

---

## Assumptions & Trade-offs

- Single MongoDB instance (no replica set configured)
- In-memory Socket.IO adapter (Redis required for horizontal scaling)
- Basic text search (not full-text indexed search)
- Activity history stored permanently (no archival policy)

---

## Scalability Considerations

- Stateless JWT authentication
- Indexed database queries
- Room-based WebSocket broadcasting
- Ready for Redis adapter integration
- Pagination implemented for large datasets

---

This implementation supports real-time multi-user collaboration across browser sessions and runs locally using the setup instructions above.
