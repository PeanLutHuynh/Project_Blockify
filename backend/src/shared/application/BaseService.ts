import { IRepository } from '../domain/IRepository';

export abstract class BaseService<T> {
  protected repository: IRepository<T>;

  constructor(repository: IRepository<T>) {
    this.repository = repository;
  }

  async findById(id: string): Promise<T | null> {
    return await this.repository.findById(id);
  }

  async findAll(): Promise<T[]> {
    return await this.repository.findAll();
  }

  async create(entity: T): Promise<T> {
    return await this.repository.save(entity);
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    return await this.repository.update(id, entity);
  }

  async delete(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }
}