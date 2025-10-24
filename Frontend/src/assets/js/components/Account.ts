import { AccountController } from "../../../modules/user/AccountController.js";
import { initializeOnReady } from '../../../core/config/init.js';

// Initialize AccountController when page loads
initializeOnReady(() => {
  new AccountController();
  
  // Make functions globally available for HTML onclick handlers  
  (window as any).showTab = showTab;
});

// Handle main tab switching (Personal Info, Order, Wishlist...)
function showTab(tabId: string, element: HTMLElement): void {
  document.querySelectorAll('.tab-pane').forEach(div => {
    div.classList.remove('active');
  });
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  element.classList.add('active');
}

// Handle small tabs in Order section
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.orders-tabs .nav-link').forEach(tab => {
    tab.addEventListener('click', function (this: HTMLElement, e: Event) {
      e.preventDefault();
      document.querySelectorAll('.orders-tabs .nav-link').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.shop-block').forEach(order => {
        if (order instanceof HTMLElement) order.style.display = "none";
      });
      let status = this.getAttribute('data-status');
      if (status === "All") {
        document.querySelectorAll('.shop-block').forEach(order => {
          if (order instanceof HTMLElement) order.style.display = "block";
        });
      } else {
        document.querySelectorAll('.shop-block').forEach(order => {
          const orderStatus = order.querySelector('.shop-header div:last-child')?.textContent?.trim() || '';
          if (orderStatus.includes(status || '')) {
            if (order instanceof HTMLElement) order.style.display = "block";
          }
        });
      }
    });
  });
});

// Wishlist product data
type WishlistProduct = {
  title: string;
  brand: string;
  material: string;
  rating: number;
  price: string;
  age: string;
  pieces: number;
  theme: string;
  description: string;
  fullDescription: string;
  images: string[];
  reviews: { user: string; rating: number; date: string; comment: string }[];
};

const wishlistProducts: Record<string, WishlistProduct> = {
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
      '/public/images/2.jpg',
      '/public/images/lego-city.jpg',
      '/public/images/2.jpg',
      '/public/images/lego-city.jpg'
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

(window as any).viewProductDetails = function viewProductDetails(productName: string): void {
  const productData = wishlistProducts[productName];
  if (productData) {
    localStorage.setItem('selectedProduct', JSON.stringify(productData));
    window.location.href = 'ProductDetail.html';
  } else {
    alert('Product details not found!');
  }
}


  