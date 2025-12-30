/**
 * 文档分块工具测试脚本
 *
 * 运行方式：
 * npx tsx lib/__tests__/chunking.test.ts
 */

import {
  chunkText,
  estimateTokenCount,
  tokenLimitToCharLimit,
} from "../chunking";

// 测试用的示例文本
const SAMPLE_TEXT_EN = `
Artificial Intelligence (AI) is revolutionizing the way we work and live. From healthcare to finance, AI systems are making decisions that were once exclusively human domains.

Machine learning, a subset of AI, enables computers to learn from data without being explicitly programmed. This has led to breakthroughs in image recognition, natural language processing, and autonomous vehicles.

However, AI also raises important ethical questions. How do we ensure AI systems are fair and unbiased? What happens to jobs that can be automated? These are challenges we must address as AI continues to advance.

The future of AI is both exciting and uncertain. While it promises to solve complex problems, we must carefully consider its impact on society and work together to create responsible AI systems.
`.trim();

const SAMPLE_TEXT_ZH = `
人工智能正在深刻改变我们的工作和生活方式。从医疗到金融，AI系统正在做出曾经只有人类才能做的决策。

机器学习作为人工智能的一个分支,使计算机能够从数据中学习而无需明确编程。这导致了图像识别、自然语言处理和自动驾驶汽车等领域的突破。

然而,人工智能也引发了重要的伦理问题。我们如何确保AI系统公平且无偏见?那些可以自动化的工作会怎样?这些都是我们在AI持续发展时必须应对的挑战。

人工智能的未来既令人兴奋又充满不确定性。虽然它有望解决复杂问题,但我们必须仔细考虑其对社会的影响,并共同努力创建负责任的AI系统。
`.trim();

// ANSI 颜色代码
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
  console.log("\n" + "=".repeat(60) + "\n");
}

// 测试 1: 按段落分块 (英文)
function testParagraphChunkingEN() {
  log("📝 测试 1: 按段落分块 (英文文本)", "blue");

  const chunks = chunkText(SAMPLE_TEXT_EN, {
    chunkSize: 200,
    overlap: 30,
    splitBy: "paragraph",
  });

  console.log(`总计生成 ${chunks.length} 个 chunks\n`);

  chunks.forEach((chunk) => {
    log(`Chunk ${chunk.index}:`, "cyan");
    console.log(`  位置: [${chunk.startOffset}, ${chunk.endOffset}]`);
    console.log(`  长度: ${chunk.metadata.length} 字符`);
    console.log(`  估算: ~${estimateTokenCount(chunk.text)} tokens`);
    console.log(`  内容预览: ${chunk.text.substring(0, 80)}...`);
    console.log(
      `  首块: ${chunk.metadata.isFirst}, 末块: ${chunk.metadata.isLast}\n`
    );
  });

  separator();
}

// 测试 2: 按段落分块 (中文)
function testParagraphChunkingZH() {
  log("📝 测试 2: 按段落分块 (中文文本)", "blue");

  const chunks = chunkText(SAMPLE_TEXT_ZH, {
    chunkSize: 150,
    overlap: 20,
    splitBy: "paragraph",
  });

  console.log(`总计生成 ${chunks.length} 个 chunks\n`);

  chunks.forEach((chunk) => {
    log(`Chunk ${chunk.index}:`, "cyan");
    console.log(`  位置: [${chunk.startOffset}, ${chunk.endOffset}]`);
    console.log(`  长度: ${chunk.metadata.length} 字符`);
    console.log(`  估算: ~${estimateTokenCount(chunk.text)} tokens`);
    console.log(`  内容: ${chunk.text.substring(0, 50)}...\n`);
  });

  separator();
}

// 测试 3: 按句子分块
function testSentenceChunking() {
  log("📝 测试 3: 按句子分块", "blue");

  const chunks = chunkText(SAMPLE_TEXT_EN, {
    chunkSize: 150,
    overlap: 20,
    splitBy: "sentence",
  });

  console.log(`总计生成 ${chunks.length} 个 chunks\n`);

  chunks.forEach((chunk) => {
    log(`Chunk ${chunk.index}:`, "cyan");
    console.log(`  内容: ${chunk.text}\n`);
  });

  separator();
}

// 测试 4: 固定大小分块
function testFixedSizeChunking() {
  log("📝 测试 4: 固定大小分块 (对比)", "blue");

  const chunks = chunkText(SAMPLE_TEXT_EN, {
    chunkSize: 100,
    overlap: 20,
    splitBy: "fixed",
  });

  console.log(`总计生成 ${chunks.length} 个 chunks`);
  log("⚠️  注意: 固定分块可能在单词中间切分，破坏语义", "yellow");

  chunks.slice(0, 3).forEach((chunk) => {
    console.log(`\nChunk ${chunk.index}: ${chunk.text.substring(0, 80)}...`);
  });

  separator();
}

// 测试 5: Token 估算
function testTokenEstimation() {
  log("📝 测试 5: Token 数量估算", "blue");

  const testCases = [
    { text: "Hello, world!", expected: "~3 tokens" },
    { text: "你好，世界！", expected: "~3 tokens" },
    {
      text: SAMPLE_TEXT_EN,
      expected: `~${estimateTokenCount(SAMPLE_TEXT_EN)} tokens`,
    },
    {
      text: SAMPLE_TEXT_ZH,
      expected: `~${estimateTokenCount(SAMPLE_TEXT_ZH)} tokens`,
    },
  ];

  testCases.forEach(({ text, expected }) => {
    const tokens = estimateTokenCount(text);
    const chars = text.length;
    console.log(
      `文本长度: ${chars} 字符 → 估算: ${tokens} tokens (预期: ${expected})`
    );
  });

  console.log("\n字符限制换算:");
  console.log(`  512 tokens ≈ ${tokenLimitToCharLimit(512, "en")} 字符 (英文)`);
  console.log(`  512 tokens ≈ ${tokenLimitToCharLimit(512, "zh")} 字符 (中文)`);
  console.log(
    `  512 tokens ≈ ${tokenLimitToCharLimit(512, "mixed")} 字符 (混合)`
  );

  separator();
}

// 测试 6: Overlap 验证
function testOverlapValidation() {
  log("📝 测试 6: Overlap 重叠验证", "blue");

  const chunks = chunkText(SAMPLE_TEXT_EN, {
    chunkSize: 200,
    overlap: 50,
    splitBy: "paragraph",
  });

  if (chunks.length > 1) {
    log("检查相邻 chunks 的重叠部分:", "cyan");

    for (let i = 0; i < chunks.length - 1; i++) {
      const currentEnd = chunks[i].text.slice(-30);
      const nextStart = chunks[i + 1].text.slice(0, 30);

      console.log(`\nChunk ${i} 结尾: ...${currentEnd}`);
      console.log(`Chunk ${i + 1} 开头: ${nextStart}...`);

      // 简单检查是否有重叠（完整检查需要更复杂的逻辑）
      const hasOverlap = currentEnd.includes(nextStart.split(" ")[0]);
      log(
        `  重叠检测: ${hasOverlap ? "✓ 有重叠" : "✗ 无重叠"}`,
        hasOverlap ? "green" : "yellow"
      );
    }
  }

  separator();
}

// 测试 7: 边界情况
function testEdgeCases() {
  log("📝 测试 7: 边界情况", "blue");

  const edgeCases = [
    { name: "空字符串", text: "", expected: 0 },
    { name: "仅空白", text: "   \n\n  ", expected: 0 },
    { name: "超短文本", text: "Hi", expected: 1 },
    { name: "单段落长文本", text: "a".repeat(1000), expected: "multiple" },
  ];

  edgeCases.forEach(({ name, text, expected }) => {
    const chunks = chunkText(text, { chunkSize: 200, overlap: 20 });
    const actual = expected === "multiple" ? "多个" : chunks.length;
    log(
      `  ${name}: 生成 ${chunks.length} 个 chunks (预期: ${expected})`,
      "cyan"
    );
  });

  separator();
}

// 主测试运行器
function runAllTests() {
  log("🚀 开始运行文档分块工具测试\n", "green");

  testParagraphChunkingEN();
  testParagraphChunkingZH();
  testSentenceChunking();
  testFixedSizeChunking();
  testTokenEstimation();
  testOverlapValidation();
  testEdgeCases();

  log("✅ 所有测试完成！", "green");
}

// 执行测试
runAllTests();
