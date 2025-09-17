import React, { useState, useEffect, useCallback } from 'react';
import { Save, Star, Trash2, Tag, Calendar, Clock, Bookmark, Zap, Loader2 } from 'lucide-react';
import { Note, NoteCategory } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { TitleGeneratorService } from '../lib/titleGeneratorService';

interface NoteEditorProps {
  note: Note;
  onSave: (noteId: string, updates: Partial<Note>) => void;
  onDelete: (noteId: string) => void;
  onToggleFavorite: (noteId: string) => void;
}

export function NoteEditor({ note, onSave, onDelete, onToggleFavorite }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState(note.category);
  const [tags, setTags] = useState(note.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [lastSaved, setLastSaved] = useState<Date>(new Date(note.updated_at));
  const [isSaving, setIsSaving] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState(note.id);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [titleSuggestionDismissed, setTitleSuggestionDismissed] = useState(false);

  // 使用debounce实现自动保存
  const debouncedTitle = useDebounce(title, 1000);
  const debouncedContent = useDebounce(content, 1000);

  // 检查是否应该显示标题生成建议
  const shouldSuggestTitleGeneration =
    content.length > 50 &&
    TitleGeneratorService.shouldUpdateTitle(title, content) &&
    !generatingTitle &&
    !titleSuggestionDismissed;

  // 监听笔记变化，重置本地状态
  useEffect(() => {
    if (note.id !== currentNoteId) {
      // 切换到新笔记，重置所有状态
      setTitle(note.title);
      setContent(note.content);
      setCategory(note.category);
      setTags(note.tags || []);
      setLastSaved(new Date(note.updated_at));
      setCurrentNoteId(note.id);
      setTitleSuggestionDismissed(false); // 重置标题建议状态
    }
  }, [note, currentNoteId]);

  // 自动保存逻辑
  useEffect(() => {
    // 确保是同一个笔记，且内容实际发生变化
    if (note.id === currentNoteId &&
        (debouncedTitle !== note.title || debouncedContent !== note.content)) {

      const saveChanges = async () => {
        try {
          setIsSaving(true);
          await onSave(note.id, {
            title: debouncedTitle,
            content: debouncedContent,
            category,
            tags
          });
          setLastSaved(new Date());
        } catch (error) {
          console.error('自动保存失败:', error);
        } finally {
          setIsSaving(false);
        }
      };

      saveChanges();
    }
  }, [debouncedTitle, debouncedContent, note.id, note.title, note.content, currentNoteId, category, tags, onSave]);

  // 手动保存
  const handleManualSave = async () => {
    try {
      setIsSaving(true);
      await onSave(note.id, {
        title,
        content,
        category,
        tags
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 标题变化处理
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // 内容变化处理
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // 分类变化处理
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as NoteCategory;
    setCategory(newCategory);

    // 分类变化时立即保存
    onSave(note.id, { category: newCategory });
  };

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput('');

      // 标签变化时立即保存
      onSave(note.id, { tags: newTags });
    }
  };

  // 移除标签
  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);

    // 标签变化时立即保存
    onSave(note.id, { tags: newTags });
  };

  // 删除笔记
  const handleDelete = () => {
    if (window.confirm('确定要删除这篇笔记吗？')) {
      onDelete(note.id);
    }
  };

  // AI生成标题
  const handleGenerateTitle = async () => {
    if (!content.trim()) {
      return;
    }

    try {
      setGeneratingTitle(true);

      const newTitle = await TitleGeneratorService.generateNoteTitle(content, category);
      setTitle(newTitle);

      // 立即保存新标题
      await onSave(note.id, { title: newTitle });

    } catch (error) {
      console.error('生成标题失败:', error);
    } finally {
      setGeneratingTitle(false);
    }
  };

  // 格式化时间
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化精确时间戳（用于tooltip和AI分析）
  const formatExactTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const categoryOptions = [
    { value: 'work', label: '工作', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { value: 'personal', label: '个人', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { value: 'study', label: '学习', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    { value: 'ideas', label: '想法', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { value: 'other', label: '其他', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          {/* 收藏按钮 */}
          <button
            onClick={() => onToggleFavorite(note.id)}
            className={`p-2 rounded-lg transition-colors ${
              note.is_favorite
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            title={note.is_favorite ? '取消收藏' : '添加收藏'}
          >
            <Star size={20} className={note.is_favorite ? 'fill-current' : ''} />
          </button>

          {/* 分类选择器 */}
          <select
            value={category}
            onChange={handleCategoryChange}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* 时间戳信息 */}
          <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>保存中...</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center" title={formatExactTimestamp(note.created_at)}>
                  <Calendar size={12} className="mr-1" />
                  <span>创建: {formatExactTimestamp(note.created_at)}</span>
                </div>
                <div className="flex items-center" title={formatExactTimestamp(note.updated_at)}>
                  <Clock size={12} className="mr-1" />
                  <span>更新: {formatDate(lastSaved)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 手动保存按钮 */}
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            <span>保存</span>
          </button>

          {/* 删除按钮 */}
          <button
            onClick={handleDelete}
            className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            <span>删除</span>
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 标题编辑 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="输入笔记标题..."
              className="flex-1 text-xl font-semibold bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder-gray-500"
            />
            <button
              onClick={handleGenerateTitle}
              disabled={generatingTitle || !content.trim() || content.length < 20}
              className="flex items-center space-x-1 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 rounded-lg transition-colors border border-purple-200 dark:border-purple-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={content.length < 20 ? "需要至少20个字符才能生成标题" : "AI智能生成标题"}
            >
              {generatingTitle ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>生成中</span>
                </>
              ) : (
                <>
                  <Zap size={14} />
                  <span>AI标题</span>
                </>
              )}
            </button>
          </div>
          {/* 提示文本 */}
          {content.length > 0 && content.length < 20 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              💡 继续编写内容，达到20字符后可生成AI标题
            </p>
          )}

          {/* 智能标题建议 */}
          {shouldSuggestTitleGeneration && (
            <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap size={14} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                    建议使用AI生成标题
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleGenerateTitle}
                    disabled={generatingTitle}
                    className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {generatingTitle ? '生成中...' : '生成标题'}
                  </button>
                  <button
                    onClick={() => setTitleSuggestionDismissed(true)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="忽略建议"
                  >
                    ×
                  </button>
                </div>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                基于笔记内容智能生成简洁有意义的标题
              </p>
            </div>
          )}
        </div>

        {/* 标签管理 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <Tag size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">标签</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-md"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="添加标签..."
              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            />
            <button
              onClick={handleAddTag}
              className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              添加
            </button>
          </div>
        </div>

        {/* 内容编辑 */}
        <div className="flex-1 p-4">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="开始写下你的想法..."
            className="w-full h-full bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder-gray-500 leading-relaxed"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
      </div>
    </div>
  );
}