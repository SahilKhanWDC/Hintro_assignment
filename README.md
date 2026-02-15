# Lightweight Trello - Real-Time Task Collaboration Platform

A production-ready full-stack task collaboration platform similar to Trello/Notion hybrid, built with React, Node.js, Express, MongoDB, and Socket.IO for real-time synchronization.

## Features

- ✅ **User Authentication**: JWT-based stateless authentication with bcrypt password hashing
- ✅ **Board Management**: Create, view, and manage project boards
- ✅ **List Management**: Create, update, and delete lists (columns) within boards
- ✅ **Task Management**: Full CRUD operations for tasks with assignment capabilities
- ✅ **Drag and Drop**: Intuitive drag-and-drop interface using @dnd-kit
- ✅ **Real-Time Sync**: WebSocket-based real-time updates using Socket.IO
- ✅ **Activity Tracking**: Complete activity history for all board actions
- ✅ **Pagination & Search**: Efficient task search and pagination
- ✅ **Access Control**: Board-level access control (only members can access)

## Tech Stack

### Backend
- Node.js + Express
- MongoDB with Mongoose
- Socket.IO for WebSocket communication
- JWT for authentication
- bcryptjs for password hashing

### Frontend
- React 18
- Redux Toolkit for state management
- React Router for navigation
- @dnd-kit for drag-and-drop
- Socket.IO Client for real-time updates
- Axios for API calls

## Project Structure

```
lightweight_trello/
├── backend/
│   ├── controllers/      # Business logic
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── middleware/       # Auth & access control
│   └── server.js         # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── store/        # Redux store & slices
│   │   ├── services/     # API & Socket services
│   │   └── App.js        # Main app component
│   └── public/
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher) - running locally or MongoDB Atlas
- npm or yarn

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Backend Configuration

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lightweight_trello
JWT_SECRET=your_super_secret_jwt_key_change_in_production
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Important**: Change `JWT_SECRET` to a strong random string in production!

### 3. Frontend Configuration

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 4. Start MongoDB

Make sure MongoDB is running:

```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas connection string in MONGODB_URI
```

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# or
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## API Documentation

### Authentication

#### POST /api/auth/signup
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Boards

All board routes require authentication (Bearer token in Authorization header).

#### GET /api/boards
Get all boards where user is a member or creator.

**Response:**
```json
[
  {
    "_id": "board_id",
    "title": "My Board",
    "createdBy": { "name": "John Doe", "email": "john@example.com" },
    "members": [{ "name": "Jane Doe", "email": "jane@example.com" }],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### POST /api/boards
Create a new board.

**Request Body:**
```json
{
  "title": "New Board"
}
```

#### GET /api/boards/:id
Get board details by ID.

#### POST /api/boards/:id/members
Add a member to the board.

**Request Body:**
```json
{
  "userId": "user_id_to_add"
}
```

### Lists

#### POST /api/lists
Create a new list.

**Request Body:**
```json
{
  "title": "To Do",
  "board": "board_id"
}
```

#### PUT /api/lists/:id
Update list title.

**Request Body:**
```json
{
  "title": "Updated Title"
}
```

#### DELETE /api/lists/:id
Delete a list (and all its tasks).

#### GET /api/boards/:boardId/lists
Get all lists for a board.

### Tasks

#### POST /api/tasks
Create a new task.

**Request Body:**
```json
{
  "title": "Task Title",
  "description": "Task description",
  "board": "board_id",
  "list": "list_id",
  "assignedUsers": ["user_id_1", "user_id_2"]
}
```

#### GET /api/tasks
Get tasks with optional filters.

**Query Parameters:**
- `boardId` (required): Board ID
- `listId` (optional): Filter by list
- `search` (optional): Search by title (case-insensitive)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page

**Response:**
```json
{
  "tasks": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

#### PUT /api/tasks/:id
Update a task.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "assignedUsers": ["user_id"]
}
```

#### DELETE /api/tasks/:id
Delete a task.

#### PATCH /api/tasks/:id/move
Move a task to a different list or position.

**Request Body:**
```json
{
  "listId": "new_list_id",
  "order": 0
}
```

### Activity

#### GET /api/boards/:boardId/activity
Get activity history for a board.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response:**
```json
{
  "activities": [
    {
      "_id": "activity_id",
      "board": "board_id",
      "task": "task_id",
      "actionType": "task_created",
      "performedBy": { "name": "John Doe", "email": "john@example.com" },
      "message": "John Doe created task \"Task Title\"",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

## Real-Time Events

The application uses Socket.IO for real-time synchronization. When connected to a board, clients receive the following events:

- `task_created`: New task created
- `task_updated`: Task updated
- `task_deleted`: Task deleted
- `task_moved`: Task moved to different list/position
- `list_created`: New list created
- `list_updated`: List updated
- `list_deleted`: List deleted

### Socket Events

**Client → Server:**
- `join_board`: Join a board room (emits boardId)
- `leave_board`: Leave a board room (emits boardId)

**Server → Client:**
- All events above are broadcasted to all clients in the board room

## Database Schema

### User
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  timestamps: true
}
```

### Board
```javascript
{
  title: String (required),
  createdBy: ObjectId (ref: User),
  members: [ObjectId] (ref: User),
  timestamps: true
}
```

### List
```javascript
{
  title: String (required),
  board: ObjectId (ref: Board),
  order: Number (required),
  timestamps: true
}
```

### Task
```javascript
{
  title: String (required),
  description: String,
  board: ObjectId (ref: Board),
  list: ObjectId (ref: List),
  assignedUsers: [ObjectId] (ref: User),
  order: Number (required),
  createdBy: ObjectId (ref: User),
  timestamps: true
}
```

### Activity
```javascript
{
  board: ObjectId (ref: Board),
  task: ObjectId (ref: Task, optional),
  actionType: String (enum: task_created, task_updated, task_deleted, task_moved, task_assigned),
  performedBy: ObjectId (ref: User),
  message: String (required),
  timestamps: true
}
```

## Architecture

### Backend Architecture

The backend follows a layered architecture:

1. **Routes**: Define API endpoints and apply middleware
2. **Controllers**: Handle request/response logic
3. **Services**: Business logic (currently in controllers, can be extracted)
4. **Models**: MongoDB schemas with Mongoose
5. **Middleware**: Authentication and access control

### Frontend Architecture

The frontend uses:

1. **Components**: React functional components with hooks
2. **Redux Toolkit**: Centralized state management
3. **Services**: API abstraction layer and Socket.IO client
4. **Protected Routes**: Route protection based on auth state

### Real-Time Architecture

1. Client connects to Socket.IO server on login
2. When entering a board, client joins board-specific room
3. On database mutations, server emits events to board room
4. All clients in room receive updates and update Redux store
5. UI updates automatically via React re-renders

## Testing the Application

### Demo Credentials

You can create accounts through the signup page, or use these test accounts (after creating them):

1. **User 1:**
   - Email: `user1@test.com`
   - Password: `password123`

2. **User 2:**
   - Email: `user2@test.com`
   - Password: `password123`

### Testing Real-Time Features

1. Open two browser windows (or use incognito mode)
2. Login as different users in each window
3. Add both users to the same board
4. Create, move, or update tasks in one window
5. Observe real-time updates in the other window

### Testing Drag and Drop

1. Create multiple lists in a board
2. Create tasks in different lists
3. Drag tasks between lists
4. Drag tasks within the same list to reorder
5. Verify order persists after refresh

## Assumptions and Trade-offs

### Assumptions

1. **Single MongoDB instance**: Designed for single-instance MongoDB (can be scaled with replica sets)
2. **JWT expiration**: Tokens expire after 7 days (configurable)
3. **Task ordering**: Uses numeric order field (can be optimized with fractional indexing)
4. **Activity pagination**: Default limit of 20 items per page
5. **Socket rooms**: One room per board (scales to thousands of concurrent users per board)

### Trade-offs

1. **No Redis adapter**: Socket.IO uses in-memory adapter (add Redis for horizontal scaling)
2. **Optimistic updates**: Some operations use optimistic updates, others wait for server confirmation
3. **Activity storage**: All activities stored in database (consider archiving old activities)
4. **Search**: Basic text search on task titles (can be enhanced with full-text search)
5. **File uploads**: Not implemented (can be added with multer + cloud storage)

## Scalability Considerations

### Current Implementation

- ✅ Indexed database queries (boardId, listId, order)
- ✅ Efficient pagination
- ✅ Stateless JWT authentication
- ✅ Socket.IO room-based broadcasting

### For Production Scaling

1. **Add Redis adapter** for Socket.IO to enable horizontal scaling
2. **Implement database connection pooling**
3. **Add caching layer** (Redis) for frequently accessed data
4. **Implement rate limiting** on API endpoints
5. **Add CDN** for static frontend assets
6. **Implement database sharding** for very large datasets
7. **Add monitoring and logging** (e.g., Winston, Sentry)

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `mongod` or check MongoDB Atlas connection
- Verify `MONGODB_URI` in `.env` is correct
- Check firewall settings if using remote MongoDB

### Socket.IO Connection Issues

- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check CORS settings in `server.js`
- Ensure both frontend and backend are running

### Authentication Issues

- Verify JWT_SECRET is set in backend `.env`
- Check token expiration (default: 7 days)
- Clear localStorage and re-login if token is invalid

## License

This project is open source and available for educational purposes.

## Contributing

This is a demonstration project. For production use, consider:
- Adding comprehensive error handling
- Implementing unit and integration tests
- Adding input validation and sanitization
- Implementing rate limiting
- Adding monitoring and logging
- Security audit and penetration testing
