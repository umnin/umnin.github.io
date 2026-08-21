/**
 * 关于页面 - 团队成员渲染
 */

(function () {
  'use strict';

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function renderTeam() {
    const container = document.getElementById('aboutTeam');
    if (!container || typeof ARTICLES_DATA === 'undefined') return;

    const authors = ARTICLES_DATA.authors;
    container.innerHTML = authors.map(author => `
      <div class="about-author-card">
        <div class="author-card__cover"></div>
        <a href="search.html?author=${encodeURIComponent(author.name)}" class="author-card__avatar-link">
          <img class="author-card__avatar" src="${escapeHtml(author.avatar)}" alt="${escapeHtml(author.name)}头像">
        </a>
        <a href="search.html?author=${encodeURIComponent(author.name)}" class="author-card__name-link">
          <h3 class="author-card__name">${escapeHtml(author.name)}</h3>
        </a>
        <p class="author-card__role">${escapeHtml(author.title)}</p>
      </div>
    `).join('');

    if (window.lucide) {
      try {
        const origWarn = console.warn;
        console.warn = function () { };
        lucide.createIcons();
        console.warn = origWarn;
      } catch (e) { }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderTeam);
  } else {
    renderTeam();
  }
})();
