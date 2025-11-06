import { supabaseAdmin } from '../../../config/database';
import { logger } from '../../../config/logger';

/**
 * AdminDashboardService
 * Application Service for Admin Dashboard Analytics
 * Following Clean Architecture - Application Layer
 */

// DTO interfaces
export interface RevenueByPeriod {
  period: string; // YYYY-MM-DD or YYYY-MM
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface OrderStatusStats {
  successCount: number;
  failedCount: number;
  successRate: number;
  failedRate: number;
  totalOrders: number;
}

export interface ConversionRate {
  totalUsers: number;
  usersWithOrders: number;
  conversionRate: number;
  usersWithCart: number;
  cartToOrderRate: number;
  totalOrders: number;
}

export interface PopularCategory {
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  totalSold: number;
  totalRevenue: number;
  productCount: number;
  averageRating: number;
}

export class AdminDashboardService {
  /**
   * 1. Báo cáo doanh thu theo ngày/tháng
   * Get revenue grouped by day or month
   */
  async getRevenueReport(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'month' = 'day'
  ): Promise<RevenueByPeriod[]> {
    try {
      logger.info('📊 Fetching revenue report:', { startDate, endDate, groupBy });

      // Query ALL orders in date range first (like AdminOrderService does)
      // Then filter in memory for revenue calculation
      const { data: allOrders, error } = await supabaseAdmin
        .from('orders')
        .select('ordered_at, total_amount, subtotal, discount_amount, shipping_fee, payment_method, status, payment_status')
        .gte('ordered_at', startDate)
        .lte('ordered_at', endDate)
        .order('ordered_at', { ascending: true });

      if (error) {
        logger.error('❌ Error querying orders:', error);
        throw error;
      }

      logger.info(`📊 Found ${allOrders?.length || 0} total orders in date range`);
      
      // Filter for revenue: Only count delivered orders
      // Note: Revenue = delivered orders regardless of payment status (COD can be paid on delivery)
      const orders = allOrders?.filter(o => o.status === 'Đã giao') || [];
      
      logger.info(`📊 Delivered orders for revenue: ${orders.length}`);

      // DEBUG: Show status breakdown
      if (allOrders && allOrders.length > 0) {
        const statusBreakdown = allOrders.reduce((acc, order) => {
          const status = order.status || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        logger.info('� Status breakdown:', statusBreakdown);
      }
      if (orders && orders.length > 0) {
        logger.info('📋 First order sample:', orders[0]);
        logger.info('📋 Unique statuses in result:', [...new Set(orders.map(o => o.status))]);
        logger.info('📋 Unique payment_statuses in result:', [...new Set(orders.map(o => o.payment_status))]);
      } else {
        logger.warn('⚠️ No orders found with status IN [Đang xử lý, Đang giao, Đã giao] AND payment_status=paid');
        
        // Check orders in date range WITHOUT filters
        // Check 1: Count ALL orders in date range
        const { data: ordersInRange, count: countInRange } = await supabaseAdmin
          .from('orders')
          .select('order_id, status, payment_status, ordered_at, total_amount', { count: 'exact' })
          .gte('ordered_at', startDate)
          .lte('ordered_at', endDate)
          .limit(20);
        
        logger.info(`📋 TOTAL orders in date range (${startDate} to ${endDate}): ${countInRange}`);
        logger.info('📋 Sample orders:', ordersInRange?.slice(0, 5));
        
        if (ordersInRange && ordersInRange.length > 0) {
          const uniqueStatuses = [...new Set(ordersInRange.map(o => o.status))];
          const uniquePaymentStatuses = [...new Set(ordersInRange.map(o => o.payment_status))];
          logger.info('📋 Unique STATUS values found:', uniqueStatuses);
          logger.info('📋 Unique PAYMENT_STATUS values found:', uniquePaymentStatuses);
          
          // Count by status
          const statusCounts = uniqueStatuses.map(s => ({
            status: s,
            count: ordersInRange.filter(o => o.status === s).length
          }));
          logger.info('📋 Count by status:', statusCounts);
          
          // Count by payment_status
          const paymentCounts = uniquePaymentStatuses.map(ps => ({
            payment_status: ps,
            count: ordersInRange.filter(o => o.payment_status === ps).length
          }));
          logger.info('📋 Count by payment_status:', paymentCounts);
        }
      }

      // Group by period
      const revenueMap = new Map<string, {
        totalRevenue: number;
        orderCount: number;
      }>();

      orders?.forEach(order => {
        const date = new Date(order.ordered_at);
        let periodKey: string;

        if (groupBy === 'day') {
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else {
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        }

        const existing = revenueMap.get(periodKey) || { totalRevenue: 0, orderCount: 0 };
        existing.totalRevenue += order.total_amount;
        existing.orderCount += 1;
        revenueMap.set(periodKey, existing);
      });

      // Convert to array and calculate average
      const result: RevenueByPeriod[] = Array.from(revenueMap.entries()).map(([period, data]) => ({
        period,
        totalRevenue: data.totalRevenue,
        orderCount: data.orderCount,
        averageOrderValue: data.totalRevenue / data.orderCount
      }));

      logger.info(`✅ Revenue report generated: ${result.length} periods`);
      return result;
    } catch (error) {
      logger.error('❌ Error fetching revenue report:', error);
      throw error;
    }
  }

  /**
   * 2. Đơn hàng thất bại/thành công
   * Get order success/failure statistics
   */
  async getOrderStatusStats(
    startDate?: string,
    endDate?: string
  ): Promise<OrderStatusStats> {
    try {
      logger.info('📊 Fetching order status stats');

      let query = supabaseAdmin
        .from('orders')
        .select('order_id, status, payment_status, total_amount, ordered_at');

      if (startDate) {
        query = query.gte('ordered_at', startDate);
      }
      if (endDate) {
        query = query.lte('ordered_at', endDate);
      }

      const { data: orders, error } = await query;

      if (error) {
        logger.error('❌ Error querying order stats:', error);
        throw error;
      }

      logger.info(`📊 Order stats query: ${orders?.length || 0} total orders found`);
      
      // DEBUG: Log status breakdown
      if (orders && orders.length > 0) {
        const statusBreakdown = orders.reduce((acc, order) => {
          const status = order.status || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        logger.info('📋 Status breakdown:', statusBreakdown);
        
        const paymentBreakdown = orders.reduce((acc, order) => {
          const ps = order.payment_status || 'unknown';
          acc[ps] = (acc[ps] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        logger.info('💰 Payment status breakdown:', paymentBreakdown);
      }

      // Success = Delivered orders (based on actual Supabase data)
      const successCount = orders?.filter(o => o.status === 'Đã giao').length || 0;
      
      // Failed = Failed orders (based on actual Supabase data)
      // Note: "Thất bại" might also include cancelled orders with reasons in order_status_history
      const failedCount = orders?.filter(o => o.status === 'Thất bại').length || 0;
      
      const totalOrders = orders?.length || 0;

      const successRate = totalOrders > 0 ? (successCount / totalOrders) * 100 : 0;
      const failedRate = totalOrders > 0 ? (failedCount / totalOrders) * 100 : 0;

      logger.info('✅ Order status stats generated:', {
        successCount,
        failedCount,
        totalOrders,
        successRate: successRate.toFixed(2) + '%',
        failedRate: failedRate.toFixed(2) + '%'
      });
      
      return {
        successCount,
        failedCount,
        successRate,
        failedRate,
        totalOrders
      };
    } catch (error) {
      logger.error('❌ Error fetching order status stats:', error);
      throw error;
    }
  }

  /**
   * 3. Tỷ lệ chuyển đổi khách hàng
   * Get customer conversion rate
   */
  async getConversionRate(
    startDate?: string,
    endDate?: string
  ): Promise<ConversionRate> {
    try {
      logger.info('📊 Fetching conversion rate');

      // Get ALL active users (không filter theo date - để tính conversion đúng)
      // Conversion rate = users có orders / TỔNG users active
      const { data: users, error: userError } = await supabaseAdmin
        .from('users')
        .select('user_id, created_at, is_active')
        .eq('is_active', true);

      if (userError) {
        logger.error('❌ Error querying users:', userError);
        throw userError;
      }

      const totalUsers = users?.length || 0;
      logger.info(`👥 Total active users (all time): ${totalUsers}`);

      // Get ALL orders (like AdminOrderService), then filter for completed ones
      let orderQuery = supabaseAdmin
        .from('orders')
        .select('user_id, status, payment_status, ordered_at');

      if (startDate) {
        orderQuery = orderQuery.gte('ordered_at', startDate);
      }
      if (endDate) {
        orderQuery = orderQuery.lte('ordered_at', endDate);
      }

      const { data: allOrdersForConversion, error: orderError } = await orderQuery;
      if (orderError) {
        logger.error('❌ Error querying orders for conversion:', orderError);
        throw orderError;
      }
      
      logger.info(`📦 Total orders for conversion: ${allOrdersForConversion?.length || 0}`);
      
      // Filter for completed orders (Đã giao)
      const orders = allOrdersForConversion?.filter(o => o.status === 'Đã giao') || [];
      logger.info(`📦 Delivered orders: ${orders.length}`);

      const uniqueUserIdsWithOrders = new Set(orders?.map(o => o.user_id) || []);
      const usersWithOrders = uniqueUserIdsWithOrders.size;

      // Get users with cart items (active carts only - có items hiện tại)
      const { data: cartItems, error: cartError } = await supabaseAdmin
        .from('cart_items')
        .select('user_id, added_at');

      if (cartError) {
        logger.error('❌ Error querying cart items:', cartError);
        throw cartError;
      }

      const uniqueUserIdsWithCart = new Set(cartItems?.map(c => c.user_id) || []);
      const usersWithCart = uniqueUserIdsWithCart.size;

      const totalOrders = orders?.length || 0;
      
      // CONVERSION RATE = (Users có đơn hàng hoàn thành) / (Tổng active users) * 100%
      // Ý nghĩa: Tỷ lệ users đã chuyển đổi thành khách hàng (có đơn thành công)
      const conversionRate = totalUsers > 0 ? (usersWithOrders / totalUsers) * 100 : 0;
      
      // CART TO ORDER RATE = (Users có đơn) / (Users có giỏ hàng) * 100%
      // Ý nghĩa: Tỷ lệ users có giỏ hàng đã đặt hàng thành công
      const cartToOrderRate = usersWithCart > 0 ? (usersWithOrders / usersWithCart) * 100 : 0;

      logger.info('✅ Conversion rate calculated:');
      logger.info(`   👥 Total active users: ${totalUsers}`);
      logger.info(`   ✅ Users with delivered orders: ${usersWithOrders}`);
      logger.info(`   🛒 Users with cart items: ${usersWithCart}`);
      logger.info(`   📦 Total delivered orders: ${totalOrders}`);
      logger.info(`   📈 Conversion Rate (User→Order): ${conversionRate.toFixed(2)}%`);
      logger.info(`   📈 Cart to Order Rate (Cart→Order): ${cartToOrderRate.toFixed(2)}%`);
      
      return {
        totalUsers,
        usersWithOrders,
        conversionRate,
        usersWithCart,
        cartToOrderRate,
        totalOrders
      };
    } catch (error) {
      logger.error('❌ Error fetching conversion rate:', error);
      throw error;
    }
  }

  /**
   * 4. Danh mục sản phẩm ưa chuộng
   * Get popular product categories
   */
  async getPopularCategories(
    startDate?: string,
    endDate?: string,
    limit: number = 10
  ): Promise<PopularCategory[]> {
    try {
      logger.info('📊 Fetching popular categories');

      // Get ALL orders with items (like AdminOrderService), then filter
      let orderQuery = supabaseAdmin
        .from('orders')
        .select(`
          order_id,
          status,
          payment_status,
          ordered_at,
          order_items (
            product_id,
            quantity,
            total_price
          )
        `);

      if (startDate) {
        orderQuery = orderQuery.gte('ordered_at', startDate);
      }
      if (endDate) {
        orderQuery = orderQuery.lte('ordered_at', endDate);
      }

      const { data: allOrdersWithItems, error: orderError } = await orderQuery;
      if (orderError) {
        logger.error('❌ Error querying orders for popular categories:', orderError);
        throw orderError;
      }
      
      logger.info(`📦 Total orders with items: ${allOrdersWithItems?.length || 0}`);
      
      // Filter for delivered orders only
      const orders = allOrdersWithItems?.filter(o => o.status === 'Đã giao') || [];
      logger.info(`📦 Delivered orders for popular categories: ${orders.length}`);
      
      if (orders.length === 0) {
        logger.warn('⚠️ No delivered orders found');
        return [];
      }

      // Get all products with ACTIVE categories only
      const { data: products, error: productError } = await supabaseAdmin
        .from('products')
        .select(`
          product_id,
          category_id,
          rating_average,
          rating_count,
          categories!inner (
            category_id,
            category_name,
            category_slug,
            is_active
          )
        `)
        .eq('categories.is_active', true); // Only active categories

      if (productError) {
        logger.error('❌ Error querying products with categories:', productError);
        throw productError;
      }
      
      logger.info(`📦 Found ${products?.length || 0} products with active categories`);

      // Calculate stats by category
      const categoryMap = new Map<number, {
        categoryName: string;
        categorySlug: string;
        totalSold: number;
        totalRevenue: number;
        productIds: Set<number>;
        totalRating: number;
        ratingCount: number;
      }>();

      orders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const product = products?.find(p => p.product_id === item.product_id);
          if (product && product.categories) {
            const categoryId = product.category_id;
            const category = product.categories as any;

            const existing = categoryMap.get(categoryId) || {
              categoryName: category.category_name,
              categorySlug: category.category_slug,
              totalSold: 0,
              totalRevenue: 0,
              productIds: new Set<number>(),
              totalRating: 0,
              ratingCount: 0
            };

            existing.totalSold += item.quantity;
            existing.totalRevenue += item.total_price;
            existing.productIds.add(product.product_id);
            
            if (product.rating_average && product.rating_count) {
              existing.totalRating += product.rating_average * product.rating_count;
              existing.ratingCount += product.rating_count;
            }

            categoryMap.set(categoryId, existing);
          }
        });
      });

      // Convert to array and sort by revenue
      const result: PopularCategory[] = Array.from(categoryMap.entries())
        .map(([categoryId, data]) => ({
          categoryId,
          categoryName: data.categoryName,
          categorySlug: data.categorySlug,
          totalSold: data.totalSold,
          totalRevenue: data.totalRevenue,
          productCount: data.productIds.size,
          averageRating: data.ratingCount > 0 ? data.totalRating / data.ratingCount : 0
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);

      logger.info(`✅ Popular categories generated: ${result.length} categories`);
      
      if (result.length > 0) {
        logger.info('🏆 Top categories:', result.slice(0, 3).map(c => ({
          name: c.categoryName,
          revenue: c.totalRevenue,
          sold: c.totalSold,
          products: c.productCount
        })));
      }
      
      return result;
    } catch (error) {
      logger.error('❌ Error fetching popular categories:', error);
      throw error;
    }
  }

  /**
   * Get dashboard overview (all stats combined)
   */
  async getDashboardOverview(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalRevenue: number;
    orderStats: OrderStatusStats;
    conversionRate: ConversionRate;
    popularCategories: PopularCategory[];
  }> {
    try {
      logger.info('📊 ===== DASHBOARD OVERVIEW START =====');
      logger.info(`📅 Date range: ${startDate || 'ALL'} to ${endDate || 'TODAY'}`);

      const [orderStats, conversionRate, popularCategories, revenueReport] = await Promise.all([
        this.getOrderStatusStats(startDate, endDate),
        this.getConversionRate(startDate, endDate),
        this.getPopularCategories(startDate, endDate, 5),
        this.getRevenueReport(
          startDate || '2020-01-01', 
          endDate || new Date().toISOString().split('T')[0],
          'day'
        )
      ]);

      // Calculate total revenue from revenue report
      const totalRevenue = revenueReport.reduce((sum, item) => sum + item.totalRevenue, 0);

      logger.info('✅ ===== DASHBOARD OVERVIEW SUMMARY =====');
      logger.info(`💰 Total Revenue: ${totalRevenue.toLocaleString('vi-VN')} VND`);
      logger.info(`📦 Revenue periods: ${revenueReport.length}`);
      logger.info(`📊 Order Stats: ${orderStats.successCount} success, ${orderStats.failedCount} failed, ${orderStats.totalOrders} total`);
      logger.info(`👥 Conversion: ${conversionRate.usersWithOrders}/${conversionRate.totalUsers} users (${conversionRate.conversionRate.toFixed(2)}%)`);
      logger.info(`🏆 Popular Categories: ${popularCategories.length} categories`);
      logger.info('===== DASHBOARD OVERVIEW END =====');
      
      return {
        totalRevenue,
        orderStats,
        conversionRate,
        popularCategories
      };
    } catch (error) {
      logger.error('❌ Error fetching dashboard overview:', error);
      throw error;
    }
  }
}

export default new AdminDashboardService();
