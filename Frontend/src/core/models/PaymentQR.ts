/**
 * PaymentQR Model - Core Layer
 * Represents VietQR payment information
 * OOP Principles: Encapsulation, Abstraction
 */
export class PaymentQR {
  private _qrUrl: string;
  private _amount: number;
  private _description: string;
  private _bankName: string;
  private _accountNo: string;
  private _accountName: string;

  constructor(
    qrUrl: string,
    amount: number,
    description: string,
    bankName: string,
    accountNo: string,
    accountName: string
  ) {
    this._qrUrl = qrUrl;
    this._amount = amount;
    this._description = description;
    this._bankName = bankName;
    this._accountNo = accountNo;
    this._accountName = accountName;
  }

  // Getters (Encapsulation)
  get qrUrl(): string {
    return this._qrUrl;
  }

  get amount(): number {
    return this._amount;
  }

  get description(): string {
    return this._description;
  }

  get bankName(): string {
    return this._bankName;
  }

  get accountNo(): string {
    return this._accountNo;
  }

  get accountName(): string {
    return this._accountName;
  }

  /**
   * Format amount to Vietnamese currency
   */
  formatAmount(): string {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(this._amount);
  }

  /**
   * Get payment instructions
   */
  getInstructions(): string[] {
    return [
      "Bước 1: Mở ứng dụng ngân hàng của bạn",
      "Bước 2: Quét mã QR hoặc chuyển khoản thủ công",
      "Bước 3: Kiểm tra thông tin và xác nhận thanh toán",
      "Bước 4: Tải ảnh minh chứng lên hệ thống (nếu cần)",
    ];
  }

  /**
   * Create from API response
   */
  static fromJSON(data: any): PaymentQR {
    return new PaymentQR(
      data.qrUrl,
      data.amount,
      data.description,
      data.bankName,
      data.accountNo,
      data.accountName
    );
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, any> {
    return {
      qrUrl: this._qrUrl,
      amount: this._amount,
      description: this._description,
      bankName: this._bankName,
      accountNo: this._accountNo,
      accountName: this._accountName,
    };
  }
}
