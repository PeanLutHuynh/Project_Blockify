/**
 * Bank Account Value Object - Domain Layer
 * Encapsulates bank account information for payment processing
 */
export class BankAccount {
  private readonly _bankId: string;
  private readonly _bankBin: string;
  private readonly _accountNo: string;
  private readonly _accountName: string;

  constructor(
    bankId: string,
    bankBin: string,
    accountNo: string,
    accountName: string
  ) {
    this.validateBankId(bankId);
    this.validateBankBin(bankBin);
    this.validateAccountNo(accountNo);
    this.validateAccountName(accountName);

    this._bankId = bankId;
    this._bankBin = bankBin;
    this._accountNo = accountNo;
    this._accountName = accountName;
  }

  // Getters (Encapsulation)
  get bankId(): string {
    return this._bankId;
  }

  get bankBin(): string {
    return this._bankBin;
  }

  get accountNo(): string {
    return this._accountNo;
  }

  get accountName(): string {
    return this._accountName;
  }

  // Domain validation
  private validateBankId(bankId: string): void {
    if (!bankId || bankId.trim().length === 0) {
      throw new Error("Bank ID is required");
    }
  }

  private validateBankBin(bankBin: string): void {
    if (!bankBin || !/^\d{6}$/.test(bankBin)) {
      throw new Error("Bank BIN must be 6 digits");
    }
  }

  private validateAccountNo(accountNo: string): void {
    if (!accountNo || accountNo.trim().length === 0) {
      throw new Error("Account number is required");
    }
  }

  private validateAccountName(accountName: string): void {
    if (!accountName || accountName.trim().length === 0) {
      throw new Error("Account name is required");
    }
  }

  // Value object equality
  equals(other: BankAccount): boolean {
    return (
      this._bankId === other._bankId &&
      this._bankBin === other._bankBin &&
      this._accountNo === other._accountNo &&
      this._accountName === other._accountName
    );
  }

  toString(): string {
    return `${this._accountName} - ${this._accountNo} (${this._bankId})`;
  }
}
