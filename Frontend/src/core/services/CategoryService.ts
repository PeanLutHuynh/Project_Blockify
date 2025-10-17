import { httpClient } from '../api/FetchHttpClient.js';

/**
 * Category Interface
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  url: string;
}

/**
 * CategoryService - Handles category-related API operations
 */
export class CategoryService {
  /**
   * Get all active categories
   */
  async getCategories(): Promise<{
    success: boolean;
    categories: Category[];
    message?: string;
  }> {
    try {
      const response = await httpClient.get<{success: boolean; data: Category[]; count: number}>(
        '/api/v1/categories'
      );

      console.log('Categories API Response:', response); // Debug log

      if (response.success && response.data) {
        const apiData = response.data as any;
        const categories = apiData.data || apiData || [];

        return {
          success: true,
          categories,
          message: `Loaded ${categories.length} categories`
        };
      }

      return {
        success: false,
        categories: [],
        message: response.message || 'Không thể lấy danh mục'
      };

    } catch (error) {
      console.error('Get categories error:', error);
      return {
        success: false,
        categories: [],
        message: 'Có lỗi xảy ra khi lấy danh mục'
      };
    }
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
