/**
 * Embedding 生成服务类型定义
 */

export interface EmbeddingOptions {
  /** 使用的模型提供商 */
  provider?: "zhipu" | "openai";
  /** 模型名称 */
  model?: string;
  /** 批量处理大小 */
  batchSize?: number;
  /** 失败重试次数 */
  maxRetries?: number;
  /** 重试延迟 (ms) */
  retryDelay?: number;
}

export interface EmbeddingResult {
  /** 向量数据 */
  embedding: number[];
  /** 向量维度 */
  dimensions: number;
  /** 使用的模型 */
  model: string;
  /** Token 使用量 */
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface BatchEmbeddingResult {
  /** 所有向量 */
  embeddings: number[][];
  /** 向量维度 */
  dimensions: number;
  /** 使用的模型 */
  model: string;
  /** 总 Token 使用量 */
  totalUsage: {
    promptTokens: number;
    totalTokens: number;
  };
  /** 处理的文本数量 */
  count: number;
}

export interface EmbeddingError {
  message: string;
  code?: string;
  retryable: boolean;
}
