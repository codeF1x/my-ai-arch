import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testZhipuDirect() {
  const token = process.env.BIGMODEL_TOKEN;
  const baseUrl =
    process.env.BIGMODEL_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
  const url = `${baseUrl}/embeddings`;

  console.log("Testing Zhipu AI Direct API...");
  console.log(`URL: ${url}`);
  console.log(
    `Token: ${token ? "Found (" + token.substring(0, 5) + "...)" : "Missing"}`,
  );

  if (!token) {
    console.error("Error: BIGMODEL_TOKEN is missing in .env.local");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "embedding-3",
        input: "这是一段需要向量化的文本",
        dimensions: 512,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Success!");
      console.log("Model:", data.model);
      console.log("Object:", data.object);
      if (data.data && data.data.length > 0) {
        console.log("Embedding length:", data.data[0].embedding.length);
        console.log("First 5 values:", data.data[0].embedding.slice(0, 5));
      }
      console.log("Usage:", data.usage);
    } else {
      console.error("❌ Failed!");
      console.error("Status:", response.status);
      console.error("Error:", data);
    }
  } catch (error) {
    console.error("❌ Network/Script Error:", error);
  }
}

testZhipuDirect();
