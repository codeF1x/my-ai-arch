/**
 * 测试文档上传 API
 *
 * 运行方式：
 * 1. 启动开发服务器: npm run dev
 * 2. 运行测试: npx tsx scripts/test-upload-api.ts
 */

const API_URL = "http://localhost:3000/api/documents/upload";

// 测试文档内容
const testDocument = `
人工智能的发展历程

人工智能（Artificial Intelligence, AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。

机器学习的突破

机器学习作为人工智能的核心技术，在近年来取得了突破性进展。深度学习、神经网络等技术的发展，使得计算机能够在图像识别、自然语言处理等领域达到甚至超越人类的水平。

自然语言处理

自然语言处理（NLP）是人工智能和语言学领域的分支学科。它研究如何处理及运用自然语言，使计算机能够理解和生成人类语言。ChatGPT 等大语言模型的出现，标志着 NLP 技术进入了新的阶段。

未来展望与挑战

尽管人工智能取得了巨大进步，但仍面临诸多挑战。如何确保 AI 系统的可解释性、公平性和安全性，是我们必须认真对待的问题。同时，AI 伦理和法规的建立也刻不容缓。
`.trim();

async function testUploadAPI() {
  console.log("🚀 开始测试文档上传 API\n");

  // 测试 1: GET 请求 - 获取 API 文档
  console.log("📖 测试 1: 获取 API 文档");
  try {
    const docResponse = await fetch(API_URL);
    const docData = await docResponse.json();
    console.log("✓ API 文档获取成功");
    console.log(`  版本: ${docData.version}`);
    console.log(`  描述: ${docData.description}\n`);
  } catch (error) {
    console.error("✗ 获取 API 文档失败:", error);
    return;
  }

  // 测试 2: POST 请求 - 上传文档（默认配置）
  console.log("📤 测试 2: 上传文档（默认配置）");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: testDocument,
        filename: "ai-history.txt",
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✓ 文档上传成功");
      console.log(`  文档 ID: ${data.docId}`);
      console.log(`  总 chunks: ${data.totalChunks}`);
      console.log(`  总 tokens: ~${data.totalTokens}`);
      console.log(`  原文长度: ${data.metadata.originalLength} 字符`);
      console.log(`  分块策略: ${data.metadata.splitBy}`);
      console.log(`  块大小: ${data.metadata.chunkSize}`);
      console.log(`  重叠: ${data.metadata.overlap}\n`);

      // 显示每个 chunk 的预览
      console.log("📄 Chunk 预览:");
      data.chunks.forEach((chunk: any) => {
        console.log(`\n  Chunk ${chunk.index}:`);
        console.log(`    长度: ${chunk.length} 字符`);
        console.log(`    Token: ~${chunk.tokens}`);
        console.log(`    位置: [${chunk.startOffset}, ${chunk.endOffset}]`);
        console.log(`    内容: ${chunk.preview}`);
      });
    } else {
      console.error("✗ 上传失败:", data.error);
    }
  } catch (error) {
    console.error("✗ 请求失败:", error);
  }

  // 测试 3: 自定义配置
  console.log("\n\n📤 测试 3: 上传文档（自定义配置）");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: testDocument,
        filename: "ai-history-custom.txt",
        options: {
          chunkSize: 300,
          overlap: 30,
          splitBy: "sentence",
        },
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✓ 自定义配置上传成功");
      console.log(`  总 chunks: ${data.totalChunks}`);
      console.log(
        `  配置: chunkSize=${data.metadata.chunkSize}, overlap=${data.metadata.overlap}, splitBy=${data.metadata.splitBy}\n`
      );
    }
  } catch (error) {
    console.error("✗ 自定义配置请求失败:", error);
  }

  // 测试 4: 验证错误处理
  console.log("\n📤 测试 4: 验证错误处理（空内容）");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "",
      }),
    });

    const data = await response.json();

    if (!data.success) {
      console.log("✓ 错误处理正常");
      console.log(`  错误信息: ${data.error}`);
      if (data.details) {
        console.log(`  详细信息: ${JSON.stringify(data.details, null, 2)}`);
      }
    }
  } catch (error) {
    console.error("✗ 错误处理测试失败:", error);
  }

  console.log("\n✅ 所有测试完成！");
}

// 执行测试
testUploadAPI().catch(console.error);
