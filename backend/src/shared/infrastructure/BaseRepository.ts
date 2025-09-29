import { supabase } from '../../config/database';
import { IRepository } from '../domain/IRepository';

export abstract class BaseRepository<T> implements IRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected getIdColumn(): string {
    return 'id'; // Default column name
  }

  async findById(id: string): Promise<T | null> {
    try {
      const idColumn = this.getIdColumn();
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq(idColumn, id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      throw new Error(`Error finding ${this.tableName} by ID: ${error}`);
    }
  }

  async findAll(): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*');

      if (error) throw error;

      return data.map(item => this.mapToEntity(item));
    } catch (error) {
      throw new Error(`Error finding all ${this.tableName}: ${error}`);
    }
  }

  async save(entity: T): Promise<T> {
    try {
      const data = this.mapFromEntity(entity);
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(result);
    } catch (error) {
      throw new Error(`Error saving ${this.tableName}: ${error}`);
    }
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    try {
      const idColumn = this.getIdColumn();
      const data = this.mapFromEntity(entity);
      const { data: result, error } = await supabase
        .from(this.tableName)
        .update(data)
        .eq(idColumn, id)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(result);
    } catch (error) {
      throw new Error(`Error updating ${this.tableName}: ${error}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const idColumn = this.getIdColumn();
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq(idColumn, id);

      if (error) throw error;

      return true;
    } catch (error) {
      throw new Error(`Error deleting ${this.tableName}: ${error}`);
    }
  }

  protected abstract mapToEntity(data: any): T;
  protected abstract mapFromEntity(entity: T | Partial<T>): any;
}