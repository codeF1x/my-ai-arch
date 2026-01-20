import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testDeepSeekDirect() {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  console.log("Testing DeepSeek Embedding API...");
  console.log(
    `API Key: ${apiKey ? "Found (" + apiKey.substring(0, 5) + "...)" : "Missing"}`,
  );

  if (!apiKey) {
    console.error("Error: DEEPSEEK_API_KEY is missing in .env.local");
    return;
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.deepseek.com/v1",
  });

  // Test different model names
  const modelNames = [
    "deepseek-embedding",
    "text-embedding-3",
    "deepseek-v3-embed",
    "embedding-3",
  ];

  for (const modelName of modelNames) {
    console.log(`\n--- Testing model: ${modelName} ---`);
    try {
      const response = await client.embeddings.create({
        model: modelName,
        input: "这是一段测试文本",
        encoding_format: "float",
      });

      console.log("✅ Success!");
      console.log("Model:", response.model);
      console.log("Embedding length:", response.data[0].embedding.length);
      console.log("First 5 values:", response.data[0].embedding.slice(0, 5));
      console.log("Usage:", response.usage);
      break; // Found working model
    } catch (error) {
      const err = error as { status?: number; message?: string };
      console.log(
        `❌ Failed: ${err.status || "Unknown"} - ${err.message || "Unknown error"}`,
      );
    }
  }
}

testDeepSeekDirect();
