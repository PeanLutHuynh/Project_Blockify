export class SignInCommand {
  constructor(
    public readonly identifier: string, // username or email
    public readonly password: string
  ) {}

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.identifier || this.identifier.trim() === '') {
      errors.push('Username or email is required');
    }

    if (!this.password || this.password.trim() === '') {
      errors.push('Password is required');
    }

    return errors;
  }

  public isEmail(): boolean {
    return this.identifier.includes('@');
  }
}