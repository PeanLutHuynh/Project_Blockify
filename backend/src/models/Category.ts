import { BaseModel } from './BaseModel';
import { Category } from '../types/Product';

export class CategoryModel extends BaseModel {
  constructor() {
    super('categories');
  }

  /**
   * Get all categories with hierarchy
   */
  async getAllCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Error fetching categories: ${error.message}`);
    }

    return this.buildCategoryHierarchy(data || []);
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get root categories (no parent)
   */
  async getRootCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Error fetching root categories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get subcategories of a parent category
   */
  async getSubcategories(parentId: string): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Error fetching subcategories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create category with unique slug
   */
  async createCategory(categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    // Generate slug if not provided
    if (!categoryData.slug) {
      categoryData.slug = this.generateSlug(categoryData.name);
    }

    // Ensure slug is unique
    await this.ensureUniqueSlug(categoryData.slug);

    const category = await this.create({
      ...categoryData,
      is_active: true
    });

    return category;
  }

  /**
   * Build category hierarchy
   */
  private buildCategoryHierarchy(categories: any[]): Category[] {
    const categoryMap = new Map();
    const rootCategories: Category[] = [];

    // First pass: create category objects
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build hierarchy
    categories.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(category);
          category.parent = parent;
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Ensure slug is unique
   */
  private async ensureUniqueSlug(slug: string): Promise<void> {
    const { data } = await this.supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();

    if (data) {
      throw new Error(`Category with slug '${slug}' already exists`);
    }
  }
}