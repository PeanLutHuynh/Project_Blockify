import { supabase } from '../../../config/database';
import { logger } from '../../../config/logger';
import { ProductSearchResult } from '../domain/Product';
import { ProductQueryService } from './ProductQueryService';

/**
 * Product Recommendation Service - Recommendation System
 * Handles personalized recommendations and best-selling products
 * Application Layer - Use Case: Product Recommendations
 */
export class ProductRecommendationService {
  private productQueryService: ProductQueryService;

  constructor() {
    this.productQueryService = new ProductQueryService();
  }

  /**
   * ✅ Get best-selling products (most purchased from delivered orders)
   * For HomePage default display when user not logged in or no purchase history
   */
  async getBestSellingProducts(limit: number = 8): Promise<ProductSearchResult[]> {
    try {
      logger.info(`Getting ${limit} best-selling products...`);

      // Query to get products with most delivered orders
      // Using order_items joined with orders to count delivered orders per product
      const { data: orderStats, error: statsError } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          orders!inner(status)
        `)
        .eq('orders.status', 'Đã giao');

      if (statsError) {
        logger.error('Error fetching order stats:', statsError);
        // Fallback to featured products
        return this.productQueryService.getFeaturedProducts(limit);
      }

      // Calculate total quantity sold for each product
      const productSales: { [key: number]: number } = {};
      (orderStats || []).forEach((item: any) => {
        const productId = item.product_id;
        const quantity = item.quantity || 1;
        productSales[productId] = (productSales[productId] || 0) + quantity;
      });

      // Sort products by sales count (descending)
      const sortedProductIds = Object.entries(productSales)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, limit * 2) // Get more to ensure we have enough after filtering
        .map(([productId]) => parseInt(productId));

      if (sortedProductIds.length === 0) {
        logger.warn('No best-selling products found, fallback to featured');
        return this.productQueryService.getFeaturedProducts(limit);
      }

      logger.info(`Found ${sortedProductIds.length} products with sales history`);

      // Fetch full product details
      const { data: products, error: productsError } = await supabase
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
        `)
        .in('product_id', sortedProductIds)
        .eq('status', 'active')
        .gt('stock_quantity', 0);

      if (productsError) {
        logger.error('Error fetching product details:', productsError);
        return this.productQueryService.getFeaturedProducts(limit);
      }

      // Transform and sort by original order (sales count)
      const productMap = new Map(
        (products || []).map((p: any) => [p.product_id, p])
      );

      const sortedProducts = sortedProductIds
        .map(id => productMap.get(id))
        .filter(p => p !== undefined)
        .slice(0, limit);

      const results = sortedProducts.map((item: any) => {
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
          category: item.category_id?.toString() || ''
        };
      });

      logger.info(`Returning ${results.length} best-selling products`);
      return results;

    } catch (error) {
      logger.error('Get best-selling products error:', error);
      // Fallback to featured products on any error
      return this.productQueryService.getFeaturedProducts(limit);
    }
  }

  /**
   * ✅ RECOMMENDATION SYSTEM
   * Get recommended products based on user's purchase history
   * For HomePage - suggests products from categories user has bought before
   * 
   * Logic:
   * - If user has delivered orders → recommend from same categories
   * - If no delivered orders → return best-selling products (8 most purchased)
   * 
   * @param userId - User ID to get recommendations for
   * @param limit - Maximum number of products to return (default: 8)
   */
  async getRecommendedProductsForUser(userId: number, limit: number = 8): Promise<ProductSearchResult[]> {
    try {
      logger.info(`Getting recommendations for user ${userId}`);

      // Step 1: Get user's DELIVERED orders only (to confirm real purchases)
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          product_id,
          orders!inner(user_id, status)
        `)
        .eq('orders.user_id', userId)
        .eq('orders.status', 'delivered'); // Only delivered orders count

      if (orderError) {
        logger.error('Error fetching order history:', orderError);
        // Fallback to best-selling products if error
        logger.info('Fallback to best-selling products');
        return this.getBestSellingProducts(limit);
      }

      if (!orderItems || orderItems.length === 0) {
        logger.info('No delivered orders, returning best-selling products');
        return this.getBestSellingProducts(limit);
      }

      // Step 2: Get product IDs user has purchased
      const purchasedProductIds = orderItems.map((item: any) => item.product_id);

      // Step 3: Get categories from purchased products
      const { data: purchasedProducts, error: productsError } = await supabase
        .from('products')
        .select('category_id')
        .in('product_id', purchasedProductIds);

      if (productsError || !purchasedProducts) {
        logger.error('Error fetching purchased products:', productsError);
        return this.getBestSellingProducts(limit);
      }

      // Get unique category IDs
      const categoryIds = [...new Set(purchasedProducts.map((p: any) => p.category_id))];

      if (categoryIds.length === 0) {
        logger.info('No categories found, fallback to best-selling');
        return this.getBestSellingProducts(limit);
      }

      logger.info(`User purchased from ${categoryIds.length} categories:`, categoryIds);

      // Step 4: Get recommended products from same categories (excluding already purchased)
      const { data: recommendedProducts, error: recError } = await supabase
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
          is_bestseller,
          is_new,
          product_images(image_url, is_primary)
        `)
        .in('category_id', categoryIds)
        .not('product_id', 'in', `(${purchasedProductIds.join(',')})`) // Exclude purchased products
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .order('is_bestseller', { ascending: false })
        .order('rating_average', { ascending: false })
        .limit(limit * 2); // Get more to randomize

      if (recError) {
        logger.error('Error fetching recommended products:', recError);
        return this.getBestSellingProducts(limit);
      }

      if (!recommendedProducts || recommendedProducts.length === 0) {
        logger.info('No recommendations found in user categories, fallback to best-selling');
        return this.getBestSellingProducts(limit);
      }

      // Transform and shuffle results
      const transformed = (recommendedProducts || []).map((item: any) => {
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
          category: item.category_id?.toString() || ''
        };
      });

      // Shuffle and limit
      const shuffled = transformed.sort(() => Math.random() - 0.5);
      const results = shuffled.slice(0, limit);

      logger.info(`Returning ${results.length} recommended products`);
      return results;

    } catch (error) {
      logger.error('Get recommended products for user error:', error);
      // Fallback to best-selling products on error
      return this.getBestSellingProducts(limit);
    }
  }

  /**
   * ✅ RECOMMENDATION SYSTEM
   * Get recommended products based on current product (same category)
   * For ProductDetail page - suggests similar products from same category
   * 
   * @param productId - Current product ID
   * @param limit - Maximum number of products to return (default: 6)
   */
  async getRecommendedProductsByCategory(productId: number, limit: number = 6): Promise<ProductSearchResult[]> {
    try {
      logger.info(`Getting recommendations for product ${productId}`);

      // Step 1: Get current product's category
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('category_id')
        .eq('product_id', productId)
        .single();

      if (productError || !currentProduct) {
        logger.error('Error fetching current product:', productError);
        return this.productQueryService.getFeaturedProducts(limit);
      }

      const categoryId = currentProduct.category_id;
      logger.info(`Current product category: ${categoryId}`);

      // Step 2: Get similar products from same category (excluding current product)
      const { data: similarProducts, error: similarError } = await supabase
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
          is_bestseller,
          is_new,
          product_images(image_url, is_primary)
        `)
        .eq('category_id', categoryId)
        .neq('product_id', productId) // Exclude current product
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .order('is_bestseller', { ascending: false })
        .order('rating_average', { ascending: false })
        .order('sold_count', { ascending: false })
        .limit(limit);

      if (similarError) {
        logger.error('Error fetching similar products:', similarError);
        return this.productQueryService.getFeaturedProducts(limit);
      }

      if (!similarProducts || similarProducts.length === 0) {
        logger.info('No similar products found, returning featured products');
        return this.productQueryService.getFeaturedProducts(limit);
      }

      // Transform results
      const results = similarProducts.map((item: any) => {
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
          category: item.category_id?.toString() || ''
        };
      });

      logger.info(`Returning ${results.length} similar products`);
      return results;

    } catch (error) {
      logger.error('Get recommended products by category error:', error);
      return this.productQueryService.getFeaturedProducts(limit);
    }
  }
}
