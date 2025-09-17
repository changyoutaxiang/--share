import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Star, Tag, Calendar, FileText, Filter, X, Download } from 'lucide-react';
import { Note, NoteCategory, SearchNotesParams, TimeRange } from '../types';
import { db } from '../lib/database';
import { useDebounce } from '../hooks/useDebounce';
import { NoteEditor } from './NoteEditor';
import { NotesList } from './NotesList';
import { NotesExportService } from '../lib/notesExportService';

export function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<NoteCategory | 'all'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 使用debounce优化搜索性能
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // 时间范围筛选辅助函数
  const filterByTimeRange = (notes: Note[], range: typeof timeRange) => {
    if (range === 'all') return notes;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return notes.filter(note => {
      const noteDate = new Date(note.created_at);

      switch (range) {
        case 'today':
          return noteDate >= today;
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          return noteDate >= weekStart;
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          return noteDate >= monthStart;
        default:
          return true;
      }
    });
  };

  // 加载笔记
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const searchParams: SearchNotesParams = {
        query: debouncedSearchTerm,
        category: filterCategory === 'all' ? undefined : filterCategory,
        favorites_only: showFavoritesOnly
      };

      const data = await db.notes.searchNotes(searchParams);

      // 应用时间范围筛选
      const filteredData = filterByTimeRange(data, timeRange);
      setNotes(filteredData);
    } catch (err: any) {
      console.error('加载笔记失败:', err);
      setError('加载笔记失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filterCategory, showFavoritesOnly, timeRange]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // 创建新笔记
  const handleCreateNote = async () => {
    try {
      setIsCreating(true);
      const newNote = await db.notes.createNote({
        title: '无标题笔记',
        content: '',
        category: 'other',
        tags: [],
        is_favorite: false
      });

      setNotes(prev => [newNote, ...prev]);
      setSelectedNote(newNote);
    } catch (err: any) {
      console.error('创建笔记失败:', err);
      setError('创建笔记失败: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // 保存笔记
  const handleSaveNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const updatedNote = await db.notes.updateNote(noteId, updates);

      setNotes(prev => prev.map(note =>
        note.id === noteId ? updatedNote : note
      ));

      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
      }
    } catch (err: any) {
      console.error('保存笔记失败:', err);
      setError('保存笔记失败: ' + err.message);
    }
  };

  // 删除笔记
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('确定要删除这篇笔记吗？')) return;

    try {
      await db.notes.deleteNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));

      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (err: any) {
      console.error('删除笔记失败:', err);
      setError('删除笔记失败: ' + err.message);
    }
  };

  // 切换收藏状态
  const handleToggleFavorite = async (noteId: string) => {
    try {
      const updatedNote = await db.notes.toggleFavorite(noteId);

      setNotes(prev => prev.map(note =>
        note.id === noteId ? updatedNote : note
      ));

      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
      }
    } catch (err: any) {
      console.error('切换收藏状态失败:', err);
      setError('操作失败: ' + err.message);
    }
  };

  // 选择笔记
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
  };

  // 清除筛选
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setShowFavoritesOnly(false);
    setTimeRange('all');
  };

  // 导出今日笔记
  const handleExportToday = async () => {
    try {
      await NotesExportService.exportTodayNotes(notes);
    } catch (error) {
      console.error('导出今日笔记失败:', error);
      setError('导出失败: ' + (error as Error).message);
    }
  };

  // 导出本周笔记
  const handleExportThisWeek = async () => {
    try {
      await NotesExportService.exportThisWeekNotes(notes);
    } catch (error) {
      console.error('导出本周笔记失败:', error);
      setError('导出失败: ' + (error as Error).message);
    }
  };

  const hasActiveFilters = searchTerm || filterCategory !== 'all' || showFavoritesOnly || timeRange !== 'all';

  const categoryOptions = [
    { value: 'all', label: '全部分类' },
    { value: 'work', label: '工作' },
    { value: 'personal', label: '个人' },
    { value: 'study', label: '学习' },
    { value: 'ideas', label: '想法' },
    { value: 'other', label: '其他' }
  ];

  const timeRangeOptions = [
    { value: 'all', label: '全部时间', icon: '📅' },
    { value: 'today', label: '今天', icon: '🌅' },
    { value: 'week', label: '本周', icon: '📆' },
    { value: 'month', label: '本月', icon: '🗓️' }
  ];

  return (
    <div className="h-full flex flex-col lg:flex-row bg-gray-50/50 dark:bg-gray-950">
      {/* 左侧：笔记列表 */}
      <div className="w-full lg:w-80 xl:w-96 bg-white/80 dark:bg-gray-900/90 backdrop-blur-lg border-r border-gray-200/60 dark:border-gray-700/50 flex flex-col shadow-sm">
        {/* 工具栏 */}
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center tracking-tight">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
                <FileText size={18} className="text-white" />
              </div>
              我的笔记
            </h2>
            <button
              onClick={handleCreateNote}
              disabled={isCreating}
              className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-150 disabled:opacity-50 shadow-lg shadow-blue-500/25"
            >
              <Plus size={16} />
              <span>新建</span>
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索笔记..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white text-sm transition-all duration-200 backdrop-blur-sm"
            />
          </div>

          {/* 筛选器 */}
          <div className="flex flex-col gap-3">
            {/* 第一行：分类和时间范围 */}
            <div className="flex gap-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as NoteCategory | 'all')}
                className="flex-1 px-4 py-2.5 bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white text-sm transition-all duration-200 appearance-none cursor-pointer"
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
                className="flex-1 px-4 py-2.5 bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:text-white text-sm transition-all duration-200 appearance-none cursor-pointer"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 第二行：收藏筛选 */}
            <div className="flex justify-start">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                  showFavoritesOnly
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg shadow-yellow-400/25'
                    : 'bg-gray-100/50 text-gray-700 hover:bg-gray-200/70 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700/70'
                }`}
              >
                <Star size={14} className={showFavoritesOnly ? 'fill-current' : ''} />
                <span>只看收藏</span>
              </button>
            </div>
          </div>

          {/* 清除筛选按钮 */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mt-3 px-2 py-1 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-200"
            >
              <X size={14} />
              <span>清除筛选</span>
            </button>
          )}

          {/* 导出功能区域 */}
          <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
              <Download size={12} />
              <span>导出笔记</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleExportToday}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded-lg transition-all duration-200 text-sm border border-green-200 dark:border-green-800"
              >
                <Calendar size={14} />
                <span>导出当日</span>
                <span className="ml-auto text-xs bg-green-100 dark:bg-green-800/50 px-2 py-0.5 rounded">
                  {NotesExportService.getTodayNotesCount(notes)}篇
                </span>
              </button>
              <button
                onClick={handleExportThisWeek}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-all duration-200 text-sm border border-blue-200 dark:border-blue-800"
              >
                <Download size={14} />
                <span>导出本周</span>
                <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-800/50 px-2 py-0.5 rounded">
                  {NotesExportService.getThisWeekNotesCount(notes)}篇
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
              💡 导出为Markdown格式，可配合外部AI生成日报周报
            </p>
          </div>
        </div>

        {/* 笔记列表 */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mb-4 p-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl backdrop-blur-sm">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <NotesList
            notes={notes}
            selectedNote={selectedNote}
            onSelectNote={handleSelectNote}
            onDeleteNote={handleDeleteNote}
            onToggleFavorite={handleToggleFavorite}
            loading={loading}
          />
        </div>
      </div>

      {/* 右侧：编辑器 */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center max-w-md">
              <FileText size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-6">
                选择笔记开始编辑
              </h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}