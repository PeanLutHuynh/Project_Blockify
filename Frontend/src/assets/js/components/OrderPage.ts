import { initializeOnReady } from '../../../core/config/init.js';
import { authService } from '../../../core/services/AuthService.js';

// Initialize app and run page logic
initializeOnReady(() => {
  // Check authentication - Order page requires login
  if (!authService.isAuthenticated()) {
    alert('Please sign in to continue with your order.');
    window.location.href = 'SigninPage.html';
    return;
  }
  
  // Original order page logic
  initializeOrderPage();
});

function initializeOrderPage() {
  const formatVND = (n: number): string => {
    try { return new Intl.NumberFormat('vi-VN').format(n) + ' VND'; } catch(_){ return (n||0) + ' VND'; }
  };
  
  type OrderItem = {
    img: string;
    title: string;
    qty: number;
    price: number;
  };
  
  function loadOrderItems(): OrderItem[] {
    try{
      const raw = localStorage.getItem('orderItems');
      return raw ? JSON.parse(raw) : [];
    }catch(_){ return []; }
  }
  
  function renderOrder(): void {
    const items = loadOrderItems();
    const wrap = document.getElementById('order-items');
    if(!wrap) return;
    
    if(items.length === 0){
      wrap.innerHTML = '<div class="text-muted">Không có sản phẩm. Vui lòng quay lại giỏ hàng.</div>';
      const subtotalEl = document.getElementById('subtotal');
      const shippingEl = document.getElementById('shipping');
      const grandTotalEl = document.getElementById('grand-total');
      if(subtotalEl) subtotalEl.textContent = '0 VND';
      if(shippingEl) shippingEl.textContent = '0 VND';
      if(grandTotalEl) grandTotalEl.textContent = '0 VND';
      return;
    }
    
    wrap.innerHTML = items.map(it => `
      <div class="d-flex align-items-center mb-3">
        <img src="${it.img}" alt="${it.title}" style="width:60px;height:auto;" class="me-2">
        <div>
          <p class="mb-0 fw-bold">${it.title}</p>
          <small>Quantity: ${it.qty}</small>
        </div>
        <div class="ms-auto">${formatVND((Number(it.price)||0) * (Number(it.qty)||0))}</div>
      </div>
    `).join('');
    
    const subtotal = items.reduce((s,it)=> s + (Number(it.price)||0) * (Number(it.qty)||0), 0);
    const shipping = subtotal > 0 ? 15000 : 0;
    
    const subtotalEl = document.getElementById('subtotal');
    const shippingEl = document.getElementById('shipping');
    const grandTotalEl = document.getElementById('grand-total');
    if(subtotalEl) subtotalEl.textContent = formatVND(subtotal);
    if(shippingEl) shippingEl.textContent = formatVND(shipping);
    if(grandTotalEl) grandTotalEl.textContent = formatVND(subtotal + shipping);
  }
  
  renderOrder();

  // Payment method UI
  const uploadBox = document.getElementById('upload-box');
  const uploadBtn = document.getElementById('pm-upload-btn');
  
  if(uploadBtn && uploadBox) {
    uploadBtn.addEventListener('click', function(){
      uploadBox.classList.toggle('d-none');
    });
  }
}
