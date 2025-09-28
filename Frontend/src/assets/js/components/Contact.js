document.addEventListener('DOMContentLoaded', function() {
  // Form validation and submission
  document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    // Simple validation
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    if (!firstName || !lastName || !email || !message) {
      alert('Please fill in all required fields.');
      return;
    }
    if (!email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    // Simulate form submission
    const button = document.querySelector('.btn-send');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
    button.disabled = true;
    setTimeout(() => {
      alert("Thank you! Your message has been sent successfully. We'll get back to you soon!");
      document.querySelector('form').reset();
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
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  // Observe all fade-in elements
  document.querySelectorAll('.fade-in').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
    observer.observe(el);
  });
});
