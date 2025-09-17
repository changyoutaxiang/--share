import React from 'react';
import { BarChart3, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

export function AnalyticsView() {
  const { projects, tasks, getTaskStats } = useProject();
  const stats = getTaskStats();

  const getTasksByProject = () => {
    return projects.map(project => {
      const projectTasks = tasks.filter(task => task.project_id === project.id);
      const completedTasks = projectTasks.filter(task => task.status === 'done');
      return {
        project,
        total: projectTasks.length,
        completed: completedTasks.length,
        completion_rate: projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0
      };
    });
  };

  const getTasksByPriority = () => {
    const high = tasks.filter(task => task.priority === 'high').length;
    const medium = tasks.filter(task => task.priority === 'medium').length;
    const low = tasks.filter(task => task.priority === 'low').length;
    return { high, medium, low };
  };

  const getOverdueTasks = () => {
    const now = new Date();
    return tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) < now && 
      task.status !== 'done'
    ).length;
  };

  const getRecentActivity = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTasks = tasks.filter(task => 
      new Date(task.created_at) >= sevenDaysAgo
    ).length;
    
    const recentCompletions = tasks.filter(task => 
      task.status === 'done' && 
      new Date(task.updated_at) >= sevenDaysAgo
    ).length;
    
    return { created: recentTasks, completed: recentCompletions };
  };

  const projectStats = getTasksByProject();
  const priorityStats = getTasksByPriority();
  const overdueTasks = getOverdueTasks();
  const recentActivity = getRecentActivity();

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      ></div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* 概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={BarChart3}
          title="总任务数"
          value={stats.total}
          color="bg-blue-500"
        />
        <StatCard
          icon={CheckCircle}
          title="完成率"
          value={`${stats.completion_rate}%`}
          subtitle={`${stats.done}/${stats.total} 已完成`}
          color="bg-green-500"
        />
        <StatCard
          icon={Clock}
          title="逾期任务"
          value={overdueTasks}
          subtitle={overdueTasks > 0 ? "需要关注" : "暂无逾期"}
          color="bg-red-500"
        />
        <StatCard
          icon={TrendingUp}
          title="本周完成"
          value={recentActivity.completed}
          subtitle={`新建 ${recentActivity.created} 个`}
          color="bg-purple-500"
        />
      </div>

      {/* 项目进度 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">项目进度</h2>
        {projectStats.length > 0 ? (
          <div className="space-y-4">
            {projectStats.map((project) => (
              <div key={project.project.id} className="flex items-center space-x-4">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.project.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {project.project.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {project.completed}/{project.total} ({project.completion_rate}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={project.completed}
                    max={project.total}
                    color="bg-green-500"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">暂无项目数据</p>
        )}
      </div>

      {/* 任务状态分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">任务状态分布</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">待办事项</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 bg-yellow-500 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.todo / stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">{stats.todo}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">进行中</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.in_progress / stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">{stats.in_progress}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">已完成</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 bg-green-500 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8">{stats.done}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">优先级分布</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">高优先级</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{priorityStats.high}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">中优先级</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{priorityStats.medium}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">低优先级</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{priorityStats.low}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}