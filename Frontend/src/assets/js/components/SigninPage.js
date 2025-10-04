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
  pwd.type = this.checked ? 'text' : 'password';
});

// Form submission handler
document.querySelector('form').addEventListener('submit', async function(e){
  e.preventDefault();

  // Basic form validation
  if (!this.checkValidity()) {
    e.stopPropagation();
    this.classList.add('was-validated');
    return;
  }

  // Get form data
  const formData = {
    identifier: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    rememberMe: false // Add checkbox if needed
  };

  // Show loading state
  modernAuthController.setLoadingState(true);

  try {
    // Call auth controller
    const result = await modernAuthController.handleSignIn(formData);

    if (result.success) {
      modernAuthController.displaySuccess(result.message);
      // Redirect will be handled by the controller
    } else {
      modernAuthController.displayErrors(result.errors || [result.message]);
    }
  } catch (error) {
    console.error('Sign in error:', error);
    modernAuthController.displayErrors(['An unexpected error occurred. Please try again.']);
  } finally {
    modernAuthController.setLoadingState(false);
  }
});

// Google Sign In handler
async function signInWithGoogle() {
  try {
    modernAuthController.setLoadingState(true, 'google-signin-btn');
    
    const result = await modernAuthController.handleGoogleAuth();
    
    if (result.success) {
      modernAuthController.displaySuccess(result.message);
    } else {
      modernAuthController.displayErrors([result.message]);
    }
  } catch (error) {
    console.error('Google sign in error:', error);
    modernAuthController.displayErrors(['Failed to initialize Google sign in. Please try again.']);
  } finally {
    modernAuthController.setLoadingState(false, 'google-signin-btn');
  }
}

// Add event listener for Google sign in button
document.getElementById('google-signin-btn').addEventListener('click', signInWithGoogle);

}); // End of DOMContentLoaded
