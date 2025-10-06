import { modernAuthController } from '../../../modules/auth/ModernAuthController.js';
import { waitForConfig } from '../../../core/config/init.js';
import { ENV } from '../../../core/config/env.js';

// Wait for DOM and config to be ready
document.addEventListener('DOMContentLoaded', async function() {

// Wait for config to load from backend
await waitForConfig();

console.log('✅ Config loaded, SUPABASE_URL:', ENV.SUPABASE_URL);

// Typing effect for welcome message (2 lines)
const welcomeLines = ['WELCOME TO', 'OUR SHOP'];
const welcomeDiv = document.getElementById('welcome-typing');
const spans = welcomeDiv ? welcomeDiv.querySelectorAll('span') : [];

let line = 0, idx = 0;
function typeWelcomeLines() {
  if (welcomeDiv && line < welcomeLines.length && spans.length > line) {
    if (idx <= welcomeLines[line].length) {
      spans[line].textContent = welcomeLines[line].slice(0, idx);
      idx++;
      setTimeout(typeWelcomeLines, 90);
    } else {
      line++;
      idx = 0;
      setTimeout(typeWelcomeLines, 400);
    }
  }
}

// Start typing animation after page loads
if (welcomeDiv && spans.length >= 2) {
  typeWelcomeLines();
}

// Password visibility toggle
document.getElementById('showPwd')!.addEventListener('change', function(this: HTMLInputElement){
  const pwd = document.getElementById('password') as HTMLInputElement;
  const confirmPwd = document.getElementById('confirmPassword') as HTMLInputElement;
  const type = this.checked ? 'text' : 'password';
  pwd.type = type;
  confirmPwd.type = type;
});

// Form submission handler
document.querySelector('form')!.addEventListener('submit', async function(e: Event){
  e.preventDefault();

  const form = this as HTMLFormElement;

  // Get form data
  const formData = {
    email: (document.getElementById('email') as HTMLInputElement).value.trim(),
    password: (document.getElementById('password') as HTMLInputElement).value,
    confirmPassword: (document.getElementById('confirmPassword') as HTMLInputElement).value,
    fullName: (document.getElementById('username') as HTMLInputElement).value.trim(), // Note: HTML has username field as display name
    username: (document.getElementById('username') as HTMLInputElement).value.trim() || (document.getElementById('username') as HTMLInputElement).value.toLowerCase().replace(/\s+/g, ''),
    gender: undefined as string | undefined // Default gender
  };

  // Client-side validation
  const pwd = document.getElementById('password') as HTMLInputElement;
  const confirmPwd = document.getElementById('confirmPassword') as HTMLInputElement;
  
  if (!form.checkValidity() || pwd.value !== confirmPwd.value) {
    form.classList.add('was-validated');
    if (pwd.value !== confirmPwd.value) {
      confirmPwd.setCustomValidity('Passwords do not match.');
    } else {
      confirmPwd.setCustomValidity('');
    }
    return;
  }
  
  confirmPwd.setCustomValidity('');

  // Show loading state
  modernAuthController.setLoadingState(true);
  
  try {
    // Call auth controller
    const result = await modernAuthController.handleSignUp(formData);

    if (result.success) {
      modernAuthController.displaySuccess(result.message);
      // Redirect will be handled by the controller
    } else {
      modernAuthController.displayErrors(result.errors || [result.message]);
    }
  } catch (error) {
    console.error('Sign up error:', error);
    modernAuthController.displayErrors(['An unexpected error occurred. Please try again.']);
  } finally {
    modernAuthController.setLoadingState(false);
  }
});

// Google Sign Up handler
async function signUpWithGoogle() {
  try {
    modernAuthController.setLoadingState(true, 'google-signup-btn');
    
    const result = await modernAuthController.handleGoogleAuth();
    
    if (result.success) {
      modernAuthController.displaySuccess(result.message);
    } else {
      modernAuthController.displayErrors([result.message]);
    }
  } catch (error) {
    console.error('Google sign up error:', error);
    modernAuthController.displayErrors(['Failed to initialize Google sign up. Please try again.']);
  } finally {
    modernAuthController.setLoadingState(false, 'google-signup-btn');
  }
}

// Add event listener for Google sign up button
document.getElementById('google-signup-btn')!.addEventListener('click', signUpWithGoogle);

}); // End of DOMContentLoaded

