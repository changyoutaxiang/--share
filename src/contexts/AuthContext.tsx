import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { APP_CONFIG, getCurrentUser } from '../lib/config'
import type { User } from '@supabase/supabase-js'
import { db } from '../lib/database'
import type { User as DatabaseUser } from '../types/database'

interface AuthContextType {
  user: User | null
  userProfile: DatabaseUser | null
  loading: boolean
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<DatabaseUser>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<DatabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!APP_CONFIG.ENABLE_AUTH) {
      // 简化模式：直接设置默认用户
      const defaultUser = getCurrentUser()
      setUserProfile(defaultUser as DatabaseUser)
      // 在简化模式下，我们不需要设置 Supabase User 对象
      setUser(null)
      setLoading(false)
      return
    }

    // 开发模式：使用模拟用户绕过邮箱验证
    if (APP_CONFIG.DEV_MODE) {
      const devUser = {
        id: APP_CONFIG.DEV_USER_ID,
        email: APP_CONFIG.DEV_USER_EMAIL,
        name: APP_CONFIG.DEV_USER_NAME
      } as DatabaseUser
      
      setUserProfile(devUser)
      // 创建一个模拟的 Supabase User 对象
      const mockUser = {
        id: APP_CONFIG.DEV_USER_ID,
        email: APP_CONFIG.DEV_USER_EMAIL,
        user_metadata: { name: APP_CONFIG.DEV_USER_NAME },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString()
      } as User
      setUser(mockUser)
      setLoading(false)
      return
    }

    // 获取初始会话
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        
        if (session?.user) {
          try {
            const profile = await db.users.getCurrentUser()
            setUserProfile(profile)
          } catch (error) {
            console.warn('获取用户资料失败，可能是新用户:', error)
            setUserProfile(null)
          }
        }
      } catch (error) {
        console.error('获取初始会话失败:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          try {
            const profile = await db.users.getCurrentUser()
            setUserProfile(profile)
          } catch (error) {
            console.warn('获取用户资料失败，可能是新用户:', error)
            setUserProfile(null)
          }
        } else {
          setUserProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name?: string) => {
    if (!APP_CONFIG.ENABLE_AUTH) {
      throw new Error('简化模式下不支持注册操作')
    }
    
    try {
      setLoading(true)
      await db.auth.signUp(email, password, name)
      // 注册成功后，用户需要验证邮箱
    } catch (error: any) {
      throw new Error(error.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!APP_CONFIG.ENABLE_AUTH) {
      throw new Error('简化模式下不支持登录操作')
    }
    
    try {
      setLoading(true)
      await db.auth.signIn(email, password)
    } catch (error: any) {
      throw new Error(error.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    if (!APP_CONFIG.ENABLE_AUTH) {
      throw new Error('简化模式下不支持登出操作')
    }
    
    try {
      setLoading(true)
      await db.auth.signOut()
      
      console.log('AuthContext: 登出成功，用户状态已清除')
      
    } catch (error: any) {
      console.warn('AuthContext: 登出过程中出现问题:', error.message)
      
      // 检查错误类型，决定是否重新抛出
      if (error.message === '登出失败，请重试') {
        // 只有在确认登出真正失败时才抛出错误
        throw error
      }
      
      // 对于其他错误（如超时），不抛出错误，因为底层已经清除了状态
      console.log('AuthContext: 登出过程完成（可能超时，但状态已清除）')
      
    } finally {
      // 确保用户状态总是被清除，loading状态总是被重置
      setUser(null)
      setUserProfile(null)
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<DatabaseUser>) => {
    try {
      if (!user) throw new Error('未登录')
      
      const updatedProfile = await db.users.updateUser(updates)
      setUserProfile(updatedProfile)
    } catch (error: any) {
      throw new Error(error.message || '更新资料失败')
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}