import { chunkText, estimateTokenCount } from "../chunking";

// 简单测试
const text = `
这是第一段。人工智能正在改变世界。

这是第二段。机器学习使计算机能够从数据中学习。

这是第三段。我们需要负责任地使用AI技术。
`.trim();

console.log("=== 测试文档分块 ===\n");

const chunks = chunkText(text, {
  chunkSize: 100,
  overlap: 20,
  splitBy: "paragraph",
});

console.log(`✓ 生成了 ${chunks.length} 个 chunks\n`);

chunks.forEach((chunk) => {
  console.log(`Chunk ${chunk.index}:`);
  console.log(`  长度: ${chunk.metadata.length} 字符`);
  console.log(`  Token估算: ~${estimateTokenCount(chunk.text)}`);
  console.log(`  内容: ${chunk.text}`);
  console.log();
});

console.log("✓ 分块功能正常！");
