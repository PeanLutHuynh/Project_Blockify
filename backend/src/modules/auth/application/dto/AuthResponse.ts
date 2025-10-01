export class AuthResponse {
  constructor(
    public readonly success: boolean,
    public readonly message: string,
    public readonly user?: {
      id: string;
      email: string;
      fullName: string;
      username: string;
      avatarUrl?: string;
      authUid: string;
    },
    public readonly token?: string,
    public readonly errors?: string[]
  ) {}

  public static success(user: any, token: string, message: string = 'Authentication successful'): AuthResponse {
    return new AuthResponse(
      true,
      message,
      {
        id: user.id,
        email: typeof user.email === 'string' ? user.email : user.email.getValue(),
        fullName: user.fullName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        authUid: user.authUid
      },
      token
    );
  }

  public static failure(message: string, errors?: string[]): AuthResponse {
    return new AuthResponse(false, message, undefined, undefined, errors);
  }
}