import { pipeline, env } from "@huggingface/transformers";

// Skip local model check and use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;
env.remoteHost = "https://hf-mirror.com";

class EmbeddingPipeline {
  static task = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance: any = null;

  static async getInstance(progress_callback?: (progress: any) => void) {
    if (this.instance === null) {
      this.instance = pipeline(this.task as any, this.model, {
        progress_callback,
      });
    }
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { text, task } = event.data;

  if (task === "init") {
    try {
      await EmbeddingPipeline.getInstance((x) => {
        // Send progress back to the main thread
        self.postMessage({ status: "progress", ...x });
      });
      self.postMessage({ status: "ready" });
    } catch (error: any) {
      self.postMessage({ status: "error", error: error.message });
    }
  } else if (task === "embed") {
    try {
      const extractor = await EmbeddingPipeline.getInstance();
      const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });

      // Convert to plain array for transfer
      const embedding = Array.from(output.data);
      self.postMessage({ status: "complete", embedding });
    } catch (error: any) {
      self.postMessage({ status: "error", error: error.message });
    }
  }
});
