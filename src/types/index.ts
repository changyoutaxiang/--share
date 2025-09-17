export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  created_at: string;
  updated_at: string;
  due_date?: string;
  url?: string;
  assignee?: string;
}

export interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  completion_rate: number;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: 'work' | 'personal' | 'study' | 'ideas' | 'other';
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotesStats {
  total_notes: number;
  work_notes: number;
  personal_notes: number;
  study_notes: number;
  ideas_notes: number;
  other_notes: number;
  favorite_notes: number;
  last_note_created: string;
  last_note_updated: string;
}

export type NoteCategory = Note['category'];

export interface SearchNotesParams {
  query?: string;
  category?: NoteCategory;
  favorites_only?: boolean;
}

// AI功能相关类型定义（为日报周报功能预留）
export interface DailyReport {
  date: string;
  notes_count: number;
  categories_summary: Record<NoteCategory, number>;
  key_topics: string[];
  productivity_insights: string[];
  notes: Note[];
}

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  total_notes: number;
  daily_breakdown: Record<string, number>;
  category_trends: Record<NoteCategory, number>;
  most_productive_day: string;
  weekly_themes: string[];
  notes: Note[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  total_notes: number;
  weekly_breakdown: Record<string, number>;
  category_distribution: Record<NoteCategory, number>;
  growth_trends: {
    vs_last_month: number;
    daily_average: number;
  };
  monthly_highlights: string[];
  notes: Note[];
}

export type TimeRange = 'all' | 'today' | 'week' | 'month';

// 笔记分组数据结构
export interface GroupedNotes {
  [date: string]: Note[];
}

// AI对话相关类型定义
export interface AiConversation {
  id: string;
  user_id: string;
  title: string;
  model_name: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AiPromptTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string;
  content: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// AI对话统计
export interface AiStats {
  total_conversations: number;
  total_messages: number;
  templates_count: number;
  most_used_model: string;
  last_conversation_date: string;
}

// 新的视图类型
export type ViewType = 'kanban' | 'list' | 'analytics' | 'settings' | 'db-test' | 'notes' | 'chat';

// AI模型选项
export interface ModelOption {
  name: string;
  displayName: string;
  maxTokens: number;
  temperature: number;
}

// 流式响应处理器
export type StreamHandler = (chunk: string) => void;

// 对话创建参数
export interface CreateConversationParams {
  title?: string;
  model_name?: string;
}

// 消息发送参数
export interface SendMessageParams {
  conversation_id: string;
  content: string;
  template_id?: string;
}

// 提示词模板创建参数
export interface CreateTemplateParams {
  name: string;
  description: string;
  content: string;
}

