import { useEffect, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Task } from '../types';

export function useTaskReminders(tasks: Task[]) {
  const { addNotification, showBrowserNotification, isPermissionGranted } = useNotification();

  // 检查任务截止日期
  const checkTaskDeadlines = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    tasks.forEach(task => {
      if (!task.due_date || task.status === 'done') return;

      const dueDate = new Date(task.due_date);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      
      // 检查是否已过期
      if (dueDateOnly < today) {
        const daysOverdue = Math.floor((today.getTime() - dueDateOnly.getTime()) / (1000 * 60 * 60 * 24));
        
        addNotification({
          title: '任务已过期',
          message: `任务"${task.title}"已过期 ${daysOverdue} 天`,
          type: 'error',
          duration: 0, // 不自动消失
          actions: [
            {
              label: '查看任务',
              action: () => {
                // 这里可以添加跳转到任务的逻辑
                console.log('查看过期任务:', task.id);
              }
            }
          ]
        });

        // 显示浏览器通知
        if (isPermissionGranted) {
          showBrowserNotification('任务已过期', {
            body: `任务"${task.title}"已过期 ${daysOverdue} 天`,
            tag: `overdue-${task.id}`,
          });
        }
      }
      // 检查是否今天到期
      else if (dueDateOnly.getTime() === today.getTime()) {
        addNotification({
          title: '任务今天到期',
          message: `任务"${task.title}"今天到期，请及时完成`,
          type: 'warning',
          duration: 8000,
          actions: [
            {
              label: '查看任务',
              action: () => {
                console.log('查看今日到期任务:', task.id);
              }
            }
          ]
        });

        if (isPermissionGranted) {
          showBrowserNotification('任务今天到期', {
            body: `任务"${task.title}"今天到期`,
            tag: `due-today-${task.id}`,
          });
        }
      }
      // 检查是否明天到期
      else if (dueDateOnly.getTime() === tomorrow.getTime()) {
        addNotification({
          title: '任务明天到期',
          message: `任务"${task.title}"明天到期，请提前准备`,
          type: 'info',
          duration: 6000,
          actions: [
            {
              label: '查看任务',
              action: () => {
                console.log('查看明日到期任务:', task.id);
              }
            }
          ]
        });
      }
    });
  }, [tasks, addNotification, showBrowserNotification, isPermissionGranted]);

  // 定期检查任务截止日期（每分钟检查一次）
  useEffect(() => {
    // 立即检查一次
    checkTaskDeadlines();

    // 设置定时器
    const interval = setInterval(checkTaskDeadlines, 60000); // 每分钟检查一次

    return () => clearInterval(interval);
  }, [checkTaskDeadlines]);

  // 任务完成通知
  const notifyTaskCompletion = useCallback((task: Task) => {
    addNotification({
      title: '任务已完成',
      message: `恭喜！任务"${task.title}"已完成`,
      type: 'success',
      duration: 4000,
    });

    if (isPermissionGranted) {
      showBrowserNotification('任务已完成', {
        body: `恭喜！任务"${task.title}"已完成`,
        tag: `completed-${task.id}`,
      });
    }
  }, [addNotification, showBrowserNotification, isPermissionGranted]);

  // 任务创建通知
  const notifyTaskCreation = useCallback((task: Task) => {
    addNotification({
      title: '新任务已创建',
      message: `任务"${task.title}"已成功创建`,
      type: 'success',
      duration: 3000,
    });
  }, [addNotification]);

  return {
    notifyTaskCompletion,
    notifyTaskCreation,
    checkTaskDeadlines,
  };
}