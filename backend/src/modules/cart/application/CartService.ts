/**
 * CartService - Application Service
 * Application Layer - Use Cases
 * Following DDD + Clean Architecture
 */

import { CartItem } from "../domain/entities/CartItem";
import { ICartRepository } from "../domain/repositories/ICartRepository";
import {
  AddToCartCommand,
  UpdateCartItemCommand,
  RemoveFromCartCommand,
  GetCartQuery,
  CartResponse,
} from "./dto/CartDTO";
import { supabaseAdmin } from "../../../config/database";

export class CartService {
  constructor(private readonly cartRepository: ICartRepository) {}

  /**
   * Add product to cart
   */
  async addToCart(command: AddToCartCommand): Promise<CartResponse> {
    try {
      // Validate command
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return CartResponse.failure("Validation failed", validationErrors);
      }

      // Check if product exists and has stock
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("product_id, product_name, stock_quantity, min_stock_level, status")
        .eq("product_id", command.productId)
        .single();

      if (productError || !product) {
        return CartResponse.failure("Product not found");
      }

      if (product.status !== "active") {
        return CartResponse.failure("Product is not available");
      }

      // Check if product is sold out
      if (product.stock_quantity <= product.min_stock_level) {
        return CartResponse.failure("Product is out of stock");
      }

      // Check if requested quantity is available
      const availableStock = product.stock_quantity - product.min_stock_level;
      if (command.quantity > availableStock) {
        return CartResponse.failure(
          `Only ${availableStock} items available in stock`
        );
      }

      // Create cart item
      const cartItem = new CartItem({
        userId: command.userId,
        productId: command.productId,
        quantity: command.quantity,
      });

      // Add or update item in cart
      const savedItem = await this.cartRepository.addOrUpdateItem(cartItem);

      return CartResponse.success(
        savedItem.toJSON(),
        "Product added to cart successfully"
      );
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      return CartResponse.failure(
        error.message || "Failed to add product to cart"
      );
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(command: UpdateCartItemCommand): Promise<CartResponse> {
    try {
      // Validate command
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return CartResponse.failure("Validation failed", validationErrors);
      }

      // Get cart item
      const cartItem = await this.cartRepository.findById(
        command.cartId.toString()
      );

      if (!cartItem) {
        return CartResponse.failure("Cart item not found");
      }

      // Check product stock
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("stock_quantity, min_stock_level, status")
        .eq("product_id", cartItem.productId)
        .single();

      if (productError || !product) {
        return CartResponse.failure("Product not found");
      }

      if (product.status !== "active") {
        return CartResponse.failure("Product is not available");
      }

      const availableStock = product.stock_quantity - product.min_stock_level;
      if (command.quantity > availableStock) {
        return CartResponse.failure(
          `Only ${availableStock} items available in stock`
        );
      }

      // Update quantity
      const updatedItem = await this.cartRepository.updateQuantity(
        command.cartId,
        command.quantity
      );

      return CartResponse.success(
        updatedItem.toJSON(),
        "Cart item updated successfully"
      );
    } catch (error: any) {
      console.error("Error updating cart item:", error);
      return CartResponse.failure(
        error.message || "Failed to update cart item"
      );
    }
  }

  /**
   * Set quantity by product ID (for cart page updates)
   * This sets absolute quantity, not additive
   */
  async setQuantityByProduct(userId: number, productId: number, quantity: number): Promise<CartResponse> {
    try {
      if (userId <= 0 || productId <= 0 || quantity < 1) {
        return CartResponse.failure("Invalid parameters");
      }

      // Check product stock
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("stock_quantity, min_stock_level, status")
        .eq("product_id", productId)
        .single();

      if (productError || !product) {
        return CartResponse.failure("Product not found");
      }

      if (product.status !== "active") {
        return CartResponse.failure("Product is not available");
      }

      const availableStock = product.stock_quantity - product.min_stock_level;
      if (quantity > availableStock) {
        return CartResponse.failure(
          `Only ${availableStock} items available in stock`
        );
      }

      // Set quantity
      const updatedItem = await this.cartRepository.setQuantityByProduct(
        userId,
        productId,
        quantity
      );

      if (!updatedItem) {
        return CartResponse.failure("Cart item not found");
      }

      return CartResponse.success(
        updatedItem.toJSON(),
        "Quantity updated successfully"
      );
    } catch (error: any) {
      console.error("Error setting quantity by product:", error);
      return CartResponse.failure(
        error.message || "Failed to update quantity"
      );
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(command: RemoveFromCartCommand): Promise<CartResponse> {
    try {
      // Validate command
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return CartResponse.failure("Validation failed", validationErrors);
      }

      const result = await this.cartRepository.removeItem(command.cartId);

      if (result) {
        return CartResponse.success(null, "Item removed from cart successfully");
      } else {
        return CartResponse.failure("Failed to remove item from cart");
      }
    } catch (error: any) {
      console.error("Error removing from cart:", error);
      return CartResponse.failure(
        error.message || "Failed to remove item from cart"
      );
    }
  }

  /**
   * Get user cart
   */
  async getUserCart(query: GetCartQuery): Promise<CartResponse> {
    try {
      // Validate query
      const validationErrors = query.validate();
      if (validationErrors.length > 0) {
        return CartResponse.failure("Validation failed", validationErrors);
      }

      const cartItems = await this.cartRepository.findByUserIdWithProducts(
        query.userId
      );

      // Format response
      const formattedItems = cartItems.map((item) => {
        const product = item.products;
        
        // Get primary image or first image from product_images array
        let imageUrl = 'https://via.placeholder.com/150?text=No+Image';
        
        if (product?.product_images && Array.isArray(product.product_images)) {
          // Try to find primary image first
          const primaryImage = product.product_images.find((img: any) => img.is_primary);
          if (primaryImage?.image_url) {
            imageUrl = primaryImage.image_url;
          } else if (product.product_images.length > 0 && product.product_images[0]?.image_url) {
            // Fallback to first image
            imageUrl = product.product_images[0].image_url;
          }
        }

        return {
          cartId: item.cart_id,
          productId: item.product_id,
          productName: product?.product_name || "",
          productSlug: product?.product_slug || "",
          imageUrl: imageUrl,
          price: parseFloat(product?.price || 0),
          salePrice: product?.sale_price ? parseFloat(product.sale_price) : null,
          quantity: item.quantity,
          stockQuantity: product?.stock_quantity || 0,
          minStockLevel: product?.min_stock_level || 0,
          status: product?.status || "inactive",
          addedAt: item.added_at,
        };
      });

      return CartResponse.success(
        {
          items: formattedItems,
          totalItems: formattedItems.length,
        },
        "Cart retrieved successfully"
      );
    } catch (error: any) {
      console.error("Error getting user cart:", error);
      return CartResponse.failure(error.message || "Failed to get cart");
    }
  }

  /**
   * Clear user cart
   */
  async clearCart(userId: number): Promise<CartResponse> {
    try {
      if (!userId || userId <= 0) {
        return CartResponse.failure("Invalid user ID");
      }

      const result = await this.cartRepository.clearUserCart(userId);

      if (result) {
        return CartResponse.success(null, "Cart cleared successfully");
      } else {
        return CartResponse.failure("Failed to clear cart");
      }
    } catch (error: any) {
      console.error("Error clearing cart:", error);
      return CartResponse.failure(error.message || "Failed to clear cart");
    }
  }
}
