import React from 'react';
import { Calendar, Tag, AlertCircle, ExternalLink, User } from 'lucide-react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  isDragging?: boolean;
}

export const TaskCard = React.memo(function TaskCard({ task, onEdit, isDragging }: TaskCardProps) {
  const priorityColors = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };

  const priorityLabels = {
    low: '低',
    medium: '中',
    high: '高',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      onClick={() => onEdit(task)}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 lg:p-4 cursor-pointer transition-all hover:shadow-md dark:hover:shadow-lg ${
        isDragging ? 'opacity-50 rotate-2 scale-95' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 dark:text-white flex-1 mr-2 line-clamp-2 text-sm lg:text-base">
          {task.title}
        </h3>
        <div className={`flex items-center ${priorityColors[task.priority]} flex-shrink-0`}>
          <AlertCircle size={12} className="lg:hidden" />
          <AlertCircle size={14} className="hidden lg:block" />
          <span className="text-xs ml-1">{priorityLabels[task.priority]}</span>
        </div>
      </div>

      {task.description && (
        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-300 mb-2 lg:mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2 lg:space-x-3">
          {task.due_date && (
            <div className={`flex items-center ${isOverdue ? 'text-red-500' : ''}`}>
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
              <span>{task.tags.length}</span>
            </div>
          )}

          {task.url && (
            <div className="flex items-center">
              <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                title="打开文档链接"
              >
                <ExternalLink size={10} className="lg:hidden" />
                <ExternalLink size={12} className="hidden lg:block" />
                <span className="ml-1 hidden sm:inline">文档</span>
              </a>
            </div>
          )}

          {task.assignee && (
            <div className="flex items-center text-gray-600 dark:text-gray-400" title={`对接人: ${task.assignee}`}>
              <User size={10} className="mr-1 lg:hidden" />
              <User size={12} className="mr-1 hidden lg:block" />
              <span className="hidden sm:inline text-xs truncate max-w-16">{task.assignee}</span>
            </div>
          )}
        </div>

        <span className="hidden lg:inline">
          {formatDate(task.created_at)}
        </span>
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="inline-block px-1.5 lg:px-2 py-0.5 lg:py-1 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-xs text-gray-400">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
});