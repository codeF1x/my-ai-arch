# 文档分块工具库 (Chunking Library)

## 概述

`lib/chunking.ts` 提供了生产级的文档分块功能，是 RAG 系统的核心组件之一。

## 功能特性

### ✅ 三种分块策略

1. **段落分块 (Paragraph)** - 推荐 ⭐

   - 按段落边界切分
   - 保持语义完整性
   - 适合大多数场景

2. **句子分块 (Sentence)**

   - 按句子边界切分
   - 更细粒度的控制
   - 支持中英文标点

3. **固定大小分块 (Fixed-size)**
   - 简单粗暴的切分
   - 可能破坏语义
   - 仅用于测试对比

### ✅ 重叠窗口 (Overlap)

- 相邻 chunks 之间保留重叠内容
- 默认 50 字符 overlap
- 维持上下文连续性

### ✅ 元数据支持

每个 chunk 包含：

- `index`: chunk 索引
- `startOffset` / `endOffset`: 在原文中的位置
- `metadata`: 长度、是否首块/末块等信息

### ✅ Token 估算

- `estimateTokenCount()`: 估算文本的 token 数量
- `tokenLimitToCharLimit()`: Token 限制转字符限制

## 使用示例

### 基础用法

```typescript
import { chunkText } from "@/lib/chunking";

const document = `
这是第一段内容...

这是第二段内容...

这是第三段内容...
`;

const chunks = chunkText(document, {
  chunkSize: 512, // 每个 chunk 最大 512 字符
  overlap: 50, // 50 字符重叠
  splitBy: "paragraph", // 按段落分块
});

console.log(`生成了 ${chunks.length} 个 chunks`);

chunks.forEach((chunk) => {
  console.log(`Chunk ${chunk.index}:`);
  console.log(`  位置: [${chunk.startOffset}, ${chunk.endOffset}]`);
  console.log(`  长度: ${chunk.metadata.length} 字符`);
  console.log(`  内容: ${chunk.text.substring(0, 50)}...`);
});
```

### 用于 RAG 流水线

```typescript
import { chunkText, estimateTokenCount } from "@/lib/chunking";

async function processDocument(content: string, docId: string) {
  // 1. 分块
  const chunks = chunkText(content, {
    chunkSize: 512,
    overlap: 50,
    splitBy: "paragraph",
  });

  // 2. 为每个 chunk 生成 embedding
  const embeddings = await Promise.all(
    chunks.map((chunk) => generateEmbedding(chunk.text))
  );

  // 3. 存储到数据库
  await storeChunksWithEmbeddings(docId, chunks, embeddings);
}
```

### Token 估算示例

```typescript
import { estimateTokenCount, tokenLimitToCharLimit } from "@/lib/chunking";

const text = "你好，世界！Hello, world!";

// 估算 token 数量
const tokens = estimateTokenCount(text);
console.log(`估算: ~${tokens} tokens`);

// 计算字符限制
const charLimit = tokenLimitToCharLimit(512, "mixed");
console.log(`512 tokens ≈ ${charLimit} 字符`);
```

## 配置选项

```typescript
interface ChunkOptions {
  /** 每个 chunk 的最大字符数 (默认: 512) */
  chunkSize?: number;

  /** 相邻 chunk 之间的重叠字符数 (默认: 50) */
  overlap?: number;

  /** 分块策略 (默认: 'paragraph') */
  splitBy?: "paragraph" | "sentence" | "fixed";

  /** 是否保留空白块 (默认: false) */
  keepEmpty?: boolean;
}
```

## Chunk 数据结构

```typescript
interface Chunk {
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
```

## 测试验证

运行简单测试：

```bash
npx tsx lib/test-chunking-simple.ts
```

## 性能考虑

- **中文文本**: ~2 字符/token
- **英文文本**: ~4 字符/token
- **推荐配置**: chunkSize=512, overlap=50

## 后续优化方向

1. 集成 tiktoken 进行精确 token 计数
2. 支持 PDF、DOCX 文件解析
3. 实现自适应分块 (根据语义密度动态调整)
4. 添加 HTML 标签感知分块

## 参考资料

- Roadmap: `docs/roadmap.md` 第 91 行 - 语义分块策略
- LangChain TextSplitter: 文档加载器参考
- OpenAI Embeddings: 1536 维向量标准
