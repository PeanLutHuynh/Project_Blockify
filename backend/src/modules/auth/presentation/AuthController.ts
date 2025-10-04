import { Request, Response } from "express";
import { AuthService } from "../application/AuthService";
import {
  SignUpCommand,
  SignInCommand,
  GoogleAuthCommand,
  VerifyEmailCommand,
  ResendVerificationCommand,
} from "../application/dto";
import { ResponseUtil } from "../../../utils/response.util";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private handleError(res: Response, error: any, defaultMessage: string): void {
    ResponseUtil.logAndError(res, error, defaultMessage);
  }

  public signUp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, fullName, username, gender } = req.body;

      const command = new SignUpCommand(
        email,
        password,
        username,
        fullName,
        gender
      );
      const result = await this.authService.signUp(command);

      if (result.success) {
        ResponseUtil.created(res, result, result.message);
      } else {
        ResponseUtil.badRequest(
          res,
          result.message,
          undefined,
          result.errors ? { errors: result.errors } : undefined
        );
      }
    } catch (error: any) {
      const errMsg = error?.message || "Failed to sign up";
      ResponseUtil.badRequest(res, "Failed to create account", undefined, {
        errors: [errMsg],
      });
    }
  };

  public signIn = async (req: Request, res: Response): Promise<void> => {
    try {
      const { identifier, password } = req.body;

      const command = new SignInCommand(identifier, password);
      const result = await this.authService.signIn(command);

      if (result.success) {
        res.set("Authorization", `Bearer ${result.token}`);
        ResponseUtil.success(res, result.user, result.message);
      } else {
        ResponseUtil.unauthorized(res, result.message);
      }
    } catch (error) {
      this.handleError(res, error, "Failed to sign in");
    }
  };

  public googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, fullName, authUid, avatarUrl } = req.body;

      const command = new GoogleAuthCommand(
        email,
        fullName,
        authUid,
        avatarUrl
      );
      const result = await this.authService.googleAuth(command);

      if (result.success) {
        res.set("Authorization", `Bearer ${result.token}`);
        ResponseUtil.success(res, result.user, result.message);
      } else {
        if (result.errors && result.errors.length > 0) {
          ResponseUtil.badRequest(res, result.message, undefined, {
            errors: result.errors,
          });
        } else {
          ResponseUtil.unauthorized(res, result.message);
        }
      }
    } catch (error) {
      this.handleError(res, error, "Failed to authenticate with Google");
    }
  };

  public verifyToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        ResponseUtil.unauthorized(res, "No token provided");
        return;
      }

      const token = authHeader.substring(7);
      const payload = await this.authService.verifyToken(token);

      if (!payload) {
        ResponseUtil.unauthorized(res, "Invalid token");
        return;
      }

      const user = await this.authService.getUserById(payload.userId);
      if (!user) {
        ResponseUtil.notFound(res, "User not found");
        return;
      }

      ResponseUtil.success(
        res,
        {
          user: {
            id: user.id,
            email: user.email.getValue(),
            fullName: user.fullName,
            username: user.username,
            avatarUrl: user.avatarUrl,
            authUid: user.authUid,
          },
          payload,
        },
        "Token is valid"
      );
    } catch (error) {
      this.handleError(res, error, "Failed to verify token");
    }
  };

  public me = async (req: Request, res: Response): Promise<void> => {
    try {
      // Assuming auth middleware adds user to request
      const userId = (req as any).user?.userId;
      if (!userId) {
        ResponseUtil.unauthorized(res, "Unauthorized");
        return;
      }

      const user = await this.authService.getUserById(userId);
      if (!user) {
        ResponseUtil.notFound(res, "User not found");
        return;
      }

      ResponseUtil.success(
        res,
        {
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
        },
        "User profile retrieved successfully"
      );
    } catch (error) {
      this.handleError(res, error, "Failed to get user profile");
    }
  };

  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, type } = req.body;

      const command = new VerifyEmailCommand(token, type || "signup");
      const result = await this.authService.verifyEmail(command);

      if (result.success) {
        ResponseUtil.success(res, result.user, result.message);
      } else {
        ResponseUtil.badRequest(
          res,
          result.message,
          undefined,
          result.errors ? { errors: result.errors } : undefined
        );
      }
    } catch (error) {
      this.handleError(res, error, "Failed to verify email");
    }
  };

  public resendVerification = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { email } = req.body;

      const command = new ResendVerificationCommand(email);
      const result = await this.authService.resendVerification(command);

      if (result.success) {
        ResponseUtil.success(res, null, result.message);
      } else {
        ResponseUtil.badRequest(
          res,
          result.message,
          undefined,
          result.errors ? { errors: result.errors } : undefined
        );
      }
    } catch (error) {
      this.handleError(res, error, "Failed to resend verification email");
    }
  };
}
