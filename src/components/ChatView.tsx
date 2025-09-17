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
import { sendChatMessageStream, AVAILABLE_MODELS } from '../lib/openrouter';
import { APP_CONFIG } from '../lib/config';
import { TemplateManager } from './TemplateManager';
import { TitleGeneratorService } from '../lib/titleGeneratorService';

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

      // 预备标题更新逻辑（将在AI回复完成后执行）
      const shouldUpdateTitle = TitleGeneratorService.shouldUpdateTitle(
        selectedConversation.title,
        messageContent
      );

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

      // AI回复完成后，自动更新对话标题
      if (shouldUpdateTitle && fullResponse.trim()) {
        try {
          const newTitle = await TitleGeneratorService.generateConversationTitle(
            messageContent,
            fullResponse,
            chatHistory
          );

          // 更新数据库中的标题
          await db.ai.updateConversation(selectedConversation.id, { title: newTitle });

          // 更新UI中的标题
          setConversations(prev => prev.map(c =>
            c.id === selectedConversation.id ? { ...c, title: newTitle } : c
          ));

          // 更新当前选中对话的标题
          setSelectedConversation(prev => prev ? { ...prev, title: newTitle } : null);

        } catch (titleError) {
          console.warn('自动更新标题失败:', titleError);
        }
      }

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
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 头部工具栏 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Bot className="mr-2" size={20} />
              AI 对话
            </h2>
            <button
              onClick={createNewConversation}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* 模型选择器 */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          >
            {AVAILABLE_MODELS.map(model => (
              <option key={model.name} value={model.name}>
                {model.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                还没有对话
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                点击上方的"+"按钮开始新对话
              </p>
              <button
                onClick={createNewConversation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                开始对话
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className={`group p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate mb-1">
                        {conversation.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {AVAILABLE_MODELS.find(m => m.name === conversation.model_name)?.displayName || conversation.model_name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatTime(conversation.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
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
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {selectedConversation ? (
          <>
            {/* 对话头部 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Bot className="text-white" size={16} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">
                      {selectedConversation.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">
                      {AVAILABLE_MODELS.find(m => m.name === selectedConversation.model_name)?.displayName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <BookOpen size={14} className="mr-1" />
                  {templates.length} 个模板可用
                </div>
              </div>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <Bot size={16} className="mt-1 text-blue-500 flex-shrink-0" />
                      )}
                      {message.role === 'user' && (
                        <User size={16} className="mt-1 text-white flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.content}
                        </div>
                        <div className={`flex items-center justify-between mt-2 text-xs ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <span>{formatTime(message.timestamp)}</span>
                          <button
                            onClick={() => copyMessage(message.content)}
                            className={`p-1 rounded hover:bg-black/10 ${
                              message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                            }`}
                            title="复制"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* 流式响应显示 */}
              {isStreaming && streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start space-x-2">
                      <Bot size={16} className="mt-1 text-blue-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {streamingMessage}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse animation-delay-75"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse animation-delay-150"></div>
                            <span className="ml-2">正在输入...</span>
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
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                  >
                    关闭
                  </button>
                </div>
              )}

              {/* 选中的模板显示 */}
              {selectedTemplate && (
                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        已选择模板: {selectedTemplate.name}
                      </span>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {selectedTemplate.description}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                {/* 模板选择按钮 */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center justify-center w-11 h-11 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                    title="选择提示词模板"
                  >
                    <BookOpen size={20} />
                  </button>

                  {/* 模板下拉菜单 */}
                  {showTemplates && (
                    <div className="absolute bottom-12 left-0 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 max-h-80 overflow-hidden">
                      {/* 模板菜单头部 */}
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            🎭 提示词模板
                          </div>
                          <button
                            onClick={() => {
                              setShowTemplateManager(true);
                              setShowTemplates(false);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                          >
                            管理模板
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          点击模板快速应用到对话中
                        </div>
                      </div>

                      {/* 模板列表 */}
                      <div className="max-h-60 overflow-y-auto">
                        {templates.length === 0 ? (
                          <div className="p-4 text-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                              暂无可用模板
                            </div>
                            <button
                              onClick={() => {
                                setShowTemplateManager(true);
                                setShowTemplates(false);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              创建第一个模板
                            </button>
                          </div>
                        ) : (
                          <div className="p-2 space-y-1">
                            {templates.map(template => (
                              <button
                                key={template.id}
                                onClick={() => applyTemplate(template)}
                                className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border-l-3 hover:border-l-blue-500"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                                    {template.name}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {template.is_system ? (
                                      <div className="w-2 h-2 bg-yellow-400 rounded-full" title="系统预设" />
                                    ) : (
                                      <div className="w-2 h-2 bg-blue-400 rounded-full" title="用户创建" />
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {template.description}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
                                  {template.content.length > 40
                                    ? `${template.content.substring(0, 40)}...`
                                    : template.content}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 模板菜单底部 */}
                      <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <button
                          onClick={() => {
                            setShowTemplateManager(true);
                            setShowTemplates(false);
                          }}
                          className="w-full text-left p-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center space-x-2"
                        >
                          <Settings size={14} />
                          <span>管理所有模板</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 消息输入框 */}
                <div className="flex-1 relative">
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
                    className="w-full h-11 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none leading-tight"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>

                {/* 发送按钮 */}
                <div className="flex-shrink-0">
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || sending}
                    className="flex items-center justify-center w-11 h-11 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          // 未选择对话的欢迎界面
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md p-8">
              <Bot size={64} className="mx-auto mb-6 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                欢迎使用 AI 助手
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                选择左侧的对话开始聊天，或创建一个新对话与AI助手交流
              </p>
              <button
                onClick={createNewConversation}
                className="flex items-center space-x-2 mx-auto px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Zap size={18} />
                <span>开始新对话</span>
              </button>
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