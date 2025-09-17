import React from 'react';
import { Star, Trash2, Calendar, Tag, FileText, Clock } from 'lucide-react';
import { Note } from '../types';

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleFavorite: (noteId: string) => void;
  loading: boolean;
}

export function NotesList({
  notes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
  onToggleFavorite,
  loading
}: NotesListProps) {

  // 格式化相对时间
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;

    const diffInDays = Math.floor(diffInMinutes / 1440);
    if (diffInDays < 7) return `${diffInDays}天前`;

    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // 格式化精确时间（用于AI分析）
  const formatExactTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // 判断是否为今天创建
  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // 判断是否为本周创建
  const isThisWeek = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return date >= weekStart;
  };

  // 获取分类颜色
  const getCategoryColor = (category: Note['category']) => {
    switch (category) {
      case 'work':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'personal':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'study':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'ideas':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // 获取分类标签
  const getCategoryLabel = (category: Note['category']) => {
    switch (category) {
      case 'work': return '工作';
      case 'personal': return '个人';
      case 'study': return '学习';
      case 'ideas': return '想法';
      default: return '其他';
    }
  };

  // 截取内容预览
  const getContentPreview = (content: string, maxLength = 100) => {
    if (!content) return '无内容';
    const plainText = content.replace(/\n/g, ' ').trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  // 处理删除事件
  const handleDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    onDeleteNote(noteId);
  };

  // 处理收藏事件
  const handleToggleFavorite = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    onToggleFavorite(noteId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <FileText size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
          暂无笔记
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          点击上方的"新建"按钮创建你的第一篇笔记
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {notes.map((note) => (
        <div
          key={note.id}
          onClick={() => onSelectNote(note)}
          className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
            selectedNote?.id === note.id
              ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500'
              : ''
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              {/* 标题 */}
              <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate mb-1">
                {note.title || '无标题笔记'}
              </h3>

              {/* 分类和收藏状态 */}
              <div className="flex items-center space-x-2 mb-2">
                <span className={`px-2 py-1 text-xs rounded-md ${getCategoryColor(note.category)}`}>
                  {getCategoryLabel(note.category)}
                </span>
                {note.is_favorite && (
                  <Star size={12} className="text-yellow-500 fill-current" />
                )}
              </div>

              {/* 内容预览 */}
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2 line-clamp-3">
                {getContentPreview(note.content)}
              </p>

              {/* 标签 */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex items-center mb-2">
                  <Tag size={10} className="text-gray-400 mr-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {note.tags.slice(0, 3).join(', ')}
                    {note.tags.length > 3 && ` +${note.tags.length - 3}`}
                  </span>
                </div>
              )}

              {/* 时间信息 */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {/* 创建时间 */}
                <div className="flex items-center">
                  <Clock size={10} className="mr-1" />
                  <span className="mr-2">创建:</span>
                  <span title={formatExactTime(note.created_at)}>
                    {formatRelativeTime(note.created_at)}
                  </span>
                  {isToday(note.created_at) && (
                    <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-xs">
                      今天
                    </span>
                  )}
                  {!isToday(note.created_at) && isThisWeek(note.created_at) && (
                    <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                      本周
                    </span>
                  )}
                </div>

                {/* 更新时间（如果与创建时间不同） */}
                {note.updated_at !== note.created_at && (
                  <div className="flex items-center">
                    <Clock size={10} className="mr-1" />
                    <span className="mr-2">更新:</span>
                    <span title={formatExactTime(note.updated_at)}>
                      {formatRelativeTime(note.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleToggleFavorite(e, note.id)}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                  note.is_favorite ? 'text-yellow-500' : 'text-gray-400'
                }`}
                title={note.is_favorite ? '取消收藏' : '添加收藏'}
              >
                <Star size={14} className={note.is_favorite ? 'fill-current' : ''} />
              </button>
              <button
                onClick={(e) => handleDelete(e, note.id)}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="删除笔记"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}