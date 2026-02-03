// frontend/src/types/index.ts
export enum ExtractionStatus {
  SUBMITTING = 'SUBMITTING',
  EXTRACTING = 'EXTRACTING',
  EXTRACTED = 'EXTRACTED',
  INVALID = 'INVALID',
  FAILED = 'FAILED',
}

export interface ReceiptItem {
  name: string;
  cost: number;
}

export interface Extraction {
  id: string;
  userId: string;
  filename: string;
  imageUrl: string;
  status: ExtractionStatus;
  date?: string;
  currency?: string;
  vendorName?: string;
  items?: ReceiptItem[];
  tax?: number;
  total?: number;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}
