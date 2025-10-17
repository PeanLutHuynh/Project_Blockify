import { httpClient } from '../api/FetchHttpClient.js';
import { Product } from '../models/Product.js';

/**
 * Search Response Interface
 */
interface SearchResponse {
  success: boolean;
  message?: string;
  results: any[];
  count?: number;
}

/**
 * ProductService - Handles product-related API operations
 * Follows service layer pattern in MVC architecture
 * Uses custom Fetch HTTP client wrapper
 */
export class ProductService {
  /**
   * UC3 - Thanh tìm kiếm
   * Search products by keyword
   */
  async searchProducts(query: string): Promise<{
    success: boolean;
    products: Product[];
    message?: string;
  }> {
    try {
      // Validate query
      if (!query || query.trim().length < 2) {
        return {
          success: false,
          products: [],
          message: 'Vui lòng nhập ít nhất 2 ký tự'
        };
      }

      // Call API using httpClient
      const response = await httpClient.get<SearchResponse>(
        `/api/v1/products/suggestions?q=${encodeURIComponent(query.trim())}`
      );

      console.log('Search API Response:', response); // Debug log

      // Handle response structure
      // Backend API returns: {success: true, results: [...], message: "..."}
      // FetchHttpClient returns it as-is (no extra wrapping)
      
      if (response.success) {
        // Check if results are in data property or root level
        const apiData = (response.data as any) || response;
        const results = (apiData.results || (response as any).results || []);
        
        console.log('Results found:', results.length); // Debug log
        
        // Convert API response to Product objects
        const products = results.map((item: any) => 
          Product.fromApiResponse(item)
        );

        return {
          success: true,
          products,
          message: apiData.message || (response as any).message
        };
      }

      return {
        success: false,
        products: [],
        message: response.message || 'Không thể tìm kiếm sản phẩm'
      };

    } catch (error) {
      console.error('Search products error:', error);
      return {
        success: false,
        products: [],
        message: 'Có lỗi xảy ra, vui lòng thử lại sau'
      };
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<{
    success: boolean;
    product?: Product;
    message?: string;
  }> {
    try {
      const response = await httpClient.get<any>(
        `/api/v1/products/${id}`
      );

      if (response.success && response.data) {
        const product = Product.fromApiResponse(response.data);
        return {
          success: true,
          product,
          message: response.message
        };
      }

      return {
        success: false,
        message: response.message || 'Không tìm thấy sản phẩm'
      };

    } catch (error) {
      console.error('Get product error:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra'
      };
    }
  }

  /**
   * Get product by slug (for product detail page)
   */
  async getProductBySlug(slug: string): Promise<{
    success: boolean;
    product?: any;
    message?: string;
  }> {
    try {
      const response = await httpClient.get<any>(
        `/api/v1/products/slug/${encodeURIComponent(slug)}`
      );

      if (response.success && response.data) {
        return {
          success: true,
          product: response.data,
          message: response.message
        };
      }

      return {
        success: false,
        message: response.message || 'Không tìm thấy sản phẩm'
      };

    } catch (error) {
      console.error('Get product by slug error:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra'
      };
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<{
    success: boolean;
    products: Product[];
    message?: string;
  }> {
    try {
      const response = await httpClient.get<SearchResponse>(
        `/api/v1/products/category/${encodeURIComponent(category)}`
      );

      console.log('Category API Response:', response); // Debug log

      if (response.success) {
        // Handle response structure - backend returns results at root level
        const apiData = (response.data as any) || response;
        const results = (apiData.results || (response as any).results || []);
        
        console.log('Category results found:', results.length); // Debug log
        
        const products = results.map((item: any) => 
          Product.fromApiResponse(item)
        );

        return {
          success: true,
          products,
          message: apiData.message || (response as any).message
        };
      }

      return {
        success: false,
        products: [],
        message: response.message || 'Không thể lấy sản phẩm'
      };

    } catch (error) {
      console.error('Get products by category error:', error);
      return {
        success: false,
        products: [],
        message: 'Có lỗi xảy ra'
      };
    }
  }

  /**
   * Get featured products for home page
   * Uses search with "lego" keyword to get all products
   */
  async getFeaturedProducts(limit: number = 10): Promise<{
    success: boolean;
    products: Product[];
    message?: string;
  }> {
    try {
      // Use search with common keyword to get products
      const response = await httpClient.get<SearchResponse>(
        `/api/v1/products/search?q=lego&limit=${limit}`
      );

      console.log('Featured products API Response:', response); // Debug log

      if (response.success) {
        const apiData = (response.data as any) || response;
        const results = (apiData.results || (response as any).results || []);
        
        const products = results.map((item: any) => 
          Product.fromApiResponse(item)
        );

        return {
          success: true,
          products,
          message: apiData.message || (response as any).message
        };
      }

      return {
        success: false,
        products: [],
        message: response.message || 'Không thể lấy sản phẩm nổi bật'
      };

    } catch (error) {
      console.error('Get featured products error:', error);
      return {
        success: false,
        products: [],
        message: 'Có lỗi xảy ra'
      };
    }
  }
}

// Export singleton instance
export const productService = new ProductService();
