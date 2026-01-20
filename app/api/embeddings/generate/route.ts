/**
 * Embedding 生成 API
 *
 * POST /api/embeddings/generate
 *
 * 接收文本或文本数组,返回对应的向量表示
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  generateEmbedding,
  generateEmbeddingsBatch,
  generateEmbeddingsLargeBatch,
} from "@/lib/embeddings/generate";

// 请求验证 Schema
const generateSchema = z.object({
  text: z.string().min(1).optional(),
  texts: z.array(z.string().min(1)).optional(),
  options: z
    .object({
      provider: z.enum(["zhipu", "openai"]).optional(),
      model: z.string().optional(),
      batchSize: z.number().min(1).max(1000).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await req.json();

    // 2. 验证输入
    const validation = generateSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        {
          success: false,
          error: "输入验证失败",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { text, texts, options } = validation.data;

    // 3. 检查必须提供 text 或 texts 之一
    if (!text && (!texts || texts.length === 0)) {
      return Response.json(
        {
          success: false,
          error: "必须提供 text 或 texts 参数",
        },
        { status: 400 },
      );
    }

    // 4. 单个文本处理
    if (text) {
      const result = await generateEmbedding(text, options);
      return Response.json({
        success: true,
        type: "single",
        embedding: result.embedding,
        dimensions: result.dimensions,
        model: result.model,
        usage: result.usage,
      });
    }

    // 5. 批量文本处理
    if (texts && texts.length > 0) {
      // 根据数量选择处理方式
      const useLargeBatch = texts.length > (options?.batchSize || 100);
      const result = useLargeBatch
        ? await generateEmbeddingsLargeBatch(texts, options)
        : await generateEmbeddingsBatch(texts, options);

      return Response.json({
        success: true,
        type: "batch",
        embeddings: result.embeddings,
        dimensions: result.dimensions,
        model: result.model,
        totalUsage: result.totalUsage,
        count: result.count,
      });
    }

    return Response.json(
      {
        success: false,
        error: "未知错误",
      },
      { status: 500 },
    );
  } catch (error) {
    console.error("Embedding generation error:", error);

    return Response.json(
      {
        success: false,
        error: "向量生成失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 },
    );
  }
}

/**
 * GET 方法：返回 API 使用说明
 */
export async function GET() {
  return Response.json({
    name: "Embedding Generation API",
    version: "1.0.0",
    description: "生成文本的向量表示 (Embeddings)",
    endpoints: {
      POST: {
        path: "/api/embeddings/generate",
        description: "生成单个或批量文本的 Embeddings",
        requestBody: {
          text: "string (可选) - 单个文本",
          texts: "string[] (可选) - 文本数组",
          options: {
            provider: "deepseek | openai (可选,默认 deepseek)",
            model: "string (可选,使用默认模型)",
            batchSize: "number (可选,批量处理大小,默认 100)",
          },
        },
        response: {
          single: {
            success: true,
            type: "single",
            embedding: "number[] - 向量数组",
            dimensions: "number - 向量维度",
            model: "string - 使用的模型",
            usage: {
              promptTokens: "number",
              totalTokens: "number",
            },
          },
          batch: {
            success: true,
            type: "batch",
            embeddings: "number[][] - 向量数组",
            dimensions: "number - 向量维度",
            model: "string - 使用的模型",
            totalUsage: {
              promptTokens: "number",
              totalTokens: "number",
            },
            count: "number - 处理的文本数量",
          },
        },
      },
    },
    examples: {
      single: {
        description: "生成单个文本的 Embedding",
        curl: `curl -X POST http://localhost:3000/api/embeddings/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "这是一段测试文本",
    "options": {
      "provider": "deepseek"
    }
  }'`,
      },
      batch: {
        description: "批量生成 Embeddings",
        curl: `curl -X POST http://localhost:3000/api/embeddings/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "texts": ["文本1", "文本2", "文本3"],
    "options": {
      "provider": "deepseek",
      "batchSize": 100
    }
  }'`,
      },
    },
    notes: [
      "需要在环境变量中设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY",
      "支持自动重试和错误处理",
      "大批量文本会自动分批处理",
      "默认使用 DeepSeek API",
    ],
  });
}
