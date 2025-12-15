export enum AppView {
  AUTH = 'AUTH',
  RECEIPTS = 'RECEIPTS',
  EXPENSES = 'EXPENSES',
}

export interface Receipt {
  id: string;
  fileData: string; // Base64
  mimeType: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedDate?: string;
  extractedAmount?: number;
  extractedCategory?: string;
  extractedDescription?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  project: string;
  description: string;
  amount: number;
  linkedReceiptIds: string[];
  isReviewed: boolean;
}

export interface User {
  email: string;
  name: string;
  supervisor: string;
}

// Gemini Response Schema
export interface ParsedReceiptData {
  date: string;
  amount: number;
  category: string;
  description: string;
}