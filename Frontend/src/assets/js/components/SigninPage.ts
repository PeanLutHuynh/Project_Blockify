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
      if (pwd) pwd.type = this.checked ? 'text' : 'password';
    });
  }
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', function(e: Event) {
      e.preventDefault();
      if(!(form as HTMLFormElement).checkValidity()){
        e.stopPropagation();
        (form as HTMLFormElement).classList.add('was-validated');
        return;
      }
      alert('Signed in!');
    });
  }
})();
