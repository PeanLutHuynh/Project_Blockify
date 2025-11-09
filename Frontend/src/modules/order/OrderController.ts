import { OrderService } from "../../core/services/OrderService.js";
import { AuthService } from "../../core/services/AuthService.js";
import { PaymentProofService } from "../../core/services/PaymentProofService.js";
import { PaymentQR } from "../../core/models/PaymentQR.js";
import { cartService } from "../../core/services/CartService.js";
import { CartItem } from "../../core/models/Cart.js";

/**
 * Order Controller - Frontend MVC
 * Handles user interactions and updates view
 */
export class OrderController {
  private orderService: OrderService;
  private authService: AuthService;
  private paymentProofService: PaymentProofService;
  private userId: number | null = null;
  private selectedAddressId: number = 1;
  // ⚠️ COMMENTED OUT: Old flow - manual payment proof file
  // private selectedFile: File | null = null;

  // DOM Elements
  private orderItemsContainer: HTMLElement | null = null;
  private subtotalElement: HTMLElement | null = null;
  private originalTotalElement: HTMLElement | null = null;
  private discountAmountElement: HTMLElement | null = null;
  private shippingFeeElement: HTMLElement | null = null;
  private grandTotalElement: HTMLElement | null = null;
  private checkoutButton: HTMLElement | null = null;
  private uploadBoxElement: HTMLElement | null = null;
  // ⚠️ COMMENTED OUT: Old flow properties - manual payment proof upload
  // private paymentProofInput: HTMLInputElement | null = null;
  // private uploadPreviewElement: HTMLElement | null = null;
  private paymentMethodRadios: NodeListOf<HTMLInputElement> | null = null;
  private shippingMethodRadios: NodeListOf<HTMLInputElement> | null = null;

  constructor() {
    this.orderService = new OrderService();
    this.authService = new AuthService();
    this.paymentProofService = new PaymentProofService();
  }

  /**
   * Initialize controller
   */
  async init(): Promise<void> {
    try {
      // Get user ID from session/localStorage
      console.log('🔍 [OrderController] Checking authentication...');
      this.userId = this.getUserId();
      console.log('🔍 [OrderController] UserId:', this.userId);
      
      if (!this.userId) {
        console.error('❌ [OrderController] No user ID found - redirecting to sign in');
        alert("Vui lòng đăng nhập để tiếp tục");
        window.location.href = "/pages/SigninPage.html";
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
    // ⚠️ COMMENTED OUT: Old flow - manual payment proof upload elements
    // this.paymentProofInput = document.getElementById("payment-proof") as HTMLInputElement;
    // this.uploadPreviewElement = document.getElementById("upload-preview");
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

    // Payment proof file input
    // ⚠️ COMMENTED OUT: Old flow - manual upload proof before checkout
    // New flow: Auto-verify payment via webhook, no manual upload needed
    /*
    if (this.paymentProofInput) {
      this.paymentProofInput.addEventListener("change", () => this.handleFileSelect());
    }
    */

    // Show QR button - COMMENTED OUT: Old flow
    // this.setupQRButtonListener();
  }

  /**
   * Load cart items from backend
   */
  private async loadCartItems(): Promise<void> {
    try {
      if (!this.userId) return;

      // Get items from sessionStorage (selected items from cart or direct buy)
      const checkoutItemsStr = sessionStorage.getItem('checkoutItems');
      const checkoutSource = sessionStorage.getItem('checkoutSource') || 'cart';
      
      if (!checkoutItemsStr) {
        this.showEmptyCart();
        return;
      }

      const cartItems = JSON.parse(checkoutItemsStr);

      if (cartItems.length === 0) {
        this.showEmptyCart();
        return;
      }

      // Add visual indicator for Buy Now
      if (checkoutSource === 'buyNow') {
        this.showBuyNowIndicator();
      }

      this.renderCartItems(cartItems);
      this.calculateTotals(cartItems);
    } catch (error) {
      console.error("Failed to load cart items:", error);
      alert("Không thể tải giỏ hàng");
    }
  }

  /**
   * Show Buy Now indicator
   * FIXED: Check if indicator already exists to prevent duplicates
   */
  private showBuyNowIndicator(): void {
    const orderSummaryCard = document.querySelector('.order-summary');
    if (orderSummaryCard) {
      // Check if indicator already exists
      const existingIndicator = orderSummaryCard.querySelector('.buy-now-indicator');
      if (existingIndicator) {
        return; // Don't create duplicate
      }

      const indicator = document.createElement('div');
      indicator.className = 'alert alert-info mb-3 buy-now-indicator'; // Add unique class
      indicator.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="bi bi-lightning-charge-fill me-2"></i>
          <span>Mua ngay - Thanh toán nhanh</span>
        </div>
      `;
      orderSummaryCard.insertBefore(indicator, orderSummaryCard.firstChild);
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

    const shippingFee = this.getSelectedShippingFee(subtotal); // Pass subtotal sau giảm giá
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

      console.log('✅ Order created:', order.orderNumber);

      // ✅ Show QR and auto-verification for ALL non-COD payment methods
      if (checkoutData.payment_method !== 'cod') {
        this.setLoading(false);
        // ⚠️ IMPORTANT: KHÔNG xóa sessionStorage ở đây
        // Chỉ xóa sau khi thanh toán thành công (trong showPaymentWaitingModal)
        this.showPaymentWaitingModal(order.orderNumber, order.totalAmount);
        return; // Don't redirect yet, wait for payment confirmation
      }

      /* ⚠️ COMMENTED OUT: Old flow - Manual payment proof upload
       * New flow: Automatic verification via webhook after payment
       *
      // Upload payment proof if file selected and non-COD payment
      if (this.selectedFile && checkoutData.payment_method !== 'cod') {
        try {
          await this.paymentProofService.uploadPaymentProof({
            orderId: order.orderId,
            userId: this.userId,
            file: this.selectedFile,
            note: `Minh chứng thanh toán cho đơn hàng ${order.orderNumber}`
          });
          console.log('✅ Payment proof uploaded successfully');
        } catch (proofError: any) {
          console.error('⚠️ Failed to upload payment proof:', proofError);
          // Don't block the checkout flow if proof upload fails
          // Order is already created, just notify user
          alert(`Đơn hàng đã được tạo nhưng không thể tải lên minh chứng thanh toán: ${proofError.message}`);
        }
      }
      */

      // ✅ COD: Reload cart from backend FIRST to sync with database (items removed by backend)
      console.log('🔄 [COD] Reloading cart from backend after successful checkout...');
      try {
        await cartService.loadFromBackend();
        console.log('✅ [COD] Cart reloaded from backend successfully');
      } catch (error) {
        console.error('❌ [COD] Failed to reload cart from backend:', error);
        // Continue anyway, don't block checkout success
      }

      // Clear checkout items from sessionStorage
      sessionStorage.removeItem('checkoutItems');
      sessionStorage.removeItem('checkoutSource');

      // Show success message AFTER cart reload
      alert(`Đặt hàng thành công! Mã đơn hàng: ${order.orderNumber}`);

      // Redirect to order confirmation page
      window.location.href = `/pages/OrderConfirmation.html?orderNumber=${order.orderNumber}`;
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

    /* ⚠️ COMMENTED OUT: Old flow - Manual payment proof required
     * New flow: Automatic verification, no file needed
     *
    // Check payment proof for non-COD payments
    if (paymentMethod !== 'cod' && !this.selectedFile) {
      alert("Vui lòng tải lên minh chứng thanh toán cho phương thức thanh toán đã chọn");
      return false;
    }
    */

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

    const shippingFee = this.getSelectedShippingFee(subtotal); // Pass subtotal sau giảm giá
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
   * Free ship for orders >= 500,000 VND (based on subtotal after discount)
   */
  private getSelectedShippingFee(subtotalAfterDiscount?: number): number {
    let subtotal: number;
    
    if (subtotalAfterDiscount !== undefined) {
      // Use provided subtotal (after discount)
      subtotal = subtotalAfterDiscount;
    } else {
      // Calculate subtotal (giá sau giảm) from cart items
      const cartItems = cartService.getItems();
      subtotal = cartItems.reduce((sum: number, item: CartItem) => {
        const price = item.salePrice || item.price;
        return sum + (price * item.quantity);
      }, 0);
    }
    
    // Free ship cho đơn >= 500k (tính theo subtotal sau giảm giá)
    if (subtotal >= 500000) {
      return 0;
    }
    
    // Normal shipping fees
    const method = this.getSelectedShippingMethod();
    return method === "fast" ? 30000 : 15000;
  }

  /**
   * Handle payment method change
   */
  private handlePaymentMethodChange(): void {
    // ⚠️ COMMENTED OUT: Old flow - show upload box for non-COD
    // New flow: Direct checkout with QR modal, no upload box needed
    // Keep upload box hidden for all payment methods
    if (this.uploadBoxElement) {
      this.uploadBoxElement.classList.add('d-none');
    }
  }

  /* ⚠️ COMMENTED OUT: Old flow methods - View QR before checkout + Manual upload
   * New flow: Checkout → Auto show QR → Auto verify → Done
   * 
  /**
   * Setup QR button listener
   * /
  private setupQRButtonListener(): void {
    const qrButton = document.getElementById('show-qr-btn');
    
    if (qrButton) {
      // Remove existing listeners
      const newButton = qrButton.cloneNode(true);
      qrButton.parentNode?.replaceChild(newButton, qrButton);
      
      // Add new listener
      newButton.addEventListener('click', () => {
        this.handleShowQRClick();
      });
    }
  }

  /**
   * Handle Show QR button click
   * Generate temporary order info and show QR for payment
   * /
  private async handleShowQRClick(): Promise<void> {
    try {
      // Get form data to generate QR
      const checkoutData = this.getCheckoutFormData();
      
      if (!checkoutData || !checkoutData.total) {
        alert('Không thể tạo mã QR. Vui lòng kiểm tra lại giỏ hàng.');
        return;
      }

      // Generate temporary order number for QR display
      const tempOrderNumber = this.generateTempOrderNumber();
      
      // Show QR modal with payment info
      this.showTemporaryPaymentQR(checkoutData.total, tempOrderNumber);
    } catch (error: any) {
      console.error('Failed to show QR:', error);
      alert('Không thể hiển thị mã QR: ' + error.message);
    }
  }

  /**
   * Generate temporary order number for QR display
   * /
  private generateTempOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TEMP${timestamp}${random}`;
  }

  /**
   * Show temporary payment QR before order creation
   * /
  private showTemporaryPaymentQR(amount: number, tempOrderNumber: string): void {
    // Get payment config from env
    const bankBin = '970422'; // MB
    const accountNo = '0935205238';
    const accountName = 'BLOCKIFY';
    const template = 'MND4rau';
    const bankName = 'MB Bank';
    
    const description = `Thanh toan don hang ${tempOrderNumber}`;
    
    // Build VietQR URL
    const params = new URLSearchParams({
      accountName: accountName,
      amount: amount.toString(),
      addInfo: description,
    });
    
    const qrUrl = `https://api.vietqr.io/image/${bankBin}-${accountNo}-${template}.jpg?${params.toString()}`;

    // Create payment QR object
    const paymentQR = {
      qrUrl,
      amount,
      description,
      bankName,
      accountNo,
      accountName,
      formatAmount: () => new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount),
      getInstructions: () => [
        "Bước 1: Mở ứng dụng ngân hàng của bạn",
        "Bước 2: Quét mã QR hoặc chuyển khoản thủ công",
        "Bước 3: Kiểm tra thông tin và xác nhận thanh toán",
        "Bước 4: Chụp ảnh hoặc chờ xác nhận từ ngân hàng",
        "Bước 5: Quay lại trang này và tải lên minh chứng thanh toán"
      ]
    };

    // Render QR modal
    this.renderTemporaryPaymentQRModal(paymentQR);
  }
  */ // END COMMENTED OUT OLD FLOW METHODS

  /**
   * Handle shipping method change
   */
  private handleShippingMethodChange(): void {
    // Recalculate totals when shipping method changes
    // We need to reload cart items to recalculate
    this.loadCartItems();
  }

  /* ⚠️ COMMENTED OUT: Old flow - Manual payment proof upload
   * New flow: Automatic verification via webhook, no file upload needed
   *
  /**
   * Handle file selection for payment proof
   * /
  private handleFileSelect(): void {
    const file = this.paymentProofInput?.files?.[0];
    
    if (!file) {
      this.selectedFile = null;
      this.clearFilePreview();
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Kích thước file vượt quá 5MB. Vui lòng chọn file khác.");
      if (this.paymentProofInput) this.paymentProofInput.value = '';
      this.clearFilePreview();
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP) hoặc PDF.");
      if (this.paymentProofInput) this.paymentProofInput.value = '';
      this.clearFilePreview();
      return;
    }

    // Store file and show preview
    this.selectedFile = file;
    this.showFilePreview(file);
  }

  /**
   * Show file preview
   * /
  private showFilePreview(file: File): void {
    if (!this.uploadPreviewElement) return;

    const fileSize = (file.size / 1024).toFixed(2); // Convert to KB
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    let previewHTML = `
      <div class="border rounded p-2 bg-light">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center">
    `;

    if (isImage) {
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.uploadPreviewElement) {
          const imgElement = this.uploadPreviewElement.querySelector('img');
          if (imgElement && e.target?.result) {
            imgElement.setAttribute('src', e.target.result as string);
          }
        }
      };
      reader.readAsDataURL(file);

      previewHTML += `
            <img src="" alt="Preview" class="me-2" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
            <div>
              <div class="fw-bold">${file.name}</div>
              <small class="text-muted">${fileSize} KB</small>
            </div>
      `;
    } else if (isPDF) {
      previewHTML += `
            <i class="bi bi-file-pdf fs-2 me-2 text-danger"></i>
            <div>
              <div class="fw-bold">${file.name}</div>
              <small class="text-muted">${fileSize} KB</small>
            </div>
      `;
    }

    previewHTML += `
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="document.getElementById('payment-proof').value=''; this.parentElement.parentElement.parentElement.remove();">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;

    this.uploadPreviewElement.innerHTML = previewHTML;
  }

  /**
   * Clear file preview
   * /
  private clearFilePreview(): void {
    if (this.uploadPreviewElement) {
      this.uploadPreviewElement.innerHTML = '';
    }
  }
  */ // END COMMENTED OUT FILE UPLOAD METHODS

  /**
   * Show empty cart message
   */
  private showEmptyCart(): void {
    if (this.orderItemsContainer) {
      this.orderItemsContainer.innerHTML = `
        <div class="text-center py-4">
          <p>Giỏ hàng trống</p>
          <a href="/pages/HomePage.html" class="btn btn-primary">Tiếp tục mua sắm</a>
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
    console.log('🔍 [OrderController.getUserId] Checking user...');
    const currentUser = this.authService.getUser();
    console.log('🔍 [OrderController.getUserId] CurrentUser:', currentUser);
    console.log('🔍 [OrderController.getUserId] currentUser?.id:', currentUser?.id);
    console.log('🔍 [OrderController.getUserId] typeof currentUser?.id:', typeof currentUser?.id);
    
    if (currentUser && currentUser.id) {
      const userId = parseInt(currentUser.id, 10);
      console.log('🔍 [OrderController.getUserId] parseInt result:', userId);
      console.log('🔍 [OrderController.getUserId] isNaN:', isNaN(userId));
      
      if (!isNaN(userId)) {
        console.log('✅ [OrderController.getUserId] UserId:', userId);
        return userId;
      }
    }
    
    console.log('❌ [OrderController.getUserId] No valid user ID found');
    return null;
  }

  /**
   * Show VietQR Payment Modal
   * Display QR code for bank transfer payment
   */
  async showPaymentQR(orderId: number): Promise<void> {
    try {
      console.log('📱 Loading VietQR payment code for order:', orderId);

      // Fetch payment QR from backend
      const paymentQR = await this.orderService.getPaymentQR(orderId);

      // Create and show modal
      this.renderPaymentQRModal(paymentQR, orderId);
    } catch (error: any) {
      console.error('❌ Failed to load payment QR:', error);
      alert(error.message || 'Không thể tải mã QR thanh toán');
    }
  }

  /**
   * Render Payment QR Modal
   */
  private renderPaymentQRModal(paymentQR: PaymentQR, orderId: number): void {
    // Check if modal already exists
    let modal = document.getElementById('paymentQRModal');
    
    if (!modal) {
      // Create modal
      modal = document.createElement('div');
      modal.id = 'paymentQRModal';
      modal.className = 'modal fade';
      modal.setAttribute('tabindex', '-1');
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-qr-code"></i> Quét mã QR để thanh toán
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <!-- QR Code Image -->
              <div class="text-center mb-4">
                <img id="qrImage" src="${paymentQR.qrUrl}" alt="QR Code" class="img-fluid rounded shadow" style="max-width: 350px; border: 2px solid #0d6efd;">
              </div>

              <!-- Payment Information -->
              <div class="payment-info bg-light p-3 rounded">
                <h6 class="fw-bold mb-3 text-primary">
                  <i class="bi bi-info-circle"></i> Thông tin chuyển khoản:
                </h6>
                <div class="row mb-2">
                  <div class="col-5 text-muted">Ngân hàng:</div>
                  <div class="col-7 fw-bold" id="bankName">${paymentQR.bankName}</div>
                </div>
                <div class="row mb-2">
                  <div class="col-5 text-muted">Số tài khoản:</div>
                  <div class="col-7 fw-bold text-primary" id="accountNo">${paymentQR.accountNo}</div>
                </div>
                <div class="row mb-2">
                  <div class="col-5 text-muted">Chủ tài khoản:</div>
                  <div class="col-7 fw-bold" id="accountName">${paymentQR.accountName}</div>
                </div>
                <div class="row mb-2">
                  <div class="col-5 text-muted">Số tiền:</div>
                  <div class="col-7 fw-bold text-danger fs-5" id="amount">${paymentQR.formatAmount()}</div>
                </div>
                <div class="row">
                  <div class="col-5 text-muted">Nội dung:</div>
                  <div class="col-7 fw-bold text-success" id="description">${paymentQR.description}</div>
                </div>
              </div>

              <!-- Important Notice -->
              <div class="alert alert-warning mt-3 mb-0">
                <small>
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <strong>Lưu ý:</strong> Vui lòng nhập chính xác nội dung chuyển khoản "<strong>${paymentQR.description}</strong>" để hệ thống tự động xác nhận thanh toán.
                </small>
              </div>

              <!-- Upload Proof Section -->
              <div id="uploadProofSection" class="mt-4">
                <hr>
                <h6 class="fw-bold mb-3">
                  <i class="bi bi-cloud-upload"></i> Hoặc tải ảnh minh chứng:
                </h6>
                <input type="file" class="form-control mb-2" id="proofFileInput" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf">
                <small class="text-muted">
                  Chấp nhận ảnh (JPEG, JPG, PNG, GIF, WebP) hoặc PDF. Tối đa 5MB.
                </small>
                <button class="btn btn-primary w-100 mt-3" id="uploadProofBtn">
                  <i class="bi bi-upload"></i> Gửi minh chứng
                </button>
              </div>

              <!-- Instructions -->
              <div class="mt-4">
                <h6 class="fw-bold mb-2">
                  <i class="bi bi-list-check"></i> Hướng dẫn thanh toán:
                </h6>
                <ol class="small text-muted ps-3">
                  ${paymentQR.getInstructions().map(instruction => `<li>${instruction}</li>`).join('')}
                </ol>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // Show modal using Bootstrap
    const bsModal = new (window as any).bootstrap.Modal(modal);
    bsModal.show();

    // Setup upload proof handler
    this.setupUploadProofHandler(orderId);
  }

  /* ⚠️ COMMENTED OUT: Old flow - Temporary QR modal before order creation
   * New flow: Order created first, then automatic QR modal with verification
   *
  /**
   * Render Temporary Payment QR Modal (before order creation)
   * /
  private renderTemporaryPaymentQRModal(paymentQR: any): void {
    // Check if modal already exists
    let modal = document.getElementById('tempPaymentQRModal');
    
    if (modal) {
      // Remove existing modal
      modal.remove();
    }

    // Create modal
    modal = document.createElement('div');
    modal.id = 'tempPaymentQRModal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="bi bi-qr-code-scan"></i> Thanh toán đơn hàng
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="bi bi-info-circle-fill"></i>
              <strong>Hướng dẫn:</strong> Vui lòng thanh toán và tải lên minh chứng trước khi hoàn tất đơn hàng.
            </div>

            <!-- QR Code Image -- >
            <div class="text-center mb-4">
              <img src="${paymentQR.qrUrl}" alt="QR Code" class="img-fluid rounded shadow" style="max-width: 400px; border: 3px solid #0d6efd;">
            </div>

            <!-- Payment Information -- >
            <div class="payment-info bg-light p-4 rounded mb-3">
              <h6 class="fw-bold mb-3 text-primary border-bottom pb-2">
                <i class="bi bi-bank"></i> Thông tin chuyển khoản
              </h6>
              <div class="row mb-2">
                <div class="col-4 text-muted">Ngân hàng:</div>
                <div class="col-8 fw-bold">${paymentQR.bankName}</div>
              </div>
              <div class="row mb-2">
                <div class="col-4 text-muted">Số tài khoản:</div>
                <div class="col-8">
                  <span class="fw-bold text-primary fs-5">${paymentQR.accountNo}</span>
                  <button class="btn btn-sm btn-outline-secondary ms-2" onclick="navigator.clipboard.writeText('${paymentQR.accountNo}')">
                    <i class="bi bi-clipboard"></i>
                  </button>
                </div>
              </div>
              <div class="row mb-2">
                <div class="col-4 text-muted">Chủ tài khoản:</div>
                <div class="col-8 fw-bold">${paymentQR.accountName}</div>
              </div>
              <div class="row mb-2">
                <div class="col-4 text-muted">Số tiền:</div>
                <div class="col-8">
                  <span class="fw-bold text-danger fs-4">${paymentQR.formatAmount()}</span>
                  <button class="btn btn-sm btn-outline-secondary ms-2" onclick="navigator.clipboard.writeText('${paymentQR.amount}')">
                    <i class="bi bi-clipboard"></i>
                  </button>
                </div>
              </div>
              <div class="row">
                <div class="col-4 text-muted">Nội dung:</div>
                <div class="col-8">
                  <span class="fw-bold text-success">${paymentQR.description}</span>
                  <button class="btn btn-sm btn-outline-secondary ms-2" onclick="navigator.clipboard.writeText('${paymentQR.description}')">
                    <i class="bi bi-clipboard"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Important Notice -- >
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <strong>Quan trọng:</strong> Sau khi chuyển khoản, vui lòng đóng cửa sổ này và tải lên minh chứng thanh toán ở form bên dưới, sau đó nhấn "Thanh Toán Ngay".
            </div>

            <!-- Instructions -- >
            <div class="mt-3">
              <h6 class="fw-bold mb-2">
                <i class="bi bi-list-check"></i> Các bước thực hiện:
              </h6>
              <ol class="ps-3">
                ${paymentQR.getInstructions().map((instruction: string) => `<li class="mb-2">${instruction}</li>`).join('')}
              </ol>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              <i class="bi bi-x-circle"></i> Đóng
            </button>
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
              <i class="bi bi-check-circle"></i> Đã chuyển khoản, tải minh chứng
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Show modal using Bootstrap
    const bsModal = new (window as any).bootstrap.Modal(modal);
    bsModal.show();

    // Auto focus on file input after modal closes
    modal.addEventListener('hidden.bs.modal', () => {
      const fileInput = document.getElementById('payment-proof') as HTMLInputElement;
      if (fileInput) {
        fileInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fileInput.focus();
      }
    });
  }
  */ // END COMMENTED OUT TEMPORARY QR MODAL

  /**
   * Show payment waiting modal with QR code and automatic verification
   */
  private async showPaymentWaitingModal(orderNumber: string, _amount: number): Promise<void> {
    try {
      // Fetch QR code
      const paymentQR = await this.orderService.getPaymentQRByOrderNumber(orderNumber);

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'paymentWaitingModal';
      modal.setAttribute('data-bs-backdrop', 'static');
      modal.setAttribute('data-bs-keyboard', 'false');
      modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="bi bi-qr-code-scan"></i> Chờ xác nhận thanh toán
              </h5>
            </div>
            <div class="modal-body">
              <!-- Status Alert -->
              <div class="alert alert-info" id="payment-status-alert">
                <div class="d-flex align-items-center">
                  <div class="spinner-border spinner-border-sm me-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                  <div>
                    <strong>Đang chờ thanh toán...</strong>
                    <p class="mb-0 small">Hệ thống đang tự động kiểm tra thanh toán của bạn</p>
                  </div>
                </div>
              </div>

              <!-- QR Code Image -->
              <div class="text-center mb-4">
                <img src="${paymentQR.qrUrl}" alt="QR Code" class="img-fluid rounded shadow" style="max-width: 350px; border: 3px solid #0d6efd;">
              </div>

              <!-- Payment Information -->
              <div class="payment-info bg-light p-4 rounded mb-3">
                <h6 class="fw-bold mb-3 text-primary border-bottom pb-2">
                  <i class="bi bi-bank"></i> Thông tin chuyển khoản
                </h6>
                <div class="row mb-2">
                  <div class="col-4 text-muted">Ngân hàng:</div>
                  <div class="col-8 fw-bold">${paymentQR.bankName}</div>
                </div>
                <div class="row mb-2">
                  <div class="col-4 text-muted">Số tài khoản:</div>
                  <div class="col-8">
                    <span class="fw-bold text-primary fs-5">${paymentQR.accountNo}</span>
                    <button class="btn btn-sm btn-outline-secondary ms-2 copy-btn" data-copy="${paymentQR.accountNo}">
                      <i class="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>
                <div class="row mb-2">
                  <div class="col-4 text-muted">Chủ tài khoản:</div>
                  <div class="col-8 fw-bold">${paymentQR.accountName}</div>
                </div>
                <div class="row mb-2">
                  <div class="col-4 text-muted">Số tiền:</div>
                  <div class="col-8">
                    <span class="fw-bold text-danger fs-4">${paymentQR.formatAmount()}</span>
                    <button class="btn btn-sm btn-outline-secondary ms-2 copy-btn" data-copy="${paymentQR.amount}">
                      <i class="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>
                <div class="row">
                  <div class="col-4 text-muted">Nội dung:</div>
                  <div class="col-8">
                    <span class="fw-bold text-success">${paymentQR.description}</span>
                    <button class="btn btn-sm btn-outline-secondary ms-2 copy-btn" data-copy="${paymentQR.description}">
                      <i class="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Instructions -->
              <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <strong>Lưu ý:</strong> Vui lòng chuyển khoản CHÍNH XÁC số tiền và nội dung để hệ thống tự động xác nhận thanh toán.
              </div>

              <!-- Timer -->
              <div class="text-center">
                <small class="text-muted">
                  <i class="bi bi-clock"></i> Thời gian chờ: <span id="payment-timer">15:00</span>
                </small>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="cancel-payment-btn">
                <i class="bi bi-x-circle"></i> Hủy đơn hàng
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Show modal
      const bsModal = new (window as any).bootstrap.Modal(modal);
      bsModal.show();

      // Setup copy buttons
      modal.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLElement;
          const textToCopy = target.getAttribute('data-copy') || '';
          navigator.clipboard.writeText(textToCopy);
          
          // Show feedback
          const originalHTML = target.innerHTML;
          target.innerHTML = '<i class="bi bi-check"></i>';
          setTimeout(() => {
            target.innerHTML = originalHTML;
          }, 1000);
        });
      });

      // Start timer countdown (15 minutes)
      let timeLeft = 15 * 60; // 900 seconds
      const timerElement = modal.querySelector('#payment-timer') as HTMLElement;
      const timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        if (timerElement) {
          timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
        }
      }, 1000);

      // Setup cancel button
      const cancelBtn = modal.querySelector('#cancel-payment-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          if (confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
            stopPolling();
            clearInterval(timerInterval);
            bsModal.hide();
            modal.remove();
            window.location.href = '/pages/OrderPage.html';
          }
        });
      }

      // Start payment polling
      const statusAlert = modal.querySelector('#payment-status-alert') as HTMLElement;
      
      const stopPolling = this.orderService.startPaymentPolling(
        orderNumber,
        async (result) => {
          // Payment confirmed!
          console.log('✅ Payment confirmed:', result);
          clearInterval(timerInterval);
          
          // Update UI
          if (statusAlert) {
            statusAlert.className = 'alert alert-success';
            statusAlert.innerHTML = `
              <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill fs-3 me-3"></i>
                <div>
                  <strong>Thanh toán thành công!</strong>
                  <p class="mb-0 small">Đơn hàng của bạn đã được xác nhận. Đang chuyển hướng...</p>
                </div>
              </div>
            `;
          }

          // ✅ Reload cart from backend IMMEDIATELY (await before redirect)
          console.log('🔄 Reloading cart from backend after successful payment...');
          try {
            await cartService.loadFromBackend();
            console.log('✅ Cart reloaded from backend');
          } catch (error) {
            console.error('❌ Failed to reload cart from backend:', error);
          }

          // ✅ Xóa sessionStorage SAU KHI reload cart
          sessionStorage.removeItem('checkout_items');
          sessionStorage.removeItem('checkoutItems');
          sessionStorage.removeItem('checkoutSource');

          // Wait 2 seconds THEN redirect
          setTimeout(() => {
            bsModal.hide();
            modal.remove();
            window.location.href = `/pages/OrderConfirmation.html?orderNumber=${orderNumber}`;
          }, 2000);
        },
        () => {
          // Timeout
          console.log('⏱️ Payment polling timeout');
          clearInterval(timerInterval);
          
          if (statusAlert) {
            statusAlert.className = 'alert alert-warning';
            statusAlert.innerHTML = `
              <div>
                <strong>Hết thời gian chờ</strong>
                <p class="mb-0">Đơn hàng đã được tạo nhưng chưa nhận được thanh toán. Bạn có thể thanh toán sau trong trang "Đơn hàng của tôi".</p>
                <p class="mb-0 mt-2"><small>💡 <strong>Lưu ý:</strong> Giỏ hàng của bạn vẫn được giữ nguyên để bạn có thể thử lại.</small></p>
              </div>
            `;
          }

          // Enable cancel button to become "Go to orders"
          if (cancelBtn) {
            cancelBtn.textContent = 'Xem đơn hàng';
            (cancelBtn as HTMLButtonElement).onclick = () => {
              window.location.href = '/pages/Account.html?tab=orders';
            };
          }
        },
        5000 // Poll every 5 seconds
      );

      // Cleanup when modal is closed manually
      modal.addEventListener('hidden.bs.modal', () => {
        stopPolling();
        clearInterval(timerInterval);
        modal.remove();
      });

    } catch (error) {
      console.error('Error showing payment waiting modal:', error);
      alert('Không thể hiển thị mã QR thanh toán');
    }
  }

  /**
   * Setup upload proof button handler
   */
  private setupUploadProofHandler(orderId: number): void {
    const uploadBtn = document.getElementById('uploadProofBtn');
    const fileInput = document.getElementById('proofFileInput') as HTMLInputElement;

    if (uploadBtn && fileInput) {
      uploadBtn.onclick = async () => {
        const file = fileInput.files?.[0];

        if (!file) {
          alert('Vui lòng chọn file minh chứng');
          return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File quá lớn. Vui lòng chọn file dưới 5MB');
          return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          alert('Định dạng file không hợp lệ. Vui lòng chọn ảnh hoặc PDF');
          return;
        }

        try {
          uploadBtn.textContent = 'Đang gửi...';
          (uploadBtn as HTMLButtonElement).disabled = true;

          // Upload using PaymentProofService
          if (this.userId) {
            await this.paymentProofService.uploadPaymentProof({
              orderId,
              userId: this.userId,
              file,
              note: 'Minh chứng thanh toán từ VietQR'
            });
            
            alert('✅ Đã gửi minh chứng thành công! Chúng tôi sẽ xác nhận trong thời gian sớm nhất.');
            
            // Close modal
            const modal = document.getElementById('paymentQRModal');
            const bsModal = (window as any).bootstrap.Modal.getInstance(modal);
            if (bsModal) {
              bsModal.hide();
            }
          }
        } catch (error: any) {
          console.error('Upload proof error:', error);
          alert('❌ Không thể gửi minh chứng: ' + error.message);
        } finally {
          uploadBtn.textContent = 'Gửi minh chứng';
          (uploadBtn as HTMLButtonElement).disabled = false;
        }
      };
    }
  }
}
