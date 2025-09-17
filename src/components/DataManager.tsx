import React, { useRef } from 'react';
import { Download, Upload, FileText, AlertTriangle } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import { Project, Task } from '../types';

interface ExportData {
  projects: Project[];
  tasks: Task[];
  exportDate: string;
  version: string;
}

export function DataManager() {
  const { projects, tasks, setProjects, setTasks } = useProject();
  const { showSuccess, showError, showInfo } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    try {
      const exportData: ExportData = {
        projects,
        tasks,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `project-data-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      showSuccess('数据导出成功', `已导出 ${projects.length} 个项目和 ${tasks.length} 个任务`);
    } catch (error) {
      console.error('Export error:', error);
      showError('导出失败', '数据导出过程中发生错误');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      showError('文件格式错误', '请选择 JSON 格式的文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData: ExportData = JSON.parse(content);
        
        // 验证数据格式
        if (!importData.projects || !importData.tasks || !Array.isArray(importData.projects) || !Array.isArray(importData.tasks)) {
          throw new Error('Invalid data format');
        }

        // 显示确认对话框
        const confirmImport = window.confirm(
          `确定要导入数据吗？\n\n` +
          `将导入：\n` +
          `- ${importData.projects.length} 个项目\n` +
          `- ${importData.tasks.length} 个任务\n\n` +
          `当前数据将被替换，此操作无法撤销。`
        );

        if (confirmImport) {
          setProjects(importData.projects);
          setTasks(importData.tasks);
          showSuccess(
            '数据导入成功', 
            `已导入 ${importData.projects.length} 个项目和 ${importData.tasks.length} 个任务`
          );
        }
      } catch (error) {
        console.error('Import error:', error);
        showError('导入失败', '文件格式不正确或数据损坏');
      }
    };

    reader.onerror = () => {
      showError('读取失败', '无法读取文件内容');
    };

    reader.readAsText(file);
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAllData = () => {
    const confirmClear = window.confirm(
      '确定要清空所有数据吗？\n\n' +
      '这将删除所有项目和任务，此操作无法撤销。\n' +
      '建议在清空前先导出数据备份。'
    );

    if (confirmClear) {
      setProjects([]);
      setTasks([]);
      showInfo('数据已清空', '所有项目和任务已被删除');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-3 lg:p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 lg:p-6">
      <div className="flex items-center mb-4 lg:mb-6">
        <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 mr-2 lg:mr-3" />
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900">数据管理</h2>
      </div>

      <div className="space-y-4 lg:space-y-6">
        {/* 数据统计 */}
        <div className="grid grid-cols-2 gap-3 lg:gap-4 p-3 lg:p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-xl lg:text-2xl font-bold text-blue-600">{projects.length}</div>
            <div className="text-xs lg:text-sm text-gray-600">项目</div>
          </div>
          <div className="text-center">
            <div className="text-xl lg:text-2xl font-bold text-green-600">{tasks.length}</div>
            <div className="text-xs lg:text-sm text-gray-600">任务</div>
          </div>
        </div>

        {/* 导出功能 */}
        <div className="space-y-2 lg:space-y-3">
          <h3 className="text-base lg:text-lg font-medium text-gray-900">导出数据</h3>
          <p className="text-xs lg:text-sm text-gray-600">
            将所有项目和任务数据导出为 JSON 文件，可用于备份或迁移到其他设备。
          </p>
          <button
            onClick={exportData}
            className="inline-flex items-center px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base w-full sm:w-auto justify-center sm:justify-start"
          >
            <Download className="w-4 h-4 mr-2" />
            导出数据
          </button>
        </div>

        {/* 导入功能 */}
        <div className="space-y-2 lg:space-y-3">
          <h3 className="text-base lg:text-lg font-medium text-gray-900">导入数据</h3>
          <p className="text-xs lg:text-sm text-gray-600">
            从 JSON 文件导入项目和任务数据。导入的数据将替换当前所有数据。
          </p>
          <div className="flex items-center space-x-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-3 lg:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm lg:text-base w-full sm:w-auto justify-center sm:justify-start"
            >
              <Upload className="w-4 h-4 mr-2" />
              选择文件导入
            </button>
          </div>
        </div>

        {/* 清空数据 */}
        <div className="space-y-2 lg:space-y-3 pt-4 lg:pt-6 border-t border-gray-200">
          <h3 className="text-base lg:text-lg font-medium text-gray-900 flex items-center">
            <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-500 mr-2" />
            危险操作
          </h3>
          <p className="text-xs lg:text-sm text-gray-600">
            清空所有数据将永久删除所有项目和任务，此操作无法撤销。
          </p>
          <button
            onClick={clearAllData}
            className="inline-flex items-center px-3 lg:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm lg:text-base w-full sm:w-auto justify-center sm:justify-start"
          >
            清空所有数据
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}