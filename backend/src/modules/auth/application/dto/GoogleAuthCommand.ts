export class GoogleAuthCommand {
  constructor(
    public readonly email: string,
    public readonly fullName: string,
    public readonly authUid: string,
    public readonly avatarUrl?: string,
    public readonly username?: string
  ) {}

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.email || this.email.trim() === '') {
      errors.push('Email is required');
    }

    if (!this.fullName || this.fullName.trim() === '') {
      errors.push('Full name is required');
    }

    if (!this.authUid || this.authUid.trim() === '') {
      errors.push('Auth UID is required');
    }

    return errors;
  }
}