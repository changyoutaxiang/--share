import React, { useState } from 'react';
import { Plus, Settings, BarChart3, Kanban, List, Trash2, FileText, FolderOpen, BookOpen, Bot, ChevronLeft, Menu } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { ThemeToggle } from './ThemeToggle';
import { Project, ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ currentView, setCurrentView, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { projects, currentProject, setCurrentProject, addProject, deleteProject } = useProject();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const projectColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
  ];

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      const randomColor = projectColors[Math.floor(Math.random() * projectColors.length)];
      addProject({
        name: newProjectName.trim(),
        description: '',
        color: randomColor,
      });
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  const handleDeleteProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除项目 "${project.name}" 吗？这将删除所有相关任务。`)) {
      deleteProject(project.id);
    }
  };

  // 主功能区域
  const mainSections = [
    {
      title: '项目管理',
      icon: FolderOpen,
      views: [
        { id: 'kanban', icon: Kanban, label: '看板视图' },
        { id: 'list', icon: List, label: '列表视图' },
        { id: 'analytics', icon: BarChart3, label: '数据分析' },
      ]
    },
    {
      title: '记事本',
      icon: BookOpen,
      views: [
        { id: 'notes', icon: FileText, label: '我的笔记' },
      ]
    },
    {
      title: 'AI 对话',
      icon: Bot,
      views: [
        { id: 'chat', icon: Bot, label: 'AI 助手' },
      ]
    }
  ];

  const settingsItems = [
    { id: 'settings', icon: Settings, label: '设置' }
  ];

  // 获取当前主功能区域
  const getCurrentSection = () => {
    for (const section of mainSections) {
      if (section.views.some(view => view.id === currentView)) {
        return section.title;
      }
    }
    return '';
  };

  const isProjectManagementActive = ['kanban', 'list', 'analytics'].includes(currentView);

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-900 dark:bg-gray-950 text-white h-screen flex flex-col transition-all duration-300 relative`}>
      {/* 折叠按钮 */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-6 w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white shadow-lg z-10 transition-colors"
        >
          <ChevronLeft size={14} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      )}

      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!collapsed ? (
          <>
            <h1 className="text-lg font-bold">个人工作台</h1>
            <ThemeToggle />
          </>
        ) : (
          <div className="w-full flex justify-center">
            <Menu size={20} className="text-gray-400" />
          </div>
        )}
      </div>

      {/* 主功能导航 */}
      <nav className={`${collapsed ? 'p-2' : 'p-4'} space-y-1 flex-1 overflow-y-auto`}>
        {mainSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {/* 功能区标题 */}
            {!collapsed && (
              <div className="flex items-center space-x-2 px-3 py-2 text-gray-400 text-sm font-medium">
                <section.icon size={16} />
                <span>{section.title}</span>
              </div>
            )}

            {/* 功能区子视图 */}
            <div className={`${collapsed ? 'space-y-1' : 'ml-2 space-y-1'}`}>
              {section.views.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id as any)}
                  className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg transition-colors text-sm ${
                    currentView === view.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  title={collapsed ? view.label : undefined}
                >
                  <view.icon size={18} />
                  {!collapsed && <span>{view.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* 项目列表（仅在项目管理功能激活时显示） */}
      {isProjectManagementActive && !collapsed && (
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              项目列表
            </h2>
            <button
              onClick={() => setIsCreating(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

        {isCreating && (
          <div className="mb-3">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
              onBlur={handleCreateProject}
              placeholder="项目名称"
              className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        )}

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => setCurrentProject(project)}
                className={`group flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                  currentProject?.id === project.id
                    ? 'bg-gray-700'
                    : 'hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="text-sm truncate">{project.name}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteProject(e, project)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {projects.length === 0 && !isCreating && (
            <p className="text-xs text-gray-500 mt-2">
              点击 + 按钮创建第一个项目
            </p>
          )}
        </div>
      )}

      {/* 底部设置区域 */}
      <div className={`mt-auto border-t border-gray-700 ${collapsed ? 'p-2' : 'p-4'}`}>
        {settingsItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as any)}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg transition-colors text-sm ${
              currentView === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}