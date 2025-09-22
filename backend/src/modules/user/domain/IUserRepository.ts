import { User } from '../domain/User';
import { IRepository } from '../../../shared/domain/IRepository';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findActiveUsers(): Promise<User[]>;
}