// Product data
const products = [
  { 
    name: 'Police and dogs', 
    age: '8+', 
    comments: 223, 
    rating: 4.3, 
    price: '200,000', 
    image: '../../public/images/Group 61 (1).png',
    bgClass: 'product-1' 
  },
  { 
    name: 'Love house', 
    age: '12+', 
    comments: 832, 
    rating: 4.8, 
    price: '541,000', 
    image: '../../public/images/Group 61 (2).png',
    bgClass: 'product-2' 
  },
  { 
    name: '4 colors building', 
    age: '10+', 
    comments: 746, 
    rating: 4.6, 
    price: '929,000', 
    image: '../../public/images/Group 61 (3).png',
    bgClass: 'product-3' 
  },
  { 
    name: 'Construction vehicle', 
    age: '8+', 
    comments: 219, 
    rating: 4.7, 
    price: '190,000', 
    image: '../../public/images/Group 61 (4).png',
    bgClass: 'product-4' 
  },
  { 
    name: 'Space lab', 
    age: '8+', 
    comments: 431, 
    rating: 5.0, 
    price: '321,000', 
    image: '../../public/images/Group 61 (5).png',
    bgClass: 'product-5' 
  },
  { 
    name: 'Fighter jet', 
    age: '6+', 
    comments: 156, 
    rating: 4.2, 
    price: '450,000', 
    image: '../../public/images/Group 61 (6).png',
    bgClass: 'product-1' 
  }
];

function createProductCard(product) {
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

function initProducts() {
  const grid = document.getElementById('productGrid');
  if (grid) grid.innerHTML = products.map(createProductCard).join('');
}

function scrollProducts(direction) {
  const container = document.getElementById('productScroll');
  const scrollAmount = 260;
  if (container) container.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
}

function toggleHeart(heart) {
  const icon = heart.querySelector('i');
  const isLiked = icon.classList.contains('fas');
  icon.className = isLiked ? 'far fa-heart' : 'fas fa-heart';
  heart.style.background = isLiked ? 'white' : '#ff4757';
  heart.style.borderColor = isLiked ? '#ddd' : '#ff4757';
  icon.style.color = isLiked ? '#999' : 'white';
}

function addToCart(productName, btn) {
  alert(`Added "${productName}" to cart!`);
  btn.textContent = 'Added!';
  btn.style.background = '#28a745';
  setTimeout(() => {
    btn.textContent = 'Add to cart';
    btn.style.background = '#007bff';
  }, 1500);
}

document.addEventListener('DOMContentLoaded', function() {
  initProducts();

  // Hiện popup search khi click icon search
  document.getElementById('openSearch').addEventListener('click', function() {
    document.getElementById('overlay').style.display = 'flex';
  });
  // Ẩn popup search khi click icon đóng
  document.getElementById('closeSearch').addEventListener('click', function() {
    document.getElementById('overlay').style.display = 'none';
  });

  // Đổi ảnh chính khi click thumbnail
  window.changeMainImage = function(src) {
    document.getElementById('pd-image').src = src;
  };

  // Lấy dữ liệu sản phẩm đã chọn từ localStorage
  let data = null;
  try {
    const raw = localStorage.getItem('selectedProduct');
    if (raw) data = JSON.parse(raw);
  } catch (_) {}
  if (!data) {
    // fallback giữ nguyên nội dung tĩnh
    data = {
      title: "Police Car",
      brand: "LEGO CITY",
      material: "ABS Plastic",
      rating: 5,
      price: "190.000 VND",
      description: "Join the world of LEGO City with the high-speed police car and brave police minifigure. Perfect for thrilling chases and creative adventures.",
      age: "8+",
      pieces: 79,
      images: [
        "../../public/images/Rectangle 108 (4).png",
        "../../public/images/Rectangle 108 (1).png",
        "../../public/images/Rectangle 108 (2).png",
        "../../public/images/Rectangle 108 (3).png"
      ],
      reviews: [
        { user: "JessicaNguyen", rating: 5, date: "31-05-2025 13:52", comment: "Fast delivery, overall good quality material, carefully packaged." }
      ]
    };
  }
  // Render thông tin sản phẩm
  document.getElementById('pd-title').textContent = "Product Name: " + (data.title || "");
  document.getElementById('pd-brand').innerHTML = `Brand: ${data.brand || ""} <br> Material: ${data.material || ""}`;
  document.getElementById('pd-price').textContent = data.price || "";
  document.getElementById('pd-theme').textContent = "Theme: " + (data.brand || "");
  document.getElementById('pd-age').textContent = "Age: " + (data.age || "");
  document.getElementById('pd-short-desc').textContent = data.description || "";
  // Rating stars
  let ratingHtml = "";
  for (let i = 1; i <= 5; i++) {
    ratingHtml += `<i class="fas fa-star${i <= Math.round(data.rating || 0) ? "" : "-o"}"></i>`;
  }
  document.getElementById('pd-rating').innerHTML = ratingHtml;
  // Stats
  document.getElementById('pd-stats').innerHTML = `
    <span class="stats-item"><i class="fas fa-user"></i> Age: ${data.age || ""}</span>
    <span class="stats-item"><i class="fas fa-users"></i> ${data.pieces || ""}</span>
    <span class="stats-item"><i class="fas fa-star"></i> ${data.rating || ""}</span>
  `;
  // Ảnh chính và thumbnail
  if (data.images && data.images.length > 0) {
    document.getElementById('pd-image').src = data.images[0];
    const thumbContainer = document.querySelector('.thumbnail-container');
    thumbContainer.innerHTML = data.images.slice(1, 4).map(img =>
      `<div class="thumbnail" onclick="changeMainImage('${img}')"><img src="${img}" alt="Thumbnail"></div>`
    ).join('');
    // Ảnh chi tiết
    const detailImg = document.getElementById('pd-detail-image');
    if (detailImg) detailImg.src = data.images[0];
  }
  // Product details mô tả dài
  if (data.fullDescription) {
    document.getElementById('pd-full-description').textContent = data.fullDescription;
  }
  // Render review
  if (data.reviews && data.reviews.length > 0) {
    document.getElementById('pd-reviews').innerHTML = data.reviews.map(r => `
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
  // Add review form
  window.addReview = function(event) {
    event.preventDefault();
    const user = document.getElementById("review-user").value.trim();
    const rating = parseInt(document.getElementById("review-rating").value);
    const comment = document.getElementById("review-comment").value.trim();
    const imagesInput = document.getElementById("review-images");
    if (!user || !comment) {
      alert("Please enter your name and comment!");
      return;
    }
    const date = new Date();
    const formattedDate = date.toLocaleDateString("vi-VN") + " " + date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
    // Lấy danh sách ảnh (giới hạn 3)
    let imagesHtml = "";
    if (imagesInput.files && imagesInput.files.length > 0) {
      const files = Array.from(imagesInput.files).slice(0, 3);
      imagesHtml = `<div class="review-images">` +
        files.map(file => {
          const url = URL.createObjectURL(file);
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
    document.getElementById("pd-reviews").insertAdjacentHTML("afterbegin", newReview);
    // Reset form
    document.querySelector(".add-review-form").reset();
  };
});
