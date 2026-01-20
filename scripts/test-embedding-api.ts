/**
 * Embedding API 测试脚本
 *
 * 测试 /api/embeddings/generate 端点
 */

const EMBEDDING_API_URL = "http://localhost:3000/api/embeddings/generate";

async function testSingleEmbedding() {
  console.log("\n=== 测试 1: 单个文本 Embedding ===");

  const response = await fetch(EMBEDDING_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: "人工智能正在改变世界",
      options: {
        provider: "zhipu",
      },
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✓ 成功生成 Embedding");
    console.log(`  - 维度: ${data.dimensions}`);
    console.log(`  - 模型: ${data.model}`);
    console.log(
      `  - 向量前5个值: [${data.embedding.slice(0, 5).join(", ")}...]`,
    );
    if (data.usage) {
      console.log(`  - Token 使用: ${data.usage.totalTokens}`);
    }
  } else {
    console.error("✗ 失败:", data.error);
    console.error("  详情:", data.message);
  }

  return data;
}

async function testBatchEmbeddings() {
  console.log("\n=== 测试 2: 批量文本 Embeddings ===");

  const texts = [
    "机器学习是人工智能的核心技术",
    "深度学习推动了 AI 的快速发展",
    "自然语言处理让机器理解人类语言",
    "计算机视觉赋予机器看的能力",
    "强化学习让 AI 学会决策",
  ];

  const response = await fetch(EMBEDDING_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts,
      options: {
        provider: "zhipu",
        batchSize: 10,
      },
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✓ 成功生成批量 Embeddings");
    console.log(`  - 处理数量: ${data.count}`);
    console.log(`  - 维度: ${data.dimensions}`);
    console.log(`  - 模型: ${data.model}`);
    console.log(`  - 总 Token 使用: ${data.totalUsage.totalTokens}`);
    console.log(
      `  - 第一个向量前5个值: [${data.embeddings[0].slice(0, 5).join(", ")}...]`,
    );
  } else {
    console.error("✗ 失败:", data.error);
    console.error("  详情:", data.message);
  }

  return data;
}

async function testValidation() {
  console.log("\n=== 测试 3: 输入验证 ===");

  // 测试空请求
  const response = await fetch(EMBEDDING_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();

  if (!data.success) {
    console.log("✓ 正确拒绝空请求");
    console.log(`  - 错误: ${data.error}`);
  } else {
    console.error("✗ 应该拒绝空请求");
  }
}

async function testAPIDocumentation() {
  console.log("\n=== 测试 4: API 文档 ===");

  const response = await fetch(EMBEDDING_API_URL, {
    method: "GET",
  });

  const data = await response.json();

  console.log("✓ API 文档:");
  console.log(`  - 名称: ${data.name}`);
  console.log(`  - 版本: ${data.version}`);
  console.log(`  - 描述: ${data.description}`);
  console.log(`  - 注意事项: ${data.notes.length} 条`);
}

async function runAllTests() {
  console.log("🚀 开始测试 Embedding API...\n");

  try {
    await testSingleEmbedding();
    await testBatchEmbeddings();
    await testValidation();
    await testAPIDocumentation();

    console.log("\n✅ 所有测试完成!");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    if (error instanceof Error) {
      console.error("错误详情:", error.message);
    }
  }
}

// 运行测试
runAllTests();
