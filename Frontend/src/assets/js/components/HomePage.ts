import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';
import { initializeSearch } from '../../../shared/components/SearchInit.js';
import { categoryService } from '../../../core/services/CategoryService.js';
import { productService } from '../../../core/services/ProductService.js';
import { supabaseService } from '../../../core/api/supabaseClient.js';

// State management for pagination and filtering
let currentCategoryId: number | undefined = undefined;

// Initialize app and run page logic
initializeOnReady(async () => {
  // Initialize navbar authentication UI
  initializeNavbarAuth();
  
  // Initialize search controller (UC3 - Thanh tìm kiếm)
  initializeSearch();
  
  // Original homepage logic (UI interactions only - synchronous)
  setupUIInteractions();
  
  // Load categories dynamically from Supabase
  await loadCategorySidebar();
  
  // ✅ Load ALL products for main section (phía trên) - KHÔNG có logic gợi ý
  await loadProductsFromAPI(undefined, 1);
  
  // ✅ Load recommendation section - "SẢN PHẨM ĐỀ XUẤT" với logic gợi ý thông minh
  await loadRecommendedProductsForSection();
  
  // Setup category filter handlers
  setupCategoryFilters();
});

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

    const url = `http://127.0.0.1:3001/api/v1/products/?${params.toString()}`;
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
 * ✅ Load "SẢN PHẨM ĐỀ XUẤT" section (phía dưới) với logic gợi ý thông minh
 * 
 * Logic:
 * 1. Nếu CHƯA ĐĂNG NHẬP hoặc CHƯA CÓ đơn hàng "Đã giao"
 *    → Hiển thị 8 sản phẩm best-selling (được mọi người mua nhiều nhất từ đơn hàng "Đã giao")
 * 
 * 2. Nếu ĐÃ ĐĂNG NHẬP và CÓ đơn hàng "Đã giao"
 *    → Hiển thị personalized recommendations (dựa trên lịch sử mua hàng)
 *    → Nếu không có personalized → Fallback to best-selling
 * 
 * - Click vào sản phẩm → Navigate to ProductDetail page
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

    console.log('🎯 Loading "SẢN PHẨM ĐỀ XUẤT" section with smart recommendations...');
    
    let products: any[] = [];

    // ✅ Bước 1: Check if user is authenticated AND has delivered orders
    const isAuth = await supabaseService.isAuthenticated();
    
    if (isAuth) {
      // Get current user
      const { data: userData } = await supabaseService.getUser();
      
      if (userData && userData.user) {
        // Get user_id from users table
        const client = supabaseService.getClient();
        const { data: userRecord } = await client
          .from('users')
          .select('user_id')
          .eq('auth_uid', userData.user.id)
          .single();

        if (userRecord) {
          const userId = userRecord.user_id;
          console.log(`✅ User logged in: ${userId}, checking for delivered orders...`);

          // Check if user has delivered orders
          const { data: orders } = await client
            .from('orders')
            .select('order_id')
            .eq('user_id', userId)
            .eq('status', 'Đã giao')
            .limit(1);

          if (orders && orders.length > 0) {
            console.log('✅ User has delivered orders, loading personalized recommendations...');
            
            // Try personalized recommendations
            const result = await productService.getRecommendedProductsForUser(userId, 8);
            
            if (result.success && result.products && result.products.length > 0) {
              products = result.products;
              console.log(`✅ Loaded ${products.length} personalized recommendations`);
            } else {
              console.log('⚠️ No personalized recommendations found, will fallback to best-selling');
            }
          } else {
            console.log('⚠️ User has NO delivered orders, will show best-selling products');
          }
        }
      }
    } else {
      console.log('⚠️ User not logged in, will show best-selling products');
    }

    // ✅ Bước 2: Nếu chưa có products (chưa login / chưa có delivered orders / personalized failed)
    // → Load best-selling products (8 sản phẩm được mọi người mua nhiều nhất)
    if (products.length === 0) {
      console.log('⭐ Loading best-selling products (8 sản phẩm được mọi người mua nhiều nhất từ đơn hàng "Đã giao")...');
      const result = await productService.getBestSellingProducts(8);
      
      if (result.success && result.products && result.products.length > 0) {
        products = result.products;
        console.log(`✅ Loaded ${products.length} best-selling products`);
      } else {
        console.error('❌ Failed to load best-selling products');
      }
    }

    if (products.length === 0) {
      categoryList.innerHTML = '<div class="col-12 text-center"><p>Không có sản phẩm đề xuất</p></div>';
      console.warn('⚠️ No products found for recommendation section');
      return;
    }

    // Clear loading spinner
    categoryList.innerHTML = '';

    // ✅ Render PRODUCT cards (chỉ có tên sản phẩm + ảnh, không có badge)
    products.slice(0, 8).forEach((product) => {
      const productCard = document.createElement('div');
      productCard.className = 'd-flex justify-content-center col-md-3 col-sm-6';
      
      productCard.innerHTML = `
        <div class="product-card1" data-product-slug="${product.slug}" style="cursor: pointer;">
          <img src="${product.imageUrl}" 
               alt="${product.name}" 
               class="product-img"
               onerror="this.src='/public/images/2.jpg'">
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
          window.location.href = `/src/pages/ProductDetail.html?slug=${slug}`;
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
      
      // Clear all active states
      document.querySelectorAll('.category-item').forEach(item => {
        const el = item as HTMLElement;
        el.style.color = '';
        el.style.fontWeight = '';
      });
      
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
      
      // Load products by category with pagination (reset to page 1)
      console.log(`📂 Filtering products by category: ${categoryId}`);
      await loadProductsFromAPI(categoryId, 1);
    }
  });

  console.log('✅ Category filters setup complete');
}

/**
 * Render products to main product grid with consistent styling
 */
function renderProductsToGrid(products: any[]) {
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

  // Render products with consistent styling from HomePage
  mainList.innerHTML = products.map(product => {
    // ✅ Fallback nếu slug rỗng
    const slug = product.slug || `product-${product.id}`;
    const price = parseFloat(product.price || 0);
    const salePrice = parseFloat(product.salePrice || 0);
    const displayPrice = salePrice > 0 ? salePrice : price;
    const formattedPrice = displayPrice.toLocaleString('vi-VN');
    const rating = product.rating || 4.8;
    const age = product.recommendedAge || '8+';
    const pieces = product.pieceCount || 120;
    
    return `
      <div class="col-6 col-md-3">
        <div class="product-card position-relative" data-product-slug="${slug}" style="cursor: pointer;">
          <i class="far fa-heart icon-heart"></i>
          <div class="product-image">
            <img src="${product.imageUrl}" alt="${product.name}">
          </div>
          <div class="product-info d-flex align-items-center justify-content-between">
            <span><i class="fas fa-child"></i> ${age}</span>
            <span><i class="fas fa-cube"></i> ${pieces}</span>
            <span><i class="fas fa-star text-warning"></i> ${rating}</span>
          </div>
          <div class="divider"></div>
          <div class="product-title" style="height:40px;">${product.name}</div>
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
        
        console.log('🛒 Adding to cart, product ID:', productId);
        
        // Import services
        try {
          const { cartService } = await import('../../../core/services/CartService.js');
          const { productService } = await import('../../../core/services/ProductService.js');
          
          // Get full product data
          const productResult = await productService.getProductById(productId.toString());
          
          if (!productResult.success || !productResult.product) {
            alert('Không tìm thấy sản phẩm');
            return;
          }
          
          const product = productResult.product;
          
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
        console.log(`✅ Navigating to: /src/pages/ProductDetail.html?slug=${slug}`);
        window.location.href = `/src/pages/ProductDetail.html?slug=${slug}`;
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
      <a class="page-link" href="#" data-page="${page - 1}">Previous</a>
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
      <a class="page-link" href="#" data-page="${page + 1}">Next</a>
    </li>
  `;
  
  html += '</ul></nav>';
  html += `<p class="text-center mt-2">Page ${page} of ${totalPages} (Total: ${total} products)</p>`;
  
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


