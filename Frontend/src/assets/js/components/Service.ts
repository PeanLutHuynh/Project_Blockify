import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';
import { initializeSearch } from '../../../shared/components/SearchInit.js';
import { categoryService } from '../../../core/services/CategoryService.js';
import { productService } from '../../../core/services/ProductService.js';

// Initialize app and run page logic
initializeOnReady(() => {
  // Initialize navbar authentication UI
  initializeNavbarAuth();
  
  // Initialize search controller
  initializeSearch();
  
  // Original service page logic
  initializeServicePage();
});

// State management
let currentCategory: string | null = null;
// let currentFilter: 'newest' | 'hot' | 'all' = 'newest'; // TODO: Implement sorting logic

async function initializeServicePage() {
  console.log('🎨 Initializing Service/Products page...');
  
  // Load categories from Supabase
  await loadCategories();
  
  // Load featured products by default
  await loadProducts();
  
  // Setup filter buttons
  setupFilterButtons();
}

/**
 * Load categories from Supabase and render sidebar
 */
async function loadCategories() {
  try {
    console.log('📂 Loading categories from Supabase...');
    
    const result = await categoryService.getCategories();
    
    if (!result.success || !result.categories) {
      console.error('❌ Failed to load categories');
      return;
    }

    console.log(`✅ Loaded ${result.categories.length} categories`);
    
    // Render categories to sidebar (if exists)
    const categoryList = document.getElementById('category-list');
    if (categoryList) {
      categoryList.innerHTML = result.categories.map(cat => `
        <div class="category-item" data-category-id="${cat.id}" data-category-slug="${cat.slug}">
          <span>${cat.name}</span>
        </div>
      `).join('');
      
      // Add click handlers
      document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
          const categoryId = item.getAttribute('data-category-id');
          const categorySlug = item.getAttribute('data-category-slug');
          
          // Update active state
          document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          
          // Load products for this category
          currentCategory = categoryId;
          loadProducts(categoryId);
          
          console.log(`📂 Category selected: ${categorySlug} (${categoryId})`);
        });
      });
    }
  } catch (error) {
    console.error('❌ Error loading categories:', error);
  }
}

/**
 * Load products (all or by category)
 */
async function loadProducts(categoryId?: string | null) {
  try {
    console.log(`🔍 Loading products${categoryId ? ` for category ${categoryId}` : '...'}`);
    
    let result;
    
    if (categoryId) {
      // Load by category
      result = await productService.getProductsByCategory(categoryId);
    } else {
      // Load featured products
      result = await productService.getFeaturedProducts(20);
    }
    
    if (!result.success || !result.products) {
      console.error('❌ Failed to load products');
      return;
    }

    console.log(`✅ Loaded ${result.products.length} products`);
    
    // Render products to grid
    renderProducts(result.products);
    
  } catch (error) {
    console.error('❌ Error loading products:', error);
  }
}

/**
 * Render products to DOM
 */
function renderProducts(products: any[]) {
  const productGrid = document.getElementById('product-grid');
  if (!productGrid) {
    console.warn('⚠️ Product grid not found in DOM');
    return;
  }

  if (products.length === 0) {
    productGrid.innerHTML = '<p class="text-center">Không có sản phẩm nào</p>';
    return;
  }

  productGrid.innerHTML = products.map(product => {
    const price = parseFloat(product.price || 0);
    const formattedPrice = price.toLocaleString('vi-VN');
    
    return `
      <div class="product-card" data-slug="${product.slug}">
        <img src="${product.imageUrl || 'https://via.placeholder.com/200'}" alt="${product.name}">
        <h6>${product.name}</h6>
        <p>${product.price || 'N/A'}</p>
        <button class="btn btn-primary add-to-cart-btn">Thêm vào giỏ</button>
      </div>
    `;
  }).join('');

  // Add click handlers for product cards
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Don't navigate if clicking add to cart button
      if (target.classList.contains('add-to-cart-btn')) {
        e.stopPropagation();
        // Thêm vào giỏ hàng
        console.log(`Thêm vào giỏ: ${card.getAttribute('data-slug')}`);
        return;
      }
      
      const slug = card.getAttribute('data-slug');
      if (slug) {
        window.location.href = `/src/pages/ProductDetail.html?slug=${slug}`;
      }
    });
  });

  console.log(`✅ Rendered ${products.length} products to grid`);
}

/**
 * Setup filter buttons (Newest, Hot, Filter)
 */
function setupFilterButtons() {
  const newestBtn = document.getElementById('filter-newest');
  const hotBtn = document.getElementById('filter-hot');
  const filterBtn = document.getElementById('filter-all');
  
  if (newestBtn) {
    newestBtn.addEventListener('click', () => {
      // currentFilter = 'newest'; // TODO: Implement sorting
      setActiveFilter(newestBtn);
      loadProducts(currentCategory);
    });
  }
  
  if (hotBtn) {
    hotBtn.addEventListener('click', () => {
      // currentFilter = 'hot'; // TODO: Implement sorting
      setActiveFilter(hotBtn);
      loadProducts(currentCategory);
    });
  }
  
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      // currentFilter = 'all'; // TODO: Implement sorting
      setActiveFilter(filterBtn);
      loadProducts(currentCategory);
    });
  }
}

/**
 * Set active state for filter button
 */
function setActiveFilter(activeBtn: HTMLElement) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  activeBtn.classList.add('active');
}

