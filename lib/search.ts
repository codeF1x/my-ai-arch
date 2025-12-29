import { initDB, STORE_NAME } from "./db";
import { calculateCosineSimilarity } from "./vector-math";

export const searchInDocument = async (
  docId: string,
  queryVector: Float32Array,
  topK: number = 5
) => {
  const db = await initDB();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index("by_doc");

  const results: { id: string; score: number; text: string }[] = [];
  const BATCH_SIZE = 100;
  let lastId = "";
  let hasMore = true;

  while (hasMore) {
    // 使用复合索引 ["docId", "id"] 进行分页检索
    // 如果是第一页，从 [docId, ""] 开始；否则从 [docId, lastId] 开始并排除当前项
    const range = lastId
      ? IDBKeyRange.bound([docId, lastId], [docId, []], true)
      : IDBKeyRange.bound([docId], [docId, []]);
    //v0.1 方案 ：使用openCursor，而不是使用 getAll，因为 getAll 会将所有数据加载到内存中，而 openCursor 会一条条读取，边读边计算相似度
    //v0.2 方案：使用 getAll，但是分批读取，避免一次性加载太多数据。openCursor 会产生乒乓效应，反复在和主线程通信。 我们要从一条条通信，改成一块块读取。所以更好的方案是  store.getAll() + IDBKeyRange + 分页
    //v0.3 方案：目前的方案有个问题是，indexDB的getAll 是升序查询，如果我们是查最后一个的话，目前的api不支持降序。getAll 就无能为力了，你被迫回到慢速的 openCursor(range, 'prev')。

    // 前沿情报： 最新的规范中引入了 getAllRecords() API.
    // 1. 支持降序：可以批量获取倒序数据。
    // 2. 同时获取 Key 和 Value：不再需要分别调用 getAll 和 getAllKeys。

    // 使用 getAll 批量获取数据，减少主线程与 IndexedDB 的通信次数
    const batch: any[] = await new Promise((resolve, reject) => {
      const request = index.getAll(range, BATCH_SIZE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (batch.length === 0) {
      hasMore = false;
      continue;
    }

    // 批量计算相似度
    for (const item of batch) {
      const score = calculateCosineSimilarity(queryVector, item.vector);
      results.push({ id: item.id, score, text: item.text });
    }

    // 更新最后一条记录的 ID，用于下一页查询
    lastId = batch[batch.length - 1].id;

    // 如果获取的数据少于 BATCH_SIZE，说明已经没有更多数据了
    if (batch.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  // 按分数排序并返回 Top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
};
