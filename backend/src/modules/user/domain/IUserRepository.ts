import { User } from '../domain/User';
import { IRepository } from '../../../shared/domain/IRepository';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByAuthUid(authUid: string): Promise<User | null>;
  findActiveUsers(): Promise<User[]>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
}