import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Task, TaskStats } from '../types';
import { useToast } from './ToastContext';
import { db } from '../lib/database';
import { APP_CONFIG } from '../lib/config';

interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTasksByStatus: (status: Task['status']) => Task[];
  getTaskStats: () => TaskStats;
  clearError: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  // 新增：引入认证状态
  // 无需认证，直接使用应用
  // 新增：避免重复加载
  const [hasLoaded, setHasLoaded] = useState(false);

  // 初始化数据（简化版，无需认证）
  useEffect(() => {
    if (!hasLoaded) {
      (async () => {
        await loadInitialData();
        setHasLoaded(true);
      })();
    }
  }, [hasLoaded]);

  // 删除了认证相关的逻辑

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 加载项目
      const userProjects = await db.projects.getUserProjects();
      setProjects(userProjects);
      
      // 设置当前项目
      if (userProjects.length > 0 && !currentProject) {
        setCurrentProject(userProjects[0]);
        // 加载第一个项目的任务
        const projectTasks = await db.tasks.getProjectTasks(userProjects[0].id);
        setTasks(projectTasks);
      }
    } catch (err: any) {
      console.error('加载数据失败:', err);
      setError(err.message);
      showError('加载失败', '无法加载项目数据');
    } finally {
      setIsLoading(false);
    }
  };

  // 当切换项目时加载对应的任务
  const handleSetCurrentProject = async (project: Project | null) => {
    setCurrentProject(project);
    if (project) {
      try {
        setIsLoading(true);
        const projectTasks = await db.tasks.getProjectTasks(project.id);
        setTasks(projectTasks);
      } catch (err: any) {
        console.error('加载任务失败:', err);
        showError('加载失败', '无法加载项目任务');
      } finally {
        setIsLoading(false);
      }
    } else {
      setTasks([]);
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const clearError = () => setError(null);

  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 使用 Supabase 创建项目
      const newProject = await db.projects.createProject(projectData);
      
      // 更新本地状态
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      
      // 如果没有当前项目，设置为新创建的项目
      if (!currentProject) {
        setCurrentProject(newProject);
        setTasks([]); // 新项目没有任务
      }
      
      showSuccess('项目创建成功', `项目 "${newProject.name}" 已创建`);
    } catch (err: any) {
      const errorMessage = '创建项目失败';
      setError(errorMessage);
      showError('操作失败', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedProjects = projects.map(project =>
        project.id === id
          ? { ...project, ...updates, updated_at: new Date().toISOString() }
          : project
      );
      
      setProjects(updatedProjects);
      
      if (currentProject?.id === id) {
        setCurrentProject({ ...currentProject, ...updates });
      }
      
      showSuccess('项目更新成功');
    } catch (err) {
      const errorMessage = '更新项目失败';
      setError(errorMessage);
      showError('操作失败', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const projectToDelete = projects.find(p => p.id === id);
      const updatedProjects = projects.filter(project => project.id !== id);
      const updatedTasks = tasks.filter(task => task.project_id !== id);
      
      setProjects(updatedProjects);
      setTasks(updatedTasks);
      
      if (currentProject?.id === id) {
        setCurrentProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
      }
      
      showSuccess('项目删除成功', projectToDelete ? `项目 "${projectToDelete.name}" 已删除` : undefined);
    } catch (err) {
      const errorMessage = '删除项目失败';
      setError(errorMessage);
      showError('操作失败', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 使用 Supabase 创建任务
      const newTask = await db.tasks.createTask(taskData);
      
      // 更新本地状态
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      
      showSuccess('任务创建成功', `任务 "${newTask.title}" 已创建`);
    } catch (err: any) {
      console.error('创建任务详细错误:', err);
      const errorMessage = `创建任务失败: ${err.message || JSON.stringify(err)}`;
      setError(errorMessage);
      showError('操作失败', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 使用 Supabase 更新任务
      const updatedTask = await db.tasks.updateTask(id, updates);
      
      // 更新本地状态
      const updatedTasks = tasks.map(task =>
        task.id === id ? updatedTask : task
      );
      setTasks(updatedTasks);
      
      showSuccess('任务更新成功', `任务 "${updatedTask.title}" 已更新`);
    } catch (err: any) {
      const errorMessage = '更新任务失败';
      setError(errorMessage);
      showError('操作失败', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const taskToDelete = tasks.find(t => t.id === id);
      
      // 使用 Supabase 删除任务
      await db.tasks.deleteTask(id);
      
      // 更新本地状态
      setTasks(tasks.filter(task => task.id !== id));
      
      showSuccess('任务删除成功', taskToDelete ? `任务 "${taskToDelete.title}" 已删除` : undefined);
    } catch (err: any) {
      const errorMessage = '删除任务失败';
      setError(errorMessage);
      showError('操作失败', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentProjectTasks = () => {
    if (!currentProject) return [];
    return tasks.filter(task => task.project_id === currentProject.id);
  };

  const getTasksByStatus = (status: Task['status']) => {
    return getCurrentProjectTasks().filter(task => task.status === status);
  };

  const getTaskStats = () => {
    const currentTasks = getCurrentProjectTasks();
    const total = currentTasks.length;
    const todo = currentTasks.filter(t => t.status === 'todo').length;
    const in_progress = currentTasks.filter(t => t.status === 'in_progress').length;
    const done = currentTasks.filter(t => t.status === 'done').length;
    const completion_rate = total > 0 ? Math.round((done / total) * 100) : 0;
    const stats: TaskStats = { total, todo, in_progress, done, completion_rate };
    return stats;
  };

  const value: ProjectContextType = {
    projects,
    tasks,
    currentProject,
    isLoading,
    error,
    addProject,
    updateProject,
    deleteProject,
    setCurrentProject: handleSetCurrentProject,
    setProjects,
    setTasks,
    addTask,
    updateTask,
    deleteTask,
    getTasksByStatus,
    getTaskStats,
    clearError
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}