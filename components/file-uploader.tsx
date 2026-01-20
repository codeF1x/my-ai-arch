'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChunkPreview {
  index: number;
  preview: string;
  length: number;
  tokens: number;
}

interface UploadResult {
  docId: string;
  totalChunks: number;
  totalTokens: number;
  chunks: ChunkPreview[];
}

export function FileUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 重置状态
    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      // 1. 读取文件内容
      const content = await readFileContent(file);
      
      // 2. 调用上传 API
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          filename: file.name,
          options: {
            chunkSize: 512,
            overlap: 50,
            splitBy: 'paragraph'
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '上传失败');
      }

      setUploadResult(data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : '上传过程中发生错误');
    } finally {
      setIsUploading(false);
      // 清空 input，允许重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".txt,.md"
          className="hidden"
        />
        <Button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          variant="outline"
          className="w-full h-24 border-dashed border-2 hover:border-primary/50 hover:bg-muted/50 transition-colors"
        >
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {isUploading ? '正在处理...' : '点击上传文档 (.txt, .md)'}
            </span>
          </div>
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {uploadResult && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              处理完成
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div className="bg-background p-2 rounded border">
                <div className="font-semibold text-foreground">{uploadResult.totalChunks}</div>
                <div>Chunks</div>
              </div>
              <div className="bg-background p-2 rounded border">
                <div className="font-semibold text-foreground">~{uploadResult.totalTokens}</div>
                <div>Tokens</div>
              </div>
              <div className="bg-background p-2 rounded border">
                <div className="font-semibold text-foreground truncate" title={uploadResult.docId}>
                  {uploadResult.docId.split('_')[1]}...
                </div>
                <div>Doc ID</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">分块预览</div>
              <ScrollArea className="h-[200px] w-full rounded-md border bg-background p-4">
                <div className="space-y-4">
                  {uploadResult.chunks.map((chunk) => (
                    <div key={chunk.index} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-medium">Chunk {chunk.index}</span>
                        <span>{chunk.length} chars</span>
                      </div>
                      <p className="text-xs text-muted-foreground/80 bg-muted/50 p-2 rounded border-l-2 border-primary/20">
                        {chunk.preview}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
