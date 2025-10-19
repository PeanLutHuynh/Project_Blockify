import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';
import { initializeSearch } from '../../../shared/components/SearchInit.js';
import { categoryService } from '../../../core/services/CategoryService.js';

// State management for pagination and filtering
let currentCategoryId: number | undefined = undefined;

// Initialize app and run page logic
initializeOnReady(async () => {
  // Initialize navbar authentication UI
  initializeNavbarAuth();
  
  // Initialize search controller (UC3 - Thanh tìm kiếm)
  initializeSearch();
  
  // Original homepage logic (UI interactions only)
  initializeHomePage();
  
  // Load categories dynamically from Supabase
  await loadCategorySidebar();
  
  // Load products with pagination from API
  await loadProductsFromAPI(undefined, 1);
  
  // Setup category filter handlers
  setupCategoryFilters();
});

function initializeHomePage() {
  // Categories list (keep this for category icons/navigation)
  const categories = [
    { img: "../../public/images/Group 61.png", name: "Police", categoryId: "1" },
    { img: "../../public/images/Group 61 (1).png", name: "Fire", categoryId: "2" },
    { img: "../../public/images/Group 61 (2).png", name: "City", categoryId: "3" },
    { img: "../../public/images/Group 61 (3).png", name: "Construction", categoryId: "4" },
    { img: "../../public/images/Group 61 (4).png", name: "Train", categoryId: "5" },
    { img: "../../public/images/Group 61 (5).png", name: "Airport", categoryId: "6" },
    { img: "../../public/images/Group 61 (6).png", name: "Seaport", categoryId: "7" },
    { img: "../../public/images/Group 61 (7).png", name: "Space", categoryId: "8" }
  ];
  
  const categoryList = document.getElementById("product-list");
  if (categoryList) {
    // Render category cards
    categories.forEach(cat => {
      categoryList.innerHTML += `
        <div class="d-flex justify-content-center col-md-3 col-sm-6">
          <div class="product-card1" data-category-id="${cat.categoryId}">
            <img src="${cat.img}" alt="${cat.name}" class="product-img">
            <span class="badge-hot">Hot</span>
            <div class="product-footer pt-4">${cat.name}</div>
          </div>
        </div>
      `;
    });
    
    // Add click handlers for category navigation
    categoryList.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.product-card1') as HTMLElement;
      if (card) {
        const categoryId = card.dataset.categoryId;
        if (categoryId) {
          // Filter products by category on same page
          await loadProductsFromAPI(parseInt(categoryId), 1);
          // Scroll to products section
          const mainList = document.getElementById('main-product-list');
          if (mainList) {
            mainList.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    });
  }

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
          <button class="btn-cart" onclick="event.stopPropagation();">Add to Cart</button>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers with better logging
  const cards = mainList.querySelectorAll('.product-card');
  console.log(`🖱️ Setting up click handlers for ${cards.length} cards`);
  
  cards.forEach((card, index) => {
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


