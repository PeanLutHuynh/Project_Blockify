// Handle main tab switching (Personal Info, Order, Wishlist...)
function showTab(tabId, element) {
  document.querySelectorAll('.tab-pane').forEach(div => {
    div.classList.remove('active');
  });
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
  element.classList.add('active');
}

// Handle small tabs in Order section
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.orders-tabs .nav-link').forEach(tab => {
    tab.addEventListener('click', function (e) {
      e.preventDefault();
      // Remove old active
      document.querySelectorAll('.orders-tabs .nav-link').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      // Hide all orders
      document.querySelectorAll('.shop-block').forEach(order => order.style.display = "none");
      let status = this.getAttribute('data-status'); // get tab name (All, Processing, Delivered,...)
      if (status === "All") {
        // Show all
        document.querySelectorAll('.shop-block').forEach(order => order.style.display = "block");
      } else {
        // Show orders by status
        document.querySelectorAll('.shop-block').forEach(order => {
          let orderStatus = order.querySelector('.shop-header div:last-child').textContent.trim();
          if (orderStatus.includes(status)) {
            order.style.display = "block";
          }
        });
      }
    });
  });
});

// Address form functions
function toggleAddressForm() {
  const form = document.getElementById('addAddressForm');
  form.classList.toggle('show');
}

function cancelAddAddress() {
  const form = document.getElementById('addAddressForm');
  form.classList.remove('show');
  // Clear form
  form.querySelectorAll('input, select').forEach(input => {
    if (input.type === 'checkbox') {
      input.checked = false;
    } else {
      input.value = '';
    }
  });
}

function saveAddress() {
  const fullName = document.getElementById('newFullName').value;
  const address = document.getElementById('newAddress').value;
  const city = document.getElementById('newCity').value;
  const state = document.getElementById('newState').value;
  const zip = document.getElementById('newZip').value;
  const country = document.getElementById('newCountry').value;
  const phone = document.getElementById('newPhone').value;
  const isDefault = document.getElementById('setAsDefault').checked;
  // Basic validation
  if (!fullName || !address || !city || !phone) {
    alert('Please fill in all required fields');
    return;
  }
  // Create new address card
  const newAddressCard = document.createElement('div');
  newAddressCard.className = 'address-card';
  newAddressCard.innerHTML = `
    <div class="d-flex justify-content-between mb-2">
      <div><strong>${fullName}</strong> ${isDefault ? '<span class="badge badge-default">Default</span>' : ''}</div>
      <div class="text-muted small">Edit • Delete</div>
    </div>
    <div>${address}, ${city}${state ? ', ' + state : ''} ${zip}</div>
    <div>${country}</div>
    <div>${phone}</div>
  `;
  // Insert before the form
  const form = document.getElementById('addAddressForm');
  form.parentNode.insertBefore(newAddressCard, form);
  // Hide form and clear inputs
  cancelAddAddress();
  alert('Address added successfully!');
}

// Product data for wishlist
const wishlistProducts = {
  'Police Car': {
    title: 'Police Car',
    brand: 'LEGO CITY',
    material: 'ABS Plastic',
    rating: 4.8,
    price: '190,000 VND',
    age: '5+',
    pieces: 79,
    theme: 'LEGO City',
    description: 'Join the world of LEGO City with the high-speed police car and brave police minifigure. Perfect for thrilling chases and creative adventures.',
    fullDescription: 'Join the thrilling chases with the LEGO City Police set! This set includes: A powerful police supercar in the signature blue and white colors, featuring a sporty spoiler and flashing siren lights on the roof. A police minifigure dressed in official uniform and helmet, ready for action. This is a great choice for kids to play while developing their imagination, role-playing as police officers protecting the city, chasing criminals, and keeping the peace.',
    images: [
      'https://www.lego.com/cdn/cs/set/assets/blt6af83992a8ac4c42/60239_alt1.png',
      'https://www.lego.com/cdn/cs/set/assets/blt6af83992a8ac4c42/60239_alt2.png',
      'https://www.lego.com/cdn/cs/set/assets/blt6af83992a8ac4c42/60239_alt3.png',
      'https://www.lego.com/cdn/cs/set/assets/blt6af83992a8ac4c42/60239_alt4.png'
    ],
    reviews: [
      { user: 'JessicaNguyen', rating: 5, date: '31-05-2025 13:52', comment: 'Fast delivery, overall good quality material, carefully packaged. Thank you, shop!' },
      { user: 'BatmanRobin', rating: 4, date: '12-02-2025 01:30', comment: 'Good quality, but I give 4 stars.' }
    ]
  },
  'City House': {
    title: 'Love House',
    brand: 'LEGO Creator',
    material: 'ABS Plastic',
    rating: 4.7,
    price: '541,000 VND',
    age: '10+',
    pieces: 120,
    theme: 'LEGO Creator',
    description: 'Build your dream house with this colorful LEGO Creator set featuring multiple rooms and detailed interior.',
    fullDescription: 'Create the perfect family home with this detailed LEGO Creator house set. Features include multiple rooms, a kitchen, living room, bedrooms, and a beautiful garden. Perfect for imaginative play and display.',
    images: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400&h=300&fit=crop'
    ],
    reviews: [
      { user: 'HomeBuilder', rating: 5, date: '20-05-2025 10:30', comment: 'Amazing detail and great build quality!' }
    ]
  },
  'Tower': {
    title: 'City Tower',
    brand: 'LEGO Architecture',
    material: 'ABS Plastic',  
    rating: 4.6,
    price: '929,000 VND',
    age: '12+',
    pieces: 200,
    theme: 'LEGO Architecture',
    description: 'Build an impressive skyscraper tower with this detailed LEGO Architecture set.',
    fullDescription: 'Construct a magnificent city tower with intricate architectural details. This set includes multiple floors, windows, and realistic building techniques used in modern skyscrapers.',
    images: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop'
    ],
    reviews: [
      { user: 'ArchitectFan', rating: 5, date: '15-05-2025 14:20', comment: 'Incredible attention to architectural detail!' }
    ]
  },
  'Plane': {
    title: 'Fighter Jet',
    brand: 'LEGO Technic',
    material: 'ABS Plastic',
    rating: 4.5,
    price: '450,000 VND', 
    age: '6+',
    pieces: 150,
    theme: 'LEGO Technic',
    description: 'Soar through the skies with this detailed fighter jet featuring realistic details and moving parts.',
    fullDescription: 'Experience aerial adventures with this detailed fighter jet model. Features include retractable landing gear, opening cockpit, and realistic jet engine details. Perfect for aviation enthusiasts.',
    images: [
      'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1583392031409-80a63e5b6d8e?w=400&h=300&fit=crop'
    ],
    reviews: [
      { user: 'AviationLover', rating: 4, date: '10-05-2025 16:45', comment: 'Great jet model with nice details!' }
    ]
  }
};

// View product details function
function viewProductDetails(productName) {
  const productData = wishlistProducts[productName];
  if (productData) {
    // Store product data in localStorage
    localStorage.setItem('selectedProduct', JSON.stringify(productData));
    // Navigate to ProductDetail.html
    window.location.href = 'ProductDetail.html';
  } else {
    alert('Product details not found!');
  }
}
