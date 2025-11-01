import { BankAccount } from "../value-objects/BankAccount";
import { PaymentQR } from "../value-objects/PaymentQR";

/**
 * Payment QR Generator - Domain Service
 * Generates VietQR code URLs for bank transfer payments
 * Uses VietQR API: https://api.vietqr.io/
 */
export class PaymentQRGenerator {
  private static readonly VIETQR_BASE_URL = "https://api.vietqr.io/image";
  private static readonly DEFAULT_TEMPLATE = "MND4rau"; // compact, compact2, print, qr_only, MND4rau

  /**
   * Generate VietQR payment code
   * @param bankAccount - Bank account information
   * @param amount - Payment amount in VND
   * @param orderNumber - Order number for transaction description
   * @param template - QR template style (optional)
   * @returns PaymentQR value object with QR URL and payment details
   */
  static generate(
    bankAccount: BankAccount,
    amount: number,
    orderNumber: string,
    template: string = PaymentQRGenerator.DEFAULT_TEMPLATE
  ): PaymentQR {
    // Generate description for bank transfer
    const description = `Thanh toan hoa don ${orderNumber}`;

    // Build VietQR URL
    // Format: https://api.vietqr.io/image/{BANK_BIN}-{ACCOUNT_NO}-{TEMPLATE}.jpg
    // Query params: accountName, amount, addInfo
    const qrUrl = this.buildQRUrl(
      bankAccount.bankBin,
      bankAccount.accountNo,
      template,
      bankAccount.accountName,
      amount,
      description
    );

    // Get bank name from bank ID
    const bankName = this.getBankName(bankAccount.bankId);

    return new PaymentQR(
      qrUrl,
      amount,
      description,
      bankName,
      bankAccount.accountNo,
      bankAccount.accountName
    );
  }

  /**
   * Build VietQR URL with proper encoding
   */
  private static buildQRUrl(
    bankBin: string,
    accountNo: string,
    template: string,
    accountName: string,
    amount: number,
    description: string
  ): string {
    const baseUrl = `${this.VIETQR_BASE_URL}/${bankBin}-${accountNo}-${template}.jpg`;

    const params = new URLSearchParams({
      accountName: accountName,
      amount: amount.toString(),
      addInfo: description,
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Get bank name from bank ID
   * Source: https://api.vietqr.io/v2/banks
   */
  private static getBankName(bankId: string): string {
    const bankNames: Record<string, string> = {
      VCB: "Vietcombank",
      TCB: "Techcombank",
      MB: "MB Bank",
      VPB: "VPBank",
      ACB: "ACB",
      VIB: "VIB",
      TPB: "TPBank",
      STB: "Sacombank",
      HDB: "HDBank",
      BIDV: "BIDV",
      CTG: "VietinBank",
      EIB: "Eximbank",
      MSB: "MSB",
      NAB: "Nam A Bank",
      OCB: "OCB",
      SHB: "SHB",
      VAB: "VietA Bank",
      VRB: "VRB",
      ABB: "ABBank",
      BAB: "BacA Bank",
      BVB: "Bao Viet Bank",
      CBB: "CB Bank",
      DBI: "DongA Bank",
      KLB: "Kien Long Bank",
      LPB: "LienVietPostBank",
      NCB: "NCB",
      PGB: "PGBank",
      PVCB: "PVcomBank",
      SCB: "SCB",
      SEA: "SeABank",
      VBB: "VietBank",
      WRB: "Woori Bank",
    };

    return bankNames[bankId] || bankId;
  }

  /**
   * Validate order number format for VietQR
   */
  static validateOrderNumber(orderNumber: string): boolean {
    // Order number should be alphanumeric and reasonable length
    return /^[A-Z0-9]{4,20}$/.test(orderNumber);
  }
}
