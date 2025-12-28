"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface EmbeddingProgress {
  status: string;
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export function useEmbedding() {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<EmbeddingProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    if (!worker.current) {
      // Create the worker
      worker.current = new Worker(
        new URL("../lib/embedding-worker.ts", import.meta.url),
        {
          type: "module",
        }
      );

      const onMessageReceived = (e: MessageEvent) => {
        const { status, ...rest } = e.data;

        switch (status) {
          case "progress":
            // 使用函数式更新确保获取最新的状态，避免闭包陷阱
            setProgress((prev) => {
              // 查找当前文件是否已在进度列表中（transformers.js 会并行下载多个模型文件）
              const existing = prev.findIndex((p) => p.file === rest.file);

              if (existing !== -1) {
                // 如果文件已存在，创建新数组并更新该项（保持不可变性 Immutable Update）
                const next = [...prev];
                next[existing] = { status, ...rest };
                return next;
              }

              // 如果是新文件，将其添加到列表末尾
              return [...prev, { status, ...rest }];
            });
            break;
          case "ready":
            setReady(true);
            break;
          case "error":
            setError(rest.error);
            break;
        }
      };

      worker.current.addEventListener("message", onMessageReceived);

      // Initialize the worker
      worker.current.postMessage({ task: "init" });

      return () => {
        worker.current?.terminate();
        worker.current = null;
      };
    }
  }, []);

  const embed = useCallback(
    async (text: string): Promise<number[]> => {
      if (!worker.current || !ready) {
        throw new Error("Embedding worker not ready");
      }

      // 将基于事件的 Worker 通信封装为 Promise，方便在组件中使用 async/await
      return new Promise((resolve, reject) => {
        // 定义一个单次使用的监听器
        const onMessageReceived = (e: MessageEvent) => {
          if (e.data.status === "complete") {
            // 任务完成：移除监听器并返回向量结果
            worker.current?.removeEventListener("message", onMessageReceived);
            resolve(e.data.embedding);
          } else if (e.data.status === "error") {
            // 任务失败：移除监听器并抛出错误
            worker.current?.removeEventListener("message", onMessageReceived);
            reject(new Error(e.data.error));
          }
        };

        // 1. 先绑定监听器
        worker.current?.addEventListener("message", onMessageReceived);
        // 2. 再发送指令给 Worker
        worker.current?.postMessage({ task: "embed", text });
      });
    },
    [ready]
  );

  return { ready, progress, error, embed };
}
