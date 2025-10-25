import { BaseEntity } from "../../../../shared/domain/BaseEntity";

/**
 * OrderItem Entity - Domain Layer
 * Represents a single item in an order
 * Follows OOP principles: Encapsulation, Abstraction, Inheritance, Polymorphism
 */
export class OrderItem extends BaseEntity {
  private _orderItemId?: number;
  private _orderId?: number;
  private _productId: number;
  private _productName: string;
  private _productSku: string;
  private _quantity: number;
  private _unitPrice: number;
  private _totalPrice: number;

  constructor(data: {
    orderItemId?: number;
    orderId?: number;
    productId: number;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
  }) {
    super(
      data.orderItemId?.toString() ?? `temp-${Date.now()}`,
      undefined,
      undefined
    );
    this._orderItemId = data.orderItemId;
    this._orderId = data.orderId;
    this._productId = data.productId;
    this._productName = data.productName;
    this._productSku = data.productSku;
    this._quantity = data.quantity;
    this._unitPrice = data.unitPrice;
    this._totalPrice = data.totalPrice ?? this.calculateTotalPrice();
  }

  // Getters (Encapsulation)
  get orderItemId(): number | undefined {
    return this._orderItemId;
  }

  get orderId(): number | undefined {
    return this._orderId;
  }

  get productId(): number {
    return this._productId;
  }

  get productName(): string {
    return this._productName;
  }

  get productSku(): string {
    return this._productSku;
  }

  get quantity(): number {
    return this._quantity;
  }

  get unitPrice(): number {
    return this._unitPrice;
  }

  get totalPrice(): number {
    return this._totalPrice;
  }

  // Domain Logic (Business Rules)
  private calculateTotalPrice(): number {
    return this._unitPrice * this._quantity;
  }

  public setOrderId(orderId: number): void {
    this._orderId = orderId;
  }

  public updateQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    this._quantity = quantity;
    this._totalPrice = this.calculateTotalPrice();
  }

  // Validation
  public validate(): void {
    if (!this._productId) {
      throw new Error("Product ID is required");
    }
    if (!this._productName || this._productName.trim().length === 0) {
      throw new Error("Product name is required");
    }
    if (!this._productSku || this._productSku.trim().length === 0) {
      throw new Error("Product SKU is required");
    }
    if (this._quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    if (this._unitPrice < 0) {
      throw new Error("Unit price cannot be negative");
    }
  }

  // Convert to plain object for repository
  public toObject(): any {
    const obj: any = {
      order_id: this._orderId,
      product_id: this._productId,
      product_name: this._productName,
      product_sku: this._productSku,
      quantity: this._quantity,
      unit_price: this._unitPrice,
      total_price: this._totalPrice,
    };

    // Only include order_item_id if it exists (for updates, not inserts)
    if (this._orderItemId !== undefined) {
      obj.order_item_id = this._orderItemId;
    }

    return obj;
  }

  // Implement abstract method from BaseEntity
  public toJSON(): Record<string, any> {
    return this.toObject();
  }
}
