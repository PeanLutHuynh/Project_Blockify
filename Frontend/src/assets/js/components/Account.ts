import { authService } from "../../../core/services/AuthService.js";
import { httpClient } from "../../../core/api/FetchHttpClient.js";
import { User } from "../../../core/models/User.js";
import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';

/**
 * Account Controller
 * Handles user account page functionality
 */

class AccountController {
  private currentUser: User | null = null;

  async initialize(): Promise<void> {
    // Initialize navbar auth first
    initializeNavbarAuth();

    // Check authentication - improved to handle Supabase session
    const isAuth = await this.checkAuthentication();
    if (!isAuth) {
      return;
    }

    // Load user data
    await this.loadUserProfile();
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Setup date dropdowns
    this.setupDateDropdowns();
  }

  /**
   * Check authentication with Supabase session support
   */
  private async checkAuthentication(): Promise<boolean> {
    // Check if Supabase session exists
    const isSupabaseAuth = await authService.isSupabaseAuthenticated();
    
    if (!isSupabaseAuth) {
      console.warn('⚠️ No Supabase session found, redirecting to sign in');
      window.location.href = 'SigninPage.html';
      return false;
    }

    // Check local auth state
    const isLocalAuth = authService.isAuthenticated();
    
    if (!isLocalAuth) {
      console.warn('⚠️ No local auth state, fetching from backend...');
      
      // Try to get current user from backend using Supabase token
      const result = await authService.getCurrentUser();
      
      if (!result.success || !result.user) {
        console.error('❌ Failed to get user profile from backend');
        window.location.href = 'SigninPage.html';
        return false;
      }
      
      this.currentUser = result.user;
      return true;
    }

    this.currentUser = authService.getUser();
    return !!this.currentUser;
  }

  /**
   * Load user profile from backend
   */
  private async loadUserProfile(): Promise<void> {
    try {
      const result = await authService.getCurrentUser();
      
      if (result.success && result.user) {
        this.currentUser = result.user;
        this.populateUserData(result.user);
      } else {
        console.error('Failed to load user profile');
        alert('Failed to load user profile. Please try again.');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      alert('Error loading user profile. Please try again.');
    }
  }

  /**
   * Populate form fields with user data
   */
  private populateUserData(user: User): void {
    console.log('📋 Populating user data:', user);

    // Update sidebar avatar and username
    const sidebarAvatar = document.querySelector('.user-info .avatar') as HTMLImageElement;
    const sidebarUsername = document.querySelector('.user-info .username') as HTMLElement;
    
    const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.getDisplayName())}&background=random`;
    
    if (sidebarAvatar) {
      sidebarAvatar.src = avatarUrl;
    }
    if (sidebarUsername) {
      sidebarUsername.textContent = user.username || user.email;
    }

    // Update form fields
    const nameInput = document.querySelector('input[placeholder="Enter your name"]') as HTMLInputElement;
    const emailInput = document.querySelector('input[placeholder="Enter your email"]') as HTMLInputElement;
    const phoneInput = document.querySelector('input[placeholder="Enter your phone number"]') as HTMLInputElement;
    
    if (nameInput) nameInput.value = user.fullName || '';
    if (emailInput) {
      emailInput.value = user.email || '';
      emailInput.disabled = true; // Email cannot be changed
    }
    if (phoneInput) phoneInput.value = user.phone || '';

    // Update gender radio buttons
    if (user.gender) {
      const genderInput = document.querySelector(`input[name="sex"][value="${user.gender}"]`) as HTMLInputElement;
      if (genderInput) genderInput.checked = true;
    }

    // Update date of birth dropdowns
    if (user.birthDate) {
      const birthDate = new Date(user.birthDate);
      this.setDateDropdown('day', birthDate.getDate());
      this.setDateDropdown('month', birthDate.getMonth() + 1);
      this.setDateDropdown('year', birthDate.getFullYear());
    }

    // Update large avatar
    const largeAvatar = document.querySelector('.large-avatar') as HTMLImageElement;
    if (largeAvatar) {
      largeAvatar.src = avatarUrl;
    }

    console.log('✅ User data populated successfully');
  }

  /**
   * Setup event handlers for buttons
   */
  private setupEventHandlers(): void {
    // Find all buttons with .btn-primary-custom class
    const buttons = document.querySelectorAll('.btn-primary-custom');
    buttons.forEach(btn => {
      const buttonText = btn.textContent?.trim();
      if (buttonText === 'Save' || buttonText === 'Update') {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleSaveProfile();
        });
      }
    });

    // Logout is handled by NavbarAuth component

    // Choose Image button
    const chooseImageBtns = document.querySelectorAll('.btn-outline-primary-custom');
    chooseImageBtns.forEach(btn => {
      if (btn.textContent?.includes('Choose Image')) {
        btn.addEventListener('click', () => this.handleChooseImage());
      }
    });
  }

  /**
   * Handle save profile
   */
  private async handleSaveProfile(): Promise<void> {
    if (!this.currentUser) return;

    try {
      // Gather form data
      const nameInput = document.querySelector('input[placeholder="Enter your name"]') as HTMLInputElement;
      const phoneInput = document.querySelector('input[placeholder="Enter your phone number"]') as HTMLInputElement;
      const genderInput = document.querySelector('input[name="sex"]:checked') as HTMLInputElement;
      
      const day = this.getDateDropdownValue('day');
      const month = this.getDateDropdownValue('month');
      const year = this.getDateDropdownValue('year');
      
      let birthDate: Date | undefined;
      if (day && month && year) {
        birthDate = new Date(year, month - 1, day);
      }

      // Prepare update data
      const updateData: any = {
        fullName: nameInput?.value || this.currentUser.fullName,
        phone: phoneInput?.value || undefined,
        gender: genderInput?.value || undefined,
      };
      
      if (birthDate) {
        updateData.birthDate = birthDate.toISOString();
      }

      // Send update request
      const response = await httpClient.patch(
        `/api/users/${this.currentUser.id}/profile`,
        updateData
      );

      if (response.data) {
        alert('Profile updated successfully!');
        
        // Refresh user data
        await this.loadUserProfile();
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  }

  /**
   * Handle choose image
   */
  private handleChooseImage(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const avatarUrl = e.target?.result as string;
          
          // Update avatar displays
          const largeAvatar = document.querySelector('.large-avatar') as HTMLImageElement;
          const sidebarAvatar = document.querySelector('.user-info .avatar') as HTMLImageElement;
          
          if (largeAvatar) largeAvatar.src = avatarUrl;
          if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
          
          alert('Image selected. Click Save to update your profile.');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error handling image:', error);
        alert('Error selecting image. Please try again.');
      }
    });

    fileInput.click();
  }

  /**
   * Setup date dropdowns
   */
  private setupDateDropdowns(): void {
    const dayMenu = document.getElementById('day-menu');
    const monthMenu = document.getElementById('month-menu');
    const yearMenu = document.getElementById('year-menu');
    
    const dayButton = document.getElementById('day-button');
    const monthButton = document.getElementById('month-button');
    const yearButton = document.getElementById('year-button');

    // Populate days (1-31)
    if (dayMenu) {
      for (let i = 1; i <= 31; i++) {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-value="${i}">${i}</a>`;
        li.querySelector('a')?.addEventListener('click', (e) => {
          e.preventDefault();
          if (dayButton) dayButton.textContent = i.toString();
        });
        dayMenu.appendChild(li);
      }
    }

    // Populate months (1-12)
    if (monthMenu) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      for (let i = 1; i <= 12; i++) {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-value="${i}">${monthNames[i-1]}</a>`;
        li.querySelector('a')?.addEventListener('click', (e) => {
          e.preventDefault();
          if (monthButton) monthButton.textContent = monthNames[i-1];
        });
        monthMenu.appendChild(li);
      }
    }

    // Populate years (current year - 100 to current year)
    if (yearMenu) {
      const currentYear = new Date().getFullYear();
      for (let i = currentYear; i >= currentYear - 100; i--) {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="#" data-value="${i}">${i}</a>`;
        li.querySelector('a')?.addEventListener('click', (e) => {
          e.preventDefault();
          if (yearButton) yearButton.textContent = i.toString();
        });
        yearMenu.appendChild(li);
      }
    }
  }

  /**
   * Set date dropdown value
   */
  private setDateDropdown(type: 'day' | 'month' | 'year', value: number): void {
    const button = document.getElementById(`${type}-button`);
    if (!button) return;

    if (type === 'month') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      button.textContent = monthNames[value - 1] || 'Month';
    } else {
      button.textContent = value.toString();
    }
  }

  /**
   * Get date dropdown value
   */
  private getDateDropdownValue(type: 'day' | 'month' | 'year'): number | null {
    const button = document.getElementById(`${type}-button`);
    if (!button || !button.textContent) return null;

    if (type === 'month') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = monthNames.indexOf(button.textContent);
      return monthIndex >= 0 ? monthIndex + 1 : null;
    }

    const value = parseInt(button.textContent);
    return isNaN(value) ? null : value;
  }
}

// Initialize on page load
initializeOnReady(() => {
  const controller = new AccountController();
  controller.initialize();
  
  // Make functions globally available for HTML onclick handlers
  (window as any).showTab = showTab;
  (window as any).toggleAddressForm = toggleAddressForm;
  (window as any).cancelAddAddress = cancelAddAddress;
  (window as any).saveAddress = saveAddress;
});

// Original code for tab navigation and address management

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

// Address form functions
function cancelAddAddress(): void {
  const form = document.getElementById('addAddressForm');
  if (!form) return;
  form.classList.remove('show');
  form.querySelectorAll('input, select').forEach(input => {
    if (input instanceof HTMLInputElement) {
      if (input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
    } else if (input instanceof HTMLSelectElement) {
      input.value = '';
    }
  });
}

function toggleAddressForm(): void {
  const form = document.getElementById('addAddressForm');
  if (form) form.classList.toggle('show');
}

function saveAddress(): void {
  const fullName = (document.getElementById('newFullName') as HTMLInputElement | null)?.value;
  const address = (document.getElementById('newAddress') as HTMLInputElement | null)?.value;
  const city = (document.getElementById('newCity') as HTMLInputElement | null)?.value;
  const state = (document.getElementById('newState') as HTMLInputElement | null)?.value;
  const zip = (document.getElementById('newZip') as HTMLInputElement | null)?.value;
  const country = (document.getElementById('newCountry') as HTMLInputElement | null)?.value;
  const phone = (document.getElementById('newPhone') as HTMLInputElement | null)?.value;
  const isDefault = (document.getElementById('setAsDefault') as HTMLInputElement | null)?.checked;
  if (!fullName || !address || !city || !phone) {
    alert('Please fill in all required fields');
    return;
  }
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
  const form = document.getElementById('addAddressForm');
  if (form && form.parentNode) form.parentNode.insertBefore(newAddressCard, form);
  cancelAddAddress();
  alert('Address added successfully!');
}

// Make functions globally available for HTML onclick handlers
(window as any).showTab = showTab;
(window as any).toggleAddressForm = toggleAddressForm;
(window as any).cancelAddAddress = cancelAddAddress;
(window as any).saveAddress = saveAddress;
// viewProductDetails is defined inline below

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

(window as any).viewProductDetails = function viewProductDetails(productName: string): void {
  const productData = wishlistProducts[productName];
  if (productData) {
    localStorage.setItem('selectedProduct', JSON.stringify(productData));
    window.location.href = 'ProductDetail.html';
  } else {
    alert('Product details not found!');
  }
}


  