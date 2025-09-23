export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    userId: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    [key: string]: any;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload: VectorPoint['payload'];
}
