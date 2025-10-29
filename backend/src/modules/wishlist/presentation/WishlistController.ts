import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { WishlistService } from "../application/WishlistService";
import { ResponseUtil } from "../../../utils/response.util";

export class WishlistController {
  constructor(
    private wishlistService: WishlistService,
    private supabase: any
  ) {}

  /**
   * Helper to get userId from authUid (for Supabase auth users)
   */
  private async getUserIdFromAuthUid(authUid: string): Promise<number | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('user_id')
        .eq('auth_uid', authUid)
        .single();

      if (error || !data) {
        console.error('❌ Error getting userId from authUid:', error);
        return null;
      }

      return data.user_id;
    } catch (error) {
      console.error('❌ Exception getting userId from authUid:', error);
      return null;
    }
  }

  /**
   * Helper to extract userId from authenticated request
   */
  private async getUserId(req: HttpRequest): Promise<number | null> {
    const user = (req as any).user;
    
    if (!user) {
      console.error('❌ No user in request');
      return null;
    }

    console.log('🔍 User object:', { userId: user.userId, user_id: user.user_id, id: user.id, authUid: user.authUid });

    // Try different property names that authMiddleware might set
    if (user.userId) {
      return user.userId;
    }

    if (user.user_id) {
      return user.user_id;
    }

    if (user.id) {
      return user.id;
    }

    // If authUid is set (Supabase auth), query database
    if (user.authUid) {
      return await this.getUserIdFromAuthUid(user.authUid);
    }

    console.error('❌ Could not extract userId from user object');
    return null;
  }

  async getUserWishlists(
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> {
    try {
      const userId = await this.getUserId(req);

      if (!userId) {
        console.error('❌ [getUserWishlists] User ID not found');
        ResponseUtil.unauthorized(res, "Unauthorized - User not found");
        return;
      }

      console.log(`✅ [getUserWishlists] Getting wishlists for userId: ${userId}`);
      const wishlists = await this.wishlistService.getUserWishlists(userId);
      console.log(`🔍 [getUserWishlists] Found ${wishlists.length} wishlist items in database for userId ${userId}`);
      
      // Fetch product details for each wishlist item
      const wishlistsWithProducts = await Promise.all(
        wishlists.map(async (wishlist) => {
          try {
            // Query product with images using LEFT JOIN
            const { data: productData, error } = await this.supabase
              .from('products')
              .select(`
                product_id,
                product_name,
                product_slug,
                description,
                price,
                sale_price,
                stock_quantity,
                piece_count,
                rating_average,
                category_id,
                product_images (
                  image_url,
                  is_primary
                )
              `)
              .eq('product_id', wishlist.productId)
              .single();

            if (error || !productData) {
              console.warn(`⚠️ Product ${wishlist.productId} not found:`, error?.message);
              return null;
            }

            // Get primary image or first image
            const images = productData.product_images || [];
            const primaryImage = images.find((img: any) => img.is_primary);
            const imageUrl = primaryImage?.image_url || images[0]?.image_url || '';
            
            console.log(`✅ Product ${wishlist.productId}:`, {
              name: productData.product_name,
              slug: productData.product_slug,
              imageUrl: imageUrl
            });

            return {
              ...wishlist.toJSON(),
              product: {
                product_id: productData.product_id,
                name: productData.product_name,
                slug: productData.product_slug,
                description: productData.description,
                price: productData.price,
                sale_price: productData.sale_price,
                image_url: imageUrl,
                stock_quantity: productData.stock_quantity,
                piece_count: productData.piece_count,
                rating: productData.rating_average,
                category_id: productData.category_id
              }
            };
          } catch (err) {
            console.error(`❌ Error fetching product ${wishlist.productId}:`, err);
            return null;
          }
        })
      );

      // Filter out null values (products not found)
      const validWishlists = wishlistsWithProducts.filter(item => item !== null);

      console.log(`✅ [getUserWishlists] Returning ${validWishlists.length} wishlist items with products`);
      ResponseUtil.success(res, validWishlists, "Wishlists retrieved successfully");
    } catch (error: any) {
      console.error('❌ Error in getUserWishlists:', error);
      ResponseUtil.internalError(res, "Failed to retrieve wishlists", error.message);
    }
  }

  async addToWishlist(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const userId = await this.getUserId(req);
      const { productId } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res, "Unauthorized - User not found");
        return;
      }

      if (!productId) {
        ResponseUtil.badRequest(res, "Product ID is required");
        return;
      }

      console.log(`✅ Adding product ${productId} to wishlist for userId: ${userId}`);
      const wishlist = await this.wishlistService.addToWishlist(
        userId,
        parseInt(productId)
      );
      ResponseUtil.created(res, wishlist, "Added to wishlist successfully");
    } catch (error: any) {
      console.error('❌ Error in addToWishlist:', error);
      ResponseUtil.internalError(res, "Failed to add to wishlist", error.message);
    }
  }

  async removeFromWishlist(
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> {
    try {
      const userId = await this.getUserId(req);
      const { productId } = req.params;

      if (!userId) {
        ResponseUtil.unauthorized(res, "Unauthorized - User not found");
        return;
      }

      if (!productId) {
        ResponseUtil.badRequest(res, "Product ID is required");
        return;
      }

      console.log(`✅ Removing product ${productId} from wishlist for userId: ${userId}`);
      await this.wishlistService.removeFromWishlist(
        userId,
        parseInt(productId)
      );
      ResponseUtil.success(res, { message: "Removed from wishlist" }, "Removed from wishlist successfully");
    } catch (error: any) {
      console.error('❌ Error in removeFromWishlist:', error);
      ResponseUtil.internalError(res, "Failed to remove from wishlist", error.message);
    }
  }

  async checkWishlist(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const userId = await this.getUserId(req);
      const { productId } = req.params;

      if (!userId) {
        ResponseUtil.unauthorized(res, "Unauthorized - User not found");
        return;
      }

      if (!productId) {
        ResponseUtil.badRequest(res, "Product ID is required");
        return;
      }

      const isInWishlist = await this.wishlistService.isInWishlist(
        userId,
        parseInt(productId)
      );
      ResponseUtil.success(res, { isInWishlist }, "Wishlist status retrieved");
    } catch (error: any) {
      console.error('❌ Error in checkWishlist:', error);
      ResponseUtil.internalError(res, "Failed to check wishlist", error.message);
    }
  }
}
