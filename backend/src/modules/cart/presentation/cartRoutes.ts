/**
 * Cart Routes
 * Presentation Layer - Clean Architecture
 */

import { Router } from "../../../infrastructure/http/Router";
import { CartController } from "./CartController";
import { CartService } from "../application/CartService";
import { CartRepository } from "../infrastructure/repositories/CartRepository";
import { authenticateToken } from "../../../infrastructure/auth/authMiddleware";

// Initialize dependencies
const cartRepository = new CartRepository();
const cartService = new CartService(cartRepository);
const cartController = new CartController(cartService);

// Create router
const router = new Router();

// Cart routes (all require authentication)
router.get("/", authenticateToken, cartController.getCart);
router.post("/", authenticateToken, cartController.addToCart);
router.put("/quantity", authenticateToken, cartController.setQuantityByProduct); // Set absolute quantity
router.put("/:cartId", authenticateToken, cartController.updateCartItem);
router.delete("/:cartId", authenticateToken, cartController.removeFromCart);

// This might conflict with /:cartId, so we need a different path or handle it in controller
// For now, let's use a specific path for clear
router.post("/clear", authenticateToken, cartController.clearCart);

export default router;
