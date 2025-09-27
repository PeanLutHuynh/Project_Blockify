document.addEventListener('DOMContentLoaded', function() {
  // Danh sách sản phẩm
  const products = [
    { img: "../../public/images/Group 61.png", name: "Police" },
    { img: "../../public/images/Group 61 (1).png", name: "City" },
    { img: "../../public/images/Group 61 (2).png", name: "Fire" },
    { img: "../../public/images/Group 61 (3).png", name: "Rescue" },
    { img: "../../public/images/Group 61 (4).png", name: "Rescue" },
    { img: "../../public/images/Group 61 (5).png", name: "Rescue" },
    { img: "../../public/images/Group 61 (6).png", name: "Rescue" },
    { img: "../../public/images/Group 61 (7).png", name: "Space" }
  ];
  const list = document.getElementById("product-list");
  if (list) {
    // Render card tự động
    products.forEach(p => {
      list.innerHTML += `
        <div class="d-flex justify-content-center col-md-3 col-sm-6">
          <div class="product-card1">
            <img src="${p.img}" alt="${p.name}" class="product-img">
            <span class="badge-hot">Hot</span>
            <div class="product-footer pt-4">${p.name}</div>
          </div>
        </div>
      `;
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

  // Overlay search popup
  const overlay = document.getElementById('overlay');
  const openBtn = document.getElementById('openSearch');
  const closeBtn = document.getElementById('closeSearch');
  const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
  const suggestions = document.querySelectorAll('.suggestion-box');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (overlay) overlay.style.display = 'flex';
      if (searchInput) searchInput.focus();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (overlay) overlay.style.display = 'none';
    });
  }
  // Khi click suggestion -> đưa text vào ô input
  suggestions.forEach(item => {
    item.addEventListener('click', () => {
      const textEl = item.querySelector('.suggestion-text');
      const text = textEl ? (textEl as HTMLElement).innerText : '';
      if (searchInput) searchInput.value = text;
    });
  });
  // Click ra ngoài popup để đóng
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });
  }

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
});
