export function l2Normalize(vector: Float32Array): Float32Array {
  let sum = 0;
  for (const value of vector) sum += value * value;
  if (sum === 0) {
    const fallback = new Float32Array(vector.length);
    if (fallback.length > 0) fallback[0] = 1;
    return fallback;
  }
  const norm = Math.sqrt(sum);
  const normalized = new Float32Array(vector.length);
  for (let index = 0; index < vector.length; index += 1) {
    normalized[index] = (vector[index] ?? 0) / norm;
  }
  return normalized;
}

export function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  if (left.length !== right.length) {
    throw new Error(`Vector length ${left.length} does not match ${right.length}.`);
  }
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

/** LanceDB reports cosine distance as 1 - cosine similarity. */
export function similarityFromCosineDistance(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  return 1 - distance;
}
