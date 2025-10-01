import { modernAuthController } from '../../../modules/auth/ModernAuthController.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {

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
document.getElementById('showPwd').addEventListener('change', function(){
  const pwd = document.getElementById('password');
  const confirmPwd = document.getElementById('confirmPassword');
  const type = this.checked ? 'text' : 'password';
  pwd.type = type;
  confirmPwd.type = type;
});

// Form submission handler
document.querySelector('form').addEventListener('submit', async function(e){
  e.preventDefault();

  // Get form data
  const formData = {
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    confirmPassword: document.getElementById('confirmPassword').value,
    fullName: document.getElementById('username').value.trim(), // Note: HTML has username field as display name
    username: document.getElementById('email').value.split('@')[0] || document.getElementById('username').value.toLowerCase().replace(/\s+/g, ''),
    gender: null // Default gender
  };

  // Client-side validation
  const pwd = document.getElementById('password');
  const confirmPwd = document.getElementById('confirmPassword');
  
  if (!this.checkValidity() || pwd.value !== confirmPwd.value) {
    this.classList.add('was-validated');
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
document.getElementById('google-signup-btn').addEventListener('click', signUpWithGoogle);

}); // End of DOMContentLoaded
