import { BaseModel } from './BaseModel';
import { Cart, CartItem, AddToCartRequest } from '../types/Order';

export class CartModel extends BaseModel {
  constructor() {
    super('cart_items');
  }

  /**
   * Get user's cart with products
   */
  async getUserCart(userId: string): Promise<Cart> {
    const { data, error } = await this.supabase
      .from('cart_items')
      .select(`
        *,
        products (
          id,
          name,
          price,
          sale_price,
          images,
          stock_quantity,
          is_active
        )
      `)
      .eq('user_id', userId)
      .order('created_at');

    if (error) {
      throw new Error(`Error fetching cart: ${error.message}`);
    }

    const items = (data || []).filter(item => item.products?.is_active);
    const totalAmount = items.reduce((sum, item) => {
      const price = item.products?.sale_price || item.products?.price || 0;
      return sum + (price * item.quantity);
    }, 0);

    return {
      id: `cart_${userId}`,
      user_id: userId,
      items: items,
      total_amount: totalAmount,
      total_items: items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }

  /**
   * Add item to cart
   */
  async addToCart(userId: string, productId: string, quantity: number): Promise<CartItem> {
    // Check if item already exists in cart
    const { data: existingItem } = await this.supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existingItem) {
      // Update existing item quantity
      return this.updateCartItemQuantity(existingItem.id, existingItem.quantity + quantity);
    } else {
      // Create new cart item
      const cartItem = await this.create({
        user_id: userId,
        product_id: productId,
        quantity
      });

      return cartItem;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(itemId: string, quantity: number): Promise<CartItem> {
    if (quantity <= 0) {
      await this.delete(itemId);
      throw new Error('Item removed from cart');
    }

    const updated = await this.update(itemId, { quantity });
    return updated;
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(itemId: string): Promise<void> {
    await this.delete(itemId);
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Error clearing cart: ${error.message}`);
    }
  }

  /**
   * Get cart item count for user
   */
  async getCartItemCount(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Error getting cart count: ${error.message}`);
    }

    return (data || []).reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Validate cart items stock
   */
  async validateCartStock(userId: string): Promise<{ valid: boolean; issues: string[] }> {
    const cart = await this.getUserCart(userId);
    const issues: string[] = [];

    for (const item of cart.items) {
      if (!item.products) {
        issues.push(`Product ${item.product_id} is no longer available`);
        continue;
      }

      if (item.quantity > item.products.stock_quantity) {
        issues.push(`${item.products.name}: Only ${item.products.stock_quantity} items available, but ${item.quantity} requested`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}