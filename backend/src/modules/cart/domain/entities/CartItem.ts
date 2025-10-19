import { BaseEntity } from "../../../../shared/domain/BaseEntity";

/**
 * CartItem Entity - Rich Domain Model
 * Following DDD + Clean Architecture principles
 * Encapsulation: Private fields with public getters
 */
export class CartItem extends BaseEntity {
  private _cartId!: number;
  private _userId: number;
  private _productId: number;
  private _quantity: number;
  private _addedAt: Date;

  constructor(data: {
    cartId?: number;
    userId: number;
    productId: number;
    quantity?: number;
    addedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(
      data.cartId?.toString() || `temp-${Date.now()}`,
      data.createdAt || data.addedAt,
      data.updatedAt
    );
    this._userId = data.userId;
    this._productId = data.productId;
    this._quantity = data.quantity || 1;
    this._addedAt = data.addedAt || new Date();

    if (data.cartId) {
      this._cartId = data.cartId;
    }

    this.validate();
  }

  // Getters (Encapsulation)
  get cartId(): number {
    return this._cartId;
  }

  get userId(): number {
    return this._userId;
  }

  get productId(): number {
    return this._productId;
  }

  get quantity(): number {
    return this._quantity;
  }

  get addedAt(): Date {
    return this._addedAt;
  }

  // Business Logic Methods

  /**
   * Update quantity with validation
   */
  public updateQuantity(newQuantity: number): void {
    if (newQuantity < 1) {
      throw new Error("Quantity must be at least 1");
    }
    this._quantity = newQuantity;
  }

  /**
   * Increase quantity
   */
  public increaseQuantity(amount: number = 1): void {
    this._quantity += amount;
  }

  /**
   * Decrease quantity
   */
  public decreaseQuantity(amount: number = 1): void {
    if (this._quantity - amount < 1) {
      throw new Error("Quantity cannot be less than 1");
    }
    this._quantity -= amount;
  }

  /**
   * Validate cart item
   */
  public validate(): boolean {
    if (this._userId <= 0) {
      throw new Error("Invalid user ID");
    }
    if (this._productId <= 0) {
      throw new Error("Invalid product ID");
    }
    if (this._quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }
    return true;
  }

  /**
   * Convert to plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      cartId: this._cartId,
      userId: this._userId,
      productId: this._productId,
      quantity: this._quantity,
      addedAt: this._addedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}