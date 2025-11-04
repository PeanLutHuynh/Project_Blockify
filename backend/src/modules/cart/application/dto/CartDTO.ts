/**
 * Cart DTOs (Commands and Responses)
 * Application Layer - Clean Architecture
 */

export class AddToCartCommand {
  constructor(
    public readonly userId: number,
    public readonly productId: number,
    public readonly quantity: number = 1,
  ) {
    this.validate();
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.userId || this.userId <= 0) {
      errors.push("User ID is required");
    }

    if (!this.productId || this.productId <= 0) {
      errors.push("Product ID is required");
    }

    if (this.quantity < 1) {
      errors.push("Quantity must be at least 1");
    }

    return errors;
  }
}

export class UpdateCartItemCommand {
  constructor(
    public readonly cartId: number,
    public readonly quantity: number
  ) {
    this.validate();
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.cartId || this.cartId <= 0) {
      errors.push("Cart ID is required");
    }

    if (this.quantity < 1) {
      errors.push("Quantity must be at least 1");
    }

    return errors;
  }
}

export class RemoveFromCartCommand {
  constructor(public readonly cartId: number) {
    this.validate();
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.cartId || this.cartId <= 0) {
      errors.push("Cart ID is required");
    }

    return errors;
  }
}

export class GetCartQuery {
  constructor(public readonly userId: number) {
    this.validate();
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.userId || this.userId <= 0) {
      errors.push("User ID is required");
    }

    return errors;
  }
}

export class CartResponse {
  constructor(
    public readonly success: boolean,
    public readonly message: string,
    public readonly data?: any,
    public readonly errors?: string[]
  ) {}

  public static success(data: any, message: string = "Success"): CartResponse {
    return new CartResponse(true, message, data);
  }

  public static failure(message: string, errors?: string[]): CartResponse {
    return new CartResponse(false, message, undefined, errors);
  }
}
