
'use client';

//引入 shadcn ui 组件
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { analysisSchema } from "@/lib/shared/analysis-schema";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";


export default function AnalysisPage() {
  const [text, setText] = useState('');
  // 1. 使用 useObject Hook
  // 它会自动处理与后端 API (/api/analyze) 的流式连接
  const { object: partialObject, submit, isLoading } = useObject({
    api: '/api/analyze',
    schema: analysisSchema, // 与后端共用同一个 Schema，确保类型安全
  });

  const handleAnalyze = () => {
  if (!text.trim()) return; // 防护：如果没写字，不发送请求
    
    // 3. submit 会把这个对象转为 JSON 发送给后端的 req.json()
    submit({ text });
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
    <Textarea 
        placeholder="请输入故障描述..." 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        className="text-black"
      />
      <Button onClick={handleAnalyze} disabled={isLoading}>
        {isLoading ? "专家正在思考..." : "开始流式诊断"}
      </Button>

      {/* 2. 流式展示：利用 partialObject 的存在性 */}
      {(isLoading || partialObject) && (
        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardHeader>
             <CardTitle>诊断中...</CardTitle>
             <CardDescription>
               {/* 实时显示置信度，即便它还没完全算出来 */}
               置信度: {partialObject?.score ? (partialObject.score * 100).toFixed(0) : '--'}%
             </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ✨ 魔法时刻：summary 会随着流的传输逐字跳出 */}
            <p className="text-lg font-medium min-h-[1.5em]">
              {partialObject?.summary}
              {isLoading && !partialObject?.summary && <span className="animate-pulse">|</span>}
            </p>
          </CardContent>
          <CardFooter>
            <Collapsible className="w-full">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 p-0 h-auto font-normal text-muted-foreground">
                  查看思维链 (CoT) 推理过程 <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 text-sm text-muted-foreground leading-relaxed italic">
                {partialObject?.reasoning || "正在生成推理过程..."}
              </CollapsibleContent>
            </Collapsible>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}