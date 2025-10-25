import { OrderService } from "../../core/services/OrderService.js";

/**
 * Order Controller - Frontend MVC
 * Handles user interactions and updates view
 */
export class OrderController {
  private orderService: OrderService;
  private userId: number | null = null;
  private selectedAddressId: number = 1;

  // DOM Elements
  private orderItemsContainer: HTMLElement | null = null;
  private subtotalElement: HTMLElement | null = null;
  private originalTotalElement: HTMLElement | null = null;
  private discountAmountElement: HTMLElement | null = null;
  private shippingFeeElement: HTMLElement | null = null;
  private grandTotalElement: HTMLElement | null = null;
  private checkoutButton: HTMLElement | null = null;
  private uploadBoxElement: HTMLElement | null = null;
  private paymentMethodRadios: NodeListOf<HTMLInputElement> | null = null;
  private shippingMethodRadios: NodeListOf<HTMLInputElement> | null = null;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Initialize controller
   */
  async init(): Promise<void> {
    try {
      // Get user ID from session/localStorage
      this.userId = this.getUserId();
      if (!this.userId) {
        alert("Vui lòng đăng nhập để tiếp tục");
        window.location.href = "/src/pages/SigninPage.html";
        return;
      }

      // Get DOM elements
      this.bindDOMElements();

      // Load user info
      await this.loadUserInfo();

      // Load cart items
      await this.loadCartItems();

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("Failed to initialize order page:", error);
      alert("Có lỗi xảy ra khi tải trang đặt hàng");
    }
  }

  /**
   * Load user information
   */
  private async loadUserInfo(): Promise<void> {
    try {
      console.log('📝 Loading user info...');
      
      // First try to get from localStorage (faster)
      const userStr = localStorage.getItem("user");
      let user: any = null;
      
      if (userStr) {
        user = JSON.parse(userStr);
        console.log('📦 User from localStorage:', user);
      }

      // If no user in localStorage or missing fields, fetch from backend
      if (!user || !user.fullName || !user.phone || !user.email) {
        console.log('⚠️ Missing user info in localStorage, fetching from backend...');
        if (this.userId) {
          try {
            const response = await this.orderService.getUserInfo(this.userId);
            console.log('📡 User from backend:', response);
            user = response;
            // Update localStorage with fresh data
            localStorage.setItem("user", JSON.stringify(user));
          } catch (error) {
            console.error("❌ Failed to load user from backend:", error);
            // Continue with localStorage data if available
          }
        }
      }

      if (!user) {
        console.error('❌ No user data available');
        // Show error if no user data available
        const nameElement = document.getElementById("customer-name");
        const phoneElement = document.getElementById("customer-phone");
        const emailElement = document.getElementById("customer-email");
        
        if (nameElement) nameElement.textContent = "Không tải được thông tin";
        if (phoneElement) phoneElement.textContent = "Không tải được thông tin";
        if (emailElement) emailElement.textContent = "Không tải được thông tin";
        return;
      }

      console.log('✅ Rendering user info:', {
        fullName: user.fullName,
        phone: user.phone,
        email: user.email
      });

      // Update customer name (fullName from users table - camelCase)
      const nameElement = document.getElementById("customer-name");
      if (nameElement) {
        nameElement.textContent = user.fullName || "Chưa cập nhật";
      }

      // Update phone (phone from users table - camelCase)
      const phoneElement = document.getElementById("customer-phone");
      if (phoneElement) {
        phoneElement.textContent = user.phone || "Chưa cập nhật";
      }

      // Update email (display only, not editable)
      const emailElement = document.getElementById("customer-email");
      if (emailElement) {
        emailElement.textContent = user.email || "Chưa cập nhật";
      }

      // Load addresses from backend
      if (this.userId) {
        try {
          const addresses = await this.orderService.getUserAddresses(this.userId);
          console.log('Loaded addresses:', addresses);
          
          if (addresses && addresses.length > 0) {
            // Find default address or use first one
            const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
            
            const addressElement = document.getElementById("shipping-address");
            if (addressElement) {
              addressElement.textContent = `${defaultAddress.full_address}, ${defaultAddress.ward}, ${defaultAddress.district}, ${defaultAddress.city}`;
            }

            // Store address_id for checkout
            this.selectedAddressId = defaultAddress.address_id;
          } else {
            // No addresses found - show placeholder
            const addressElement = document.getElementById("shipping-address");
            if (addressElement) {
              addressElement.textContent = "Chưa có địa chỉ giao hàng";
              addressElement.style.color = "#999";
            }
          }
        } catch (addressError) {
          console.warn("Could not load addresses:", addressError);
          // Show error but don't crash the page
          const addressElement = document.getElementById("shipping-address");
          if (addressElement) {
            addressElement.textContent = "Không thể tải địa chỉ";
            addressElement.style.color = "#dc3545";
          }
        }
      }
    } catch (error) {
      console.error("Failed to load user info:", error);
    }
  }

  /**
   * Bind DOM elements
   */
  private bindDOMElements(): void {
    this.orderItemsContainer = document.getElementById("order-items");
    this.subtotalElement = document.getElementById("subtotal");
    this.originalTotalElement = document.getElementById("original-total");
    this.discountAmountElement = document.getElementById("discount-amount");
    this.shippingFeeElement = document.getElementById("shipping");
    this.grandTotalElement = document.getElementById("grand-total");
    this.checkoutButton = document.querySelector(".btn-blue.w-100") as HTMLElement;
    this.uploadBoxElement = document.getElementById("upload-box");
    this.paymentMethodRadios = document.querySelectorAll('input[name="pm"]');
    this.shippingMethodRadios = document.querySelectorAll('input[name="shipping"]');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Checkout button
    if (this.checkoutButton) {
      this.checkoutButton.addEventListener("click", () => this.handleCheckout());
    }

    // Payment method selection
    if (this.paymentMethodRadios) {
      this.paymentMethodRadios.forEach((radio) => {
        radio.addEventListener("change", () => this.handlePaymentMethodChange());
      });
    }

    // Shipping method selection
    if (this.shippingMethodRadios) {
      this.shippingMethodRadios.forEach((radio) => {
        radio.addEventListener("change", () => this.handleShippingMethodChange());
      });
    }
  }

  /**
   * Load cart items from backend
   */
  private async loadCartItems(): Promise<void> {
    try {
      if (!this.userId) return;

      // Get items from sessionStorage (selected items from cart)
      const checkoutItemsStr = sessionStorage.getItem('checkoutItems');
      if (!checkoutItemsStr) {
        this.showEmptyCart();
        return;
      }

      const cartItems = JSON.parse(checkoutItemsStr);

      if (cartItems.length === 0) {
        this.showEmptyCart();
        return;
      }

      this.renderCartItems(cartItems);
      this.calculateTotals(cartItems);
    } catch (error) {
      console.error("Failed to load cart items:", error);
      alert("Không thể tải giỏ hàng");
    }
  }

  /**
   * Render cart items in order summary
   */
  private renderCartItems(cartItems: any[]): void {
    if (!this.orderItemsContainer) return;

    const html = cartItems
      .map((item) => {
        // Use sale price if available, otherwise use regular price
        const price = item.salePrice || item.price;
        const totalPrice = price * item.quantity;
        
        return `
          <div class="d-flex justify-content-between mb-2">
            <span>${item.productName} x ${item.quantity}</span>
            <span>${this.formatPrice(totalPrice)}</span>
          </div>
        `;
      })
      .join("");

    this.orderItemsContainer.innerHTML = html;
  }

  /**
   * Calculate and display totals
   */
  private calculateTotals(cartItems: any[]): void {
    // Calculate original total (using regular price)
    const originalTotal = cartItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate subtotal using sale price if available
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.salePrice || item.price;
      return sum + (price * item.quantity);
    }, 0);

    // Calculate discount amount
    const discountAmount = originalTotal - subtotal;

    const shippingFee = this.getSelectedShippingFee();
    const grandTotal = subtotal + shippingFee;

    // Update UI
    if (this.originalTotalElement) {
      this.originalTotalElement.textContent = this.formatPrice(originalTotal);
    }

    if (this.discountAmountElement) {
      this.discountAmountElement.textContent = discountAmount > 0 
        ? `-${this.formatPrice(discountAmount)}` 
        : this.formatPrice(0);
    }

    if (this.subtotalElement) {
      this.subtotalElement.textContent = this.formatPrice(subtotal);
    }

    if (this.shippingFeeElement) {
      this.shippingFeeElement.textContent = this.formatPrice(shippingFee);
    }

    if (this.grandTotalElement) {
      this.grandTotalElement.textContent = this.formatPrice(grandTotal);
    }
  }

  /**
   * Handle checkout button click
   */
  private async handleCheckout(): Promise<void> {
    try {
      if (!this.userId) {
        alert("Vui lòng đăng nhập");
        return;
      }

      // Validate form
      if (!this.validateCheckoutForm()) {
        return;
      }

      // Get form data
      const checkoutData = this.getCheckoutFormData();

      // Show loading
      this.setLoading(true);

      // Create order
      const order = await this.orderService.checkout(checkoutData);

      // Clear checkout items from sessionStorage
      sessionStorage.removeItem('checkoutItems');

      // Show success message
      alert(`Đặt hàng thành công! Mã đơn hàng: ${order.orderNumber}`);

      // Redirect to order confirmation or user orders page
      window.location.href = `/src/pages/OrderConfirmation.html?orderNumber=${order.orderNumber}`;
    } catch (error: any) {
      console.error("Checkout failed:", error);
      alert(`Đặt hàng thất bại: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Validate checkout form
   */
  private validateCheckoutForm(): boolean {
    // Check payment method
    const paymentMethod = this.getSelectedPaymentMethod();
    if (!paymentMethod) {
      alert("Vui lòng chọn phương thức thanh toán");
      return false;
    }

    // Check shipping method
    const shippingMethod = this.getSelectedShippingMethod();
    if (!shippingMethod) {
      alert("Vui lòng chọn phương thức vận chuyển");
      return false;
    }

    // TODO: Validate other fields (address, phone, etc.)

    return true;
  }

  /**
   * Get checkout form data
   */
  private getCheckoutFormData(): any {
    const notesTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
    
    // Get items from sessionStorage
    const checkoutItemsStr = sessionStorage.getItem('checkoutItems');
    const cartItems = checkoutItemsStr ? JSON.parse(checkoutItemsStr) : [];

    // Map cart items to order items with sale price
    const items = cartItems.map((item: any) => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.salePrice || item.price, // Use sale price if available
    }));

    // Calculate totals
    const subtotal = cartItems.reduce((sum: number, item: any) => {
      const price = item.salePrice || item.price;
      return sum + (price * item.quantity);
    }, 0);

    const shippingFee = this.getSelectedShippingFee();
    const total = subtotal + shippingFee;

    return {
      user_id: this.userId,
      address_id: this.selectedAddressId, // Use loaded address
      payment_method: this.getSelectedPaymentMethod(),
      shipping_method: this.getSelectedShippingMethod(),
      shipping_fee: shippingFee,
      subtotal: subtotal,
      total: total,
      notes: notesTextarea?.value || undefined,
      items: items,
    };
  }

  /**
   * Get selected payment method
   */
  private getSelectedPaymentMethod(): string | null {
    if (!this.paymentMethodRadios) return null;

    for (const radio of this.paymentMethodRadios) {
      if (radio.checked) {
        // Get value attribute directly (cod, bank_transfer, momo, zalopay, vnpay)
        return radio.value || null;
      }
    }

    return null;
  }

  /**
   * Get selected shipping method
   */
  private getSelectedShippingMethod(): "standard" | "fast" | null {
    if (!this.shippingMethodRadios) return null;

    for (const radio of this.shippingMethodRadios) {
      if (radio.checked) {
        const id = radio.id;
        if (id === "standard") return "standard";
        if (id === "fast") return "fast";
      }
    }

    return null;
  }

  /**
   * Get selected shipping fee
   */
  private getSelectedShippingFee(): number {
    const method = this.getSelectedShippingMethod();
    return method === "fast" ? 30000 : 15000;
  }

  /**
   * Handle payment method change
   */
  private handlePaymentMethodChange(): void {
    const selectedMethod = this.getSelectedPaymentMethod();
    
    // Show upload box for non-COD payments
    if (this.uploadBoxElement) {
      if (selectedMethod && selectedMethod !== 'cod') {
        this.uploadBoxElement.classList.remove('d-none');
      } else {
        this.uploadBoxElement.classList.add('d-none');
      }
    }
  }

  /**
   * Handle shipping method change
   */
  private handleShippingMethodChange(): void {
    // Recalculate totals when shipping method changes
    // We need to reload cart items to recalculate
    this.loadCartItems();
  }

  /**
   * Show empty cart message
   */
  private showEmptyCart(): void {
    if (this.orderItemsContainer) {
      this.orderItemsContainer.innerHTML = `
        <div class="text-center py-4">
          <p>Giỏ hàng trống</p>
          <a href="/src/pages/HomePage.html" class="btn btn-primary">Tiếp tục mua sắm</a>
        </div>
      `;
    }
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    if (this.checkoutButton) {
      this.checkoutButton.textContent = loading ? "Đang xử lý..." : "Thanh Toán Ngay";
      (this.checkoutButton as HTMLButtonElement).disabled = loading;
    }
  }

  /**
   * Format price in VND
   */
  private formatPrice(price: number): string {
    return price.toLocaleString("vi-VN") + " VND";
  }

  /**
   * Get user ID from session/localStorage
   */
  private getUserId(): number | null {
    // TODO: Get from actual session/auth service
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.user_id || user.id;
    }
    return null;
  }
}
