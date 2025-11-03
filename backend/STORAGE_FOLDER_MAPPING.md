# 📁 Supabase Storage Folder Mapping

## ✅ Cấu trúc hiện tại trong Storage

### **Bucket: `product-img`**

```
product-img/
├── Airport/                          ← ✅ Có khoảng trắng và chữ hoa
├── Construction/
├── Fire Fighter/                     ← ✅ Có khoảng trắng
├── Police/
├── Seaport/
├── Service & Transportation/         ← ✅ Có khoảng trắng và ký tự đặc biệt (&)
├── Train/
└── uncategorized/
```

---

## 🔧 Yêu cầu Database

### **Table: `categories`**

Tên category trong database **PHẢI KHỚP CHÍNH XÁC** với tên folder trong Storage:

```sql
-- ✅ ĐÚNG - Khớp với folder trong Storage
INSERT INTO categories (category_name, category_slug) VALUES
('Airport', 'airport'),
('Construction', 'construction'),
('Fire Fighter', 'fire-fighter'),                -- ✅ Có khoảng trắng
('Police', 'police'),
('Seaport', 'seaport'),
('Service & Transportation', 'service-transportation'),  -- ✅ Có & và khoảng trắng
('Train', 'train');

-- ❌ SAI - Không khớp
INSERT INTO categories (category_name) VALUES
('FireFighter'),          -- ❌ Thiếu khoảng trắng
('fire fighter'),         -- ❌ Chữ thường
('Service and Transportation'); -- ❌ Dùng "and" thay vì "&"
```

---

## 🔄 Logic Upload Mới

### **Trước (SAI):**
```typescript
// ❌ Sanitize cả category và product
const sanitizedCategory = sanitizeFolderName(categoryName);  // "Police" → "police"
const sanitizedProduct = sanitizeFolderName(productName);    // "Lego LeMinmmmmm" → "lego-leminmmmmm"
const folderPath = `${sanitizedCategory}/${sanitizedProduct}`;
// Result: "police/lego-leminmmmmm" ❌ KHÔNG KHỚP với folder "Police/" trong Storage
```

### **Sau (ĐÚNG):**
```typescript
// ✅ GIỮ NGUYÊN category name, chỉ sanitize product name
const sanitizedProduct = sanitizeProductName(productName);   // "Lego LeMinmmmmm" → "lego-leminmmmmm"
const folderPath = `${categoryName}/${sanitizedProduct}`;
// Result: "Police/lego-leminmmmmm" ✅ KHỚP với folder "Police/" trong Storage
```

---

## 📋 Ví dụ thực tế

### **Case 1: Sản phẩm Police**
```
Category từ DB: "Police"
Product name: "Lego LeMinmmmmm"
↓
Upload path: "Police/lego-leminmmmmm/image0.webp" ✅
```

### **Case 2: Sản phẩm Fire Fighter**
```
Category từ DB: "Fire Fighter"  (có khoảng trắng)
Product name: "LEGO City Fire Station"
↓
Upload path: "Fire Fighter/lego-city-fire-station/image0.webp" ✅
```

### **Case 3: Sản phẩm Service & Transportation**
```
Category từ DB: "Service & Transportation"  (có & và khoảng trắng)
Product name: "LEGO Volvo FMX Truck"
↓
Upload path: "Service & Transportation/lego-volvo-fmx-truck/image0.webp" ✅
```

### **Case 4: Category không tồn tại**
```
Category từ DB: "Invalid Category"
Product name: "Some Product"
↓
Upload path: "uncategorized/timestamp_random.webp" ⚠️ Fallback
```

---

## ⚠️ Lưu ý quan trọng

### **1. Tên category trong database PHẢI khớp với folder:**

```sql
-- Kiểm tra categories hiện tại
SELECT category_id, category_name FROM categories;

-- Nếu không khớp, cần update:
UPDATE categories SET category_name = 'Fire Fighter' WHERE category_name = 'FireFighter';
UPDATE categories SET category_name = 'Service & Transportation' WHERE category_name = 'Service and Transportation';
```

### **2. Nếu folder chưa tồn tại trong Storage:**

- Supabase sẽ **TỰ ĐỘNG TẠO** folder mới khi upload
- Tuy nhiên, nên tạo sẵn folder để đồng nhất cấu trúc

### **3. Case-sensitive:**

- Storage folder names là **case-sensitive**
- `Police/` ≠ `police/` ≠ `POLICE/`
- Phải match chính xác

---

## 🧪 Test Cases

### **Test 1: Upload vào folder Police**
```bash
Category: "Police"
Product: "Lego LeMinmmmmm"
Expected: "Police/lego-leminmmmmm/image0.webp"
```

### **Test 2: Upload vào folder Fire Fighter (có khoảng trắng)**
```bash
Category: "Fire Fighter"
Product: "LEGO City Fire Station"
Expected: "Fire Fighter/lego-city-fire-station/image0.webp"
```

### **Test 3: Upload vào folder Service & Transportation (có & và space)**
```bash
Category: "Service & Transportation"
Product: "LEGO Volvo FMX Truck & EC230"
Expected: "Service & Transportation/lego-volvo-fmx-truck-ec230/image0.webp"
```

### **Test 4: Category không hợp lệ**
```bash
Category: null hoặc ""
Product: "Some Product"
Expected: "uncategorized/timestamp_random.webp"
```

---

## 📝 Checklist trước khi deploy

- [ ] Kiểm tra tất cả categories trong database
- [ ] So sánh với tên folder trong Storage
- [ ] Update category_name nếu không khớp
- [ ] Test upload với mỗi category
- [ ] Verify folder structure trong Storage
- [ ] Kiểm tra URLs được lưu vào database

---

## 🔍 Debug Commands

### **1. Kiểm tra categories trong database:**
```sql
SELECT 
  category_id,
  category_name,
  category_slug
FROM categories
ORDER BY category_name;
```

### **2. Kiểm tra products và images:**
```sql
SELECT 
  p.product_id,
  p.product_name,
  c.category_name,
  pi.image_url
FROM products p
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN product_images pi ON p.product_id = pi.product_id
ORDER BY p.created_at DESC
LIMIT 10;
```

### **3. Test upload endpoint:**
```bash
curl -X POST http://localhost:3001/api/admin/products/upload-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test.jpg" \
  -F "categoryId=1" \
  -F "productName=Test Product" \
  -F "imageIndex=0"
```
