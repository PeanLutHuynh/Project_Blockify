import { BaseEntity } from '../../../../shared/domain/BaseEntity';

/**
 * AdminProduct Entity - Domain Layer
 * Represents a product with full admin access and management capabilities
 */
export class AdminProduct extends BaseEntity {
  productId?: number;
  productName: string;
  productSlug: string;
  categoryId: number;
  description?: string;
  shortDescription?: string;
  price: number;
  salePrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  pieceCount?: number;
  difficultyLevel?: string;
  dimensions?: string;
  weight?: number;
  status?: string; // 'active', 'inactive', 'out_of_stock', 'draft'
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  soldCount?: number;
  
  // Relations
  images?: ProductImage[];
  category?: Category;

  constructor(props: Partial<AdminProduct>) {
    const id = props.productId?.toString() || '';
    const createdAt = props.createdAt instanceof Date ? props.createdAt : new Date();
    const updatedAt = props.updatedAt instanceof Date ? props.updatedAt : new Date();
    super(id, createdAt, updatedAt);
    
    Object.assign(this, props);
    this.productName = props.productName || '';
    this.productSlug = props.productSlug || '';
    this.categoryId = props.categoryId || 0;
    this.price = props.price || 0;
  }

  /**
   * Validate product data
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.productName || this.productName.trim().length === 0) {
      errors.push('Tên sản phẩm không được để trống');
    }

    if (this.productName && this.productName.length > 255) {
      errors.push('Tên sản phẩm không được vượt quá 255 ký tự');
    }

    if (!this.categoryId || this.categoryId <= 0) {
      errors.push('Danh mục sản phẩm không hợp lệ');
    }

    if (!this.price || this.price < 0) {
      errors.push('Giá sản phẩm phải lớn hơn 0');
    }

    if (this.salePrice && this.salePrice < 0) {
      errors.push('Giá khuyến mãi không hợp lệ');
    }

    if (this.salePrice && this.salePrice >= this.price) {
      errors.push('Giá khuyến mãi phải nhỏ hơn giá gốc');
    }

    if (this.stockQuantity && this.stockQuantity < 0) {
      errors.push('Số lượng tồn kho không hợp lệ');
    }

    return errors;
  }

  /**
   * Check if product is in stock
   */
  isInStock(): boolean {
    return (this.stockQuantity || 0) > 0;
  }

  /**
   * Check if product needs restock
   */
  needsRestock(): boolean {
    if (!this.minStockLevel) return false;
    return (this.stockQuantity || 0) <= this.minStockLevel;
  }

  /**
   * Update stock quantity
   */
  updateStock(quantity: number): void {
    this.stockQuantity = quantity;
    if (quantity === 0) {
      this.status = 'out_of_stock';
    } else if (this.status === 'out_of_stock') {
      this.status = 'active';
    }
  }

  /**
   * Generate slug from product name
   */
  generateSlug(): string {
    return this.productName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Convert to JSON
   */
  toJSON(): any {
    return {
      product_id: this.productId,
      product_name: this.productName,
      product_slug: this.productSlug,
      category_id: this.categoryId,
      description: this.description,
      short_description: this.shortDescription,
      price: this.price,
      sale_price: this.salePrice,
      stock_quantity: this.stockQuantity,
      min_stock_level: this.minStockLevel,
      piece_count: this.pieceCount,
      difficulty_level: this.difficultyLevel,
      dimensions: this.dimensions,
      weight: this.weight,
      status: this.status,
      is_featured: this.isFeatured,
      is_new: this.isNew,
      is_bestseller: this.isBestseller,
      rating_average: this.ratingAverage,
      rating_count: this.ratingCount,
      sold_count: this.soldCount,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      images: this.images?.map(img => img.toJSON()),
      category: this.category?.toJSON(),
    };
  }
}

/**
 * ProductImage Entity
 */
export class ProductImage extends BaseEntity {
  imageId?: number;
  productId: number;
  imageUrl: string;
  altText?: string;
  isPrimary?: boolean;
  sortOrder?: number;
  altImg1?: string;
  altImg2?: string;
  altImg3?: string;

  constructor(props: Partial<ProductImage>) {
    const id = props.imageId?.toString() || '';
    const createdAt = props.createdAt instanceof Date ? props.createdAt : new Date();
    super(id, createdAt, createdAt);
    
    Object.assign(this, props);
    this.productId = props.productId || 0;
    this.imageUrl = props.imageUrl || '';
  }

  toJSON(): any {
    return {
      image_id: this.imageId,
      product_id: this.productId,
      image_url: this.imageUrl,
      alt_text: this.altText,
      is_primary: this.isPrimary,
      sort_order: this.sortOrder,
      alt_img1: this.altImg1,
      alt_img2: this.altImg2,
      alt_img3: this.altImg3,
      created_at: this.createdAt,
    };
  }
}

/**
 * Category Entity
 */
export class Category extends BaseEntity {
  categoryId?: number;
  categoryName: string;
  categorySlug: string;
  description?: string;
  imageUrl?: string;
  parentCategoryId?: number;
  sortOrder?: number;
  isActive?: boolean;

  constructor(props: Partial<Category>) {
    const id = props.categoryId?.toString() || '';
    const createdAt = props.createdAt instanceof Date ? props.createdAt : new Date();
    super(id, createdAt, createdAt);
    
    Object.assign(this, props);
    this.categoryName = props.categoryName || '';
    this.categorySlug = props.categorySlug || '';
  }

  toJSON(): any {
    return {
      category_id: this.categoryId,
      category_name: this.categoryName,
      category_slug: this.categorySlug,
      description: this.description,
      image_url: this.imageUrl,
      parent_category_id: this.parentCategoryId,
      sort_order: this.sortOrder,
      is_active: this.isActive,
      created_at: this.createdAt,
    };
  }
}
