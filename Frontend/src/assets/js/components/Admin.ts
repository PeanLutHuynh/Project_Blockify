import { AdminController } from '../../../modules/admin/AdminController.js';
import { loadConfig } from '../../../core/config/env.js';

/**
 * Admin Page Entry Point
 * Initializes AdminController when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Wait for ENV to be loaded
    await loadConfig();
    
    // Initialize AdminController
    const adminController = new AdminController();
    await adminController.initialize();

   
    (document.getElementById('shopName') as HTMLInputElement).value = 'Blockify Store';
    (document.getElementById('shopAddress') as HTMLInputElement).value = '123 Đường Lê Lợi, Q.1, TP HCM';
    (document.getElementById('shopPhone') as HTMLInputElement).value = '0909111222';
    (document.getElementById('shopEmail') as HTMLInputElement).value = 'shop@blockify.vn';
    (document.getElementById('shopDesc') as HTMLTextAreaElement).value = 'Cửa hàng đồ chơi Lego chính hãng!';

    // Shop logo preview
    const shopLogoInput = document.getElementById('shopLogo') as HTMLInputElement;
    const shopLogoPreview = document.getElementById('shopLogoPreview') as HTMLImageElement;
    if (shopLogoInput && shopLogoPreview) {
      shopLogoInput.addEventListener('change', function () {
        const file = shopLogoInput.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = evt => {
            shopLogoPreview.src = evt.target?.result as string;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // let orderDataDemo = [{
    //   id: 'ODR001',
    //   name: 'Xe cảnh sát',
    //   quantity: 1,
    //   variant: 'Mẫu A',
    //   productImg: 'img/Rectangle 108 (2).png',
    //   customer: 'ChessicaNguyen',
    //   customerEmail: 'chessica@gmail.com',
    //   customerPhone: '0908123456',
    //   customerAddress: '56 Đường Lê Lợi, Q.1, TP.HCM',
    //   orderDate: '09-05-2025',
    //   totalAmount: '230.000 VND',
    //   payProof: 'img/pay-proof-001.png',
    //   paymentMethod: 'Chuyển khoản',
    //   status: 'Processing', // trạng thái: Processing, Shipping, Delivered, Returned, Cancelled, Rejected
    //   cancelReason: '',
    //   refundReason: ''
    // }];
    // function renderOrderTable() {
    //   // Render lại UI cho tbody#orderList bằng orderDataDemo
    //   const tbody = document.getElementById('orderList');
    //   if(!tbody) return;
    //   tbody.innerHTML = orderDataDemo.map(order => `
    //     <tr>
    //       <td><input type="checkbox" ${order.status==='Cancelled' ? 'disabled':''}></td>
    //       <td>#${order.id}</td>
    //       <td>${order.name}</td>
    //       <td>${order.quantity}</td>
    //       <td>${order.variant}</td>
    //       <td><img src="${order.productImg}" alt="Sản phẩm" style="width:40px;height:30px;object-fit:cover;"></td>
    //       <td>${order.customer}</td>
    //       <td>${order.customerAddress}</td>
    //       <td>${order.customerEmail}</td>
    //       <td>${order.customerPhone}</td>
    //       <td>${order.orderDate}</td>
    //       <td>${order.totalAmount}</td>
    //       <td><img src="${order.payProof}" alt="Minh chứng" style="width:40px;height:30px;object-fit:cover;"></td>
    //       <td>${order.paymentMethod}</td>
    //       <td><span class="badge bg-${order.status==='Processing'? 'warning text-dark':'success'} order-status">${order.status==='Processing'? 'Đang xử lý' :
    //       order.status==='Shipping' ? 'Đang giao' :
    //       order.status==='Delivered' ? 'Đã giao' :
    //       order.status==='Returned' ? 'Đã hoàn/trả' :
    //       order.status==='Cancelled' ? 'Đã hủy' :
    //       order.status==='Rejected' ? 'Từ chối trả hàng/hoàn' : 'Hoàn tất'}</span></td>
    //       <td>
    //         <button type="button" class="btn btn-outline btn-sm show-order-detail" data-order-id="${order.id}" ${order.status==='Cancelled' ? 'disabled':''}>Chi tiết</button>
    //         <button type="button" class="btn btn-outline-secondary btn-sm action-next-status" data-order-id="${order.id}" ${order.status==='Cancelled' ? 'disabled':''}>Cập nhật trạng thái</button>
    //         <button type="button" class="btn btn-outline-info btn-sm check-payment-proof" data-order-id="${order.id}" ${order.status==='Cancelled' ? 'disabled':''}>Kiểm tra minh chứng</button>
    //         <button type="button" class="btn btn-outline-danger btn-sm cancel-order-btn" data-order-id="${order.id}" ${order.status==='Cancelled' ? 'disabled':''}>Huỷ đơn</button>
    //         <button type="button" class="btn btn-outline-warning btn-sm refund-order-btn" data-order-id="${order.id}" ${order.status==='Cancelled' ? 'disabled':''}>Hoàn/Trả hàng</button>
    //       </td>
    //     </tr>
    //   `).join('');
    //   attachOrderActionEvents();
    // }
    // function attachOrderActionEvents() {
    //   document.querySelectorAll('.action-next-status').forEach(btn => {
    //     btn.addEventListener('click', () => {
    //       const orderId = (btn as HTMLElement).getAttribute('data-order-id');
    //       const order = orderDataDemo.find(o => o.id === orderId);
    //       if(order && order.status!=='Cancelled') {
    //         if(order.status==='Processing') order.status='Shipping';
    //         else if(order.status==='Shipping') order.status='Delivered';
    //         else if(order.status==='Delivered') alert('Đơn đã giao, không thể cập nhật!');
    //         renderOrderTable();
    //       }
    //     });
    //   });
    //   document.querySelectorAll('.check-payment-proof').forEach(btn => {
    //     btn.addEventListener('click', () => {
    //       const orderId = (btn as HTMLElement).getAttribute('data-order-id');
    //       const order = orderDataDemo.find(o => o.id === orderId);
    //       if(order && order.status==='Processing') {
    //         if(confirm('Minh chứng thanh toán OK?')) { alert('Xác thực thành công!'); }
    //         else { alert('Xác thực thất bại! Có thể hủy đơn hoặc liên hệ lại.'); }
    //       }
    //     });
    //   });
    //   document.querySelectorAll('.cancel-order-btn').forEach(btn => {
    //     btn.addEventListener('click', () => {
    //       const orderId = (btn as HTMLElement).getAttribute('data-order-id');
    //       const order = orderDataDemo.find(o => o.id === orderId);
    //       if(order && order.status!=='Cancelled') {
    //         const reason = prompt('Nhập lý do hủy đơn:');
    //         if(reason!==null) { order.status='Cancelled'; order.cancelReason=reason||'Không ghi rõ'; }
    //         renderOrderTable();
    //       }
    //     });
    //   });
    //   document.querySelectorAll('.refund-order-btn').forEach(btn => {
    //     btn.addEventListener('click', () => {
    //       const orderId = (btn as HTMLElement).getAttribute('data-order-id');
    //       const order = orderDataDemo.find(o => o.id === orderId);
    //       if(order && ['Delivered','Shipping'].includes(order.status)) {
    //         const reason = prompt('Lý do trả/hoàn? Chọn OK để hoàn/trả, Cancel để từ chối.');
    //         if(reason!==null) {
    //           if(confirm('Admin đồng ý cho hoàn/trả?')) { order.status='Returned'; order.refundReason=reason; alert('Đã hoàn/trả thành công!'); }
    //           else { order.status='Rejected'; order.refundReason=reason; alert('Từ chối trả hàng/hoàn tiền!'); }
    //           renderOrderTable();
    //         }
    //       } else { alert('Chỉ được hoàn/trả khi đã giao!'); }
    //     });
    //   });
    //   // click show-order-detail attach lại logic nếu cần
    //   document.querySelectorAll('.show-order-detail').forEach(btn => {
    //     btn.addEventListener('click', () => {
    //       const orderId = (btn as HTMLElement).getAttribute('data-order-id');
    //       showOrderDetailModal(orderId as string);
    //     });
    //   });
    // }
    // function showOrderDetailModal(orderId: string) {
    //   const order = orderDataDemo.find(o => o.id === orderId);
    //   if (!order) return;
    //   (document.getElementById('detailOrderId') as HTMLElement).innerText = order.id;
    //   (document.getElementById('detailOrderName') as HTMLElement).innerText = order.name;
    //   (document.getElementById('detailOrderQuantity') as HTMLElement).innerText = order.quantity + '';
    //   (document.getElementById('detailOrderVariant') as HTMLElement).innerText = order.variant;
    //   (document.getElementById('detailOrderTotal') as HTMLElement).innerText = order.totalAmount;
    //   (document.getElementById('detailOrderStatus') as HTMLElement).innerText = order.status;
    //   (document.getElementById('detailProductImg') as HTMLImageElement).src = order.productImg;
    //   (document.getElementById('detailPayProof') as HTMLImageElement).src = order.payProof;
    //   (document.getElementById('detailCustomerName') as HTMLElement).innerText = order.customer;
    //   (document.getElementById('detailCustomerEmail') as HTMLElement).innerText = order.customerEmail;
    //   (document.getElementById('detailCustomerPhone') as HTMLElement).innerText = order.customerPhone;
    //   (document.getElementById('detailCustomerAddress') as HTMLElement).innerText = order.customerAddress;
    //   (document.getElementById('detailPaymentMethod') as HTMLElement).innerText = order.paymentMethod;
    //   // Cập nhật nút chức năng modal chi tiết theo trạng thái
    //   const orderActionFooter = document.querySelector('.order-action-footer');
    //   if(orderActionFooter){
    //     (orderActionFooter.querySelector('.next-status-btn') as HTMLButtonElement).onclick = function(){
    //       if(order.status==='Processing') order.status='Shipping';
    //       else if(order.status==='Shipping') order.status='Delivered';
    //       else if(order.status==='Delivered') alert('Đơn đã giao, không thể cập nhật!');
    //       renderOrderTable();
    //       // @ts-ignore
    //       bootstrap.Modal.getInstance(document.getElementById('orderDetailModal'))?.hide();
    //     };
    //     (orderActionFooter.querySelector('.check-proof-btn') as HTMLButtonElement).onclick = function(){
    //       if(confirm('Minh chứng thanh toán OK?')) { alert('Xác thực thành công!'); }
    //       else { alert('Xác thực thất bại! Có thể hủy đơn hoặc liên hệ lại.'); }
    //     };
    //     (orderActionFooter.querySelector('.cancel-btn') as HTMLButtonElement).onclick = function(){
    //       const reason = prompt('Nhập lý do hủy đơn:');
    //       if(reason!==null) { order.status='Cancelled'; order.cancelReason=reason||'Không ghi rõ'; }
    //       renderOrderTable();
    //       // @ts-ignore
    //       bootstrap.Modal.getInstance(document.getElementById('orderDetailModal'))?.hide();
    //     };
    //     (orderActionFooter.querySelector('.refund-btn') as HTMLButtonElement).onclick = function(){
    //       const reason = prompt('Lý do trả/hoàn? Chọn OK để hoàn/trả, Cancel để từ chối.');
    //       if(reason!==null) {
    //         if(confirm('Admin đồng ý cho hoàn/trả?')) { order.status='Returned'; order.refundReason=reason; alert('Đã hoàn/trả thành công!'); }
    //         else { order.status='Rejected'; order.refundReason=reason; alert('Từ chối trả hàng/hoàn tiền!'); }
    //         renderOrderTable();
    //         // @ts-ignore
    //         bootstrap.Modal.getInstance(document.getElementById('orderDetailModal'))?.hide();
    //       }
    //     };
    //   }
    //   // @ts-ignore
    //   const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    //   modal.show();
    // }
    // // Lần đầu tiên render bảng order và attach event
    // renderOrderTable();

    // DEMO DATA PHẢN HỒI/ĐÁNH GIÁ
    const feedbackListDemo = [
      {
        id: 'FB001',
        product: 'Xe cảnh sát',
        productImg: 'img/Rectangle 108 (2).png',
        customer: 'Nguyễn Văn A',
        customerEmail: 'vana@gmail.com',
        stars: 5,
        content: 'Sản phẩm rất tốt, giao hàng nhanh!',
        replied: false,
        adminReply: ''
      },
      {
        id: 'FB002',
        product: 'Xe xây dựng vàng',
        productImg: 'img/Rectangle 108 (3).png',
        customer: 'Trần Bảo B',
        customerEmail: 'baobb@gmail.com',
        stars: 4,
        content: 'Đúng mô tả, bé nhà mình thích lắm.',
        replied: false,
        adminReply: ''
      },
    ];

    // XỬ LÝ CHỨC NĂNG "XEM" HOẶC "GHI NHẬN" feedback
    function renderFeedbackDetail(feedbackId: string) {
      const fb = feedbackListDemo.find(f => f.id === feedbackId);
      if (!fb) return;
      (document.getElementById('feedbackProductName') as HTMLElement).innerText = fb.product;
      (document.getElementById('feedbackCustomer') as HTMLElement).innerText = fb.customer;
      (document.getElementById('feedbackCustomerEmail') as HTMLElement).innerText = fb.customerEmail;
      (document.getElementById('feedbackStars') as HTMLElement).innerHTML =
        '<span class="text-warning">' + '★'.repeat(fb.stars) + '☆'.repeat(5 - fb.stars) + '</span>';
      (document.getElementById('feedbackContent') as HTMLElement).innerText = fb.content;
      (document.getElementById('adminReply') as HTMLTextAreaElement).value = fb.adminReply || '';
      // Lưu feedbackId đang xem vào dataset modal để biết id xử lý
      const modal = document.getElementById('feedbackDetailModal');
      if(modal) modal.setAttribute('data-feedback-id', feedbackId);
      // Hiển thị popup
      // @ts-ignore
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    }
    document.querySelectorAll('.view-feedback-btn').forEach(btn => {
      btn.addEventListener('click', ()=> {
        const feedbackId = (btn as HTMLElement).getAttribute('data-feedback-id');
        if(feedbackId) renderFeedbackDetail(feedbackId);
      });
    });
    // "Ghi nhận" ngoài list cũng vào modal
    document.querySelectorAll('.acknowledge-feedback-btn').forEach(btn => {
      btn.addEventListener('click', ()=> {
        const feedbackId = (btn as HTMLElement).getAttribute('data-feedback-id');
        if(feedbackId) renderFeedbackDetail(feedbackId);
      });
    });
    // Nút trong MODAL
    document.querySelector('#feedbackDetailModal .send-feedback-reply')?.addEventListener('click', ()=>{
      const modal = document.getElementById('feedbackDetailModal');
      if(!modal) return;
      const feedbackId = modal.getAttribute('data-feedback-id');
      const reply = (document.getElementById('adminReply') as HTMLTextAreaElement)?.value?.trim() || '';
      if(feedbackId){
        const fb = feedbackListDemo.find(f => f.id === feedbackId);
        if(fb) { fb.adminReply = reply; fb.replied = true; alert('Gửi phản hồi thành công!'); }
      }
      // @ts-ignore
      bootstrap.Modal.getInstance(modal)?.hide();
    });
    document.querySelector('#feedbackDetailModal .acknowledge-feedback')?.addEventListener('click', ()=>{
      const modal = document.getElementById('feedbackDetailModal');
      if(!modal) return;
      const feedbackId = modal.getAttribute('data-feedback-id');
      if(feedbackId){
        const fb = feedbackListDemo.find(f => f.id === feedbackId);
        if(fb) { fb.replied = true; alert('Đã ghi nhận phản hồi.'); }
      }
      // @ts-ignore
      bootstrap.Modal.getInstance(modal)?.hide();
    });
  } catch (error) {
    console.error('Failed to initialize Admin Controller:', error);
  }
});
