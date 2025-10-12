import { initializeOnReady } from '../../../core/config/init.js';
import { initializeNavbarAuth } from '../../../shared/components/NavbarAuth.js';

// Initialize app and run page logic
initializeOnReady(() => {
  // Initialize navbar authentication UI
  initializeNavbarAuth();
  
  // Original contact page logic
  initializeContactPage();
});

function initializeContactPage() {
  // Form validation and submission
  const form = document.querySelector('form');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    // Simple validation
    const firstNameInput = document.getElementById('firstName') as HTMLInputElement | null;
    const lastNameInput = document.getElementById('lastName') as HTMLInputElement | null;
    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    const messageInput = document.getElementById('message') as HTMLInputElement | null;
    const firstName = firstNameInput ? firstNameInput.value : '';
    const lastName = lastNameInput ? lastNameInput.value : '';
    const email = emailInput ? emailInput.value : '';
    const message = messageInput ? messageInput.value : '';
    if (!firstName || !lastName || !email || !message) {
      alert('Please fill in all required fields.');
      return;
    }
    if (!email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    // Simulate form submission
    const button = document.querySelector('.btn-send') as HTMLButtonElement | null;
    if (!button) return;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
    button.disabled = true;
    setTimeout(() => {
      alert("Thank you! Your message has been sent successfully. We'll get back to you soon!");
      if (form) form.reset();
      button.innerHTML = originalText;
      button.disabled = false;
    }, 2000);
  });

  // Animate elements on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).style.opacity = '1';
        (entry.target as HTMLElement).style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  // Observe all fade-in elements
  document.querySelectorAll('.fade-in').forEach(el => {
    (el as HTMLElement).style.opacity = '0';
    (el as HTMLElement).style.transform = 'translateY(30px)';
    (el as HTMLElement).style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
    observer.observe(el);
  });
}