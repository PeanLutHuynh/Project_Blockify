import { BaseService } from '../../../shared/application/BaseService';
import { User } from '../domain/User';
import { IUserRepository } from '../domain/IUserRepository';

export class UserService extends BaseService<User> {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    super(userRepository);
    this.userRepository = userRepository;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findByUsername(username);
  }

  async createUser(userData: { 
    email: string; 
    username: string;
    fullName: string;
    role: string;
    password?: string;
  }): Promise<User> {
    // Business logic: Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check username if provided
    if (userData.username) {
      const existingUsername = await this.userRepository.findByUsername(userData.username);
      if (existingUsername) {
        throw new Error('User with this username already exists');
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Create new user with proper UserProps
    const userProps = {
      email: userData.email,
      fullName: userData.fullName,
      username: userData.username, // Generate username from email if not provided
      role: userData.role || 'user',
      isActive: true,
      authUid: '' // This will be set by AuthService after creating user in Supabase Auth
    };

    const user = User.create(userProps);
    return await this.userRepository.save(user);
  }

  async updateUserProfile(id: string, fullName: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = user.updateProfile(fullName);
    return await this.userRepository.update(id, updatedUser);
  }

  async deactivateUser(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const deactivatedUser = user.deactivate();
    return await this.userRepository.update(id, deactivatedUser);
  }

  async getActiveUsers(): Promise<User[]> {
    return await this.userRepository.findActiveUsers();
  }

  async updateLastLogin(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = user.updateLastLogin();
    return await this.userRepository.update(id, updatedUser);
  }
}