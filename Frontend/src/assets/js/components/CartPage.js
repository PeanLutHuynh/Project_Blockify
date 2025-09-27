// Helpers
const formatVND = (n) => {
  try { return new Intl.NumberFormat('vi-VN').format(n) + ' VND'; } catch(_){ return (n||0) + ' VND'; }
};

function loadCart(){
  try {
    const raw = localStorage.getItem('cartItems');
    const items = raw ? JSON.parse(raw) : [];
    // Ensure selected flag defaults to true
    items.forEach(it => { if(typeof it.selected === 'undefined') it.selected = true; });
    return items;
  } catch(_) { return []; }
}

function saveCart(items){
  try { localStorage.setItem('cartItems', JSON.stringify(items)); } catch(_) {}
}

function render(){
  const listEl = document.getElementById('cart-list');
  const totalEl = document.getElementById('grand-total');
  const items = loadCart();
  if(items.length === 0){
    listEl.innerHTML = '<div class="text-center text-muted py-5">Giỏ hàng trống</div>';
    totalEl.textContent = '0 VND';
    const sa = document.getElementById('select-all');
    if(sa){ sa.checked = false; sa.indeterminate = false; }
    return;
  }
  listEl.innerHTML = items.map((it, idx) => `
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

  const grand = items.filter(it => it.selected !== false)
    .reduce((s, it) => s + (Number(it.price)||0) * (Number(it.qty)||0), 0);
  totalEl.textContent = formatVND(grand);

  // Update select-all state
  const allSelected = items.every(it => it.selected !== false);
  const noneSelected = items.every(it => it.selected === false);
  const sa = document.getElementById('select-all');
  if(sa){
    sa.checked = allSelected && !noneSelected;
    sa.indeterminate = !allSelected && !noneSelected;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Event delegation
  document.getElementById('cart-list').addEventListener('click', function(e){
    const row = e.target.closest('.cart-item');
    if(!row) return;
    const idx = Number(row.getAttribute('data-index'));
    const items = loadCart();
    if(Number.isNaN(idx) || !items[idx]) return;
    if(e.target.classList.contains('btn-plus')){
      items[idx].qty += 1;
      saveCart(items); render();
    } else if(e.target.classList.contains('btn-minus')){
      items[idx].qty = Math.max(1, (Number(items[idx].qty)||1) - 1);
      saveCart(items); render();
    } else if(e.target.classList.contains('btn-remove')){
      items.splice(idx,1);
      saveCart(items); render();
    }
  });

  document.getElementById('cart-list').addEventListener('change', function(e){
    if(!e.target.classList.contains('qty-input')) return;
    const row = e.target.closest('.cart-item');
    const idx = Number(row.getAttribute('data-index'));
    const items = loadCart();
    let qty = parseInt(e.target.value, 10);
    if(!Number.isFinite(qty) || qty < 1) qty = 1;
    items[idx].qty = qty;
    saveCart(items); render();
  });

  // Handle row checkbox toggle
  document.getElementById('cart-list').addEventListener('change', function(e){
    if(!e.target.classList.contains('row-check')) return;
    const row = e.target.closest('.cart-item');
    const idx = Number(row.getAttribute('data-index'));
    const items = loadCart();
    if(Number.isNaN(idx) || !items[idx]) return;
    items[idx].selected = e.target.checked;
    saveCart(items); render();
  });

  // Select-all toggle
  document.getElementById('select-all').addEventListener('change', function(e){
    const items = loadCart();
    const checked = e.target.checked;
    items.forEach(it => it.selected = checked);
    saveCart(items); render();
  });

  // Initial render
  render();

  // Purchase -> OrderPage with selected items
  document.getElementById('btn-purchase').addEventListener('click', function(){
    const items = loadCart().filter(it => it.selected !== false && (Number(it.qty)||0) > 0);
    if(items.length === 0){
      alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán.');
      return;
    }
    try {
      localStorage.setItem('orderItems', JSON.stringify(items));
    } catch(_) {}
    window.location.href = 'OrderPage.html';
  });
});
