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
   * Get multiple products by IDs
   * Used for cart stock validation
   */
  async getProductsByIds(ids: number[]): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          product_id,
          product_name,
          price,
          stock_quantity,
          product_images(image_url, is_primary)
        `)
        .in('product_id', ids);

      if (error) throw error;

      // Transform to include image
      return (data || []).map((item: any) => ({
        ...item,
        image: item.product_images?.[0]?.image_url || '/public/images/placeholder.jpg'
      }));
    } catch (error) {
      logger.error('Get products by IDs error:', error);
      return [];
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
          difficulty_level,
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
          category: item.category_id?.toString() || '',
          difficulty_level: item.difficulty_level || null,
          difficultyLevel: item.difficulty_level || null
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
          difficulty_level,
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
          category: item.category_id?.toString() || '',
          difficulty_level: item.difficulty_level || null,
          difficultyLevel: item.difficulty_level || null
        };
      });

      return results;
    } catch (error) {
      logger.error('Get featured products error:', error);
      throw error;
    }
  }

  /**
   * Get products with pagination, filters and sorting
   * For HomePage with filter + pagination functionality
   */
  async getProducts(
    categoryId?: number, 
    page: number = 1, 
    limit: number = 12,
    filters?: {
      difficultyLevel?: string;
      priceRange?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
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
          difficulty_level,
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

      // ✅ Add difficulty filter (khớp với Supabase: Easy, Medium, Hard, Expert)
      if (filters?.difficultyLevel) {
        query = query.eq('difficulty_level', filters.difficultyLevel);
      }

      // ✅ Add price range filter
      if (filters?.priceRange) {
        const [minPrice, maxPrice] = filters.priceRange.split('-').map(Number);
        if (minPrice !== undefined) {
          query = query.gte('price', minPrice);
        }
        if (maxPrice !== undefined) {
          query = query.lte('price', maxPrice);
        }
      }

      // ✅ Add sorting
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'desc';
      const ascending = sortOrder === 'asc';

      // Execute query with pagination and sorting
      const { data, error, count } = await query
        .order(sortBy, { ascending })
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
          category: item.category_id?.toString() || '',
          difficulty_level: item.difficulty_level || null,
          difficultyLevel: item.difficulty_level || null
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

  /**
   * Get new products (is_new = true)
   * For "Mới nhất" filter on homepage
   */
  async getNewProducts(limit: number = 12): Promise<ProductSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          product_id,
          product_name,
          description,
          short_description,
          price,
          sale_price,
          difficulty_level,
          product_slug,
          category_id,
          stock_quantity,
          rating_average,
          piece_count,
          is_new,
          product_images(image_url, is_primary)
        `)
        .eq('status', 'active')
        .eq('is_new', true)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform data
      const results = (data || []).map((item: any) => {
        const images = item.product_images || [];
        const primaryImage = images.find((img: any) => img.is_primary);
        const imageUrl = primaryImage?.image_url || images[0]?.image_url || '/public/images/placeholder.jpg';

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
          category: item.category_id?.toString() || '',
          difficulty_level: item.difficulty_level || null,
          difficultyLevel: item.difficulty_level || null
        };
      });

      return results;
    } catch (error) {
      logger.error('Get new products error:', error);
      throw error;
    }
  }

  /**
   * Get bestseller products (is_bestseller = true)
   * For "Phổ biến" filter on homepage
   */
  async getBestsellerProducts(limit: number = 12): Promise<ProductSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          product_id,
          product_name,
          description,
          short_description,
          price,
          sale_price,
          difficulty_level,
          product_slug,
          category_id,
          stock_quantity,
          rating_average,
          piece_count,
          is_bestseller,
          product_images(image_url, is_primary)
        `)
        .eq('status', 'active')
        .eq('is_bestseller', true)
        .gt('stock_quantity', 0)
        .order('rating_average', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform data
      const results = (data || []).map((item: any) => {
        const images = item.product_images || [];
        const primaryImage = images.find((img: any) => img.is_primary);
        const imageUrl = primaryImage?.image_url || images[0]?.image_url || '/public/images/placeholder.jpg';

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
          category: item.category_id?.toString() || '',
          difficulty_level: item.difficulty_level || null,
          difficultyLevel: item.difficulty_level || null
        };
      });

      return results;
    } catch (error) {
      logger.error('Get bestseller products error:', error);
      throw error;
    }
  }
}
