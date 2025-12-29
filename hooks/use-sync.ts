//序列化发送：将向量转化为普通数组 number[] 放入 JSON 对象中发送给后端的 Postgres 数据库
const syncToCloud = async (chunks: any[]) => {
  //1.序列化
  const serializedChunks = chunks.map((chunk) => {
    return {
      id: chunk.id,
      docId: chunk.docId,
      text: chunk.text,
      vector: Array.from(chunk.vector),
    };
  });
  //2.发送
  try {
    const response = await fetch("/api/vector/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serializedChunks),
    });
    if (!response.ok) {
      throw new Error("Failed to sync chunks to cloud");
    }
    return true;
  } catch (error) {
    console.log("Failed to sync chunks to cloud", error);
    return false;
  }
};
