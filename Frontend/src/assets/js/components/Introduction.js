const overlay = document.getElementById('overlay');
  const openBtn = document.getElementById('openSearch');
  const closeBtn = document.getElementById('closeSearch');
  const searchInput = document.getElementById('searchInput');
  const suggestions = document.querySelectorAll('.suggestion-box');

  openBtn.addEventListener('click', () => {
    overlay.style.display = 'flex';
    searchInput.focus();
  });
  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  // Khi click suggestion -> đưa text vào ô input
  suggestions.forEach(item => {
    item.addEventListener('click', () => {
      const text = item.querySelector('.suggestion-text').innerText;
      searchInput.value = text;
    });
  });
  // Click ra ngoài popup để đóng
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  });