import type { SearchHit } from "../store/types";

export interface AnswerRequest {
  question: string;
  sources: SearchHit[];
}

export interface AnswerModel {
  readonly id: string;
  stream(input: AnswerRequest): AsyncIterable<string>;
}
