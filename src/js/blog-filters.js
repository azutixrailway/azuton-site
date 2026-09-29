/**
 * Blog filters — toggle posts by category
 */

document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const posts = document.querySelectorAll('.post-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Update active button
      filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');

      // Filter posts
      posts.forEach(post => {
        if (filter === '*' || post.dataset.category === filter) {
          post.style.display = '';
        } else {
          post.style.display = 'none';
        }
      });
    });
  });
});
