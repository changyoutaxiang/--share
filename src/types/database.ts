export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ProjectRole = 'owner' | 'admin' | 'member'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: TaskStatus
          priority: TaskPriority
          due_date: string | null
          completed_at: string | null
          url: string | null
          assignee: string | null
          project_id: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          due_date?: string | null
          completed_at?: string | null
          url?: string | null
          assignee?: string | null
          project_id?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          due_date?: string | null
          completed_at?: string | null
          url?: string | null
          assignee?: string | null
          project_id?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      task_tags: {
        Row: {
          id: string
          task_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: ProjectRole
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: ProjectRole
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: ProjectRole
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          task_id: string | null
          action: string
          details: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          task_id?: string | null
          action: string
          details?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          task_id?: string | null
          action?: string
          details?: any | null
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          content: string
          task_id: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          task_id: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          task_id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          filename: string
          file_url: string
          file_size: number | null
          mime_type: string | null
          task_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          filename: string
          file_url: string
          file_size?: number | null
          mime_type?: string | null
          task_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          filename?: string
          file_url?: string
          file_size?: number | null
          mime_type?: string | null
          task_id?: string
          user_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      task_with_tags: {
        Row: {
          id: string
          title: string
          description: string | null
          status: TaskStatus
          priority: TaskPriority
          due_date: string | null
          completed_at: string | null
          url: string | null
          assignee: string | null
          project_id: string | null
          user_id: string
          created_at: string
          updated_at: string
          tags: Array<{
            id: string
            name: string
            color: string
          }>
        }
      }
      project_stats: {
        Row: {
          id: string
          name: string
          total_tasks: number
          todo_tasks: number
          in_progress_tasks: number
          done_tasks: number
          completion_rate: number
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// 便捷类型别名
export type User = Database['public']['Tables']['users']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type TaskTag = Database['public']['Tables']['task_tags']['Row']
export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Attachment = Database['public']['Tables']['attachments']['Row']

export type InsertUser = Database['public']['Tables']['users']['Insert']
export type InsertProject = Database['public']['Tables']['projects']['Insert']
export type InsertTask = Database['public']['Tables']['tasks']['Insert']
export type InsertTag = Database['public']['Tables']['tags']['Insert']
export type InsertTaskTag = Database['public']['Tables']['task_tags']['Insert']
export type InsertProjectMember = Database['public']['Tables']['project_members']['Insert']
export type InsertActivityLog = Database['public']['Tables']['activity_logs']['Insert']
export type InsertComment = Database['public']['Tables']['comments']['Insert']
export type InsertAttachment = Database['public']['Tables']['attachments']['Insert']

export type UpdateUser = Database['public']['Tables']['users']['Update']
export type UpdateProject = Database['public']['Tables']['projects']['Update']
export type UpdateTask = Database['public']['Tables']['tasks']['Update']
export type UpdateTag = Database['public']['Tables']['tags']['Update']
export type UpdateTaskTag = Database['public']['Tables']['task_tags']['Update']
export type UpdateProjectMember = Database['public']['Tables']['project_members']['Update']
export type UpdateActivityLog = Database['public']['Tables']['activity_logs']['Update']
export type UpdateComment = Database['public']['Tables']['comments']['Update']
export type UpdateAttachment = Database['public']['Tables']['attachments']['Update']

// 视图类型
export type TaskWithTags = Database['public']['Views']['task_with_tags']['Row']
export type ProjectStats = Database['public']['Views']['project_stats']['Row']