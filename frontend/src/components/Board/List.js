import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Task from './Task';
import { boardService } from '../../services/boardService';
import './List.css';

const List = ({ list, tasks = [], onCreateList, isNewList = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(list?.title || '');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list ? `list-${list._id}` : 'new-list',
    disabled: isNewList,
  });

  // always call droppable hook (hooks must run in same order every render)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: list ? `list-${list._id}` : 'new-list',
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveList = async () => {
    if (!title.trim()) {
      setIsEditing(false);
      return;
    }

    if (isNewList) {
      await onCreateList(title.trim());
      setTitle('');
    } else {
      try {
        await boardService.updateList(list._id, title.trim());
      } catch (error) {
        console.error('Error updating list:', error);
        alert('Failed to update list');
      }
    }
    setIsEditing(false);
  };

  const handleDeleteList = async () => {
    if (!window.confirm('Are you sure you want to delete this list? All tasks will be deleted.')) {
      return;
    }

    try {
      await boardService.deleteList(list._id);
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      await boardService.createTask({
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        board: list.board,
        list: list._id,
      });
      setTaskTitle('');
      setTaskDescription('');
      setShowTaskForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  if (isNewList) {
    return (
      <div className="list new-list">
        {isEditing ? (
          <div className="list-header">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveList}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveList()}
              autoFocus
              placeholder="Enter list title"
              className="list-title-input"
            />
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="add-list-button"
          >
            + Add another list
          </button>
        )}
      </div>
    );
  }

  // avoid mutating the `tasks` prop (which may be read-only); create a sorted copy
  const sortedTasks = Array.isArray(tasks) ? [...tasks].sort((a, b) => a.order - b.order) : [];
  const taskIds = sortedTasks.map((t) => `task-${t._id}`);

  const listContentStyle = {
    backgroundColor: isOver ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
  };

  return (
    <div ref={setNodeRef} style={style} className="list">
      <div className="list-header" {...attributes} {...listeners}>
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveList}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveList()}
            autoFocus
            className="list-title-input"
          />
        ) : (
          <div className="list-title-container">
            <h3 onClick={() => setIsEditing(true)} className="list-title">
              {list.title}
            </h3>
            <button onClick={handleDeleteList} className="delete-list-button">
              ×
            </button>
          </div>
        )}
      </div>

      <div ref={setDroppableRef} className="list-content" style={listContentStyle}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <Task key={task._id} task={task} />
          ))}
        </SortableContext>

        {showTaskForm ? (
          <form onSubmit={handleCreateTask} className="task-form">
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Enter task title"
              autoFocus
              className="task-input"
              required
            />
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Enter task description (optional)"
              className="task-description-input"
              rows="3"
            />
            <div className="task-form-actions">
              <button type="submit" className="add-task-button">
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTaskForm(false);
                  setTaskTitle('');
                  setTaskDescription('');
                }}
                className="cancel-task-button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowTaskForm(true)}
            className="add-task-button-placeholder"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
};

export default List;
