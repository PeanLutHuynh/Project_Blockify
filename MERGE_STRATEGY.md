# 🔄 CHIẾN LƯỢC MERGE AN TOÀN

**Ngày:** 2025-10-23  
**Branch hiện tại:** `function`  
**Branch cần merge:** `Back-end`  
**Mục tiêu:** Lấy code hoàn chỉnh của "Thêm vào giỏ" từ branch `Back-end`

---

## ⚠️ TÌNH HUỐNG HIỆN TẠI

Bạn có **7 files đã sửa** chưa commit:
```
modified:   Frontend/src/assets/js/components/HomePage.ts
modified:   Frontend/src/assets/js/components/ProductDetail.ts
modified:   Frontend/src/assets/js/components/Service.ts
modified:   Frontend/src/core/services/CartService.ts
modified:   Frontend/src/modules/cart/CartController.ts
modified:   Frontend/src/pages/Account.html
modified:   Frontend/src/pages/HomePage.html
```

Và **4 files báo cáo mới** chưa track:
```
AUDIT_REPORT_VI_EN_CONFLICTS.md
BUG_FIX_REPORT.md
FIX_SUMMARY.md
QUICK_FIX_SUMMARY.md
```

---

## 🎯 OPTION 1: STASH + MERGE + COMPARE (KHUYẾN NGHỊ)

### Bước 1: Lưu changes hiện tại vào stash
```bash
# Stash changes với message mô tả
git stash push -m "WIP: Fix cart buttons and category conflicts"

# Kiểm tra stash đã lưu
git stash list
# Output: stash@{0}: On function: WIP: Fix cart buttons...
```

### Bước 2: Fetch latest từ remote
```bash
git fetch origin
```

### Bước 3: Merge branch Back-end vào function
```bash
# Merge từ remote Back-end branch
git merge origin/Back-end

# Hoặc nếu có local Back-end branch
git merge Back-end
```

**Nếu có conflicts:**
```bash
# Xem files conflict
git status

# Với mỗi file conflict, chọn version:
# - Accept incoming (từ Back-end) nếu file đó có chức năng cart hoàn chỉnh
# - Accept current (từ function) nếu có code mới cần giữ
# - Merge manually nếu cả 2 đều cần

# Sau khi resolve conflicts
git add .
git commit -m "Merge branch 'Back-end' into function - Use Back-end cart implementation"
```

### Bước 4: So sánh stash vs merged code
```bash
# Xem diff giữa stash và code hiện tại
git stash show -p stash@{0}

# Kiểm tra xem có fixes nào cần giữ không
# Ví dụ: 
# - Fix category hardcoded → CẦN GIỮ
# - Fix button "Thêm vào giỏ" → KHÔNG CẦN (Back-end đã có đầy đủ)
# - Add logging → CÓ THỂ GIỮ
```

### Bước 5: Cherry-pick changes cần thiết từ stash
```bash
# Nếu có fix quan trọng trong stash cần apply
git stash pop

# Nếu có conflicts, chọn giữ Back-end version cho cart logic
# Chỉ giữ lại các fixes khác như:
# - HomePage.html: Xóa hardcoded categories
# - Logging improvements
```

### Bước 6: Commit final version
```bash
git add .
git commit -m "Merge Back-end cart + Keep function category fixes"
git push origin function
```

---

## 🎯 OPTION 2: COMMIT HIỆN TẠI + MERGE (Đơn giản hơn)

### Bước 1: Commit tất cả changes hiện tại
```bash
# Add files báo cáo
git add AUDIT_REPORT_VI_EN_CONFLICTS.md BUG_FIX_REPORT.md FIX_SUMMARY.md QUICK_FIX_SUMMARY.md

# Add modified files
git add Frontend/

# Commit với message rõ ràng
git commit -m "fix: Manual fixes for cart and category issues

- Fix hardcoded categories in HomePage.html
- Add cart button functionality in HomePage.ts
- Add logging to CartService
- Fix ProductDetail.ts addToCart function
- Update CartController to load from backend

Note: Will merge Back-end branch for complete cart implementation"
```

### Bước 2: Merge branch Back-end
```bash
git fetch origin
git merge origin/Back-end -m "Merge Back-end branch for complete cart implementation"
```

### Bước 3: Resolve conflicts (nếu có)

**Chiến lược resolve:**

| File | Conflict | Cách xử lý |
|------|----------|------------|
| `HomePage.ts` | addToCart logic | **Accept Back-end** (đầy đủ hơn) |
| `ProductDetail.ts` | addToCart function | **Accept Back-end** (có CartService) |
| `CartService.ts` | syncToBackend | **Accept Back-end** (tested) |
| `HomePage.html` | Categories | **Accept Current** (đã xóa hardcoded) |
| `Account.html` | Buttons | **Accept Current** (đã dịch tiếng Việt) |

```bash
# Với mỗi conflict file
# 1. Mở file trong VSCode
# 2. Click "Accept Incoming" cho cart logic files
# 3. Click "Accept Current" cho UI translation files
# 4. Click "Accept Both" rồi edit manual nếu cần merge cả 2

# Sau khi resolve
git add .
git commit -m "Merge conflicts: Keep Back-end cart implementation + function UI improvements"
```

### Bước 4: Test và push
```bash
# Compile TypeScript
cd Frontend
npm run build

# Nếu có lỗi, fix nhỏ
# Nếu OK, push
git push origin function
```

---

## 🎯 OPTION 3: RESET HARD + RE-MERGE (Nếu muốn bắt đầu lại sạch)

⚠️ **CẢNH BÁO:** Sẽ MẤT TẤT CẢ changes chưa commit!

### Bước 1: Backup changes quan trọng
```bash
# Copy files quan trọng ra ngoài
cp Frontend/src/pages/HomePage.html ~/Desktop/HomePage.html.backup
cp AUDIT_REPORT_VI_EN_CONFLICTS.md ~/Desktop/

# Hoặc commit vào branch mới để backup
git checkout -b backup-before-merge
git add .
git commit -m "Backup before hard reset"
git checkout function
```

### Bước 2: Reset về commit trước khi bắt đầu fix
```bash
# Tìm commit hash của "Merge branch 'Back-end'"
git log --oneline -10

# Giả sử commit là abc1234
git reset --hard abc1234
```

### Bước 3: Merge lại từ đầu
```bash
git fetch origin
git merge origin/Back-end --strategy-option theirs

# --strategy-option theirs = Ưu tiên code từ Back-end khi conflict
```

### Bước 4: Re-apply fixes cần thiết
```bash
# Copy lại file HomePage.html (đã xóa hardcoded categories)
cp ~/Desktop/HomePage.html.backup Frontend/src/pages/HomePage.html

# Commit
git add Frontend/src/pages/HomePage.html
git commit -m "fix: Remove hardcoded categories from HomePage.html"

git push origin function --force
```

---

## 📊 SO SÁNH CÁC OPTIONS

| Criteria | Option 1: Stash | Option 2: Commit | Option 3: Reset |
|----------|-----------------|------------------|-----------------|
| **Độ an toàn** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Dễ dàng** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Git history** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Mất code** | Không | Không | Có (nếu không backup) |
| **Thời gian** | Trung bình | Nhanh | Nhanh |

**KHUYẾN NGHỊ:**
- **Nếu bạn chưa quen Git:** Option 2 (Commit + Merge)
- **Nếu muốn git history sạch:** Option 1 (Stash + Merge)
- **Nếu muốn bắt đầu lại:** Option 3 (Reset + Re-merge)

---

## ✅ SAU KHI MERGE XONG

### Checklist kiểm tra:

- [ ] **Compile TypeScript thành công**
  ```bash
  cd Frontend
  npx tsc --noEmit
  ```

- [ ] **Backend chạy OK**
  ```bash
  cd backend
  npm run dev
  # Xem: "Server running on port 3001"
  ```

- [ ] **Frontend chạy OK**
  ```bash
  cd Frontend
  npm run dev
  ```

- [ ] **Test "Thêm vào giỏ" ở HomePage**
  1. Mở http://127.0.0.1:3002/src/pages/HomePage.html
  2. Login (nếu chưa)
  3. Click "Thêm vào giỏ" ở bất kỳ sản phẩm nào
  4. Kiểm tra console: `✅ Cart synced to backend`
  5. Vào CartPage xem sản phẩm có hiện không

- [ ] **Test "Thêm vào giỏ" ở ProductDetail**
  1. Click vào 1 sản phẩm
  2. Ở trang ProductDetail, click "Thêm vào giỏ"
  3. Kiểm tra console
  4. Vào CartPage xem

- [ ] **Test Categories load từ DB**
  1. F5 HomePage
  2. Sidebar "Danh mục" phải load từ database
  3. Click vào category → Filter products OK

- [ ] **Test Cart sync với Supabase**
  1. Login → Add products
  2. Logout → Login lại
  3. Cart phải còn sản phẩm (load từ Supabase)

---

## 🆘 NẾU GẶP VẤN ĐỀ

### Lỗi 1: Merge conflicts quá nhiều
```bash
# Abort merge
git merge --abort

# Thử strategy khác
git merge origin/Back-end --strategy-option theirs
# Hoặc
git merge origin/Back-end --strategy-option ours
```

### Lỗi 2: TypeScript errors sau merge
```bash
# Xóa node_modules và reinstall
cd Frontend
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### Lỗi 3: Cart vẫn không hoạt động sau merge
```bash
# Kiểm tra console errors
# Nếu thấy "cartService is undefined"
# → File ProductDetail.ts vẫn thiếu import

# Fix:
# Mở ProductDetail.ts
# Thêm: import { cartService } from '../../core/services/CartService.js';
```

---

## 📞 HỖ TRỢ

Nếu bạn chọn Option nào và gặp vấn đề, hãy:
1. Screenshot error
2. Chạy `git status` và copy output
3. Báo lại để tôi hỗ trợ cụ thể

---

**Generated by:** GitHub Copilot  
**Date:** 2025-10-23  
**Recommended:** Option 2 (Commit + Merge)
