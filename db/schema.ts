import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  vector,
} from "drizzle-orm/pg-core";

// 任务分析表：用于存储 generateObject 生成的结构化数据 [cite: 32, 34]
export const analysisTasks = pgTable("analysis_tasks", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  result: jsonb("result"), // 存储 AI 返回的 JSON 对象 [cite: 32]
  createdAt: timestamp("created_at").defaultNow(),
});

// 向量存储表：用于 RAG 阶段的语义搜索 [cite: 46, 52]
export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  // 1536 维是 OpenAI/DeepSeek 常见的向量维度 [cite: 44]
  embedding: vector("embedding", { dimensions: 1536 }),
});
