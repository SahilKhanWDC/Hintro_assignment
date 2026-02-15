const Board = require('../models/Board');
const Activity = require('../models/Activity');

exports.createBoard = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Board title is required' });
    }

    const board = new Board({
      title: title.trim(),
      createdBy: req.user._id,
      members: [req.user._id] // Creator is automatically a member
    });

    await board.save();
    await board.populate('createdBy', 'name email');
    await board.populate('members', 'name email');

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: 'Error creating board', error: error.message });
  }
};

exports.getBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { createdBy: req.user._id },
        { members: req.user._id }
      ]
    })
    .populate('createdBy', 'name email')
    .populate('members', 'name email')
    .sort({ createdAt: -1 });

    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching boards', error: error.message });
  }
};

exports.getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email');

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching board', error: error.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const board = req.board;

    if (board.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    board.members.push(userId);
    await board.save();
    await board.populate('members', 'name email');

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Error adding member', error: error.message });
  }
};

// Invite a member to a board by email (owner/member can invite)
exports.inviteMemberByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const board = req.board;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const User = require('../models/User');
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('_id name email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = user._id.toString();
    if (board.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    board.members.push(userId);
    await board.save();
    await board.populate('members', 'name email');

    // Optionally: emit a socket event to notify (if socket exists for this user)
    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Error inviting member', error: error.message });
  }
};
