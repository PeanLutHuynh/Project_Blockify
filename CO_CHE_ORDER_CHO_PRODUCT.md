# CƠ CHẾ QUẢN LÝ ĐƠN HÀNG (ORDER) - PHÂN TÍCH CHO SẢN PHẨM (PRODUCT)

## 📋 TỔNG QUAN

Phân tích chi tiết cơ chế của **Quản lý Đơn hàng** trong trang Admin để áp dụng cho **Quản lý Sản phẩm**.

---

## 🏗️ KIẾN TRÚC BACKEND

### 1. **File Structure - Order Module**

```
backend/src/modules/admin/
├── presentation/
│   ├── AdminOrderController.ts      # HTTP Controller
│   └── adminOrderRoutes.ts          # Routes registration
├── application/
│   └── AdminOrderService.ts         # Business logic
└── infrastructure/
    └── repositories/
        └── AdminRepository.ts       # Admin audit logs

backend/src/modules/order/
├── domain/
│   ├── entities/
│   │   ├── Order.ts                 # Order entity
│   │   ├── OrderItem.ts             # OrderItem entity
│   │   └── PaymentProof.ts          # PaymentProof entity
│   └── IOrderRepository.ts          # Repository interface
├── application/
│   ├── dto/
│   │   ├── OrderDTO.ts              # Data Transfer Objects
│   │   └── OrderResponseDTO.ts      # Response DTOs
│   ├── CheckoutService.ts           # Checkout logic
│   └── PaymentProofService.ts       # Payment proof logic
├── infrastructure/
│   ├── OrderRepository.ts           # Supabase implementation
│   └── PaymentProofRepository.ts    # Payment proof repo
└── presentation/
    ├── OrderController.ts           # User-facing controller
    ├── PaymentProofController.ts    # Payment proof controller
    ├── orderRoutes.ts               # Order routes
    └── paymentProofRoutes.ts        # Payment routes
```

---

## 🔌 BACKEND IMPLEMENTATION

### 1. **AdminOrderController.ts** - Presentation Layer

**Chức năng:**
- Xử lý HTTP requests cho admin quản lý đơn hàng
- Validate input, parse parameters
- Gọi service layer cho business logic
- Trả response JSON chuẩn

**Pattern sử dụng:**
```typescript
export class AdminOrderController {
  constructor(private adminOrderService: AdminOrderService) {}

  // Helper methods
  private sendResponse(res: HttpResponse, statusCode: number, data: any): void
  private success(message: string, data?: any): any
  private error(message: string, details?: any): any

  // API endpoints
  async getAllOrders(req: HttpRequest, res: HttpResponse): Promise<void>
  async getOrderById(req: HttpRequest, res: HttpResponse, orderId: string): Promise<void>
  async updateOrderStatus(req: HttpRequest, res: HttpResponse, orderId: string): Promise<void>
  async updatePaymentStatus(req: HttpRequest, res: HttpResponse, orderId: string): Promise<void>
  async cancelOrder(req: HttpRequest, res: HttpResponse, orderId: string): Promise<void>
  async processRefund(req: HttpRequest, res: HttpResponse, orderId: string): Promise<void>
}
```

**Điểm quan trọng:**
- **Authentication**: Lấy admin ID từ `req.user` (set bởi middleware)
- **Admin ID Resolution**: Query `admin_users` table để lấy `admin_id` từ `auth_uid`
```typescript
const user = (req as any).user;
const authUid = user?.id || user?.userId || user?.user_id;

const { data: adminData } = await supabaseAdmin
  .from("admin_users")
  .select("admin_id")
  .eq("auth_uid", authUid)
  .single();

const adminId = adminData.admin_id;
```

---

### 2. **AdminOrderService.ts** - Application Layer

**Chức năng:**
- Business logic cho order management
- Giao tiếp với repository layer
- Audit logging cho mọi thao tác admin
- Transaction handling

**Key Methods:**
```typescript
export class AdminOrderService {
  constructor(
    private orderRepository: OrderRepository,
    private auditLogRepository: AdminAuditLogRepository
  ) {}

  async getAllOrders(filters?: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<any>

  async getOrderById(orderId: number): Promise<any>
  async updateOrderStatus(orderId: number, newStatus: string, adminId: number, note?: string): Promise<void>
  async updatePaymentStatus(orderId: number, paymentStatus: "paid" | "failed" | "refunded", adminId: number, proofId?: number, proofStatus?: "accepted" | "rejected"): Promise<void>
  async cancelOrder(orderId: number, adminId: number, reason?: string): Promise<void>
  async processRefund(orderId: number, adminId: number, reason?: string): Promise<void>

  // Helper methods
  private async reduceStockForOrder(orderId: number): Promise<void>
  private async logAdminAction(adminId: number, action: AdminAction, targetId: string, targetType: string, payload?: any): Promise<void>
}
```

**Business Rules:**
1. **Stock Management**: Khi order status chuyển từ "Đang xử lý" → "Đang giao", giảm stock
2. **Auto Payment Update**: COD order được giao → auto update payment status = "paid"
3. **Status History**: Log mọi thay đổi status vào `order_status_history`
4. **Audit Logging**: Log mọi thao tác admin vào `admin_audit_logs`

**Supabase Query Pattern:**
```typescript
// Get orders with relations
const { data, error } = await supabaseAdmin
  .from("orders")
  .select(`
    *,
    order_items(*),
    payment_proofs(*),
    users(user_id, full_name, email, phone)
  `)
  .order("ordered_at", { ascending: false });
```

---

### 3. **adminOrderRoutes.ts** - Routes Registration

**Chức năng:**
- Đăng ký routes cho admin order management
- Khởi tạo dependencies (controller, service, repositories)
- Apply authentication middleware

**Pattern:**
```typescript
export function registerAdminOrderRoutes(router: any): void {
  // Initialize dependencies
  const orderRepository = new OrderRepository();
  const auditLogRepository = new AdminAuditLogRepository("admin_audit_logs");
  const adminOrderService = new AdminOrderService(orderRepository, auditLogRepository);
  const adminOrderController = new AdminOrderController(adminOrderService);

  // Register routes with authentication
  router.get("/api/admin/orders", authenticateToken, async (req, res) => {
    await adminOrderController.getAllOrders(req, res);
  });

  router.get("/api/admin/orders/:orderId", authenticateToken, async (req, res) => {
    const orderId = extractOrderIdFromUrl(req.url);
    await adminOrderController.getOrderById(req, res, orderId);
  });

  // ... more routes
}
```

**Routes đăng ký:**
- `GET /api/admin/orders` - Get all orders (with filters)
- `GET /api/admin/orders/:orderId` - Get order detail
- `PATCH /api/admin/orders/:orderId/status` - Update status
- `PATCH /api/admin/orders/:orderId/payment-status` - Update payment
- `POST /api/admin/orders/:orderId/cancel` - Cancel order
- `POST /api/admin/orders/:orderId/refund` - Process refund

---

### 4. **server.ts** - Main Server Setup

**Registration trong server:**
```typescript
import { registerAdminOrderRoutes } from './src/modules/admin/presentation/adminOrderRoutes';

async function bootstrap() {
  const server = new HttpServer(Number(ENV.PORT), ENV.HOST);
  
  // ... middlewares ...
  
  // Register admin order routes
  registerAdminOrderRoutes(server.getRouter());
  
  server.listen(() => {
    logger.info(`Server running on http://${ENV.HOST}:${ENV.PORT}`);
  });
}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. **AdminOrderController.ts** - Frontend Controller

**Chức năng:**
- Quản lý UI interactions cho order management
- Gọi API backend thông qua httpClient
- Render tables, modals
- Handle user actions

**Key Methods:**
```typescript
export class AdminOrderController {
  private currentOrders: any[] = [];
  private currentOrderDetail: any = null;
  private currentFilters?: { status?: string; paymentStatus?: string; search?: string };

  // API calls
  async loadOrders(filters?: {...}): Promise<void>
  async loadOrderDetail(orderId: number): Promise<void>
  async updateOrderStatus(orderId: number, newStatus: string, note?: string): Promise<void>
  async updatePaymentStatus(orderId: number, paymentStatus: string, proofId?: number, proofStatus?: string): Promise<void>
  async cancelOrder(orderId: number, reason?: string): Promise<void>
  async processRefund(orderId: number, reason?: string): Promise<void>

  // UI rendering
  private renderOrdersTable(): void
  private showOrderDetailModal(): void
  private generateOrderDetailModal(order: any): string
  private generateActionButtons(order: any): string
  private attachModalEventListeners(): void
  private closeOrderDetailModal(): void

  // Helper methods
  private sortOrdersByUrgency(orders: any[]): any[]
  private getTimeRemaining(orderedAt: string): {...}
  private formatCountdown(timeRemaining: any): string
  private getStatusBadge(status: string): {...}
  private getPaymentBadge(paymentStatus: string): {...}
  private formatPrice(price: number): string
}
```

**HTTP Client Pattern:**
```typescript
import { httpClient } from "../../core/api/FetchHttpClient.js";

// GET request
const response = await httpClient.get<any>(`/api/admin/orders?limit=100&status=${status}`);

// PATCH request
const response = await httpClient.patch(`/api/admin/orders/${orderId}/status`, {
  status: newStatus,
  note: note,
});

// POST request
const response = await httpClient.post(`/api/admin/orders/${orderId}/cancel`, {
  reason,
});
```

**UI Features:**
1. **Urgency Sorting**: Đơn hàng pending < 12h hiển thị đầu, highlighted red
2. **Countdown Timer**: Hiển thị thời gian còn lại để xác nhận (24h)
3. **Dynamic Modals**: Modal detail được generate động, cleanup khi đóng
4. **Action Buttons**: Buttons thay đổi theo status của order
5. **Real-time Updates**: Sau mỗi action, reload data để cập nhật UI

---

### 2. **Admin.html** - UI Integration

**Order Section HTML:**
```html
<section id="order" class="section">
  <div class="bar-blue">Quản lý đơn hàng</div>
  <div class="toolbar">
    <input class="search" placeholder="Tìm đơn hàng">
  </div>
  <div class="table-responsive">
    <table class="table" id="orderTable">
      <thead>
        <tr>
          <th>Mã đơn</th>
          <th>Khách hàng</th>
          <th>Email</th>
          <th>SĐT</th>
          <th>Ngày đặt</th>
          <th>Tổng tiền</th>
          <th>Trạng thái đơn</th>
          <th>Thanh toán</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody id="orderList"></tbody>
    </table>
  </div>
</section>
```

**Controller Initialization:**
```html
<script type="module">
  import { AdminOrderController } from '/dist/src/modules/admin/AdminOrderController.js';
  
  // Initialize controller
  const adminOrderController = new AdminOrderController();
  window.adminOrderController = adminOrderController;
  
  // Load orders when section is active
  document.addEventListener('DOMContentLoaded', () => {
    const orderSection = document.getElementById('order');
    if (orderSection && orderSection.classList.contains('active')) {
      adminOrderController.loadOrders();
    }
    
    // Load when switching to order section
    document.querySelectorAll('.menu li').forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        if (target === 'order') {
          adminOrderController.loadOrders();
        }
      });
    });
    
    setupOrderFilters();
  });
</script>
```

**Filter Setup:**
```javascript
function setupOrderFilters() {
  const toolbar = document.querySelector('#order .toolbar');
  
  // Add status filter dropdown
  const statusFilter = document.createElement('select');
  statusFilter.className = 'form-select d-inline-block w-auto ms-2';
  statusFilter.innerHTML = `
    <option value="">Tất cả trạng thái</option>
    <option value="Đang xử lý">Đang xử lý</option>
    <option value="Đang giao">Đang giao</option>
    <option value="Đã giao">Đã giao</option>
    <option value="Đã hủy">Đã hủy</option>
  `;
  
  // Add payment filter dropdown
  const paymentFilter = document.createElement('select');
  // ... similar ...
  
  toolbar.appendChild(statusFilter);
  toolbar.appendChild(paymentFilter);
  
  // Event listeners with debounce
  const loadWithFilters = () => {
    adminOrderController.loadOrders({
      status: statusFilter.value || undefined,
      paymentStatus: paymentFilter.value || undefined,
      search: searchInput?.value.trim() || undefined
    });
  };
  
  statusFilter.addEventListener('change', loadWithFilters);
  paymentFilter.addEventListener('change', loadWithFilters);
  
  // Search with debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadWithFilters, 500);
  });
}
```

---

## 🗄️ DATABASE SCHEMA

### Tables sử dụng:

**1. orders**
```sql
- order_id (PK)
- order_number (unique)
- user_id (FK -> users)
- customer_name
- customer_email
- customer_phone
- shipping_address
- shipping_city
- payment_method (cod/bank_transfer/momo/...)
- payment_status (pending/paid/failed/refunded)
- status (Đang xử lý/Đang giao/Đã giao/Đã hủy/Đã trả)
- subtotal
- shipping_fee
- discount_amount
- total_amount
- ordered_at
- created_at
- updated_at
```

**2. order_items**
```sql
- item_id (PK)
- order_id (FK -> orders)
- product_id (FK -> products)
- product_name
- product_sku
- quantity
- unit_price
- total_price
- created_at
```

**3. payment_proofs**
```sql
- proof_id (PK)
- order_id (FK -> orders)
- file_url
- status (pending/accepted/rejected)
- reviewed_by (FK -> admin_users)
- reviewed_at
- created_at
- updated_at
```

**4. order_status_history**
```sql
- history_id (PK)
- order_id (FK -> orders)
- old_status
- new_status
- changed_by_admin (FK -> admin_users)
- note
- created_at
```

**5. admin_audit_logs**
```sql
- log_id (PK)
- admin_id (FK -> admin_users)
- action (enum: UPDATE_ORDER_STATUS, UPDATE_PAYMENT_STATUS, CANCEL_ORDER, PROCESS_REFUND)
- target_id
- target_type (orders)
- payload (jsonb)
- created_at
```

**6. admin_users**
```sql
- admin_id (PK)
- auth_uid (FK -> auth.users)
- email
- full_name
- role
- is_active
- created_at
- updated_at
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### 1. **authenticateToken Middleware**

**Location:** `backend/src/infrastructure/auth/authMiddleware.ts`

**Chức năng:**
- Verify JWT token từ Authorization header
- Decode token để lấy user info
- Set `req.user` với user data

**Usage:**
```typescript
router.get("/api/admin/orders", authenticateToken, async (req, res) => {
  // req.user is now available
  const user = (req as any).user;
  const authUid = user.id || user.userId;
});
```

### 2. **Admin ID Resolution**

**Pattern trong mọi admin controller:**
```typescript
// 1. Get auth_uid from token
const user = (req as any).user;
const authUid = user?.id || user?.userId || user?.user_id;

if (!authUid) {
  this.sendResponse(res, 401, this.error("Unauthorized - Auth UID not found"));
  return;
}

// 2. Get admin_id from admin_users table
const { data: adminData, error: adminError } = await supabaseAdmin
  .from("admin_users")
  .select("admin_id")
  .eq("auth_uid", authUid)
  .single();

if (adminError || !adminData) {
  this.sendResponse(res, 401, this.error("Unauthorized - Admin not found"));
  return;
}

const adminId = adminData.admin_id;

// 3. Use adminId in service calls
await this.adminOrderService.updateOrderStatus(orderId, newStatus, adminId);
```

---

## 🔄 WORKFLOW ORDER MANAGEMENT

### 1. **Get All Orders**
```
User clicks "Đơn hàng" menu
  ↓
AdminOrderController.loadOrders()
  ↓
httpClient.get("/api/admin/orders?limit=100&status=...")
  ↓
Backend: AdminOrderController.getAllOrders()
  ↓
AdminOrderService.getAllOrders(filters)
  ↓
Supabase query with filters & joins
  ↓
Return orders array
  ↓
Frontend: renderOrdersTable()
  ↓
Display in table with countdown, badges
```

### 2. **View Order Detail**
```
User clicks "Chi tiết" button
  ↓
AdminOrderController.loadOrderDetail(orderId)
  ↓
httpClient.get(`/api/admin/orders/${orderId}`)
  ↓
Backend: AdminOrderController.getOrderById()
  ↓
AdminOrderService.getOrderById()
  ↓
Supabase query with all relations (items, proofs, history, user)
  ↓
Return full order object
  ↓
Frontend: showOrderDetailModal()
  ↓
Generate modal HTML dynamically
  ↓
Show Bootstrap modal
  ↓
Attach event listeners for action buttons
```

### 3. **Update Order Status**
```
User clicks "Xác nhận đơn hàng" button
  ↓
AdminOrderController.updateOrderStatus(orderId, "Đang giao", note)
  ↓
httpClient.patch(`/api/admin/orders/${orderId}/status`, { status, note })
  ↓
Backend: AdminOrderController.updateOrderStatus()
  ↓
Resolve admin_id from auth_uid
  ↓
AdminOrderService.updateOrderStatus(orderId, status, adminId, note)
  ↓
Get current order status
  ↓
Check if need to reduce stock (Đang xử lý → Đang giao)
  ↓
Update order status in DB
  ↓
Auto-update payment status if COD delivered
  ↓
Insert into order_status_history
  ↓
Log admin action to admin_audit_logs
  ↓
Return success
  ↓
Frontend: Reload order detail & order list
  ↓
Show success message
```

---

## 📦 ENVIRONMENT VARIABLES

**File:** `Project_Blockify/.env` (shared root)

**Required variables:**
```env
# Server
NODE_ENV=development
PORT=3001
HOST=localhost
FRONTEND_URL=http://127.0.0.1:3002

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Email
EMAIL_REDIRECT_URL=http://127.0.0.1:3002/src/pages/EmailVerified.html

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Loading env trong backend:**
```typescript
// backend/src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3001',
  HOST: process.env.HOST || 'localhost',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
  // ...
};
```

---

## 🎯 ÁP DỤNG CHO PRODUCT MANAGEMENT

### So sánh Order vs Product:

| **Aspect**                  | **Order**                                         | **Product**                                    |
|-----------------------------|---------------------------------------------------|------------------------------------------------|
| **Entity**                  | Order, OrderItem, PaymentProof                   | Product, ProductImage, Category                |
| **Main Operations**         | View, UpdateStatus, UpdatePayment, Cancel, Refund | Create, Read, Update, Delete, UpdateStock      |
| **Relations**               | order → items, proofs, history, user             | product → images, category                     |
| **Business Rules**          | Stock reduction, Auto payment, Status history    | Slug generation, Cannot delete with orders     |
| **Audit**                   | admin_audit_logs                                 | admin_audit_logs                               |
| **Routes Pattern**          | /api/admin/orders/:id/action                     | /api/admin/products/:id/action                 |
| **Frontend Controller**     | AdminOrderController                             | AdminProductController                         |
| **Service Layer**           | AdminOrderService                                | AdminProductService                            |

### Files đã tạo cho Product (tương tự Order):

✅ **Backend:**
1. `AdminProduct.ts` (entities) - Tương tự Order entities
2. `IAdminProductRepository.ts` - Tương tự IOrderRepository
3. `AdminProductDTO.ts` - Tương tự OrderDTO
4. `AdminProductRepository.ts` - Tương tự OrderRepository
5. `AdminProductService.ts` - Tương tự AdminOrderService
6. `AdminProductController.ts` - Tương tự AdminOrderController
7. `adminRoutes.ts` (updated) - Routes đã được thêm

✅ **Frontend:**
8. `AdminProductController.ts` - Tương tự AdminOrderController
9. `Admin.html` (updated) - Integration đã hoàn thành

### Điểm khác biệt cần lưu ý:

**Order:**
- Read-only operations (view, update status)
- Complex status workflow
- Payment proof verification
- Time-based urgency (countdown)

**Product:**
- Full CRUD operations
- Image upload/management
- Stock quantity management
- Slug auto-generation
- Category relationships

---

## 🚀 NEXT STEPS - HOÀN THIỆN PRODUCT

### 1. **Cần thêm Routes Registration**

Hiện tại routes của Product đã được add vào `adminRoutes.ts`, **NHƯNG** cần tạo file riêng:

**Tạo:** `backend/src/modules/admin/presentation/adminProductRoutes.ts`

```typescript
import { Router } from "../../../infrastructure/http/Router";
import { AdminProductController } from "./AdminProductController";
import { AdminProductService } from "../application/AdminProductService";
import { AdminProductRepository, ProductImageRepository, CategoryRepository } from "../infrastructure/repositories/AdminProductRepository";
import { authenticateToken } from "../../../infrastructure/auth";

export function registerAdminProductRoutes(router: Router): void {
  // Initialize dependencies
  const productRepo = new AdminProductRepository();
  const imageRepo = new ProductImageRepository();
  const categoryRepo = new CategoryRepository();
  const productService = new AdminProductService(productRepo, imageRepo, categoryRepo);
  const productController = new AdminProductController(productService);

  // Search products
  router.get("/api/admin/products/search", authenticateToken, async (req, res) => {
    await productController.searchProducts(req, res);
  });

  // Get all products
  router.get("/api/admin/products", authenticateToken, async (req, res) => {
    await productController.getAllProducts(req, res);
  });

  // Get product by ID
  router.get("/api/admin/products/:id", authenticateToken, async (req, res) => {
    const productId = extractIdFromUrl(req.url);
    await productController.getProductById(req, res, productId);
  });

  // Create product
  router.post("/api/admin/products", authenticateToken, async (req, res) => {
    await productController.createProduct(req, res);
  });

  // Update product
  router.put("/api/admin/products/:id", authenticateToken, async (req, res) => {
    const productId = extractIdFromUrl(req.url);
    await productController.updateProduct(req, res, productId);
  });

  // Delete product
  router.delete("/api/admin/products/:id", authenticateToken, async (req, res) => {
    const productId = extractIdFromUrl(req.url);
    await productController.deleteProduct(req, res, productId);
  });

  // ... more routes for stock, status, images, categories
}

function extractIdFromUrl(url: string | undefined): string {
  const urlParts = url?.split("/") || [];
  return urlParts[urlParts.length - 1].split("?")[0] || "";
}
```

**Update server.ts:**
```typescript
import { registerAdminProductRoutes } from './src/modules/admin/presentation/adminProductRoutes';

async function bootstrap() {
  // ...
  registerAdminProductRoutes(server.getRouter());
  // ...
}
```

### 2. **Test Endpoints**

Sau khi start server (`npm run dev`), test các endpoints:

```bash
# Get all products
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/admin/products

# Search products
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/admin/products/search?q=lego"

# Get product by ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/admin/products/123

# Create product
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Product","price":100000,...}' \
  http://localhost:3001/api/admin/products
```

### 3. **Frontend Testing**

1. Mở Admin.html trong browser
2. Login as admin
3. Click vào "Sản phẩm" menu
4. Test các chức năng:
   - ✅ Load danh sách sản phẩm
   - ✅ Search sản phẩm (nhấn Enter)
   - ✅ Thêm sản phẩm mới (modal)
   - ✅ Chỉnh sửa sản phẩm
   - ✅ Xóa sản phẩm
   - ✅ Upload hình ảnh

---

## 📚 KEY TAKEAWAYS

### Pattern chính học được từ Order:

1. **3-Layer Architecture:**
   - Presentation (Controller) → Application (Service) → Infrastructure (Repository)

2. **Dependency Injection:**
   - Controller nhận Service qua constructor
   - Service nhận Repository qua constructor

3. **Authentication Flow:**
   - authenticateToken middleware → req.user
   - Resolve admin_id từ auth_uid
   - Pass admin_id xuống service layer

4. **Supabase Patterns:**
   - Use `supabaseAdmin` for admin operations
   - `.select()` with relations using join syntax
   - `.eq()`, `.ilike()` for filtering
   - `.order()` for sorting
   - `.single()` for single record

5. **Frontend Patterns:**
   - Use `httpClient` from FetchHttpClient
   - Store current state (currentOrders, currentFilters)
   - Render methods update DOM
   - Modal generation with Bootstrap
   - Event listeners for interactions

6. **Error Handling:**
   - Try-catch in every async method
   - Consistent error response format
   - Logger for server-side errors
   - Alert for user-facing errors

7. **Audit Logging:**
   - Log every admin action
   - Include payload with changes
   - Store in admin_audit_logs table

---

## ✅ CHECKLIST HOÀN THÀNH

### Backend:
- [x] Domain entities (AdminProduct, ProductImage, Category)
- [x] Repository interfaces
- [x] DTOs
- [x] Repository implementations
- [x] Service layer với business logic
- [x] Controller với HTTP endpoints
- [x] Routes trong adminRoutes.ts
- [ ] **TODO: Tạo adminProductRoutes.ts riêng**
- [ ] **TODO: Register trong server.ts**

### Frontend:
- [x] AdminProductController với UI methods
- [x] Integration trong Admin.html
- [x] Search functionality
- [x] Modal management
- [ ] **TODO: Test với backend API thực**

### Testing:
- [ ] Compile TypeScript (✅ Done)
- [ ] Start backend server
- [ ] Test API endpoints với Postman/curl
- [ ] Test frontend UI
- [ ] Verify audit logging
- [ ] Test image uploads
- [ ] Test với Supabase data thực

---

**Tài liệu này cung cấp đầy đủ cơ chế của Order để áp dụng cho Product! 🎉**
