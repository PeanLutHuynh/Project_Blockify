import { supabase } from '../../../config/database';
import { logger } from '../../../config/logger';
import { Product, SearchQuery, ProductSearchResult } from '../domain/Product';

/**
 * Product Service - Business logic layer
 * Handles product search and management using Supabase
 */
export class ProductService {
  /**
   * UC3 - Thanh tìm kiếm
   * Tìm kiếm sản phẩm theo từ khóa (không phân biệt hoa thường)
   * Sử dụng Supabase .ilike() theo yêu cầu
   */
  async searchProducts(searchQuery: SearchQuery): Promise<ProductSearchResult[]> {
    const { query, limit = 10, category } = searchQuery;

    try {
      // LUỒNG THAY THẾ A1: Validate query
      if (!query || query.trim().length < 2) {
        logger.warn('Search query too short or empty');
        return [];
      }

      // Normalize query
      const normalizedQuery = query.trim();

      // LUỒNG CHÍNH Bước 3: Hệ thống truy vấn dữ liệu
      // Chỉ tìm kiếm trong product_name theo yêu cầu
      let dbQuery = supabase
        .from('products')
        .select(`
          product_id,
          product_name,
          description,
          short_description,
          price,
          product_slug,
          category_id,
          stock_quantity,
          product_images(image_url, is_primary)
        `)
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .ilike('product_name', `%${normalizedQuery}%`);

      // Add category filter if provided
      if (category) {
        dbQuery = dbQuery.eq('category_id', category);
      }

      // Execute query (no ordering here, will sort by relevance later)
      const { data, error } = await dbQuery.limit(100); // Get more to sort by relevance

      if (error) {
        logger.error('Supabase search error:', error);
        throw error;
      }

      // Transform and sort by relevance
      const allResults = (data || []).map((item: any) => {
        // Get primary image or first image
        const images = item.product_images || [];
        const primaryImage = images.find((img: any) => img.is_primary);
        const imageUrl = primaryImage?.image_url || images[0]?.image_url || '/public/images/placeholder.jpg';

        // Calculate relevance score
        const productName = (item.product_name || '').toLowerCase();
        const shortDesc = (item.short_description || '').toLowerCase();
        const fullDesc = (item.description || '').toLowerCase();
        const searchTerm = normalizedQuery.toLowerCase();
        
        // Higher score = more relevant
        let relevanceScore = 0;
        
        // Check product_name first (highest priority)
        if (productName.includes(searchTerm)) {
          if (productName === searchTerm) {
            relevanceScore = 100; // Exact match
          } else if (productName.startsWith(searchTerm)) {
            relevanceScore = 90; // Starts with keyword
          } else {
            relevanceScore = 80; // Contains keyword
          }
        }
        // Check short_description (medium priority)
        else if (shortDesc.includes(searchTerm)) {
          relevanceScore = 40;
        }
        // Check full description (lowest priority)
        else if (fullDesc.includes(searchTerm)) {
          relevanceScore = 30;
        }

        return {
          id: item.product_id?.toString() || '',
          name: item.product_name || '',
          description: item.short_description || item.description || '',
          price: parseFloat(item.price) || 0,
          image_url: imageUrl,
          product_url: `/src/pages/ProductDetail.html?slug=${item.product_slug || ''}`,
          category: item.category_id?.toString() || '',
          _relevance: relevanceScore
        };
      });

      // FILTER OUT items with relevance = 0 (no match)
      const matchedResults = allResults.filter((item: any) => item._relevance > 0);

      // Sort by relevance score (descending) then by name
      const sortedResults = matchedResults
        .sort((a: any, b: any) => {
          if (b._relevance !== a._relevance) {
            return b._relevance - a._relevance;
          }
          return a.name.localeCompare(b.name);
        })
        .slice(0, limit);

      // Remove _relevance field before returning
      const results = sortedResults.map(({ _relevance, ...rest }: any) => rest);

      // LUỒNG CHÍNH Bước 4: Trả về kết quả
      logger.info(`Search "${query}" returned ${results.length} results`);
      return results;

    } catch (error) {
      // LUỒNG THAY THẾ A3: Lỗi hệ thống
      logger.error('Search products error:', error);
      throw error;
    }
  }

  /**
   * Get suggestions for autocomplete (limited results)
   */
  async getSuggestions(query: string, limit: number = 5): Promise<ProductSearchResult[]> {
    return this.searchProducts({ query, limit });
  }

  /**
   * Get all products (for admin)
   */
  async getAllProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Get all products error:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Get product by ID error:', error);
      return null;
    }
  }

  /**
   * Get product by slug (for product detail page)
   */
  async getProductBySlug(slug: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images(
            image_id,
            image_url,
            alt_text,
            is_primary,
            sort_order
          ),
          categories(
            category_id,
            category_name,
            category_slug
          )
        `)
        .eq('product_slug', slug)
        .eq('status', 'active')
        .single();

      if (error) {
        logger.error('Get product by slug error:', error);
        return null;
      }

      // Sort images by sort_order
      if (data && data.product_images) {
        data.product_images.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      }

      return data;
    } catch (error) {
      logger.error('Get product by slug error:', error);
      return null;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<ProductSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          product_id,
          product_name,
          description,
          short_description,
          price,
          product_slug,
          category_id,
          stock_quantity,
          product_images(image_url, is_primary)
        `)
        .eq('category_id', category)
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .order('product_name');

      if (error) throw error;
      
      // Transform data
      const results = (data || []).map((item: any) => {
        const images = item.product_images || [];
        const primaryImage = images.find((img: any) => img.is_primary);
        const imageUrl = primaryImage?.image_url || images[0]?.image_url || '/public/images/placeholder.jpg';

        return {
          id: item.product_id?.toString() || '',
          name: item.product_name || '',
          description: item.short_description || item.description || '',
          price: parseFloat(item.price) || 0,
          image_url: imageUrl,
          product_url: `/src/pages/ProductDetail.html?slug=${item.product_slug || ''}`,
          category: item.category_id?.toString() || ''
        };
      });
      
      return results;
    } catch (error) {
      logger.error('Get products by category error:', error);
      throw error;
    }
  }

  /**
   * Get featured products for home page
   */
  async getFeaturedProducts(limit: number = 10, onlyFeatured: boolean = false): Promise<ProductSearchResult[]> {
    try {
      let query = supabase
        .from('products')
        .select(`
          product_id,
          product_name,
          description,
          short_description,
          price,
          product_slug,
          category_id,
          stock_quantity,
          is_featured,
          is_bestseller,
          is_new,
          product_images(image_url, is_primary)
        `)
        .eq('status', 'active')
        .gt('stock_quantity', 0);

      // Filter by featured if requested
      if (onlyFeatured) {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query
        .order('is_featured', { ascending: false })
        .order('is_bestseller', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform data
      const results = (data || []).map((item: any) => {
        const images = item.product_images || [];
        const primaryImage = images.find((img: any) => img.is_primary);
        const imageUrl = primaryImage?.image_url || images[0]?.image_url || '/public/images/placeholder.jpg';

        return {
          id: item.product_id?.toString() || '',
          name: item.product_name || '',
          description: item.short_description || item.description || '',
          price: parseFloat(item.price) || 0,
          image_url: imageUrl,
          product_url: `/src/pages/ProductDetail.html?slug=${item.product_slug || ''}`,
          category: item.category_id?.toString() || ''
        };
      });

      return results;
    } catch (error) {
      logger.error('Get featured products error:', error);
      throw error;
    }
  }
}
