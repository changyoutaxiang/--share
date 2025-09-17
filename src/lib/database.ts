import { supabase } from './supabase'
import { APP_CONFIG } from './config'
import {
  Note,
  NotesStats,
  SearchNotesParams,
  NoteCategory,
  AiConversation,
  AiMessage,
  AiPromptTemplate,
  CreateConversationParams,
  CreateTemplateParams
} from '../types'
import { localAiStorage } from './localAiStorage'
import type {
  User,
  Project,
  Task,
  TaskWithTags,
  TaskStatus,
  TaskPriority,
  InsertProject,
  InsertTask,
  UpdateProject,
  UpdateTask
} from '../types/database'

// 辅助函数：获取当前用户ID（固定用户ID，无需认证）
async function getCurrentUserId(): Promise<string> {
  return APP_CONFIG.DEFAULT_USER_ID
}

// 用户操作（简化版）
export const userOperations = {
  async getCurrentUser() {
    return {
      id: APP_CONFIG.DEFAULT_USER_ID,
      email: APP_CONFIG.DEFAULT_USER_EMAIL,
      name: APP_CONFIG.DEFAULT_USER_NAME
    }
  }
}

// 项目相关操作
export const projectOperations = {
  async getUserProjects() {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Project[]
  },

  async createProject(project: InsertProject) {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...project,
        user_id: userId
      })
      .select()
      .single()

    if (error) throw error
    return data as Project
  },

  async updateProject(id: string, updates: UpdateProject) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Project
  },

  async deleteProject(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// 任务相关操作
export const taskOperations = {
  async getTasksWithTags(projectId?: string) {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects(name, color)
      `)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data as TaskWithTags[]
  },

  async createTask(task: InsertTask) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single()

    if (error) throw error
    return data as Task
  },

  async updateTask(id: string, updates: UpdateTask) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Task
  },

  async deleteTask(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// 笔记相关操作
export const noteOperations = {
  async getUserNotes() {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data as Note[]
  },

  async createNote(note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('notes')
      .insert({
        ...note,
        user_id: userId
      })
      .select()
      .single()

    if (error) throw error
    return data as Note
  },

  async updateNote(id: string, updates: Partial<Note>) {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Note
  },

  async deleteNote(id: string) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async searchNotes(params: SearchNotesParams = {}) {
    const userId = await getCurrentUserId()
    const { query = '', category, favorites_only = false } = params

    let dbQuery = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)

    if (category) {
      dbQuery = dbQuery.eq('category', category)
    }

    if (favorites_only) {
      dbQuery = dbQuery.eq('is_favorite', true)
    }

    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    }

    const { data, error } = await dbQuery.order('updated_at', { ascending: false })

    if (error) throw error
    return data as Note[]
  },

  async toggleFavorite(id: string) {
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('is_favorite')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { data, error } = await supabase
      .from('notes')
      .update({ is_favorite: !note.is_favorite })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Note
  }
}

// 检查是否使用本地存储
const USE_LOCAL_STORAGE = true

// AI对话操作
export const aiOperations = {
  async getConversations() {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.getConversations()
    }

    const userId = await getCurrentUserId()
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        return await localAiStorage.getConversations()
      }
      return data as AiConversation[]
    } catch (err) {
      return await localAiStorage.getConversations()
    }
  },

  async createConversation(params: CreateConversationParams = {}) {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.createConversation(params)
    }

    const userId = await getCurrentUserId()
    const { title = '新对话', model_name = 'google/gemini-2.5-flash' } = params

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: userId,
          title,
          model_name
        })
        .select()
        .single()

      if (error) {
        return await localAiStorage.createConversation(params)
      }
      return data as AiConversation
    } catch (err) {
      return await localAiStorage.createConversation(params)
    }
  },

  async getMessages(conversationId: string) {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.getMessages(conversationId)
    }

    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })

      if (error) {
        return await localAiStorage.getMessages(conversationId)
      }
      return data as AiMessage[]
    } catch (err) {
      return await localAiStorage.getMessages(conversationId)
    }
  },

  async addMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.addMessage(conversationId, role, content)
    }

    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content
        })
        .select()
        .single()

      if (error) {
        return await localAiStorage.addMessage(conversationId, role, content)
      }

      return data as AiMessage
    } catch (err) {
      return await localAiStorage.addMessage(conversationId, role, content)
    }
  }
}

// AI模板操作
export const aiTemplateOperations = {
  async getTemplates() {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.getTemplates()
    }

    const userId = await getCurrentUserId()
    try {
      const { data, error } = await supabase
        .from('ai_prompt_templates')
        .select('*')
        .or(`user_id.eq.${userId},is_system.eq.true`)
        .order('created_at', { ascending: false })

      if (error) {
        return await localAiStorage.getTemplates()
      }
      return data as AiPromptTemplate[]
    } catch (err) {
      return await localAiStorage.getTemplates()
    }
  },

  async createTemplate(params: CreateTemplateParams) {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.createTemplate(params)
    }

    const userId = await getCurrentUserId()
    const { name, description, content } = params

    try {
      const { data, error } = await supabase
        .from('ai_prompt_templates')
        .insert({
          user_id: userId,
          name,
          description,
          content,
          is_system: false
        })
        .select()
        .single()

      if (error) {
        return await localAiStorage.createTemplate(params)
      }
      return data as AiPromptTemplate
    } catch (err) {
      return await localAiStorage.createTemplate(params)
    }
  }
}

// 导出所有操作
export const db = {
  users: userOperations,
  projects: projectOperations,
  tasks: taskOperations,
  notes: noteOperations,
  ai: aiOperations,
  aiTemplates: aiTemplateOperations
}

export { supabase }
export default db