const Board = require('../models/Board');

const checkBoardAccess = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id || req.body.board || req.query.boardId;
    if (!boardId) {
      return res.status(400).json({ message: 'Board ID is required' });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user is creator or member
    const isCreator = board.createdBy.toString() === req.user._id.toString();
    const isMember = board.members.some(member => member.toString() === req.user._id.toString());

    if (!isCreator && !isMember) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this board' });
    }

    req.board = board;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking board access', error: error.message });
  }
};

module.exports = checkBoardAccess;
