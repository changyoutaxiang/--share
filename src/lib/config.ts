// 应用配置
export const APP_CONFIG = {
  // 环境检测
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,

  // 认证配置
  ENABLE_AUTH: true,

  // 授权用户（您的邮箱）
  AUTHORIZED_USER_EMAIL: 'wangdong@51talk.com',
  AUTHORIZED_USER_ID: 'd357f1a4-7023-40ba-9378-3c2c8f3b9309',

  // 默认用户信息（简化模式使用）
  DEFAULT_USER_ID: 'd357f1a4-7023-40ba-9378-3c2c8f3b9309',
  DEFAULT_USER_EMAIL: 'wangdong@51talk.com',
  DEFAULT_USER_NAME: 'Wang Dong',

  // 开发模式（仅开发环境生效）
  DEV_MODE: import.meta.env.DEV && import.meta.env.VITE_DEV_MODE === 'true',

  // 应用信息
  APP_NAME: '智能工作助手',
  APP_VERSION: '2.0.0',

  // AI功能配置
  AI_CONFIG: {
    DEFAULT_MODEL: 'google/gemini-2.5-flash',
    MAX_CONVERSATION_LENGTH: 50, // 最大对话轮数
    AUTO_TITLE_GENERATION: true, // 自动生成对话标题
    STREAM_RESPONSE: true // 启用流式响应
  }
}

// 获取当前用户信息（简化版）
export function getCurrentUser() {
  return {
    id: APP_CONFIG.DEFAULT_USER_ID,
    email: APP_CONFIG.DEFAULT_USER_EMAIL,
    name: APP_CONFIG.DEFAULT_USER_NAME
  }
}