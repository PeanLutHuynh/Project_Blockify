import bcrypt from 'bcrypt';
import { User } from '../../user/domain/User';
import { IUserRepository } from '../../user/domain/IUserRepository';
import { JWTConfig, JwtPayload } from '../../../config/jwt';
import { SignUpCommand, SignInCommand, GoogleAuthCommand, AuthResponse } from './dto';
import { Email } from '../../user/domain/Email';
import { Password } from '../../user/domain/Password';

export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async signUp(command: SignUpCommand): Promise<AuthResponse> {
    try {
      // Validate command
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return AuthResponse.failure('Validation failed', validationErrors);
      }

      // Check if email already exists
      const existingEmail = await this.userRepository.existsByEmail(command.email);
      if (existingEmail) {
        return AuthResponse.failure('Email already exists');
      }

      // Check if username already exists
      const existingUsername = await this.userRepository.existsByUsername(command.username);
      if (existingUsername) {
        return AuthResponse.failure('Username already exists');
      }

      // Validate email and password using value objects
      let email: Email;
      let password: Password;

      try {
        email = new Email(command.email);
        password = new Password(command.password);
      } catch (error) {
        return AuthResponse.failure(error instanceof Error ? error.message : 'Invalid email or password format');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password.getValue(), saltRounds);

      // Create user
      const user = User.create({
        email: email.getValue(),
        fullName: command.fullName,
        username: command.username,
        passwordHash,
        gender: command.gender,
        emailVerified: false,
        isActive: true
      });

      // Save user
      const savedUser = await this.userRepository.save(user);

      // Generate JWT token
      const tokenPayload: JwtPayload = {
        userId: savedUser.id,
        email: savedUser.email.getValue()
      };
      const token = JWTConfig.generateAccessToken(tokenPayload);

      return AuthResponse.success(savedUser, token, 'Account created successfully');
    } catch (error) {
      return AuthResponse.failure('Failed to create account', [error instanceof Error ? error.message : 'Unknown error']);
    }
  }

  async signIn(command: SignInCommand): Promise<AuthResponse> {
    try {
      // Validate command
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return AuthResponse.failure('Validation failed', validationErrors);
      }

      // Find user by email or username
      let user: User | null;
      if (command.isEmail()) {
        user = await this.userRepository.findByEmail(command.identifier);
      } else {
        user = await this.userRepository.findByUsername(command.identifier);
      }

      if (!user) {
        return AuthResponse.failure('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        return AuthResponse.failure('Account is deactivated');
      }

      // Verify password
      if (!user.passwordHash) {
        return AuthResponse.failure('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(command.password, user.passwordHash);
      if (!isPasswordValid) {
        return AuthResponse.failure('Invalid credentials');
      }

      // Generate JWT token
      const tokenPayload: JwtPayload = {
        userId: user.id,
        email: user.email.getValue()
      };
      const token = JWTConfig.generateAccessToken(tokenPayload);

      return AuthResponse.success(user, token, 'Sign in successful');
    } catch (error) {
      return AuthResponse.failure('Failed to sign in', [error instanceof Error ? error.message : 'Unknown error']);
    }
  }

  async googleAuth(command: GoogleAuthCommand): Promise<AuthResponse> {
    try {
      // Validate command
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return AuthResponse.failure('Validation failed', validationErrors);
      }

      // Check if user already exists by auth UID
      let user = await this.userRepository.findByAuthUid(command.authUid);
      
      if (user) {
        // User exists, update profile if needed
        if (user.fullName !== command.fullName || user.avatarUrl !== command.avatarUrl) {
          // Update user profile
          const updatedUser = new User({
            id: user.id,
            email: user.email,
            fullName: command.fullName,
            username: user.username,
            passwordHash: user.passwordHash,
            gender: user.gender,
            phone: user.phone,
            birthDate: user.birthDate,
            avatarUrl: command.avatarUrl || user.avatarUrl,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            authUid: user.authUid,
            createdAt: user.createdAt,
            updatedAt: new Date()
          });

          user = await this.userRepository.update(updatedUser.id, updatedUser);
        }
      } else {
        // Check if email exists with different auth method
        const existingEmailUser = await this.userRepository.findByEmail(command.email);
        if (existingEmailUser && !existingEmailUser.authUid) {
          return AuthResponse.failure('Email already registered with different authentication method');
        }

        // Create new user from Google
        user = User.createFromGoogle({
          email: command.email,
          fullName: command.fullName,
          authUid: command.authUid
        });

        if (command.avatarUrl) {
          user = user.updateAvatar(command.avatarUrl);
        }

        user = await this.userRepository.save(user);
      }

      // Generate JWT token  
      if (!user) {
        return AuthResponse.failure('Failed to authenticate user');
      }

      const tokenPayload: JwtPayload = {
        userId: user.id,
        email: user.email.getValue()
      };
      const token = JWTConfig.generateAccessToken(tokenPayload);

      return AuthResponse.success(user, token, 'Google authentication successful');
    } catch (error) {
      return AuthResponse.failure('Failed to authenticate with Google', [error instanceof Error ? error.message : 'Unknown error']);
    }
  }

  async verifyToken(token: string): Promise<JwtPayload | null> {
    return JWTConfig.verifyAccessToken(token);
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }
}