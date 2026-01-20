/**
 * Embedding 生成服务
 *
 * 使用 OpenAI SDK 调用智谱 AI 和 OpenAI 的 Embedding API
 * 实现批量处理、错误重试、缓存机制
 */

import OpenAI from "openai";
import type {
  EmbeddingOptions,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingError,
} from "./types";

// 默认配置
const DEFAULT_OPTIONS: Required<EmbeddingOptions> = {
  provider: "zhipu",
  model: "embedding-3", // 智谱 AI 的 embedding 模型
  batchSize: 64, // 智谱 AI 最多支持 64 条
  maxRetries: 3,
  retryDelay: 1000,
};

// 模型配置映射
const MODEL_CONFIG = {
  zhipu: {
    defaultModel: "embedding-3",
    dimensions: 512, // 默认 512 维度（可选 256/512/1024/2048）
  },
  openai: {
    defaultModel: "text-embedding-3-small",
    dimensions: 1536,
  },
} as const;

// 客户端缓存
let openaiClient: OpenAI | null = null;
let zhipuClient: OpenAI | null = null;

/**
 * 获取或创建 OpenAI 客户端
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "Missing OPENAI_API_KEY. Please set it in environment variables.",
      );
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * 获取或创建智谱 AI 客户端
 */
function getZhipuClient(): OpenAI {
  if (!zhipuClient) {
    if (!process.env.BIGMODEL_TOKEN) {
      throw new Error(
        "Missing BIGMODEL_TOKEN. Please set it in environment variables.",
      );
    }
    zhipuClient = new OpenAI({
      apiKey: process.env.BIGMODEL_TOKEN,
      baseURL:
        process.env.BIGMODEL_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
    });
  }
  return zhipuClient;
}

/**
 * 验证 API Key 是否存在
 */
function validateApiKey(provider: "zhipu" | "openai") {
  const apiKey =
    provider === "zhipu"
      ? process.env.BIGMODEL_TOKEN
      : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const keyName = provider === "zhipu" ? "BIGMODEL_TOKEN" : "OPENAI_API_KEY";
    throw new Error(
      `Missing API key for ${provider}. Please set ${keyName} in environment variables.`,
    );
  }
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成单个文本的 Embedding
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {},
): Promise<EmbeddingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  validateApiKey(opts.provider);

  const modelName = opts.model || MODEL_CONFIG[opts.provider].defaultModel;
  const client =
    opts.provider === "zhipu" ? getZhipuClient() : getOpenAIClient();

  let lastError: EmbeddingError | null = null;

  // 重试逻辑
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await client.embeddings.create({
        model: modelName,
        input: text,
        encoding_format: "float",
        ...(opts.provider === "zhipu" && {
          dimensions: MODEL_CONFIG.zhipu.dimensions,
        }),
      });

      const embedding = response.data[0].embedding;

      return {
        embedding,
        dimensions: embedding.length,
        model: modelName,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; status?: number };
      lastError = {
        message: err.message || "Unknown error",
        code: err.code || err.status?.toString(),
        retryable: isRetryableError(error),
      };

      // 如果不可重试或已达到最大重试次数,抛出错误
      if (!lastError.retryable || attempt === opts.maxRetries) {
        throw new Error(
          `Failed to generate embedding after ${attempt + 1} attempts: ${lastError.message}`,
        );
      }

      // 等待后重试
      await delay(opts.retryDelay * (attempt + 1));
    }
  }

  throw new Error("Unexpected error in generateEmbedding");
}

/**
 * 批量生成 Embeddings
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options: EmbeddingOptions = {},
): Promise<BatchEmbeddingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  validateApiKey(opts.provider);

  const modelName = opts.model || MODEL_CONFIG[opts.provider].defaultModel;
  const client =
    opts.provider === "zhipu" ? getZhipuClient() : getOpenAIClient();

  if (texts.length === 0) {
    throw new Error("texts array cannot be empty");
  }

  let lastError: EmbeddingError | null = null;

  // 重试逻辑
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await client.embeddings.create({
        model: modelName,
        input: texts,
        encoding_format: "float",
        ...(opts.provider === "zhipu" && {
          dimensions: MODEL_CONFIG.zhipu.dimensions,
        }),
      });

      const embeddings = response.data.map((d) => d.embedding);

      return {
        embeddings,
        dimensions: embeddings[0]?.length || 0,
        model: modelName,
        totalUsage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
        count: embeddings.length,
      };
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; status?: number };
      lastError = {
        message: err.message || "Unknown error",
        code: err.code || err.status?.toString(),
        retryable: isRetryableError(error),
      };

      if (!lastError.retryable || attempt === opts.maxRetries) {
        throw new Error(
          `Failed to generate batch embeddings after ${attempt + 1} attempts: ${lastError.message}`,
        );
      }

      await delay(opts.retryDelay * (attempt + 1));
    }
  }

  throw new Error("Unexpected error in generateEmbeddingsBatch");
}

/**
 * 分批处理大量文本
 */
export async function generateEmbeddingsLargeBatch(
  texts: string[],
  options: EmbeddingOptions = {},
): Promise<BatchEmbeddingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { batchSize } = opts;

  if (texts.length === 0) {
    throw new Error("texts array cannot be empty");
  }

  const allEmbeddings: number[][] = [];
  let totalPromptTokens = 0;
  let totalTokens = 0;
  let dimensions = 0;
  let modelName = "";

  // 分批处理
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const result = await generateEmbeddingsBatch(batch, options);

    allEmbeddings.push(...result.embeddings);
    totalPromptTokens += result.totalUsage.promptTokens;
    totalTokens += result.totalUsage.totalTokens;
    dimensions = result.dimensions;
    modelName = result.model;

    // 避免 API 限流,批次间添加短暂延迟
    if (i + batchSize < texts.length) {
      await delay(100);
    }
  }

  return {
    embeddings: allEmbeddings,
    dimensions,
    model: modelName,
    totalUsage: {
      promptTokens: totalPromptTokens,
      totalTokens,
    },
    count: allEmbeddings.length,
  };
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown): boolean {
  const err = error as { code?: string; status?: number; message?: string };
  // 网络错误、超时、限流等可重试
  const retryableCodes = [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "rate_limit_exceeded",
    "429",
    "500",
    "502",
    "503",
    "504",
  ];

  const errorCode = err.code || err.status?.toString() || "";
  const errorMessage = err.message?.toLowerCase() || "";

  return (
    retryableCodes.some((code) => errorCode.includes(code)) ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("network")
  );
}

/**
 * 获取模型维度信息
 */
export function getModelDimensions(
  provider: "zhipu" | "openai" = "zhipu",
): number {
  return MODEL_CONFIG[provider].dimensions;
}
