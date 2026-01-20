'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { analysisSchema } from "@/lib/shared/analysis-schema";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { useEmbedding } from "@/hooks/use-embedding";
import { Progress } from "@/components/ui/progress";
import { FileUploader } from "@/components/file-uploader";

export default function AnalysisPage() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [localEmbedding, setLocalEmbedding] = useState<number[] | null>(null);
  const [isEmbedding, setIsEmbedding] = useState(false);

  const { ready, progress, error, embed } = useEmbedding();

  const examples = [
    { label: "中性描述", text: "显示器型号 U2723QE，屏幕有横纹" },
    { label: "严重故障", text: "屏幕冒烟了！太吓人了，刚买不到一个月！" },
    { label: "正面反馈", text: "感谢专家的建议，换了线之后显示器恢复正常了，非常满意！" },
  ];

  const copyToClipboard = () => {
    if (!partialObject) return;
    navigator.clipboard.writeText(JSON.stringify(partialObject, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. 使用 useObject Hook
  const { object: partialObject, submit, isLoading } = useObject({
    api: '/api/analyze',
    schema: analysisSchema,
  });

  const handleAnalyze = () => {
    if (!text.trim()) return;
    submit({ text });
  };

  const handleLocalEmbed = async () => {
    if (!text.trim() || !ready) return;
    setIsEmbedding(true);
    try {
      const result = await embed(text);
      setLocalEmbedding(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEmbedding(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      {/* 新增：文档上传区域 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">文档处理 (RAG)</h2>
        <FileUploader />
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">或者直接输入</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {examples.map((ex, i) => (
            <Button 
              key={i} 
              variant="outline" 
              size="sm" 
              onClick={() => setText(ex.text)}
              className="text-xs"
            >
              {ex.label}
            </Button>
          ))}
        </div>
        <Textarea 
          placeholder="请输入故障描述..." 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          className="text-black min-h-[120px]"
        />
        <div className="flex gap-2">
          <Button onClick={handleAnalyze} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-spin" /> 专家正在思考...
              </span>
            ) : "开始流式诊断"}
          </Button>
          <Button 
            onClick={handleLocalEmbed} 
            disabled={!ready || isEmbedding} 
            variant="secondary"
            className="flex-1"
          >
            {isEmbedding ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> 计算向量中...
              </span>
            ) : !ready ? "模型加载中..." : "本地向量化"}
          </Button>
        </div>

        {!ready && progress.length > 0 && (
          <div className="space-y-2 p-4 bg-muted rounded-lg border border-dashed">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> 正在初始化本地模型 (仅首次需下载)...
            </p>
            {progress.map((p, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[200px]">{p.file}</span>
                  <span>{p.progress ? `${p.progress.toFixed(1)}%` : '准备中...'}</span>
                </div>
                <Progress value={p.progress || 0} className="h-1" />
              </div>
            ))}
          </div>
        )}

        {localEmbedding && (
          <Card className="bg-muted/30 border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">本地向量结果 (前 10 维)</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <code className="text-[10px] break-all text-muted-foreground">
                [{localEmbedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')} ... ]
              </code>
            </CardContent>
          </Card>
        )}
      </div>

      {(isLoading || partialObject) && (
        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>诊断结果</CardTitle>
              <CardDescription>
                置信度: {partialObject?.score ? (partialObject.score * 100).toFixed(0) : '--'}%
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={copyToClipboard}
              disabled={!partialObject}
              title="复制 JSON 结果"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </CardHeader>

          <CardContent>
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