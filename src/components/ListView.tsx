import React, { useState, useMemo, useCallback } from 'react';
import { Search, Plus, Calendar, Tag, AlertCircle, Filter } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { TaskModal } from './TaskModal';
import { VirtualizedList } from './VirtualizedList';
import { useDebounce } from '../hooks/useDebounce';
import { Task } from '../types';

export function ListView() {
  const { tasks, updateTask } = useProject();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'priority'>('created_at');
  
  // 使用debounce优化搜索性能
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // 获取所有唯一的对接人
  const uniqueAssignees = useMemo(() => {
    const assignees = tasks
      .map(task => task.assignee)
      .filter((assignee): assignee is string => Boolean(assignee))
      .filter((assignee, index, arr) => arr.indexOf(assignee) === index);
    return assignees;
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || 
                             (filterAssignee === 'unassigned' && !task.assignee) ||
                             (task.assignee && task.assignee === filterAssignee);
      
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [tasks, debouncedSearchTerm, filterStatus, filterPriority, filterAssignee, sortBy]);

  const handleTaskEdit = useCallback((task: Task) => {
    setSelectedTask(task);
    setModalMode('edit');
    setIsModalOpen(true);
  }, []);

  const handleCreateTask = useCallback(() => {
    setSelectedTask(null);
    setModalMode('create');
    setIsModalOpen(true);
  }, []);

  const handleStatusChange = useCallback((taskId: string, newStatus: Task['status']) => {
    updateTask(taskId, { status: newStatus });
  }, [updateTask]);

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'todo': return '待办';
      case 'in_progress': return '进行中';
      case 'done': return '已完成';
      default: return status;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 lg:p-4 mb-4 lg:mb-6">
        <div className="flex flex-col space-y-3 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索任务..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Task['status'] | 'all')}
              className="px-2 lg:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
            >
              <option value="all">所有状态</option>
              <option value="todo">待办</option>
              <option value="in_progress">进行中</option>
              <option value="done">已完成</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Task['priority'] | 'all')}
              className="px-2 lg:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
            >
              <option value="all">所有优先级</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>

            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-2 lg:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
            >
              <option value="all">所有对接人</option>
              <option value="unassigned">未分配</option>
              {uniqueAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'created_at' | 'due_date' | 'priority')}
              className="px-2 lg:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-base"
            >
              <option value="created_at">按创建时间</option>
              <option value="due_date">按截止日期</option>
              <option value="priority">按优先级</option>
            </select>

            <button
              onClick={handleCreateTask}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>新建任务</span>
            </button>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto h-full">
          {filteredAndSortedTasks.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredAndSortedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 lg:p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTaskEdit(task)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-2 lg:space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900 text-sm lg:text-base">
                          {task.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                            {getStatusLabel(task.status)}
                          </span>
                          <div className={`flex items-center ${getPriorityColor(task.priority)}`}>
                            <AlertCircle size={12} className="lg:hidden" />
                            <AlertCircle size={14} className="hidden lg:block" />
                            <span className="text-xs ml-1">{getPriorityLabel(task.priority)}</span>
                          </div>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs lg:text-sm text-gray-600 mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs text-gray-500">
                        {task.due_date && (
                          <div className={`flex items-center ${isOverdue(task.due_date) ? 'text-red-500' : ''}`}>
                            <Calendar size={10} className="mr-1 lg:hidden" />
                            <Calendar size={12} className="mr-1 hidden lg:block" />
                            <span className="hidden sm:inline">{formatDate(task.due_date)}</span>
                            <span className="sm:hidden">{new Date(task.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                        
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex items-center">
                            <Tag size={10} className="mr-1 lg:hidden" />
                            <Tag size={12} className="mr-1 hidden lg:block" />
                            <span className="truncate max-w-32 sm:max-w-none">{task.tags.join(', ')}</span>
                          </div>
                        )}

                        <span className="hidden lg:inline">创建于 {formatDate(task.created_at)}</span>
                      </div>
                    </div>

                    <div className="ml-4">
                      <select
                        value={task.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(task.id, e.target.value as Task['status']);
                        }}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="todo">待办</option>
                        <option value="in_progress">进行中</option>
                        <option value="done">已完成</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg mb-2">没有找到匹配的任务</p>
              <button
                onClick={handleCreateTask}
                className="text-blue-600 hover:text-blue-800"
              >
                创建第一个任务
              </button>
            </div>
          )}
        </div>
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