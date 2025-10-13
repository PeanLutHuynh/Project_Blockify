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
      role?: string; // Add role field
    },
    public readonly token?: string,
    public readonly errors?: string[]
  ) {}

  public static success(user: any, token: string, message: string = 'Authentication successful', role?: string): AuthResponse {
    // Handle case where user is undefined (e.g., resend verification)
    if (!user) {
      return new AuthResponse(true, message, undefined, token);
    }
    
    return new AuthResponse(
      true,
      message,
      {
        id: user.id,
        email: typeof user.email === 'string' ? user.email : user.email.getValue(),
        fullName: user.fullName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        authUid: user.authUid,
        role: role // Include role in response
      },
      token
    );
  }

  public static failure(message: string, errors?: string[]): AuthResponse {
    return new AuthResponse(false, message, undefined, undefined, errors);
  }

  public static pendingVerification(user: any, message: string): AuthResponse {
    return new AuthResponse(true, message, {
      id: user.id,
      email: typeof user.email === 'string' ? user.email : user.email.getValue(),
      fullName: user.fullName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      authUid: user.authUid
    }, undefined, ['Email verification required']);
  }
}