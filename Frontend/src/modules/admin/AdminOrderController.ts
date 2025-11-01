import { httpClient } from "../../core/api/FetchHttpClient.js";

/**
 * Admin Order Controller - Frontend
 * Manages order operations for admin panel
 */
export class AdminOrderController {
  private currentOrders: any[] = [];
  private currentOrderDetail: any = null;
  private currentFilters?: { status?: string; paymentStatus?: string; search?: string };

  /**
   * Load all orders
   */
  async loadOrders(filters?: {
    status?: string;
    paymentStatus?: string;
    search?: string;
  }): Promise<void> {
    try {
      // Store filters for later use
      if (filters) {
        this.currentFilters = filters;
      }
      
      // Use stored filters if no new filters provided
      const activeFilters = filters || this.currentFilters;
      
      let url = "/api/admin/orders?limit=100";
      
      if (activeFilters?.status) {
        url += `&status=${encodeURIComponent(activeFilters.status)}`;
      }
      
      if (activeFilters?.paymentStatus) {
        url += `&paymentStatus=${encodeURIComponent(activeFilters.paymentStatus)}`;
      }

      if (activeFilters?.search) {
        url += `&search=${encodeURIComponent(activeFilters.search)}`;
      }

      const response = await httpClient.get<any>(url);

      if (response.success && response.data) {
        this.currentOrders = this.sortOrdersByUrgency(response.data);
        this.renderOrdersTable();
      } else {
        console.error("Failed to load orders:", response.message);
        alert("Không thể tải danh sách đơn hàng");
      }
    } catch (error: any) {
      console.error("Error loading orders:", error);
      alert("Lỗi khi tải danh sách đơn hàng");
    }
  }

  /**
   * Load order detail by ID
   */
  async loadOrderDetail(orderId: number): Promise<void> {
    try {
      const response = await httpClient.get<any>(`/api/admin/orders/${orderId}`);

      if (response.success && response.data) {
        this.currentOrderDetail = response.data;
        this.showOrderDetailModal();
      } else {
        console.error("Failed to load order detail:", response.message);
        alert("Không thể tải chi tiết đơn hàng");
      }
    } catch (error: any) {
      console.error("Error loading order detail:", error);
      alert("Lỗi khi tải chi tiết đơn hàng");
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, newStatus: string, note?: string): Promise<void> {
    try {
      console.log('Updating order status:', { orderId, newStatus, note });
      
      const response = await httpClient.patch(`/api/admin/orders/${orderId}/status`, {
        status: newStatus,
        note: note,
      });

      console.log('Order status response:', response);

      if (response.success) {
        alert("Cập nhật trạng thái thành công!");
        
        // Reload order detail first
        try {
          await this.loadOrderDetail(orderId);
        } catch (detailError) {
          console.error("Error reloading order detail:", detailError);
        }
        
        // Then reload orders list
        try {
          await this.loadOrders();
        } catch (listError) {
          console.error("Error reloading orders list:", listError);
        }
      } else {
        alert(`Cập nhật thất bại: ${response.message}`);
      }
    } catch (error: any) {
      console.error("Error updating order status:", error);
      alert(`Lỗi khi cập nhật trạng thái: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    orderId: number,
    paymentStatus: "paid" | "failed" | "refunded",
    proofId?: number,
    proofStatus?: "accepted" | "rejected"
  ): Promise<void> {
    try {
      console.log('Updating payment status:', { orderId, paymentStatus, proofId, proofStatus });
      
      const response = await httpClient.patch(`/api/admin/orders/${orderId}/payment-status`, {
        paymentStatus,
        proofId,
        proofStatus,
      });

      console.log('Payment status response:', response);

      if (response.success) {
        alert("Cập nhật thanh toán thành công!");
        
        // Reload order detail first (faster, more important)
        try {
          await this.loadOrderDetail(orderId);
        } catch (detailError) {
          console.error("Error reloading order detail:", detailError);
        }
        
        // Then reload orders list (can fail silently)
        try {
          await this.loadOrders();
        } catch (listError) {
          console.error("Error reloading orders list:", listError);
        }
      } else {
        alert(`Cập nhật thất bại: ${response.message}`);
      }
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      alert(`Lỗi khi cập nhật thanh toán: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: number, reason?: string): Promise<void> {
    try {
      if (!confirm("Bạn có chắc muốn hủy đơn hàng này?")) {
        return;
      }

      const response = await httpClient.post(`/api/admin/orders/${orderId}/cancel`, {
        reason,
      });

      if (response.success) {
        alert("Hủy đơn hàng thành công!");
        await this.loadOrders();
        this.closeOrderDetailModal();
      } else {
        alert(`Hủy đơn thất bại: ${response.message}`);
      }
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      alert("Lỗi khi hủy đơn hàng");
    }
  }

  /**
   * Process refund
   */
  async processRefund(orderId: number, reason?: string): Promise<void> {
    try {
      if (!confirm("Xác nhận xử lý hoàn trả đơn hàng này?")) {
        return;
      }

      const response = await httpClient.post(`/api/admin/orders/${orderId}/refund`, {
        reason,
      });

      if (response.success) {
        alert("Xử lý hoàn trả thành công!");
        await this.loadOrders();
        await this.loadOrderDetail(orderId);
      } else {
        alert(`Xử lý hoàn trả thất bại: ${response.message}`);
      }
    } catch (error: any) {
      console.error("Error processing refund:", error);
      alert("Lỗi khi xử lý hoàn trả");
    }
  }

  /**
   * Render orders table
   */
  private renderOrdersTable(): void {
    const tbody = document.getElementById("orderList");
    if (!tbody) return;

    if (this.currentOrders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-4">Không có đơn hàng nào</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.currentOrders
      .map((order) => {
        const statusBadge = this.getStatusBadge(order.status);
        const paymentBadge = this.getPaymentBadge(order.payment_status);
        
        // Calculate time remaining for pending orders
        let countdownHtml = '';
        let rowClass = '';
        if (order.status === "Đang xử lý") {
          const timeRemaining = this.getTimeRemaining(order.ordered_at);
          countdownHtml = `<br><small>${this.formatCountdown(timeRemaining)}</small>`;
          
          // Highlight urgent orders
          if (timeRemaining.isUrgent) {
            rowClass = 'table-danger';
          }
        }

        return `
          <tr class="${rowClass}">
            <td>#${order.order_number}${countdownHtml}</td>
            <td>${order.users?.full_name || "N/A"}</td>
            <td>${order.customer_email}</td>
            <td>${order.customer_phone}</td>
            <td>${new Date(order.ordered_at).toLocaleString("vi-VN")}</td>
            <td>${this.formatPrice(order.total_amount)}</td>
            <td><span class="badge ${statusBadge.class}">${statusBadge.text}</span></td>
            <td><span class="badge ${paymentBadge.class}">${paymentBadge.text}</span></td>
            <td>
              <button 
                class="btn btn-sm btn-primary"
                onclick="window.adminOrderController.loadOrderDetail(${order.order_id})"
              >
                Chi tiết
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
    
    // Update countdown every minute
    setTimeout(() => {
      if (this.currentOrders.some(o => o.status === "Đang xử lý")) {
        this.renderOrdersTable();
      }
    }, 60000); // 1 minute
  }

  /**
   * Show order detail modal
   */
  private showOrderDetailModal(): void {
    if (!this.currentOrderDetail) return;

    const order = this.currentOrderDetail;
    
    // Remove existing modal if any (fix: xem đơn 2 vẫn hiện đơn 1)
    const existingModal = document.getElementById("orderDetailModal");
    if (existingModal) {
      // Close modal first if it's open
      const bootstrap = (window as any).bootstrap;
      if (bootstrap) {
        const modalInstance = bootstrap.Modal.getInstance(existingModal);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
      existingModal.remove();
    }
    
    // Create modal HTML based on test.html design
    const modalHTML = this.generateOrderDetailModal(order);

    // Append modal to body
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Show modal
    const modalElement = document.getElementById("orderDetailModal");
    if (modalElement) {
      // Bootstrap modal
      const bootstrap = (window as any).bootstrap;
      if (bootstrap) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        // Cleanup on hide
        modalElement.addEventListener("hidden.bs.modal", () => {
          modalElement.remove();
        });
      }
    }

    // Attach event listeners
    this.attachModalEventListeners();
  }

  /**
   * Generate order detail modal HTML
   */
  private generateOrderDetailModal(order: any): string {
    const paymentBadge = this.getPaymentBadge(order.payment_status);
    const paymentProof = order.payment_proofs?.[0];

    // Generate countdown for pending orders
    let countdownHtml = '';
    if (order.status === "Đang xử lý") {
      const timeRemaining = this.getTimeRemaining(order.ordered_at);
      countdownHtml = `
        <div class="mt-2">
          <span class="badge ${timeRemaining.isUrgent ? 'bg-danger' : 'bg-warning'} fs-6">
            ⏰ Thời gian xác nhận còn: ${this.formatCountdown(timeRemaining, true)}
          </span>
        </div>
      `;
    }

    // Generate action buttons based on status
    const actionButtons = this.generateActionButtons(order);

    return `
      <div class="modal fade" id="orderDetailModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <div>
                <h5 class="modal-title">Chi tiết đơn hàng #${order.order_number}</h5>
                <small class="text-muted">Đặt lúc: ${new Date(order.ordered_at).toLocaleString("vi-VN")}</small>
                ${countdownHtml}
              </div>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <!-- Left: Customer Info -->
                <div class="col-md-4">
                  <div class="card mb-3">
                    <div class="card-body">
                      <h6 class="card-title text-primary">Thông tin khách hàng</h6>
                      <p><strong>Khách hàng:</strong> ${order.customer_name}</p>
                      <p><strong>Email:</strong> ${order.customer_email}</p>
                      <p><strong>SĐT:</strong> ${order.customer_phone}</p>
                      <hr>
                      <h6>Địa chỉ giao hàng</h6>
                      <p>${order.shipping_address}, ${order.shipping_city}</p>
                      <hr>
                      <h6>Phương thức thanh toán</h6>
                      <p>${this.formatPaymentMethod(order.payment_method)}</p>
                      <p><span class="badge ${paymentBadge.class}">${paymentBadge.text}</span></p>
                      
                      ${paymentProof ? `
                        <hr>
                        <h6>Minh chứng thanh toán</h6>
                        <img src="${paymentProof.file_url}" class="img-fluid mb-2" alt="Minh chứng" style="cursor: pointer;" onclick="window.open('${paymentProof.file_url}', '_blank')">
                        <p><span class="badge ${this.getProofBadge(paymentProof.status).class}">${this.getProofBadge(paymentProof.status).text}</span></p>
                        ${paymentProof.status === 'pending' && order.status === 'Đang xử lý' ? `
                          <div class="mt-2">
                            <button class="btn btn-sm btn-success" id="acceptProofBtn">✓ Xác nhận</button>
                            <button class="btn btn-sm btn-danger ms-2" id="rejectProofBtn">✕ Từ chối</button>
                          </div>
                        ` : ''}
                      ` : '<p class="text-muted">Chưa có minh chứng</p>'}
                    </div>
                  </div>
                </div>

                <!-- Right: Order Items & History -->
                <div class="col-md-8">
                  <div class="card mb-3">
                    <div class="card-body">
                      <h6 class="card-title text-primary">Chi tiết sản phẩm</h6>
                      <table class="table1">
                        <thead>
                          <tr>
                            <th>Sản phẩm</th>
                            <th>SKU</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${order.order_items?.map((item: any) => `
                            <tr>
                              <td>${item.product_name}</td>
                              <td>${item.product_sku}</td>
                              <td>${item.quantity}</td>
                              <td>${this.formatPrice(item.unit_price)}</td>
                              <td>${this.formatPrice(item.total_price)}</td>
                            </tr>
                          `).join("") || ""}
                        </tbody>
                      </table>
                      <div class="text-end">
                        <p><strong>Tạm tính:</strong> ${this.formatPrice(order.subtotal)}</p>
                        <p><strong>Phí vận chuyển:</strong> ${this.formatPrice(order.shipping_fee || 0)}</p>
                        <p><strong>Giảm giá:</strong> ${this.formatPrice(order.discount_amount || 0)}</p>
                        <h5><strong>Tổng cộng:</strong> ${this.formatPrice(order.total_amount)}</h5>
                      </div>
                    </div>
                  </div>

                  <div class="card">
                    <div class="card-body">
                      <h6 class="card-title text-primary">Lịch sử trạng thái</h6>
                      ${order.order_status_history?.map((history: any) => `
                        <div class="border-bottom pb-2 mb-2">
                          <small class="text-muted">${new Date(history.created_at).toLocaleString("vi-VN")}</small>
                          <p class="mb-0"><strong>${history.old_status}</strong> → <strong>${history.new_status}</strong></p>
                          ${history.note ? `<p class="mb-0 text-muted"><em>${history.note}</em></p>` : ''}
                        </div>
                      `).join("") || "<p>Chưa có lịch sử</p>"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              ${actionButtons}
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate action buttons based on order status
   */
  private generateActionButtons(order: any): string {
    const status = order.status;
    const paymentProof = order.payment_proofs?.[0];
    const paymentMethod = order.payment_method;
    let buttons = "";

    switch (status) {
      case "Đang xử lý":
        // Show confirm order button
        // For COD, always allow confirmation
        // For bank transfer, require payment proof to be accepted
        const isCOD = paymentMethod === 'cod' || paymentMethod === 'COD';
        const isPaymentVerified = isCOD || (paymentProof && paymentProof.status === "accepted");
        buttons += `<button class="btn btn-primary" id="confirmOrderBtn" ${!isPaymentVerified ? 'disabled' : ''}>✓ Xác nhận đơn hàng</button>`;
        buttons += `<button class="btn btn-danger ms-2" id="cancelOrderBtn">✕ Hủy đơn</button>`;
        break;

      case "Đang giao":
        buttons += `<button class="btn btn-success" id="markDeliveredBtn">✓ Xác nhận đã giao</button>`;
        buttons += `<button class="btn btn-danger ms-2" id="cancelOrderBtn">✕ Hủy đơn</button>`;
        break;

      case "Đã giao":
        buttons += `<button class="btn btn-warning" id="processRefundBtn">↺ Xử lý hoàn trả</button>`;
        break;

      case "Đã trả":
      case "Đã hủy":
        // Read-only
        break;
    }

    return buttons;
  }

  /**
   * Attach modal event listeners
   */
  private attachModalEventListeners(): void {
    const order = this.currentOrderDetail;
    if (!order) return;

    // Accept payment proof
    const acceptBtn = document.getElementById("acceptProofBtn");
    if (acceptBtn) {
      acceptBtn.addEventListener("click", async () => {
        const proof = order.payment_proofs?.[0];
        await this.updatePaymentStatus(order.order_id, "paid", proof?.proof_id, "accepted");
      });
    }

    // Reject payment proof
    const rejectBtn = document.getElementById("rejectProofBtn");
    if (rejectBtn) {
      rejectBtn.addEventListener("click", async () => {
        const proof = order.payment_proofs?.[0];
        await this.updatePaymentStatus(order.order_id, "failed", proof?.proof_id, "rejected");
      });
    }

    // Confirm order (move to shipping)
    const confirmBtn = document.getElementById("confirmOrderBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", async () => {
        await this.updateOrderStatus(order.order_id, "Đang giao", "Admin xác nhận đơn hàng");
      });
    }

    // Mark as delivered
    const deliveredBtn = document.getElementById("markDeliveredBtn");
    if (deliveredBtn) {
      deliveredBtn.addEventListener("click", async () => {
        await this.updateOrderStatus(order.order_id, "Đã giao", "Admin xác nhận đã giao");
      });
    }

    // Cancel order
    const cancelBtn = document.getElementById("cancelOrderBtn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", async () => {
        const reason = prompt("Lý do hủy đơn:");
        if (reason !== null) {
          await this.cancelOrder(order.order_id, reason);
        }
      });
    }

    // Process refund
    const refundBtn = document.getElementById("processRefundBtn");
    if (refundBtn) {
      refundBtn.addEventListener("click", async () => {
        const reason = prompt("Lý do hoàn trả:");
        if (reason !== null) {
          await this.processRefund(order.order_id, reason);
        }
      });
    }
  }

  /**
   * Close order detail modal
   */
  private closeOrderDetailModal(): void {
    const modalElement = document.getElementById("orderDetailModal");
    if (modalElement) {
      const bootstrap = (window as any).bootstrap;
      if (bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          // Remove focus from any focused element inside modal BEFORE hiding
          const focusedElement = modalElement.querySelector(':focus') as HTMLElement;
          if (focusedElement) {
            focusedElement.blur();
          }
          
          // Hide modal
          modal.hide();
          
          // Cleanup: Remove modal and backdrop after animation completes
          modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
            // Remove any leftover backdrops
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
            // Restore body scroll
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
          }, { once: true });
        }
      }
    }
  }

  /**
   * Sort orders by urgency (orders with <12h remaining first, then by time remaining)
   */
  private sortOrdersByUrgency(orders: any[]): any[] {
    return orders.sort((a, b) => {
      // Only prioritize orders in "Đang xử lý" status
      const aIsPending = a.status === "Đang xử lý";
      const bIsPending = b.status === "Đang xử lý";

      if (!aIsPending && !bIsPending) {
        return 0; // Keep original order
      }

      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;

      // Both are pending, calculate time remaining
      const aTime = this.getTimeRemaining(a.ordered_at);
      const bTime = this.getTimeRemaining(b.ordered_at);

      // Urgent orders first (less than 12h)
      const aIsUrgent = aTime.totalHours <= 12;
      const bIsUrgent = bTime.totalHours <= 12;

      if (aIsUrgent && !bIsUrgent) return -1;
      if (!aIsUrgent && bIsUrgent) return 1;

      // Both urgent or both not urgent, sort by time remaining (less time = higher priority)
      return aTime.totalMinutes - bTime.totalMinutes;
    });
  }

  /**
   * Calculate time remaining for order confirmation (24h from order time)
   */
  private getTimeRemaining(orderedAt: string): { 
    totalHours: number; 
    totalMinutes: number; 
    hours: number; 
    minutes: number; 
    isExpired: boolean;
    isUrgent: boolean;
  } {
    const orderTime = new Date(orderedAt).getTime();
    const deadline = orderTime + (24 * 60 * 60 * 1000); // 24 hours
    const now = Date.now();
    const remaining = deadline - now;

    if (remaining <= 0) {
      return { totalHours: 0, totalMinutes: 0, hours: 0, minutes: 0, isExpired: true, isUrgent: true };
    }

    const totalMinutes = Math.floor(remaining / (60 * 1000));
    const totalHours = totalMinutes / 60;
    const hours = Math.floor(totalHours);
    const minutes = totalMinutes % 60;
    const isUrgent = totalHours <= 12;

    return { totalHours, totalMinutes, hours, minutes, isExpired: false, isUrgent };
  }

  /**
   * Format countdown display
   * @param timeRemaining Time remaining object
   * @param isInBadge If true, uses white text (for badges with colored backgrounds). If false, uses colored text (for table rows)
   */
  private formatCountdown(timeRemaining: ReturnType<typeof this.getTimeRemaining>, isInBadge: boolean = false): string {
    if (timeRemaining.isExpired) {
      const colorClass = isInBadge ? 'text-white' : 'text-danger';
      return `<span class="${colorClass} fw-bold">Hết hạn</span>`;
    }

    const colorClass = isInBadge ? 'text-white' : (timeRemaining.isUrgent ? 'text-danger' : 'text-warning');
    return `<span class="${colorClass} fw-bold">${timeRemaining.hours}h ${timeRemaining.minutes}m</span>`;
  }

  /**
   * Helper: Get status badge
   */
  private getStatusBadge(status: string): { text: string; class: string } {
    const statusMap: Record<string, { text: string; class: string }> = {
      "Đang xử lý": { text: "Đang xử lý", class: "bg-warning text-dark" },
      "Đang giao": { text: "Đang giao", class: "bg-info" },
      "Đã giao": { text: "Đã giao", class: "bg-success" },
      "Đã hủy": { text: "Đã hủy", class: "bg-danger" },
      "Đã trả": { text: "Đã trả", class: "bg-secondary" },
    };
    return statusMap[status] || { text: status, class: "bg-secondary" };
  }

  /**
   * Helper: Get payment badge
   */
  private getPaymentBadge(paymentStatus: string): { text: string; class: string } {
    const paymentMap: Record<string, { text: string; class: string }> = {
      pending: { text: "Chưa thanh toán", class: "bg-warning text-dark" },
      paid: { text: "Đã thanh toán", class: "bg-success" },
      failed: { text: "Thất bại", class: "bg-danger" },
      refunded: { text: "Đã hoàn tiền", class: "bg-info" },
    };
    return paymentMap[paymentStatus] || { text: paymentStatus, class: "bg-secondary" };
  }

  /**
   * Helper: Get proof badge
   */
  private getProofBadge(proofStatus: string): { text: string; class: string } {
    const proofMap: Record<string, { text: string; class: string }> = {
      pending: { text: "Chưa kiểm tra", class: "bg-warning text-dark" },
      accepted: { text: "Đã xác nhận", class: "bg-success" },
      rejected: { text: "Từ chối", class: "bg-danger" },
    };
    return proofMap[proofStatus] || { text: proofStatus, class: "bg-secondary" };
  }

  /**
   * Helper: Format payment method
   */
  private formatPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      cod: "Thanh toán khi nhận hàng",
      bank_transfer: "Chuyển khoản ngân hàng",
      momo: "MoMo",
      zalopay: "ZaloPay",
      vnpay: "VNPAY",
    };
    return methodMap[method] || method;
  }

  /**
   * Helper: Format price
   */
  private formatPrice(price: number): string {
    return price.toLocaleString("vi-VN") + " VND";
  }
}

// Make controller available globally
declare global {
  interface Window {
    adminOrderController: AdminOrderController;
  }
}
