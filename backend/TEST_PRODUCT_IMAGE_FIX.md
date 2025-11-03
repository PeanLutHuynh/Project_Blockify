# 🧪 Test Case - Product Image Upload Fix

## ✅ Đã sửa lỗi:

### 1. **Lỗi Duplicate Key Constraint**
- ❌ **Trước:** `duplicate key value violates unique constraint "product_images_pkey"`
- ✅ **Sau:** `image_id` tự động tăng bởi database (serial)
- 📝 **File:** `AdminProductRepository.ts` - `ProductImageRepository.mapFromEntity()`

### 2. **Lỗi Folder Structure**
- ❌ **Trước:** `uncategorized/timestamp_random.webp`
- ✅ **Sau:** `police/lego-leminmmmmm/image0.webp`
- 📝 **File:** `AdminProductService.ts` - `uploadProductImage()`

---

## 📋 Cấu trúc Database (từ supabase.ts)

### **Table: `users`**
```typescript
avatar_url: string | null
// VD: https://oxpviqhrksdhhubhji.supabase.co/storage/v1/object/sign/user-avatars/123/avatar.jpg
```

### **Table: `product_images`**
```typescript
{
  image_id: number,          // ✅ AUTO-INCREMENT (không được insert thủ công)
  product_id: number,        // FK -> products.product_id
  image_url: string,         // ✅ URL ảnh chính (REQUIRED)
  alt_img1: string | null,   // ✅ URL ảnh phụ 1
  alt_img2: string | null,   // ✅ URL ảnh phụ 2
  alt_img3: string | null,   // ✅ URL ảnh phụ 3
  alt_text: string | null,
  is_primary: boolean,
  sort_order: number,
  created_at: timestamp
}
```

### **Table: `products`**
```typescript
{
  product_id: number,        // ✅ AUTO-INCREMENT
  product_name: string,      // "Lego LeMinmmmmm"
  product_slug: string,      // "lego-leminmmmmm"
  category_id: number,       // FK -> categories.category_id
  ...
}
```

### **Table: `categories`**
```typescript
{
  category_id: number,       // 1 = Police
  category_name: string,     // "Police"
  category_slug: string,     // "police"
  ...
}
```

---

## 📁 Supabase Storage Structure

### **Bucket: `product-img`**
```
product-img/
├── police/                           ← sanitized category name
│   ├── lego-leminmmmmm/              ← sanitized product name
│   │   ├── image0.webp               ← Primary image
│   │   ├── image1.webp               ← Alt image 1
│   │   ├── image2.webp               ← Alt image 2
│   │   └── image3.webp               ← Alt image 3
│   └── lego-volvo-fmx-truck-ec230/
│       ├── image0.webp
│       ├── image1.webp
│       └── ...
├── construction/
│   └── ...
└── uncategorized/                    ← Fallback nếu thiếu thông tin
    └── 1730678400_abc123.webp
```

### **Bucket: `user-avatars`** (tham khảo)
```
user-avatars/
├── user-123/
│   └── avatar.jpg
├── user-456/
│   └── avatar.png
└── ...
```

---

## 🔄 Flow tạo sản phẩm mới

### **Frontend → Backend:**

```javascript
// 1. Upload từng ảnh (có metadata)
FormData {
  image: File,
  productName: "Lego LeMinmmmmm",
  categoryId: "1",              // ← Backend sẽ lookup category_name
  imageIndex: "0"
}

// 2. Tạo sản phẩm (với URLs đã upload)
POST /api/admin/products
{
  product_name: "Lego LeMinmmmmm",
  category_id: 1,
  price: 1421407,
  images: [
    { image_url: "https://.../.../police/lego-leminmmmmm/image0.webp", is_primary: true, sort_order: 0 },
    { image_url: "https://.../.../police/lego-leminmmmmm/image1.webp", is_primary: false, sort_order: 1 },
    { image_url: "https://.../.../police/lego-leminmmmmm/image2.webp", is_primary: false, sort_order: 2 },
    { image_url: "https://.../.../police/lego-leminmmmmm/image3.webp", is_primary: false, sort_order: 3 }
  ]
}
```

### **Backend Processing:**

```typescript
// AdminProductController.uploadProductImage()
1. Validate file (type, size)
2. Lookup category_name from category_id
   ✅ getCategoryById(1) → { category_name: "Police" }
3. Sanitize names:
   ✅ "Police" → "police"
   ✅ "Lego LeMinmmmmm" → "lego-leminmmmmm"
4. Upload to Storage: "police/lego-leminmmmmm/image0.webp"
5. Get signed URL
6. Return URL to frontend

// AdminProductService.createProduct()
7. Create Product entity
8. Create ProductImage entity (1 row):
   {
     image_url: "https://.../image0.webp",  ← Primary
     alt_img1: "https://.../image1.webp",   ← Alt 1
     alt_img2: "https://.../image2.webp",   ← Alt 2
     alt_img3: "https://.../image3.webp",   ← Alt 3
     is_primary: true,
     sort_order: 0
   }

// AdminProductRepository.create()
9. Insert product → Get product_id
10. Insert image → ✅ image_id AUTO-GENERATED (không truyền vào)
```

---

## ✅ Test Steps

### **1. Tạo sản phẩm mới:**
- Tên: "LEGO Volvo FMX Truck & EC230 Electric Excavator"
- Danh mục: "Police" (ID: 1)
- Upload 4 ảnh

### **2. Kiểm tra kết quả:**

#### **A. Supabase Storage:**
```bash
# Vào Supabase Dashboard > Storage > product-img
# Xem folder structure:
✅ police/lego-volvo-fmx-truck-ec230-electric-excavator/image0.webp
✅ police/lego-volvo-fmx-truck-ec230-electric-excavator/image1.webp
✅ police/lego-volvo-fmx-truck-ec230-electric-excavator/image2.webp
✅ police/lego-volvo-fmx-truck-ec230-electric-excavator/image3.webp
```

#### **B. Database:**
```sql
-- Table: products
SELECT product_id, product_name, product_slug, category_id 
FROM products 
ORDER BY product_id DESC 
LIMIT 1;
-- ✅ product_id: 123 (mới)
-- ✅ product_slug: "lego-volvo-fmx-truck-ec230-electric-excavator"

-- Table: product_images
SELECT image_id, product_id, image_url, alt_img1, alt_img2, alt_img3 
FROM product_images 
WHERE product_id = 123;
-- ✅ image_id: 456 (AUTO-GENERATED, không trùng)
-- ✅ image_url: "https://.../police/.../image0.webp"
-- ✅ alt_img1: "https://.../police/.../image1.webp"
-- ✅ alt_img2: "https://.../police/.../image2.webp"
-- ✅ alt_img3: "https://.../police/.../image3.webp"
```

#### **C. Terminal Logs:**
```bash
[0] 📁 Folder structure: police/lego-volvo-fmx-truck-ec230-electric-excavator
[0] 📤 Uploading to: police/lego-volvo-fmx-truck-ec230-electric-excavator/image0.webp
[0] ✅ File uploaded to storage: police/lego-volvo-fmx-truck-ec230-electric-excavator/image0.webp
[0] 📸 Signed image URL: https://oxpviqhrksdhhubhji.supabase.co/storage/v1/object/sign/...
[0] ✅ Image 0 uploaded: https://...
[0] ✅ All images uploaded! Total: 4
[0] ✅✅✅ [Service] CREATE PRODUCT SUCCESS ✅✅✅
[0] 21:45:23 [INFO]: POST /api/admin/products 200 - 1009ms
```

---

## ❌ Các lỗi có thể gặp & Giải pháp:

### **1. Vẫn gặp lỗi "duplicate key constraint"**
**Nguyên nhân:** Cache hoặc old code
**Giải pháp:**
```bash
cd backend
npm run build    # Rebuild TypeScript
pm2 restart all  # Restart server
```

### **2. Ảnh vẫn vào folder "uncategorized"**
**Nguyên nhân:** Frontend không gửi `categoryId` trong FormData
**Giải pháp:** Kiểm tra frontend code:
```javascript
formData.append('categoryId', categoryId.toString()); // ✅ Đảm bảo có dòng này
```

### **3. Image ID không tự tăng**
**Nguyên nhân:** Database sequence bị lỗi
**Giải pháp:**
```sql
-- Reset sequence về max ID hiện tại
SELECT setval('product_images_image_id_seq', 
  (SELECT MAX(image_id) FROM product_images));
```

---

## 📝 Code Changes Summary

### **File 1: `AdminProductRepository.ts`**
```typescript
// Line 868-880
protected mapFromEntity(entity: ProductImage | Partial<ProductImage>): any {
  const mapped: any = {};
  
  // ✅ FIX: NEVER include image_id - auto-generated by database
  // ❌ if (entity.imageId !== undefined) mapped.image_id = entity.imageId;
  
  if (entity.productId !== undefined) mapped.product_id = entity.productId;
  if (entity.imageUrl !== undefined) mapped.image_url = entity.imageUrl;
  if (entity.altImg1 !== undefined) mapped.alt_img1 = entity.altImg1;
  if (entity.altImg2 !== undefined) mapped.alt_img2 = entity.altImg2;
  if (entity.altImg3 !== undefined) mapped.alt_img3 = entity.altImg3;
  // ...
}
```

### **File 2: `AdminProductService.ts`**
```typescript
// Line 830-862
async uploadProductImage(...) {
  // ✅ FIX: Sanitize folder names
  const sanitizeFolderName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };
  
  let folderPath = 'uncategorized';
  if (categoryName && productName) {
    const sanitizedCategory = sanitizeFolderName(categoryName);
    const sanitizedProduct = sanitizeFolderName(productName);
    folderPath = `${sanitizedCategory}/${sanitizedProduct}`;
  }
  
  const fileName = `${folderPath}/${imageName}`;
  // Upload to Supabase Storage...
}
```

---

## 🎯 Kết luận

### ✅ **Đã sửa:**
1. Lỗi duplicate key constraint → `image_id` tự động tăng
2. Folder structure → `category/product/imageX.ext`
3. Sanitize tên folder → Loại bỏ dấu và ký tự đặc biệt

### ✅ **Cấu trúc đúng theo design:**
- `users.avatar_url` → Full URL
- `product_images.image_url` → Full URL (primary)
- `product_images.alt_img1-3` → Full URLs (alternatives)
- Storage: `category-slug/product-slug/imageX.ext`

### ✅ **Tương thích với hệ thống:**
- Giống cách lưu `user-avatars` (1 user → 1 folder)
- Giống cách lưu `payment-proofs` (1 order → 1 folder)
- **Product images** (1 product → 1 folder → 4 images)

---

## 📞 Support

Nếu vẫn gặp lỗi, cung cấp:
1. Terminal logs (full output)
2. Database query result từ `product_images`
3. Supabase Storage screenshot
4. Request payload từ Frontend DevTools
