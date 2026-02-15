import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSelector } from 'react-redux';
import { boardService } from '../../services/boardService';
import './Task.css';

const Task = ({ task }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [showDetails, setShowDetails] = useState(false);
  const { currentBoard } = useSelector((state) => state.board);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task._id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = async () => {
    try {
      await boardService.updateTask(task._id, {
        title: title.trim(),
        description: description.trim(),
      });
      setIsEditing(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await boardService.deleteTask(task._id);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleAssignUser = async (userId) => {
    const currentAssignments = task.assignedUsers?.map((u) => u._id || u) || [];
    const isAssigned = currentAssignments.includes(userId);

    const newAssignments = isAssigned
      ? currentAssignments.filter((id) => id !== userId)
      : [...currentAssignments, userId];

    try {
      await boardService.updateTask(task._id, {
        assignedUsers: newAssignments,
      });
    } catch (error) {
      console.error('Error updating task assignment:', error);
      alert('Failed to update assignment');
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="task"
        onClick={() => setShowDetails(true)}
      >
        <div className="task-title">{task.title}</div>
        {task.description && (
          <div className="task-description-preview">{task.description}</div>
        )}
        {task.assignedUsers && task.assignedUsers.length > 0 && (
          <div className="task-assignees">
            {task.assignedUsers.map((user) => (
              <span key={user._id || user} className="assignee-badge">
                {typeof user === 'object' ? user.name?.charAt(0).toUpperCase() : 'U'}
              </span>
            ))}
          </div>
        )}
      </div>

      {showDetails && (
        <div className="task-modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <h2>Task Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="close-button"
              >
                ×
              </button>
            </div>

            <div className="task-modal-content">
              {isEditing ? (
                <>
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="task-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="task-textarea"
                      rows="5"
                    />
                  </div>
                  <div className="form-actions">
                    <button onClick={handleSave} className="save-button">
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setTitle(task.title);
                        setDescription(task.description);
                      }}
                      className="cancel-button"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="task-detail-section">
                    <h3>{task.title}</h3>
                    {task.description && <p>{task.description}</p>}
                  </div>

                  {currentBoard && currentBoard.members && (
                    <div className="task-detail-section">
                      <h4>Assign to:</h4>
                      <div className="assignees-list">
                        {currentBoard.members.map((member) => {
                          const isAssigned =
                            task.assignedUsers?.some(
                              (u) => (u._id || u) === (member._id || member)
                            ) || false;
                          return (
                            <label key={member._id || member} className="assignee-checkbox">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() =>
                                  handleAssignUser(member._id || member)
                                }
                              />
                              <span>
                                {typeof member === 'object'
                                  ? member.name
                                  : 'Unknown'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="task-modal-actions">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="edit-button"
                    >
                      Edit
                    </button>
                    <button onClick={handleDelete} className="delete-button">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Task;
