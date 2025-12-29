//计算2个已经归一化的向量的余弦相似度
export const calculateCosineSimilarity = (
  vector1: Float32Array,
  vector2: Float32Array
): number => {
  let dotProduct = 0;
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
  }
  return dotProduct;
};
