(function() {
  // Typing effect for welcome message (2 lines)
  const welcomeLines = ['WELCOME TO', 'OUR SHOP'];
  const welcomeDiv = document.getElementById('welcome-typing');
  const spans = welcomeDiv ? welcomeDiv.querySelectorAll('span') : [];
  let line = 0, idx = 0;
  function typeWelcomeLines(): void {
    if (line < welcomeLines.length) {
      if (idx <= welcomeLines[line].length) {
        if (spans[line]) spans[line].textContent = welcomeLines[line].slice(0, idx);
        idx++;
        setTimeout(typeWelcomeLines, 90);
      } else {
        line++;
        idx = 0;
        setTimeout(typeWelcomeLines, 400);
      }
    }
  }
  typeWelcomeLines();

  const showPwd = document.getElementById('showPwd') as HTMLInputElement | null;
  if (showPwd) {
    showPwd.addEventListener('change', function(this: HTMLInputElement) {
      const pwd = document.getElementById('password') as HTMLInputElement | null;
      const confirmPwd = document.getElementById('confirmPassword') as HTMLInputElement | null;
      const type = this.checked ? 'text' : 'password';
      if (pwd) pwd.type = type;
      if (confirmPwd) confirmPwd.type = type;
    });
  }
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', function(e: Event) {
      e.preventDefault();
      const pwd = document.getElementById('password') as HTMLInputElement | null;
      const confirmPwd = document.getElementById('confirmPassword') as HTMLInputElement | null;
      if(!form.checkValidity() || (pwd && confirmPwd && pwd.value !== confirmPwd.value)){
        e.stopPropagation();
        (form as HTMLFormElement).classList.add('was-validated');
        if(pwd && confirmPwd && pwd.value !== confirmPwd.value){
          if (confirmPwd && typeof confirmPwd.setCustomValidity === 'function') {
            confirmPwd.setCustomValidity('Passwords do not match.');
          }
        } else if (confirmPwd && typeof confirmPwd.setCustomValidity === 'function') {
          confirmPwd.setCustomValidity('');
        }
        return;
      }
      if (confirmPwd && typeof confirmPwd.setCustomValidity === 'function') confirmPwd.setCustomValidity('');
      alert('Signed up!');
    });
  }
  function signUpWithGoogle(): void {
    alert('Google sign up is not implemented in this demo.');
  }
})();
