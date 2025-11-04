import { supabase } from '../../../config/database';
import { logger } from '../../../config/logger';
import { SearchQuery, ProductSearchResult } from '../domain/Product';

/**
 * Product Search Service - UC3 Search functionality
 * Handles product search and autocomplete
 * Application Layer - Use Case: Product Search
 */
export class ProductSearchService {
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

        // Generate slug if missing
        const slug = item.product_slug || 
                     item.product_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
                     `product-${item.product_id}`;
        
        return {
          id: item.product_id?.toString() || '',
          name: item.product_name || '',
          slug: slug,
          description: item.short_description || item.description || '',
          price: parseFloat(item.price) || 0,
          image_url: imageUrl,
          product_url: `/src/pages/ProductDetail.html?slug=${slug}`,
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
}
