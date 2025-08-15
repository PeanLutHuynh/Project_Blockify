import { SupabaseClient } from '@supabase/supabase-js';
import SupabaseService from '../database/supabase';
import { PaginationParams, PaginationInfo } from '../types/API';

export abstract class BaseModel {
  protected supabase: SupabaseClient;
  protected tableName: string;

  constructor(tableName: string) {
    this.supabase = SupabaseService.getInstance().getClient();
    this.tableName = tableName;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string, select: string = '*'): Promise<any> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(select)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Error finding record: ${error.message}`);
    }

    return data;
  }

  /**
   * Find all records with optional filters
   */
  async findAll(
    filters: Record<string, any> = {},
    select: string = '*',
    pagination?: PaginationParams
  ): Promise<{ data: any[]; pagination?: PaginationInfo }> {
    let query = this.supabase.from(this.tableName).select(select, { count: 'exact' });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    // Apply pagination
    if (pagination) {
      const { page = 1, limit = 10 } = pagination;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Error finding records: ${error.message}`);
    }

    const result: { data: any[]; pagination?: PaginationInfo } = { data: data || [] };

    if (pagination && count !== null) {
      const { page = 1, limit = 10 } = pagination;
      const totalPages = Math.ceil(count / limit);
      
      result.pagination = {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
    }

    return result;
  }

  /**
   * Create a new record
   */
  async create(data: Record<string, any>): Promise<any> {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating record: ${error.message}`);
    }

    return created;
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Record<string, any>): Promise<any> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating record: ${error.message}`);
    }

    return updated;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting record: ${error.message}`);
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('id', id)
      .single();

    return !error && !!data;
  }

  /**
   * Count records with optional filters
   */
  async count(filters: Record<string, any> = {}): Promise<number> {
    let query = this.supabase.from(this.tableName).select('*', { count: 'exact', head: true });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { count, error } = await query;

    if (error) {
      throw new Error(`Error counting records: ${error.message}`);
    }

    return count || 0;
  }
}