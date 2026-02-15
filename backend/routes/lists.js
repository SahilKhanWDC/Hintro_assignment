const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkBoardAccess = require('../middleware/boardAccess');
const listController = require('../controllers/listController');

// All routes require authentication
router.use(auth);

// List routes
router.post('/', checkBoardAccess, listController.createList);
router.put('/:id', checkBoardAccess, listController.updateList);
router.delete('/:id', checkBoardAccess, listController.deleteList);

module.exports = router;
