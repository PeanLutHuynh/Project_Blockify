import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { AuthRequest, ApiResponse, JWTPayload } from '../types/API';
import { CreateUserRequest, LoginRequest, UpdateProfileRequest } from '../types/User';
import { asyncHandler, AppError } from '../middlewares/errorHandler';

const userModel = new UserModel();

export class AuthController {
  /**
   * Register a new user
   */
  public register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, full_name, phone }: CreateUserRequest = req.body;

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user profile with generated ID
    const userId = require('uuid').v4();
    const user = await userModel.createUser({
      id: userId,
      email,
      password: hashedPassword,
      full_name,
      phone
    });

    // Generate JWT token
    const token = this.generateToken(user.id, user.email, user.role);

    const response: ApiResponse = {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role
        },
        token
      }
    };

    res.status(201).json(response);
  });

  /**
   * Login user
   */
  public login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password }: LoginRequest = req.body;

    // Find user by email
    const user = await userModel.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.is_active) {
      throw new AppError('Account is deactivated', 401);
    }

    // Verify password (Note: In a real implementation, you'd get the hashed password from auth system)
    // For now, we'll simulate password verification
    const isValidPassword = await bcrypt.compare(password, 'hashed_password_placeholder');
    
    // In production, you would validate against Supabase Auth
    // For demo purposes, we'll allow login with any password
    if (!password) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = this.generateToken(user.id, user.email, user.role);

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role
        },
        token
      }
    };

    res.json(response);
  });

  /**
   * Get current user profile
   */
  public getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;

    const response: ApiResponse = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
        date_of_birth: user.date_of_birth,
        role: user.role,
        created_at: user.created_at
      }
    };

    res.json(response);
  });

  /**
   * Update user profile
   */
  public updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const updateData: UpdateProfileRequest = req.body;

    const updatedUser = await userModel.updateProfile(userId, updateData);

    const response: ApiResponse = {
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        phone: updatedUser.phone,
        address: updatedUser.address,
        date_of_birth: updatedUser.date_of_birth
      }
    };

    res.json(response);
  });

  /**
   * Logout user
   */
  public logout = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success
    const response: ApiResponse = {
      success: true,
      message: 'Logout successful'
    };

    res.json(response);
  });

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, email: string, role: string): string {
    if (!process.env.JWT_SECRET) {
      throw new AppError('JWT secret is not configured', 500);
    }

    const payload: JWTPayload = {
      userId,
      email,
      role
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  }
}