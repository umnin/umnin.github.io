/**
 * 关于页面 - 团队成员渲染
 */

(function () {
  'use strict';

  // 路径前缀：子目录页面通过内联脚本注入 window.ASSET_BASE='../'，根目录页面为 ''
  const BASE = window.ASSET_BASE || '';
  const assetUrl = (p) => (!p || /^(https?:)?\/\//.test(p)) ? p : BASE + p;

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  // 作者头像：有专属头像图用图片；没有则用博客默认头像（名字首字灰底块）
  function avatarHtml(author) {
    if (author.avatar) {
      return `<img class="author-card__avatar" src="${assetUrl(escapeHtml(author.avatar))}" alt="${escapeHtml(author.name)}头像">`;
    }
    return `<span class="author-card__avatar default-avatar" aria-label="${escapeHtml(author.name)}头像">${escapeHtml(author.name.charAt(0))}</span>`;
  }

  function renderTeam() {
    const container = document.getElementById('aboutTeam');
    if (!container || typeof ARTICLES_DATA === 'undefined') return;

    const authors = ARTICLES_DATA.authors;
    container.innerHTML = authors.map(author => `
      <div class="about-author-card">
        <div class="author-card__cover"></div>
        <a href="${BASE}search/?author=${encodeURIComponent(author.name)}" class="author-card__avatar-link">
          ${avatarHtml(author)}
        </a>
        <a href="${BASE}search/?author=${encodeURIComponent(author.name)}" class="author-card__name-link">
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
