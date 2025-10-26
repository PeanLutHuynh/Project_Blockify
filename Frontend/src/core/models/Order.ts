/**
 * Order Model - Frontend
 * OOP Model for Order data with Encapsulation
 */
export class Order {
  private _orderId: number;
  private _orderNumber: string;
  private _userId: number;
  private _status: string;
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
  private _paymentMethod: string;
  private _paymentStatus: string;
  private _notes?: string;
  private _orderedAt: Date;
  private _items: OrderItem[];

  constructor(data: any) {
    this._orderId = data.order_id;
    this._orderNumber = data.order_number;
    this._userId = data.user_id;
    this._status = data.status;
    this._customerName = data.customer_name;
    this._customerEmail = data.customer_email;
    this._customerPhone = data.customer_phone;
    this._shippingAddress = data.shipping_address;
    this._shippingCity = data.shipping_city;
    this._subtotal = data.subtotal;
    this._shippingFee = data.shipping_fee;
    this._taxAmount = data.tax_amount;
    this._discountAmount = data.discount_amount;
    this._totalAmount = data.total_amount;
    this._paymentMethod = data.payment_method;
    this._paymentStatus = data.payment_status;
    this._notes = data.notes;
    this._orderedAt = new Date(data.ordered_at);
    this._items =
      data.items?.map((item: any) => new OrderItem(item)) || [];
  }

  // Getters (Encapsulation)
  get orderId(): number {
    return this._orderId;
  }

  get orderNumber(): string {
    return this._orderNumber;
  }

  get userId(): number {
    return this._userId;
  }

  get status(): string {
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

  get paymentMethod(): string {
    return this._paymentMethod;
  }

  get paymentStatus(): string {
    return this._paymentStatus;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get orderedAt(): Date {
    return this._orderedAt;
  }

  get items(): OrderItem[] {
    return this._items;
  }

  // Business logic methods
  public isCompleted(): boolean {
    return this._status === "Đã giao";
  }

  public isCancelled(): boolean {
    return this._status === "Đã hủy";
  }

  public isPaid(): boolean {
    return this._paymentStatus === "paid";
  }

  public canBeCancelled(): boolean {
    return this._status === "Đang xử lý";
  }

  public getStatusBadgeClass(): string {
    switch (this._status) {
      case "Đang xử lý":
        return "badge-warning";
      case "Đang giao":
        return "badge-info";
      case "Đã giao":
        return "badge-success";
      case "Đã hủy":
        return "badge-danger";
      default:
        return "badge-secondary";
    }
  }

  public formatTotalAmount(): string {
    return this._totalAmount.toLocaleString("vi-VN") + " VND";
  }

  public formatOrderedAt(): string {
    return this._orderedAt.toLocaleDateString("vi-VN");
  }
}

/**
 * OrderItem Model - Frontend
 * OOP Model for Order Item data
 */
export class OrderItem {
  private _orderItemId: number;
  private _productId: number;
  private _productName: string;
  private _productSku: string;
  private _quantity: number;
  private _unitPrice: number;
  private _totalPrice: number;

  constructor(data: any) {
    this._orderItemId = data.order_item_id;
    this._productId = data.product_id;
    this._productName = data.product_name;
    this._productSku = data.product_sku;
    this._quantity = data.quantity;
    this._unitPrice = data.unit_price;
    this._totalPrice = data.total_price;
  }

  // Getters
  get orderItemId(): number {
    return this._orderItemId;
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

  // Methods
  public formatUnitPrice(): string {
    return this._unitPrice.toLocaleString("vi-VN") + " VND";
  }

  public formatTotalPrice(): string {
    return this._totalPrice.toLocaleString("vi-VN") + " VND";
  }
}
