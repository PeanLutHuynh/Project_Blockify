/**
 * CartService - Business logic for cart operations
 * Following rule.md: MVC + OOP architecture
 */

import { Cart, CartItem } from '../models/Cart.js';
import { httpClient } from '../api/FetchHttpClient.js';
import { ENV } from '../config/env.js';

export class CartService {
  private static instance: CartService;
  private cart: Cart;
  private readonly STORAGE_KEY = 'blockify_cart';
  private readonly AUTH_TOKEN_KEY = ENV.JWT_STORAGE_KEY;

  private constructor() {
    // Load cart from localStorage on initialization
    this.cart = Cart.loadFromLocalStorage(this.STORAGE_KEY);
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  /**
   * Get current cart
   */
  getCart(): Cart {
    return this.cart;
  }

  /**
   * Add product to cart
   */
  async addToCart(productData: {
    productId: number;
    productName: string;
    productSlug: string;
    imageUrl: string;
    price: number;
    salePrice?: number | null;
    quantity?: number;
    stockQuantity: number;
    minStockLevel: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Validate stock before adding
      if (productData.stockQuantity <= productData.minStockLevel) {
        return {
          success: false,
          message: 'Sản phẩm đã hết hàng'
        };
      }

      const quantity = productData.quantity || 1;
      const availableStock = productData.stockQuantity - productData.minStockLevel;
      
      if (quantity > availableStock) {
        return {
          success: false,
          message: `Chỉ còn ${availableStock} sản phẩm trong kho`
        };
      }

      const cartItem = new CartItem({
        productId: productData.productId,
        productName: productData.productName,
        productSlug: productData.productSlug,
        imageUrl: productData.imageUrl,
        price: productData.price,
        salePrice: productData.salePrice,
        quantity: quantity,
        stockQuantity: productData.stockQuantity,
        minStockLevel: productData.minStockLevel
      });

      // Add to local cart first
      this.cart.addItem(cartItem);
      this.cart.saveToLocalStorage(this.STORAGE_KEY);

      // Try to sync with backend if user is logged in
      await this.syncToBackend(cartItem);

      return {
        success: true,
        message: 'Đã thêm sản phẩm vào giỏ hàng'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Không thể thêm sản phẩm vào giỏ hàng'
      };
    }
  }

  /**
   * Remove item from cart
   */
  removeFromCart(productId: number): { success: boolean; message: string } {
    try {
      this.cart.removeItem(productId);
      this.cart.saveToLocalStorage(this.STORAGE_KEY);

      // Sync with backend (async, don't wait)
      this.removeFromBackend(productId);

      return {
        success: true,
        message: 'Đã xóa sản phẩm khỏi giỏ hàng'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Không thể xóa sản phẩm'
      };
    }
  }

  /**
   * Remove item from backend
   */
  private async removeFromBackend(productId: number): Promise<void> {
    try {
      const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
      if (!token) return;

      // Find cart_id from backend cart
      const response = await httpClient.get<any>('/api/v1/cart');
      if (response.success && response.data && response.data.items) {
        const item = response.data.items.find((i: any) => i.productId === productId);
        if (item && item.cartId) {
          await httpClient.delete(`/api/v1/cart/${item.cartId}`);
        }
      }
    } catch (error: any) {
      console.error('Error removing from backend:', error);
    }
  }

  /**
   * Update item quantity
   */
  updateQuantity(productId: number, quantity: number): { success: boolean; message: string } {
    try {
      this.cart.updateItemQuantity(productId, quantity);
      this.cart.saveToLocalStorage(this.STORAGE_KEY);

      return {
        success: true,
        message: 'Đã cập nhật số lượng'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Không thể cập nhật số lượng'
      };
    }
  }

  /**
   * Increase item quantity
   */
  async increaseQuantity(productId: number): Promise<{ success: boolean; message: string }> {
    try {
      const item = this.cart.getItem(productId);
      if (!item) {
        return {
          success: false,
          message: 'Không tìm thấy sản phẩm trong giỏ hàng'
        };
      }

      item.increaseQuantity();
      this.cart.saveToLocalStorage(this.STORAGE_KEY);

      // Sync to backend
      await this.updateQuantityOnBackend(productId, item.quantity);

      return {
        success: true,
        message: 'Đã tăng số lượng'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Không thể tăng số lượng'
      };
    }
  }

  /**
   * Decrease item quantity
   */
  async decreaseQuantity(productId: number): Promise<{ success: boolean; message: string }> {
    try {
      const item = this.cart.getItem(productId);
      if (!item) {
        return {
          success: false,
          message: 'Không tìm thấy sản phẩm trong giỏ hàng'
        };
      }

      item.decreaseQuantity();
      this.cart.saveToLocalStorage(this.STORAGE_KEY);

      // Sync to backend
      await this.updateQuantityOnBackend(productId, item.quantity);

      return {
        success: true,
        message: 'Đã giảm số lượng'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Không thể giảm số lượng'
      };
    }
  }

  /**
   * Clear cart
   */
  async clearCart(): Promise<{ success: boolean; message: string }> {
    try {
      // Clear local cart first
      this.cart.clear();
      this.cart.saveToLocalStorage(this.STORAGE_KEY);

      // Try to sync with backend if user is logged in
      const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
      if (token) {
        try {
          const response = await httpClient.post<any>('/api/v1/cart/clear', {});
          if (response.success) {
            console.log('✅ Cart cleared on backend');
          }
        } catch (error) {
          console.warn('⚠️ Failed to clear cart on backend, but local cart cleared:', error);
        }
      }

      return {
        success: true,
        message: 'Đã xóa tất cả sản phẩm khỏi giỏ hàng'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Không thể xóa giỏ hàng'
      };
    }
  }

  /**
   * Get cart items
   */
  getItems(): CartItem[] {
    return this.cart.items;
  }

  /**
   * Get purchasable items
   */
  getPurchasableItems(): CartItem[] {
    return this.cart.getPurchasableItems();
  }

  /**
   * Get sold out items
   */
  getSoldOutItems(): CartItem[] {
    return this.cart.getSoldOutItems();
  }

  /**
   * Get total cost
   */
  getTotalCost(): number {
    return this.cart.getTotalCost();
  }

  /**
   * Get formatted total cost
   */
  getFormattedTotalCost(): string {
    return this.cart.getFormattedTotalCost();
  }

  /**
   * Get total items count
   */
  getTotalItemsCount(): number {
    return this.cart.getTotalItemsCount();
  }

  /**
   * Check if cart is empty
   */
  isEmpty(): boolean {
    return this.cart.isEmpty();
  }

  /**
   * Check if cart has purchasable items
   */
  hasPurchasableItems(): boolean {
    return this.cart.hasPurchasableItems();
  }

  /**
   * Sync cart with backend (verify stock levels)
   */
  async syncWithBackend(): Promise<{ success: boolean; message?: string }> {
    try {
      const items = this.cart.items;
      if (items.length === 0) {
        return { success: true };
      }

      // Get product IDs
      const productIds = items.map(item => item.productId);

      // Fetch latest product data from backend
      const response = await httpClient.post<any>('/api/v1/products/check-stock', {
        productIds
      });

      if (!response.success || !response.data) {
        return {
          success: false,
          message: 'Không thể đồng bộ giỏ hàng'
        };
      }

      // Update cart items with latest stock data
      const products = response.data.products || [];
      let hasChanges = false;

      products.forEach((product: any) => {
        const item = this.cart.getItem(product.product_id);
        if (item) {
          // Update stock quantity if changed
          const newItem = new CartItem({
            productId: item.productId,
            productName: item.productName,
            productSlug: item.productSlug,
            imageUrl: item.imageUrl,
            price: product.price,
            salePrice: product.sale_price,
            quantity: item.quantity,
            stockQuantity: product.stock_quantity,
            minStockLevel: product.min_stock_level,
          });

          this.cart.removeItem(item.productId);
          this.cart.addItem(newItem);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        this.cart.saveToLocalStorage(this.STORAGE_KEY);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error syncing cart:', error);
      return {
        success: false,
        message: 'Lỗi khi đồng bộ giỏ hàng'
      };
    }
  }

  /**
   * Sync item to backend (save to database if logged in)
   */
  private async syncToBackend(cartItem: CartItem): Promise<void> {
    try {
      // Check if user is logged in
      const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
      if (!token) {
        // User not logged in, only save to localStorage
        console.log('⚠️ User not logged in, cart saved to localStorage only');
        return;
      }

      // Prepare request data
      const requestData = {
        productId: Number(cartItem.productId), // Ensure it's a number
        quantity: Number(cartItem.quantity)     // Ensure it's a number
      };

      // 🔍 DETAILED LOGGING FOR DEBUGGING
      console.log('🔄 Syncing to backend...');
      console.log('📤 CartItem:', {
        productId: cartItem.productId,
        productName: cartItem.productName,
        quantity: cartItem.quantity,
        productIdType: typeof cartItem.productId,
        quantityType: typeof cartItem.quantity
      });
      console.log('📤 Request Data:', requestData);
      console.log('📤 Request Data Types:', {
        productId: typeof requestData.productId,
        quantity: typeof requestData.quantity
      });

      // Call backend API to save cart item
      const response = await httpClient.post('/api/v1/cart', requestData);

      console.log('📥 Backend Response:', response);

      if (response.success) {
        console.log('✅ Cart synced to backend successfully');
      } else {
        console.warn('⚠️ Backend sync failed:', {
          message: response.message,
          error: response.error
        });
      }
    } catch (error: any) {
      console.error('❌ Error syncing to backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      // Don't fail the add to cart operation if backend sync fails
      // Item is already saved to localStorage
    }
  }

  /**
   * Update quantity on backend (set absolute quantity, not additive)
   */
  private async updateQuantityOnBackend(productId: number, quantity: number): Promise<void> {
    try {
      const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
      if (!token) {
        console.log('User not logged in, quantity update not synced');
        return;
      }

      // Use PUT /api/v1/cart/quantity endpoint to SET quantity
      const response = await httpClient.put('/api/v1/cart/quantity', {
        productId,
        quantity
      });

      if (response.success) {
        console.log('✅ Quantity updated on backend:', productId, quantity);
      } else {
        console.warn('⚠️ Backend quantity update failed:', response);
      }
    } catch (error: any) {
      console.error('❌ Error updating quantity on backend:', error);
    }
  }

  /**
   * Load cart from backend (for logged in users)
   */
  async loadFromBackend(): Promise<void> {
    try {
      const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
      if (!token) {
        console.log('⚠️ User not logged in, skipping backend cart load');
        return;
      }

      console.log('🔄 Loading cart from backend...');
      const response = await httpClient.get<any>('/api/v1/cart');

      if (response.success && response.data && response.data.items) {
        console.log('✅ Cart loaded from backend successfully');
        const backendItems = response.data.items;

        // Clear local cart
        this.cart.clear();

        // Add backend items to local cart
        backendItems.forEach((item: any) => {
          const cartItem = new CartItem({
            productId: item.productId,
            productName: item.productName,
            productSlug: item.productSlug,
            imageUrl: item.imageUrl,
            price: item.price,
            salePrice: item.salePrice,
            quantity: item.quantity,
            stockQuantity: item.stockQuantity,
            minStockLevel: item.minStockLevel
          });

          this.cart.addItem(cartItem);
        });

        // Save to localStorage
        this.cart.saveToLocalStorage(this.STORAGE_KEY);
      } else if (!response.success && response.error?.includes('Invalid or expired token')) {
        // Token expired, clear it
        console.warn('⚠️ Token expired, clearing authentication');
        localStorage.removeItem(this.AUTH_TOKEN_KEY);
        localStorage.removeItem('user');
      }
    } catch (error: any) {
      console.error('❌ Error loading cart from backend:', error);
      
      // If 401 Unauthorized, clear token
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.warn('⚠️ Token invalid, clearing authentication');
        localStorage.removeItem(this.AUTH_TOKEN_KEY);
        localStorage.removeItem('user');
      }
      
      // Keep local cart if backend load fails
    }
  }
}

// Export singleton instance
export const cartService = CartService.getInstance();
