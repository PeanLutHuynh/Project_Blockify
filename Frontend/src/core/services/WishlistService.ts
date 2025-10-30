import { httpClient } from "../api/FetchHttpClient.js";

export interface WishlistItem {
  wishlist_id: number;
  user_id: number;
  product_id: number;
  added_at: string;
  product?: {
    product_id: number;
    name: string;
    slug: string;
    description: string;
    price: number;
    sale_price: number;
    image_url: string;
    stock_quantity: number;
    piece_count: number;
    rating: number;
    category_id: number;
  };
}

export class WishlistService {
  private baseUrl = "/api/v1/wishlist";

  /**
   * Get user's wishlist
   */
  async getUserWishlist(): Promise<WishlistItem[]> {
    try {
      console.log('🔍 [WishlistService] Getting user wishlist...');
      const response = await httpClient.get<WishlistItem[]>(this.baseUrl);
      console.log('✅ [WishlistService] Wishlist response:', response);
      return response.data || [];
    } catch (error) {
      console.error("❌ [WishlistService] Error fetching wishlist:", error);
      throw error;
    }
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(productId: number): Promise<WishlistItem> {
    try {
      console.log(`➕ [WishlistService] Adding product ${productId} to wishlist...`);
      
      // Debug: Check if token exists
      const token = localStorage.getItem('blockify_auth_token');
      console.log('🔑 [WishlistService] Auth token exists:', !!token);
      console.log('🔑 [WishlistService] Token preview:', token?.substring(0, 50) + '...');
      
      const response = await httpClient.post<WishlistItem>(
        this.baseUrl,
        { productId }
      );
      console.log('✅ [WishlistService] Add response:', response);
      return response.data!;
    } catch (error) {
      console.error("❌ [WishlistService] Error adding to wishlist:", error);
      throw error;
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(productId: number): Promise<void> {
    try {
      console.log(`➖ [WishlistService] Removing product ${productId} from wishlist...`);
      await httpClient.delete(`${this.baseUrl}/${productId}`);
      console.log('✅ [WishlistService] Removed successfully');
    } catch (error) {
      console.error("❌ [WishlistService] Error removing from wishlist:", error);
      throw error;
    }
  }

  /**
   * Check if product is in wishlist
   */
  async isInWishlist(productId: number): Promise<boolean> {
    try {
      const response = await httpClient.get<{ isInWishlist: boolean }>(
        `${this.baseUrl}/check/${productId}`
      );
      return response.data?.isInWishlist || false;
    } catch (error) {
      console.error("Error checking wishlist:", error);
      return false;
    }
  }

  /**
   * Toggle wishlist status for a product
   */
  async toggleWishlist(productId: number): Promise<boolean> {
    try {
      const isInWishlist = await this.isInWishlist(productId);

      if (isInWishlist) {
        await this.removeFromWishlist(productId);
        return false;
      } else {
        await this.addToWishlist(productId);
        return true;
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      throw error;
    }
  }

  /**
   * Get wishlist count
   */
  async getWishlistCount(): Promise<number> {
    try {
      const wishlist = await this.getUserWishlist();
      return wishlist.length;
    } catch (error) {
      console.error("Error getting wishlist count:", error);
      return 0;
    }
  }
}
