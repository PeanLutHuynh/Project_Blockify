import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';
import { initializeSearch } from '../../../shared/components/SearchInit.js';
import { productService } from '../../../core/services/ProductService.js';
import { cartService } from '../../../core/services/CartService.js';
import { updateCartBadge } from '../../../core/config/init.js';

// ❌ Removed mock data - now using Supabase for all product data

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

async function addToCart(productName: string, btn: HTMLElement): Promise<void> {
  try {
    console.log('🛒 [ProductDetail] Adding to cart:', productName);
    
    // Get current product data from URL
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    
    if (!slug) {
      alert('❌ Không tìm thấy thông tin sản phẩm!');
      return;
    }
    
    // Load product details
    const result = await productService.getProductBySlug(slug);
    if (!result.success || !result.product) {
      alert('❌ Không thể tải thông tin sản phẩm!');
      return;
    }
    
    const product = result.product;
    console.log('📦 [ProductDetail] Product data:', product);
    
    // Add to cart using CartService
    const cartResult = await cartService.addToCart({
      productId: parseInt(product.product_id),
      productName: product.product_name,
      productSlug: product.slug,
      imageUrl: product.product_images?.[0]?.image_url || product.imageUrl || '',
      price: parseFloat(product.price),
      salePrice: product.sale_price ? parseFloat(product.sale_price) : null,
      quantity: 1,
      stockQuantity: parseInt(product.stock_quantity) || 0,
      minStockLevel: parseInt(product.min_stock_level) || 0
    });
    
    if (cartResult.success) {
      console.log('✅ [ProductDetail] Added to cart successfully');
      
      // Visual feedback
      btn.textContent = '✓ Đã thêm';
      btn.style.background = '#28a745';
      
      // Update cart badge
      updateCartBadge();
      
      // Reset button after 2 seconds
      setTimeout(() => {
        btn.textContent = 'Thêm vào giỏ';
        btn.style.background = '#007bff';
      }, 2000);
    } else {
      console.error('❌ [ProductDetail] Failed to add to cart:', cartResult.message);
      alert(cartResult.message || 'Không thể thêm vào giỏ hàng!');
    }
  } catch (error) {
    console.error('❌ [ProductDetail] Error adding to cart:', error);
    alert('Đã xảy ra lỗi khi thêm vào giỏ hàng!');
  }
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
 * ✅ Load recommended products based on current product (same category)
 * Uses the new recommendation system
 */
async function loadRecommendedProducts(currentProductId?: number): Promise<void> {
  try {
    console.log('🔍 Loading recommended products...');
    
    let result;
    
    if (currentProductId) {
      // ✅ Use recommendation system - get similar products from same category
      console.log(`🎯 Loading similar products for product ID: ${currentProductId}`);
      result = await productService.getRecommendedProductsByProduct(currentProductId, 6);
    } else {
      // Fallback to featured products if no product ID
      console.log('⚠️ No product ID, loading featured products');
      result = await productService.getFeaturedProducts(6);
    }
    
    if (!result.success || !result.products || result.products.length === 0) {
      console.error('❌ Failed to load recommended products');
      showEmptyState();
      return;
    }

    console.log(`✅ Loaded ${result.products.length} recommended products`);
    
    // Render to grid
    const grid = document.getElementById('productGrid');
    if (!grid) {
      console.warn('⚠️ productGrid not found');
      return;
    }

    // ✅ Render products with proper Supabase image URLs
    grid.innerHTML = result.products.map(product => {
      const price = typeof product.price === 'number' ? product.price : parseFloat(product.price || '0');
      const formattedPrice = price.toLocaleString('vi-VN');
      const rating = product.rating || 4.5;
      const pieceCount = product.pieceCount || 120;
      
      return `
        <div class="product-card" data-slug="${product.slug}" style="cursor: pointer;">
          <div class="heart-icon" onclick="event.stopPropagation(); toggleHeart(this)">
            <i class="far fa-heart"></i>
          </div>
          <div class="product-image">
            <img src="${product.imageUrl}" 
                 alt="${product.name}"
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;color:#999;\'><i class=\'fas fa-image\' style=\'font-size:40px;\'></i></div>'">
          </div>
          <div class="product-stats">
            <div class="stat-item">
              <i class="fas fa-user-friends"></i>
              <span>8+</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-cube"></i>
              <span>${pieceCount}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-star text-warning"></i>
              <span>${rating.toFixed(1)}</span>
            </div>
          </div>
          <div class="product-name">${product.name}</div>
          <div class="product-price">${formattedPrice} VND</div>
          <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${product.name}', this)">Thêm vào giỏ</button>
        </div>
      `;
    }).join('');

    // Add click handlers
    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.getAttribute('data-slug');
        if (slug) {
          console.log(`🔗 Navigating to product: ${slug}`);
          window.location.href = `/src/pages/ProductDetail.html?slug=${slug}`;
        }
      });
    });

  } catch (error) {
    console.error('❌ Error loading recommended products:', error);
    showEmptyState();
  }
}

/**
 * Show empty state when no products available
 */
function showEmptyState(): void {
  const grid = document.getElementById('productGrid');
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #999;">
        <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>Không có sản phẩm gợi ý</p>
      </div>
    `;
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
  console.log('🎬 Initializing ProductDetail page...');

  // Đổi ảnh chính khi click thumbnail
  (window as any).changeMainImage = function(src: string): void {
    const img = document.getElementById('pd-image') as HTMLImageElement | null;
    if (img) {
      img.src = src;
      img.onerror = () => {
        img.src = '/public/images/2.jpg';
      };
    }
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
        
        // ✅ Load recommended products based on current product
        const productId = product.product_id;
        if (productId) {
          console.log(`🎯 Loading recommendations for product ID: ${productId}`);
          loadRecommendedProducts(productId);
        } else {
          console.warn('⚠️ No product ID, loading featured products');
          loadRecommendedProducts();
        }
      } else {
        console.error('❌ Product not found');
        alert('Không tìm thấy sản phẩm này!');
        // Load featured products as fallback
        loadRecommendedProducts();
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
  // ✅ Add event listener for "Add to Cart" button
  const addToCartBtn = document.querySelector('.btn-add-cart') as HTMLButtonElement | null;
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const productNameEl = document.getElementById('pd-title');
      const productName = productNameEl?.textContent?.replace('Product Name: ', '') || 'Product';
      await addToCart(productName, addToCartBtn);
    });
  } else {
    console.warn('⚠️ Add to Cart button not found in ProductDetail page');
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