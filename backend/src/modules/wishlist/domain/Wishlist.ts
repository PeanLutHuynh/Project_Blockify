import { BaseEntity } from "../../../shared/domain/BaseEntity";

/**
 * Wishlist Entity
 * Domain Model following DDD principles
 */
export class Wishlist extends BaseEntity {
  public wishlistId: number;
  public userId: number;
  public productId: number;
  public addedAt: Date;

  constructor(
    wishlistId: number,
    userId: number,
    productId: number,
    addedAt: Date
  ) {
    super(wishlistId.toString(), addedAt, addedAt);
    this.wishlistId = wishlistId;
    this.userId = userId;
    this.productId = productId;
    this.addedAt = addedAt;
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, any> {
    return {
      wishlist_id: this.wishlistId,
      user_id: this.userId,
      product_id: this.productId,
      added_at: this.addedAt.toISOString(),
    };
  }

  // Getters
  getWishlistId(): number {
    return this.wishlistId;
  }

  getUserId(): number {
    return this.userId;
  }

  getProductId(): number {
    return this.productId;
  }

  getAddedAt(): Date {
    return this.addedAt;
  }

  /**
   * Create a new Wishlist instance
   */
  static create(userId: number, productId: number): Wishlist {
    return new Wishlist(0, userId, productId, new Date());
  }

  /**
   * Validate wishlist data
   */
  validate(): boolean {
    if (this.userId <= 0) {
      throw new Error("User ID must be positive");
    }
    if (this.productId <= 0) {
      throw new Error("Product ID must be positive");
    }
    return true;
  }
}
