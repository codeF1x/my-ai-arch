# RAG 核心实现指南

本文档汇总了 RAG (检索增强生成) 系统核心组件的实现细节：文档分块库和文档上传 API。

## 1. 文档分块库 (`lib/chunking.ts`)

分块库是 RAG 系统的基础组件，负责将长文本切分为适合向量化的、具有语义意义的文本块 (Chunks)。

### 功能特性

- **三种分块策略**:
  - `paragraph` (推荐): 按段落边界切分，保持语义完整性。
  - `sentence`: 按句子结束符切分，粒度更细。
  - `fixed`: 简单的固定大小切分 (主要用于测试对比)。
- **重叠窗口 (Overlap)**: 支持配置重叠窗口，保持相邻 Chunk 间的上下文连续性。
- **元数据**: 为每个 Chunk 计算偏移量、长度和 Token 估算值。

### 核心代码

```typescript
/**
 * 文档分块工具库
 *
 * 实现 roadmap 第二阶段要求的语义分块策略：
 * - 固定大小分块 (默认 512 tokens)
 * - 重叠窗口 (默认 50 tokens) 以保持上下文连续性
 * - 按段落/句子边界切分，避免语义截断
 *
 */

export interface ChunkOptions {
  /** 每个 chunk 的最大字符数 (近似 tokens) */
  chunkSize?: number;
  /** 相邻 chunk 之间的重叠字符数 */
  overlap?: number;
  /** 分块策略：按段落或句子 */
  splitBy?: "paragraph" | "sentence" | "fixed";
  /** 是否保留空白块 */
  keepEmpty?: boolean;
}

export interface Chunk {
  /** chunk 内容 */
  text: string;
  /** chunk 在文档中的索引 (从 0 开始) */
  index: number;
  /** chunk 在原文中的起始字符位置 */
  startOffset: number;
  /** chunk 在原文中的结束字符位置 */
  endOffset: number;
  /** 元数据 */
  metadata: {
    /** chunk 的字符长度 */
    length: number;
    /** 是否是第一个 chunk */
    isFirst: boolean;
    /** 是否是最后一个 chunk */
    isLast: boolean;
  };
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  chunkSize: 512,
  overlap: 50,
  splitBy: "paragraph",
  keepEmpty: false,
};

/**
 * 主入口：将文本分块
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!text || text.trim().length === 0) {
    return [];
  }

  // 根据策略选择分块方法
  switch (opts.splitBy) {
    case "paragraph":
      return chunkByParagraph(text, opts);
    case "sentence":
      return chunkBySentence(text, opts);
    case "fixed":
    default:
      return chunkByFixedSize(text, opts);
  }
}

/**
 * 按段落分块（推荐策略）
 */
function chunkByParagraph(
  text: string,
  options: Required<ChunkOptions>
): Chunk[] {
  const paragraphs = splitIntoParagraphs(text);
  const chunks: Chunk[] = [];

  let currentChunk = "";
  let currentStartOffset = 0;
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const potentialChunk = currentChunk + (currentChunk ? "\n\n" : "") + para;

    // 如果加入当前段落会超出大小限制，且当前 chunk 不为空
    if (potentialChunk.length > options.chunkSize && currentChunk.length > 0) {
      // 保存当前 chunk
      const endOffset = currentStartOffset + currentChunk.length;
      chunks.push(
        createChunk(
          currentChunk,
          chunkIndex,
          currentStartOffset,
          endOffset,
          chunks.length === 0,
          false
        )
      );
      chunkIndex++;

      // 准备下一个 chunk，包含 overlap
      const overlapText = getOverlapText(currentChunk, options.overlap);
      currentChunk = overlapText + (overlapText ? "\n\n" : "") + para;
      currentStartOffset = endOffset - overlapText.length;
    } else {
      // 继续累加段落
      currentChunk = potentialChunk;
    }
  }

  // 保存最后一个 chunk
  if (currentChunk.trim().length > 0 || options.keepEmpty) {
    const endOffset = currentStartOffset + currentChunk.length;
    chunks.push(
      createChunk(
        currentChunk,
        chunkIndex,
        currentStartOffset,
        endOffset,
        chunks.length === 0,
        true
      )
    );
  }

  return chunks;
}

/**
 * 按句子分块
 */
function chunkBySentence(
  text: string,
  options: Required<ChunkOptions>
): Chunk[] {
  const sentences = splitIntoSentences(text);
  const chunks: Chunk[] = [];

  let currentChunk = "";
  let currentStartOffset = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const potentialChunk = currentChunk + (currentChunk ? " " : "") + sentence;

    if (potentialChunk.length > options.chunkSize && currentChunk.length > 0) {
      const endOffset = currentStartOffset + currentChunk.length;
      chunks.push(
        createChunk(
          currentChunk,
          chunkIndex,
          currentStartOffset,
          endOffset,
          chunks.length === 0,
          false
        )
      );
      chunkIndex++;

      const overlapText = getOverlapText(currentChunk, options.overlap);
      currentChunk = overlapText + (overlapText ? " " : "") + sentence;
      currentStartOffset = endOffset - overlapText.length;
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk.trim().length > 0 || options.keepEmpty) {
    const endOffset = currentStartOffset + currentChunk.length;
    chunks.push(
      createChunk(
        currentChunk,
        chunkIndex,
        currentStartOffset,
        endOffset,
        chunks.length === 0,
        true
      )
    );
  }

  return chunks;
}

/**
 * 按固定大小分块
 */
function chunkByFixedSize(
  text: string,
  options: Required<ChunkOptions>
): Chunk[] {
  const chunks: Chunk[] = [];
  const { chunkSize, overlap } = options;
  let startOffset = 0;
  let chunkIndex = 0;

  while (startOffset < text.length) {
    const endOffset = Math.min(startOffset + chunkSize, text.length);
    const chunkText = text.slice(startOffset, endOffset);

    if (chunkText.trim().length > 0 || options.keepEmpty) {
      chunks.push(
        createChunk(
          chunkText,
          chunkIndex,
          startOffset,
          endOffset,
          chunkIndex === 0,
          endOffset >= text.length
        )
      );
      chunkIndex++;
    }

    // 移动到下一个位置，减去 overlap
    startOffset = endOffset - overlap;

    // 防止死循环
    if (startOffset <= endOffset - chunkSize) {
      startOffset = endOffset;
    }
  }

  return chunks;
}

function createChunk(
  text: string,
  index: number,
  startOffset: number,
  endOffset: number,
  isFirst: boolean,
  isLast: boolean
): Chunk {
  return {
    text: text.trim(),
    index,
    startOffset,
    endOffset,
    metadata: {
      length: text.trim().length,
      isFirst,
      isLast,
    },
  };
}

function getOverlapText(text: string, overlapSize: number): string {
  if (overlapSize <= 0 || text.length <= overlapSize) {
    return text;
  }
  return text.slice(-overlapSize);
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function splitIntoSentences(text: string): string[] {
  const sentenceEndings = /[.!?。！？]\s+/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceEndings.exec(text)) !== null) {
    const sentence = text
      .slice(lastIndex, match.index + match[0].length)
      .trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
    lastIndex = match.index + match[0].length;
  }

  const lastSentence = text.slice(lastIndex).trim();
  if (lastSentence.length > 0) {
    sentences.push(lastSentence);
  }

  return sentences;
}

export function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + englishChars / 4);
}

export function tokenLimitToCharLimit(
  tokenLimit: number,
  language: "zh" | "en" | "mixed" = "mixed"
): number {
  switch (language) {
    case "zh":
      return tokenLimit * 2;
    case "en":
      return tokenLimit * 4;
    case "mixed":
    default:
      return tokenLimit * 3;
  }
}
```

---

## 2. 文档上传 API (`app/api/documents/upload/route.ts`)

此 API 端点作为数据摄取入口，接收原始文本并使用上述库将其转换为结构化的 Chunks。

### API 设计

- **端点**: `POST /api/documents/upload`
- **输入**: JSON 格式，包含 `content` (内容)，可选 `filename` (文件名) 和 `options` (配置)。
- **输出**: JSON 格式，包含 `docId` (文档 ID)，`chunks` (预览) 和元数据。
- **验证**: 使用 Zod 进行严格的运行时验证。
- **自文档化**: `GET` 请求返回 API 使用指南。

### 核心代码

```typescript
/**
 * 文档上传 API
 *
 * POST /api/documents/upload
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
  preview: string;
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
          details: validation.error.errors,
        },
        { status: 400 }
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
      { status: 500 }
    );
  }
}

/**
 * 生成文档 ID
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
        // ... (details omitted for brevity in docs, see source)
      },
    },
    examples: {
      curl: `curl -X POST http://localhost:3000/api/documents/upload ...`,
    },
  });
}
```

## 3. 使用与集成

### 工作流程

1.  **客户端** 发送文档文本到 `POST /api/documents/upload`。
2.  **API** 验证输入，使用 `lib/chunking.ts` 将文本分块，并返回带有 `docId` 的分块预览。
3.  **后续步骤** (待实现):
    - 客户端 (或其他 API 处理程序) 获取 chunks 和 `docId`。
    - 调用 Embedding API 为每个 chunk 生成向量。
    - 将向量和元数据存储到向量数据库 (PostgreSQL + pgvector)。

### 请求示例

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Content-Type: application/json" \
  -d '{
    "content": "这是一个需要被分块的长文档...",
    "filename": "example.txt",
    "options": {
      "chunkSize": 512,
      "overlap": 50,
      "splitBy": "paragraph"
    }
  }'
```
