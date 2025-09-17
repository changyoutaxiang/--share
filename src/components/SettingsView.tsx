import React, { useState } from 'react';
import { Settings, Database, Bot, FileText, ChevronRight } from 'lucide-react';
import { DataManager } from './DataManager';
import { TemplateManager } from './TemplateManager';

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<'general' | 'database' | 'ai-templates'>('general');

  const sections = [
    {
      id: 'general' as const,
      title: '常规设置',
      icon: Settings,
      description: '应用基础配置和偏好设置'
    },
    {
      id: 'database' as const,
      title: '数据库管理',
      icon: Database,
      description: '数据库连接、迁移和数据管理'
    },
    {
      id: 'ai-templates' as const,
      title: 'AI 模板管理',
      icon: Bot,
      description: '管理AI对话的提示词模板'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'database':
        return <DataManager />;
      case 'ai-templates':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <Bot className="w-6 h-6 text-purple-600 mr-3" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI 提示词模板</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  创建和管理你的AI对话提示词模板，提升对话效率
                </p>
              </div>
            </div>
            <TemplateManager
              onClose={() => {}}
              onTemplateChange={() => {}}
              embedded={true}
            />
          </div>
        );
      default:
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-6">
              <Settings className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">常规设置</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  配置应用的基础设置和个人偏好
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">应用信息</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>版本: 智能工作助手 v2.0.0</p>
                  <p>功能: 项目管理、记事本、AI对话</p>
                  <p>技术栈: React + TypeScript + Supabase</p>
                </div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">快捷键</h3>
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <p>1-3: 项目管理功能</p>
                  <p>4: 我的笔记</p>
                  <p>5: AI对话</p>
                  <p>6: 设置</p>
                  <p>?: 显示帮助</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center mb-8">
          <Settings className="w-8 h-8 text-gray-600 dark:text-gray-400 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">系统设置</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">管理应用设置、数据库和AI功能</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧导航 */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <section.icon size={20} />
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {section.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className={activeSection === section.id ? 'text-blue-600' : 'text-gray-400'} />
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="lg:col-span-3">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}