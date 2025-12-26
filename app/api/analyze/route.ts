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
import { streamObject} from "ai";
import { desc } from "drizzle-orm";
import { analysisSchema } from "@/lib/shared/analysis-schema";



// export const runtime = 'edge'; // 暂时注释掉 Edge Runtime，因为 postgres.js 在 Edge 环境下可能存在兼容性问题，改用默认的 Node.js Runtime 

export async function POST(req:Request) {

    //在这里解析请求体
    const {text} = await req.json();
    

    //1.3 替换成 streamObject 
      const result = await streamObject({
        model:deepseek('deepseek-chat'),
        schema: analysisSchema,
        output:'object',
        messages:[
          { role: 'system', content: '你是一位资深硬件维修专家。请分析用户情感并给出 0-1 的置信度。' },
          { role: 'user', content: text },
        ],
        onFinish:async ({object})=>{
          if(object){
            await db.insert(analysisTasks).values({
              content:text,
              result:object,
            } ) 
          }
        }
      })

      //将流转换成标准的 HTTP 响应返回给前端
      return result.toTextStreamResponse()

    
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