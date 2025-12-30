# Scripts 目录

存放项目的工具脚本和测试脚本。

## 文件说明

### `test-chunking.ts`

文档分块功能的简单测试脚本。

**运行方式**:

```bash
npx tsx scripts/test-chunking.ts
```

**用途**:

- 快速验证 `lib/chunking.ts` 的基础功能
- 查看分块结果示例
- Token 估算演示

## 目录结构建议

```
scripts/
├── test-chunking.ts       # 分块功能测试
├── test-embedding.ts      # (待创建) Embedding 生成测试
├── test-rag-pipeline.ts   # (待创建) RAG 完整流程测试
└── README.md             # 本文件
```

## 与其他目录的区别

- **`scripts/`**: 开发/测试脚本，不会打包到生产环境
- **`lib/__tests__/`**: 正式的单元测试 (Jest/Vitest)
- **`lib/`**: 核心业务逻辑库
- **`app/api/`**: Next.js API 路由

## 最佳实践

1. 脚本文件名以 `test-` 或 `demo-` 开头
2. 使用 `tsx` 或 `ts-node` 直接运行
3. 包含清晰的 console.log 输出
4. 独立运行，不依赖外部服务
