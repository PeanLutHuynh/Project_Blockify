/**
 * Bank Transaction Value Object
 * Represents a bank transaction from Sepay webhook
 */
export class BankTransaction {
  constructor(
    public readonly transactionId: string,
    public readonly amount: number,
    public readonly description: string,
    public readonly transactionDate: Date,
    public readonly accountNumber: string,
    public readonly bankCode: string,
    public readonly referenceNumber?: string,
    public readonly bankBrandName?: string
  ) {}

  /**
   * Extract order number from transaction description
   * Expected format: "Thanh toan don hang ORD20250102001" or similar
   */
  extractOrderNumber(): string | null {
    // Match ORD followed by date and sequence (ORDYYYYMMDDxxx)
    const match = this.description.match(/ORD\d{8,11}/i);
    return match ? match[0].toUpperCase() : null;
  }

  /**
   * Validate if transaction is valid
   */
  isValid(expectedAccountNumber: string): boolean {
    return (
      this.accountNumber === expectedAccountNumber &&
      this.amount > 0 &&
      this.transactionId.length > 0
    );
  }

  /**
   * Check if amount matches expected amount (with tolerance)
   * @param expectedAmount - Expected amount in VND
   * @param tolerance - Tolerance in VND (default 1000 = 1k VND)
   */
  matchesAmount(expectedAmount: number, tolerance: number = 1000): boolean {
    return Math.abs(this.amount - expectedAmount) <= tolerance;
  }

  /**
   * Format for logging
   */
  toLogString(): string {
    return `Transaction ${this.transactionId}: ${this.amount} VND - ${this.description}`;
  }

  /**
   * Create BankTransaction from Sepay API response
   */
  static fromSepayTransaction(sepayTxn: any): BankTransaction {
    return new BankTransaction(
      sepayTxn.id,
      sepayTxn.amount_in,
      sepayTxn.transaction_content,
      new Date(sepayTxn.transaction_date),
      sepayTxn.account_number,
      sepayTxn.code || sepayTxn.bank_account_id,
      sepayTxn.reference_number,
      sepayTxn.bank_brand_name
    );
  }
}
