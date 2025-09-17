import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  Bot,
  User,
  Settings,
  Trash2,
  Edit,
  Copy,
  ChevronDown,
  BookOpen,
  Zap,
  Clock
} from 'lucide-react';
import {
  AiConversation,
  AiMessage,
  AiPromptTemplate,
  CreateConversationParams
} from '../types';
import { db } from '../lib/database';
import { sendChatMessageStream, AVAILABLE_MODELS, generateConversationTitle } from '../lib/openrouter';
import { APP_CONFIG } from '../lib/config';
import { TemplateManager } from './TemplateManager';

export function ChatView() {
  // 状态管理
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [templates, setTemplates] = useState<AiPromptTemplate[]>([]);

  // UI状态
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // 输入状态
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState(APP_CONFIG.AI_CONFIG.DEFAULT_MODEL);
  const [selectedTemplate, setSelectedTemplate] = useState<AiPromptTemplate | null>(null);

  // 流式响应状态
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [conversationsData, templatesData] = await Promise.all([
        db.ai.getConversations(),
        db.aiTemplates.getTemplates()
      ]);

      setConversations(conversationsData);
      setTemplates(templatesData);

      // 如果有对话但没有选中对话，选中第一个
      if (conversationsData.length > 0 && !selectedConversation) {
        await selectConversation(conversationsData[0]);
      }
    } catch (err: any) {
      console.error('加载数据失败:', err);
      setError('加载数据失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedConversation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 选择对话
  const selectConversation = async (conversation: AiConversation) => {
    try {
      setSelectedConversation(conversation);
      setSelectedModel(conversation.model_name);

      const messagesData = await db.ai.getMessages(conversation.id);
      setMessages(messagesData);
    } catch (err: any) {
      console.error('加载消息失败:', err);
      setError('加载消息失败: ' + err.message);
    }
  };

  // 创建新对话
  const createNewConversation = async () => {
    try {
      const params: CreateConversationParams = {
        title: '新对话',
        model_name: selectedModel
      };

      const newConversation = await db.ai.createConversation(params);
      setConversations(prev => [newConversation, ...prev]);
      await selectConversation(newConversation);
    } catch (err: any) {
      console.error('创建对话失败:', err);
      setError('创建对话失败: ' + err.message);
    }
  };

  // 删除对话
  const deleteConversation = async (conversationId: string) => {
    if (!window.confirm('确定要删除这个对话吗？')) return;

    try {
      await db.ai.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('删除对话失败:', err);
      setError('删除对话失败: ' + err.message);
    }
  };

  // 发送消息
  const sendMessage = async () => {
    if (!inputMessage.trim() || sending || !selectedConversation) return;

    const messageContent = selectedTemplate
      ? `${selectedTemplate.content}\n\n${inputMessage}`
      : inputMessage;

    try {
      setSending(true);
      setIsStreaming(true);
      setStreamingMessage('');

      // 添加用户消息到数据库和UI
      const userMessage = await db.ai.addMessage(selectedConversation.id, 'user', messageContent);
      setMessages(prev => [...prev, userMessage]);

      // 清空输入和选中的模板
      setInputMessage('');
      setSelectedTemplate(null);

      // 如果是第一条消息，自动生成标题
      if (messages.length === 0) {
        try {
          const title = await generateConversationTitle(messageContent);
          await db.ai.updateConversation(selectedConversation.id, { title });
          setConversations(prev => prev.map(c =>
            c.id === selectedConversation.id ? { ...c, title } : c
          ));
        } catch (titleError) {
          console.warn('生成标题失败:', titleError);
        }
      }

      // 准备对话历史
      const allMessages = [...messages, userMessage];
      const chatHistory = allMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      // 发送流式请求
      let fullResponse = '';
      await sendChatMessageStream(
        chatHistory,
        selectedConversation.model_name,
        0.7,
        (chunk: string) => {
          fullResponse += chunk;
          setStreamingMessage(fullResponse);
        }
      );

      // 将AI回复保存到数据库
      const assistantMessage = await db.ai.addMessage(
        selectedConversation.id,
        'assistant',
        fullResponse
      );

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingMessage('');
      setIsStreaming(false);

    } catch (err: any) {
      console.error('发送消息失败:', err);
      setError('发送消息失败: ' + err.message);
      setIsStreaming(false);
      setStreamingMessage('');
    } finally {
      setSending(false);
    }
  };

  // 应用模板
  const applyTemplate = (template: AiPromptTemplate) => {
    setSelectedTemplate(template);
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  // 复制消息内容
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // 可以添加一个临时的提示
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;

    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* 左侧：对话列表 */}
      <div className="w-80 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-r border-surface-200/50 dark:border-surface-700/50 flex flex-col shadow-soft">
        {/* 头部工具栏 */}
        <div className="p-6 border-b border-surface-200/50 dark:border-surface-700/50 bg-gradient-to-r from-white/50 to-surface-50/50 dark:from-surface-800/50 dark:to-surface-900/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-medium">
                <Bot className="text-white" size={20} />
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-surface-900 to-surface-700 dark:from-white dark:to-surface-200 bg-clip-text text-transparent">
                AI 对话
              </h2>
            </div>
            <button
              onClick={createNewConversation}
              className="group p-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-soft hover:shadow-glow active:scale-95"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* 模型选择器 */}
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-3 bg-white/70 dark:bg-surface-800/70 border border-surface-200 dark:border-surface-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white text-sm font-medium transition-all duration-300 hover:bg-white/90 dark:hover:bg-surface-800/90 backdrop-blur-sm shadow-soft appearance-none cursor-pointer"
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.name} value={model.name}>
                  {model.displayName}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none" />
          </div>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center animate-fade-in">
                <div className="relative">
                  <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                  <div className="absolute inset-0 w-10 h-10 border-3 border-transparent border-t-primary-300 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                </div>
                <p className="text-sm text-surface-500 dark:text-surface-400 font-medium">智能加载中...</p>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center animate-fade-in">
              <div className="relative mb-6">
                <div className="p-4 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-3xl w-20 h-20 mx-auto flex items-center justify-center shadow-soft">
                  <MessageSquare size={32} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-medium">
                  <Plus size={12} className="text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-surface-700 dark:text-surface-200 mb-2">
                开启智能对话
              </h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-6 leading-relaxed">
                与AI助手开始您的第一次对话<br/>探索无限可能
              </p>
              <button
                onClick={createNewConversation}
                className="group px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-soft hover:shadow-glow active:scale-95 font-medium"
              >
                <span className="flex items-center space-x-2">
                  <Zap size={16} className="group-hover:scale-110 transition-transform duration-300" />
                  <span>开始对话</span>
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className={`group relative p-4 cursor-pointer rounded-xl transition-all duration-300 animate-slide-up ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 shadow-medium border border-primary-200 dark:border-primary-700/50'
                      : 'hover:bg-white/60 dark:hover:bg-surface-800/60 hover:shadow-soft'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {selectedConversation?.id === conversation.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-r-full" />
                  )}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pl-3">
                      <h3 className="font-semibold text-surface-900 dark:text-white text-sm truncate mb-1.5">
                        {conversation.title}
                      </h3>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="px-2 py-1 bg-surface-100 dark:bg-surface-700 rounded-lg text-xs text-surface-600 dark:text-surface-300 font-medium">
                          {AVAILABLE_MODELS.find(m => m.name === conversation.model_name)?.displayName || conversation.model_name}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-surface-400 dark:text-surface-500">
                        <Clock size={12} />
                        <span>{formatTime(conversation.updated_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：对话界面 */}
      <div className="flex-1 flex flex-col bg-white/60 dark:bg-surface-900/60 backdrop-blur-xl">
        {selectedConversation ? (
          <>
            {/* 对话头部 */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Bot className="text-white" size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedConversation.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {AVAILABLE_MODELS.find(m => m.name === selectedConversation.model_name)?.displayName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {templates.length} 个模板
                    </span>
                  </div>
                  <button
                    onClick={() => setShowTemplateManager(true)}
                    className="group flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 rounded-xl transition-all duration-300 shadow-soft hover:shadow-glow text-sm font-medium active:scale-95"
                    title="管理提示词模板"
                  >
                    <Settings size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span className="hidden sm:inline">模板管理</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={`group max-w-[80%] md:max-w-[70%] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-soft hover:shadow-glow'
                        : 'bg-white/90 dark:bg-surface-800/90 border border-surface-200/50 dark:border-surface-700/50 text-surface-900 dark:text-white shadow-soft hover:shadow-medium backdrop-blur-sm'
                    } rounded-2xl transition-all duration-300 hover:scale-[1.02]`}
                  >
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-soft">
                            <Bot size={14} className="text-white" />
                          </div>
                        )}
                        {message.role === 'user' && (
                          <div className="flex-shrink-0 p-1.5 bg-white/20 rounded-lg">
                            <User size={14} className="text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed font-medium">
                            {message.content}
                          </div>
                          <div className={`flex items-center justify-between mt-3 text-xs ${
                            message.role === 'user'
                              ? 'text-white/70'
                              : 'text-surface-500 dark:text-surface-400'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <Clock size={10} />
                              <span className="font-medium">{formatTime(message.timestamp)}</span>
                            </div>
                            <button
                              onClick={() => copyMessage(message.content)}
                              className={`group/copy p-1.5 rounded-lg transition-all duration-300 ${
                                message.role === 'user'
                                  ? 'hover:bg-white/20 text-white/70 hover:text-white'
                                  : 'hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
                              }`}
                              title="复制消息"
                            >
                              <Copy size={12} className="group-hover/copy:scale-110 transition-transform duration-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 流式响应显示 */}
              {isStreaming && streamingMessage && (
                <div className="flex justify-start animate-fade-in">
                  <div className="group max-w-[80%] md:max-w-[70%] bg-white/90 dark:bg-surface-800/90 border border-surface-200/50 dark:border-surface-700/50 text-surface-900 dark:text-white shadow-soft backdrop-blur-sm rounded-2xl">
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-soft">
                          <Bot size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed font-medium">
                            {streamingMessage}
                          </div>
                          <div className="flex items-center space-x-2 mt-3 text-xs text-surface-500 dark:text-surface-400">
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                            <span className="font-medium text-primary-600 dark:text-primary-400">AI正在思考...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="p-6 bg-gradient-to-t from-white/90 to-white/70 dark:from-surface-900/90 dark:to-surface-900/70 border-t border-surface-200/50 dark:border-surface-700/50 backdrop-blur-xl">
              {error && (
                <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-xl shadow-soft animate-slide-down">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 p-1 bg-red-500 rounded-full">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-medium hover:underline transition-colors"
                      >
                        关闭错误提示
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 选中的模板显示 */}
              {selectedTemplate && (
                <div className="mb-4 p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-700 rounded-xl shadow-soft animate-slide-down">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg shadow-soft">
                      <BookOpen size={14} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary-800 dark:text-primary-200">
                          {selectedTemplate.name}
                        </span>
                        <button
                          onClick={() => setSelectedTemplate(null)}
                          className="p-1.5 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-lg transition-all duration-300"
                        >
                          <div className="w-4 h-4 flex items-center justify-center text-lg font-bold">×</div>
                        </button>
                      </div>
                      <p className="text-xs text-primary-700 dark:text-primary-300 mt-1 font-medium">
                        {selectedTemplate.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-end space-x-3">
                {/* 模板选择按钮 */}
                <div className="relative">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className={`group p-3 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 text-primary-600 dark:text-primary-400 hover:from-primary-100 hover:to-primary-200 dark:hover:from-primary-800/30 dark:hover:to-primary-700/30 rounded-xl transition-all duration-300 border border-primary-200 dark:border-primary-700 shadow-soft hover:shadow-medium ${
                      showTemplates ? 'bg-primary-100 dark:bg-primary-800/30 shadow-glow' : ''
                    }`}
                    title="选择提示词模板"
                  >
                    <BookOpen size={20} className={`group-hover:scale-110 transition-transform duration-300 ${showTemplates ? 'rotate-12' : ''}`} />
                  </button>

                  {/* 模板下拉菜单 */}
                  {showTemplates && (
                    <div className="absolute bottom-16 left-0 w-80 bg-white/95 dark:bg-surface-800/95 border border-surface-200/50 dark:border-surface-700/50 rounded-2xl shadow-strong z-10 max-h-96 overflow-hidden backdrop-blur-xl animate-slide-up">
                      {/* 模板菜单头部 */}
                      <div className="p-4 border-b border-surface-200/50 dark:border-surface-700/50 bg-gradient-to-r from-primary-50/50 to-purple-50/50 dark:from-primary-900/20 dark:to-purple-900/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg shadow-soft">
                              <BookOpen size={14} className="text-white" />
                            </div>
                            <div className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                              提示词模板
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setShowTemplateManager(true);
                              setShowTemplates(false);
                            }}
                            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium hover:underline transition-colors"
                          >
                            管理模板
                          </button>
                        </div>
                        <div className="text-xs text-surface-600 dark:text-surface-400 mt-2 font-medium">
                          选择模板快速应用到对话中
                        </div>
                      </div>

                      {/* 模板列表 */}
                      <div className="max-h-72 overflow-y-auto">
                        {templates.length === 0 ? (
                          <div className="p-6 text-center">
                            <div className="p-4 bg-gradient-to-br from-surface-100 to-surface-200 dark:from-surface-700 dark:to-surface-800 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                              <BookOpen size={24} className="text-surface-500 dark:text-surface-400" />
                            </div>
                            <div className="text-sm text-surface-600 dark:text-surface-400 mb-3 font-medium">
                              暂无可用模板
                            </div>
                            <button
                              onClick={() => {
                                setShowTemplateManager(true);
                                setShowTemplates(false);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-soft hover:shadow-glow text-sm font-medium active:scale-95"
                            >
                              创建第一个模板
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 space-y-2">
                            {templates.map((template, index) => (
                              <button
                                key={template.id}
                                onClick={() => applyTemplate(template)}
                                className="group w-full text-left p-4 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 dark:hover:from-primary-900/20 dark:hover:to-purple-900/20 rounded-xl transition-all duration-300 border border-transparent hover:border-primary-200 dark:hover:border-primary-700/50 hover:shadow-soft animate-slide-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-semibold text-surface-900 dark:text-white text-sm truncate pr-2">
                                    {template.name}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {template.is_system ? (
                                      <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-amber-400 rounded-full shadow-soft" title="系统预设" />
                                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">系统</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-primary-400 rounded-full shadow-soft" title="用户创建" />
                                        <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">自定义</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-surface-600 dark:text-surface-400 line-clamp-2 mb-2 leading-relaxed">
                                  {template.description}
                                </div>
                                <div className="text-xs text-surface-500 dark:text-surface-500 line-clamp-1 font-mono bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded-lg">
                                  {template.content.length > 50
                                    ? `${template.content.substring(0, 50)}...`
                                    : template.content}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 模板菜单底部 */}
                      <div className="p-3 border-t border-surface-200/50 dark:border-surface-700/50 bg-gradient-to-r from-surface-50/50 to-surface-100/50 dark:from-surface-800/50 dark:to-surface-900/50">
                        <button
                          onClick={() => {
                            setShowTemplateManager(true);
                            setShowTemplates(false);
                          }}
                          className="w-full text-left p-3 text-sm text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all duration-300 flex items-center space-x-3 font-medium group"
                        >
                          <Settings size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                          <span>管理所有模板</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 消息输入框 */}
                <div className="flex-1 relative">
                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="输入你的消息... (Shift+Enter 换行，Enter 发送)"
                      className="w-full px-6 py-4 bg-white/80 dark:bg-surface-800/80 border border-surface-300 dark:border-surface-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white resize-none backdrop-blur-sm shadow-soft hover:shadow-medium transition-all duration-300 text-sm font-medium placeholder:text-surface-400 dark:placeholder:text-surface-500"
                      rows={1}
                      style={{ minHeight: '56px', maxHeight: '120px' }}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-surface-400 dark:text-surface-500 font-medium">
                      {inputMessage.length > 0 && `${inputMessage.length} 字符`}
                    </div>
                  </div>
                </div>

                {/* 发送按钮 */}
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || sending}
                  className="group p-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-primary-500 disabled:hover:to-primary-600 transition-all duration-300 shadow-soft hover:shadow-glow active:scale-95"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          // 未选择对话的欢迎界面
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-lg animate-fade-in">
              <div className="relative mb-8">
                <div className="p-6 bg-gradient-to-br from-primary-100 to-purple-200 dark:from-primary-900/30 dark:to-purple-900/30 rounded-3xl w-32 h-32 mx-auto flex items-center justify-center shadow-strong backdrop-blur-sm">
                  <Bot size={48} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-medium animate-bounce-subtle">
                  <Zap size={16} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -left-2 w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center shadow-medium">
                  <MessageSquare size={12} className="text-white" />
                </div>
              </div>

              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">
                开启智慧对话之旅
              </h3>

              <p className="text-surface-600 dark:text-surface-400 mb-8 leading-relaxed text-lg">
                与AI助手开始深度交流，探索知识的无限可能。<br />
                从左侧选择对话，或创建全新的智能体验。
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={createNewConversation}
                  className="group flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-soft hover:shadow-glow font-semibold text-lg active:scale-95"
                >
                  <Zap size={20} className="group-hover:scale-110 transition-transform duration-300" />
                  <span>开始新对话</span>
                </button>

                <button
                  onClick={() => setShowTemplateManager(true)}
                  className="group flex items-center space-x-3 px-6 py-3 bg-white/80 dark:bg-surface-800/80 text-surface-700 dark:text-surface-300 rounded-xl hover:bg-white dark:hover:bg-surface-800 transition-all duration-300 shadow-soft hover:shadow-medium backdrop-blur-sm border border-surface-200 dark:border-surface-700"
                >
                  <Settings size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span>管理模板</span>
                </button>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-white/50 dark:bg-surface-800/50 rounded-xl backdrop-blur-sm border border-surface-200/50 dark:border-surface-700/50">
                  <MessageSquare size={24} className="mx-auto mb-2 text-primary-500" />
                  <p className="text-xs text-surface-600 dark:text-surface-400 font-medium">智能对话</p>
                </div>
                <div className="p-4 bg-white/50 dark:bg-surface-800/50 rounded-xl backdrop-blur-sm border border-surface-200/50 dark:border-surface-700/50">
                  <BookOpen size={24} className="mx-auto mb-2 text-purple-500" />
                  <p className="text-xs text-surface-600 dark:text-surface-400 font-medium">模板系统</p>
                </div>
                <div className="p-4 bg-white/50 dark:bg-surface-800/50 rounded-xl backdrop-blur-sm border border-surface-200/50 dark:border-surface-700/50">
                  <Bot size={24} className="mx-auto mb-2 text-emerald-500" />
                  <p className="text-xs text-surface-600 dark:text-surface-400 font-medium">AI助手</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 模板管理器模态框 */}
      {showTemplateManager && (
        <TemplateManager
          onClose={() => setShowTemplateManager(false)}
          onTemplateChange={loadData}
        />
      )}
    </div>
  );
}