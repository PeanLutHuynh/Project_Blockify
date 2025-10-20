import { supabase } from '../../../config/database';
import { logger } from '../../../config/logger';
import { Product, ProductSearchResult } from '../domain/Product';

/**
 * Product Query Service - Core product queries
 * Handles basic CRUD and retrieval operations
 * Application Layer - Use Case: Product Queries
 */
export class ProductQueryService {
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
            alt_img1,
            alt_img2,
            alt_img3,
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

      // Transform product_images to include all image URLs
      if (data && data.product_images && data.product_images.length > 0) {
        const imageRecord = data.product_images[0];
        const allImages = [];
        
        // Add main image
        if (imageRecord.image_url) {
          allImages.push({
            image_id: imageRecord.image_id,
            image_url: imageRecord.image_url,
            alt_text: imageRecord.alt_text || data.product_name,
            is_primary: true,
            sort_order: 0
          });
        }
        
        // Add alternative images
        [imageRecord.alt_img1, imageRecord.alt_img2, imageRecord.alt_img3].forEach((url, index) => {
          if (url) {
            allImages.push({
              image_id: imageRecord.image_id,
              image_url: url,
              alt_text: `${data.product_name} - Image ${index + 2}`,
              is_primary: false,
              sort_order: index + 1
            });
          }
        });
        
        data.product_images = allImages;
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
          sale_price,
          product_slug,
          category_id,
          stock_quantity,
          rating_average,
          piece_count,
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
          salePrice: item.sale_price ? parseFloat(item.sale_price) : undefined,
          image_url: imageUrl,
          imageUrl: imageUrl,
          rating: item.rating_average || 0,
          pieceCount: item.piece_count || 0,
          product_url: `/src/pages/ProductDetail.html?slug=${slug}`,
          category: item.category_id?.toString() || ''
        };
      });

      return results;
    } catch (error) {
      logger.error('Get featured products error:', error);
      throw error;
    }
  }

  /**
   * Get products with pagination and optional category filter
   * For HomePage with filter + pagination functionality
   */
  async getProducts(categoryId?: number, page: number = 1, limit: number = 12): Promise<{
    data: ProductSearchResult[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      // Calculate offset
      const offset = (page - 1) * limit;

      // Build query
      let query = supabase
        .from('products')
        .select(`
          product_id,
          product_name,
          description,
          short_description,
          price,
          sale_price,
          product_slug,
          category_id,
          stock_quantity,
          rating_average,
          piece_count,
          product_images(image_url, is_primary)
        `, { count: 'exact' })
        .eq('status', 'active')
        .gt('stock_quantity', 0);

      // Add category filter if provided
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      // Execute query with pagination
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Transform data
      const results = (data || []).map((item: any) => {
        const images = item.product_images || [];
        const primaryImage = images.find((img: any) => img.is_primary);
        const imageUrl = primaryImage?.image_url || images[0]?.image_url || '/public/images/placeholder.jpg';

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
          salePrice: item.sale_price ? parseFloat(item.sale_price) : undefined,
          image_url: imageUrl,
          imageUrl: imageUrl,
          rating: item.rating_average || 0,
          pieceCount: item.piece_count || 0,
          product_url: `/src/pages/ProductDetail.html?slug=${slug}`,
          category: item.category_id?.toString() || ''
        };
      });

      // Calculate pagination
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: results,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Get products with pagination error:', error);
      throw error;
    }
  }
}
