import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';
import { initializeSearch } from '../../../shared/components/SearchInit.js';
import { productService } from '../../../core/services/ProductService.js';
import { categoryService } from '../../../core/services/CategoryService.js';

// State management
let currentCategoryFilter: string | null = null;
let totalProducts: number = 0;
const PRODUCTS_PER_PAGE: number = 8;

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
  
  // Load real products from Supabase (AFTER HTML is rendered)
  // This will UPDATE the mock data with real data
  await loadRealProductData();
  
  // Setup category filter handlers
  setupCategoryFilters();
  
  // Setup filter button handlers
  setupFilterButtons();
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
    categoryList.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.product-card1') as HTMLElement;
      if (card) {
        const categoryId = card.dataset.categoryId;
        if (categoryId) {
          // Navigate to service page with category filter
          window.location.href = `/src/pages/Service.html?category=${categoryId}`;
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

  // Main product list render and navigation
  const mainProducts = [
    { 
      img: "../../public/images/Rectangle 108 (4).png", 
      title: "Police Car", 
      age: "8+", 
      pieces: 79, 
      rating: 4.8, 
      price: "190.000 VND",
      brand: "LEGO CITY",
      material: "ABS Plastic",
      description: "Join the world of LEGO City with the high-speed police car and brave police minifigure. Perfect for thrilling chases and creative adventures.",
      fullDescription: "Join the thrilling chases with the LEGO City Police set! This set includes: A powerful police supercar in the signature blue and white colors, featuring a sporty spoiler and flashing siren lights on the roof. A police minifigure dressed in official uniform and helmet, ready for action. This is a great choice for kids to play while developing their imagination, role-playing as police officers protecting the city, chasing criminals, and keeping the peace.",
      images: [
        "../../public/images/Rectangle 108 (4).png",
        "../../public/images/Rectangle 108 (1).png",
        "../../public/images/Rectangle 108 (2).png",
        "../../public/images/Rectangle 108 (3).png"
      ],
      reviews: [
        { user: "JessicaNguyen", rating: 5, date: "31-05-2025 13:52", comment: "Fast delivery, overall good quality material, carefully packaged." },
        { user: "BatmanRobin", rating: 4, date: "12-02-2025 01:30", comment: "Good quality, but I give 4 stars." }
      ]
    },
    { 
      img: "../../public/images/Rectangle 42.png", 
      title: "Space Science Lab", 
      age: "10+", 
      pieces: 340, 
      rating: 4.9, 
      price: "680.000 VND",
      brand: "LEGO CITY",
      material: "ABS Plastic",
      description: "Explore the mysteries of space with this advanced science laboratory set. Perfect for young astronauts and scientists.",
      fullDescription: "Discover the wonders of space exploration with the LEGO City Space Science Lab! This comprehensive set includes a detailed laboratory with scientific equipment, a rocket launch pad, and astronaut minifigures. Features include a rotating satellite dish, rocket with detachable stages, and various scientific instruments. Perfect for inspiring future scientists and space enthusiasts.",
      images: [
        "../../public/images/Rectangle 42.png",
        "../../public/images/Rectangle 42 (1).png",
        "../../public/images/Rectangle 42 (2).png"
      ],
      reviews: [
        { user: "SpaceExplorer", rating: 5, date: "15-03-2025 09:15", comment: "Amazing detail and educational value!" },
        { user: "ScienceFan", rating: 5, date: "08-03-2025 16:42", comment: "Great for learning about space science." }
      ]
    },
    { 
      img: "../../public/images/Rectangle 42 (1).png", 
      title: "Yellow Construction Wheel Loader", 
      age: "14+", 
      pieces: 1621, 
      rating: 4.7, 
      price: "280.000 VND",
      brand: "LEGO TECHNIC",
      material: "ABS Plastic",
      description: "Build and operate this realistic construction vehicle with working features and authentic details.",
      fullDescription: "Experience the power of construction with the LEGO Technic Yellow Construction Wheel Loader! This highly detailed model features a fully functional wheel loader with working steering, lifting arm, and bucket. The set includes authentic construction details like working suspension, detailed engine bay, and realistic operator cab. Perfect for construction enthusiasts and model builders.",
      images: [
        "../../public/images/Rectangle 42 (1).png",
        "../../public/images/Rectangle 42 (2).png",
        "../../public/images/Rectangle 42 (3).png"
      ],
      reviews: [
        { user: "ConstructionPro", rating: 5, date: "22-04-2025 11:30", comment: "Incredible detail and functionality!" },
        { user: "TechnicFan", rating: 4, date: "10-04-2025 14:20", comment: "Great build experience, very challenging." }
      ]
    },
    { 
      img: "../../public/images/Rectangle 42 (2).png", 
      title: "Ninjago City", 
      age: "6+", 
      pieces: 453, 
      rating: 4.6, 
      price: "2.520.000 VND",
      brand: "LEGO NINJAGO",
      material: "ABS Plastic",
      description: "Enter the world of Ninjago with this detailed city set featuring ninja warriors and epic adventures.",
      fullDescription: "Step into the action-packed world of Ninjago with this incredible city set! Features multiple buildings, ninja training areas, and authentic Ninjago characters. The set includes detailed interiors, working features, and plenty of accessories for endless ninja adventures. Perfect for fans of the Ninjago series and action-packed play.",
      images: [
        "../../public/images/Rectangle 42 (2).png",
        "../../public/images/Rectangle 42 (3).png",
        "../../public/images/Rectangle 42 (4).png"
      ],
      reviews: [
        { user: "NinjaMaster", rating: 5, date: "05-05-2025 08:45", comment: "Epic ninja battles await!" },
        { user: "LegoCollector", rating: 4, date: "28-04-2025 19:12", comment: "Great addition to my Ninjago collection." }
      ]
    },
    { 
      img: "../../public/images/Rectangle 42 (3).png", 
      title: "HeartLake City Community Park", 
      age: "8+", 
      pieces: 521, 
      rating: 4.8, 
      price: "542.000 VND",
      brand: "LEGO FRIENDS",
      material: "ABS Plastic",
      description: "Create a beautiful community park where friends can gather, play, and enjoy outdoor activities together.",
      fullDescription: "Welcome to Heartlake City Community Park, where friends come together to play and have fun! This charming set features a playground with swings and slides, a picnic area, beautiful landscaping, and plenty of space for outdoor activities. Includes multiple Friends minifigures and accessories for endless storytelling possibilities.",
      images: [
        "../../public/images/Rectangle 42 (3).png",
        "../../public/images/Rectangle 42 (4).png",
        "../../public/images/Rectangle 42 (5).png"
      ],
      reviews: [
        { user: "FriendsFan", rating: 5, date: "12-06-2025 15:30", comment: "Perfect for creative play with friends!" },
        { user: "ParkLover", rating: 4, date: "03-06-2025 10:15", comment: "Beautiful design and great play value." }
      ]
    },
    { 
      img: "../../public/images/Rectangle 42 (4).png", 
      title: "Heartlake City Water Park", 
      age: "10+", 
      pieces: 1476, 
      rating: 4.9, 
      price: "350.000 VND",
      brand: "LEGO FRIENDS",
      material: "ABS Plastic",
      description: "Splash into fun with this amazing water park featuring slides, pools, and water features for endless summer fun.",
      fullDescription: "Make a splash at Heartlake City Water Park! This incredible set features multiple water slides, a lazy river, splash pools, and water play areas. Includes changing rooms, snack stands, and plenty of Friends minifigures ready for water fun. Perfect for summer play and creative storytelling.",
      images: [
        "../../public/images/Rectangle 42 (4).png",
        "../../public/images/Rectangle 42 (5).png",
        "../../public/images/Rectangle 42 (6).png"
      ],
      reviews: [
        { user: "WaterFun", rating: 5, date: "18-07-2025 12:45", comment: "So much fun for summer play!" },
        { user: "SplashMaster", rating: 5, date: "09-07-2025 16:20", comment: "Amazing water features and details." }
      ]
    },
    { 
      img: "../../public/images/Rectangle 42 (5).png", 
      title: "Heartlake City Hospital", 
      age: "8+", 
      pieces: 232, 
      rating: 4.7, 
      price: "802.000 VND",
      brand: "LEGO FRIENDS",
      material: "ABS Plastic",
      description: "Help the community with this detailed hospital set featuring medical equipment and caring staff.",
      fullDescription: "Care for the community at Heartlake City Hospital! This detailed set features a fully equipped hospital with patient rooms, medical equipment, ambulance, and caring medical staff. Includes hospital beds, medical instruments, and emergency vehicles for realistic role-play scenarios.",
      images: [
        "../../public/images/Rectangle 42 (5).png",
        "../../public/images/Rectangle 42 (6).png",
        "../../public/images/Rectangle 42.png"
      ],
      reviews: [
        { user: "DoctorFan", rating: 5, date: "25-08-2025 14:10", comment: "Great for learning about healthcare!" },
        { user: "MedicalPro", rating: 4, date: "14-08-2025 11:35", comment: "Realistic medical equipment and details." }
      ]
    },
    { 
      img: "../../public/images/Rectangle 42 (6).png", 
      title: "Garage Mercedes-AMG & Alpine Car", 
      age: "8+", 
      pieces: 150, 
      rating: 4.6, 
      price: "230.000 VND",
      brand: "LEGO SPEED CHAMPIONS",
      material: "ABS Plastic",
      description: "Race into action with these authentic Mercedes-AMG and Alpine racing cars with detailed features.",
      fullDescription: "Speed into the world of professional racing with the LEGO Speed Champions Mercedes-AMG and Alpine Car set! Features two authentic racing cars with detailed liveries, working steering, and realistic racing details. Perfect for racing enthusiasts and car collectors.",
      images: [
        "../../public/images/Rectangle 42 (6).png",
        "../../public/images/Rectangle 42.png",
        "../../public/images/Rectangle 42 (1).png"
      ],
      reviews: [
        { user: "RacingFan", rating: 5, date: "02-09-2025 09:25", comment: "Amazing racing cars with great detail!" },
        { user: "SpeedLover", rating: 4, date: "20-08-2025 17:50", comment: "Perfect for racing enthusiasts." }
      ]
    }
  ];

  const mainList = document.getElementById("main-product-list");
  if(mainList && mainProducts && mainProducts.length > 0) {
    mainList.innerHTML = mainProducts.map((p, i) => `
      <div class="col-6 col-md-3">
        <div class="product-card position-relative" data-index="${i}">
          <i class="far fa-heart icon-heart"></i>
          <div class="product-image">
            <img src="${p.img}" alt="${p.title}">
          </div>
          <div class="product-info d-flex align-items-center justify-content-between">
            <span><i class="fas fa-child"></i> ${p.age}</span>
            <span><i class="fas fa-cube"></i> ${p.pieces}</span>
            <span><i class="fas fa-star text-warning"></i> ${p.rating}</span>
          </div>
          <div class="divider"></div>
          <div class="product-title" style ="height:40px;">${p.title}</div>
          <div class="product-price">${p.price}</div>
          <button class="btn-cart">Add to Cart</button>
        </div>
      </div>
    `).join("");
    // Điều hướng sang ProductDetail với dữ liệu đúng
    mainList.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      // Add to Cart button: update localStorage và stop navigation
      const addBtn = target ? target.closest('.btn-cart') : null;
      if(addBtn){
        const card = target ? target.closest('.product-card') : null;
        if(card){
          const idx = Number(card.getAttribute('data-index'));
          if(!Number.isNaN(idx)){
            const product = mainProducts[idx];
            try {
              const raw = localStorage.getItem('cartItems');
              const cart = raw ? JSON.parse(raw) : [];
              const normalize = (s: any) => (s||'').toString();
              const id = normalize(product.title);
              const priceNumber = Number(normalize(product.price).replace(/[^0-9]/g,'')) || 0;
              const foundIdx = cart.findIndex((it: any) => it.id === id);
              if(foundIdx >= 0){
                cart[foundIdx].qty += 1;
              } else {
                cart.push({ id, title: product.title, img: product.img, priceText: product.price, price: priceNumber, qty: 1 });
              }
              localStorage.setItem('cartItems', JSON.stringify(cart));
            } catch(_) {}
          }
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const card = target ? target.closest('.product-card') : null;
      if(!card) return;
      const idx = Number(card.getAttribute('data-index'));
      if(Number.isNaN(idx)) return;
      try {
        localStorage.setItem('selectedProduct', JSON.stringify(mainProducts[idx]));
      } catch(_) {}
      window.location.href = 'ProductDetail.html';
    });
  }
}

/**
 * Load real product data from Supabase with pagination
 */
async function loadRealProductData() {
  try {
    console.log('Loading real products from Supabase with pagination...');
    
    // Load first page of products
    await loadProductsWithPagination(null, 1);
    
    console.log('✅ Real product data loaded successfully with pagination');
    
  } catch (error) {
    console.error('Error loading real products:', error);
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
        if (categoryItem.getAttribute('data-category-id') !== currentCategoryFilter) {
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
      currentCategoryFilter = null;
      
      // Clear all active states
      document.querySelectorAll('.category-item').forEach(item => {
        const el = item as HTMLElement;
        el.style.color = '';
        el.style.fontWeight = '';
      });
      
      // Load all products from page 1
      await loadProductsWithPagination(null, 1);
    });
  }

  categorySidebar.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    
    if (target.classList.contains('category-item')) {
      const categoryId = target.getAttribute('data-category-id');
      
      // Update active state
      document.querySelectorAll('.category-item').forEach(item => {
        const el = item as HTMLElement;
        el.style.color = '';
        el.style.fontWeight = '';
      });
      target.style.color = '#0d6efd';
      target.style.fontWeight = 'bold';
      
      // Update current filter
      currentCategoryFilter = categoryId;
      
      // Load products by category with pagination (reset to page 1)
      console.log(`📂 Filtering products by category: ${categoryId}`);
      await loadProductsWithPagination(categoryId, 1);
    }
  });

  console.log('✅ Category filters setup complete');
}

/**
 * Filter products by category
 */
async function filterProductsByCategory(categoryId: string | null) {
  try {
    let result;
    
    if (categoryId) {
      console.log(`🔍 Loading products for category ${categoryId}`);
      result = await productService.getProductsByCategory(categoryId);
    } else {
      console.log('🔍 Loading all featured products');
      result = await productService.getFeaturedProducts(100); // Get all products
    }

    if (!result.success || !result.products) {
      console.error('❌ Failed to load products');
      return;
    }

    console.log(`✅ Loaded ${result.products.length} products`);

    // Render products to grid
    renderProductsToGrid(result.products);
  } catch (error) {
    console.error('❌ Error filtering products:', error);
  }
}

/**
 * Load products with pagination
 */
async function loadProductsWithPagination(categoryId: string | null, page: number) {
  try {
    let result;
    
    if (categoryId) {
      console.log(`🔍 Loading products for category ${categoryId}`);
      result = await productService.getProductsByCategory(categoryId);
    } else {
      console.log('🔍 Loading all products');
      result = await productService.getFeaturedProducts(100); // Get all products
    }

    if (!result.success || !result.products) {
      console.error('❌ Failed to load products');
      return;
    }

    totalProducts = result.products.length;
    console.log(`✅ Loaded ${totalProducts} products`);

    // Calculate pagination
    const startIndex = (page - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const paginatedProducts = result.products.slice(startIndex, endIndex);

    // Render products to grid
    renderProductsToGrid(paginatedProducts);
    
    // Render pagination controls
    renderPagination(page, totalProducts);
  } catch (error) {
    console.error('❌ Error loading products:', error);
  }
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

  // Render products with consistent styling from HomePage
  mainList.innerHTML = products.map(product => {
    const price = parseFloat(product.price || 0);
    const salePrice = parseFloat(product.salePrice || 0);
    const displayPrice = salePrice > 0 ? salePrice : price;
    const formattedPrice = displayPrice.toLocaleString('vi-VN');
    const rating = product.rating || 4.8;
    const age = product.recommendedAge || '8+';
    const pieces = product.pieceCount || 120;
    
    return `
      <div class="col-6 col-md-3">
        <div class="product-card position-relative" data-product-slug="${product.slug}">
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
          <button class="btn-cart">Add to Cart</button>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  mainList.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Check if clicking Add to Cart button
      if (target.closest('.btn-cart')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const slug = card.getAttribute('data-product-slug');
      if (slug) {
        window.location.href = `/src/pages/ProductDetail.html?slug=${slug}`;
      }
    });
  });

  console.log(`✅ Rendered ${products.length} products to grid`);
}

/**
 * Render pagination controls
 */
function renderPagination(currentPage: number, totalItems: number) {
  const totalPages = Math.ceil(totalItems / PRODUCTS_PER_PAGE);
  
  if (totalPages <= 1) {
    // Hide pagination if only 1 page
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
      paginationContainer.innerHTML = '';
    }
    return;
  }

  let paginationHTML = '<nav aria-label="Product pagination"><ul class="pagination justify-content-center">';
  
  // Previous button
  paginationHTML += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage - 1}" ${currentPage === 1 ? 'tabindex="-1"' : ''}>
        Trước
      </a>
    </li>
  `;
  
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // Adjust if we're near the end
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // First page
  if (startPage > 1) {
    paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
    if (startPage > 2) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }
  
  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }
  
  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
  }
  
  // Next button
  paginationHTML += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'tabindex="-1"' : ''}>
        Sau
      </a>
    </li>
  `;
  
  paginationHTML += '</ul></nav>';
  
  // Find or create pagination container
  let paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) {
    const mainList = document.getElementById('main-product-list');
    if (mainList && mainList.parentElement) {
      paginationContainer = document.createElement('div');
      paginationContainer.id = 'pagination-container';
      paginationContainer.className = 'col-12 mt-4';
      mainList.parentElement.insertBefore(paginationContainer, mainList.nextSibling);
    }
  }
  
  if (paginationContainer) {
    paginationContainer.innerHTML = paginationHTML;
    
    // Add click handlers for pagination links
    paginationContainer.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const pageLink = e.target as HTMLElement;
        const page = parseInt(pageLink.getAttribute('data-page') || '1');
        
        if (page && page !== currentPage && page >= 1 && page <= totalPages) {
          // Save current scroll position relative to the product grid
          const mainList = document.getElementById('main-product-list');
          const scrollPosition = mainList ? mainList.getBoundingClientRect().top + window.scrollY - 100 : 0;
          
          // Update page and load products
          await loadProductsWithPagination(currentCategoryFilter, page);
          
          // Restore scroll position (don't scroll to top)
          window.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }
  
  console.log(`✅ Rendered pagination: Page ${currentPage} of ${totalPages}`);
}

/**
 * Setup filter button handlers (Newest, Hot, Filter)
 */
function setupFilterButtons() {
  const filterButtons = document.querySelectorAll('.col-md-9 .btn');
  
  filterButtons.forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      // Update active state
      filterButtons.forEach(b => b.classList.remove('btn-primary'));
      filterButtons.forEach(b => b.classList.add('btn-secondary'));
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      
      // Filter logic (can be enhanced later)
      console.log(`🔘 Filter button ${index} clicked`);
      
      // For now, just reload products
      await filterProductsByCategory(currentCategoryFilter);
    });
  });

  console.log('✅ Filter buttons setup complete');
}
