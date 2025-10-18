import { User } from "../../user/domain/User";
import { IUserRepository } from "../../user/domain/IUserRepository";
import { IAdminRepository } from "../../admin/domain/repositories/IAdminRepository";
import { JWTConfig, JwtPayload } from "../../../config/jwt";
import {
  SignUpCommand,
  SignInCommand,
  GoogleAuthCommand,
  AuthResponse,
  VerifyEmailCommand,
  ResendVerificationCommand,
} from "./dto";
import { Email } from "../../user/domain/Email";
import { Password } from "../../user/domain/Password";
import { supabaseAdmin } from "../../../config/database";

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly adminRepository?: IAdminRepository
  ) {}

  // Helper method to validate commands
  private validateCommand(command: { validate: () => string[] }): string[] {
    return command.validate();
  }

  // Helper method to check if user is valid for login
  private async checkUserLoginEligibility(
    user: User
  ): Promise<AuthResponse | null> {
    if (!user.isActive) {
      return AuthResponse.failure("Account is deactivated");
    }

    // Check email verification in Supabase Auth
    const { data: authUser, error } =
      await supabaseAdmin.auth.admin.getUserById(user.authUid);
    if (error || !authUser.user) {
      return AuthResponse.failure("Authentication error");
    }

    if (!authUser.user.email_confirmed_at) {
      return AuthResponse.failure(
        "Email not verified. Please check your email to verify your account."
      );
    }

    return null;
  }

  // Helper method to generate JWT token
  private generateToken(user: User, role: 'admin' | 'user' = 'user'): string {
    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email.getValue(),
      role: role, // Include role in JWT payload
    };
    return JWTConfig.generateAccessToken(tokenPayload);
  }

  // Helper method to update user profile
  private async updateUserProfile(
    user: User,
    updates: Partial<User>
  ): Promise<User> {
    const updatedUser = new User({
      ...user,
      ...updates,
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    });
    return await this.userRepository.update(updatedUser.id, updatedUser);
  }

  async signUp(command: SignUpCommand): Promise<AuthResponse> {
    try {
      // Validate command
      const validationErrors = this.validateCommand(command);
      if (validationErrors.length > 0) {
        return AuthResponse.failure("Validation failed", validationErrors);
      }

      // Check duplicates
      if (await this.userRepository.existsByEmail(command.email)) {
        return AuthResponse.failure("Email already exists");
      }
      // if (await this.userRepository.existsByUsername(command.username)) {
      //   return AuthResponse.failure("Username already exists");
      // }

      // Validate using value objects
      let email: Email;
      let password: Password;
      try {
        email = new Email(command.email);
        password = new Password(command.password);
      } catch (error) {
        return AuthResponse.failure(
          error instanceof Error
            ? error.message
            : "Invalid email or password format"
        );
      }

      const fullName = command.fullName?.trim();

      // Create user in Supabase Auth
      // Note: Trigger sync_user_from_auth will automatically create user in public.users
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email.getValue(),
          password: password.getValue(),
          email_confirm: false,
          user_metadata: {
            username: command.username,
            full_name: command.fullName,
            gender: command.gender,
          },
        });

      if (authError || !authData.user) {
        return AuthResponse.failure("Failed to create authentication account", [
          authError?.message || "Unknown error",
        ]);
      }

      // Send verification email
      const { error: resendError } = await supabaseAdmin.auth.resend({
        type: "signup",
        email: email.getValue(),
        options: {
          emailRedirectTo: process.env.EMAIL_REDIRECT_URL || 'http://127.0.0.1:3002/src/pages/EmailVerified.html'
        }
      });

      if (resendError) {
        return AuthResponse.failure(
          "User created but failed to send verification email",
          [resendError.message]
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      const user = await this.userRepository.findByAuthUid(authData.user.id);

      if (!user) {
        return AuthResponse.failure(
          "User created but not found in database. Please try signing in."
        );
      }

      return AuthResponse.pendingVerification(
        user,
        "Account created successfully! Please check your email to verify your account."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);
      return AuthResponse.failure("Failed to create account", [message]);
    }
  }

  async signIn(command: SignInCommand): Promise<AuthResponse> {
    try {
      // Validate command
      const validationErrors = this.validateCommand(command);
      if (validationErrors.length > 0) {
        return AuthResponse.failure("Validation failed", validationErrors);
      }

      // Authenticate with Supabase Auth first (works for both admin and regular users)
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.signInWithPassword({
          email: command.identifier, // Try identifier as email first
          password: command.password,
        });

      // If auth fails with identifier, might be username - need to look up email first
      if (authError) {
        if (!command.isEmail()) {
          // Try to find user by username to get email
          const userByUsername = await this.userRepository.findByUsername(command.identifier);
          if (userByUsername) {
            // Retry auth with actual email
            const { data: retryAuthData, error: retryAuthError } =
              await supabaseAdmin.auth.signInWithPassword({
                email: userByUsername.email.getValue(),
                password: command.password,
              });
            
            if (retryAuthError || !retryAuthData.user) {
              return AuthResponse.failure("Invalid credentials");
            }

            if (!retryAuthData.user.email_confirmed_at) {
              return AuthResponse.failure(
                "Email not verified. Please check your email to verify your account."
              );
            }

            const token = this.generateToken(userByUsername);
            return AuthResponse.success(userByUsername, token, "Sign in successful");
          }
        }
        
        return AuthResponse.failure("Invalid credentials");
      }

      if (!authData.user) {
        return AuthResponse.failure("Invalid credentials");
      }

      // Check email verification
      if (!authData.user.email_confirmed_at) {
        return AuthResponse.failure(
          "Email not verified. Please check your email to verify your account."
        );
      }

      // Check if user is admin (admins have records in public.admin_users table)
      const userRole = authData.user.user_metadata?.role;
      if (userRole === 'admin') {
        // Check if admin exists in admin_users table and is active
        if (!this.adminRepository) {
          return AuthResponse.failure("Admin authentication not configured");
        }

        const admin = await this.adminRepository.findByAuthUid(authData.user.id);
        if (!admin) {
          return AuthResponse.failure("Admin account not found");
        }

        if (!admin.isActive) {
          return AuthResponse.failure("Admin account is deactivated");
        }

        // Update last login (use adminId which is a number)
        await this.adminRepository.updateLastLogin(admin.adminId);

        // Create a minimal user object for token generation
        const adminUser = new User({
          id: authData.user.id, // Use auth UID as user ID for admins
          email: new Email(authData.user.email!),
          username: authData.user.email!.split('@')[0], // Use email prefix as username
          fullName: admin.fullName,
          authUid: authData.user.id,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        });
        
        const token = this.generateToken(adminUser, 'admin');
        return AuthResponse.success(adminUser, token, "Admin sign in successful", 'admin');
      }

      // Find regular user in database
      let user = await this.userRepository.findByAuthUid(authData.user.id);
      
      if (!user) {
        // Try to find by email as fallback
        user = await this.userRepository.findByEmail(command.identifier);
        
        if (!user) {
          return AuthResponse.failure("User account not found in database");
        }
      }

      // Check if user is active
      if (!user.isActive) {
        return AuthResponse.failure("Account is deactivated");
      }

      const token = this.generateToken(user);
      return AuthResponse.success(user, token, "Sign in successful");
    } catch (error) {
      console.error("Sign in error:", error);
      return AuthResponse.failure("Failed to sign in", [
        error instanceof Error ? error.message : "Unknown error",
      ]);
    }
  }

  async googleAuth(command: GoogleAuthCommand): Promise<AuthResponse> {
    try {
      console.log('🔍 [GoogleAuth] Starting Google Auth process:', {
        email: command.email,
        authUid: command.authUid,
        fullName: command.fullName
      });

      // Validate command
      const validationErrors = this.validateCommand(command);
      if (validationErrors.length > 0) {
        console.error('❌ [GoogleAuth] Validation failed:', validationErrors);
        return AuthResponse.failure("Validation failed", validationErrors);
      }

      // Verify authUid in Supabase Auth
      console.log('🔍 [GoogleAuth] Verifying authUid in Supabase Auth...');
      const { data: authUser, error: authError } =
        await supabaseAdmin.auth.admin.getUserById(command.authUid);
      if (authError || !authUser.user) {
        console.error('❌ [GoogleAuth] Auth verification failed:', authError);
        return AuthResponse.failure("Invalid authentication credentials");
      }

      if (!authUser.user.email_confirmed_at) {
        console.error('❌ [GoogleAuth] Email not verified');
        return AuthResponse.failure("Email not verified");
      }

      console.log('✅ [GoogleAuth] Auth verification successful');

      // CHECK ADMIN FIRST - Before checking users table
      // Strategy: Check auth_uid first (for already linked admins), then check email (for first-time Google login)
      if (this.adminRepository) {
        let existingAdmin = await this.adminRepository.findByAuthUid(command.authUid);
        
        if (existingAdmin) {
          console.log('👑 [GoogleAuth] Admin account found by auth_uid! (Already linked)');
        } else {
          existingAdmin = await this.adminRepository.findByEmail(command.email);
          
          if (existingAdmin) {
            console.log('👑 [GoogleAuth] Admin account found by email! Linking with Google auth_uid...');
            
            // Link admin's auth_uid with Google account
            await this.adminRepository.linkAuthAccount(existingAdmin.adminId, command.authUid);
            console.log('✅ [GoogleAuth] Admin auth_uid linked successfully');
          }
        }
        
        if (existingAdmin) {
          console.log('👑 [GoogleAuth] Processing admin authentication...');
          
          // Ensure user_metadata.role is set to 'admin' in Supabase Auth
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            command.authUid,
            {
              user_metadata: {
                role: 'admin',
                full_name: existingAdmin.fullName
              }
            }
          );

          if (updateError) {
            console.error('⚠️ [GoogleAuth] Failed to update user metadata:', updateError);
          } else {
            console.log('✅ [GoogleAuth] User metadata updated with admin role');
          }

          // Update last login
          await this.adminRepository.updateLastLogin(existingAdmin.adminId);

          // Create user object for token generation (using admin data)
          const adminUser = new User({
            id: command.authUid,
            email: new Email(existingAdmin.email),
            username: existingAdmin.email.split('@')[0],
            fullName: existingAdmin.fullName,
            authUid: command.authUid,
            isActive: existingAdmin.isActive,
            avatarUrl: command.avatarUrl || existingAdmin.avatarUrl || undefined,
            createdAt: existingAdmin.createdAt,
            updatedAt: new Date(),
          });

          const token = this.generateToken(adminUser, 'admin');
          console.log('✅ [GoogleAuth] Admin Google authentication successful!');
          console.log('📦 [GoogleAuth] Token payload role:', JWTConfig.decodeToken(token)?.role);
          const response = AuthResponse.success(adminUser, token, "Admin Google authentication successful", 'admin');
          console.log('📦 [GoogleAuth] Response user role:', response.user?.role);
          return response;
        }
        
        console.log('ℹ️ [GoogleAuth] Not an admin account, proceeding as regular user...');
      }

      // Check if user exists (may have been created by trigger during OAuth flow)
      console.log('🔍 [GoogleAuth] Checking if user exists by authUid...');
      let user = await this.userRepository.findByAuthUid(command.authUid);

      if (user) {
        console.log('✅ [GoogleAuth] User found in database:', user.id);
        // User exists - update profile if needed
        if (
          user.fullName !== command.fullName ||
          user.avatarUrl !== command.avatarUrl
        ) {
          console.log('🔄 [GoogleAuth] Updating user profile...');
          user = await this.updateUserProfile(user, {
            fullName: command.fullName,
            avatarUrl: command.avatarUrl || user.avatarUrl,
          });
          console.log('✅ [GoogleAuth] User profile updated');
        }
      } else {
        console.log('⚠️ [GoogleAuth] User not found in database, checking email...');
        // User doesn't exist yet - check for existing email first
        const existingEmailUser = await this.userRepository.findByEmail(
          command.email
        );
        
        if (existingEmailUser) {
          console.log('🔄 [GoogleAuth] Email already exists, converting to Google account...');
          
          // Convert existing manual account to Google account
          // Update the auth_uid to link it with Google
          try {
            user = await this.userRepository.update(existingEmailUser.id, {
              authUid: command.authUid,
              fullName: command.fullName || existingEmailUser.fullName,
              avatarUrl: command.avatarUrl || existingEmailUser.avatarUrl,
              isActive: true, // Ensure account is active
            });
            console.log('✅ [GoogleAuth] Account successfully converted to Google account');
          } catch (error) {
            console.error('❌ [GoogleAuth] Failed to convert account:', error);
            return AuthResponse.failure(
              "Failed to link Google account with existing email"
            );
          }
        } else {
          // Wait for trigger to create user (if it hasn't already)
          console.log('⏳ [GoogleAuth] Waiting for database trigger...');
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Increased from 500ms

          // Try to find user again
          console.log('🔍 [GoogleAuth] Checking again for user...');
          user = await this.userRepository.findByAuthUid(command.authUid);

          if (!user) {
            console.log('⚠️ [GoogleAuth] User still not found, creating manually...');
            // Trigger didn't create user - create manually as fallback
            user = User.createFromGoogle({
              email: command.email,
              fullName: command.fullName,
              authUid: command.authUid,
            });

            if (command.avatarUrl) {
              user = user.updateAvatar(command.avatarUrl);
            }

            console.log('💾 [GoogleAuth] Saving user to database...');
            user = await this.userRepository.save(user);
            console.log('✅ [GoogleAuth] User saved successfully:', user.id);
          } else {
            console.log('✅ [GoogleAuth] User found after waiting (created by trigger):', user.id);
            if (command.avatarUrl && !user.avatarUrl) {
              console.log('🔄 [GoogleAuth] Adding avatar to user...');
              // User created by trigger but needs avatar
              user = await this.updateUserProfile(user, {
                avatarUrl: command.avatarUrl,
              });
              console.log('✅ [GoogleAuth] Avatar added');
            }
          }
        }
      }

      if (!user) {
        console.error('❌ [GoogleAuth] Failed to create or retrieve user');
        return AuthResponse.failure("Failed to authenticate user");
      }

      console.log('✅ [GoogleAuth] Generating token...');
      const token = this.generateToken(user);
      console.log('✅ [GoogleAuth] Authentication successful!');
      return AuthResponse.success(
        user,
        token,
        "Google authentication successful"
      );
    } catch (error) {
      console.error('❌ [GoogleAuth] Exception caught:', error);
      return AuthResponse.failure("Failed to authenticate with Google", [
        error instanceof Error ? error.message : "Unknown error",
      ]);
    }
  }

  async verifyToken(token: string): Promise<JwtPayload | null> {
    return JWTConfig.verifyAccessToken(token);
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  async getUserByAuthUid(authUid: string): Promise<User | null> {
    return await this.userRepository.findByAuthUid(authUid);
  }

  async getAdminByAuthUid(authUid: string): Promise<User | null> {
    if (!this.adminRepository) {
      return null;
    }

    const admin = await this.adminRepository.findByAuthUid(authUid);
    if (!admin) {
      return null;
    }

    // Convert Admin entity to User for response compatibility
    return new User({
      id: authUid, // Use auth UID as user ID for admins
      email: new Email(admin.email),
      username: admin.email.split('@')[0],
      fullName: admin.fullName,
      authUid: authUid,
      isActive: admin.isActive,
      avatarUrl: admin.avatarUrl || undefined,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    });
  }

  async verifyEmail(command: VerifyEmailCommand): Promise<AuthResponse> {
    try {
      const validationErrors = this.validateCommand(command);
      if (validationErrors.length > 0) {
        return AuthResponse.failure("Validation failed", validationErrors);
      }

      // Verify token with Supabase Auth
      const { data, error } = await supabaseAdmin.auth.verifyOtp({
        token_hash: command.token,
        type: command.type,
      });

      if (error || !data.user) {
        return AuthResponse.failure("Invalid or expired verification token");
      }

      // Find user by auth UID
      const user = await this.userRepository.findByAuthUid(data.user.id);
      if (!user) {
        return AuthResponse.failure("User not found");
      }

      // Email verification is now confirmed in Supabase Auth
      // No need to update public.users table

      return AuthResponse.success(
        user,
        "",
        "Email verified successfully. You can now sign in."
      );
    } catch (error) {
      return AuthResponse.failure("Failed to verify email", [
        error instanceof Error ? error.message : "Unknown error",
      ]);
    }
  }

  async resendVerification(
    command: ResendVerificationCommand
  ): Promise<AuthResponse> {
    try {
      const validationErrors = this.validateCommand(command);
      if (validationErrors.length > 0) {
        return AuthResponse.failure("Validation failed", validationErrors);
      }

      const user = await this.userRepository.findByEmail(command.email);
      if (!user) {
        // Security: Don't reveal email existence
        return AuthResponse.success(
          undefined as any,
          "",
          "If the email exists, a verification link has been sent."
        );
      }

      // Check if already verified in Supabase Auth
      const { data: authUser, error } =
        await supabaseAdmin.auth.admin.getUserById(user.authUid);
      if (error) {
        return AuthResponse.failure("Failed to check verification status");
      }

      if (authUser.user?.email_confirmed_at) {
        return AuthResponse.failure("Email is already verified");
      }

      // Resend verification email via Supabase
      const { error: resendError } = await supabaseAdmin.auth.resend({
        type: "signup",
        email: command.email,
        options: {
          emailRedirectTo: process.env.EMAIL_REDIRECT_URL || 'http://127.0.0.1:3002/src/pages/EmailVerified.html'
        }
      });

      if (resendError) {
        return AuthResponse.failure("Failed to send verification email", [
          resendError.message,
        ]);
      }

      return AuthResponse.success(
        undefined as any,
        "",
        "Verification email sent successfully. Please check your inbox."
      );
    } catch (error) {
      return AuthResponse.failure("Failed to resend verification email", [
        error instanceof Error ? error.message : "Unknown error",
      ]);
    }
  }
}
