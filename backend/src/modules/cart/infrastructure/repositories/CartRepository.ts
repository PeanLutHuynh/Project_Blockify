import { BaseRepository } from "../../../../shared/infrastructure/BaseRepository";
import { CartItem } from "../../domain/entities/CartItem";
import { ICartRepository } from "../../domain/repositories/ICartRepository";
import { supabaseAdmin } from "../../../../config/database";

/**
 * Cart Repository Implementation using Supabase SDK
 * Infrastructure Layer - Clean Architecture
 */
export class CartRepository
  extends BaseRepository<CartItem>
  implements ICartRepository
{
  protected tableName = "cart_items";

  constructor() {
    super("cart_items");
  }

  async findByUserId(userId: number): Promise<CartItem[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("user_id", userId)
        .order("added_at", { ascending: false });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      console.error("Error finding cart items by user ID:", error);
      throw error;
    }
  }

  async findByUserAndProduct(
    userId: number,
    productId: number,
  ): Promise<CartItem | null> {
    try {
      let query = supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("user_id", userId)
        .eq("product_id", productId);

      const { data, error } = await query.single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      console.error("Error finding cart item by user and product:", error);
      throw error;
    }
  }

  async addOrUpdateItem(cartItem: CartItem): Promise<CartItem> {
    try {
      // Check if item already exists
      const existing = await this.findByUserAndProduct(
        cartItem.userId,
        cartItem.productId,
      );

      if (existing) {
        // Add to existing quantity (for "Add to Cart" button clicks)
        const newQuantity = existing.quantity + cartItem.quantity;
        return await this.updateQuantity(existing.cartId, newQuantity);
      } else {
        // Insert new item
        const { data, error } = await supabaseAdmin
          .from(this.tableName)
          .insert([
            {
              user_id: cartItem.userId,
              product_id: cartItem.productId,
              quantity: cartItem.quantity,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        return this.mapToEntity(data);
      }
    } catch (error) {
      console.error("Error adding/updating cart item:", error);
      throw error;
    }
  }

  /**
   * Set quantity for existing item (absolute value, not additive)
   * Used for cart page quantity updates
   */
  async setQuantityByProduct(userId: number, productId: number, quantity: number): Promise<CartItem | null> {
    try {
      const existing = await this.findByUserAndProduct(userId, productId);
      
      if (!existing) {
        return null;
      }

      return await this.updateQuantity(existing.cartId, quantity);
    } catch (error) {
      console.error("Error setting quantity by product:", error);
      throw error;
    }
  }

  async updateQuantity(cartId: number, quantity: number): Promise<CartItem> {
    try {
      const { data, error} = await supabaseAdmin
        .from(this.tableName)
        .update({ quantity })
        .eq("cart_id", cartId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      console.error("Error updating cart item quantity:", error);
      throw error;
    }
  }

  async removeItem(cartId: number): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .delete()
        .eq("cart_id", cartId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error removing cart item:", error);
      throw error;
    }
  }

  async clearUserCart(userId: number): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from(this.tableName)
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error clearing user cart:", error);
      throw error;
    }
  }

  async findByUserIdWithProducts(userId: number): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select(
          `
          *,
          products:product_id (
            product_id,
            product_name,
            product_slug,
            price,
            sale_price,
            stock_quantity,
            min_stock_level,
            status,
            product_images (
              image_url,
              is_primary
            )
          )
        `
        )
        .eq("user_id", userId)
        .order("added_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error finding cart items with products:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<CartItem | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .eq("cart_id", parseInt(id))
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return data ? this.mapToEntity(data) : null;
    } catch (error) {
      console.error("Error finding cart item by ID:", error);
      throw error;
    }
  }

  async findAll(): Promise<CartItem[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select("*")
        .order("added_at", { ascending: false });

      if (error) throw error;

      return data ? data.map((item) => this.mapToEntity(item)) : [];
    } catch (error) {
      console.error("Error finding all cart items:", error);
      throw error;
    }
  }

  async create(entity: CartItem): Promise<CartItem> {
    return await this.addOrUpdateItem(entity);
  }

  async update(id: string, entity: CartItem): Promise<CartItem> {
    return await this.updateQuantity(parseInt(id), entity.quantity);
  }

  async delete(id: string): Promise<boolean> {
    return await this.removeItem(parseInt(id));
  }

  protected mapToEntity(data: any): CartItem {
    return new CartItem({
      cartId: data.cart_id,
      userId: data.user_id,
      productId: data.product_id,
      quantity: data.quantity,
      addedAt: new Date(data.added_at),
      createdAt: new Date(data.added_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    });
  }

  protected mapFromEntity(entity: CartItem | Partial<CartItem>): any {
    const item = entity as CartItem;
    const mapped: any = {};

    if (item.userId !== undefined) mapped.user_id = item.userId;
    if (item.productId !== undefined) mapped.product_id = item.productId;
    if (item.quantity !== undefined) mapped.quantity = item.quantity;
    return mapped;
  }
}
