/**
 * CartController - Presentation Layer
 * Following Clean Architecture
 */

import { HttpRequest, HttpResponse } from "../../../infrastructure/http/types";
import { CartService } from "../application/CartService";
import {
  AddToCartCommand,
  UpdateCartItemCommand,
  RemoveFromCartCommand,
  GetCartQuery,
} from "../application/dto/CartDTO";
import { supabaseAdmin } from "../../../config/database";

export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Helper to get userId from authUid (for Supabase auth users)
   */
  private async getUserIdFromAuthUid(authUid: string): Promise<number | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('auth_uid', authUid)
        .single();

      if (error || !data) {
        return null;
      }

      return data.user_id;
    } catch (error) {
      console.error('Error getting userId from authUid:', error);
      return null;
    }
  }

  /**
   * Helper to extract userId from authenticated request
   */
  private async getUserId(req: HttpRequest): Promise<number | null> {
    const user = (req as any).user;
    
    if (!user) {
      return null;
    }

    // If userId is already set (backend JWT), use it
    if (user.userId) {
      return user.userId;
    }

    // If authUid is set (Supabase auth), query database
    if (user.authUid) {
      return await this.getUserIdFromAuthUid(user.authUid);
    }

    return null;
  }

  private sendSuccess(
    res: HttpResponse,
    statusCode: number,
    data: any,
    message: string
  ): void {
    res.status(statusCode).json({
      success: true,
      data,
      message,
    });
  }

  private sendError(
    res: HttpResponse,
    statusCode: number,
    message: string,
    errors?: any
  ): void {
    res.status(statusCode).json({
      success: false,
      error: {
        code:
          statusCode === 401
            ? "UNAUTHORIZED"
            : statusCode === 400
            ? "BAD_REQUEST"
            : "ERROR",
        message,
        errors,
      },
    });
  }

  /**
   * Add product to cart
   * POST /api/cart
   */
  public addToCart = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const body = req.body as any;
      const userId = await this.getUserId(req);

      if (!userId) {
        this.sendError(res, 401, "Unauthorized - User not found");
        return;
      }

      const command = new AddToCartCommand(
        userId,
        body.productId,
        body.quantity || 1,
      );

      const result = await this.cartService.addToCart(command);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        const statusCode = result.errors ? 400 : 500;
        this.sendError(res, statusCode, result.message, result.errors);
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to add to cart");
    }
  };

  /**
   * Get user cart
   * GET /api/cart
   */
  public getCart = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const userId = await this.getUserId(req);

      if (!userId) {
        this.sendError(res, 401, "Unauthorized - User not found");
        return;
      }

      const query = new GetCartQuery(userId);
      const result = await this.cartService.getUserCart(query);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        this.sendError(res, 500, result.message, result.errors);
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to get cart");
    }
  };

  /**
   * Update cart item quantity
   * PUT /api/cart/:cartId
   */
  public updateCartItem = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const userId = await this.getUserId(req);

      if (!userId) {
        this.sendError(res, 401, "Unauthorized - User not found");
        return;
      }

      const cartId = parseInt(req.params?.cartId || "0");
      const body = req.body as any;

      const command = new UpdateCartItemCommand(cartId, body.quantity);
      const result = await this.cartService.updateCartItem(command);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        const statusCode = result.errors ? 400 : 500;
        this.sendError(res, statusCode, result.message, result.errors);
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to update cart item");
    }
  };

  /**
   * Remove item from cart
   * DELETE /api/cart/:cartId
   */
  public removeFromCart = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const userId = await this.getUserId(req);

      if (!userId) {
        this.sendError(res, 401, "Unauthorized - User not found");
        return;
      }

      const cartId = parseInt(req.params?.cartId || "0");

      const command = new RemoveFromCartCommand(cartId);
      const result = await this.cartService.removeFromCart(command);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        this.sendError(res, 500, result.message, result.errors);
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to remove from cart");
    }
  };

  /**
   * Clear user cart
   * DELETE /api/cart
   */
  public clearCart = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const userId = await this.getUserId(req);

      if (!userId) {
        this.sendError(res, 401, "Unauthorized - User not found");
        return;
      }

      const result = await this.cartService.clearCart(userId);

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        this.sendError(res, 500, result.message, result.errors);
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to clear cart");
    }
  };

  /**
   * Set quantity by product ID (for cart page updates)
   * PUT /api/cart/quantity
   */
  public setQuantityByProduct = async (
    req: HttpRequest,
    res: HttpResponse
  ): Promise<void> => {
    try {
      const userId = await this.getUserId(req);

      if (!userId) {
        this.sendError(res, 401, "Unauthorized - User not found");
        return;
      }

      const body = req.body as any;
      const productId = parseInt(body.productId || "0");
      const quantity = parseInt(body.quantity || "0");

      if (productId <= 0 || quantity < 1) {
        this.sendError(res, 400, "Invalid productId or quantity");
        return;
      }

      const result = await this.cartService.setQuantityByProduct(
        userId,
        productId,
        quantity
      );

      if (result.success) {
        this.sendSuccess(res, 200, result.data, result.message);
      } else {
        const statusCode = result.errors ? 400 : 500;
        this.sendError(res, statusCode, result.message, result.errors);
      }
    } catch (error: any) {
      this.sendError(res, 500, error.message || "Failed to set quantity");
    }
  };
}
