/**
 * 本地存储版本的AI对话功能
 * 当Supabase表不可用时的临时解决方案
 */

import {
  AiConversation,
  AiMessage,
  AiPromptTemplate,
  CreateConversationParams,
  CreateTemplateParams
} from '../types';

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 本地存储键名
const STORAGE_KEYS = {
  CONVERSATIONS: 'ai_conversations',
  MESSAGES: 'ai_messages',
  TEMPLATES: 'ai_prompt_templates'
};

// 默认用户ID
const DEFAULT_USER_ID = 'd357f1a4-7023-40ba-9378-3c2c8f3b9309';

// 系统预设模板
const SYSTEM_TEMPLATES: Omit<AiPromptTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    user_id: DEFAULT_USER_ID,
    name: '工作助手',
    description: '帮助处理工作相关问题和任务',
    content: '你是一个专业的工作助手，请帮我处理以下工作相关问题：',
    is_system: true
  },
  {
    user_id: DEFAULT_USER_ID,
    name: '学习导师',
    description: '协助学习新知识和技能',
    content: '你是一个耐心的学习导师，请用简单易懂的方式帮我学习：',
    is_system: true
  },
  {
    user_id: DEFAULT_USER_ID,
    name: '创意伙伴',
    description: '激发创意思维和想法',
    content: '你是一个富有创意的伙伴，请帮我从不同角度思考以下问题：',
    is_system: true
  },
  {
    user_id: DEFAULT_USER_ID,
    name: '代码助手',
    description: '编程和技术问题解答',
    content: '你是一个经验丰富的程序员，请帮我分析和解决以下技术问题：',
    is_system: true
  },
  {
    user_id: DEFAULT_USER_ID,
    name: '写作助手',
    description: '协助文档写作和润色',
    content: '你是一个专业的写作助手，请帮我改进以下文本的表达：',
    is_system: true
  }
];

// 本地存储操作类
class LocalAiStorage {
  // 获取存储数据
  private getStorageData<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`读取本地存储失败 (${key}):`, error);
      return [];
    }
  }

  // 保存存储数据
  private setStorageData<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`保存本地存储失败 (${key}):`, error);
    }
  }

  // 初始化系统模板
  initializeSystemTemplates(): void {
    const templates = this.getStorageData<AiPromptTemplate>(STORAGE_KEYS.TEMPLATES);

    // 检查是否已有系统模板
    const hasSystemTemplates = templates.some(t => t.is_system);

    if (!hasSystemTemplates) {
      const systemTemplates: AiPromptTemplate[] = SYSTEM_TEMPLATES.map(template => ({
        ...template,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      this.setStorageData(STORAGE_KEYS.TEMPLATES, [...templates, ...systemTemplates]);
    }
  }

  // === 对话操作 ===
  async getConversations(): Promise<AiConversation[]> {
    const conversations = this.getStorageData<AiConversation>(STORAGE_KEYS.CONVERSATIONS);
    return conversations
      .filter(c => c.user_id === DEFAULT_USER_ID)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  async createConversation(params: CreateConversationParams = {}): Promise<AiConversation> {
    const { title = '新对话', model_name = 'google/gemini-2.5-flash' } = params;

    const newConversation: AiConversation = {
      id: generateUUID(),
      user_id: DEFAULT_USER_ID,
      title,
      model_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const conversations = this.getStorageData<AiConversation>(STORAGE_KEYS.CONVERSATIONS);
    conversations.push(newConversation);
    this.setStorageData(STORAGE_KEYS.CONVERSATIONS, conversations);

    return newConversation;
  }

  async getConversation(id: string): Promise<AiConversation | null> {
    const conversations = this.getStorageData<AiConversation>(STORAGE_KEYS.CONVERSATIONS);
    return conversations.find(c => c.id === id) || null;
  }

  async updateConversation(id: string, updates: Partial<AiConversation>): Promise<AiConversation> {
    const conversations = this.getStorageData<AiConversation>(STORAGE_KEYS.CONVERSATIONS);
    const index = conversations.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error('对话不存在');
    }

    const updatedConversation = {
      ...conversations[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    conversations[index] = updatedConversation;
    this.setStorageData(STORAGE_KEYS.CONVERSATIONS, conversations);

    return updatedConversation;
  }

  async deleteConversation(id: string): Promise<void> {
    const conversations = this.getStorageData<AiConversation>(STORAGE_KEYS.CONVERSATIONS);
    const filteredConversations = conversations.filter(c => c.id !== id);
    this.setStorageData(STORAGE_KEYS.CONVERSATIONS, filteredConversations);

    // 同时删除相关消息
    const messages = this.getStorageData<AiMessage>(STORAGE_KEYS.MESSAGES);
    const filteredMessages = messages.filter(m => m.conversation_id !== id);
    this.setStorageData(STORAGE_KEYS.MESSAGES, filteredMessages);
  }

  // === 消息操作 ===
  async getMessages(conversationId: string): Promise<AiMessage[]> {
    const messages = this.getStorageData<AiMessage>(STORAGE_KEYS.MESSAGES);
    return messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<AiMessage> {
    const newMessage: AiMessage = {
      id: generateUUID(),
      conversation_id: conversationId,
      role,
      content,
      timestamp: new Date().toISOString()
    };

    const messages = this.getStorageData<AiMessage>(STORAGE_KEYS.MESSAGES);
    messages.push(newMessage);
    this.setStorageData(STORAGE_KEYS.MESSAGES, messages);

    // 更新对话的最后更新时间
    await this.updateConversation(conversationId, { updated_at: new Date().toISOString() });

    return newMessage;
  }

  async deleteMessage(id: string): Promise<void> {
    const messages = this.getStorageData<AiMessage>(STORAGE_KEYS.MESSAGES);
    const filteredMessages = messages.filter(m => m.id !== id);
    this.setStorageData(STORAGE_KEYS.MESSAGES, filteredMessages);
  }

  // === 模板操作 ===
  async getTemplates(): Promise<AiPromptTemplate[]> {
    this.initializeSystemTemplates(); // 确保系统模板存在

    const templates = this.getStorageData<AiPromptTemplate>(STORAGE_KEYS.TEMPLATES);
    return templates
      .filter(t => t.user_id === DEFAULT_USER_ID || t.is_system)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createTemplate(params: CreateTemplateParams): Promise<AiPromptTemplate> {
    const { name, description, content } = params;

    const newTemplate: AiPromptTemplate = {
      id: generateUUID(),
      user_id: DEFAULT_USER_ID,
      name,
      description,
      content,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const templates = this.getStorageData<AiPromptTemplate>(STORAGE_KEYS.TEMPLATES);
    templates.push(newTemplate);
    this.setStorageData(STORAGE_KEYS.TEMPLATES, templates);

    return newTemplate;
  }

  async getTemplate(id: string): Promise<AiPromptTemplate | null> {
    const templates = this.getStorageData<AiPromptTemplate>(STORAGE_KEYS.TEMPLATES);
    return templates.find(t => t.id === id) || null;
  }

  async updateTemplate(id: string, updates: Partial<AiPromptTemplate>): Promise<AiPromptTemplate> {
    const templates = this.getStorageData<AiPromptTemplate>(STORAGE_KEYS.TEMPLATES);
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) {
      throw new Error('模板不存在');
    }

    if (templates[index].is_system) {
      throw new Error('不能修改系统预设模板');
    }

    const updatedTemplate = {
      ...templates[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    templates[index] = updatedTemplate;
    this.setStorageData(STORAGE_KEYS.TEMPLATES, templates);

    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    const templates = this.getStorageData<AiPromptTemplate>(STORAGE_KEYS.TEMPLATES);
    const template = templates.find(t => t.id === id);

    if (!template) {
      throw new Error('模板不存在');
    }

    if (template.is_system) {
      throw new Error('不能删除系统预设模板');
    }

    const filteredTemplates = templates.filter(t => t.id !== id);
    this.setStorageData(STORAGE_KEYS.TEMPLATES, filteredTemplates);
  }

  // 清理所有数据（开发用）
  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
  }
}

// 导出单例实例
export const localAiStorage = new LocalAiStorage();