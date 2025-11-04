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
   * @param limit - Number of products to return
   * @param onlyFeatured - If true, only return products with is_featured = TRUE
   */
  async getFeaturedProducts(limit: number = 10, onlyFeatured: boolean = false): Promise<{
    success: boolean;
    products: Product[];
    message?: string;
  }> {
    try {
      // Build URL based on onlyFeatured flag
      let url = `/api/v1/products?limit=${limit}`;
      if (onlyFeatured) {
        url += '&featured=true';
      }

      const response = await httpClient.get<SearchResponse>(url);

      console.log('Featured products API Response:', response); // Debug log

      if (response.success) {
        // Parse nested structure: response.data.data or response.data
        let results = [];
        
        if (response.data && Array.isArray((response.data as any).data)) {
          // Case 1: { success: true, data: { data: [...] } }
          results = (response.data as any).data;
        } else if (response.data && Array.isArray(response.data)) {
          // Case 2: { success: true, data: [...] }
          results = response.data;
        } else if (Array.isArray((response as any).data)) {
          // Case 3: { data: [...] }
          results = (response as any).data;
        }
        
        console.log('📦 Parsed results:', results); // Debug
        
        const products = results.map((item: any) => 
          Product.fromApiResponse(item)
        );

        return {
          success: true,
          products,
          message: (response.data as any)?.message || response.message || 'Loaded featured products'
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

  /**
   * ✅ Get best-selling products (most purchased from delivered orders)
   * For HomePage default display when user not logged in or no purchase history
   * 
   * @param limit - Maximum number of products to return (default: 8)
   */
  async getBestSellingProducts(limit: number = 8): Promise<{
    success: boolean;
    products: Product[];
    message?: string;
  }> {
    try {
      console.log(`🔥 Getting top ${limit} best-selling products...`);

      const response = await httpClient.get<SearchResponse>(
        `/api/v1/products/best-selling?limit=${limit}`
      );

      console.log('Best-selling products API Response:', response);

      if (response.success) {
        const apiData = (response.data as any) || response;
        const results = (apiData.results || (response as any).results || []);
        
        const products = results.map((item: any) => 
          Product.fromApiResponse(item)
        );

        return {
          success: true,
          products,
          message: apiData.message || (response as any).message || 'Sản phẩm bán chạy nhất'
        };
      }

      // Fallback to featured products
      console.warn('Best-selling failed, falling back to featured products');
      return this.getFeaturedProducts(limit);

    } catch (error) {
      console.error('Get best-selling products error:', error);
      // Fallback to featured products on error
      return this.getFeaturedProducts(limit);
    }
  }

  /**
   * ✅ RECOMMENDATION SYSTEM
   * Get recommended products based on user's purchase history
   * For HomePage - recommends products from categories user has bought before
   * 
   * @param userId - User ID to get recommendations for
   * @param limit - Maximum number of products to return (default: 10)
   */
  async getRecommendedProductsForUser(userId: number, limit: number = 10): Promise<{
    success: boolean;
    products: Product[];
    message?: string;
  }> {
    try {
      console.log(`🔍 Getting recommendations for user ${userId}`);

      const response = await httpClient.get<SearchResponse>(
        `/api/v1/products/recommendations/user/${userId}?limit=${limit}`
      );

      console.log('User recommendations API Response:', response);

      if (response.success) {
        const apiData = (response.data as any) || response;
        const results = (apiData.results || (response as any).results || []);
        
        const products = results.map((item: any) => 
          Product.fromApiResponse(item)
        );

        return {
          success: true,
          products,
          message: apiData.message || (response as any).message || 'Gợi ý dựa trên lịch sử mua hàng'
        };
      }

      // Fallback to featured products if recommendation fails
      console.warn('Recommendation failed, falling back to featured products');
      return this.getFeaturedProducts(limit);

    } catch (error) {
      console.error('Get recommended products for user error:', error);
      // Fallback to featured products on error
      return this.getFeaturedProducts(limit);
    }
  }

  /**
   * ✅ RECOMMENDATION SYSTEM
   * Get recommended products based on current product (same category)
   * For ProductDetail page - recommends similar products from same category
   * 
   * @param productId - Current product ID
   * @param limit - Maximum number of products to return (default: 6)
   */
  async getRecommendedProductsByProduct(productId: number, limit: number = 6): Promise<{
    success: boolean;
    products: Product[];
    message?: string;
  }> {
    try {
      console.log(`🔍 Getting similar products for product ${productId}`);

      const response = await httpClient.get<SearchResponse>(
        `/api/v1/products/recommendations/similar/${productId}?limit=${limit}`
      );

      console.log('Similar products API Response:', response);

      if (response.success) {
        const apiData = (response.data as any) || response;
        const results = (apiData.results || (response as any).results || []);
        
        const products = results.map((item: any) => 
          Product.fromApiResponse(item)
        );

        return {
          success: true,
          products,
          message: apiData.message || (response as any).message || 'Sản phẩm tương tự'
        };
      }

      // Fallback to featured products if recommendation fails
      console.warn('Similar products not found, falling back to featured products');
      return this.getFeaturedProducts(limit);

    } catch (error) {
      console.error('Get recommended products by product error:', error);
      // Fallback to featured products on error
      return this.getFeaturedProducts(limit);
    }
  }

  /**
   * Get new products (is_new = true)
   * For "Mới nhất" filter on homepage
   */
  async getNewProducts(limit: number = 12): Promise<{
    success: boolean;
    products: Product[];
    message?: string;
  }> {
    try {
      console.log(`🔍 Getting new products (limit: ${limit})`);

      const response = await httpClient.get<SearchResponse>(
        `/api/v1/products/new?limit=${limit}`
      );

      console.log('New products API Response:', response);

      if (response.success) {
        const apiData = (response.data as any) || response;
        const results = (apiData.results || (response as any).results || []);
        
        const products = results.map((item: any) => 
          Product.fromApiResponse(item)
        );

        return {
          success: true,
          products,
          message: apiData.message || (response as any).message || 'Sản phẩm mới nhất'
        };
      }

      return {
        success: false,
        products: [],
        message: response.message || 'Không tìm thấy sản phẩm mới'
      };

    } catch (error) {
      console.error('Get new products error:', error);
      return {
        success: false,
        products: [],
        message: 'Có lỗi xảy ra khi lấy sản phẩm mới'
      };
    }
  }

  /**
   * Get bestseller products (is_bestseller = true)
   * For "Phổ biến" filter on homepage
   */
  async getBestsellerProducts(limit: number = 12): Promise<{
    success: boolean;
    products: Product[];
    message?: string;
  }> {
    try {
      console.log(`🔍 Getting bestseller products (limit: ${limit})`);

      const response = await httpClient.get<SearchResponse>(
        `/api/v1/products/bestseller?limit=${limit}`
      );

      console.log('Bestseller products API Response:', response);

      if (response.success) {
        const apiData = (response.data as any) || response;
        const results = (apiData.results || (response as any).results || []);
        
        const products = results.map((item: any) => 
          Product.fromApiResponse(item)
        );

        return {
          success: true,
          products,
          message: apiData.message || (response as any).message || 'Sản phẩm phổ biến'
        };
      }

      return {
        success: false,
        products: [],
        message: response.message || 'Không tìm thấy sản phẩm phổ biến'
      };

    } catch (error) {
      console.error('Get bestseller products error:', error);
      return {
        success: false,
        products: [],
        message: 'Có lỗi xảy ra khi lấy sản phẩm phổ biến'
      };
    }
  }
}

// Export singleton instance
export const productService = new ProductService();
