import { BaseEntity } from "../../../../shared/domain/BaseEntity";
import { OrderItem } from "./OrderItem";

/**
 * Order Entity - Domain Layer
 * Aggregate Root for Order and OrderItems
 * Follows OOP principles: Encapsulation, Abstraction, Inheritance, Polymorphism
 */
export class Order extends BaseEntity {
  private _orderId?: number;
  private _orderNumber: string;
  private _userId: number;
  private _status: OrderStatus;
  private _customerName: string;
  private _customerEmail: string;
  private _customerPhone: string;
  private _shippingAddress: string;
  private _shippingCity: string;
  private _subtotal: number;
  private _shippingFee: number;
  private _taxAmount: number;
  private _discountAmount: number;
  private _totalAmount: number;
  private _paymentMethod: PaymentMethod;
  private _paymentStatus: PaymentStatus;
  private _notes?: string;
  private _orderedAt?: Date;
  private _items: OrderItem[];

  constructor(data: {
    orderId?: number;
    orderNumber: string;
    userId: number;
    status?: OrderStatus;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    shippingCity: string;
    subtotal: number;
    shippingFee?: number;
    taxAmount?: number;
    discountAmount?: number;
    totalAmount?: number;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
    notes?: string;
    orderedAt?: Date;
    items?: OrderItem[];
  }) {
    super(
      data.orderId?.toString() ?? data.orderNumber,
      data.orderedAt,
      undefined
    );
    this._orderId = data.orderId;
    this._orderNumber = data.orderNumber;
    this._userId = data.userId;
    this._status = data.status ?? "Đang xử lý";
    this._customerName = data.customerName;
    this._customerEmail = data.customerEmail;
    this._customerPhone = data.customerPhone;
    this._shippingAddress = data.shippingAddress;
    this._shippingCity = data.shippingCity;
    this._subtotal = data.subtotal;
    this._shippingFee = data.shippingFee ?? 0;
    this._taxAmount = data.taxAmount ?? 0;
    this._discountAmount = data.discountAmount ?? 0;
    this._totalAmount = data.totalAmount ?? this.calculateTotalAmount();
    this._paymentMethod = data.paymentMethod;
    this._paymentStatus = data.paymentStatus ?? "pending";
    this._notes = data.notes;
    this._orderedAt = data.orderedAt;
    this._items = data.items ?? [];
  }

  // Getters (Encapsulation)
  get orderId(): number | undefined {
    return this._orderId;
  }

  get orderNumber(): string {
    return this._orderNumber;
  }

  get userId(): number {
    return this._userId;
  }

  get status(): OrderStatus {
    return this._status;
  }

  get customerName(): string {
    return this._customerName;
  }

  get customerEmail(): string {
    return this._customerEmail;
  }

  get customerPhone(): string {
    return this._customerPhone;
  }

  get shippingAddress(): string {
    return this._shippingAddress;
  }

  get shippingCity(): string {
    return this._shippingCity;
  }

  get subtotal(): number {
    return this._subtotal;
  }

  get shippingFee(): number {
    return this._shippingFee;
  }

  get taxAmount(): number {
    return this._taxAmount;
  }

  get discountAmount(): number {
    return this._discountAmount;
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get paymentMethod(): PaymentMethod {
    return this._paymentMethod;
  }

  get paymentStatus(): PaymentStatus {
    return this._paymentStatus;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get orderedAt(): Date | undefined {
    return this._orderedAt;
  }

  get items(): OrderItem[] {
    return this._items;
  }

  // Domain Logic (Business Rules)
  private calculateTotalAmount(): number {
    return this._subtotal + this._shippingFee + this._taxAmount - this._discountAmount;
  }

  public addItem(item: OrderItem): void {
    this._items.push(item);
  }

  public setItems(items: OrderItem[]): void {
    this._items = items;
  }

  public updateStatus(newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      "Đang xử lý": ["Đang giao", "Đã hủy", "Thất bại"],
      "Đang giao": ["Đã giao", "Đã hủy"],
      "Đã giao": ["Đã trả"],
      "Đã hủy": [], // Khách chủ động hủy - không thể chuyển
      "Đã trả": [],
      "Thất bại": [], // Hệ thống tự động hủy - không thể chuyển
    };

    if (!validTransitions[this._status].includes(newStatus)) {
      throw new Error(`Cannot transition from ${this._status} to ${newStatus}`);
    }

    this._status = newStatus;
  }

  public updatePaymentStatus(status: PaymentStatus): void {
    this._paymentStatus = status;
  }

  public applyDiscount(amount: number): void {
    if (amount < 0) {
      throw new Error("Discount amount cannot be negative");
    }
    this._discountAmount = amount;
    this._totalAmount = this.calculateTotalAmount();
  }

  // Validation
  public validate(): void {
    if (!this._orderNumber || this._orderNumber.trim().length === 0) {
      throw new Error("Order number is required");
    }
    if (!this._userId) {
      throw new Error("User ID is required");
    }
    if (!this._customerName || this._customerName.trim().length === 0) {
      throw new Error("Customer name is required");
    }
    if (!this._customerEmail || !this.isValidEmail(this._customerEmail)) {
      throw new Error("Valid customer email is required");
    }
    if (!this._customerPhone || this._customerPhone.trim().length === 0) {
      throw new Error("Customer phone is required");
    }
    if (!this._shippingAddress || this._shippingAddress.trim().length === 0) {
      throw new Error("Shipping address is required");
    }
    if (!this._shippingCity || this._shippingCity.trim().length === 0) {
      throw new Error("Shipping city is required");
    }
    if (this._subtotal <= 0) {
      throw new Error("Subtotal must be greater than 0");
    }
    if (this._items.length === 0) {
      throw new Error("Order must have at least one item");
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Convert to plain object for repository
  public toObject(): any {
    const obj: any = {
      order_number: this._orderNumber,
      user_id: this._userId,
      status: this._status,
      customer_name: this._customerName,
      customer_email: this._customerEmail,
      customer_phone: this._customerPhone,
      shipping_address: this._shippingAddress,
      shipping_city: this._shippingCity,
      subtotal: this._subtotal,
      shipping_fee: this._shippingFee,
      tax_amount: this._taxAmount,
      discount_amount: this._discountAmount,
      total_amount: this._totalAmount,
      payment_method: this._paymentMethod,
      payment_status: this._paymentStatus,
      notes: this._notes,
      ordered_at: this._orderedAt,
    };

    // Only include order_id if it exists (for updates, not inserts)
    if (this._orderId !== undefined) {
      obj.order_id = this._orderId;
    }

    return obj;
  }

  // Implement abstract method from BaseEntity
  public toJSON(): Record<string, any> {
    return {
      ...this.toObject(),
      items: this._items.map((item) => item.toJSON()),
    };
  }
}

// Types
export type OrderStatus = "Đang xử lý" | "Đang giao" | "Đã giao" | "Đã hủy" | "Đã trả" | "Thất bại";
export type PaymentMethod = "cod" | "bank_transfer" | "momo" | "zalopay" | "vnpay";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
