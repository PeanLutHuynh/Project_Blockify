# Quản lý Sản phẩm (CRUD) - Tài liệu Triển khai

## Tổng quan
Đã triển khai đầy đủ chức năng Quản lý Sản phẩm (CRUD) cho trang Admin, tuân thủ rule.md và kết nối với Supabase để lấy dữ liệu thực.

## Kiến trúc
### Backend (DDD + Clean Architecture)
```
backend/src/modules/admin/
├── domain/
│   ├── entities/AdminProduct.ts        # AdminProduct, ProductImage, Category entities
│   └── repositories/IAdminProductRepository.ts
├── application/
│   ├── dto/AdminProductDTO.ts         # DTOs for CRUD operations
│   └── AdminProductService.ts          # Business logic
├── infrastructure/
│   └── repositories/AdminProductRepository.ts  # Supabase integration
└── presentation/
    ├── AdminProductController.ts       # HTTP controller
    └── adminRoutes.ts                  # Routes configuration
```

### Frontend (MVC + OOP)
```
Frontend/src/modules/admin/
└── AdminProductController.ts           # UI controller
Frontend/src/pages/
└── Admin.html                          # Integration
```

## Tính năng đã triển khai

### 1. Backend API Endpoints

#### Products
- `GET /api/admin/products` - Lấy danh sách sản phẩm (có phân trang)
- `GET /api/admin/products/search` - Tìm kiếm sản phẩm
- `GET /api/admin/products/:id` - Lấy chi tiết sản phẩm
- `POST /api/admin/products` - Tạo sản phẩm mới
- `PUT /api/admin/products/:id` - Cập nhật sản phẩm
- `DELETE /api/admin/products/:id` - Xóa sản phẩm
- `PATCH /api/admin/products/:id/stock` - Cập nhật tồn kho
- `PATCH /api/admin/products/:id/status` - Cập nhật trạng thái

#### Categories
- `GET /api/admin/categories` - Lấy danh sách danh mục
- `GET /api/admin/categories/active` - Lấy danh mục đang hoạt động
- `POST /api/admin/categories` - Tạo danh mục mới
- `PUT /api/admin/categories/:id` - Cập nhật danh mục
- `DELETE /api/admin/categories/:id` - Xóa danh mục

### 2. Domain Entities

#### AdminProduct
```typescript
class AdminProduct extends BaseEntity {
  - id: string
  - name: string
  - slug: string
  - description: string
  - brand: string
  - age_range: string
  - piece_count: number
  - theme: string
  - price: number
  - stock_quantity: number
  - status: ProductStatus
  - category_id: string | null
  
  + validate(): void
  + isInStock(): boolean
  + needsRestock(threshold: number): boolean
  + generateSlug(): string
}
```

#### ProductImage
```typescript
class ProductImage extends BaseEntity {
  - id: string
  - product_id: string
  - image_url: string
  - display_order: number
  - is_primary: boolean
}
```

#### Category
```typescript
class Category extends BaseEntity {
  - id: string
  - name: string
  - slug: string
  - description: string | null
  - parent_id: string | null
  - display_order: number
  - is_active: boolean
}
```

### 3. Repository Pattern
- **AdminProductRepository**: CRUD operations, search, stock management
- **ProductImageRepository**: Image management cho products
- **CategoryRepository**: Category management

### 4. Business Logic (AdminProductService)
- Validation before create/update
- Slug generation từ product name
- Kiểm tra active orders trước khi xóa sản phẩm
- Audit logging cho mọi thao tác admin
- Transaction support cho operations phức tạp

### 5. Frontend Controller

#### AdminProductController Features
- **loadProducts()**: Load danh sách sản phẩm với phân trang
- **searchProducts()**: Tìm kiếm với debounce 500ms
- **handleAddProduct()**: Thêm sản phẩm mới với upload ảnh
- **editProduct()**: Chỉnh sửa sản phẩm
- **deleteProduct()**: Xóa sản phẩm (kiểm tra active orders)
- **loadCategories()**: Load danh sách danh mục

#### Search Functionality
- Nhấn Enter trong search box để tìm kiếm
- Hiển thị kết quả trong giao diện hiện tại
- Debounce 500ms để tránh gọi API liên tục
- Tìm kiếm theo: tên, brand, theme, description

### 6. UI Integration (Admin.html)
- Product section với search bar
- Grid layout hiển thị product cards
- Modal thêm sản phẩm (Add Product Modal)
- Modal chỉnh sửa (Edit Product Modal)
- Upload tối đa 4 hình ảnh mỗi sản phẩm
- Preview hình ảnh trước khi upload

## Database Schema

### Table: products
```sql
- id: uuid (PK)
- name: text
- slug: text (unique)
- description: text
- brand: text
- age_range: text
- piece_count: integer
- theme: text
- price: numeric
- stock_quantity: integer
- status: text (active/inactive/out_of_stock)
- category_id: uuid (FK -> categories)
- created_at: timestamp
- updated_at: timestamp
```

### Table: product_images
```sql
- id: uuid (PK)
- product_id: uuid (FK -> products)
- image_url: text
- display_order: integer
- is_primary: boolean
- created_at: timestamp
- updated_at: timestamp
```

### Table: categories
```sql
- id: uuid (PK)
- name: text
- slug: text (unique)
- description: text
- parent_id: uuid (FK -> categories, nullable)
- display_order: integer
- is_active: boolean
- created_at: timestamp
- updated_at: timestamp
```

### Table: admin_audit_logs
```sql
- id: uuid (PK)
- admin_id: uuid (FK -> users)
- action: text (CREATE/UPDATE/DELETE)
- entity_type: text (product/category)
- entity_id: uuid
- changes: jsonb
- created_at: timestamp
```

## Validation Rules

### Product Validation
- **name**: Bắt buộc, không rỗng
- **price**: Bắt buộc, >= 0
- **stock_quantity**: Bắt buộc, >= 0
- **status**: Phải là 'active', 'inactive', hoặc 'out_of_stock'
- **category_id**: Optional, nếu có thì phải tồn tại trong DB
- **slug**: Tự động generate từ name, đảm bảo unique

### Business Rules
- Không thể xóa sản phẩm có đơn hàng active (status: pending, processing, shipped)
- Stock quantity = 0 → status tự động chuyển sang 'out_of_stock'
- Slug phải URL-friendly (lowercase, no spaces, dashes)

## Authentication & Authorization
- Tất cả endpoints yêu cầu authentication
- Chỉ admin role mới có quyền truy cập
- Middleware: `requireAdmin` được áp dụng cho tất cả routes

## Error Handling
- 400: Validation errors, invalid input
- 403: Forbidden (không phải admin)
- 404: Product/Category không tìm thấy
- 409: Conflict (ví dụ: không thể xóa product có orders)
- 500: Server errors

## Audit Logging
Mọi thao tác admin được log vào `admin_audit_logs`:
- Action type: CREATE, UPDATE, DELETE
- Entity type: product, category
- Entity ID
- Changes (JSON)
- Timestamp & admin user ID

## Testing Checklist

### Backend
- [x] Compile TypeScript thành công
- [ ] Test GET /api/admin/products
- [ ] Test search functionality
- [ ] Test create product
- [ ] Test update product
- [ ] Test delete product (with/without active orders)
- [ ] Test stock update
- [ ] Test status update
- [ ] Test category CRUD

### Frontend
- [x] Compile TypeScript thành công
- [x] Controller được khởi tạo đúng
- [ ] Load products khi vào product section
- [ ] Search on Enter key press
- [ ] Add product với upload ảnh
- [ ] Edit product
- [ ] Delete product với confirmation
- [ ] Image preview hoạt động
- [ ] Category dropdown hiển thị đúng

## Cách chạy

### Backend
```bash
cd backend
npm install
npx tsc
npm run dev
```

### Frontend
```bash
cd Frontend
npm install
npx tsc
# Open Admin.html in browser or use dev server
```

## Environment Variables
Đảm bảo có các biến môi trường sau trong `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
PORT=3000
```

## Files Created/Modified

### Backend
1. ✅ `/backend/src/modules/admin/domain/entities/AdminProduct.ts`
2. ✅ `/backend/src/modules/admin/domain/repositories/IAdminProductRepository.ts`
3. ✅ `/backend/src/modules/admin/application/dto/AdminProductDTO.ts`
4. ✅ `/backend/src/modules/admin/infrastructure/repositories/AdminProductRepository.ts`
5. ✅ `/backend/src/modules/admin/application/AdminProductService.ts`
6. ✅ `/backend/src/modules/admin/presentation/AdminProductController.ts`
7. ✅ `/backend/src/modules/admin/presentation/adminRoutes.ts` (updated)

### Frontend
8. ✅ `/Frontend/src/modules/admin/AdminProductController.ts`
9. ✅ `/Frontend/src/pages/Admin.html` (updated)

## Next Steps
1. ✅ Compile TypeScript (backend & frontend)
2. ⏳ Start backend server
3. ⏳ Test all CRUD operations
4. ⏳ Test search functionality (Enter key)
5. ⏳ Test image uploads
6. ⏳ Verify audit logging
7. ⏳ Test with real Supabase data

## Notes
- Frontend controller sử dụng `FetchHttpClient` theo pattern hiện tại
- Bootstrap modal được access qua `(window as any).bootstrap`
- Image preview sử dụng FileReader API
- Search có debounce 500ms để optimize performance
- Tất cả code tuân thủ rule.md về architecture và coding standards
