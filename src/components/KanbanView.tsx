import React, { useState, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { Task } from '../types';
import { useTaskReminders } from '../hooks/useTaskReminders';

export function KanbanView() {
  const { getTasksByStatus, updateTask, tasks } = useProject();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // 使用任务提醒功能
  const { notifyTaskCompletion } = useTaskReminders(tasks);

  const columns = useMemo(() => [
    { id: 'todo', title: '待办事项', status: 'todo' as const },
    { id: 'in_progress', title: '进行中', status: 'in_progress' as const },
    { id: 'done', title: '已完成', status: 'done' as const },
  ], []);

  const handleTaskEdit = useCallback((task: Task) => {
    setSelectedTask(task);
    setModalMode('edit');
    setIsModalOpen(true);
  }, []);

  const handleCreateTask = useCallback((status: Task['status']) => {
    setSelectedTask({ 
      id: '',
      project_id: '',
      title: '',
      description: '',
      status,
      priority: 'medium',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setModalMode('create');
    setIsModalOpen(true);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      updateTask(draggedTask.id, { status: newStatus });
      
      // 如果任务被标记为完成，发送通知
      if (newStatus === 'done') {
        notifyTaskCompletion(draggedTask);
      }
    }
    setDraggedTask(null);
  }, [draggedTask, updateTask, notifyTaskCompletion]);

  const getColumnColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'border-yellow-200 bg-yellow-50';
      case 'in_progress': return 'border-blue-200 bg-blue-50';
      case 'done': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="h-full">
      {/* Mobile View - Vertical Layout */}
      <div className="lg:hidden space-y-4 h-full overflow-y-auto">
        {columns.map((column) => {
          const tasks = getTasksByStatus(column.status);
          return (
            <div
              key={column.id}
              className={`flex flex-col rounded-lg border-2 ${getColumnColor(column.status)} p-4 min-h-[200px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800 flex items-center text-sm">
                  {column.title}
                  <span className="ml-2 px-2 py-1 bg-white rounded-full text-xs text-gray-500">
                    {tasks.length}
                  </span>
                </h2>
                <button
                  onClick={() => handleCreateTask(column.status)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-white rounded transition-colors"
                  title="添加任务"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className="cursor-move"
                  >
                    <TaskCard
                      task={task}
                      onEdit={handleTaskEdit}
                      isDragging={draggedTask?.id === task.id}
                    />
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="mb-2 text-sm">暂无任务</p>
                    <button
                      onClick={() => handleCreateTask(column.status)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      点击添加第一个任务
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View - Horizontal Layout */}
      <div className="hidden lg:grid grid-cols-3 gap-6 h-full">
        {columns.map((column) => {
          const tasks = getTasksByStatus(column.status);
          return (
            <div
              key={column.id}
              className={`flex flex-col rounded-lg border-2 ${getColumnColor(column.status)} p-4`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800 flex items-center">
                  {column.title}
                  <span className="ml-2 px-2 py-1 bg-white rounded-full text-xs text-gray-500">
                    {tasks.length}
                  </span>
                </h2>
                <button
                  onClick={() => handleCreateTask(column.status)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-white rounded transition-colors"
                  title="添加任务"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className="cursor-move"
                  >
                    <TaskCard
                      task={task}
                      onEdit={handleTaskEdit}
                      isDragging={draggedTask?.id === task.id}
                    />
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-2">暂无任务</p>
                    <button
                      onClick={() => handleCreateTask(column.status)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      点击添加第一个任务
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
      />
    </div>
  );
}