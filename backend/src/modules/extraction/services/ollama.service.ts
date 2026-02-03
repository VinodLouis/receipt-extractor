// backend/src/modules/extraction/services/ollama.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import axios from 'axios';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaHost: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.ollamaHost = this.configService.get('ollama.host');
    this.model = this.configService.get('ollama.model');
  }

  async extractReceiptData(imageBase64: string) {
    try {
      const prompt = `
        Return receipt data as JSON only. IMPORTANT RULES:

        1. Items may be merged ONLY if BOTH the name AND the price are identical.
          - Example: "Milk $2.00" repeated 3 times → one entry with {"name":"Milk","qty":3,"cost":2.00}.
          - In this case, qty = total repeats, cost = unit price.

        2. If items have the SAME NAME but DIFFERENT PRICE → they must remain as SEPARATE entries.
          - Example: "HALLMARK CARD $2.00", "HALLMARK CARD $3.79" → two entries, each with qty=1.
          - In this case, qty must always be 1.

        3. Always list every line item from the receipt, applying rules 1 and 2 strictly.
          - Never merge items by name alone. Price must also match to merge.

        4. If receipt is UNREADABLE or NOT A RECEIPT → return is_valid=false with error message.

        Examples:

        Receipt 1 → {"is_valid":true,"date":"2026-01-14","currency":"USD","vendorName":"Walmart","items":[{"name":"Milk 2%","qty":2,"cost":3.99},{"name":"Bread","qty":1,"cost":2.49},{"name":"Eggs","qty":1,"cost":4.29}],"tax":0.40,"total":32.47}

        Receipt 2 → {"is_valid":true,"date":"2026-01-15","currency":"EUR","vendorName":"Carrefour","items":[{"name":"Baguette","qty":3,"cost":1.50},{"name":"Cheese Camembert","qty":1,"cost":8.99}],"tax":2.15,"total":45.32}

        Receipt 3 (mixed) → {"is_valid":true,"date":"2026-01-16","currency":"USD","vendorName":"Target","items":[{"name":"Cereal","qty":3,"cost":4.99},{"name":"Milk","qty":1,"cost":3.29}],"tax":0.85,"total":22.12}

        Receipt 4 (same name, different prices) → {"is_valid":true,"date":"2026-01-17","currency":"USD","vendorName":"Unknown","items":[{"name":"HALLMARK CARD","qty":1,"cost":2.00},{"name":"HALLMARK CARD","qty":1,"cost":3.79},{"name":"HALLMARK CARD","qty":1,"cost":0.99}],"tax":0.00,"total":6.78}

        Blurry image → {"is_valid":false,"error":"Image unreadable"}

        Extract this receipt:
      `;

      // Call Ollama API
      const response = await axios.post(
        `${this.ollamaHost}/api/chat`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
              images: [imageBase64],
            },
          ],

          stream: false,
          options: {
            temperature: 0.1,
          },
        },
        {
          timeout: 10 * 60 * 1000, // 10 minutes
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Ollama extraction failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
