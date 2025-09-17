import React, { useState } from 'react';
import { User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../lib/config';

export function UserMenu() {
  const { user, userProfile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 生产环境显示真实用户信息，开发环境显示授权用户信息
  const displayName = userProfile?.name || user?.email?.split('@')[0] || '用户';
  const displayEmail = userProfile?.email || user?.email || APP_CONFIG.AUTHORIZED_USER_EMAIL;

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);

      if (APP_CONFIG.DEV_MODE) {
        // 开发模式：设置登出标识，然后刷新显示登录页面
        localStorage.setItem('force_login', 'true');
        window.location.reload();
      } else {
        // 生产模式：真正的 Supabase 登出
        await signOut();
        // 登出成功后跳转到登录页面
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('登出失败:', error);
      // 即使失败也清除本地状态
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {displayName?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium">{displayName}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{displayEmail}</div>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{displayName}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{displayEmail}</div>
                </div>
              </div>
            </div>

            <div className="p-2">
              {APP_CONFIG.IS_DEVELOPMENT && (
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 mb-2">
                  {APP_CONFIG.DEV_MODE ? '开发模式' : '生产模式'}
                </div>
              )}

              <button
                onClick={() => {
                  setIsOpen(false);
                  // 这里可以添加打开设置页面的逻辑
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <Settings size={16} />
                <span>设置</span>
              </button>

              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
              >
                <LogOut size={16} />
                <span>{isLoggingOut ? '登出中...' : '登出'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}