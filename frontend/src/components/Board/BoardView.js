import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import {
  setCurrentBoard,
  setLists,
  setTasks,
  addList,
  updateList,
  removeList,
  addTask,
  updateTask,
  removeTask,
  moveTask,
  setActivity,
} from '../../store/slices/boardSlice';
import { boardService } from '../../services/boardService';
import socketService from '../../services/socketService';
import List from './List';
import ActivitySidebar from './ActivitySidebar';
import './BoardView.css';

const BoardView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { lists, tasks, currentBoard, activity } = useSelector((state) => state.board);
  const { token, user } = useSelector((state) => state.auth);
  const [showActivity, setShowActivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liveUsers, setLiveUsers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Define all handlers first using useCallback
  const loadActivity = useCallback(async () => {
    try {
      const data = await boardService.getActivity(id, 1, 20);
      dispatch(setActivity(data.activities || []));
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  }, [id, dispatch]);

  const handleTaskCreated = useCallback((task) => {
    dispatch(addTask(task));
    loadActivity();
  }, [dispatch, loadActivity]);

  const handleTaskUpdated = useCallback((task) => {
    dispatch(updateTask(task));
    loadActivity();
  }, [dispatch, loadActivity]);

  const handleTaskDeleted = useCallback((data) => {
    const listId = Object.keys(tasks).find((lid) =>
      tasks[lid].some((t) => t._id === data.taskId)
    );
    if (listId) {
      dispatch(removeTask({ taskId: data.taskId, listId }));
    }
    loadActivity();
  }, [tasks, dispatch, loadActivity]);

  const handleTaskMoved = useCallback((task) => {
    const oldListId = Object.keys(tasks).find((lid) =>
      tasks[lid].some((t) => t._id === task._id)
    );
    dispatch(moveTask({ task, oldListId }));
    loadActivity();
  }, [tasks, dispatch, loadActivity]);

  const handleListCreated = useCallback((list) => {
    dispatch(addList(list));
  }, [dispatch]);

  const handleListUpdated = useCallback((list) => {
    dispatch(updateList(list));
  }, [dispatch]);

  const handleListDeleted = useCallback((data) => {
    dispatch(removeList(data));
  }, [dispatch]);

  const handleUserJoined = useCallback((data) => {
    if (data.userId !== user?.id) {
      setLiveUsers(prev => {
        if (!prev.find(u => u.id === data.user.id)) {
          return [...prev, data.user];
        }
        return prev;
      });
    }
  }, [user]);

  const handleUserLeft = useCallback((data) => {
    if (data.userId !== user?.id) {
      setLiveUsers(prev => prev.filter(u => u.id !== data.userId));
    }
  }, [user]);

  const handleActiveUsers = useCallback((data) => {
    setLiveUsers(data.users || []);
  }, []);

  const loadBoardData = useCallback(async () => {
    try {
      setLoading(true);
      const [boardData, listsData, activityData] = await Promise.all([
        boardService.getBoardById(id),
        boardService.getLists(id),
        boardService.getActivity(id, 1, 20),
      ]);

      dispatch(setCurrentBoard(boardData));
      dispatch(setLists(listsData));

      // Load tasks for each list
      const tasksPromises = listsData.map((list) =>
        boardService.getTasks(id, list._id)
      );
      const tasksResults = await Promise.all(tasksPromises);

      const tasksMap = {};
      listsData.forEach((list, index) => {
        tasksMap[list._id] = tasksResults[index].tasks || [];
      });

      dispatch(setTasks({ listId: null, tasks: tasksMap }));
      dispatch(setActivity(activityData.activities || []));
    } catch (error) {
      console.error('Error loading board:', error);
      if (error.response?.status === 403 || error.response?.status === 404) {
        alert('You do not have access to this board');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [id, dispatch, navigate]);

  // Now set up effects that use the handlers
  useEffect(() => {
    if (token) {
      socketService.connect(token);
    }
    // keep socket connected for the session; disconnect happens on logout
  }, [token]);

  useEffect(() => {
    if (id && user) {
      loadBoardData();
      // ensure socket is connected before joining
      if (token && !socketService.socket?.connected) {
        socketService.connect(token);
      }
      socketService.joinBoard(id, user.id);
    }

    return () => {
      if (id) {
        socketService.leaveBoard(id);
      }
    };
  }, [id, user, token, loadBoardData]);

  useEffect(() => {
    // ensure socket is connected before registering listeners
    if (token && !socketService.socket?.connected) {
      socketService.connect(token);
    }

    // attach listeners only once per board/user
    socketService.on('task_created', handleTaskCreated);
    socketService.on('task_updated', handleTaskUpdated);
    socketService.on('task_deleted', handleTaskDeleted);
    socketService.on('task_moved', handleTaskMoved);
    socketService.on('list_created', handleListCreated);
    socketService.on('list_updated', handleListUpdated);
    socketService.on('list_deleted', handleListDeleted);

    // Live users events
    socketService.on('user_joined', handleUserJoined);
    socketService.on('user_left', handleUserLeft);
    socketService.on('active_users', handleActiveUsers);

    return () => {
      socketService.off('task_created', handleTaskCreated);
      socketService.off('task_updated', handleTaskUpdated);
      socketService.off('task_deleted', handleTaskDeleted);
      socketService.off('task_moved', handleTaskMoved);
      socketService.off('list_created', handleListCreated);
      socketService.off('list_updated', handleListUpdated);
      socketService.off('list_deleted', handleListDeleted);
      socketService.off('user_joined', handleUserJoined);
      socketService.off('user_left', handleUserLeft);
      socketService.off('active_users', handleActiveUsers);
    };
  }, [token, handleTaskCreated, handleTaskUpdated, handleTaskDeleted, handleTaskMoved, handleListCreated, handleListUpdated, handleListDeleted, handleUserJoined, handleUserLeft, handleActiveUsers]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Check if dragging a task
    if (activeId.startsWith('task-')) {
      const taskId = activeId.replace('task-', '');
      const task = Object.values(tasks)
        .flat()
        .find((t) => t._id === taskId);

      if (!task) return;

      let newListId = task.list;
      let newOrder = task.order;

      // Check if dropped on a list
      if (overId.startsWith('list-')) {
        newListId = overId.replace('list-', '');
        const newListTasks = tasks[newListId] || [];
        newOrder = newListTasks.length;
      } else if (overId.startsWith('task-')) {
        // Dropped on another task
        const targetTaskId = overId.replace('task-', '');
        const targetTask = Object.values(tasks)
          .flat()
          .find((t) => t._id === targetTaskId);

        if (!targetTask || targetTask._id === task._id) return;

        newListId = targetTask.list;
        newOrder = targetTask.order;
      } else {
        // Dropped on something else, don't move
        return;
      }

      // Only move if list or position changed
      if (newListId !== task.list || newOrder !== task.order) {
        try {
          await boardService.moveTask(taskId, newListId, newOrder);
        } catch (error) {
          console.error('Error moving task:', error);
          loadBoardData(); // Reload on error
        }
      }
    }
  };

  const handleCreateList = async (title) => {
    try {
      await boardService.createList(title, id);
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    }
  };

  const handleInviteMember = async (email) => {
    if (!email || !email.trim()) {
      return alert('Please enter an email address');
    }
    setInviteLoading(true);
    try {
      const updatedBoard = await boardService.inviteMember(id, email.trim().toLowerCase());
      dispatch(setCurrentBoard(updatedBoard));
      setInviteEmail('');
      alert('User invited successfully');
    } catch (error) {
      console.error('Invite error:', error);
      const msg = error?.response?.data?.message || 'Failed to invite user';
      alert(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="board-loading">
        <div>Loading board...</div>
      </div>
    );
  }

  if (!currentBoard) {
    return null;
  }

  return (
    <div className="board-view">
      <header className="board-header">
        <div className="board-header-left">
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back
          </button>
          <h1>{currentBoard.title}</h1>

          {/* Online users indicator */}
          <div className="live-users-indicator" title={`${liveUsers.length} online`}>
            <span className="live-dot" />
            <div className="live-users-list">
              {liveUsers.map((u) => (
                <div key={u.id} className="live-user-badge" title={u.name}>
                  {u.name?.split(' ')[0][0] || 'U'}
                </div>
              ))}
            </div>
          </div>

          {/* Invite by email */}
          <div className="invite-container">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Invite by email"
              className="invite-input"
            />
            <button
              onClick={() => handleInviteMember(inviteEmail)}
              className="invite-button"
              disabled={inviteLoading}
            >
              {inviteLoading ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowActivity(!showActivity)}
          className="activity-button"
        >
          {showActivity ? 'Hide' : 'Show'} Activity
        </button>
      </header>

      <div className="board-content">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="lists-container">
            <SortableContext
              items={lists.map((l) => `list-${l._id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {lists.map((list) => (
                <List
                  key={list._id}
                  list={list}
                  tasks={tasks[list._id] || []}
                  onCreateList={handleCreateList}
                />
              ))}
              <div className="add-list-container">
                <List onCreateList={handleCreateList} isNewList={true} />
              </div>
            </SortableContext>
          </div>
        </DndContext>

        {showActivity && (
          <ActivitySidebar
            activity={activity}
            onClose={() => setShowActivity(false)}
          />
        )}
      </div>
    </div>
  );
};

export default BoardView;
