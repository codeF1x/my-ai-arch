/**
 * 文档分块工具库
 *
 * 实现 roadmap 第二阶段要求的语义分块策略：
 * - 固定大小分块 (默认 512 tokens)
 * - 重叠窗口 (默认 50 tokens) 以保持上下文连续性
 * - 按段落/句子边界切分，避免语义截断
 *
 */

export interface ChunkOptions {
  /** 每个 chunk 的最大字符数 (近似 tokens) */
  chunkSize?: number;
  /** 相邻 chunk 之间的重叠字符数 */
  overlap?: number;
  /** 分块策略：按段落或句子 */
  splitBy?: "paragraph" | "sentence" | "fixed";
  /** 是否保留空白块 */
  keepEmpty?: boolean;
}

export interface Chunk {
  /** chunk 内容 */
  text: string;
  /** chunk 在文档中的索引 (从 0 开始) */
  index: number;
  /** chunk 在原文中的起始字符位置 */
  startOffset: number;
  /** chunk 在原文中的结束字符位置 */
  endOffset: number;
  /** 元数据 */
  metadata: {
    /** chunk 的字符长度 */
    length: number;
    /** 是否是第一个 chunk */
    isFirst: boolean;
    /** 是否是最后一个 chunk */
    isLast: boolean;
  };
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  chunkSize: 512,
  overlap: 50,
  splitBy: "paragraph",
  keepEmpty: false,
};

/**
 * 主入口：将文本分块
 *
 * @example
 * ```typescript
 * const chunks = chunkText(longDocument, {
 *   chunkSize: 512,
 *   overlap: 50,
 *   splitBy: 'paragraph'
 * });
 * ```
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!text || text.trim().length === 0) {
    return [];
  }

  // 根据策略选择分块方法
  switch (opts.splitBy) {
    case "paragraph":
      return chunkByParagraph(text, opts);
    case "sentence":
      return chunkBySentence(text, opts);
    case "fixed":
    default:
      return chunkByFixedSize(text, opts);
  }
}

/**
 * 按段落分块（推荐策略）
 *
 * 实现思路：
 * 1. 先按段落边界分割文本
 * 2. 合并段落直到接近 chunkSize
 * 3. 添加 overlap 重叠内容
 */
function chunkByParagraph(
  text: string,
  options: Required<ChunkOptions>
): Chunk[] {
  const paragraphs = splitIntoParagraphs(text);
  const chunks: Chunk[] = [];

  let currentChunk = "";
  let currentStartOffset = 0;
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const potentialChunk = currentChunk + (currentChunk ? "\n\n" : "") + para;

    // 如果加入当前段落会超出大小限制，且当前 chunk 不为空
    if (potentialChunk.length > options.chunkSize && currentChunk.length > 0) {
      // 保存当前 chunk
      const endOffset = currentStartOffset + currentChunk.length;
      chunks.push(
        createChunk(
          currentChunk,
          chunkIndex,
          currentStartOffset,
          endOffset,
          chunks.length === 0,
          false
        )
      );
      chunkIndex++;

      // 准备下一个 chunk，包含 overlap
      const overlapText = getOverlapText(currentChunk, options.overlap);
      currentChunk = overlapText + (overlapText ? "\n\n" : "") + para;
      currentStartOffset = endOffset - overlapText.length;
    } else {
      // 继续累加段落
      currentChunk = potentialChunk;
    }
  }

  // 保存最后一个 chunk
  if (currentChunk.trim().length > 0 || options.keepEmpty) {
    const endOffset = currentStartOffset + currentChunk.length;
    chunks.push(
      createChunk(
        currentChunk,
        chunkIndex,
        currentStartOffset,
        endOffset,
        chunks.length === 0,
        true
      )
    );
  }

  return chunks;
}

/**
 * 按句子分块
 *
 * 适用于需要更细粒度切分的场景
 */
function chunkBySentence(
  text: string,
  options: Required<ChunkOptions>
): Chunk[] {
  const sentences = splitIntoSentences(text);
  const chunks: Chunk[] = [];

  let currentChunk = "";
  let currentStartOffset = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const potentialChunk = currentChunk + (currentChunk ? " " : "") + sentence;

    if (potentialChunk.length > options.chunkSize && currentChunk.length > 0) {
      const endOffset = currentStartOffset + currentChunk.length;
      chunks.push(
        createChunk(
          currentChunk,
          chunkIndex,
          currentStartOffset,
          endOffset,
          chunks.length === 0,
          false
        )
      );
      chunkIndex++;

      const overlapText = getOverlapText(currentChunk, options.overlap);
      currentChunk = overlapText + (overlapText ? " " : "") + sentence;
      currentStartOffset = endOffset - overlapText.length;
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk.trim().length > 0 || options.keepEmpty) {
    const endOffset = currentStartOffset + currentChunk.length;
    chunks.push(
      createChunk(
        currentChunk,
        chunkIndex,
        currentStartOffset,
        endOffset,
        chunks.length === 0,
        true
      )
    );
  }

  return chunks;
}

/**
 * 按固定大小分块（简单粗暴，不推荐用于生产）
 *
 * 此方法会在任意位置切分，可能破坏语义
 */
function chunkByFixedSize(
  text: string,
  options: Required<ChunkOptions>
): Chunk[] {
  const chunks: Chunk[] = [];
  const { chunkSize, overlap } = options;
  let startOffset = 0;
  let chunkIndex = 0;

  while (startOffset < text.length) {
    const endOffset = Math.min(startOffset + chunkSize, text.length);
    const chunkText = text.slice(startOffset, endOffset);

    if (chunkText.trim().length > 0 || options.keepEmpty) {
      chunks.push(
        createChunk(
          chunkText,
          chunkIndex,
          startOffset,
          endOffset,
          chunkIndex === 0,
          endOffset >= text.length
        )
      );
      chunkIndex++;
    }

    // 移动到下一个位置，减去 overlap
    startOffset = endOffset - overlap;

    // 防止死循环：如果 overlap >= chunkSize
    if (startOffset <= endOffset - chunkSize) {
      startOffset = endOffset;
    }
  }

  return chunks;
}

/**
 * 创建 Chunk 对象
 */
function createChunk(
  text: string,
  index: number,
  startOffset: number,
  endOffset: number,
  isFirst: boolean,
  isLast: boolean
): Chunk {
  return {
    text: text.trim(),
    index,
    startOffset,
    endOffset,
    metadata: {
      length: text.trim().length,
      isFirst,
      isLast,
    },
  };
}

/**
 * 从文本末尾提取 overlap 长度的内容
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (overlapSize <= 0 || text.length <= overlapSize) {
    return text;
  }
  return text.slice(-overlapSize);
}

/**
 * 按段落分割文本
 *
 * 规则：连续两个换行符 \n\n 视为段落边界
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * 按句子分割文本
 *
 * 规则：句号、问号、感叹号后跟空格或换行
 * 支持中英文标点
 */
function splitIntoSentences(text: string): string[] {
  // 匹配中英文句子结束标点
  const sentenceEndings = /[.!?。！？]\s+/g;

  const sentences: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceEndings.exec(text)) !== null) {
    const sentence = text
      .slice(lastIndex, match.index + match[0].length)
      .trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
    lastIndex = match.index + match[0].length;
  }

  // 添加最后一个句子
  const lastSentence = text.slice(lastIndex).trim();
  if (lastSentence.length > 0) {
    sentences.push(lastSentence);
  }

  return sentences;
}

/**
 * 工具函数：估算文本的 token 数量
 *
 * 简单估算：英文 ~4 字符/token，中文 ~2 字符/token
 * 生产环境应使用 tiktoken 等专业库
 */
export function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishChars = text.length - chineseChars;

  return Math.ceil(chineseChars / 2 + englishChars / 4);
}

/**
 * 工具函数：根据 token 限制计算字符数限制
 *
 * @example
 * ```typescript
 * const charLimit = tokenLimitToCharLimit(512); // ~1024-2048 字符
 * ```
 */
export function tokenLimitToCharLimit(
  tokenLimit: number,
  language: "zh" | "en" | "mixed" = "mixed"
): number {
  switch (language) {
    case "zh":
      return tokenLimit * 2;
    case "en":
      return tokenLimit * 4;
    case "mixed":
    default:
      return tokenLimit * 3; // 折中值
  }
}
