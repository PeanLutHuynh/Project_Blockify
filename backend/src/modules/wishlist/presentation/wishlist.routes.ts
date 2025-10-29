import { Router } from "../../../infrastructure/http/Router";
import { WishlistController } from "./WishlistController";
import { WishlistService } from "../application/WishlistService";
import { WishlistRepository } from "../infrastructure/WishlistRepository";
import { authenticateToken } from "../../../infrastructure/auth/authMiddleware";
import { supabase } from "../../../config/database";

const wishlistRepository = new WishlistRepository();
const wishlistService = new WishlistService(wishlistRepository);
const wishlistController = new WishlistController(wishlistService, supabase);

export const wishlistRouter = new Router();

// Get user's wishlists
wishlistRouter.get(
  "/",
  authenticateToken,
  wishlistController.getUserWishlists.bind(wishlistController)
);

// Add to wishlist
wishlistRouter.post(
  "/",
  authenticateToken,
  wishlistController.addToWishlist.bind(wishlistController)
);

// Check if product is in wishlist
wishlistRouter.get(
  "/check/:productId",
  authenticateToken,
  wishlistController.checkWishlist.bind(wishlistController)
);

// Remove from wishlist
wishlistRouter.delete(
  "/:productId",
  authenticateToken,
  wishlistController.removeFromWishlist.bind(wishlistController)
);
