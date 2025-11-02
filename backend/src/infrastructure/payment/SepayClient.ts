import https from "https";
import crypto from "crypto";

/**
 * Sepay API Client
 * Documentation: https://docs.sepay.vn/
 */
export class SepayClient {
  private readonly apiUrl = "https://my.sepay.vn/userapi";
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get transaction history from Sepay
   * @param accountNumber - Bank account number
   * @param limit - Number of transactions to fetch (default: 50)
   */
  async getTransactions(
    accountNumber: string,
    limit: number = 50
  ): Promise<SepayTransaction[]> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "my.sepay.vn",
        path: `/userapi/transactions/list?account_number=${accountNumber}&limit=${limit}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            
            if (response.status === 200 || response.status === "success") {
              resolve(response.transactions || response.data || []);
            } else {
              reject(
                new Error(
                  response.message || "Failed to fetch transactions"
                )
              );
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", reject);
      req.end();
    });
  }

  /**
   * Generate QR code URL for payment
   * @param accountNumber - Bank account number
   * @param amount - Payment amount in VND
   * @param content - Transaction content (order number)
   * @param accountName - Account holder name
   */
  generateQRCode(
    accountNumber: string,
    bankBin: string,
    amount: number,
    content: string,
    accountName: string
  ): string {
    // Use VietQR API (compatible with Sepay)
    const template = "compact2"; // or "print", "qr_only"
    const params = new URLSearchParams({
      accountName: accountName,
      amount: amount.toString(),
      addInfo: content,
    });

    return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-${template}.png?${params.toString()}`;
  }

  /**
   * Verify webhook signature using HMAC SHA256
   * @param payload - Raw request body string
   * @param signature - Signature from x-sepay-signature header
   * @param secret - Webhook secret key
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      return signature === expectedSignature;
    } catch (error) {
      console.error("❌ Signature verification error:", error);
      return false;
    }
  }
}

/**
 * Sepay Transaction Interface (based on their API response)
 */
export interface SepayTransaction {
  id: string;
  transaction_date: string; // ISO 8601 format
  account_number: string;
  amount_in: number; // Tiền vào
  amount_out: number; // Tiền ra
  accumulated: number; // Số dư
  transaction_content: string; // Nội dung chuyển khoản
  reference_number: string;
  code: string;
  sub_account: string;
  bank_brand_name: string;
  bank_account_id: string;
}
