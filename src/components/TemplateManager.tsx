import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  FileText,
  Star,
  User,
  Settings,
  Search,
  Copy
} from 'lucide-react';
import { AiPromptTemplate, CreateTemplateParams } from '../types';
import { db } from '../lib/database';

interface TemplateManagerProps {
  onClose: () => void;
  onTemplateChange: () => void;
  embedded?: boolean; // 是否嵌入到其他组件中
}

export function TemplateManager({ onClose, onTemplateChange, embedded = false }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<AiPromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 编辑状态
  const [editingTemplate, setEditingTemplate] = useState<AiPromptTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: ''
  });

  // 加载模板
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await db.aiTemplates.getTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error('加载模板失败:', err);
      setError('加载模板失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // 过滤模板
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 开始创建新模板
  const startCreating = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({ name: '', description: '', content: '' });
  };

  // 开始编辑模板
  const startEditing = (template: AiPromptTemplate) => {
    if (template.is_system) {
      alert('系统预设模板不能编辑');
      return;
    }

    setEditingTemplate(template);
    setIsCreating(false);
    setFormData({
      name: template.name,
      description: template.description,
      content: template.content
    });
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    setFormData({ name: '', description: '', content: '' });
  };

  // 保存模板
  const saveTemplate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      alert('请填写模板名称和内容');
      return;
    }

    try {
      if (isCreating) {
        // 创建新模板
        const params: CreateTemplateParams = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          content: formData.content.trim()
        };
        await db.aiTemplates.createTemplate(params);
      } else if (editingTemplate) {
        // 更新现有模板
        await db.aiTemplates.updateTemplate(editingTemplate.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          content: formData.content.trim()
        });
      }

      await loadTemplates();
      onTemplateChange();
      cancelEditing();
    } catch (err: any) {
      console.error('保存模板失败:', err);
      setError('保存模板失败: ' + err.message);
    }
  };

  // 删除模板
  const deleteTemplate = async (template: AiPromptTemplate) => {
    if (template.is_system) {
      alert('系统预设模板不能删除');
      return;
    }

    if (!window.confirm(`确定要删除模板"${template.name}"吗？`)) {
      return;
    }

    try {
      await db.aiTemplates.deleteTemplate(template.id);
      await loadTemplates();
      onTemplateChange();
    } catch (err: any) {
      console.error('删除模板失败:', err);
      setError('删除模板失败: ' + err.message);
    }
  };

  // 复制模板内容
  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    // TODO: 显示复制成功提示
  };

  // 复制系统模板为用户模板
  const duplicateTemplate = (template: AiPromptTemplate) => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (副本)`,
      description: template.description,
      content: template.content
    });
  };

  const containerClass = embedded
    ? "w-full h-full flex flex-col"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";

  const contentClass = embedded
    ? "w-full h-[600px] flex flex-col"
    : "bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col";

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* 头部 - 仅在非嵌入模式显示 */}
        {!embedded && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    提示词模板管理
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    管理和编辑你的AI提示词模板
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          {/* 左侧：模板列表 */}
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* 搜索和创建 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索模板..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
                <button
                  onClick={startCreating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>新建</span>
                </button>
              </div>
            </div>

            {/* 模板列表 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                    {searchTerm ? '没有找到匹配的模板' : '还没有模板'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm ? '尝试使用不同的关键词搜索' : '点击"新建"按钮创建你的第一个模板'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                        editingTemplate?.id === template.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => startEditing(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                              {template.name}
                            </h3>
                            {template.is_system ? (
                              <Star size={12} className="text-yellow-500 fill-current" title="系统预设" />
                            ) : (
                              <User size={12} className="text-blue-500" title="用户创建" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                            {template.description}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2">
                            {template.content.length > 50
                              ? `${template.content.substring(0, 50)}...`
                              : template.content}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyTemplate(template.content);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
                            title="复制内容"
                          >
                            <Copy size={12} />
                          </button>
                          {template.is_system ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateTemplate(template);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500 rounded"
                              title="复制为用户模板"
                            >
                              <Plus size={12} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTemplate(template);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 rounded"
                              title="删除"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：编辑器 */}
          <div className="w-1/2 flex flex-col">
            {(isCreating || editingTemplate) ? (
              <>
                {/* 编辑头部 */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {isCreating ? '创建新模板' : `编辑模板: ${editingTemplate?.name}`}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded text-sm"
                      >
                        取消
                      </button>
                      <button
                        onClick={saveTemplate}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center space-x-1"
                      >
                        <Save size={14} />
                        <span>保存</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 编辑表单 */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {/* 模板名称 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        模板名称 *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="输入模板名称..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* 模板描述 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        模板描述
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="简短描述这个模板的用途..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* 模板内容 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        模板内容 *
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="输入提示词模板内容..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                        rows={12}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        提示：使用具体、清晰的指令，这样AI能更好地理解你的需求
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // 默认状态
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <Settings size={64} className="mx-auto mb-6 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    管理提示词模板
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                    选择左侧的模板进行编辑，或创建新的提示词模板来提高AI对话效率
                  </p>
                  <button
                    onClick={startCreating}
                    className="flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} />
                    <span>创建模板</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}