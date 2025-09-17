/**
 * OpenRouter API 集成
 * 用于调用各种大模型进行AI对话
 */

// OpenRouter API配置
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = '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';

// 消息接口定义
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 模型配置接口
export interface ModelConfig {
  name: string;
  displayName: string;
  maxTokens: number;
  temperature: number;
}

// 可用模型列表
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    name: 'google/gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    maxTokens: 8192,
    temperature: 0.7
  },
  {
    name: 'anthropic/claude-3.5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    maxTokens: 4096,
    temperature: 0.7
  },
  {
    name: 'openai/gpt-4',
    displayName: 'GPT-4',
    maxTokens: 4096,
    temperature: 0.7
  },
  {
    name: 'openai/gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    maxTokens: 4096,
    temperature: 0.7
  }
];

// 默认模型
export const DEFAULT_MODEL = 'google/gemini-2.5-flash';

// API响应接口
interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 流式响应接口
interface StreamResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

/**
 * 发送消息到OpenRouter API（非流式）
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  temperature: number = 0.7
): Promise<string> {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Project Management App - AI Assistant'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API错误: ${response.status} - ${errorText}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('API返回了空的响应');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('发送消息到OpenRouter失败:', error);
    throw error;
  }
}

/**
 * 发送消息到OpenRouter API（流式响应）
 */
export async function sendChatMessageStream(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  temperature: number = 0.7,
  onChunk: (chunk: string) => void
): Promise<void> {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Project Management App - AI Assistant'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API错误: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            return;
          }

          try {
            const parsed: StreamResponse = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;

            if (content) {
              onChunk(content);
            }
          } catch (error) {
            // 忽略解析错误，继续处理下一行
            continue;
          }
        }
      }
    }
  } catch (error) {
    console.error('流式发送消息到OpenRouter失败:', error);
    throw error;
  }
}

/**
 * 获取模型信息
 */
export function getModelInfo(modelName: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(model => model.name === modelName);
}

/**
 * 验证API密钥
 */
export async function validateApiKey(): Promise<boolean> {
  try {
    const response = await sendChatMessage([
      { role: 'user', content: '测试连接' }
    ]);
    return !!response;
  } catch (error) {
    console.error('API密钥验证失败:', error);
    return false;
  }
}

/**
 * 生成对话标题
 */
export async function generateConversationTitle(firstMessage: string): Promise<string> {
  try {
    const response = await sendChatMessage([
      {
        role: 'system',
        content: '请为以下用户消息生成一个简短的对话标题（不超过20个字符），只返回标题文本，不要有引号或其他格式：'
      },
      {
        role: 'user',
        content: firstMessage
      }
    ]);

    return response.trim().replace(/["""'']/g, '') || '新对话';
  } catch (error) {
    console.error('生成对话标题失败:', error);
    return '新对话';
  }
}