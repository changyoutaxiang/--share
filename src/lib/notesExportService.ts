/**
 * 笔记导出服务
 * 将笔记按时间范围导出为markdown格式
 */

import { Note, NoteCategory } from '../types';

export class NotesExportService {

  /**
   * 导出当日笔记为markdown
   */
  static async exportTodayNotes(notes: Note[]): Promise<void> {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    const todayNotes = this.filterNotesByDate(notes, today, today);
    const markdown = this.formatNotesToMarkdown(todayNotes, 'daily', todayString);

    const fileName = `笔记导出-${todayString}.md`;
    this.downloadMarkdownFile(markdown, fileName);
  }

  /**
   * 导出本周笔记为markdown
   */
  static async exportThisWeekNotes(notes: Note[]): Promise<void> {
    const today = new Date();
    const weekStart = this.getWeekStart(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekNotes = this.filterNotesByDate(notes, weekStart, weekEnd);
    const weekStartString = weekStart.toISOString().split('T')[0];
    const weekEndString = weekEnd.toISOString().split('T')[0];

    const markdown = this.formatNotesToMarkdown(weekNotes, 'weekly', `${weekStartString}_${weekEndString}`);

    const fileName = `笔记导出-第${this.getWeekNumber(weekStart)}周(${weekStartString}至${weekEndString}).md`;
    this.downloadMarkdownFile(markdown, fileName);
  }

  /**
   * 按时间范围筛选笔记
   */
  private static filterNotesByDate(notes: Note[], startDate: Date, endDate: Date): Note[] {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return notes.filter(note => {
      const noteDate = new Date(note.created_at);
      return noteDate >= start && noteDate <= end;
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  /**
   * 将笔记格式化为markdown
   */
  private static formatNotesToMarkdown(notes: Note[], type: 'daily' | 'weekly', dateIdentifier: string): string {
    if (notes.length === 0) {
      return type === 'daily'
        ? `# 📅 ${dateIdentifier} 每日笔记\n\n> 今日暂无笔记记录\n`
        : `# 📈 本周笔记总结\n\n> 本周暂无笔记记录\n`;
    }

    // 标题和基本信息
    const title = type === 'daily'
      ? `📅 ${dateIdentifier} 每日笔记`
      : `📈 本周笔记总结 (${dateIdentifier.replace('_', ' 至 ')})`;

    let markdown = `# ${title}\n\n`;

    // 添加统计信息
    const stats = this.generateStats(notes);
    markdown += `## 📊 统计概览\n\n`;
    markdown += `- **总计**: ${notes.length} 篇笔记\n`;
    markdown += `- **分类分布**: ${stats.categoryStats}\n`;
    markdown += `- **标签**: ${stats.allTags.join('、') || '无标签'}\n`;
    markdown += `- **收藏**: ${stats.favoriteCount} 篇\n\n`;

    // 按分类组织内容
    const notesByCategory = this.groupNotesByCategory(notes);

    for (const [category, categoryNotes] of Object.entries(notesByCategory)) {
      if (categoryNotes.length === 0) continue;

      const categoryName = this.getCategoryDisplayName(category as NoteCategory);
      markdown += `## ${categoryName} (${categoryNotes.length}篇)\n\n`;

      categoryNotes.forEach((note, index) => {
        const createTime = new Date(note.created_at).toLocaleString('zh-CN');
        const updateTime = note.updated_at !== note.created_at
          ? ` (更新: ${new Date(note.updated_at).toLocaleString('zh-CN')})`
          : '';

        markdown += `### ${index + 1}. ${note.title || '无标题笔记'}`;
        markdown += note.is_favorite ? ' ⭐' : '';
        markdown += `\n\n`;

        markdown += `**创建时间**: ${createTime}${updateTime}\n\n`;

        if (note.tags && note.tags.length > 0) {
          markdown += `**标签**: ${note.tags.map(tag => `\`${tag}\``).join(' ')}\n\n`;
        }

        if (note.content.trim()) {
          // 处理笔记内容，确保markdown格式正确
          const content = note.content
            .trim()
            .split('\n')
            .map(line => line.trim() ? line : '') // 保留空行但清理空格
            .join('\n');

          markdown += `${content}\n\n`;
        } else {
          markdown += `*暂无内容*\n\n`;
        }

        markdown += `---\n\n`;
      });
    }

    // 添加页脚信息
    markdown += `## 📋 导出信息\n\n`;
    markdown += `- **导出时间**: ${new Date().toLocaleString('zh-CN')}\n`;
    markdown += `- **导出范围**: ${type === 'daily' ? '当日笔记' : '本周笔记'}\n`;
    markdown += `- **数据来源**: 智能工作助手 - 记事本模块\n`;
    markdown += `- **格式**: Markdown\n\n`;
    markdown += `> 💡 提示：你可以将此内容复制到任何AI工具中，请求生成日报或周报总结。\n`;

    return markdown;
  }

  /**
   * 生成统计信息
   */
  private static generateStats(notes: Note[]) {
    const categoryCount: Record<string, number> = {};
    const allTags: Set<string> = new Set();
    let favoriteCount = 0;

    notes.forEach(note => {
      // 统计分类
      const categoryName = this.getCategoryDisplayName(note.category);
      categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;

      // 收集标签
      if (note.tags) {
        note.tags.forEach(tag => allTags.add(tag));
      }

      // 统计收藏
      if (note.is_favorite) {
        favoriteCount++;
      }
    });

    const categoryStats = Object.entries(categoryCount)
      .map(([cat, count]) => `${cat}${count}篇`)
      .join('、');

    return {
      categoryStats,
      allTags: Array.from(allTags),
      favoriteCount
    };
  }

  /**
   * 按分类分组笔记
   */
  private static groupNotesByCategory(notes: Note[]): Record<string, Note[]> {
    const grouped: Record<string, Note[]> = {
      work: [],
      study: [],
      personal: [],
      ideas: [],
      other: []
    };

    notes.forEach(note => {
      if (grouped[note.category]) {
        grouped[note.category].push(note);
      } else {
        grouped.other.push(note);
      }
    });

    return grouped;
  }

  /**
   * 获取分类显示名称
   */
  private static getCategoryDisplayName(category: NoteCategory): string {
    const categoryNames: Record<NoteCategory, string> = {
      work: '💼 工作笔记',
      study: '📚 学习笔记',
      personal: '👤 个人笔记',
      ideas: '💡 想法记录',
      other: '📝 其他笔记'
    };
    return categoryNames[category] || '📝 其他笔记';
  }

  /**
   * 获取本周开始日期（周一）
   */
  private static getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // 周一为一周开始
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * 获取周数
   */
  private static getWeekNumber(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  /**
   * 下载markdown文件
   */
  private static downloadMarkdownFile(content: string, fileName: string): void {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理URL对象
    URL.revokeObjectURL(url);
  }

  /**
   * 获取当日笔记数量（用于按钮提示）
   */
  static getTodayNotesCount(notes: Note[]): number {
    const today = new Date();
    const todayNotes = this.filterNotesByDate(notes, today, today);
    return todayNotes.length;
  }

  /**
   * 获取本周笔记数量（用于按钮提示）
   */
  static getThisWeekNotesCount(notes: Note[]): number {
    const today = new Date();
    const weekStart = this.getWeekStart(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekNotes = this.filterNotesByDate(notes, weekStart, weekEnd);
    return weekNotes.length;
  }
}