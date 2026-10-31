export interface EmbeddingModel {
  readonly id: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<Float32Array[]>;
}

export interface EmbeddingState {
  modelId: string;
  dimensions: number;
  documentCount: number;
  documentFrequency: Record<string, number>;
}
