import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

// 安全：只使用匿名密钥，绝不在前端暴露服务角色密钥
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 项目配置
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  projectRef: import.meta.env.VITE_SUPABASE_PROJECT_REF!,
  accessToken: import.meta.env.VITE_SUPABASE_ACCESS_TOKEN!
}