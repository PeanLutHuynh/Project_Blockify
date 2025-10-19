import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';
import { initializeSearch } from '../../../shared/components/SearchInit.js';
import { productService } from '../../../core/services/ProductService.js';

// Product data
type Product = {
  name: string;
  age: string;
  comments: number;
  rating: number;
  price: string;
  image: string;
  bgClass: string;
  fallbackIcon?: string;
  slug?: string;
};

const products: Product[] = [
  { name: 'Police and dogs', age: '8+', comments: 223, rating: 4.3, price: '200,000', image: '../../public/images/Group 61 (1).png', bgClass: 'product-1' },
  { name: 'Love house', age: '12+', comments: 832, rating: 4.8, price: '541,000', image: '../../public/images/Group 61 (2).png', bgClass: 'product-2' },
  { name: '4 colors building', age: '10+', comments: 746, rating: 4.6, price: '929,000', image: '../../public/images/Group 61 (3).png', bgClass: 'product-3' },
  { name: 'Construction vehicle', age: '8+', comments: 219, rating: 4.7, price: '190,000', image: '../../public/images/Group 61 (4).png', bgClass: 'product-4' },
  { name: 'Space lab', age: '8+', comments: 431, rating: 5.0, price: '321,000', image: '../../public/images/Group 61 (5).png', bgClass: 'product-5' },
  { name: 'Fighter jet', age: '6+', comments: 156, rating: 4.2, price: '450,000', image: '../../public/images/Group 61 (6).png', bgClass: 'product-1' }
];

function createProductCard(product: Product): string {
  return `
    <div class="product-card">
      <div class="heart-icon" onclick="toggleHeart(this)">
        <i class="far fa-heart"></i>
      </div>
      <div class="product-image ${product.bgClass}">
        <img src="${product.image}" 
             alt="${product.name}"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
        <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center;">
          <i class="fas fa-${product.fallbackIcon}" style="font-size: 40px; color: white;"></i>
        </div>
      </div>
      <div class="product-stats">
        <div class="stat-item">
          <i class="fas fa-user-friends"></i>
          <span>${product.age}</span>
        </div>
        <div class="fas fa-child">
          <i class="fas fa-cube"></i>
          <span>${product.comments}</span>
        </div>
        <div class="stat-item">
          <i class="fas fa-star text-warning"></i>
          <span>${product.rating}</span>
        </div>
      </div>
      <div class="product-name">${product.name}</div>
      <div class="product-price">${product.price} VND</div>
      <button class="add-to-cart-btn" onclick="addToCart('${product.name}', this)">Add to cart</button>
    </div>
  `;
}

function initProducts(): void {
  const grid = document.getElementById('productGrid');
  if (grid) grid.innerHTML = products.map(createProductCard).join('');
}

function scrollProducts(direction: 'left' | 'right'): void {
  const container = document.getElementById('productScroll');
  const scrollAmount = 260;
  if (container) container.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
}

function toggleHeart(heart: HTMLElement): void {
  const icon = heart.querySelector('i');
  if (!icon) return;
  const isLiked = icon.classList.contains('fas');
  icon.className = isLiked ? 'far fa-heart' : 'fas fa-heart';
  heart.style.background = isLiked ? 'white' : '#ff4757';
  heart.style.borderColor = isLiked ? '#ddd' : '#ff4757';
  (icon as HTMLElement).style.color = isLiked ? '#999' : 'white';
}

function addToCart(productName: string, btn: HTMLElement): void {
  alert(`Added "${productName}" to cart!`);
  btn.textContent = 'Added!';
  btn.style.background = '#28a745';
  setTimeout(() => {
    btn.textContent = 'Add to cart';
    btn.style.background = '#007bff';
  }, 1500);
}

// Make functions available globally for HTML onclick handlers
(window as any).scrollProducts = scrollProducts;
(window as any).toggleHeart = toggleHeart;
(window as any).addToCart = addToCart;

export {};

declare global {
  interface Window {
    changeMainImage: (src: string) => void;
    addReview: (event: Event) => void;
  }
}

// Initialize app and run page logic
initializeOnReady(() => {
  // Initialize navbar authentication UI
  initializeNavbarAuth();
  
  // Initialize search controller
  initializeSearch();
  
  // Original product detail page logic
  initializeProductDetailPage();
});

/**
 * Load product data from Supabase by slug
 */
async function loadProductFromSupabase(slug: string): Promise<any | null> {
  try {
    console.log(`🔍 Loading product with slug: ${slug}`);
    
    const result = await productService.getProductBySlug(slug);
    
    if (!result.success || !result.product) {
      console.error('❌ Failed to load product:', result.message);
      return null;
    }

    console.log('✅ Product loaded from Supabase:', result.product);
    return result.product;
  } catch (error) {
    console.error('❌ Error loading product:', error);
    return null;
  }
}

/**
 * Load recommended products from Supabase
 */
async function loadRecommendedProducts(): Promise<void> {
  try {
    console.log('🔍 Loading recommended products...');
    
    const result = await productService.getFeaturedProducts(6);
    
    if (!result.success || !result.products) {
      console.error('❌ Failed to load recommended products');
      // Keep mock products as fallback
      initProducts();
      return;
    }

    console.log(`✅ Loaded ${result.products.length} recommended products`);
    
    // Render to grid
    const grid = document.getElementById('productGrid');
    if (!grid) {
      console.warn('productGrid not found');
      return;
    }

    grid.innerHTML = result.products.map(product => {
      const price = typeof product.price === 'number' ? product.price : parseFloat(product.price || '0');
      const formattedPrice = price.toLocaleString('vi-VN');
      
      return `
        <div class="product-card" data-slug="${product.slug}" style="cursor: pointer;">
          <div class="heart-icon" onclick="event.stopPropagation(); toggleHeart(this)">
            <i class="far fa-heart"></i>
          </div>
          <div class="product-image">
            <img src="${product.imageUrl}" alt="${product.name}">
          </div>
          <div class="product-stats">
            <div class="stat-item">
              <i class="fas fa-user-friends"></i>
              <span>8+</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-cube"></i>
              <span>120</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-star text-warning"></i>
              <span>4.8</span>
            </div>
          </div>
          <div class="product-name">${product.name}</div>
          <div class="product-price">${formattedPrice} VND</div>
          <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${product.name}', this)">Add to cart</button>
        </div>
      `;
    }).join('');

    // Add click handlers
    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.getAttribute('data-slug');
        if (slug) {
          window.location.href = `/src/pages/ProductDetail.html?slug=${slug}`;
        }
      });
    });

  } catch (error) {
    console.error('❌ Error loading recommended products:', error);
    // Fallback to mock data
    initProducts();
  }
}

/**
 * Render product detail to DOM
 */
function renderProductDetail(product: any): void {
  console.log('🎨 Rendering product detail...', product);
  
  // Update breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb-item.active');
  if (breadcrumb) {
    breadcrumb.textContent = product.product_name || 'Product';
  }

  // Update title
  const pdTitle = document.getElementById('pd-title');
  if (pdTitle) {
    pdTitle.textContent = `Product Name: ${product.product_name || ''}`;
  }

  // Update brand
  const pdBrand = document.getElementById('pd-brand');
  if (pdBrand) {
    pdBrand.innerHTML = `Brand: LEGO ${product.categories?.category_name || 'CITY'} <br> Material: ABS Plastic`;
  }

  // Update price
  const pdPrice = document.getElementById('pd-price');
  if (pdPrice) {
    const price = parseFloat(product.price || 0);
    const salePrice = parseFloat(product.sale_price || product.price || 0);
    
    if (salePrice < price) {
      pdPrice.innerHTML = `
        <span style="text-decoration: line-through; color: #999; font-size: 0.9em;">${price.toLocaleString('vi-VN')} VND</span><br>
        <span style="color: #e74c3c; font-weight: bold;">${salePrice.toLocaleString('vi-VN')} VND</span>
      `;
    } else {
      pdPrice.textContent = `${price.toLocaleString('vi-VN')} VND`;
    }
  }

  // Update rating stars
  const rating = parseFloat(product.rating_average || product.rating || 4.5);
  const pdRating = document.getElementById('pd-rating');
  if (pdRating) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += `<i class="fas fa-star${i <= Math.round(rating) ? '' : '-half-alt'}"></i>`;
    }
    pdRating.innerHTML = starsHtml;
  }

  // Update theme
  const pdTheme = document.getElementById('pd-theme');
  if (pdTheme) {
    pdTheme.textContent = `Theme: LEGO ${product.categories?.category_name || 'City'}`;
  }

  // Update age (use difficulty_level to determine age recommendation)
  const pdAge = document.getElementById('pd-age');
  if (pdAge) {
    // Map difficulty to age ranges
    const ageMap: Record<string, string> = {
      'Easy': '4+',
      'Medium': '7+',
      'Hard': '10+',
      'Expert': '14+'
    };
    const age = ageMap[product.difficulty_level || 'Medium'] || '7+';
    pdAge.textContent = `Age: ${age}`;
  }

  // Update short description
  const pdShortDesc = document.getElementById('pd-short-desc');
  if (pdShortDesc) {
    pdShortDesc.textContent = product.short_description || product.description || '';
  }

  // Update stats
  const pdStats = document.getElementById('pd-stats');
  if (pdStats) {
    // Map difficulty to age ranges
    const ageMap: Record<string, string> = {
      'Easy': '4+',
      'Medium': '7+',
      'Hard': '10+',
      'Expert': '14+'
    };
    const age = ageMap[product.difficulty_level || 'Medium'] || '7+';
    
    pdStats.innerHTML = `
      <span class="stats-item"><i class="fas fa-user"></i> Age: ${age}</span>
      <span class="stats-item"><i class="fas fa-users"></i> ${product.piece_count || 'N/A'}</span>
      <span class="stats-item"><i class="fas fa-star"></i> ${rating.toFixed(1)}</span>
    `;
  }

  // Update images
  if (product.product_images && product.product_images.length > 0) {
    const images = product.product_images;
    console.log('📸 Product images:', images);
    
    // Primary image
    const primaryImage = images.find((img: any) => img.is_primary) || images[0];
    console.log('📸 Primary image:', primaryImage);
    
    const pdImage = document.getElementById('pd-image') as HTMLImageElement | null;
    if (pdImage && primaryImage) {
      console.log('📸 Setting main image to:', primaryImage.image_url);
      pdImage.src = primaryImage.image_url;
      pdImage.alt = primaryImage.alt_text || product.product_name;
    }

    // Thumbnails - render even if only 1 image
    const thumbContainer = document.querySelector('.thumbnail-container');
    if (thumbContainer && images.length >= 1) {
      console.log('📸 Rendering thumbnails for', images.length, 'images');
      thumbContainer.innerHTML = images
        .slice(0, 4)
        .map((img: any) => `
          <div class="thumbnail" onclick="changeMainImage('${img.image_url}')">
            <img src="${img.image_url}" alt="${img.alt_text || 'Thumbnail'}">
          </div>
        `)
        .join('');
    }

    // Detail image
    const detailImg = document.getElementById('pd-detail-image') as HTMLImageElement | null;
    if (detailImg && primaryImage) {
      console.log('📸 Setting detail image to:', primaryImage.image_url);
      detailImg.src = primaryImage.image_url;
      detailImg.alt = product.product_name;
    }
  } else {
    console.warn('⚠️ No product images found in data');
  }

  // Update full description
  const pdFullDesc = document.getElementById('pd-full-description');
  if (pdFullDesc) {
    pdFullDesc.textContent = product.description || product.short_description || '';
  }

  console.log('✅ Product detail rendered successfully');
}

function initializeProductDetailPage() {
  // Load recommended products from Supabase
  loadRecommendedProducts();

  // Đổi ảnh chính khi click thumbnail
  (window as any).changeMainImage = function(src: string): void {
    const img = document.getElementById('pd-image') as HTMLImageElement | null;
    if (img) img.src = src;
  };

  // Get slug from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  console.log('🔍 ProductDetail - URL Slug:', slug);

  if (slug) {
    console.log('✅ Slug found, loading product from Supabase...');
    // Load product from Supabase by slug
    loadProductFromSupabase(slug).then(product => {
      if (product) {
        console.log('✅ Product data received:', product.product_name);
        renderProductDetail(product);
      } else {
        console.error('❌ Product not found, showing fallback data');
        alert('Không tìm thấy sản phẩm này!');
        // Keep default HTML content as fallback
      }
    });
  } else {
    // Fallback: try localStorage (for backward compatibility)
    console.log('⚠️ No slug in URL, checking localStorage...');
    
    let data: any = null;
    try {
      const raw = localStorage.getItem('selectedProduct');
      if (raw) {
        data = JSON.parse(raw);
        console.log('📦 Found product in localStorage:', data);
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }

    if (!data) {
      console.warn('⚠️ No product data available, showing default content');
      // Keep default HTML content as fallback
    } else {
      // Render from localStorage data (old format)
      const pdTitle = document.getElementById('pd-title');
      if (pdTitle) pdTitle.textContent = "Product Name: " + (data.title || "");
      
      const pdBrand = document.getElementById('pd-brand');
      if (pdBrand) pdBrand.innerHTML = `Brand: ${data.brand || ""} <br> Material: ${data.material || ""}`;
      
      const pdPrice = document.getElementById('pd-price');
      if (pdPrice) pdPrice.textContent = data.price || "";
      
      const pdTheme = document.getElementById('pd-theme');
      if (pdTheme) pdTheme.textContent = "Theme: " + (data.brand || "");
      
      const pdAge = document.getElementById('pd-age');
      if (pdAge) pdAge.textContent = "Age: " + (data.age || "");
      
      const pdShortDesc = document.getElementById('pd-short-desc');
      if (pdShortDesc) pdShortDesc.textContent = data.description || "";
      
      // Rating stars
      let ratingHtml = "";
      for (let i = 1; i <= 5; i++) {
        ratingHtml += `<i class="fas fa-star${i <= Math.round(data.rating || 0) ? "" : "-o"}"></i>`;
      }
      const pdRating = document.getElementById('pd-rating');
      if (pdRating) pdRating.innerHTML = ratingHtml;
      
      // Stats
      const pdStats = document.getElementById('pd-stats');
      if (pdStats) pdStats.innerHTML = `
        <span class="stats-item"><i class="fas fa-user"></i> Age: ${data.age || ""}</span>
        <span class="stats-item"><i class="fas fa-users"></i> ${data.pieces || ""}</span>
        <span class="stats-item"><i class="fas fa-star"></i> ${data.rating || ""}</span>
      `;
      
      // Images
      if (data.images && data.images.length > 0) {
        const pdImage = document.getElementById('pd-image') as HTMLImageElement | null;
        if (pdImage) pdImage.src = data.images[0];
        
        const thumbContainer = document.querySelector('.thumbnail-container');
        if (thumbContainer) {
          thumbContainer.innerHTML = data.images.slice(1, 4).map((img: string) =>
            `<div class="thumbnail" onclick="changeMainImage('${img}')"><img src="${img}" alt="Thumbnail"></div>`
          ).join('');
        }
        
        const detailImg = document.getElementById('pd-detail-image') as HTMLImageElement | null;
        if (detailImg) detailImg.src = data.images[0];
      }
      
      // Full description
      if (data.fullDescription) {
        const pdFullDesc = document.getElementById('pd-full-description');
        if (pdFullDesc) pdFullDesc.textContent = data.fullDescription;
      }
      
      // Reviews
      if (data.reviews && data.reviews.length > 0) {
        const pdReviews = document.getElementById('pd-reviews');
        if (pdReviews) pdReviews.innerHTML = data.reviews.map((r: any) => `
          <div class="review-item">
            <div class="review-header">
              <div class="reviewer-avatar">${r.user[0]}</div>
              <div class="reviewer-info">
                <div class="reviewer-name">${r.user}</div>
                <div class="review-date">${r.date}</div>
              </div>
              <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
            </div>
            <div class="review-content">${r.comment}</div>
          </div>
        `).join('');
      }
    }
  }
  // Add review form
  (window as any).addReview = function(event: Event): void {
    event.preventDefault();
    const userInput = document.getElementById("review-user") as HTMLInputElement | null;
    const ratingInput = document.getElementById("review-rating") as HTMLInputElement | null;
    const commentInput = document.getElementById("review-comment") as HTMLInputElement | null;
    const imagesInput = document.getElementById("review-images") as HTMLInputElement | null;
    const user = userInput ? userInput.value.trim() : '';
    const rating = ratingInput ? parseInt(ratingInput.value) : 0;
    const comment = commentInput ? commentInput.value.trim() : '';
    if (!user || !comment) {
      alert("Please enter your name and comment!");
      return;
    }
    const date = new Date();
    const formattedDate = date.toLocaleDateString("vi-VN") + " " + date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
    // Lấy danh sách ảnh (giới hạn 3)
    let imagesHtml = "";
    if (imagesInput && imagesInput.files && imagesInput.files.length > 0) {
      const files = Array.from(imagesInput.files).slice(0, 3);
      imagesHtml = `<div class="review-images">` +
        files.map(file => {
          const url = URL.createObjectURL(file as Blob);
          return `<img src="${url}" alt="Review Image" style="width:80px;height:80px;object-fit:cover;margin-right:5px;border-radius:5px;">`;
        }).join('') +
      `</div>`;
    }
    const newReview = `
      <div class="review-item">
        <div class="review-header">
          <div class="reviewer-avatar">${user[0].toUpperCase()}</div>
          <div class="reviewer-info">
            <div class="reviewer-name">${user}</div>
            <div class="review-date">${formattedDate}</div>
          </div>
          <div class="review-stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
        </div>
        <div class="review-content">${comment}</div>
        ${imagesHtml}
      </div>
    `;
    const pdReviews = document.getElementById("pd-reviews");
    if (pdReviews) pdReviews.insertAdjacentHTML("afterbegin", newReview);
    // Reset form
    const reviewForm = document.querySelector(".add-review-form") as HTMLFormElement | null;
    if (reviewForm) reviewForm.reset();
  };
}