export const DB_NAME = "AiLocalCache";
const DB_VERSION = 2;
export const STORE_NAME = "vectors";

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      let store;
      if (oldVersion < 1) {
        // 1. 创建存储空间， chunkId 作为主键
        store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      } else {
        store = request.transaction!.objectStore(STORE_NAME);
      }

      // 2. 建立/更新 docId 索引
      if (oldVersion < 2) {
        if (store.indexNames.contains("by_doc")) {
          store.deleteIndex("by_doc");
        }
        // 使用复合索引 ["docId", "id"] 以支持高效的分页查询
        store.createIndex("by_doc", ["docId", "id"], { unique: false });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};
//在一个transaction 中批量写入 chunks。 1. 减少I/O开销。2.原子性保证 3.锁定机制
export const saveVectorBatch = async (chunks: any[]) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    //1.开启一个读写 transaction
    const transaction = db.transaction(STORE_NAME, "readwrite");
    //2.获取store
    const store = transaction.objectStore(STORE_NAME);

    //3.监听 transaction 的完成事件
    transaction.oncomplete = () => {
      resolve(true);
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };

    try {
      //4.遍历 chunks，将每个 chunk 添加到 store 中
      for (const chunk of chunks) {
        const request = store.put(chunk);
        request.onerror = () => {
          transaction.abort();
          reject(request.error);
        };
      }
    } catch (error) {
      //5.如果失败，中止 transaction
      transaction.abort();
      reject(error);
    }
  });
};
