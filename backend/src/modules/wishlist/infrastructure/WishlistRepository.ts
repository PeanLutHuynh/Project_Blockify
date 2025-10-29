import { supabase } from "../../../config/database";
import { BaseRepository } from "../../../shared/infrastructure/BaseRepository";
import { Wishlist } from "../domain/Wishlist";
import { IWishlistRepository } from "../domain/IWishlistRepository";

export class WishlistRepository
  extends BaseRepository<Wishlist>
  implements IWishlistRepository
{
  constructor() {
    super("wishlists");
  }

  protected getIdColumn(): string {
    return 'wishlist_id';
  }

  protected mapToEntity(data: any): Wishlist {
    return new Wishlist(
      data.wishlist_id,
      data.user_id,
      data.product_id,
      new Date(data.added_at)
    );
  }

  protected mapFromEntity(entity: Wishlist | Partial<Wishlist>): any {
    const wishlist = entity as Wishlist;
    const data: any = {
      user_id: wishlist.userId,
      product_id: wishlist.productId,
      added_at: wishlist.addedAt?.toISOString(),
    };
    
    // Only include wishlist_id if it's not 0 (for updates, not inserts)
    if (wishlist.wishlistId && wishlist.wishlistId > 0) {
      data.wishlist_id = wishlist.wishlistId;
    }
    
    return data;
  }

  async findByUserId(userId: number): Promise<Wishlist[]> {
    console.log(`🔍 [WishlistRepository] Querying wishlists table for user_id = ${userId}`);
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });

    console.log(`📊 [WishlistRepository] Query result:`, { 
      rowCount: data?.length || 0, 
      error: error?.message,
      data: data
    });

    if (error) {
      console.error(`❌ [WishlistRepository] Error:`, error);
      throw new Error(`Error fetching wishlists: ${error.message}`);
    }

    return data ? data.map((item) => this.mapToEntity(item)) : [];
  }

  async findByUserAndProduct(
    userId: number,
    productId: number
  ): Promise<Wishlist | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Error fetching wishlist: ${error.message}`);
    }

    return data ? this.mapToEntity(data) : null;
  }

  async deleteByUserAndProduct(
    userId: number,
    productId: number
  ): Promise<boolean> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);

    if (error) {
      throw new Error(`Error deleting wishlist: ${error.message}`);
    }

    return true;
  }
}
