import { BaseRepository } from '../../../shared/infrastructure/BaseRepository';
import { User } from '../domain/User';
import { IUserRepository } from '../domain/IUserRepository';
import { supabase } from '../../../config/database';

export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor() {
    super('users');
  }

  protected getIdColumn(): string {
    return 'user_id';
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      throw new Error(`Error finding user by email: ${error}`);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      throw new Error(`Error finding user by username: ${error}`);
    }
  }

  async findByAuthUid(authUid: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('auth_uid', authUid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      throw new Error(`Error finding user by auth UID: ${error}`);
    }
  }

  async findActiveUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      throw new Error(`Error finding active users: ${error}`);
    }
  }

  async existsByEmail(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('user_id')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      throw new Error(`Error checking email existence: ${error}`);
    }
  }

  async existsByUsername(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('user_id')
        .eq('username', username)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      throw new Error(`Error checking username existence: ${error}`);
    }
  }

  async updateEmailVerification(userId: string, verified: boolean): Promise<User | null> {
    // Email verification is stored in Supabase Auth (auth.users), not in public.users
    // This method is kept for backward compatibility but should not be used
    // Use Supabase Auth admin.updateUserById() instead
    throw new Error('Email verification should be updated in Supabase Auth, not in public.users table');
  }

  protected mapToEntity(data: any): User {
    return new User({
      id: data.user_id?.toString() || data.id,
      email: data.email,
      fullName: data.full_name,
      username: data.username,
      gender: data.gender,
      phone: data.phone,
      birthDate: data.birth_date ? new Date(data.birth_date) : undefined,
      avatarUrl: data.avatar_url,
      isActive: data.is_active ?? true,
      authUid: data.auth_uid, // Required field
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    });
  }

  protected mapFromEntity(entity: User | Partial<User>): any {
    const data: any = {};
    
    if ('id' in entity && entity.id) {
      const numericId = Number(entity.id);
      if (Number.isFinite(numericId) && numericId > 0) {
        data.user_id = numericId;
      }
      // If non-numeric (e.g., UUID), omit to let DB auto-generate
    }
    if ('email' in entity && entity.email) {
      data.email = typeof entity.email === 'string' ? entity.email : entity.email.getValue();
    }
    if ('fullName' in entity) data.full_name = entity.fullName;
    if ('username' in entity) data.username = entity.username;
    if ('gender' in entity) data.gender = entity.gender;
    if ('phone' in entity) data.phone = entity.phone;
    if ('birthDate' in entity && entity.birthDate) data.birth_date = entity.birthDate.toISOString();
    if ('avatarUrl' in entity) data.avatar_url = entity.avatarUrl;
    if ('isActive' in entity) data.is_active = entity.isActive;
    if ('authUid' in entity) data.auth_uid = entity.authUid; // Required field
    if ('createdAt' in entity && entity.createdAt) data.created_at = entity.createdAt.toISOString();
    if ('updatedAt' in entity && entity.updatedAt) data.updated_at = entity.updatedAt.toISOString();

    return data;
  }
}