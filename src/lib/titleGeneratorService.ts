/**
 * AI标题生成服务
 * 为对话和笔记智能生成简洁、有意义的标题
 */

import { sendChatMessage } from './openrouter';

export class TitleGeneratorService {

  /**
   * 为AI对话生成标题
   * 基于完整的对话内容分析生成更精准的标题
   */
  static async generateConversationTitle(
    userMessage: string,
    aiResponse: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    try {
      // 构建分析内容
      let contentToAnalyze = '';

      // 如果有对话历史，包含最近的几轮对话
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6); // 最近3轮对话
        contentToAnalyze += '对话历史：\n';
        recentHistory.forEach((msg, index) => {
          contentToAnalyze += `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}\n`;
        });
        contentToAnalyze += '\n';
      }

      // 包含当前这轮对话
      contentToAnalyze += `最新对话：\n用户: ${userMessage}\nAI: ${aiResponse}`;

      const prompt = `请基于以下AI对话内容，生成一个简洁、准确的对话标题。

${contentToAnalyze}

要求：
1. 标题要体现对话的核心主题
2. 长度控制在10-20个字符
3. 使用中文
4. 要具体而不是泛泛而谈
5. 只返回标题文本，不要引号或其他格式

例如：
- 不好："AI对话"、"问题咨询"
- 很好："Python数据处理方法"、"项目进度管理策略"、"React组件优化方案"`;

      const titleResponse = await sendChatMessage([
        { role: 'user', content: prompt }
      ], 'google/gemini-2.5-flash');

      // 清理和验证生成的标题
      const cleanTitle = this.cleanTitle(titleResponse);
      return cleanTitle || this.generateFallbackTitle(userMessage);

    } catch (error) {
      console.error('生成对话标题失败:', error);
      return this.generateFallbackTitle(userMessage);
    }
  }

  /**
   * 为笔记生成标题
   * 基于笔记内容智能提取关键信息作为标题
   */
  static async generateNoteTitle(content: string, category: string = 'other'): Promise<string> {
    try {
      if (!content.trim()) {
        return '无标题笔记';
      }

      // 如果内容很短，直接使用前面部分作为标题
      if (content.length <= 30) {
        return content.trim().replace(/\n/g, ' ').substring(0, 20);
      }

      const categoryHint = this.getCategoryHint(category);

      const prompt = `请基于以下笔记内容，生成一个简洁、准确的标题。

笔记分类：${categoryHint}

笔记内容：
${content.substring(0, 500)}${content.length > 500 ? '...' : ''}

要求：
1. 标题要体现笔记的核心内容
2. 长度控制在8-15个字符
3. 使用中文
4. 要具体而有意义
5. 只返回标题文本，不要引号或其他格式

例如：
- 工作笔记："项目需求分析"、"团队会议纪要"
- 学习笔记："React Hook原理"、"算法复习总结"
- 个人笔记："旅行计划安排"、"读书心得体会"`;

      const titleResponse = await sendChatMessage([
        { role: 'user', content: prompt }
      ], 'google/gemini-2.5-flash');

      const cleanTitle = this.cleanTitle(titleResponse);
      return cleanTitle || this.generateNoteFallbackTitle(content);

    } catch (error) {
      console.error('生成笔记标题失败:', error);
      return this.generateNoteFallbackTitle(content);
    }
  }

  /**
   * 批量为多篇笔记生成标题建议
   */
  static async generateNoteTitleSuggestions(notes: Array<{ id: string; content: string; category: string }>): Promise<Array<{ id: string; suggestedTitle: string }>> {
    const suggestions = [];

    for (const note of notes) {
      try {
        const title = await this.generateNoteTitle(note.content, note.category);
        suggestions.push({ id: note.id, suggestedTitle: title });
      } catch (error) {
        console.warn(`为笔记 ${note.id} 生成标题失败:`, error);
        suggestions.push({ id: note.id, suggestedTitle: this.generateNoteFallbackTitle(note.content) });
      }
    }

    return suggestions;
  }

  /**
   * 清理和验证生成的标题
   */
  private static cleanTitle(rawTitle: string): string {
    // 移除引号、换行符等
    let cleaned = rawTitle
      .trim()
      .replace(/^["'「『]|["'」』]$/g, '') // 移除首尾引号
      .replace(/\n/g, ' ') // 换行符替换为空格
      .replace(/\s+/g, ' ') // 多个空格合并为一个
      .trim();

    // 长度验证和截断
    if (cleaned.length > 25) {
      cleaned = cleaned.substring(0, 25) + '...';
    }

    // 验证是否为有效标题
    if (cleaned.length < 2 || cleaned.length > 30) {
      return '';
    }

    return cleaned;
  }

  /**
   * 对话标题的后备方案
   */
  private static generateFallbackTitle(userMessage: string): string {
    const clean = userMessage.trim().replace(/\n/g, ' ');
    if (clean.length <= 15) {
      return clean;
    }
    return clean.substring(0, 15) + '...';
  }

  /**
   * 笔记标题的后备方案
   */
  private static generateNoteFallbackTitle(content: string): string {
    // 提取第一行或第一句作为标题
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length > 0 && firstLine.length <= 20) {
      return firstLine;
    }

    // 提取前15个字符
    const preview = content.trim().replace(/\n/g, ' ').substring(0, 15);
    return preview || '无标题笔记';
  }

  /**
   * 获取分类提示信息
   */
  private static getCategoryHint(category: string): string {
    const categoryHints: Record<string, string> = {
      work: '工作相关',
      study: '学习相关',
      personal: '个人相关',
      ideas: '想法创意',
      other: '其他内容'
    };
    return categoryHints[category] || '其他内容';
  }

  /**
   * 检查标题是否需要更新
   */
  static shouldUpdateTitle(currentTitle: string, content: string): boolean {
    // 如果当前标题是默认标题，应该更新
    const defaultTitles = ['新对话', '无标题笔记', '未命名'];
    if (defaultTitles.includes(currentTitle)) {
      return true;
    }

    // 如果标题太短或太通用，建议更新
    if (currentTitle.length < 3) {
      return true;
    }

    // 如果内容足够长但标题很短，建议更新
    if (content.length > 100 && currentTitle.length < 8) {
      return true;
    }

    return false;
  }

  /**
   * 延迟执行标题生成（避免频繁调用）
   */
  static debounceGenerateTitle = (() => {
    let timeoutId: NodeJS.Timeout | null = null;

    return (
      callback: () => Promise<void>,
      delay: number = 2000
    ): void => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        callback().catch(error => {
          console.error('延迟标题生成失败:', error);
        });
      }, delay);
    };
  })();
}