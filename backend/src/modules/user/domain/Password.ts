export class Password {
  private readonly value: string;

  constructor(password: string) {
    if (!this.isValid(password)) {
      throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number');
    }
    this.value = password;
  }

  private isValid(password: string): boolean {
    if (password.length < 8) return false;
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return hasUppercase && hasLowercase && hasNumber;
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: Password): boolean {
    return this.value === other.value;
  }
}