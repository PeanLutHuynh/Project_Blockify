export class SignUpCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly username: string,
    public readonly fullName?: string,
    public readonly gender?: string
  ) {}

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.email || this.email.trim() === '') {
      errors.push('Email is required');
    }

    if (!this.password || this.password.trim() === '') {
      errors.push('Password is required');
    }

    // fullName is optional

    if (!this.username || this.username.trim() === '') {
      errors.push('Username is required');
    }

    if (this.username && !/^(?=\p{L})[\p{L}0-9]+(?:[_\-.][\p{L}0-9]+)*$/u.test(this.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    return errors;
  }
}