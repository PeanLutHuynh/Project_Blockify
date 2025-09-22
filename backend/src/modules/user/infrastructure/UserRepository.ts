import { BaseRepository } from '../../../shared/infrastructure/BaseRepository';
import { User } from '../domain/User';
import { IUserRepository } from '../domain/IUserRepository';
import { supabase } from '../../../config/database';

export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor() {
    super('users');
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

  protected mapToEntity(data: any): User {
    return new User({
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    });
  }

  protected mapFromEntity(entity: User | Partial<User>): any {
    const data: any = {};
    
    if ('id' in entity) data.id = entity.id;
    if ('email' in entity) data.email = entity.email;
    if ('name' in entity) data.name = entity.name;
    if ('role' in entity) data.role = entity.role;
    if ('isActive' in entity) data.is_active = entity.isActive;
    if ('createdAt' in entity) data.created_at = entity.createdAt;
    if ('updatedAt' in entity) data.updated_at = entity.updatedAt;

    return data;
  }
}