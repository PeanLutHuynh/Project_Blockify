/**
 * Payment QR Value Object - Domain Layer
 * Encapsulates QR code information for payment
 */
export class PaymentQR {
  private readonly _qrUrl: string;
  private readonly _amount: number;
  private readonly _description: string;
  private readonly _bankName: string;
  private readonly _accountNo: string;
  private readonly _accountName: string;

  constructor(
    qrUrl: string,
    amount: number,
    description: string,
    bankName: string,
    accountNo: string,
    accountName: string
  ) {
    this.validateQrUrl(qrUrl);
    this.validateAmount(amount);
    this.validateDescription(description);

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

  // Domain validation
  private validateQrUrl(url: string): void {
    if (!url || url.trim().length === 0) {
      throw new Error("QR URL is required");
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new Error("QR URL must be a valid HTTP(S) URL");
    }
  }

  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
  }

  private validateDescription(description: string): void {
    if (!description || description.trim().length === 0) {
      throw new Error("Description is required");
    }
  }

  // Convert to JSON for API response
  toJSON(): {
    qrUrl: string;
    amount: number;
    description: string;
    bankName: string;
    accountNo: string;
    accountName: string;
  } {
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
