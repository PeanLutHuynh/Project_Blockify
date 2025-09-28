// Typing effect for welcome message (2 lines)
const welcomeLines = ['WELCOME TO', 'OUR SHOP'];
const welcomeDiv = document.getElementById('welcome-typing');
const spans = welcomeDiv.querySelectorAll('span');
let line = 0, idx = 0;
function typeWelcomeLines() {
  if (line < welcomeLines.length) {
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
typeWelcomeLines();

document.getElementById('showPwd').addEventListener('change', function(){
  const pwd = document.getElementById('password');
  pwd.type = this.checked ? 'text' : 'password';
});
document.querySelector('form').addEventListener('submit', function(e){
  e.preventDefault();
  if(!this.checkValidity()){
    e.stopPropagation();
    this.classList.add('was-validated');
    return;
  }
  alert('Signed in!');
});
