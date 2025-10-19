import { IRepository } from "../../../../shared/domain/IRepository";
import { CartItem } from "../entities/CartItem";

/**
 * Cart Repository Interface
 * Following DDD - Repository pattern
 */
export interface ICartRepository extends IRepository<CartItem> {
  /**
   * Find all cart items for a specific user
   */
  findByUserId(userId: number): Promise<CartItem[]>;

  /**
   * Find a specific cart item by user, product
   */
  findByUserAndProduct(
    userId: number,
    productId: number,
  ): Promise<CartItem | null>;

  /**
   * Add item to cart or update quantity if exists
   */
  addOrUpdateItem(cartItem: CartItem): Promise<CartItem>;

  /**
   * Update item quantity
   */
  updateQuantity(
    cartId: number,
    quantity: number
  ): Promise<CartItem>;

  /**
   * Set quantity for existing item by productId (absolute value)
   */
  setQuantityByProduct(
    userId: number,
    productId: number,
    quantity: number
  ): Promise<CartItem | null>;

  /**
   * Remove item from cart
   */
  removeItem(cartId: number): Promise<boolean>;

  /**
   * Clear all items for a user
   */
  clearUserCart(userId: number): Promise<boolean>;

  /**
   * Get cart items with product details
   */
  findByUserIdWithProducts(userId: number): Promise<any[]>;
}
