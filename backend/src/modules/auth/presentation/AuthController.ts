import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { AuthService } from "../application/AuthService";
import {
  SignUpCommand,
  SignInCommand,
  GoogleAuthCommand,
  VerifyEmailCommand,
  ResendVerificationCommand,
} from "../application/dto";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private sendSuccess(res: HttpResponse, statusCode: number, data: any, message: string): void {
    res.status(statusCode).json({
      success: true,
      data,
      message,
    });
  }

  private sendError(res: HttpResponse, statusCode: number, message: string, errors?: any): void {
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 400 ? 'BAD_REQUEST' : 'ERROR',
        message,
        errors,
      },
    });
  }

  public signUp = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const body = req.body as any;
      const { email, password, fullName, username, gender } = body;

      const command = new SignUpCommand(email, password, username, fullName, gender);
      const result = await this.authService.signUp(command);

      if (result.success) {
        this.sendSuccess(res, 201, result, result.message || 'Account created successfully');
      } else {
        this.sendError(res, 400, result.message || 'Failed to create account', result.errors);
      }
    } catch (error: any) {
      const errMsg = error?.message || "Failed to sign up";
      this.sendError(res, 400, "Failed to create account", [errMsg]);
    }
  };

  public signIn = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const body = req.body as any;
      const { identifier, password } = body;

      const command = new SignInCommand(identifier, password);
      const result = await this.authService.signIn(command);

      if (result.success) {
        res.setHeader("Authorization", `Bearer ${result.token}`);
        this.sendSuccess(res, 200, result.user, result.message || 'Signed in successfully');
      } else {
        this.sendError(res, 401, result.message || 'Authentication failed');
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to sign in");
    }
  };

  public googleAuth = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const body = req.body as any;
      const { email, fullName, authUid, avatarUrl, username } = body;

      const command = new GoogleAuthCommand(email, fullName, authUid, avatarUrl, username);
      const result = await this.authService.googleAuth(command);

      if (result.success) {
        res.setHeader("Authorization", `Bearer ${result.token}`);
        this.sendSuccess(res, 200, result.user, result.message || 'Google authentication successful');
      } else {
        if (result.errors && result.errors.length > 0) {
          this.sendError(res, 400, result.message || 'Authentication failed', result.errors);
        } else {
          this.sendError(res, 401, result.message || 'Authentication failed');
        }
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to authenticate with Google");
    }
  };

  public verifyToken = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        this.sendError(res, 401, "No token provided");
        return;
      }

      const token = authHeader.substring(7);
      const payload = await this.authService.verifyToken(token);

      if (!payload) {
        this.sendError(res, 401, "Invalid token");
        return;
      }

      const user = await this.authService.getUserById(payload.userId);
      if (!user) {
        this.sendError(res, 404, "User not found");
        return;
      }

      this.sendSuccess(res, 200, {
        user: {
          id: user.id,
          email: user.email.getValue(),
          fullName: user.fullName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          authUid: user.authUid,
        },
        payload,
      }, "Token is valid");
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to verify token");
    }
  };

  public me = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        this.sendError(res, 401, "Unauthorized");
        return;
      }

      const user = await this.authService.getUserById(userId);
      if (!user) {
        this.sendError(res, 404, "User not found");
        return;
      }

      this.sendSuccess(res, 200, {
        id: user.id,
        email: user.email.getValue(),
        fullName: user.fullName,
        username: user.username,
        gender: user.gender,
        phone: user.phone,
        birthDate: user.birthDate,
        avatarUrl: user.avatarUrl,
        authUid: user.authUid,
        isActive: user.isActive,
      }, "User profile retrieved successfully");
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to get user profile");
    }
  };

  public verifyEmail = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const body = req.body as any;
      const { token, type } = body;

      const command = new VerifyEmailCommand(token, type || "signup");
      const result = await this.authService.verifyEmail(command);

      if (result.success) {
        this.sendSuccess(res, 200, result.user, result.message || 'Email verified successfully');
      } else {
        this.sendError(res, 400, result.message || 'Email verification failed', result.errors);
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to verify email");
    }
  };

  public resendVerification = async (req: HttpRequest, res: HttpResponse): Promise<void> => {
    try {
      const body = req.body as any;
      const { email } = body;

      const command = new ResendVerificationCommand(email);
      const result = await this.authService.resendVerification(command);

      if (result.success) {
        this.sendSuccess(res, 200, null, result.message || 'Verification email sent');
      } else {
        this.sendError(res, 400, result.message || 'Failed to resend verification', result.errors);
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to resend verification email");
    }
  };
}
