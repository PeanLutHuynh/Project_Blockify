export class SignUpCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly fullName: string,
    public readonly username: string,
    public readonly gender: string = 'other'
  ) {}

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.email || this.email.trim() === '') {
      errors.push('Email is required');
    }

    if (!this.password || this.password.trim() === '') {
      errors.push('Password is required');
    }

    if (!this.fullName || this.fullName.trim() === '') {
      errors.push('Full name is required');
    }

    if (!this.username || this.username.trim() === '') {
      errors.push('Username is required');
    }

    if (this.username && !/^[a-zA-Z0-9_]+$/.test(this.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    return errors;
  }
}