import { BaseService } from "../../../shared/application/BaseService";
import { Wishlist } from "../domain/Wishlist";
import { IWishlistRepository } from "../domain/IWishlistRepository";

export class WishlistService extends BaseService<Wishlist> {
  constructor(private wishlistRepository: IWishlistRepository) {
    super(wishlistRepository);
  }

  async getUserWishlists(userId: number): Promise<Wishlist[]> {
    return await this.wishlistRepository.findByUserId(userId);
  }

  async addToWishlist(userId: number, productId: number): Promise<Wishlist> {
    // Check if already in wishlist
    const existing = await this.wishlistRepository.findByUserAndProduct(
      userId,
      productId
    );

    if (existing) {
      return existing;
    }

    // Create new wishlist item
    const wishlist = new Wishlist(0, userId, productId, new Date());

    return await this.wishlistRepository.save(wishlist);
  }

  async removeFromWishlist(
    userId: number,
    productId: number
  ): Promise<boolean> {
    return await this.wishlistRepository.deleteByUserAndProduct(
      userId,
      productId
    );
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const wishlist = await this.wishlistRepository.findByUserAndProduct(
      userId,
      productId
    );
    return wishlist !== null;
  }
}
