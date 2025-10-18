/**
 * Product Model - OOP Implementation
 * Demonstrates 4 OOP Principles:
 * 1. Encapsulation: Private properties with public getters/setters
 * 2. Abstraction: Abstract base class for common product behavior
 * 3. Inheritance: Specialized product types extend base
 * 4. Polymorphism: Override methods for specific behavior
 */

/**
 * Abstract Base Product Class
 * Demonstrates Abstraction principle
 */
export abstract class BaseProduct {
  // Encapsulation: Private properties
  protected _id: string;
  protected _name: string;
  protected _description: string;
  protected _price: number;
  protected _imageUrl: string;
  protected _category: string;

  constructor(
    id: string,
    name: string,
    description: string,
    price: number,
    imageUrl: string,
    category: string
  ) {
    this._id = id;
    this._name = name;
    this._description = description;
    this._price = price;
    this._imageUrl = imageUrl;
    this._category = category;
  }

  // Encapsulation: Public getters
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get price(): number {
    return this._price;
  }

  get imageUrl(): string {
    return this._imageUrl;
  }

  get category(): string {
    return this._category;
  }

  // Encapsulation: Public setters with validation
  set price(value: number) {
    if (value < 0) {
      throw new Error('Price cannot be negative');
    }
    this._price = value;
  }

  // Abstract method (must be implemented by subclasses)
  abstract getDisplayPrice(): string;

  // Abstract method for getting product type
  abstract getProductType(): string;

  // Common method for all products
  getShortDescription(maxLength: number = 50): string {
    if (this._description.length <= maxLength) {
      return this._description;
    }
    return this._description.substring(0, maxLength) + '...';
  }
}

/**
 * Product Class - Main implementation
 * Demonstrates Inheritance and Polymorphism
 */
export class Product extends BaseProduct {
  private _productUrl?: string;
  private _slug: string;
  private _stockQuantity: number;
  private _isActive: boolean;

  constructor(
    id: string,
    name: string,
    description: string,
    price: number,
    imageUrl: string,
    category: string,
    productUrl?: string,
    slug: string = '',
    stockQuantity: number = 0,
    isActive: boolean = true
  ) {
    // Inheritance: Call parent constructor
    super(id, name, description, price, imageUrl, category);
    this._productUrl = productUrl;
    this._slug = slug;
    this._stockQuantity = stockQuantity;
    this._isActive = isActive;
  }

  // Encapsulation: Additional getters
  get productUrl(): string | undefined {
    return this._productUrl;
  }

  get slug(): string {
    return this._slug;
  }

  get stockQuantity(): number {
    return this._stockQuantity;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // Polymorphism: Override abstract method
  getDisplayPrice(): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(this._price);
  }

  // Polymorphism: Override abstract method
  getProductType(): string {
    return 'Standard Product';
  }

  // Business logic method
  isAvailable(): boolean {
    return this._isActive && this._stockQuantity > 0;
  }

  // Method to check if product is in stock
  hasStock(): boolean {
    return this._stockQuantity > 0;
  }

  // Static factory method to create Product from API response
  static fromApiResponse(data: any): Product {
    // Extract slug from product_url if not provided directly
    let slug = data.slug || data.product_slug || '';
    if (!slug && data.product_url) {
      const match = data.product_url.match(/slug=([^&]+)/);
      if (match) slug = match[1];
    }
    
    return new Product(
      data.id,
      data.name,
      data.description || '',
      data.price,
      data.image_url || data.imageUrl || '',
      data.category || 'General',
      data.product_url || data.productUrl,
      slug,
      data.stock_quantity || data.stockQuantity || 0,
      data.is_active !== undefined ? data.is_active : data.isActive !== undefined ? data.isActive : true
    );
  }

  // Convert to JSON for API requests
  toJSON(): any {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      price: this._price,
      image_url: this._imageUrl,
      category: this._category,
      product_url: this._productUrl,
      stock_quantity: this._stockQuantity,
      is_active: this._isActive
    };
  }

  // Convert to display format
  toDisplayFormat(): {
    id: string;
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    category: string;
    productUrl?: string;
    isAvailable: boolean;
  } {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      price: this.getDisplayPrice(),
      imageUrl: this._imageUrl,
      category: this._category,
      productUrl: this._productUrl,
      isAvailable: this.isAvailable()
    };
  }
}

/**
 * LegoProduct - Specialized Product (Demonstrates Inheritance & Polymorphism)
 */
export class LegoProduct extends Product {
  private _pieceCount: number;
  private _ageRange: string;

  constructor(
    id: string,
    name: string,
    description: string,
    price: number,
    imageUrl: string,
    category: string,
    productUrl: string | undefined,
    slug: string,
    stockQuantity: number,
    isActive: boolean,
    pieceCount: number,
    ageRange: string
  ) {
    super(id, name, description, price, imageUrl, category, productUrl, slug, stockQuantity, isActive);
    this._pieceCount = pieceCount;
    this._ageRange = ageRange;
  }

  get pieceCount(): number {
    return this._pieceCount;
  }

  get ageRange(): string {
    return this._ageRange;
  }

  // Polymorphism: Override method with specialized behavior
  getProductType(): string {
    return 'Lego Product';
  }

  // Additional method specific to Lego products
  getProductDetails(): string {
    return `${this._name} - ${this._pieceCount} pieces (Ages ${this._ageRange})`;
  }
}
