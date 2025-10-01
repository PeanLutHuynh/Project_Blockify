export class VerifyEmailCommand {
  constructor(
    public readonly token: string,
    public readonly type: 'signup' | 'magiclink' = 'signup'
  ) {}

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.token || this.token.trim() === '') {
      errors.push('Verification token is required');
    }

    return errors;
  }
}
