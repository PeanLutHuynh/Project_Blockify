import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';
import { initializeSearch } from '../../../shared/components/SearchInit.js';
import { categoryService } from '../../../core/services/CategoryService.js';
import { productService } from '../../../core/services/ProductService.js';
import { WishlistService } from '../../../core/services/WishlistService.js';
import { authService } from '../../../core/services/AuthService.js';

// Helper to get API base URL
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
  }
  return 'https://blockify-backend.onrender.com';
};

// State management for pagination and filtering
let currentCategoryId: number | undefined = undefined;
// @ts-ignore - Used in filter functions
let currentFilterMode: 'all' | 'new' | 'bestseller' = 'all';
const wishlistService = new WishlistService();

// Initialize app and run page logic
initializeOnReady(async () => {
  // Initialize navbar authentication UI
  initializeNavbarAuth();
  
  // Initialize search controller (UC3 - Thanh tìm kiếm)
  initializeSearch();
  
  // Original homepage logic (UI interactions only - synchronous)
  setupUIInteractions();
  
  // ✅ Wait for backend to be ready before loading data
  const backendReady = await waitForBackend();
  
  if (!backendReady) {
    console.warn('⚠️ Backend not ready, showing error message');
    showBackendErrorMessage();
    return;
  }
  
  console.log('✅ Backend is ready, loading data...');
  
  // Load categories dynamically from Supabase
  await loadCategorySidebar();
  
  // ✅ Load ALL products for main section (phía trên) - KHÔNG có logic gợi ý
  await loadProductsFromAPI(undefined, 1);
  
  // ✅ Load recommendation section - "SẢN PHẨM ĐỀ XUẤT" với logic gợi ý thông minh
  await loadRecommendedProductsForSection();
  
  // Setup category filter handlers
  setupCategoryFilters();
  
  // Setup product filter buttons (Mới nhất, Phổ biến)
  setupProductFilterButtons();
});

function normalizeDifficulty(value: any): string | undefined {
  if (!value) return undefined;
  const str = String(value).trim().toLowerCase();
  if (!str) return undefined;
  if (str.startsWith('easy')) return 'Easy';
  if (str.startsWith('medium')) return 'Medium';
  if (str.startsWith('hard')) return 'Hard';
  if (str.startsWith('expert')) return 'Expert';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Wait for backend to be ready (with retry)
 */
async function waitForBackend(maxRetries: number = 5, delayMs: number = 1000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 Checking backend health (attempt ${i + 1}/${maxRetries})...`);
      
      const apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:3001'
        : 'https://blockify-backend.onrender.com';
      
      const response = await fetch(`${apiBaseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2s timeout
      });
      
      if (response.ok) {
        console.log('✅ Backend is ready!');
        return true;
      }
    } catch (error) {
      console.log(`⚠️ Backend not ready yet (attempt ${i + 1}/${maxRetries})`);
      
      if (i < maxRetries - 1) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.error('❌ Backend failed to respond after multiple retries');
  return false;
}

/**
 * Show backend error message
 */
function showBackendErrorMessage(): void {
  const mainList = document.getElementById('main-product-list');
  const productList = document.getElementById('product-list');
  
  const errorHtml = `
    <div class="col-12 text-center py-5">
      <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
      <h4>Không thể kết nối tới server</h4>
      <p class="text-muted">Vui lòng kiểm tra xem backend đã chạy chưa (npm run dev trong folder backend)</p>
      <button class="btn btn-primary" onclick="location.reload()">
        <i class="fas fa-sync-alt me-2"></i>Thử lại
      </button>
    </div>
  `;
  
  if (mainList) mainList.innerHTML = errorHtml;
  if (productList) productList.innerHTML = errorHtml;
}

/**
 * Setup UI interactions (synchronous only - no API calls)
 */
function setupUIInteractions() {
  // Navbar shadow on scroll
  (function(){
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  // Toggle heart like
  document.addEventListener('click', function(e){
    const target = e.target as HTMLElement | null;
    if(target && target.classList.contains('icon-heart')){
      target.classList.toggle('liked');
    }
  });

  // Button ripple
  document.addEventListener('click', function(e){
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('.btn-cart, .btn') as HTMLElement | null;
    if(!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  });

  // Scroll reveal for sections/cards
  (function(){
    const revealTargets: HTMLElement[] = [];
    document.querySelectorAll('.product-card, .product-card1, .promo-card, .category, .banner, .recommended').forEach(el => {
      (el as HTMLElement).classList.add('reveal');
      revealTargets.push(el as HTMLElement);
    });
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          (entry.target as HTMLElement).classList.add('show');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(el => io.observe(el));
  })();

  // Note: Search functionality is now handled by SearchController
  // (UC3 - Thanh tìm kiếm implemented in modules/search/SearchController.ts)
}

/**
 * Load products from API with pagination
 */
async function loadProductsFromAPI(categoryId: number | undefined, page: number) {
  try {
    const mainList = document.getElementById('main-product-list');
    if (!mainList) {
      console.error('❌ Main product list container not found');
      return;
    }

    // Show loading
    mainList.innerHTML = '<div class="col-12 text-center py-5"><i class="fas fa-spinner fa-spin fa-3x text-primary"></i></div>';

    // Build API URL
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '12'
    });
    
    if (categoryId) {
      params.append('categoryId', categoryId.toString());
    }

    const apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:3001'
      : 'https://blockify-backend.onrender.com';
    
    const url = `${apiBaseUrl}/api/v1/products/?${params.toString()}`;
    console.log('🔗 Fetching from:', url);

    // Fetch products
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ API Response:', result);

    if (result.success && result.data) {
      // Update state
      currentCategoryId = categoryId;

      // Render products
      renderProductsToGrid(result.data);

      // Render pagination
      renderPaginationControls(result.pagination);
    } else {
      mainList.innerHTML = '<div class="col-12"><p class="text-center py-5">No products found</p></div>';
    }
  } catch (error) {
    console.error('❌ Load products error:', error);
    const mainList = document.getElementById('main-product-list');
    if (mainList) {
      mainList.innerHTML = '<div class="col-12"><p class="text-center py-5 text-danger">Failed to load products</p></div>';
    }
  }
}

/**
 * Load category sidebar dynamically from Supabase
 */
async function loadCategorySidebar() {
  try {
    console.log('📂 Loading categories for sidebar...');
    
    const result = await categoryService.getCategories();
    
    if (!result.success || !result.categories) {
      console.error('❌ Failed to load categories');
      return;
    }

    console.log(`✅ Loaded ${result.categories.length} categories for sidebar`);
    
    // Find category sidebar in HTML
    const categorySidebar = document.querySelector('.category');
    if (!categorySidebar) {
      console.warn('⚠️ Category sidebar not found');
      return;
    }

    // Clear existing content except title
    const title = categorySidebar.querySelector('h5');
    categorySidebar.innerHTML = '';
    if (title) {
      categorySidebar.appendChild(title);
    }

    // Render categories
    result.categories.forEach(cat => {
      const categoryItem = document.createElement('p');
      categoryItem.textContent = cat.name;
      categoryItem.style.cursor = 'pointer';
      categoryItem.setAttribute('data-category-id', cat.id);
      categoryItem.classList.add('category-item');
      
      // Add hover effect
      categoryItem.addEventListener('mouseenter', () => {
        categoryItem.style.color = '#0d6efd';
        categoryItem.style.fontWeight = 'bold';
      });
      
      categoryItem.addEventListener('mouseleave', () => {
        const itemCategoryId = parseInt(categoryItem.getAttribute('data-category-id') || '0');
        if (itemCategoryId !== currentCategoryId) {
          categoryItem.style.color = '';
          categoryItem.style.fontWeight = '';
        }
      });
      
      categorySidebar.appendChild(categoryItem);
    });

    console.log('✅ Category sidebar rendered');
  } catch (error) {
    console.error('❌ Error loading category sidebar:', error);
  }
}

/**
 * ✅ Load "SẢN PHẨM ĐỀ XUẤT" section (phía dưới)
 * Hiển thị các sản phẩm có is_featured = TRUE trong database
 */
async function loadRecommendedProductsForSection() {
  try {
    const categoryList = document.getElementById("product-list");
    if (!categoryList) {
      console.warn('⚠️ product-list element not found');
      return;
    }

    // Show loading spinner
    categoryList.innerHTML = '<div class="col-12 text-center py-3"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    console.log('🎯 Loading "SẢN PHẨM ĐỀ XUẤT" section (is_featured = TRUE)...');
    
    // Load featured products (is_featured = true)
    const result = await productService.getFeaturedProducts(8, true);
    
    if (!result.success || !result.products || result.products.length === 0) {
      categoryList.innerHTML = '<div class="col-12 text-center"><p>Không có sản phẩm đề xuất</p></div>';
      console.warn('⚠️ No featured products found');
      return;
    }

    const products = result.products;
    console.log(`✅ Loaded ${products.length} featured products (is_featured = TRUE)`);
    console.log('📦 Featured products data:', products);

    // Clear loading spinner
    categoryList.innerHTML = '';

    // ✅ Render PRODUCT cards (chỉ có tên sản phẩm + ảnh, không có badge)
    products.slice(0, 8).forEach((product) => {
      console.log('🔍 Rendering product:', { 
        name: product.name, 
        slug: product.slug, 
        imageUrl: product.imageUrl 
      });
      const productCard = document.createElement('div');
      productCard.className = 'd-flex justify-content-center col-md-3 col-sm-6';
      
      productCard.innerHTML = `
        <div class="product-card1" data-product-slug="${product.slug}" style="cursor: pointer;">
        <div class ="product-hot-tag">Hot</div>
        <div class = "product-sq"></div>
        <div class ="product-line"></div>
          <img src="${product.imageUrl}" 
               alt="${product.name}" 
               class="product-img"
               onerror="this.src='/public/images/img2.jpg'">
          <div class="product-footer pt-4">${product.name}</div>
        </div>
      `;
      categoryList.appendChild(productCard);
    });
    
    // ✅ Add click handlers to navigate to ProductDetail
    categoryList.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.product-card1') as HTMLElement;
      if (card) {
        const slug = card.getAttribute('data-product-slug');
        if (slug) {
          console.log(`🔗 Navigating to ProductDetail: ${slug}`);
          window.location.href = `./ProductDetail.html?slug=${slug}`;
        }
      }
    });

    console.log(`✅ Rendered ${products.length} products in "SẢN PHẨM ĐỀ XUẤT" section`);
  } catch (error) {
    console.error('❌ Error loading recommended products for section:', error);
    const categoryList = document.getElementById("product-list");
    if (categoryList) {
      categoryList.innerHTML = '<div class="col-12 text-center py-3 text-danger">Không thể tải sản phẩm đề xuất</div>';
    }
  }
}

/**
 * Setup category filter click handlers
 */
function setupCategoryFilters() {
  const categorySidebar = document.querySelector('.category');
  if (!categorySidebar) return;

  // Add click handler for "Category" title to show all products
  const categoryTitle = categorySidebar.querySelector('h5');
  if (categoryTitle) {
    categoryTitle.style.cursor = 'pointer';
    categoryTitle.addEventListener('click', async () => {
      console.log('📂 Showing all products');
      
      // Clear category filter
      currentCategoryId = undefined;
      currentFilterMode = 'all';
      
      // Clear all active states
      document.querySelectorAll('.category-item').forEach(item => {
        const el = item as HTMLElement;
        el.style.color = '';
        el.style.fontWeight = '';
      });
      
      // Reset filter buttons
      resetFilterButtons();
      
      // Load all products from page 1
      await loadProductsFromAPI(undefined, 1);
    });
  }

  categorySidebar.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    
    if (target.classList.contains('category-item')) {
      const categoryIdStr = target.getAttribute('data-category-id');
      const categoryId = categoryIdStr ? parseInt(categoryIdStr) : undefined;
      
      // Update active state
      document.querySelectorAll('.category-item').forEach(item => {
        const el = item as HTMLElement;
        el.style.color = '';
        el.style.fontWeight = '';
      });
      target.style.color = '#0d6efd';
      target.style.fontWeight = 'bold';
      
      // Update current filter
      currentCategoryId = categoryId;
      currentFilterMode = 'all';
      
      // Reset filter buttons
      resetFilterButtons();
      
      // Load products by category with pagination (reset to page 1)
      console.log(`📂 Filtering products by category: ${categoryId}`);
      await loadProductsFromAPI(categoryId, 1);
    }
  });

  console.log('✅ Category filters setup complete');
}

/**
 * Setup product filter buttons (Mới nhất, Phổ biến)
 */
function setupProductFilterButtons() {
  const btnNew = document.getElementById('btn-new');
  const btnBestseller = document.getElementById('btn-bestseller');
  
  if (!btnNew || !btnBestseller) {
    console.warn('⚠️ Filter buttons not found');
    return;
  }

  // Handle "Mới nhất" button
  btnNew.addEventListener('click', async () => {
    console.log('🆕 Loading new products...');
    
    // Update filter mode
    currentFilterMode = 'new';
    currentCategoryId = undefined;
    
    // Update button styles
    setActiveFilterButton(btnNew);
    
    // Clear category selection
    clearCategorySelection();
    
    // Load new products
    await loadFilteredProducts('new');
  });

  // Handle "Phổ biến" button
  btnBestseller.addEventListener('click', async () => {
    console.log('🔥 Loading bestseller products...');
    
    // Update filter mode
    currentFilterMode = 'bestseller';
    currentCategoryId = undefined;
    
    // Update button styles
    setActiveFilterButton(btnBestseller);
    
    // Clear category selection
    clearCategorySelection();
    
    // Load bestseller products
    await loadFilteredProducts('bestseller');
  });

  console.log('✅ Product filter buttons setup complete');
  
  // ✅ Setup filter dropdowns (Khoảng giá, Độ khó, Sắp xếp theo)
  setupFilterDropdowns();
  
  // ✅ Setup filter toggle button
  setupFilterToggle();
}

/**
 * ✅ Setup filter panel toggle
 */
function setupFilterToggle() {
  const filterToggleBtn = document.getElementById('filter-toggle');
  const filterPanel = document.getElementById('filter-panel');
  
  if (!filterToggleBtn || !filterPanel) {
    console.warn('⚠️ Filter toggle button or panel not found');
    return;
  }
  
  // Hide filter panel by default
  filterPanel.style.display = 'none';
  
  filterToggleBtn.addEventListener('click', () => {
    if (filterPanel.style.display === 'none') {
      filterPanel.style.display = 'block';
      filterToggleBtn.textContent = 'Ẩn bộ lọc';
      filterToggleBtn.classList.add('active');
    } else {
      filterPanel.style.display = 'none';
      filterToggleBtn.textContent = 'Bộ lọc';
      filterToggleBtn.classList.remove('active');
    }
  });
  
  console.log('✅ Filter toggle setup complete');
}

/**
 * ✅ Setup filter dropdowns for price range, difficulty, and sorting
 */
function setupFilterDropdowns() {
  const priceFilter = document.querySelector('select[name="price-range"]') as HTMLSelectElement;
  const difficultyFilter = document.querySelector('select[name="difficulty"]') as HTMLSelectElement;
  const sortFilter = document.querySelector('select[name="sort"]') as HTMLSelectElement;
  
  // Find the apply button inside filter panel
  const filterPanel = document.getElementById('filter-panel');
  const applyFiltersBtn = filterPanel?.querySelector('.btn-primary') as HTMLButtonElement;
  
  if (!applyFiltersBtn) {
    console.error('❌ Apply filters button not found!');
    return;
  }
  
  console.log('✅ Apply button found:', applyFiltersBtn);
  
  applyFiltersBtn.addEventListener('click', async () => {
    console.log('🔧 Applying filters...');
    
    const priceRange = priceFilter?.value || '';
    const difficulty = difficultyFilter?.value || '';
    const sort = sortFilter?.value || '';
    
    console.log('📋 Filter values:', { priceRange, difficulty, sort });
    
    // Check if all filters are empty
    if (!priceRange && !difficulty && !sort) {
      console.log('📂 All filters empty, showing all products');
      // Reset to show all products (like clicking "Danh mục")
      currentFilterMode = 'all';
      currentCategoryId = undefined;
      resetFilterButtons();
      clearCategorySelection();
      await loadProductsFromAPI(undefined, 1);
      return;
    }
    
    // Reset filter mode and category
    currentFilterMode = 'all';
    currentCategoryId = undefined;
    resetFilterButtons();
    clearCategorySelection();
    
    // Apply filters with current settings
    await applyAdvancedFilters(priceRange, difficulty, sort);
  });
  
  console.log('✅ Filter dropdowns setup complete');
}

/**
 * ✅ Apply advanced filters (price, difficulty, sorting)
 */
async function applyAdvancedFilters(priceRange: string, difficulty: string, sort: string) {
  try {
    const mainList = document.getElementById('main-product-list');
    if (!mainList) {
      console.error('❌ Main product list container not found');
      return;
    }

    // Show loading
    mainList.innerHTML = '<div class="col-12 text-center py-5"><i class="fas fa-spinner fa-spin fa-3x text-primary"></i></div>';

    // Build query parameters
    const params = new URLSearchParams({
      page: '1',
      limit: '12'
    });
    
    // Add difficulty filter (khớp với Supabase: Easy, Medium, Hard, Expert)
    if (difficulty && difficulty !== '') {
      params.append('difficulty_level', difficulty);
    }
    
    // Add price range filter
    if (priceRange && priceRange !== '') {
      params.append('price_range', priceRange);
    }
    
    // Add sorting
    if (sort && sort !== '') {
      const [sortBy, sortOrder] = sort.split('-');
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
    }

    const url = `${getApiBaseUrl()}/api/v1/products/?${params.toString()}`;
    console.log('🔗 Fetching filtered products from:', url);

    // Fetch products
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Filter API Response:', result);

    if (result.success && result.data) {
      // Render products
      renderProductsToGrid(result.data);

      // Hide pagination for filtered results
      const paginationContainer = document.getElementById('pagination-container');
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
      }
    } else {
      mainList.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
          <h5>Không tìm thấy sản phẩm phù hợp với bộ lọc</h5>
        </div>
      `;
    }
  } catch (error) {
    console.error('❌ Apply filters error:', error);
    const mainList = document.getElementById('main-product-list');
    if (mainList) {
      mainList.innerHTML = '<div class="col-12"><p class="text-center py-5 text-danger">Có lỗi xảy ra khi lọc sản phẩm</p></div>';
    }
  }
}

/**
 * Load products based on filter mode
 */
async function loadFilteredProducts(mode: 'new' | 'bestseller') {
  try {
    const mainList = document.getElementById('main-product-list');
    if (!mainList) {
      console.error('❌ Main product list container not found');
      return;
    }

    // Show loading
    mainList.innerHTML = '<div class="col-12 text-center py-5"><i class="fas fa-spinner fa-spin fa-3x text-primary"></i></div>';

    let result;
    if (mode === 'new') {
      result = await productService.getNewProducts(12);
    } else {
      result = await productService.getBestsellerProducts(12);
    }
    if (result.success && result.products && result.products.length > 0) {
      // Convert Product objects to the format expected by renderProductsToGrid
      const productsData = result.products.map(product => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice,
          difficultyLevel: product.difficultyLevel,
          rating: product.rating,
          pieceCount: product.pieceCount,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl
        })
      );

      console.log('📦 Products after mapping:', productsData);
      renderProductsToGrid(productsData);
      
      // Hide pagination for filtered results
      const paginationContainer = document.getElementById('pagination-container');
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
      }
    } else {
      mainList.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
          <h5>Không có sản phẩm ${mode === 'new' ? 'mới' : 'phổ biến'}</h5>
        </div>
      `;
    }
  } catch (error) {
    console.error(`❌ Load ${mode} products error:`, error);
    const mainList = document.getElementById('main-product-list');
    if (mainList) {
      mainList.innerHTML = '<div class="col-12"><p class="text-center py-5 text-danger">Có lỗi xảy ra</p></div>';
    }
  }
}

/**
 * Set active filter button style
 */
function setActiveFilterButton(activeBtn: HTMLElement) {
  const btnNew = document.getElementById('btn-new');
  const btnBestseller = document.getElementById('btn-bestseller');
  
  // Reset all buttons to outline style (nền trắng, chữ xanh)
  [btnNew, btnBestseller].forEach(btn => {
    if (btn) {
      btn.className = 'btn btn-outline-primary';
      btn.style.backgroundColor = '';
      btn.style.color = '';
    }
  });
  
  // Set active button to filled style (nền xanh, chữ trắng)
  activeBtn.className = 'btn text-white';
  activeBtn.style.backgroundColor = '#0D9BFF';
  activeBtn.style.borderColor = '#0D9BFF';
}

/**
 * Reset filter buttons to default state (both outline)
 */
function resetFilterButtons() {
  const btnNew = document.getElementById('btn-new');
  const btnBestseller = document.getElementById('btn-bestseller');
  
  // Reset cả 2 nút về outline (không highlight nút nào)
  [btnNew, btnBestseller].forEach(btn => {
    if (btn) {
      btn.className = 'btn btn-outline-primary';
      btn.style.backgroundColor = '';
      btn.style.borderColor = '';
    }
  });
}

/**
 * Clear category selection
 */
function clearCategorySelection() {
  document.querySelectorAll('.category-item').forEach(item => {
    const el = item as HTMLElement;
    el.style.color = '';
    el.style.fontWeight = '';
  });
}

/**
 * Render products to main product grid with consistent styling
 */
async function renderProductsToGrid(products: any[]) {
  const mainList = document.getElementById('main-product-list');
  if (!mainList) {
    console.warn('main-product-list not found');
    return;
  }

  if (products.length === 0) {
    mainList.innerHTML = '<div class="col-12 text-center"><p>Không có sản phẩm nào</p></div>';
    return;
  }

  // ✅ Debug: Log products with slugs
  console.log('🔍 Products with slugs:', products.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    hasSlug: !!p.slug
  })));

  // Check which products are in wishlist
  let wishlistProductIds: number[] = [];
  try {
    if (authService.isAuthenticated()) {
      const wishlist = await wishlistService.getUserWishlist();
      wishlistProductIds = wishlist.map(item => item.product_id);
      console.log('💖 Wishlist product IDs:', wishlistProductIds);
    }
  } catch (error) {
    console.log('ℹ️ Could not load wishlist (user may not be logged in)');
  }

  // Render products with consistent styling from HomePage
  mainList.innerHTML = products.map(product => {
    // ✅ Fallback nếu slug rỗng
    const slug = product.slug || `product-${product.id}`;
    const price = parseFloat(product.price || 0);
    const salePrice = parseFloat(product.salePrice || 0);
    const displayPrice = salePrice > 0 ? salePrice : price;
    const formattedPrice = displayPrice.toLocaleString('vi-VN');
    const rating = product.rating || 4.8;
    const pieces = product.pieceCount || product.piece_count || 120;
    const difficultyLevel =
      normalizeDifficulty(product.difficultyLevel) ||
      normalizeDifficulty(product.difficulty_level) ||
      normalizeDifficulty((product as any).difficult_level) ||
      normalizeDifficulty(product.difficulty) ||
      'Medium';
    // Check if product is in wishlist
    const isInWishlist = wishlistProductIds.includes(parseInt(product.id));
    const heartClass = isInWishlist ? 'fas fa-heart icon-heart liked' : 'far fa-heart icon-heart';
    
    return `
      <div class="col-12  col-md-6 col-xl-4 col-xxl-3 mb-4">
        <div class="product-card position-relative" data-product-slug="${slug}" style="cursor: pointer;">
          <i class="${heartClass}" data-product-id="${product.id}"></i>
          <div class="product-image">
            <img src="${product.imageUrl}" alt="${product.name}">
          </div>
          <div class="product-info d-flex align-items-center justify-content-between">
            <span><i class="fa-solid fa-fire "></i> ${difficultyLevel}</span>
            <span><i class="fas fa-cube"></i> ${pieces}</span>
            <span><i class="fas fa-star text-warning"></i> ${rating}</span>
          </div>
          <div class="divider"></div>
          <div class="product-title" style="height:60px;">${product.name}</div>
          <div class="product-price">${formattedPrice} VNĐ</div>
          <button class="btn-cart" data-product-id="${product.id}">Thêm vào giỏ</button>
        </div>
      </div>
    `;
  }).join('');


  // Add click handlers with better logging
  const cards = mainList.querySelectorAll('.product-card');
  console.log(`🖱️ Setting up click handlers for ${cards.length} cards`);
  
  cards.forEach((card, index) => {
    // Add to cart button handler
    const addToCartBtn = card.querySelector('.btn-cart');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget as HTMLElement;
        const productId = parseInt(btn.getAttribute('data-product-id') || '0');
        
        console.log('🛒 [HomePage] Adding to cart, product ID:', productId);
        
        // Validate productId
        if (!productId || productId <= 0) {
          console.error('❌ [HomePage] Invalid product ID:', productId);
          alert('❌ Lỗi: Không tìm thấy thông tin sản phẩm');
          return;
        }
        
        // Import services
        try {
          const { cartService } = await import('../../../core/services/CartService.js');
          const { productService } = await import('../../../core/services/ProductService.js');
          
          // Get full product data
          console.log('📦 [HomePage] Fetching product details for ID:', productId);
          const productResult = await productService.getProductById(productId.toString());
          
          if (!productResult.success || !productResult.product) {
            console.error('❌ [HomePage] Product not found:', productId);
            alert('Không tìm thấy sản phẩm');
            return;
          }
          
          const product = productResult.product;
          console.log('✅ [HomePage] Product found:', {
            id: product.id,
            name: product.name,
            price: product.price
          });
          
          // Add to cart with full data
          const result = await cartService.addToCart({
            productId: parseInt(product.id),
            productName: product.name,
            productSlug: product.slug,
            imageUrl: product.imageUrl,
            price: product.price,
            salePrice: product.salePrice,
            quantity: 1,
            stockQuantity: product.stockQuantity || 100,
            minStockLevel: 0
          });
          
          if (result.success) {
            // Visual feedback
            btn.textContent = '✓ Đã thêm';
            btn.style.background = '#28a745';
            setTimeout(() => {
              btn.textContent = 'Thêm vào giỏ';
              btn.style.background = '';
            }, 2000);
            
            // Update cart badge
            const { updateCartBadge } = await import('../../../core/config/init.js');
            updateCartBadge();
          } else {
            alert(result.message || 'Không thể thêm vào giỏ hàng');
          }
        } catch (error) {
          console.error('❌ Error adding to cart:', error);
          alert('Lỗi khi thêm vào giỏ hàng');
        }
      });
    }
    
    // Heart icon click handler - Add/Remove from wishlist
    const heartIcon = card.querySelector('.icon-heart') as HTMLElement;
    if (heartIcon) {
      heartIcon.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        // Check if user is logged in
        if (!authService.isAuthenticated()) {
          alert('Vui lòng đăng nhập để thêm vào wishlist');
          window.location.href = './SigninPage.html';
          return;
        }
        
        const productId = parseInt(heartIcon.getAttribute('data-product-id') || '0');
        if (!productId) {
          console.error('❌ Invalid product ID for wishlist');
          return;
        }
        
        const isLiked = heartIcon.classList.contains('liked');
        
        try {
          if (isLiked) {
            // Remove from wishlist
            console.log('💔 Removing from wishlist:', productId);
            await wishlistService.removeFromWishlist(productId);
            heartIcon.classList.remove('liked', 'fas');
            heartIcon.classList.add('far');
            console.log('✅ Removed from wishlist');
          } else {
            // Add to wishlist
            console.log('💖 Adding to wishlist:', productId);
            await wishlistService.addToWishlist(productId);
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas', 'liked');
            console.log('✅ Added to wishlist');
          }
        } catch (error: any) {
          console.error('❌ Error toggling wishlist:', error);
          alert(error.message || 'Lỗi khi cập nhật wishlist');
        }
      });
    }
    
    // Product card click handler
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Check if clicking Add to Cart button or heart icon
      if (target.closest('.btn-cart') || target.closest('.icon-heart')) {
        console.log('🛒 Clicked on button/icon, not navigating');
        return;
      }

      const slug = card.getAttribute('data-product-slug');
      console.log(`🖱️ Card ${index + 1} clicked, slug:`, slug);
      
      if (slug) {
        console.log(`✅ Navigating to: /pages/ProductDetail.html?slug=${slug}`);
        window.location.href = `./ProductDetail.html?slug=${slug}`;
      } else {
        console.error('❌ No slug found for card');
      }
    });
  });

  console.log(`✅ Rendered ${products.length} products to grid with click handlers`);
}

/**
 * Render pagination controls from API response
 */
function renderPaginationControls(pagination: any) {
  if (!pagination) return;
  
  const { page, totalPages, total } = pagination;
  const paginationContainer = document.getElementById('pagination-container');
  
  if (!paginationContainer) {
    console.warn('Pagination container not found');
    return;
  }

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let html = '<nav><ul class="pagination justify-content-center">';
  
  // Previous button
  html += `
    <li class="page-item ${page <= 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page - 1}">Trước</a>
    </li>
  `;
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      html += `
        <li class="page-item ${i === page ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    } else if (i === page - 3 || i === page + 3) {
      html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }
  
  // Next button
  html += `
    <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${page + 1}">Sau</a>
    </li>
  `;
  
  html += '</ul></nav>';
  html += `<p class="text-center mt-2">Trang ${page} trong ${totalPages} (Tổng: ${total} sản phẩm)</p>`;
  
  paginationContainer.innerHTML = html;
  
  // Add click handlers
  paginationContainer.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      const newPage = parseInt(target.getAttribute('data-page') || '1');
      
      if (newPage > 0 && newPage <= totalPages) {
        await loadProductsFromAPI(currentCategoryId, newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}


