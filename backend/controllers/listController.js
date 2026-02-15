const List = require('../models/List');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

exports.createList = async (req, res) => {
  try {
    const { title, board } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'List title is required' });
    }

    if (!board) {
      return res.status(400).json({ message: 'Board ID is required' });
    }

    // Get the highest order number for this board
    const lastList = await List.findOne({ board }).sort({ order: -1 });
    const order = lastList ? lastList.order + 1 : 0;

    const list = new List({
      title: title.trim(),
      board,
      order
    });

    await list.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`board_${board}`).emit('list_created', list);
    }

    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ message: 'Error creating list', error: error.message });
  }
};

exports.updateList = async (req, res) => {
  try {
    const { title } = req.body;
    const list = await List.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    if (title) {
      list.title = title.trim();
    }

    await list.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`board_${list.board}`).emit('list_updated', list);
    }

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Error updating list', error: error.message });
  }
};

exports.deleteList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    const boardId = list.board;

    // Delete all tasks in this list
    await Task.deleteMany({ list: list._id });

    await List.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.to(`board_${boardId}`).emit('list_deleted', { listId: req.params.id });
    }

    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting list', error: error.message });
  }
};

exports.getListsByBoard = async (req, res) => {
  try {
    const lists = await List.find({ board: req.params.boardId })
      .sort({ order: 1 });

    res.json(lists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lists', error: error.message });
  }
};
