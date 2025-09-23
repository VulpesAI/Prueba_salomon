export interface TransactionData {
  description: string;
  amount: number;
  date: string;
  userId: string;
}

export interface ClassifiedTransaction extends TransactionData {
  category: string;
  confidence: number;
}

export interface CategoryScore {
  [key: string]: number;
}
