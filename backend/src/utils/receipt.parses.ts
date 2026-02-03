import { QwenResponse, ReceiptData } from './types';

export class QwenReceiptParser {
  /**
   * Converts Qwen markdown-wrapped JSON → Clean ReceiptData
   */
  static parseReceiptResponse(qwenResponse: QwenResponse): ReceiptData {
    const content = qwenResponse.message.content;

    // Step 1: Remove markdown code blocks
    let jsonString = this.removeMarkdownWrappers(content);

    // Step 2: Fallback extraction if needed
    if (!this.isValidJson(jsonString)) {
      jsonString = this.extractJsonObject(content);
    }

    // Step 3: Parse JSON
    const receiptData: ReceiptData = JSON.parse(jsonString.trim());

    // Step 4: Validate structure
    this.validateReceipt(receiptData);

    return receiptData;
  }

  private static removeMarkdownWrappers(content: string): string {
    return content
      .replace(/```(?:json)?/gi, '') // Remove opening ```json or ```
      .replace(/```\s*$/gm, '') // Remove closing ```
      .replace(/^\s*\n/gm, '') // Remove leading newlines
      .trim();
  }

  private static isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private static extractJsonObject(content: string): string {
    // Extract largest valid JSON object using regex
    const jsonRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/;
    const match = content.match(jsonRegex);
    return match ? match[0] : '{}';
  }

  private static validateReceipt(data: ReceiptData): void {
    if (!data.is_valid) {
      if (!data.error) {
        data.error = 'Unknown validation error';
      }
      return;
    }

    const requiredFields: (keyof ReceiptData)[] = [
      'date',
      'currency',
      'vendorName',
      'total',
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${String(field)}`);
      }
    }

    // Validate items array
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Items array is empty or invalid');
    }

    // Validate numeric fields
    const numericFields = ['tax', 'total'] as const;
    for (const field of numericFields) {
      if (typeof data[field] !== 'number' || isNaN(data[field])) {
        throw new Error(`Invalid ${String(field)}: ${data[field]}`);
      }
    }
  }
}
