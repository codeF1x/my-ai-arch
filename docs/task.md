# Task: 第二阶段 RAG 架构完善

## 已完成 ✓

- [x] PostgreSQL + pgvector Schema 定义 ([db/schema.ts](file:///e:/code/my-ai-arch/db/schema.ts))
- [x] Drizzle ORM 配置 ([drizzle.config.ts](file:///e:/code/my-ai-arch/drizzle.config.ts))
- [x] 客户端向量化能力 (IndexedDB + Transformers.js)
- [x] 本地向量搜索逻辑 ([lib/search.ts](file:///e:/code/my-ai-arch/lib/search.ts))
- [x] Vercel AI SDK 基础集成 (streamObject)
- [x] 基础 API 路由 (`api/analyze`)
- [x] **模块 1: 文档分块工具库 ([lib/chunking.ts](file:///e:/code/my-ai-arch/lib/chunking.ts))** ✨
- [x] **模块 2: 文档上传 API (`api/documents/upload`)** ✨

## 第二阶段进行中

### Phase 1: 文档摄取与分块 ✅ 完成

- [x] 创建文档分块工具 ([lib/chunking.ts](file:///e:/code/my-ai-arch/lib/chunking.ts))
  - [x] 固定大小分块 (Fixed-size chunking)
  - [x] 语义分块 (Semantic chunking with overlap)
  - [x] 按段落/句子分块
  - [x] Token 估算工具
- [x] 创建文档上传接口 (`api/documents/upload`)
  - [x] 接收文档内容
  - [x] 调用分块工具
  - [x] 返回分块预览
  - [x] 输入验证 (Zod Schema)
  - [x] 文档 ID 生成
  - [x] GET 方法返回 API 文档
- [] 实现文档解析器 (支持 .txt, .md, .pdf)

### Phase 2: 服务端向量化与存储

- [x] 创建 Embedding 生成服务 (`lib/embeddings/generate.ts`)
- [x] 集成 OpenAI/DeepSeek Embedding API
- [x] 批量向量生成逻辑
- [ ] 向量数据批量写入 PostgreSQL
- [ ] 创建向量存储 API (`api/embeddings/store`)

### Phase 3: RAG 检索流水线

- [ ] 实现向量相似度搜索 (`lib/rag/vector-search.ts`)
- [ ] 实现 PostgreSQL 全文搜索 (BM25)
- [ ] 实现混合检索 (Hybrid Search)
  - [ ] 向量检索 + 关键词检索
  - [ ] 结果融合与重排序
- [ ] 创建 RAG 查询 API (`api/rag/query`)

### Phase 4: RAG 增强的聊天功能

- [ ] 创建 RAG Chat API (`api/chat/rag`)
- [ ] 实现动态上下文注入
- [ ] 集成 generateText/streamText with RAG context
- [ ] 前端 RAG Chat UI 组件

### Phase 5: 数据管理与优化

- [ ] 文档列表查询 API
- [ ] 文档删除功能
- [ ] 向量索引优化
- [ ] 元数据过滤 (Metadata Filtering)
- [ ] 用户隔离 (Multi-tenancy)

## 今天完成的任务 (2025-12-30)

### ✅ 模块 1: 文档分块工具库 (已完成)

- [x] [lib/chunking.ts](file:///e:/code/my-ai-arch/lib/chunking.ts) - 核心分块逻辑
- [x] [scripts/test-chunking.ts](file:///e:/code/my-ai-arch/scripts/test-chunking.ts) - 简单测试
- [x] [docs/chunking.md](file:///e:/code/my-ai-arch/docs/chunking.md) - 使用文档
- [x] [scripts/README.md](file:///e:/code/my-ai-arch/scripts/README.md) - 脚本目录说明

### ✅ 模块 2: 文档上传 API (已完成)

- [x] [app/api/documents/upload/route.ts](file:///e:/code/my-ai-arch/app/api/documents/upload/route.ts) - API 路由
- [x] [scripts/test-upload-api.ts](file:///e:/code/my-ai-arch/scripts/test-upload-api.ts) - API 测试脚本
- [x] POST /api/documents/upload - 文档上传
- [x] GET /api/documents/upload - API 文档
- [x] 输入验证 (Zod Schema)
- [x] 错误处理
- [x] 测试通过 ✓

## 下一步计划

### 🎯 模块 3: Embedding 生成服务 (即将开始)

1. 创建 `lib/embeddings/generate.ts`
2. 集成 DeepSeek/OpenAI Embedding API
3. 实现批量向量生成
4. 添加缓存机制
5. 错误重试逻辑

## API 使用示例

### 文档上传

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Content-Type: application/json" \
  -d '{
    "content": "这是文档内容...",
    "filename": "test.txt",
    "options": {
      "chunkSize": 512,
      "overlap": 50,
      "splitBy": "paragraph"
    }
  }'
```

### 响应示例

```json
{
  "success": true,
  "docId": "doc_test_1735552800_abc123",
  "totalChunks": 3,
  "totalTokens": 456,
  "chunks": [
    {
      "index": 0,
      "text": "...",
      "preview": "前100字符...",
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

## 技术决策记录

- **客户端 vs 服务端向量化**: 保留 IndexedDB 用于离线预览, PostgreSQL 用于生产 RAG
- **Embedding 模型**: 优先使用 DeepSeek/OpenAI API (服务端), Xenova 模型保留给客户端
- **分块策略**: ✅ 已实现固定大小 (512 tokens) + 50 tokens overlap
- **检索方式**: 先实现纯向量检索, 后续迭代加入 BM25 混合检索
- **API 设计**: ✅ 使用 Next.js App Router + Zod 验证 + TypeScript 类型安全
- **文档 ID 生成**: ✅ 使用 `doc_{filename}_{timestamp}_{random}` 格式
