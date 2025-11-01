import { BankAccount } from "../modules/order/domain/value-objects/BankAccount";
import { ENV } from "./env";

/**
 * Payment Configuration
 * Contains bank account settings for VietQR payment processing
 */
export class PaymentConfig {
  private static _instance: PaymentConfig;
  private _bankAccount: BankAccount;

  private constructor() {
    this._bankAccount = new BankAccount(
      ENV.PAYMENT_BANK_ID,
      ENV.PAYMENT_BANK_BIN,
      ENV.PAYMENT_ACCOUNT_NO,
      ENV.PAYMENT_ACCOUNT_NAME
    );
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PaymentConfig {
    if (!PaymentConfig._instance) {
      PaymentConfig._instance = new PaymentConfig();
    }
    return PaymentConfig._instance;
  }

  /**
   * Get configured bank account
   */
  get bankAccount(): BankAccount {
    return this._bankAccount;
  }

  /**
   * Update bank account configuration (for testing or admin changes)
   */
  updateBankAccount(
    bankId: string,
    bankBin: string,
    accountNo: string,
    accountName: string
  ): void {
    this._bankAccount = new BankAccount(bankId, bankBin, accountNo, accountName);
  }
}

// Export singleton instance
export const paymentConfig = PaymentConfig.getInstance();
