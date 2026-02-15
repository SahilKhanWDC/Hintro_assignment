const User = require('../models/User');
const Board = require('../models/Board');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user stats
    const boardsCount = await Board.countDocuments({
      $or: [
        { createdBy: user._id },
        { members: user._id }
      ]
    });

    const tasksCount = await Task.countDocuments({ createdBy: user._id });

    res.json({
      user,
      stats: {
        boardsCount,
        tasksCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'User role updated successfully', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Delete user's boards or transfer ownership
    await Board.deleteMany({ createdBy: user._id });

    // Remove user from board members
    await Board.updateMany(
      { members: user._id },
      { $pull: { members: user._id } }
    );

    // Delete user's tasks
    await Task.deleteMany({ createdBy: user._id });

    // Remove user from task assignments
    await Task.updateMany(
      { assignedUsers: user._id },
      { $pull: { assignedUsers: user._id } }
    );

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalBoards = await Board.countDocuments();
    const totalTasks = await Task.countDocuments();
    const totalActivities = await Activity.countDocuments();

    // Get active users count from Socket.IO
    const activeUsers = req.app.get('activeUsers') || {};
    let totalActiveUsers = 0;
    const activeUsersSet = new Set();
    Object.values(activeUsers).forEach(boardUsers => {
      Object.values(boardUsers).forEach(userData => {
        activeUsersSet.add(userData.user.id.toString());
      });
    });
    totalActiveUsers = activeUsersSet.size;

    res.json({
      users: {
        total: totalUsers,
        admins: totalAdmins,
        regular: totalUsers - totalAdmins,
        active: totalActiveUsers
      },
      boards: totalBoards,
      tasks: totalTasks,
      activities: totalActivities
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system stats', error: error.message });
  }
};

exports.getActiveUsers = async (req, res) => {
  try {
    const { boardId } = req.query;
    const activeUsers = req.app.get('activeUsers') || {};

    if (boardId) {
      // Get active users for specific board
      const boardUsers = activeUsers[boardId] || {};
      const users = Object.values(boardUsers).map(u => u.user);
      res.json({ boardId, users });
    } else {
      // Get all active users across all boards
      const allUsers = {};
      Object.entries(activeUsers).forEach(([boardId, users]) => {
        Object.values(users).forEach(userData => {
          const userId = userData.user.id.toString();
          if (!allUsers[userId]) {
            allUsers[userId] = {
              user: userData.user,
              boards: []
            };
          }
          allUsers[userId].boards.push(boardId);
        });
      });

      res.json({
        users: Object.values(allUsers),
        total: Object.keys(allUsers).length
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active users', error: error.message });
  }
};
