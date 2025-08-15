import { BaseModel } from './BaseModel';
import { User, CreateUserRequest, UpdateProfileRequest } from '../types/User';
import bcrypt from 'bcryptjs';

export class UserModel extends BaseModel {
  constructor() {
    super('user_profiles');
  }

  /**
   * Create a new user profile
   */
  async createUser(userData: CreateUserRequest & { id: string }): Promise<User> {
    const { password, ...profileData } = userData;
    
    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 12) : undefined;

    const user = await this.create({
      ...profileData,
      role: 'customer',
      is_active: true
    });

    return this.transformUser(user);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return null;
    }

    return this.transformUser(data);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, profileData: UpdateProfileRequest): Promise<User> {
    const updated = await this.update(userId, profileData);
    return this.transformUser(updated);
  }

  /**
   * Get user with authentication data
   */
  async getUserWithAuth(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(`
        *,
        auth_users:auth.users!inner(
          email,
          email_confirmed_at,
          last_sign_in_at
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }

    return data;
  }

  /**
   * Check if user has role
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    const user = await this.findById(userId, 'role');
    return user?.role === role;
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (name, images)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching user orders: ${error.message}`);
    }

    return data;
  }

  /**
   * Transform database user to API user
   */
  private transformUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      address: user.address,
      date_of_birth: user.date_of_birth,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  }
}