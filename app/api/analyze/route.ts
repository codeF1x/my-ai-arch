/**
 * 我们将一起编写这个 API 路由 app/api/analyze/route.ts。这是你作为智能产品架构师编写的第一段核心业务逻辑。

这个接口的任务是将概率性的 AI 推理转化为确定的数据库记录。整个逻辑流如下：


接收请求：从前端获取用户输入的文本 。


AI 推理：调用 generateObject 配合 DeepSeek V3 模型，强制生成结构化 JSON 。



持久化：使用 Drizzle ORM 将结果存入我们在 db/schema.ts 中定义的 analysisTasks 表 。


返回响应：将结果发送给前端用于 UI 渲染
 */

import { db } from "@/db";
import { analysisTasks } from "@/db/schema";
import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import { desc } from "drizzle-orm";

// export const runtime = 'edge'; // 暂时注释掉 Edge Runtime，因为 postgres.js 在 Edge 环境下可能存在兼容性问题，改用默认的 Node.js Runtime 

export async function POST(req:Request) {

    //在这里解析请求体
    const {text} = await req.json();

    //接下来定义 AI 必须遵守的 ‘合同’
    const schema = z.object({
      //根据需求定义字段  
      sentiment:z.enum(['positive','negative','neutral']),
      score:z.number().min(0).max(1).describe("置信度，0到1之间的正数"),
      summary:z.string(),
      
    })
    try {
        
    // 后续 generateObject 会根据这个 schema 生成 JSON 对象

    const {object} = await generateObject({
        model:deepseek('deepseek-chat'),
        schema,
        output:'object',
        prompt:`分析以下文本的情感倾向：${text}`
    })

    //3 持久化, 将结果存入 Vercel Postgres
    const [insertedTask] = await db.insert(analysisTasks).values({
      content:text,
     result:object,
    }).returning();
   
    //4 返回响应
    return Response.json({
      id:insertedTask.id,
      result:object,
    })
    } catch (error) {
        console.error("Analysis API Error:", error);
    return new Response(
      JSON.stringify({ error: "分析失败，请稍后重试" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    }
 }

 export async function GET() {
    try {
        const tasks = await db.select().from(analysisTasks).orderBy(desc(analysisTasks.createdAt));
        return Response.json(tasks);
    } catch (error) {
        console.error("GET Analysis API Error:", error);
        return new Response(
            JSON.stringify({ error: "获取分析记录失败，请稍后重试" }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
 }