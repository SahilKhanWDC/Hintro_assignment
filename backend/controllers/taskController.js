const Task = require('../models/Task');
const List = require('../models/List');
const Activity = require('../models/Activity');

const createActivity = async (boardId, taskId, actionType, performedBy, message) => {
  const activity = new Activity({
    board: boardId,
    task: taskId,
    actionType,
    performedBy,
    message
  });
  await activity.save();
  return activity;
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, board, list, assignedUsers } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    if (!board || !list) {
      return res.status(400).json({ message: 'Board and List IDs are required' });
    }

    // Get the highest order number for this list
    const lastTask = await Task.findOne({ list }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = new Task({
      title: title.trim(),
      description: description || '',
      board,
      list,
      assignedUsers: assignedUsers || [],
      order,
      createdBy: req.user._id
    });

    await task.save();
    await task.populate('assignedUsers', 'name email');
    await task.populate('createdBy', 'name email');

    // Create activity
    await createActivity(
      board,
      task._id,
      'task_created',
      req.user._id,
      `${req.user.name} created task "${task.title}"`
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`board_${board}`).emit('task_created', task);
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { title, description, assignedUsers } = req.body;
    const task = await Task.findById(req.params.id)
      .populate('assignedUsers', 'name email')
      .populate('createdBy', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (assignedUsers) task.assignedUsers = assignedUsers;

    await task.save();
    await task.populate('assignedUsers', 'name email');

    // Create activity
    await createActivity(
      task.board,
      task._id,
      'task_updated',
      req.user._id,
      `${req.user.name} updated task "${task.title}"`
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`board_${task.board}`).emit('task_updated', task);
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const boardId = task.board;
    const taskTitle = task.title;

    await Task.findByIdAndDelete(req.params.id);

    // Create activity
    await createActivity(
      boardId,
      null,
      'task_deleted',
      req.user._id,
      `${req.user.name} deleted task "${taskTitle}"`
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`board_${boardId}`).emit('task_deleted', { taskId: req.params.id });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

exports.moveTask = async (req, res) => {
  try {
    const { listId, order } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldListId = task.list.toString();
    const newListId = listId;

    // If moving to a different list, update order in both lists
    if (oldListId !== newListId) {
      // Update orders in old list
      await Task.updateMany(
        { list: oldListId, order: { $gt: task.order } },
        { $inc: { order: -1 } }
      );

      // Update orders in new list
      await Task.updateMany(
        { list: newListId, order: { $gte: order } },
        { $inc: { order: 1 } }
      );

      task.list = newListId;
      task.order = order;
    } else {
      // Moving within same list
      const oldOrder = task.order;
      const newOrder = order;

      if (oldOrder < newOrder) {
        await Task.updateMany(
          { list: listId, order: { $gt: oldOrder, $lte: newOrder } },
          { $inc: { order: -1 } }
        );
      } else {
        await Task.updateMany(
          { list: listId, order: { $gte: newOrder, $lt: oldOrder } },
          { $inc: { order: 1 } }
        );
      }

      task.order = newOrder;
    }

    await task.save();
    await task.populate('assignedUsers', 'name email');
    await task.populate('createdBy', 'name email');

    // Create activity
    const list = await List.findById(task.list);
    await createActivity(
      task.board,
      task._id,
      'task_moved',
      req.user._id,
      `${req.user.name} moved task "${task.title}" to "${list.title}"`
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`board_${task.board}`).emit('task_moved', task);
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error moving task', error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, boardId, listId } = req.query;
    const query = {};

    if (boardId) query.board = boardId;
    if (listId) query.list = listId;
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(query)
      .populate('assignedUsers', 'name email')
      .populate('createdBy', 'name email')
      .sort({ order: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedUsers', 'name email')
      .populate('createdBy', 'name email')
      .populate('list')
      .populate('board');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
};
