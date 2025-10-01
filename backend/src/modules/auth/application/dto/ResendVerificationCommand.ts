export class ResendVerificationCommand {
  constructor(
    public readonly email: string
  ) {}

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.email || this.email.trim() === '') {
      errors.push('Email is required');
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Invalid email format');
    }

    return errors;
  }
}
