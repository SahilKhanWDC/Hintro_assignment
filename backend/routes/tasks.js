const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkBoardAccess = require('../middleware/boardAccess');
const taskController = require('../controllers/taskController');

// All routes require authentication
router.use(auth);

// Task routes
router.post('/', checkBoardAccess, taskController.createTask);
router.get('/', checkBoardAccess, taskController.getTasks);
router.get('/:id', checkBoardAccess, taskController.getTaskById);
router.put('/:id', checkBoardAccess, taskController.updateTask);
router.delete('/:id', checkBoardAccess, taskController.deleteTask);
router.patch('/:id/move', checkBoardAccess, taskController.moveTask);

module.exports = router;
