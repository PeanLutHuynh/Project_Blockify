// Helpers
const formatVND = (n: number): string => {
  try { return new Intl.NumberFormat('vi-VN').format(n) + ' VND'; } catch(_){ return (n||0) + ' VND'; }
};

type CartItem = {
  id: string;
  title: string;
  img: string;
  priceText: string;
  price: number;
  qty: number;
  selected?: boolean;
};

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem('cartItems');
    const items: CartItem[] = raw ? JSON.parse(raw) : [];
    // Ensure selected flag defaults to true
    items.forEach((it: CartItem) => { if(typeof it.selected === 'undefined') it.selected = true; });
    return items;
  } catch(_) { return []; }
}

function saveCart(items: CartItem[]): void {
  try { localStorage.setItem('cartItems', JSON.stringify(items)); } catch(_) {}
}

function render(): void {
  const listEl = document.getElementById('cart-list');
  const totalEl = document.getElementById('grand-total');
  const items = loadCart();
  if(!listEl || !totalEl) return;
  if(items.length === 0){
    listEl.innerHTML = '<div class="text-center text-muted py-5">Giỏ hàng trống</div>';
    totalEl.textContent = '0 VND';
    const sa = document.getElementById('select-all') as HTMLInputElement | null;
    if(sa){ sa.checked = false; sa.indeterminate = false; }
    return;
  }
  listEl.innerHTML = items.map((it: CartItem, idx: number) => `
    <div class="row cart-item align-items-center" data-index="${idx}">
      <div class="col-6 d-flex align-items-center">
        <input type="checkbox" class="form-check-input me-2 row-check" ${it.selected !== false ? 'checked' : ''}>
        <img src="${it.img}" class="product-img me-3">
        <span>${it.title}</span>
      </div>
      <div class="col-2">${it.priceText || formatVND(it.price)}</div>
      <div class="col-2 quantity-control d-flex align-items-center">
        <button class="btn-minus">-</button>
        <input type="text" value="${it.qty}" class="form-control text-center mx-1 qty-input" style="width:50px;">
        <button class="btn-plus">+</button>
      </div>
      <div class="col-2 price">${formatVND(it.price * it.qty)} <i class="fas fa-trash ms-2 text-muted btn-remove" role="button"></i></div>
    </div>
  `).join('');

  const grand = items.filter((it: CartItem) => it.selected !== false)
    .reduce((s: number, it: CartItem) => s + (Number(it.price)||0) * (Number(it.qty)||0), 0);
  totalEl.textContent = formatVND(grand);

  // Update select-all state
  const allSelected = items.every((it: CartItem) => it.selected !== false);
  const noneSelected = items.every((it: CartItem) => it.selected === false);
  const sa = document.getElementById('select-all') as HTMLInputElement | null;
  if(sa){
    sa.checked = allSelected && !noneSelected;
    sa.indeterminate = !allSelected && !noneSelected;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Event delegation
  const cartList = document.getElementById('cart-list');
  if (cartList) {
    cartList.addEventListener('click', function(e) {
      const target = e.target as HTMLElement | null;
      const row = target ? target.closest('.cart-item') as HTMLElement | null : null;
      if(!row) return;
      const idx = Number(row.getAttribute('data-index'));
      const items = loadCart();
      if(Number.isNaN(idx) || !items[idx]) return;
      if(target && target.classList.contains('btn-plus')){
        items[idx].qty += 1;
        saveCart(items); render();
      } else if(target && target.classList.contains('btn-minus')){
        items[idx].qty = Math.max(1, (Number(items[idx].qty)||1) - 1);
        saveCart(items); render();
      } else if(target && target.classList.contains('btn-remove')){
        items.splice(idx,1);
        saveCart(items); render();
      }
    });

    cartList.addEventListener('change', function(e) {
      const target = e.target as HTMLElement | null;
      if(!target || !target.classList.contains('qty-input')) return;
      const row = target.closest('.cart-item') as HTMLElement | null;
      const idx = Number(row?.getAttribute('data-index'));
      const items = loadCart();
      let qty = Number((target as HTMLInputElement).value);
      if(!Number.isFinite(qty) || qty < 1) qty = 1;
      items[idx].qty = qty;
      saveCart(items); render();
    });

    // Handle row checkbox toggle
    cartList.addEventListener('change', function(e) {
      const target = e.target as HTMLElement | null;
      if(!target || !target.classList.contains('row-check')) return;
      const row = target.closest('.cart-item') as HTMLElement | null;
      const idx = Number(row?.getAttribute('data-index'));
      const items = loadCart();
      if(Number.isNaN(idx) || !items[idx]) return;
      items[idx].selected = (target as HTMLInputElement).checked;
      saveCart(items); render();
    });
  }

  // Select-all toggle
  const selectAll = document.getElementById('select-all') as HTMLInputElement | null;
  if (selectAll) {
    selectAll.addEventListener('change', function(e) {
      const items = loadCart();
      const checked = (e.target as HTMLInputElement).checked;
      items.forEach((it: CartItem) => it.selected = checked);
      saveCart(items); render();
    });
  }

  // Initial render
  render();

  // Purchase -> OrderPage with selected items
  const btnPurchase = document.getElementById('btn-purchase');
  if (btnPurchase) {
    btnPurchase.addEventListener('click', function(){
      const items = loadCart().filter((it: CartItem) => it.selected !== false && (Number(it.qty)||0) > 0);
      if(items.length === 0){
        alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán.');
        return;
      }
      try {
        localStorage.setItem('orderItems', JSON.stringify(items));
      } catch(_) {}
      window.location.href = 'OrderPage.html';
    });
  }
});
