# Project Skills & Memory

This file contains learned skills and solutions to complex problems encountered during development.

## Learned Skills

### 2026-01-19: Embedding 生成服务实现

**实现内容:**

- 创建了完整的 Embedding 生成服务,支持 DeepSeek 和 OpenAI
- 实现了单个/批量/大批量文本向量化
- 集成了自动重试、错误处理和限流保护

**核心文件:**

- `lib/embeddings/types.ts` - 类型定义
- `lib/embeddings/generate.ts` - 核心服务 (265 行)
- `app/api/embeddings/generate/route.ts` - API 端点 (195 行)
- `scripts/test-embedding-api.ts` - 测试脚本
- `docs/embedding-service.md` - 完整文档

**遇到的错误与解决方案:**

#### 1. Zod 验证错误属性问题

**错误:** `类型"ZodError"上不存在属性"errors"`

```typescript
// ❌ 错误写法
details: validation.error.errors;

// ✅ 正确写法
details: validation.error.issues;
```

**原因:** Zod v4 使用 `issues` 而非 `errors` 属性

**原因:** Zod v4 使用 `issues` 而非 `errors` 属性
39:
40: #### 2. AI SDK 6.0 Embedding Dimensions
41:
42: **错误:** `Expected 1 arguments, but got 2`
43:
44: `typescript
45: // ❌ 类型定义缺失
46: provider.embedding(modelName, { dimensions: 512 });
47: 
48: // ✅ 临时解决方案 (API 支持但类型缺失)
49: // @ts-expect-error: dimensions option is supported by OpenAI compatible providers
50: provider.embedding(modelName, { dimensions: 512 });
51: `
52:
53: **原因:** AI SDK 6.0 的 `embedding()` 方法类型定义可能尚未完全覆盖所有 Provider 的特定选项 (如 OpenAI 兼容接口的 dimensions 参数)。
54:
55: #### 3. TypeScript 全局作用域变量冲突

**错误:** `无法重新声明块范围变量"API_URL"`

```typescript
// ❌ 问题代码 (多个测试文件都用了相同名称)
// test-upload-api.ts
const API_URL = "http://localhost:3000/api/documents/upload";

// test-embedding-api.ts
const API_URL = "http://localhost:3000/api/embeddings/generate";
```

**解决方案:** 使用更具体的命名

```typescript
// ✅ 修复后
const EMBEDDING_API_URL = "http://localhost:3000/api/embeddings/generate";
```

**原因:** TypeScript 编译器将所有 `.ts` 文件视为同一作用域

#### 3. ESLint no-explicit-any 错误

**错误:** `Unexpected any. Specify a different type`

```typescript
// ❌ 错误写法
catch (error: any) {
  const message = error.message;
}

// ✅ 正确写法
catch (error: unknown) {
  const err = error as { message?: string; code?: string };
  const message = err.message || "Unknown error";
}
```

**最佳实践:**

- 使用 `unknown` 类型接收错误
- 使用类型断言 `as` 进行类型转换
- 提供默认值处理 undefined 情况

**技术要点:**

1. **Vercel AI SDK 集成**
   - 使用 `embed()` 和 `embedMany()` API
   - 支持多个提供商的统一接口

2. **错误重试策略**
   - 识别可重试错误: 网络错误、超时、限流 (429, 500, 502, 503, 504)
   - 指数退避: 1s → 2s → 3s
   - 最多重试 3 次

3. **批量处理优化**
   - 小批量 (≤100): 直接调用 `embedMany()`
   - 大批量: 自动分批,每批 100 个
   - 批次间延迟 100ms 避免 API 限流

4. **类型安全**
   - 完整的 TypeScript 类型定义
   - 使用 `unknown` 替代 `any`
   - Zod 运行时验证

5. **API 设计**
   - POST: 处理请求
   - GET: 返回 API 文档 (自文档化)
   - 统一的错误响应格式

**性能优化:**

- 批量处理减少 API 调用次数
- Token 使用统计便于成本控制
- 可配置的批量大小和重试参数

**环境配置:**

```bash
# .env.local
DEEPSEEK_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here  # 可选
```

**测试方法:**

```bash
npm run dev
npx tsx scripts/test-embedding-api.ts
```

---

## 经验总结

### TypeScript 最佳实践

1. 避免使用 `any`,优先使用 `unknown`
2. 使用类型断言时提供默认值
3. 注意全局作用域的变量命名冲突

### Zod 验证

- Zod v4 使用 `error.issues` 而非 `error.errors`
- 使用 `safeParse()` 进行安全验证

### API 设计

- GET 方法返回 API 文档提升开发体验
- 统一的错误响应格式
- 详细的使用示例

### 错误处理

- 区分可重试和不可重试错误
- 使用指数退避避免雪崩
- 记录详细的错误信息便于调试

---

## 深度学习文档生成规范

### 触发条件

每完成一个 task 阶段的内容，自动生成深度学习文档

### 文档存放位置

`docs/lessons/lesson-XX-{topic}.md`

### 必须包含的章节

1. **🎯 核心问题** - 本课解决什么问题？为什么重要？
2. **🧠 核心概念图解** - ASCII 图表可视化架构
3. **📐 架构设计** - 分层架构及原因
4. **🔧 核心伪代码** - 简化的逻辑流程
5. **🛠 关键技术点** - 使用的技术及为什么选择
6. **⚠️ 踩坑记录** - 遇到的错误及解决方案
7. **📊 知识网络** - 与其他课程的关联
8. **🎯 费曼检验** - 用一句话解释核心概念
9. **📝 实战练习** - 动手验证学习成果
10. **✅ 检查清单** - 确认掌握要点

### 已生成的课程文档

| 课程  | 主题               | 文件                                          |
| ----- | ------------------ | --------------------------------------------- |
| 第9课 | Embedding 生成服务 | `docs/lessons/lesson-09-embedding-service.md` |

### 学习方法论

基于《高效学习》《深度学习》的核心原则：

1. **费曼学习法** - 用简单语言解释复杂概念
2. **刻意练习** - 通过实战掌握技能
3. **知识网络** - 建立概念之间的联系
4. **深度理解** - 理解"为什么"而不仅是"是什么"
5. **错误驱动** - 从踩坑中学习最深刻
