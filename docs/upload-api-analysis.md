# 📋 文档上传 API 功能分析

## 文件信息
- **路径**: [app/api/documents/upload/route.ts](file:///e:/code/my-ai-arch/app/api/documents/upload/route.ts)
- **类型**: Next.js App Router API Route
- **功能**: 文档摄取与分块预处理

---

## 🎯 核心功能概览

这个 API 是 RAG 系统的**数据摄取入口**，负责将用户上传的原始文档转化为可被向量化的文本块（chunks）。

### 功能定位

```
用户上传文档 → [本API] → 分块预览 → [下一步: Embedding API] → 向量化 → PostgreSQL
```

---

## 🏗️ 架构设计

### 1. 端点设计

#### POST /api/documents/upload
**用途**: 接收文档内容并进行分块处理

**设计模式**: RESTful API

**处理流程**:
```typescript
请求 → 解析 JSON → Zod 验证 → 调用分块库 → 生成 docId → 计算 tokens → 构建响应
```

#### GET /api/documents/upload
**用途**: 返回 API 使用文档（自文档化）

**特点**: 
- 开发者友好
- 包含示例代码（curl 命令）
- 版本信息明确

---

## 📦 数据流分析

### 输入数据结构

```typescript
// 请求体
{
  content: string;        // 必需 - 原始文档内容
  filename?: string;      // 可选 - 文件名称（用于生成 docId）
  options?: {
    chunkSize?: number;   // 可选 - 分块大小 (100-2000)
    overlap?: number;     // 可选 - 重叠字符数 (0-500)
    splitBy?: 'paragraph' | 'sentence' | 'fixed';  // 分块策略
  }
}
```

**验证规则** (Zod Schema):
```typescript
const uploadSchema = z.object({
  content: z.string().min(1, '文档内容不能为空'),
  filename: z.string().optional(),
  options: z.object({
    chunkSize: z.number().min(100).max(2000).optional(),
    overlap: z.number().min(0).max(500).optional(),
    splitBy: z.enum(['paragraph', 'sentence', 'fixed']).optional(),
  }).optional(),
});
```

### 处理过程

#### 步骤 1: 输入验证
```typescript
const validation = uploadSchema.safeParse(body);
if (!validation.success) {
  return Response.json({ 
    success: false, 
    error: '输入验证失败', 
    details: validation.error.errors 
  }, { status: 400 });
}
```

**作用**:
- 🛡️ 防止无效数据进入系统
- 📝 返回详细的错误信息
- 🔒 类型安全保障

#### 步骤 2: 配置合并
```typescript
const chunkOptions = {
  chunkSize: options?.chunkSize ?? 512,    // 默认 512
  overlap: options?.overlap ?? 50,          // 默认 50
  splitBy: (options?.splitBy ?? 'paragraph') as 'paragraph' | 'sentence' | 'fixed',
};
```

**设计思想**:
- 提供合理的默认值
- 允许用户自定义配置
- 使用 nullish coalescing (`??`) 运算符

#### 步骤 3: 文档分块
```typescript
const chunks = chunkText(content, chunkOptions);
```

**调用的库**: `@/lib/chunking.ts`

**返回的数据结构**:
```typescript
interface Chunk {
  text: string;
  index: number;
  startOffset: number;
  endOffset: number;
  metadata: {
    length: number;
    isFirst: boolean;
    isLast: boolean;
  };
}
```

#### 步骤 4: 生成文档 ID
```typescript
const docId = generateDocId(filename ?? 'untitled');

function generateDocId(filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const cleanFilename = filename.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  
  return `doc_${cleanFilename}_${timestamp}_${random}`;
}
```

**ID 格式**: `doc_{清理后的文件名}_{时间戳}_{随机字符串}`

**示例**:
- 输入: `"AI 报告.txt"`
- 输出: `"doc_AI_1735552800000_a3f9b2"`

**设计考虑**:
- ✅ 唯一性保证（时间戳 + 随机数）
- ✅ 可读性（包含文件名）
- ✅ 安全性（移除特殊字符）
- ✅ 长度限制（最多 20 字符文件名）

#### 步骤 5: Token 估算
```typescript
let totalTokens = 0;
const chunkPreviews: ChunkPreview[] = chunks.map(chunk => {
  const tokens = estimateTokenCount(chunk.text);
  totalTokens += tokens;
  
  return {
    index: chunk.index,
    text: chunk.text,
    preview: chunk.text.substring(0, 100) + (chunk.text.length > 100 ? '...' : ''),
    length: chunk.metadata.length,
    tokens,
    startOffset: chunk.startOffset,
    endOffset: chunk.endOffset,
  };
});
```

**功能**:
- 📊 为每个 chunk 估算 token 数量
- 📈 累加得到文档总 token 数
- 👁️ 生成前 100 字符的预览

**Token 估算逻辑** (来自 [lib/chunking.ts](file:///e:/code/my-ai-arch/lib/chunking.ts)):
```typescript
export function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishChars = text.length - chineseChars;
  
  return Math.ceil(chineseChars / 2 + englishChars / 4);
}
```

**估算规则**:
- 中文字符: ~2 字符/token
- 英文字符: ~4 字符/token

### 输出数据结构

```typescript
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
```

**响应示例**:
```json
{
  "success": true,
  "docId": "doc_test_1735552800_abc123",
  "filename": "test.txt",
  "totalChunks": 3,
  "totalTokens": 456,
  "chunks": [
    {
      "index": 0,
      "text": "完整的第一个chunk内容...",
      "preview": "前100字符预览...",
      "length": 512,
      "tokens": 150,
      "startOffset": 0,
      "endOffset": 512
    }
  ],
  "metadata": {
    "originalLength": 1500,
    "chunkSize": 512,
    "overlap": 50,
    "splitBy": "paragraph"
  }
}
```

---

## 🛡️ 错误处理机制

### 1. 输入验证错误 (400)
```typescript
if (!validation.success) {
  return Response.json(
    { 
      success: false, 
      error: '输入验证失败', 
      details: validation.error.errors 
    },
    { status: 400 }
  );
}
```

**触发场景**:
- 缺少 `content` 字段
- `content` 为空字符串
- `chunkSize` 超出范围（< 100 或 > 2000）
- `overlap` 超出范围（< 0 或 > 500）
- `splitBy` 值不合法

**响应示例**:
```json
{
  "success": false,
  "error": "输入验证失败",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "path": ["content"],
      "message": "文档内容不能为空"
    }
  ]
}
```

### 2. 服务器错误 (500)
```typescript
catch (error) {
  console.error('Document upload error:', error);
  
  return Response.json(
    { 
      success: false, 
      error: '文档上传失败', 
      message: error instanceof Error ? error.message : '未知错误' 
    },
    { status: 500 }
  );
}
```

**触发场景**:
- [chunkText()](file:///e:/code/my-ai-arch/lib/chunking.ts#49-79) 函数内部错误
- JSON 解析失败
- 其他未预期的异常

---

## 🔗 依赖关系

### 外部依赖
```typescript
import { NextRequest } from 'next/server';  // Next.js 框架
import { z } from 'zod';                     // 输入验证库
```

### 内部依赖
```typescript
import { chunkText, estimateTokenCount } from '@/lib/chunking';
```

**依赖图**:
```
route.ts
  ├── @/lib/chunking.ts
  │   ├── chunkText()
  │   └── estimateTokenCount()
  ├── next/server (NextRequest)
  └── zod (Schema 验证)
```

---

## 💡 设计亮点

### 1. 类型安全
- ✅ 全程 TypeScript 类型定义
- ✅ Zod Schema 运行时验证
- ✅ 明确的接口定义（[UploadResponse](file:///e:/code/my-ai-arch/app/api/documents/upload/route.ts#42-56), [ChunkPreview](file:///e:/code/my-ai-arch/app/api/documents/upload/route.ts#32-41)）

### 2. 职责单一
**本 API 只负责**:
- ✅ 接收文档
- ✅ 分块处理
- ✅ 返回预览

**不负责**:
- ❌ 向量生成（由下一个 API 处理）
- ❌ 数据库存储（由下一个 API 处理）
- ❌ 文件系统操作

### 3. 可配置性
```typescript
options: {
  chunkSize?: number;   // 灵活调整块大小
  overlap?: number;     // 可控制重叠度
  splitBy?: string;     // 支持多种策略
}
```

### 4. 自文档化
GET 方法返回完整的 API 说明：
```typescript
export async function GET() {
  return Response.json({
    name: 'Document Upload API',
    version: '1.0.0',
    description: '上传文档并自动分块',
    endpoints: { ... },
    examples: {
      curl: `curl -X POST http://localhost:3000/api/documents/upload ...`
    },
  });
}
```

---

## 🎯 使用场景

### 场景 1: 标准文档处理
```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Content-Type: application/json" \
  -d '{
    "content": "文档内容...",
    "filename": "report.txt"
  }'
```

**用途**: 使用默认配置快速处理文档

### 场景 2: 自定义分块策略
```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Content-Type: application/json" \
  -d '{
    "content": "文档内容...",
    "options": {
      "chunkSize": 300,
      "overlap": 30,
      "splitBy": "sentence"
    }
  }'
```

**用途**: 根据特定需求调整分块参数

### 场景 3: API 文档查询
```bash
curl http://localhost:3000/api/documents/upload
```

**用途**: 开发者查看 API 使用说明

---

## 🔄 与 RAG 流水线的集成

### 当前位置
```
[1. 文档上传 API] → 2. Embedding 生成 → 3. 向量存储 → 4. 检索 → 5. LLM 生成
    ↑ 你在这里
```

### 下一步集成

**前端调用示例**:
```typescript
// 1. 上传文档
const uploadResponse = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: userDocument,
    filename: 'user-doc.txt'
  })
});

const { docId, chunks } = await uploadResponse.json();

// 2. 生成 embeddings（下一步实现）
const embedResponse = await fetch('/api/embeddings/generate', {
  method: 'POST',
  body: JSON.stringify({ docId, chunks })
});

// 3. 存储到 PostgreSQL（下一步实现）
await fetch('/api/embeddings/store', {
  method: 'POST',
  body: JSON.stringify({ docId, embeddings })
});
```

---

## 📊 性能考虑

### 当前实现
- **同步处理**: 分块在请求处理时同步完成
- **内存占用**: 整个文档需加载到内存

### 潜在优化方向

#### 1. 大文件处理
```typescript
// 当前限制: 无明确限制
// 建议: 添加文件大小限制

if (content.length > 10_000_000) {  // 10MB
  return Response.json({
    success: false,
    error: '文档过大，请上传小于 10MB 的文件'
  }, { status: 413 });
}
```

#### 2. 异步处理
```typescript
// 对于超大文档，可改为异步处理
const jobId = await queueChunkingJob(content);

return Response.json({
  success: true,
  jobId,
  status: 'processing',
  message: '文档正在处理中，请稍后查询结果'
});
```

#### 3. 流式处理
```typescript
// 使用 ReadableStream 逐步返回 chunks
return new Response(
  new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(JSON.stringify(chunk) + '\n');
      }
      controller.close();
    }
  })
);
```

---

## ✅ 总结

### 核心功能
1. ✅ 接收文档内容
2. ✅ 输入验证（Zod）
3. ✅ 调用分块库
4. ✅ 生成唯一 docId
5. ✅ Token 估算
6. ✅ 返回分块预览
7. ✅ 完善的错误处理
8. ✅ API 自文档化

### 技术特点
- 🎯 职责单一，专注分块预处理
- 🛡️ 类型安全，Zod + TypeScript
- 🔧 灵活配置，支持多种分块策略
- 📝 自文档化，GET 方法返回使用说明
- 🔗 松耦合，易于与后续模块集成

### 在 RAG 系统中的价值
- 📥 **数据摄取入口**: 将原始文档标准化
- 🧩 **语义切分**: 保持文本块的语义完整性
- 📊 **元数据生成**: 提供 token 估算等关键信息
- 🔗 **流程衔接**: 为后续向量化做准备

---

**这是一个设计精良、职责清晰的 API 端点，为 RAG 系统的文档处理流程奠定了坚实的基础！** 🚀
