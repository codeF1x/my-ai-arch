import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// 加载 .env.local 中的环境变量
config({ path: '.env.local' });

export default defineConfig({
  schema: './db/schema.ts',      // 告知 Schema 文件的路径
  out: './drizzle',              // 迁移文件的输出目录
  dialect: 'postgresql',         // 数据库方言
  dbCredentials: {
    url: process.env.DATABASE_URL!, // 从环境变量读取云端连接字符串
  },
  strict: true,
  verbose: true,
});