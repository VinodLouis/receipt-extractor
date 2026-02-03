export interface ReceiptItem {
  name: string;
  qty: number;
  cost: number;
}

export interface ReceiptData {
  is_valid: boolean;
  date: string;
  currency: string;
  vendorName: string;
  items: ReceiptItem[];
  tax: number;
  total: number;
  error?: string;
}

export interface QwenResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  done_reason: string;
}
