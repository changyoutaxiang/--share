import { supabase } from './supabase'
import { APP_CONFIG, getCurrentUser } from './config'
import {
  Note,
  NotesStats,
  SearchNotesParams,
  NoteCategory,
  AiConversation,
  AiMessage,
  AiPromptTemplate,
  AiStats,
  CreateConversationParams,
  SendMessageParams,
  CreateTemplateParams
} from '../types'
import { localAiStorage } from './localAiStorage'
import type {
  User,
  Project,
  Task,
  Tag,
  TaskTag,
  ProjectMember,
  ActivityLog,
  InsertProject,
  InsertTask,
  InsertTag,
  InsertTaskTag,
  InsertProjectMember,
  InsertActivityLog,
  UpdateProject,
  UpdateTask,
  UpdateTag,
  TaskWithTags,
  ProjectStats,
  TaskStatus,
  TaskPriority
} from '../types/database'

// 辅助函数：获取当前用户ID
async function getCurrentUserId(): Promise<string> {
  if (!APP_CONFIG.ENABLE_AUTH) {
    return APP_CONFIG.DEFAULT_USER_ID
  }

  if (APP_CONFIG.DEV_MODE) {
    return APP_CONFIG.AUTHORIZED_USER_ID
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.warn('获取用户信息失败:', error.message)
      // 如果网络错误，尝试从本地会话获取
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        return session.user.id
      }
      throw new Error('用户未登录')
    }
    if (!user) throw new Error('用户未登录')
    return user.id
  } catch (networkError: any) {
    console.warn('网络请求失败，尝试从本地会话获取用户:', networkError.message)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        return session.user.id
      }
    } catch (sessionError) {
      console.error('获取本地会话也失败:', sessionError)
    }
    throw new Error('用户未登录')
  }
}

// 认证操作
export const authOperations = {
  // 注册
  async signUp(email: string, password: string, name?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0]
        }
      }
    })
    if (error) throw error
    return data
  },

  // 登录
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  },

  // 登出
  async signOut() {
    // 添加超时机制，防止登出操作无限等待
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('登出超时')), 5000) // 减少超时时间到5秒
    })
    
    try {
      const signOutPromise = supabase.auth.signOut()
      const result = await Promise.race([signOutPromise, timeoutPromise])
      if (result && result.error) throw result.error
      
      // 登出成功，清除本地会话状态
      this.clearLocalSession()
      console.log('登出成功')
      return // 明确返回
      
    } catch (error: any) {
      console.warn('登出过程中出现问题:', error.message)
      
      // 无论是否超时，都清除本地会话状态
      // 这样可以确保用户界面正确更新，即使网络请求失败
      this.clearLocalSession()
      
      // 检查当前会话状态
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // 如果会话已经不存在，说明登出实际上是成功的
          console.log('会话已清除，登出成功')
          return // 不抛出错误
        }
      } catch (sessionError) {
        // 如果无法检查会话状态，假设登出成功
        console.log('无法检查会话状态，假设登出成功')
        return
      }
      
      // 只有在确认会话仍然存在时才抛出错误
      throw new Error('登出失败，请重试')
    }
  },

  // 清除本地会话状态的辅助方法
  clearLocalSession() {
    try {
      // 清除 Supabase 相关的本地存储
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('supabase.auth.token') || 
            key.startsWith('sb-') || 
            key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
      
      // 清除会话存储
      sessionStorage.clear()
      
      console.log('本地会话状态已清除')
    } catch (error) {
      console.warn('清除本地会话状态时出错:', error)
    }
  },

  // 获取当前用户
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }
}

// 用户相关操作
export const userOperations = {
  // 获取当前用户信息
  async getCurrentUser() {
    if (!APP_CONFIG.ENABLE_AUTH) {
      // 返回默认用户信息
      return getCurrentUser()
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) throw error
    return data
  },

  // 更新用户信息
  async updateUser(updates: Partial<User>) {
    if (!APP_CONFIG.ENABLE_AUTH) {
      // 简化模式下不支持更新用户信息
      throw new Error('简化模式下不支持更新用户信息')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// 项目相关操作
export const projectOperations = {
  // 获取用户的所有项目
  async getUserProjects() {
    if (!APP_CONFIG.ENABLE_AUTH || APP_CONFIG.DEV_MODE) {
      // 简化模式或开发模式：直接获取所有项目，绕过认证
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (authError) {
      // 如果认证失败，在开发环境下降级到无认证模式
      console.warn('认证失败，降级到无认证模式:', authError);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  },

  // 获取项目统计信息
  async getProjectStats() {
    const { data, error } = await supabase
      .from('project_stats')
      .select('*')

    if (error) throw error
    return data as ProjectStats[]
  },

  // 创建项目
  async createProject(project: Omit<InsertProject, 'user_id'>) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('projects')
      .insert({ ...project, user_id: userId })
      .select()
      .single()

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'project_created',
      project_id: data.id,
      details: { project_name: data.name }
    })

    return data
  },

  // 更新项目
  async updateProject(id: string, updates: UpdateProject) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'project_updated',
      project_id: id,
      details: { updates }
    })

    return data
  },

  // 删除项目
  async deleteProject(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'project_deleted',
      project_id: id
    })
  }
}

// 任务相关操作
export const taskOperations = {
  // 获取项目任务
  async getProjectTasks(projectId: string) {
    if (!APP_CONFIG.ENABLE_AUTH || APP_CONFIG.DEV_MODE) {
      // 简化模式或开发模式：直接获取项目任务
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (authError) {
      console.warn('任务查询认证失败，降级到无认证模式:', authError);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  },

  // 获取任务（带标签）
  async getTasksWithTags(projectId?: string) {
    if (!APP_CONFIG.ENABLE_AUTH || APP_CONFIG.DEV_MODE) {
      // 开发模式：直接获取任务，绕过认证
      let query = supabase
        .from('task_with_tags')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as TaskWithTags[]
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      let query = supabase
        .from('task_with_tags')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as TaskWithTags[]
    } catch (authError) {
      console.warn('任务带标签查询认证失败，降级到无认证模式:', authError);
      let query = supabase
        .from('task_with_tags')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as TaskWithTags[]
    }
  },

  // 获取单个任务
  async getTask(id: string) {
    const { data, error } = await supabase
      .from('task_with_tags')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as TaskWithTags
  },

  // 创建任务
  async createTask(task: Omit<InsertTask, 'user_id'>) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: userId })
      .select()
      .single()

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'task_created',
      project_id: task.project_id,
      task_id: data.id,
      details: { task_title: data.title }
    })

    return data
  },

  // 更新任务
  async updateTask(id: string, updates: UpdateTask) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'task_updated',
      project_id: data.project_id,
      task_id: id,
      details: { updates }
    })

    return data
  },

  // 删除任务
  async deleteTask(id: string) {
    // 先获取任务信息用于日志
    const task = await this.getTask(id)
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'task_deleted',
      project_id: task.project_id,
      task_id: id,
      details: { task_title: task.title }
    })
  },

  // 更新任务状态
  async updateTaskStatus(id: string, status: TaskStatus) {
    const updates: UpdateTask = { 
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null
    }

    return this.updateTask(id, updates)
  }
}

// 标签相关操作
export const tagOperations = {
  // 获取用户的所有标签
  async getUserTags() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('用户未登录')

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  },

  // 创建标签
  async createTag(tag: InsertTag) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    const { data, error } = await supabase
      .from('tags')
      .insert({ ...tag, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // 为任务添加标签
  async addTagToTask(taskId: string, tagId: string) {
    const { data, error } = await supabase
      .from('task_tags')
      .insert({ task_id: taskId, tag_id: tagId })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // 从任务移除标签
  async removeTagFromTask(taskId: string, tagId: string) {
    const { error } = await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId)

    if (error) throw error
  }
}

// 活动日志相关操作
export const activityOperations = {
  // 记录活动
  async logActivity(activity: Omit<InsertActivityLog, 'user_id'>) {
    try {
      const userId = await getCurrentUserId()
      
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({ ...activity, user_id: userId })
        .select()
        .single()

      if (error) console.error('记录活动日志失败:', error)
      return data
    } catch (error) {
      console.error('获取用户ID失败:', error)
      return null
    }
  },

  // 获取项目活动日志
  async getProjectActivities(projectId: string, limit = 50) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        users (
          name,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }
}

// 统计相关操作
export const statsOperations = {
  // 获取用户统计信息
  async getUserStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')

    // 获取项目数量
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    // 获取任务统计
    const { data: taskStats } = await supabase
      .from('tasks')
      .select('status')

    const totalTasks = taskStats?.length || 0
    const todoTasks = taskStats?.filter(t => t.status === 'todo').length || 0
    const inProgressTasks = taskStats?.filter(t => t.status === 'in_progress').length || 0
    const doneTasks = taskStats?.filter(t => t.status === 'done').length || 0

    // 获取标签数量
    const { count: tagCount } = await supabase
      .from('tags')
      .select('*', { count: 'exact', head: true })

    return {
      projectCount: projectCount || 0,
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      tagCount: tagCount || 0,
      completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
    }
  }
}

// 数据库连接测试
export const databaseOperations = {
  // 测试数据库连接
  async testConnection() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (error) {
        throw error
      }
      
      return {
        success: true,
        message: '数据库连接成功',
        data
      }
    } catch (error: any) {
      return {
        success: false,
        message: '数据库连接失败',
        error: error.message
      }
    }
  },

  // 获取数据库状态
  async getDatabaseStatus() {
    try {
      // 首先测试基础连接
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)

      if (error) {
        console.warn('数据库连接测试失败:', error.message)
        return {
          connected: false,
          authenticated: false,
          error: error.message
        }
      }

      // 测试用户认证状态
      let user = null
      let authenticated = false

      try {
        user = await authOperations.getCurrentUser()
        authenticated = !!user
      } catch (authError: any) {
        console.warn('用户认证检查失败:', authError.message)
        authenticated = false
      }

      // 如果用户已认证，获取统计信息
      let stats = null
      if (authenticated && user) {
        try {
          stats = await statsOperations.getUserStats()
        } catch (statsError: any) {
          console.warn('获取用户统计失败:', statsError.message)
        }
      }

      return {
        connected: true,
        authenticated,
        user,
        stats
      }
    } catch (error: any) {
      console.error('数据库状态检查失败:', error.message)
      return {
        connected: false,
        authenticated: false,
        error: error.message
      }
    }
  }
}

// 笔记相关操作
export const noteOperations = {
  // 获取用户的所有笔记
  async getUserNotes() {
    if (!APP_CONFIG.ENABLE_AUTH || APP_CONFIG.DEV_MODE) {
      // 简化模式或开发模式：直接获取所有笔记，绕过认证
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as Note[]
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as Note[]
    } catch (authError) {
      // 如果认证失败，在开发环境下降级到无认证模式
      console.warn('认证失败，降级到无认证模式:', authError);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as Note[]
    }
  },

  // 获取单个笔记
  async getNote(id: string) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Note
  },

  // 创建笔记
  async createNote(note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('notes')
      .insert({
        ...note,
        user_id: userId,
        title: note.title || '无标题笔记'
      })
      .select()
      .single()

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'note_created',
      details: { note_title: data.title }
    })

    return data as Note
  },

  // 更新笔记
  async updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'note_updated',
      details: { note_title: data.title, updates }
    })

    return data as Note
  },

  // 删除笔记
  async deleteNote(id: string) {
    // 先获取笔记信息用于日志
    const note = await this.getNote(id)

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'note_deleted',
      details: { note_title: note.title }
    })
  },

  // 搜索笔记
  async searchNotes(params: SearchNotesParams = {}) {
    const userId = await getCurrentUserId()
    const { query = '', category, favorites_only = false } = params

    try {
      // 使用数据库中的搜索函数
      const { data, error } = await supabase
        .rpc('search_notes', {
          search_user_id: userId,
          search_query: query,
          search_category: category || null,
          search_favorites_only: favorites_only
        })

      if (error) throw error
      return data as Note[]
    } catch (rpcError) {
      // 如果存储过程不可用，使用基础搜索
      console.warn('使用存储过程搜索失败，降级到基础搜索:', rpcError)

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
    }
  },

  // 切换收藏状态
  async toggleFavorite(id: string) {
    const note = await this.getNote(id)
    return this.updateNote(id, { is_favorite: !note.is_favorite })
  },

  // 按分类获取笔记
  async getNotesByCategory(category: NoteCategory) {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data as Note[]
  },

  // 获取收藏笔记
  async getFavoriteNotes() {
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_favorite', true)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data as Note[]
  },

  // 获取笔记统计
  async getNotesStats() {
    const userId = await getCurrentUserId()

    try {
      const { data, error } = await supabase
        .from('notes_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return data as NotesStats
    } catch (error) {
      // 如果视图不可用，手动计算统计
      console.warn('使用统计视图失败，手动计算统计:', error)

      const { data, error: countError } = await supabase
        .from('notes')
        .select('category, is_favorite, created_at, updated_at')
        .eq('user_id', userId)

      if (countError) throw countError

      const stats: NotesStats = {
        total_notes: data.length,
        work_notes: data.filter(n => n.category === 'work').length,
        personal_notes: data.filter(n => n.category === 'personal').length,
        study_notes: data.filter(n => n.category === 'study').length,
        ideas_notes: data.filter(n => n.category === 'ideas').length,
        other_notes: data.filter(n => n.category === 'other').length,
        favorite_notes: data.filter(n => n.is_favorite).length,
        last_note_created: data.length > 0 ? data.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : '',
        last_note_updated: data.length > 0 ? data.sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0].updated_at : ''
      }

      return stats
    }
  },

  // === AI日报周报功能预留的数据结构 ===

  // 获取指定日期的笔记（用于AI日报生成）
  async getNotesForDate(date: string) {
    const userId = await getCurrentUserId()
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Note[]
  },

  // 获取指定周的笔记（用于AI周报生成）
  async getNotesForWeek(startDate: string) {
    const userId = await getCurrentUserId()
    const weekStart = new Date(startDate)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Note[]
  },

  // 获取指定月份的笔记（用于AI月报生成）
  async getNotesForMonth(year: number, month: number) {
    const userId = await getCurrentUserId()
    const monthStart = new Date(year, month - 1, 1)
    monthStart.setHours(0, 0, 0, 0)

    const monthEnd = new Date(year, month, 0)
    monthEnd.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Note[]
  },

  // 获取按日期分组的笔记统计（用于AI分析）
  async getNotesGroupedByDate(days: number = 30) {
    const userId = await getCurrentUserId()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('notes')
      .select('created_at, title, category, tags')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    // 按日期分组
    const groupedData: Record<string, Note[]> = {}
    data.forEach(note => {
      const dateKey = new Date(note.created_at).toISOString().split('T')[0]
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = []
      }
      groupedData[dateKey].push(note as Note)
    })

    return groupedData
  }
}

// 检查是否使用本地存储
const USE_LOCAL_STORAGE = true; // 临时开启本地存储模式

// === AI对话操作 ===
export const aiOperations = {
  // 获取用户的所有对话
  async getConversations() {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.getConversations();
    }

    const userId = await getCurrentUserId()

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.warn('Supabase获取对话失败，切换到本地存储:', error.message);
        return await localAiStorage.getConversations();
      }
      return data as AiConversation[]
    } catch (err) {
      console.warn('获取对话失败，使用本地存储:', err);
      return await localAiStorage.getConversations();
    }
  },

  // 创建新对话
  async createConversation(params: CreateConversationParams = {}) {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.createConversation(params);
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
        console.warn('Supabase创建对话失败，切换到本地存储:', error.message);
        return await localAiStorage.createConversation(params);
      }

      // 记录活动日志
      try {
        await activityOperations.logActivity({
          action: 'ai_conversation_created',
          details: { conversation_title: title, model: model_name }
        })
      } catch (logError) {
        console.warn('记录活动日志失败:', logError);
      }

      return data as AiConversation
    } catch (err) {
      console.warn('创建对话失败，使用本地存储:', err);
      return await localAiStorage.createConversation(params);
    }
  },

  // 获取对话详情
  async getConversation(id: string) {
    if (USE_LOCAL_STORAGE) {
      const conversation = await localAiStorage.getConversation(id);
      if (!conversation) throw new Error('对话不存在');
      return conversation;
    }

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        const conversation = await localAiStorage.getConversation(id);
        if (!conversation) throw new Error('对话不存在');
        return conversation;
      }
      return data as AiConversation
    } catch (err) {
      const conversation = await localAiStorage.getConversation(id);
      if (!conversation) throw new Error('对话不存在');
      return conversation;
    }
  },

  // 更新对话
  async updateConversation(id: string, updates: Partial<AiConversation>) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as AiConversation
  },

  // 删除对话
  async deleteConversation(id: string) {
    const conversation = await this.getConversation(id)

    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'ai_conversation_deleted',
      details: { conversation_title: conversation.title }
    })
  },

  // 获取对话的消息列表
  async getMessages(conversationId: string) {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.getMessages(conversationId);
    }

    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })

      if (error) {
        return await localAiStorage.getMessages(conversationId);
      }
      return data as AiMessage[]
    } catch (err) {
      return await localAiStorage.getMessages(conversationId);
    }
  },

  // 添加消息到对话
  async addMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.addMessage(conversationId, role, content);
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
        return await localAiStorage.addMessage(conversationId, role, content);
      }

      // 更新对话的最后更新时间
      try {
        await supabase
          .from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
      } catch (updateError) {
        console.warn('更新对话时间失败:', updateError);
      }

      return data as AiMessage
    } catch (err) {
      return await localAiStorage.addMessage(conversationId, role, content);
    }
  },

  // 删除消息
  async deleteMessage(id: string) {
    const { error } = await supabase
      .from('ai_messages')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // 获取AI统计信息
  async getAiStats() {
    const userId = await getCurrentUserId()

    try {
      // 尝试使用统计视图
      const { data, error } = await supabase
        .from('ai_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return data as AiStats
    } catch (error) {
      // 如果视图不可用，手动计算统计
      console.warn('使用AI统计视图失败，手动计算:', error)

      const [conversationsResult, messagesResult] = await Promise.all([
        supabase
          .from('ai_conversations')
          .select('id, model_name, created_at')
          .eq('user_id', userId),
        supabase
          .from('ai_messages')
          .select('id, conversation_id')
          .eq('conversation_id', 'in', supabase
            .from('ai_conversations')
            .select('id')
            .eq('user_id', userId)
          )
      ])

      if (conversationsResult.error) throw conversationsResult.error
      if (messagesResult.error) throw messagesResult.error

      const conversations = conversationsResult.data
      const messages = messagesResult.data

      // 统计最常用的模型
      const modelCounts: Record<string, number> = {}
      conversations.forEach(conv => {
        modelCounts[conv.model_name] = (modelCounts[conv.model_name] || 0) + 1
      })

      const mostUsedModel = Object.entries(modelCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'google/gemini-2.5-flash'

      const lastConversationDate = conversations.length > 0
        ? conversations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : new Date().toISOString()

      const stats: AiStats = {
        total_conversations: conversations.length,
        total_messages: messages.length,
        templates_count: 0, // 会在下面更新
        most_used_model: mostUsedModel,
        last_conversation_date: lastConversationDate
      }

      // 获取模板数量
      const { count } = await supabase
        .from('ai_prompt_templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      stats.templates_count = count || 0

      return stats
    }
  }
}

// === 提示词模板操作 ===
export const aiTemplateOperations = {
  // 获取用户的提示词模板
  async getTemplates() {
    if (USE_LOCAL_STORAGE) {
      return await localAiStorage.getTemplates();
    }

    const userId = await getCurrentUserId()

    try {
      const { data, error } = await supabase
        .from('ai_prompt_templates')
        .select('*')
        .or(`user_id.eq.${userId},is_system.eq.true`)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Supabase获取模板失败，切换到本地存储:', error.message);
        return await localAiStorage.getTemplates();
      }
      return data as AiPromptTemplate[]
    } catch (err) {
      console.warn('获取模板失败，使用本地存储:', err);
      return await localAiStorage.getTemplates();
    }
  },

  // 获取系统预设模板
  async getSystemTemplates() {
    const { data, error } = await supabase
      .from('ai_prompt_templates')
      .select('*')
      .eq('is_system', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as AiPromptTemplate[]
  },

  // 创建提示词模板
  async createTemplate(params: CreateTemplateParams) {
    const userId = await getCurrentUserId()
    const { name, description, content } = params

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

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'ai_template_created',
      details: { template_name: name }
    })

    return data as AiPromptTemplate
  },

  // 获取模板详情
  async getTemplate(id: string) {
    const { data, error } = await supabase
      .from('ai_prompt_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as AiPromptTemplate
  },

  // 更新提示词模板
  async updateTemplate(id: string, updates: Partial<AiPromptTemplate>) {
    const { data, error } = await supabase
      .from('ai_prompt_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'ai_template_updated',
      details: { template_name: data.name }
    })

    return data as AiPromptTemplate
  },

  // 删除提示词模板
  async deleteTemplate(id: string) {
    const template = await this.getTemplate(id)

    if (template.is_system) {
      throw new Error('不能删除系统预设模板')
    }

    const { error } = await supabase
      .from('ai_prompt_templates')
      .delete()
      .eq('id', id)

    if (error) throw error

    // 记录活动日志
    await activityOperations.logActivity({
      action: 'ai_template_deleted',
      details: { template_name: template.name }
    })
  }
}

// 导出所有操作
export const db = {
  auth: authOperations,
  users: userOperations,
  projects: projectOperations,
  tasks: taskOperations,
  tags: tagOperations,
  notes: noteOperations,
  ai: aiOperations,
  aiTemplates: aiTemplateOperations,
  activities: activityOperations,
  stats: statsOperations,
  test: databaseOperations
}

export { supabase }
export default db