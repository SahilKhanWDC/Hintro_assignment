const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkBoardAccess = require('../middleware/boardAccess');
const boardController = require('../controllers/boardController');
const listController = require('../controllers/listController');
const activityController = require('../controllers/activityController');

// All routes require authentication
router.use(auth);

// Board routes
router.post('/', boardController.createBoard);
router.get('/', boardController.getBoards);
router.get('/:id', checkBoardAccess, boardController.getBoardById);
router.post('/:id/members', checkBoardAccess, boardController.addMember);
// Invite by email
router.post('/:id/invite', checkBoardAccess, boardController.inviteMemberByEmail);

// Lists for a board
router.get('/:boardId/lists', checkBoardAccess, listController.getListsByBoard);

// Activity for a board
router.get('/:boardId/activity', checkBoardAccess, activityController.getBoardActivity);

module.exports = router;
