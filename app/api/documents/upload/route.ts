/**
 * 文档上传 API
 *
 * POST /api/documents/upload
 *
 * 功能：
 * 1. 接收用户上传的文档内容
 * 2. 使用 chunking 库进行分块
 * 3. 返回分块预览（暂不生成向量）
 *
 * 下一步：将这些 chunks 发送到 embeddings API 生成向量
 */

import { NextRequest } from "next/server";
import { chunkText, estimateTokenCount } from "@/lib/chunking";
import { z } from "zod";

// 请求体验证 Schema
const uploadSchema = z.object({
  content: z.string().min(1, "文档内容不能为空"),
  filename: z.string().optional(),
  options: z
    .object({
      chunkSize: z.number().min(100).max(2000).optional(),
      overlap: z.number().min(0).max(500).optional(),
      splitBy: z.enum(["paragraph", "sentence", "fixed"]).optional(),
    })
    .optional(),
});

// 响应类型定义
interface ChunkPreview {
  index: number;
  text: string;
  preview: string; // 前 100 字符预览
  length: number;
  tokens: number;
  startOffset: number;
  endOffset: number;
}

interface UploadResponse {
  success: boolean;
  docId: string;
  filename: string;
  totalChunks: number;
  totalTokens: number;
  chunks: ChunkPreview[];
  metadata: {
    originalLength: number;
    chunkSize: number;
    overlap: number;
    splitBy: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await req.json();

    // 2. 验证输入
    const validation = uploadSchema.safeParse(body);
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

    const { content, filename, options } = validation.data;

    // 3. 使用 chunking 库分块
    const chunkOptions = {
      chunkSize: options?.chunkSize ?? 512,
      overlap: options?.overlap ?? 50,
      splitBy: (options?.splitBy ?? "paragraph") as
        | "paragraph"
        | "sentence"
        | "fixed",
    };

    const chunks = chunkText(content, chunkOptions);

    // 4. 生成文档 ID
    const docId = generateDocId(filename ?? "untitled");

    // 5. 计算总 token 数
    let totalTokens = 0;
    const chunkPreviews: ChunkPreview[] = chunks.map((chunk) => {
      const tokens = estimateTokenCount(chunk.text);
      totalTokens += tokens;

      return {
        index: chunk.index,
        text: chunk.text,
        preview:
          chunk.text.substring(0, 100) + (chunk.text.length > 100 ? "..." : ""),
        length: chunk.metadata.length,
        tokens,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
      };
    });

    // 6. 构建响应
    const response: UploadResponse = {
      success: true,
      docId,
      filename: filename ?? "untitled.txt",
      totalChunks: chunks.length,
      totalTokens,
      chunks: chunkPreviews,
      metadata: {
        originalLength: content.length,
        chunkSize: chunkOptions.chunkSize,
        overlap: chunkOptions.overlap,
        splitBy: chunkOptions.splitBy,
      },
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error("Document upload error:", error);

    return Response.json(
      {
        success: false,
        error: "文档上传失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 },
    );
  }
}

/**
 * 生成文档 ID
 *
 * 格式: doc_{timestamp}_{随机字符串}
 */
function generateDocId(filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const cleanFilename = filename.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20);

  return `doc_${cleanFilename}_${timestamp}_${random}`;
}

/**
 * GET 方法：返回 API 使用说明
 */
export async function GET() {
  return Response.json({
    name: "Document Upload API",
    version: "1.0.0",
    description: "上传文档并自动分块",
    endpoints: {
      POST: {
        path: "/api/documents/upload",
        description: "上传文档内容进行分块",
        body: {
          content: "string (必需) - 文档内容",
          filename: "string (可选) - 文件名",
          options: {
            chunkSize: "number (可选, 默认 512) - 每个 chunk 的大小",
            overlap: "number (可选, 默认 50) - 重叠字符数",
            splitBy:
              "string (可选, 默认 paragraph) - 分块策略: paragraph | sentence | fixed",
          },
        },
        response: {
          success: "boolean",
          docId: "string - 文档唯一标识",
          totalChunks: "number - 总 chunk 数量",
          totalTokens: "number - 估算的总 token 数",
          chunks: "array - chunk 预览列表",
        },
      },
    },
    examples: {
      curl: `curl -X POST http://localhost:3000/api/documents/upload \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "这是第一段。\\n\\n这是第二段。",
    "filename": "test.txt",
    "options": { "chunkSize": 512, "overlap": 50, "splitBy": "paragraph" }
  }'`,
    },
  });
}
