# Embedding 生成服务文档

## 概述

Embedding 生成服务是 RAG 系统的核心组件之一,负责将文本转换为高维向量表示,用于语义搜索和相似度计算。

## 架构设计

### 核心模块

1. **类型定义** (`lib/embeddings/types.ts`)
   - 定义配置选项、结果格式和错误类型
   - 提供完整的 TypeScript 类型安全

2. **生成服务** (`lib/embeddings/generate.ts`)
   - 支持 DeepSeek 和 OpenAI 两种提供商
   - 实现单个/批量/大批量文本处理
   - 自动重试和错误处理
   - 智能分批避免 API 限流

3. **API 端点** (`app/api/embeddings/generate/route.ts`)
   - RESTful API 接口
   - Zod 输入验证
   - 自文档化 (GET 请求)

## 功能特性

### 1. 多提供商支持

```typescript
// 使用 DeepSeek (默认)
const result = await generateEmbedding("文本", {
  provider: "deepseek",
});

// 使用 OpenAI
const result = await generateEmbedding("文本", {
  provider: "openai",
  model: "text-embedding-3-small",
});
```

### 2. 批量处理

```typescript
// 小批量 (< 100)
const result = await generateEmbeddingsBatch(texts);

// 大批量 (自动分批)
const result = await generateEmbeddingsLargeBatch(texts, {
  batchSize: 100,
});
```

### 3. 错误重试

- 自动识别可重试错误 (网络、超时、限流等)
- 指数退避重试策略
- 可配置重试次数和延迟

### 4. Token 使用统计

返回详细的 Token 使用信息,便于成本控制:

```typescript
{
  usage: {
    promptTokens: 150,
    totalTokens: 150
  }
}
```

## API 使用

### 单个文本向量化

```bash
curl -X POST http://localhost:3000/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "人工智能正在改变世界",
    "options": {
      "provider": "deepseek"
    }
  }'
```

**响应:**

```json
{
  "success": true,
  "type": "single",
  "embedding": [0.123, -0.456, ...],
  "dimensions": 1536,
  "model": "deepseek-chat",
  "usage": {
    "promptTokens": 8,
    "totalTokens": 8
  }
}
```

### 批量文本向量化

```bash
curl -X POST http://localhost:3000/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["文本1", "文本2", "文本3"],
    "options": {
      "provider": "deepseek",
      "batchSize": 100
    }
  }'
```

**响应:**

```json
{
  "success": true,
  "type": "batch",
  "embeddings": [[...], [...], [...]],
  "dimensions": 1536,
  "model": "deepseek-chat",
  "totalUsage": {
    "promptTokens": 24,
    "totalTokens": 24
  },
  "count": 3
}
```

### 获取 API 文档

```bash
curl http://localhost:3000/api/embeddings/generate
```

## 代码集成

### 在 Next.js API 路由中使用

```typescript
import { generateEmbedding } from "@/lib/embeddings/generate";

export async function POST(req: Request) {
  const { text } = await req.json();

  const result = await generateEmbedding(text, {
    provider: "deepseek",
  });

  // 存储到数据库
  await db.insert(embeddings).values({
    content: text,
    embedding: result.embedding,
  });

  return Response.json({ success: true });
}
```

### 在服务端组件中使用

```typescript
import { generateEmbeddingsBatch } from "@/lib/embeddings/generate";

async function processDocuments(chunks: string[]) {
  const result = await generateEmbeddingsLargeBatch(chunks, {
    provider: "deepseek",
    batchSize: 100,
  });

  console.log(`处理了 ${result.count} 个文本块`);
  console.log(`使用了 ${result.totalUsage.totalTokens} 个 tokens`);

  return result.embeddings;
}
```

## 配置选项

| 选项         | 类型                     | 默认值       | 说明          |
| ------------ | ------------------------ | ------------ | ------------- |
| `provider`   | `"deepseek" \| "openai"` | `"deepseek"` | API 提供商    |
| `model`      | `string`                 | 自动选择     | 模型名称      |
| `batchSize`  | `number`                 | `100`        | 批量处理大小  |
| `maxRetries` | `number`                 | `3`          | 最大重试次数  |
| `retryDelay` | `number`                 | `1000`       | 重试延迟 (ms) |

## 环境变量

在 `.env.local` 中配置:

```bash
# DeepSeek API (推荐)
DEEPSEEK_API_KEY=your_deepseek_api_key

# OpenAI API (可选)
OPENAI_API_KEY=your_openai_api_key
```

## 测试

运行测试脚本:

```bash
# 启动开发服务器
npm run dev

# 在另一个终端运行测试
npx tsx scripts/test-embedding-api.ts
```

测试覆盖:

- ✓ 单个文本 Embedding
- ✓ 批量文本 Embeddings
- ✓ 输入验证
- ✓ API 文档

## 性能优化

### 1. 批量处理

大量文本自动分批,避免单次请求过大:

```typescript
// 自动将 500 个文本分成 5 批处理
const result = await generateEmbeddingsLargeBatch(texts, {
  batchSize: 100,
});
```

### 2. 限流保护

批次间自动添加延迟,避免触发 API 限流:

```typescript
// 批次间延迟 100ms
if (i + batchSize < texts.length) {
  await delay(100);
}
```

### 3. 错误重试

智能识别可重试错误,指数退避:

```typescript
// 第 1 次重试: 1000ms
// 第 2 次重试: 2000ms
// 第 3 次重试: 3000ms
await delay(opts.retryDelay * (attempt + 1));
```

## 下一步集成

1. **与文档上传 API 集成**
   - 上传文档 → 分块 → 向量化 → 存储

2. **存储到 PostgreSQL**
   - 使用 pgvector 扩展
   - 批量插入优化

3. **实现向量搜索**
   - 余弦相似度搜索
   - 混合检索 (向量 + 关键词)

## 技术决策

- ✅ **默认使用 DeepSeek**: 性价比高,中文支持好
- ✅ **支持 OpenAI**: 提供备选方案
- ✅ **批量处理**: 提高吞吐量,降低成本
- ✅ **自动重试**: 提高可靠性
- ✅ **类型安全**: 完整的 TypeScript 支持
