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

  async createUser(userData: { email: string; name: string; role?: string }): Promise<User> {
    // Business logic: Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Create new user
    const user = User.create(userData);
    return await this.userRepository.save(user);
  }

  async updateUserProfile(id: string, name: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = user.updateProfile(name);
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
}