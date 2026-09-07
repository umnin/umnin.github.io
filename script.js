/* ============================================
   Pro博客 - 交互脚本
   架构：模块划分 + 事件委托 + Intersection Observer
   ============================================ */

(function () {
  'use strict';

  // 引用外部文章数据
  const MOCK_DATA = ARTICLES_DATA;

  // 路径前缀：子目录页面（grief/、search/ 等）通过内联脚本注入 window.ASSET_BASE='../'，
  // 根目录页面默认为 ''。用于拼接站内链接与图片等静态资源路径
  const BASE = window.ASSET_BASE || '';
  const assetUrl = (p) => (!p || /^(https?:)?\/\//.test(p) || p.startsWith('data:')) ? p : BASE + p;

  // [ARG 线索] 搜索页隐藏关键词：不在任何文章里出现，搜中后返回一张"不存在的文章"卡片
  const ARG_SECRETS = {
    '722转32': {
      title: '给读得很慢的人',
      excerpt: '这不是一篇文章。它没有作者署名，没有日期，也不在任何分类里。如果你在搜索结果里看见了它——说明有人一直在等你。',
      cover: 'image/bg_huochezhan.png',
      href: BASE + 'letter/'
    }
  };

  // [ARG 线索] 记录探索进度（仅存于访客本地浏览器）
  function argProgress(data) {
    try {
      const prev = JSON.parse(localStorage.getItem('problog_arg') || '{}');
      localStorage.setItem('problog_arg', JSON.stringify(Object.assign(prev, data, { at: new Date().toISOString() })));
    } catch (e) { }
  }

  // ============================================
  //  DOM 引用缓存
  // ============================================
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const DOM = {
    navbar: $('#navbar'),
    navMenu: $('#navMenu'),
    hamburger: $('#hamburger'),
    themeToggle: $('#themeToggle'),
    searchBox: $('#searchBox'),
    searchTrigger: $('#searchTrigger'),
    searchInput: $('#searchInput'),
    articlesList: $('#articlesList'),
    categoryList: $('#categoryList'),
    tagCloud: $('#tagCloud'),
    newsletterForm: $('#newsletterForm'),
    newsletterSuccess: $('#newsletterSuccess')
  };

  // ============================================
  //  工具函数
  // ============================================
  const utils = {
    formatDate(dateStr) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}年${month}月${day}日`;
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text == null ? '' : String(text);
      return div.innerHTML;
    },

    // 数字滚动动画
    animateCounter(el, target, duration = 1800) {
      const startTime = performance.now();
      const startValue = 0;
      const isLarge = target >= 1000;

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startValue + (target - startValue) * eased);
        el.textContent = isLarge ? current.toLocaleString() : current;
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    },

    // 根据 ID 获取作者信息
    getAuthor(id) {
      return MOCK_DATA.authors.find(a => a.id === id) || { name: '未知作者', avatar: '', title: '', bio: '' };
    },

    // 作者头像 HTML：有专属头像图用图片；没有则用博客默认头像（名字首字灰底块）
    // imgClass：复用现有头像尺寸类（如 author-card__avatar），默认头像会叠加 default-avatar
    avatarHtml(author, imgClass) {
      const name = (author && author.name) || '未知';
      const alt = name + '头像';
      if (author && author.avatar) {
        return `<img${imgClass ? ` class="${imgClass}"` : ''} src="${assetUrl(author.avatar)}" alt="${alt}">`;
      }
      const cls = imgClass ? `${imgClass} default-avatar` : 'default-avatar';
      return `<span class="${cls}" aria-label="${alt}">${name.charAt(0)}</span>`;
    }
  };

  // ============================================
  //  主题管理模块
  // ============================================
  const ThemeManager = {
    init() {
      const saved = localStorage.getItem('problog-theme');
      if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
      }
      DOM.themeToggle.addEventListener('click', () => this.toggle());
    },

    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = current ? current === 'dark' : prefersDark;
      const next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('problog-theme', next);
    }
  };

  // ============================================
  //  导航与 UI 交互模块
  // ============================================
  const UI = {
    init() {
      this.handleNavbarScroll();
      this.handleHamburger();
      this.handleSearch();
      this.handleSmoothAnchor();
    },

    handleNavbarScroll() {
      const onScroll = () => {
        if (window.scrollY > 20) {
          DOM.navbar.classList.add('navbar--scrolled');
        } else {
          DOM.navbar.classList.remove('navbar--scrolled');
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    },

    handleHamburger() {
      DOM.hamburger.addEventListener('click', () => {
        DOM.hamburger.classList.toggle('navbar__hamburger--open');
        DOM.navMenu.classList.toggle('navbar__menu--open');
      });

      // 点击导航链接后关闭移动端菜单
      $$('.navbar__link', DOM.navMenu).forEach(link => {
        link.addEventListener('click', () => {
          DOM.hamburger.classList.remove('navbar__hamburger--open');
          DOM.navMenu.classList.remove('navbar__menu--open');
        });
      });
    },

    handleSearch() {
      const triggerSearch = () => {
        const keyword = DOM.searchInput.value.trim();
        if (!keyword) return false;
        window.location.href = `${BASE}search/?q=${encodeURIComponent(keyword)}`;
        return true;
      };

      let suppressClose = false;
      DOM.searchTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = DOM.searchBox.classList.contains('search-box--open');
        if (isOpen && DOM.searchInput.value.trim()) {
          // 已打开且有内容 → 触发搜索
          suppressClose = true;
          triggerSearch();
          return;
        }
        if (!isOpen) {
          // 未打开 → 打开并聚焦
          DOM.searchBox.classList.add('search-box--open');
          setTimeout(() => DOM.searchInput.focus(), 200);
        } else {
          // 已打开但没内容 → 关闭
          DOM.searchBox.classList.remove('search-box--open');
        }
      });

      // 点击外部关闭搜索框（延迟一帧，优先让 trigger 先处理 click，避免被"外部关闭"抢先）
      document.addEventListener('click', (e) => {
        if (suppressClose) { suppressClose = false; return; }
        if (!DOM.searchBox.contains(e.target) && window.innerWidth > 768) {
          requestAnimationFrame(() => {
            if (!DOM.searchBox.matches(':hover')) {
              DOM.searchBox.classList.remove('search-box--open');
            }
          });
        }
      });

      // 点击输入框内部不冒泡到 document 关闭逻辑
      DOM.searchInput.addEventListener('click', (e) => e.stopPropagation());

      DOM.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          suppressClose = true;
          triggerSearch();
        }
      });
    },

    handleSmoothAnchor() {
      $$('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const href = anchor.getAttribute('href');
          if (href === '#') return;
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }
  };

  // ============================================
  //  文章渲染模块
  // ============================================
  const Renderer = {
    init() {
      this.renderArticles();
      this.renderAuthorWidget();
      this.renderCategories();
      this.renderTags();
    },

    renderAuthorWidget() {
      const widget = document.getElementById('authorWidget');
      if (!widget) return;

      const author = MOCK_DATA.authors[0];
      if (!author) return;

      widget.innerHTML = `
        <div class="author-card">
          <div class="author-card__cover"></div>
          <a href="${BASE}search/?author=${encodeURIComponent(author.name)}" class="author-card__avatar-link">
            ${utils.avatarHtml(author, 'author-card__avatar')}
          </a>
          <a href="${BASE}search/?author=${encodeURIComponent(author.name)}" class="author-card__name-link">
            <h3 class="author-card__name">${author.name}</h3>
          </a>
          <p class="author-card__role">${author.title}</p>
          <p class="author-card__bio">${author.bio}</p>
          <div class="author-card__socials">
            <a href="javascript:void(0)" class="author-phone-btn" data-author-id="${author.id}" aria-label="电话"><i data-lucide="phone"></i></a>
            <a href="${BASE}message/?author=${encodeURIComponent(author.name)}" aria-label="给${author.name}留言"><i data-lucide="message-circle"></i></a>
            <a href="javascript:void(0)" class="author-email-btn" data-author-id="${author.id}" aria-label="邮箱"><i data-lucide="mail"></i></a>
          </div>
        </div>`;
    },

    renderArticles() {
      const data = MOCK_DATA.articles.filter(a => a.featured);

      if (data.length === 0) {
        DOM.articlesList.innerHTML = `
          <div style="text-align:center;padding:60px 0;color:var(--color-text-muted);font-family:var(--font-ui);">
            <p style="font-size:16px;">暂无该分类下的文章</p>
          </div>
        `;
        return;
      }

      DOM.articlesList.innerHTML = data.map((article, idx) => {
        const isFeatured = article.featured;
        const articleAuthor = utils.getAuthor(article.authorId);
        return `
          <article class="article-card ${isFeatured ? 'article-card--featured' : ''} card-reveal" data-id="${article.id}" style="transition-delay:${idx * 60}ms; cursor: pointer;">
            <div class="article-card__cover">
              <img src="${assetUrl(article.cover)}" alt="${article.title}" loading="lazy">
            </div>
            <div class="article-card__body">
              <span class="article-card__tag">${article.categoryName}</span>
              <h3 class="article-card__title">${article.title}</h3>
              <p class="article-card__excerpt">${article.excerpt}</p>
              <div class="article-card__meta">
                <a href="${BASE}search/?author=${encodeURIComponent(articleAuthor.name)}" class="article-card__author" onclick="event.stopPropagation()">
                  ${utils.avatarHtml(articleAuthor)}
                  <span>${articleAuthor.name}</span>
                </a>
                <span class="article-card__dot article-card__dot--spacer"></span>
                <time datetime="${article.date}">${utils.formatDate(article.date)}</time>
              </div>
            </div>
          </article>
        `;
      }).join('');

      // 绑定卡片点击跳转
      DOM.articlesList.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `${BASE}article/?id=${card.dataset.id}`;
        });
      });

      // 重新渲染图标
      if (window.lucide) lucide.createIcons();

      // 绑定新元素的 reveal 动画
      Animations.observeCards();
    },

    renderCategories() {
      // 从实际文章中聚合分类，保证分类名与文章 categoryName 一致
      const catMap = new Map();
      MOCK_DATA.articles.forEach(a => {
        const name = a.categoryName || '未分类';
        catMap.set(name, (catMap.get(name) || 0) + 1);
      });
      // 若 articles 没有对应分类，回退到静态数据（同样转为可点击链接）
      const fallback = (MOCK_DATA.categories || []).filter(c => !catMap.has(c.name));
      fallback.forEach(c => catMap.set(c.name, c.count || 0));

      const items = Array.from(catMap.entries()).map(([name, count]) => {
        const encoded = encodeURIComponent(name);
        return `
          <li class="category-list__item">
            <a href="${BASE}search/?category=${encoded}" class="category-list__link">${name}</a>
            <a href="${BASE}search/?category=${encoded}" class="category-list__count" aria-label="${name}分类共${count}篇">${count}</a>
          </li>
        `;
      }).join('');
      DOM.categoryList.innerHTML = items;
    },

    renderTags() {
      DOM.tagCloud.innerHTML = MOCK_DATA.tags.map(tag => `
        <a class="tag-cloud__tag tag-cloud__tag--${tag.size}" href="${BASE}search/?tag=${encodeURIComponent(tag.name)}">${tag.name}</a>
      `).join('');
    }
  };

  // ============================================
  //  动画模块
  // ============================================
  const Animations = {
    observer: null,
    counterObserver: null,

    init() {
      this.initRevealObserver();
      this.initCounterObserver();
      this.observeCards();
    },

    initRevealObserver() {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      });

      // Hero 元素立即触发 reveal
      requestAnimationFrame(() => {
        $$('.hero .reveal').forEach(el => {
          setTimeout(() => el.classList.add('is-visible'), 100);
        });
      });
    },

    initCounterObserver() {
      // Hero 统计：文章数 / 标签数 / 作者数实时计算；读者总数为虚拟数字（HTML 中固定）
      const statArticles = document.getElementById('statArticles');
      if (statArticles) statArticles.dataset.count = MOCK_DATA.articles.length;
      const statTags = document.getElementById('statTags');
      if (statTags) statTags.dataset.count = MOCK_DATA.tags.length;
      const statAuthors = document.getElementById('statAuthors');
      if (statAuthors) statAuthors.dataset.count = MOCK_DATA.authors.length;

      this.counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const target = entry.target;
            const count = parseInt(target.dataset.count, 10);
            utils.animateCounter(target, count);
            this.counterObserver.unobserve(target);
          }
        });
      }, { threshold: 0.1 });

      const nums = $$('.hero__stat-num');
      nums.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const count = parseInt(el.dataset.count, 10);
          utils.animateCounter(el, count);
        } else {
          this.counterObserver.observe(el);
        }
      });
    },

    observeCards() {
      if (!this.observer) return;
      $$('.card-reveal:not(.is-visible)').forEach(el => {
        this.observer.observe(el);
      });
    }
  };

  // 暴露到全局，供 topic.js / about.js 等其他脚本使用
  window.Animations = Animations;

  // ============================================
  //  联系弹窗模块（电话 / 邮箱）
  // ============================================
  const ContactModal = {
    modal: null,

    init() {
      // 创建弹窗 DOM
      this.modal = document.createElement('div');
      this.modal.className = 'phone-modal';
      this.modal.innerHTML = `
        <div class="phone-modal__card">
          <button class="phone-modal__close" aria-label="关闭">
            <i data-lucide="x"></i>
          </button>
          <div class="phone-modal__avatar" id="contactModalAvatar"></div>
          <h3 class="phone-modal__name" id="contactModalName"></h3>
          <p class="phone-modal__role" id="contactModalRole"></p>
          <p class="phone-modal__label" id="contactModalLabel">联系电话</p>
          <p class="phone-modal__number" id="contactModalValue"></p>
          <button class="phone-modal__copy" id="contactModalCopy">
            <i data-lucide="copy"></i>
            <span>复制</span>
          </button>
        </div>`;
      document.body.appendChild(this.modal);

      // 关闭事件
      this.modal.querySelector('.phone-modal__close').addEventListener('click', () => this.close());
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });

      // 复制按钮
      this.modal.querySelector('#contactModalCopy').addEventListener('click', () => {
        const value = this.modal.querySelector('#contactModalValue').textContent;
        const span = this.modal.querySelector('#contactModalCopy span');
        const original = span.textContent;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(value).then(() => {
            span.textContent = '已复制';
            setTimeout(() => { span.textContent = original; }, 1500);
          });
        } else {
          // 降级方案
          const ta = document.createElement('textarea');
          ta.value = value;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          span.textContent = '已复制';
          setTimeout(() => { span.textContent = original; }, 1500);
        }
      });

      // 事件委托：拦截作者卡片电话/邮箱按钮及页脚链接点击
      document.addEventListener('click', (e) => {
        const phoneBtn = e.target.closest('.author-phone-btn');
        const emailBtn = e.target.closest('.author-email-btn');
        const footerPhone = e.target.closest('.footer__socials a[href^="tel:"]');
        const footerEmail = e.target.closest('.footer__socials a[href^="mailto:"]');

        if (phoneBtn) {
          e.preventDefault();
          const authorId = parseInt(phoneBtn.dataset.authorId, 10);
          const author = utils.getAuthor(authorId);
          if (author) this.open(author, 'phone');
        } else if (emailBtn) {
          e.preventDefault();
          const authorId = parseInt(emailBtn.dataset.authorId, 10);
          const author = utils.getAuthor(authorId);
          if (author) this.open(author, 'email');
        } else if (footerPhone) {
          e.preventDefault();
          if (typeof ARTICLES_DATA !== 'undefined' && ARTICLES_DATA.siteContact) {
            this.open(ARTICLES_DATA.siteContact, 'phone');
          }
        } else if (footerEmail) {
          e.preventDefault();
          if (typeof ARTICLES_DATA !== 'undefined' && ARTICLES_DATA.siteContact) {
            this.open(ARTICLES_DATA.siteContact, 'email');
          }
        }
      });
    },

    open(author, type) {
      const avatar = this.modal.querySelector('#contactModalAvatar');
      if (author.avatar) {
        avatar.style.display = 'flex';
        avatar.innerHTML = `<img src="${assetUrl(author.avatar)}" alt="${author.name}头像">`;
      } else {
        // 无专属头像：博客默认头像（名字首字）
        avatar.style.display = 'flex';
        avatar.textContent = (author.name || '未').charAt(0);
      }

      this.modal.querySelector('#contactModalName').textContent = author.name;

      const roleEl = this.modal.querySelector('#contactModalRole');
      if (author.title) {
        roleEl.style.display = 'block';
        roleEl.textContent = author.title;
      } else {
        roleEl.style.display = 'none';
      }

      if (type === 'email') {
        this.modal.querySelector('#contactModalLabel').textContent = '邮箱地址';
        this.modal.querySelector('#contactModalValue').textContent = author.email || '未提供';
        this.modal.querySelector('#contactModalCopy span').textContent = '复制邮箱';
      } else {
        this.modal.querySelector('#contactModalLabel').textContent = '联系电话';
        this.modal.querySelector('#contactModalValue').textContent = author.phone || '未提供';
        this.modal.querySelector('#contactModalCopy span').textContent = '复制号码';
      }

      this.modal.classList.add('phone-modal--open');
      if (window.lucide) {
        try {
          const origWarn = console.warn;
          console.warn = function () { };
          lucide.createIcons();
          console.warn = origWarn;
        } catch (e) { }
      }
    },

    close() {
      this.modal.classList.remove('phone-modal--open');
    }
  };

  // ============================================
  //  邮件订阅模块
  // ============================================
  const Newsletter = {
    init() {
      DOM.newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('.newsletter__input', DOM.newsletterForm);
        if (!input.value.trim()) return;

        const btn = $('.newsletter__btn', DOM.newsletterForm);
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" style="animation:spin 1s linear infinite"></i>';
        if (window.lucide) lucide.createIcons();
        btn.disabled = true;

        setTimeout(() => {
          const parent = DOM.newsletterForm.parentElement;
          parent.classList.add('newsletter--success');
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }, 1200);
      });
    }
  };

  // ============================================
  //  搜索结果页
  // ============================================
  const SearchPage = {
    currentPage: 0,
    perPage: 8,
    filteredResults: [],
    headerHTML: '',

    /**
     * 模糊搜索：根据关键字同时匹配 标题 / 作者 / 标签 / 摘要
     * 返回按相关度排序的文章数组（相关度最高排前）
     */
    fuzzySearch(keyword) {
      const q = keyword.trim().toLowerCase();
      if (!q) return [];

      const scored = [];
      MOCK_DATA.articles.forEach(article => {
        let score = 0;
        const authorObj = utils.getAuthor(article.authorId);

        // 1) 标题匹配：命中得 6 分（开头命中额外 +4，子串命中 +3）
        if (article.title) {
          const title = article.title.toLowerCase();
          if (title === q) score += 12;
          else if (title.startsWith(q)) score += 10;
          else if (title.includes(q)) score += 6;
        }
        // 2) 作者匹配：精确 5 分，包含 3 分
        if (authorObj && authorObj.name) {
          const name = authorObj.name.toLowerCase();
          if (name === q) score += 5;
          else if (name.includes(q)) score += 3;
        }
        // 3) 标签匹配：精确匹配单标签 4 分；标签子串包含 2 分
        if (Array.isArray(article.tags)) {
          article.tags.forEach(tag => {
            const t = tag.toLowerCase();
            if (t === q) score += 4;
            else if (t.includes(q)) score += 2;
          });
          // 关键字包含标签名（反向）也算命中，避免分词缺失
          article.tags.forEach(tag => {
            if (q.includes(tag.toLowerCase())) score += 1;
          });
        }
        // 4) 摘要兜底匹配：+1 分
        if (article.excerpt && article.excerpt.toLowerCase().includes(q)) score += 1;
        // 5) 分类名命中：+2
        if (article.categoryName && article.categoryName.toLowerCase().includes(q)) score += 2;

        if (score > 0) scored.push({ article, score });
      });

      // 按分数降序，同分则按日期新的先
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.article.date) - new Date(a.article.date);
      });
      return scored.map(x => x.article);
    },

    init() {
      const params = new URLSearchParams(window.location.search);
      const tag = params.get('tag');
      const author = params.get('author');
      const category = params.get('category');
      const q = params.get('q');

      const headerEl = document.getElementById('searchHeader');
      const resultsEl = document.getElementById('searchResults');
      if (!headerEl || !resultsEl) return;

      const backLink = `<a href="${BASE}" class="article-back">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12,19 5,12 12,5"></polyline></svg>
            返回首页
          </a>`;

      this.secretHit = null;

      // [ARG 线索] 隐藏关键词：普通搜索无结果，但会掉出一封"不是文章的文章"
      if (q && q.trim() && ARG_SECRETS[q.trim()]) {
        const keyword = q.trim();
        const secret = ARG_SECRETS[keyword];
        this.secretHit = secret;
        this.filteredResults = [];
        argProgress({ stage: 2, keywordFound: keyword });
        document.title = `…… · Pro博客`;

        this.headerHTML = `${backLink}
          <span class="search-page__label">无结果？</span>
          <h1 class="search-page__title">无文章、无标签关于「${utils.escapeHtml ? utils.escapeHtml(keyword) : keyword}」</h1>
          <p class="search-page__subtitle">
            空心人会调整躯体，让其趋近于它的内心。
          </p>`;
      }
      // 关键字搜索（优先级低于 author/tag/category 精准匹配入口，但高于空搜索）
      else if (q && q.trim()) {
        const keyword = q.trim();
        this.filteredResults = this.fuzzySearch(keyword);
        document.title = `搜索：${keyword} · Pro博客`;

        this.headerHTML = `${backLink}
          <span class="search-page__label">关键字</span>
          <h1 class="search-page__title">${utils.escapeHtml ? utils.escapeHtml(keyword) : keyword}</h1>
          <p class="search-page__subtitle">
            共找到 <strong>${this.filteredResults.length}</strong> 篇与「${utils.escapeHtml ? utils.escapeHtml(keyword) : keyword}」相关的文章
            <span style="color:var(--color-text-muted);font-size:12px;margin-left:8px;">（匹配标题、作者、标签、摘要）</span>
          </p>`;
      }
      // 作者筛选模式
      else if (author) {
        this.filteredResults = MOCK_DATA.articles.filter(a => utils.getAuthor(a.authorId).name === author);
        document.title = `作者：${author} · Pro博客`;

        this.headerHTML = `${backLink}
          <span class="search-page__label">作者</span>
          <h1 class="search-page__title">${author}</h1>
          <p class="search-page__subtitle">
            共找到 <strong>${this.filteredResults.length}</strong> 篇由「${author}」撰写的文章
          </p>`;
      } else if (tag) {
        this.filteredResults = MOCK_DATA.articles.filter(a => a.tags.includes(tag));
        document.title = `标签：${tag} · Pro博客`;

        this.headerHTML = `${backLink}
          <span class="search-page__label">标签</span>
          <h1 class="search-page__title">#${tag}</h1>
          <p class="search-page__subtitle">
            共找到 <strong>${this.filteredResults.length}</strong> 篇与「${tag}」相关的文章
          </p>`;
      } else if (category) {
        this.filteredResults = MOCK_DATA.articles.filter(a => a.categoryName === category);
        document.title = `${category} · Pro博客`;

        const categoryDescriptions = {
          '悲伤疗愈': '聚焦丧亲哀伤、延长哀伤、哀伤辅导等主题，陪你走过那段没有答案的日子。',
          '抑郁认知': '从临床抑郁的神经生物学到认知行为疗法，理解而非评判。',
          '心理学': '探索存在主义、正念、自我关怀与自我疗愈的广阔领域。'
        };

        this.headerHTML = `${backLink}
          <span class="search-page__label">分类</span>
          <h1 class="search-page__title">${category}</h1>
          <p class="search-page__subtitle">
            ${categoryDescriptions[category] || `共找到 <strong>${this.filteredResults.length}</strong> 篇收录于「${category}」的文章`}
          </p>`;
      } else {
        document.title = '搜索 · Pro博客';
        headerEl.innerHTML = `${backLink}
          <h1 class="search-page__title">搜索</h1>
          <p class="search-page__subtitle">请从首页的热门标签开始浏览，或在顶部搜索框输入关键字</p>`;
        return;
      }

      this.currentPage = 0;
      this.render();
    },

    render() {
      const headerEl = document.getElementById('searchHeader');
      const resultsEl = document.getElementById('searchResults');
      const params = new URLSearchParams(window.location.search);
      const authorName = params.get('author');

      headerEl.innerHTML = this.headerHTML;

      // [ARG 线索] 隐藏关键词命中：只渲染一张秘密卡片，点击进入未被链接的信页
      if (this.secretHit) {
        const s = this.secretHit;
        resultsEl.innerHTML = `
          <article class="article-card arg-flash-card" id="argLetterCard" style="cursor:pointer;">
            <div class="article-card__cover">
              <img src="${assetUrl(s.cover)}" alt="${s.title}" loading="lazy">
            </div>
            <div class="article-card__body">
              <span class="article-card__tag" style="background:var(--color-bg-muted);color:var(--color-text-muted);">未收录</span>
              <h3 class="article-card__title"></h3>
              <p class="article-card__excerpt"></p>
              <div class="article-card__meta">
                <span style="font-size:13px;color:var(--color-text-muted);font-family:var(--font-ui);">没有作者 · 没有日期 · 点击拆开这封信</span>
              </div>
            </div>
          </article>`;
        const card = document.getElementById('argLetterCard');
        if (card) card.addEventListener('click', () => { window.location.href = s.href; });
        // 可见性由 .arg-flash-card 的信号闯入动画独占控制（不用 card-reveal），
        // opacity:0 时仍可点击——玩家在闪现间隙点那个位置也能拆开信
        // [ARG] 每次显形结束后随机下一周期长度（3.2~7.7s），让信号闯入时机不可预测
        try {
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            card.addEventListener('animationiteration', (e) => {
              if (e.animationName !== 'arg-ghost-visible') return;
              card.style.setProperty('--arg-period', (3.2 + Math.random() * 4.5).toFixed(2) + 's');
            });
          }
        } catch (e2) { }
        return;
      }

      if (this.filteredResults.length === 0) {
        resultsEl.innerHTML = `
          <div style="text-align:center;padding:80px 0;color:var(--color-text-muted);font-family:var(--font-ui);">
            <p style="font-size:16px;margin-bottom:var(--space-2);">没有找到匹配的文章</p>
            <a href="${BASE}" class="btn btn--ghost" style="margin-top:var(--space-4);display:inline-flex;">浏览全部文章</a>
          </div>`;
        return;
      }

      let authorCardHTML = '';
      if (authorName) {
        const authorObj = MOCK_DATA.authors.find(a => a.name === authorName);
        if (authorObj) {
          authorCardHTML = `
            <div class="widget widget--author card-reveal search-author-card">
              <div class="author-card">
                <div class="author-card__cover"></div>
                <div class="search-author-card__inner">
                  <div class="author-card__avatar-link" style="pointer-events:none;">
                    ${utils.avatarHtml(authorObj, 'author-card__avatar')}
                  </div>
                  <div class="search-author-card__info">
                    <h3 class="author-card__name" style="margin:0 0 var(--space-2);text-align:left;">${authorObj.name}</h3>
                    <p class="author-card__role" style="text-align:left;">${authorObj.title}</p>
                    <p class="author-card__bio" style="text-align:left;">${authorObj.bio}</p>
                    <div class="author-card__socials" style="justify-content:flex-start;">
                      <a href="javascript:void(0)" class="author-phone-btn" data-author-id="${authorObj.id}" aria-label="电话"><i data-lucide="phone"></i></a>
                      <a href="${BASE}message/?author=${encodeURIComponent(authorObj.name)}" aria-label="给${authorObj.name}留言"><i data-lucide="message-circle"></i></a>
                      <a href="javascript:void(0)" class="author-email-btn" data-author-id="${authorObj.id}" aria-label="邮箱"><i data-lucide="mail"></i></a>
                    </div>
                  </div>
                </div>
              </div>
            </div>`;
        }
      }

      const totalPages = Math.ceil(this.filteredResults.length / this.perPage);
      const start = this.currentPage * this.perPage;
      const pageItems = this.filteredResults.slice(start, start + this.perPage);

      resultsEl.innerHTML = authorCardHTML + pageItems.map((article, idx) => {
        const resultAuthor = utils.getAuthor(article.authorId);
        return `
          <article class="article-card card-reveal" data-id="${article.id}" style="transition-delay:${idx * 60}ms; cursor: pointer;">
            <div class="article-card__cover">
              <img src="${assetUrl(article.cover)}" alt="${article.title}" loading="lazy">
            </div>
            <div class="article-card__body">
              <span class="article-card__tag">${article.categoryName}</span>
              <h3 class="article-card__title">${article.title}</h3>
              <p class="article-card__excerpt">${article.excerpt}</p>
              <div class="article-card__meta">
                <a href="${BASE}search/?author=${encodeURIComponent(resultAuthor.name)}" class="article-card__author" onclick="event.stopPropagation()">
                  ${utils.avatarHtml(resultAuthor)}
                  <span>${resultAuthor.name}</span>
                </a>
                <span class="article-card__dot article-card__dot--spacer"></span>
                <time datetime="${article.date}">${utils.formatDate(article.date)}</time>
              </div>
            </div>
          </article>
        `;
      }).join('');

      // 分页器
      if (totalPages > 1) {
        resultsEl.innerHTML += this.renderPagination(totalPages);
      }

      // 绑定卡片跳转
      resultsEl.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `${BASE}article/?id=${card.dataset.id}`;
        });
      });

      // 绑定分页按钮
      resultsEl.querySelectorAll('.pagination__btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const action = btn.dataset.action;
          if (action === 'prev' && this.currentPage > 0) {
            this.currentPage--;
          } else if (action === 'next' && this.currentPage < totalPages - 1) {
            this.currentPage++;
          } else if (action === 'page') {
            this.currentPage = parseInt(btn.dataset.page, 10);
          }
          this.render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });

      // 图标 & reveal
      if (window.lucide) lucide.createIcons();
      if (Animations && Animations.observeCards) Animations.observeCards();
    },

    renderPagination(totalPages) {
      let pages = '';
      for (let i = 0; i < totalPages; i++) {
        pages += `<button class="pagination__btn ${i === this.currentPage ? 'pagination__btn--active' : ''}" data-action="page" data-page="${i}">${i + 1}</button>`;
      }

      return `
        <div class="pagination">
          <button class="pagination__btn" data-action="prev" ${this.currentPage === 0 ? 'disabled' : ''}>
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12,19 5,12 12,5"></polyline></svg>
            上一页
          </button>
          <div class="pagination__pages">${pages}</div>
          <button class="pagination__btn" data-action="next" ${this.currentPage === totalPages - 1 ? 'disabled' : ''}>
            下一页
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12,5 19,12 12,19"></polyline></svg>
          </button>
        </div>`;
    }
  };

  // ============================================
  //  文章详情页
  // ============================================
  const ArticlePage = {
    init() {
      const params = new URLSearchParams(window.location.search);
      const id = parseInt(params.get('id'), 10);
      const article = MOCK_DATA.articles.find(a => a.id === id);

      const container = document.getElementById('articleContent');
      if (!container) return;

      if (!article) {
        container.innerHTML = `
          <div class="article-notfound">
            <h1 class="article-notfound__title">文章未找到</h1>
            <p class="article-notfound__text">抱歉，您访问的文章不存在或已被移除。</p>
            <a href="${BASE}" class="btn btn--primary">返回首页</a>
          </div>`;
        document.title = '文章未找到 · Pro博客';
        return;
      }

      document.title = `${article.title} · Pro博客`;

      container.innerHTML = `
        <a href="${BASE}" class="article-back">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12,19 5,12 12,5"></polyline></svg>
          返回文章列表
        </a>
        <span class="article-page__tag">${article.categoryName}</span>
        <h1 class="article-page__title">${article.title}</h1>
        <div class="article-page__meta">
          <a href="${BASE}search/?author=${encodeURIComponent(utils.getAuthor(article.authorId).name)}" class="article-card__author">
            ${utils.avatarHtml(utils.getAuthor(article.authorId))}
            <span>${utils.getAuthor(article.authorId).name}</span>
          </a>
          <span class="article-card__dot article-card__dot--spacer"></span>
          <time datetime="${article.date}">${utils.formatDate(article.date)}</time>
        </div>
        <div class="article-page__cover">
          <img src="${assetUrl(article.cover)}" alt="${article.title}">
        </div>
        <div class="article-page__body">
          ${article.content.map(block => {
        if (block.type === 'h2') return `<h2>${block.text}</h2>`;
        if (block.type === 'p') return `<p>${block.text}</p>`;
        if (block.type === 'blockquote') return `<blockquote>${block.text}</blockquote>`;
        if (block.type === 'ul') return `<ul>${block.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
        return '';
      }).join('')}
        </div>
        <div class="article-page__footer">
          <div class="article-page__tags">
            ${article.tags.map(t => `<a class="article-page__tag-item" href="${BASE}search/?tag=${encodeURIComponent(t)}">#${t}</a>`).join('')}
          </div>
          <a href="${BASE}" class="btn btn--ghost">返回首页</a>
        </div>`;

      // [ARG 线索] 第七封信：控制台留言（线索 L2，只在文章 id=7 出现）
      if (article.id === 7) {
        argProgress({ stage: 1, consoleFound: true });
        console.log('%c你听见了这行字。', 'font-size:18px;font-weight:600;color:#666;');
        console.log('%c有一封信，没有被放进任何列表、任何分类、任何标签里。\n它不在目录中，也不在链接中。\n\n想找到它：去"搜索"，在搜索框里输入下面这串字——\n\n    722转32\n\n然后回车。它会认出你的。', 'font-size:13px;line-height:2;color:#888;');
      }

      window.scrollTo(0, 0);
    }
  };

  // ============================================
  //  初始化
  // ============================================
  function init() {
    ThemeManager.init();
    UI.init();
    Animations.init();
    ContactModal.init();

    // 根据页面类型初始化不同模块
    if (document.getElementById('searchPage')) {
      SearchPage.init();
    } else if (document.getElementById('articlePage')) {
      ArticlePage.init();
    } else if (document.getElementById('messagePage') || document.getElementById('aboutPage')
      || document.getElementById('griefPage') || document.getElementById('depressionPage')
      || document.getElementById('forumPage') || document.getElementById('letterPage')) {
      // 留言页、关于页、两个专题页、讨论区页和隐藏信页：不需要首页文章渲染和订阅模块
    } else {
      Renderer.init();
      Newsletter.init();
    }

    // 所有模块渲染完成后再初始化图标（包括动态注入的图标）
    const createIconsSilently = () => {
      try {
        const origWarn = console.warn;
        console.warn = function () { };
        lucide.createIcons();
        console.warn = origWarn;
      } catch (e) { }
    };
    if (window.lucide) {
      createIconsSilently();
    } else {
      const retry = setInterval(() => {
        if (window.lucide) {
          createIconsSilently();
          clearInterval(retry);
        }
      }, 200);
      setTimeout(() => clearInterval(retry), 5000);
    }

    // 附加 spin 动画（用于加载状态）
    const style = document.createElement('style');
    style.textContent = `@keyframes spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(style);

    // [ARG] 浏览器前进/后退缓存（bfcache）恢复页面时，CSS 无限动画可能冻结在最后一帧。
    // 对秘密卡片：移除类 → 强制重排 → 加回类，让闪烁动画从头播放。
    window.addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      const card = document.getElementById('argLetterCard');
      if (card) {
        card.classList.remove('arg-flash-card');
        void card.offsetWidth; // 重置动画时钟
        card.classList.add('arg-flash-card');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
