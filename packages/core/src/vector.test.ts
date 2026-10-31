import { describe, expect, it } from "vitest";
import { cosineSimilarity, l2Normalize, similarityFromCosineDistance } from "./vector";

describe("vector math", () => {
  it("normalizes to unit length", () => {
    const vector = l2Normalize(Float32Array.from([3, 4]));
    expect(Math.hypot(vector[0] ?? 0, vector[1] ?? 0)).toBeCloseTo(1, 5);
  });

  it("scores identical vectors as 1 and orthogonal vectors as 0", () => {
    const right = Float32Array.from([1, 0]);
    expect(cosineSimilarity(right, Float32Array.from([1, 0]))).toBeCloseTo(1, 5);
    expect(cosineSimilarity(right, Float32Array.from([0, 1]))).toBeCloseTo(0, 5);
  });

  it("converts LanceDB cosine distance back to similarity", () => {
    expect(similarityFromCosineDistance(0)).toBe(1);
    expect(similarityFromCosineDistance(0.4)).toBeCloseTo(0.6, 5);
  });
});
