import React, { useState, Suspense } from 'react';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { ResponsiveLayout } from './components/ResponsiveLayout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { useKeyboardShortcuts, createShortcut } from './hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationContainer } from './components/NotificationContainer';
import { APP_CONFIG } from './lib/config';
import { ViewType } from './types';
import { FolderOpen, BookOpen, Bot } from 'lucide-react';

// 懒加载组件
const KanbanView = React.lazy(() => import('./components/KanbanView').then(module => ({ default: module.KanbanView })));
const ListView = React.lazy(() => import('./components/ListView').then(module => ({ default: module.ListView })));
const AnalyticsView = React.lazy(() => import('./components/AnalyticsView').then(module => ({ default: module.AnalyticsView })));
const NotesView = React.lazy(() => import('./components/NotesView').then(module => ({ default: module.NotesView })));
const ChatView = React.lazy(() => import('./components/ChatView').then(module => ({ default: module.ChatView })));
const SettingsView = React.lazy(() => import('./components/SettingsView').then(module => ({ default: module.SettingsView })));

function MainContent() {
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const { currentProject } = useProject();

  // 配置快捷键 - 必须在条件渲染之前调用
  const shortcuts = useKeyboardShortcuts([
    createShortcut('1', () => setCurrentView('kanban'), '切换到看板视图'),
    createShortcut('2', () => setCurrentView('list'), '切换到列表视图'),
    createShortcut('3', () => setCurrentView('analytics'), '切换到数据统计'),
    createShortcut('4', () => setCurrentView('notes'), '切换到我的笔记'),
    createShortcut('5', () => setCurrentView('chat'), '切换到AI对话'),
    createShortcut('6', () => setCurrentView('settings'), '切换到设置'),
    createShortcut('?', () => setShowShortcutsHelp(true), '显示快捷键帮助'),
    createShortcut('Escape', () => setShowShortcutsHelp(false), '关闭帮助面板'),
  ]);

  // 无需认证检查，直接渲染主界面

  const renderView = () => {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        {(() => {
          switch (currentView) {
            case 'kanban':
              return <KanbanView />;
            case 'list':
              return <ListView />;
            case 'analytics':
              return <AnalyticsView />;
            case 'notes':
              return <NotesView />;
            case 'chat':
              return <ChatView />;
            case 'settings':
              return <SettingsView />;
            default:
              return <KanbanView />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <ResponsiveLayout currentView={currentView} setCurrentView={setCurrentView}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {/* 动态标题根据当前功能区域 */}
              {currentView === 'notes' ? (
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  我的笔记
                </h1>
              ) : currentView === 'chat' ? (
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI 助手
                </h1>
              ) : currentView === 'settings' ? (
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  系统设置
                </h1>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentProject ? currentProject.name : '项目管理'}
                  </h1>
                  {currentProject && currentProject.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {currentProject.description}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {APP_CONFIG.APP_NAME} v{APP_CONFIG.APP_VERSION}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-3 lg:p-6">
          {currentProject || currentView === 'settings' || currentView === 'notes' || currentView === 'chat' ? renderView() : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-4 max-w-2xl">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                  欢迎使用智能工作助手
                </h2>
                <p className="text-base lg:text-lg text-gray-600 dark:text-gray-400 mb-8">
                  集成项目管理、笔记记录和AI助手的一站式工作平台
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* 项目管理卡片 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                    <div className="flex items-center mb-4">
                      <FolderOpen className="w-8 h-8 text-blue-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">项目管理</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      创建和管理您的项目，使用看板和列表视图跟踪任务进度，查看数据分析报告
                    </p>
                    <button
                      onClick={() => setCurrentView('kanban')}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      开始管理项目
                    </button>
                  </div>

                  {/* 记事本卡片 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                    <div className="flex items-center mb-4">
                      <BookOpen className="w-8 h-8 text-green-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">我的笔记</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      记录想法、学习笔记和工作心得，支持分类管理、标签组织和全文搜索
                    </p>
                    <button
                      onClick={() => setCurrentView('notes')}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      开始记录笔记
                    </button>
                  </div>

                  {/* AI助手卡片 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                    <div className="flex items-center mb-4">
                      <Bot className="w-8 h-8 text-purple-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">AI 助手</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      与AI智能对话，获得工作建议、学习指导和创意灵感，支持自定义提示词模板
                    </p>
                    <button
                      onClick={() => setCurrentView('chat')}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      开始AI对话
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={shortcuts}
      />
    </ResponsiveLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <ToastProvider>
            <ProjectProvider>
              <MainContent />
              <ToastContainer />
              <NotificationContainer />
            </ProjectProvider>
          </ToastProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;