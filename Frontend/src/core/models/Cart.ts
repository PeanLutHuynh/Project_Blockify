/**
 * Cart Models - OOP Implementation following rule.md
 * Demonstrates 4 OOP Principles: Encapsulation, Abstraction, Inheritance, Polymorphism
 */

/**
 * CartItem - Represents a single item in the cart
 * Encapsulation: Private properties with public getters/setters
 */
export class CartItem {
  private _productId: number;
  private _productName: string;
  private _productSlug: string;
  private _imageUrl: string;
  private _price: number;
  private _salePrice: number | null;
  private _quantity: number;
  private _stockQuantity: number;
  private _minStockLevel: number;
  private _selected: boolean; // For cart UI checkbox state

  constructor(data: {
    productId: number;
    productName: string;
    productSlug: string;
    imageUrl: string;
    price: number;
    salePrice?: number | null;
    quantity: number;
    stockQuantity: number;
    minStockLevel: number;
    selected?: boolean; // Optional, defaults to true
  }) {
    this._productId = data.productId;
    this._productName = data.productName;
    this._productSlug = data.productSlug;
    this._imageUrl = data.imageUrl;
    this._price = data.price;
    this._salePrice = data.salePrice || null;
    this._quantity = data.quantity;
    this._stockQuantity = data.stockQuantity;
    this._minStockLevel = data.minStockLevel;
    this._selected = data.selected !== undefined ? data.selected : true; // Default to selected
  }

  // Getters
  get productId(): number { return this._productId; }
  get productName(): string { return this._productName; }
  get productSlug(): string { return this._productSlug; }
  get imageUrl(): string { return this._imageUrl; }
  get price(): number { return this._price; }
  get salePrice(): number | null { return this._salePrice; }
  get quantity(): number { return this._quantity; }
  get stockQuantity(): number { return this._stockQuantity; }
  get minStockLevel(): number { return this._minStockLevel; }
  get selected(): boolean { return this._selected; }

  // Setters
  set selected(value: boolean) { this._selected = value; }

  // Business logic methods
  
  /**
   * Check if product is sold out (stock equals min level)
   */
  isSoldOut(): boolean {
    return this._stockQuantity <= this._minStockLevel;
  }

  /**
   * Get effective price (sale_price if exists, otherwise regular price)
   */
  getEffectivePrice(): number {
    return this._salePrice !== null && this._salePrice > 0 ? this._salePrice : this._price;
  }

  /**
   * Get total price for this item (quantity * effective price)
   * Returns 0 if sold out
   */
  getTotalPrice(): number {
    if (this.isSoldOut()) {
      return 0;
    }
    return this.getEffectivePrice() * this._quantity;
  }

  /**
   * Check if item can be purchased
   */
  canBePurchased(): boolean {
    return !this.isSoldOut() && this._quantity > 0;
  }

  /**
   * Update quantity with validation
   */
  setQuantity(newQuantity: number): void {
    if (newQuantity < 1) {
      throw new Error('Số lượng phải lớn hơn 0');
    }
    
    const availableStock = this._stockQuantity - this._minStockLevel;
    if (newQuantity > availableStock) {
      throw new Error(`Chỉ còn ${availableStock} sản phẩm trong kho`);
    }
    
    this._quantity = newQuantity;
  }

  /**
   * Increase quantity by 1
   */
  increaseQuantity(): void {
    this.setQuantity(this._quantity + 1);
  }

  /**
   * Decrease quantity by 1
   */
  decreaseQuantity(): void {
    if (this._quantity > 1) {
      this.setQuantity(this._quantity - 1);
    }
  }

  /**
   * Format price to Vietnamese currency
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  /**
   * Get formatted effective price
   */
  getFormattedEffectivePrice(): string {
    return this.formatPrice(this.getEffectivePrice());
  }

  /**
   * Get formatted total price
   */
  getFormattedTotalPrice(): string {
    return this.formatPrice(this.getTotalPrice());
  }

  /**
   * Check if item has sale price
   */
  hasSalePrice(): boolean {
    return this._salePrice !== null && this._salePrice > 0 && this._salePrice < this._price;
  }

  /**
   * Get discount percentage
   */
  getDiscountPercentage(): number {
    if (!this.hasSalePrice() || this._salePrice === null) {
      return 0;
    }
    return Math.round(((this._price - this._salePrice) / this._price) * 100);
  }

  /**
   * Convert to JSON for storage
   */
  toJSON(): any {
    return {
      productId: this._productId,
      productName: this._productName,
      productSlug: this._productSlug,
      imageUrl: this._imageUrl,
      price: this._price,
      salePrice: this._salePrice,
      quantity: this._quantity,
      stockQuantity: this._stockQuantity,
      minStockLevel: this._minStockLevel
    };
  }

  /**
   * Create CartItem from JSON
   */
  static fromJSON(data: any): CartItem {
    return new CartItem({
      productId: data.productId,
      productName: data.productName,
      productSlug: data.productSlug,
      imageUrl: data.imageUrl,
      price: data.price,
      salePrice: data.salePrice,
      quantity: data.quantity,
      stockQuantity: data.stockQuantity,
      minStockLevel: data.minStockLevel
    });
  }
}

/**
 * Cart - Manages collection of CartItems
 * Demonstrates Encapsulation and Business Logic
 */
export class Cart {
  private _items: Map<string, CartItem>; // key: productId
  private _shopName: string;

  constructor(shopName: string = 'Blockify') {
    this._items = new Map();
    this._shopName = shopName;
  }

  // Getters
  get shopName(): string { return this._shopName; }
  get items(): CartItem[] { return Array.from(this._items.values()); }
  get itemCount(): number { return this._items.size; }

  /**
   * Generate unique key for cart item
   */
  private getItemKey(productId: number): string {
    return `${productId}`;
  }

  /**
   * Add item to cart or update quantity if exists
   */
  addItem(item: CartItem): void {
    const key = this.getItemKey(item.productId);
    
    if (this._items.has(key)) {
      // Update quantity if item already exists
      const existingItem = this._items.get(key)!;
      existingItem.setQuantity(existingItem.quantity + item.quantity);
    } else {
      // Add new item
      this._items.set(key, item);
    }
  }

  /**
   * Remove item from cart
   */
  removeItem(productId: number): void {
    const key = this.getItemKey(productId);
    this._items.delete(key);
  }

  /**
   * Update item quantity
   */
  updateItemQuantity(productId: number, quantity: number): void {
    const key = this.getItemKey(productId);
    const item = this._items.get(key);
    
    if (item) {
      item.setQuantity(quantity);
    }
  }

  /**
   * Get item by product ID
   */
  getItem(productId: number): CartItem | undefined {
    const key = this.getItemKey(productId);
    return this._items.get(key);
  }

  /**
   * Clear all items from cart
   */
  clear(): void {
    this._items.clear();
  }

  /**
   * Get all purchasable items (excluding sold out items)
   */
  getPurchasableItems(): CartItem[] {
    return this.items.filter(item => item.canBePurchased());
  }

  /**
   * Get all sold out items
   */
  getSoldOutItems(): CartItem[] {
    return this.items.filter(item => item.isSoldOut());
  }

  /**
   * Calculate total cost (only purchasable items)
   */
  getTotalCost(): number {
    return this.getPurchasableItems().reduce((total, item) => {
      return total + item.getTotalPrice();
    }, 0);
  }

  /**
   * Get formatted total cost
   */
  getFormattedTotalCost(): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(this.getTotalCost());
  }

  /**
   * Get total items count (quantity sum)
   */
  getTotalItemsCount(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Check if cart is empty
   */
  isEmpty(): boolean {
    return this._items.size === 0;
  }

  /**
   * Check if cart has any purchasable items
   */
  hasPurchasableItems(): boolean {
    return this.getPurchasableItems().length > 0;
  }

  /**
   * Save cart to localStorage
   */
  saveToLocalStorage(key: string = 'blockify_cart'): void {
    const cartData = {
      shopName: this._shopName,
      items: this.items.map(item => item.toJSON())
    };
    localStorage.setItem(key, JSON.stringify(cartData));
  }

  /**
   * Load cart from localStorage
   */
  static loadFromLocalStorage(key: string = 'blockify_cart'): Cart {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        return new Cart();
      }

      const cartData = JSON.parse(data);
      const cart = new Cart(cartData.shopName || 'Blockify');
      
      if (cartData.items && Array.isArray(cartData.items)) {
        cartData.items.forEach((itemData: any) => {
          const item = CartItem.fromJSON(itemData);
          cart.addItem(item);
        });
      }

      return cart;
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return new Cart();
    }
  }

  /**
   * Convert to JSON
   */
  toJSON(): any {
    return {
      shopName: this._shopName,
      items: this.items.map(item => item.toJSON()),
      totalCost: this.getTotalCost(),
      itemCount: this.itemCount
    };
  }
}
