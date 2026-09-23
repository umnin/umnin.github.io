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
    '722-32': {
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
        // 输入纯数字且存在对应文章 ID → 直接进入该文章
        if (/^\d+$/.test(keyword)) {
          const article = MOCK_DATA.articles.find(a => a.id === Number(keyword));
          if (article) {
            window.location.href = `${BASE}article/?id=${article.id}`;
            return true;
          }
        }
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
      if (!DOM.articlesList) return;
      const data = MOCK_DATA.articles.filter(a => a.featured && !a.hidden);

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
      if (!DOM.categoryList) return;
      // 从实际文章中聚合分类，保证分类名与文章 categoryName 一致
      const catMap = new Map();
      MOCK_DATA.articles.forEach(a => {
        if (a.hidden) return;
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
      if (!DOM.tagCloud) return;
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
      if (statArticles) statArticles.dataset.count = MOCK_DATA.articles.filter(a => !a.hidden).length;
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
        const footerPhone = e.target.closest('.footer__socials a[href^="tel:"], .about-contact__value[href^="tel:"]');
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
  //  管理员密码校验：SHA-256 哈希后再做凯撒位移
  //  （字母后移 7 位，数字加 1，均循环），代码中不出现明文也不出现裸哈希
  //  明文答案：创始人名字拼音（b 开头），由玩家自行推出
  // ============================================
  const ADMIN_PASSWORD_OBF = '4j88m372h267h6419mll64831387406lm89k3l8478l5336h4k4k04m5hjjk2kk4';

  async function sha256Hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf), function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  /* 凯撒位移：a-z 后移 7 位，0-9 加 1，均循环 */
  function caesarShift(hex) {
    return hex.replace(/[a-z0-9]/g, function (c) {
      if (c >= '0' && c <= '9') return String((Number(c) + 1) % 10);
      return String.fromCharCode((c.charCodeAt(0) - 97 + 7) % 26 + 97);
    });
  }

  async function verifyAdminPassword(input) {
    const val = (input || '').trim().toLowerCase();
    if (!val || !window.crypto || !crypto.subtle) return false;
    try {
      return caesarShift(await sha256Hex(val)) === ADMIN_PASSWORD_OBF;
    } catch (e) {
      return false;
    }
  }

  // ============================================
  //  加密文章解密：AES-256-GCM
  //  用管理员密码经 PBKDF2 派生密钥，解密 articles.js 中的 contentCipher
  //  bundle 结构（base64）：IV(12) + authTag(16) + ciphertext
  //  加密参数需与 _encrypt_article.js 完全一致
  // ============================================
  const PBKDF2_SALT = 'problog-2026-biancheng';
  const PBKDF2_ITERATIONS = 100000;
  const AES_IV_LEN = 12;
  const AES_TAG_LEN = 16;

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function decryptArticleContent(password, cipherBundle) {
    if (!password || !cipherBundle || !window.crypto || !crypto.subtle) return null;
    try {
      const bundle = base64ToBytes(cipherBundle);
      const iv = bundle.slice(0, AES_IV_LEN);
      const tag = bundle.slice(AES_IV_LEN, AES_IV_LEN + AES_TAG_LEN);
      const ciphertext = bundle.slice(AES_IV_LEN + AES_TAG_LEN);

      // 拼接 ciphertext + authTag（Web Crypto GCM 要求 tag 附在密文末尾）
      const ctWithTag = new Uint8Array(ciphertext.length + tag.length);
      ctWithTag.set(ciphertext, 0);
      ctWithTag.set(tag, ciphertext.length);

      // 导入密码为 PBKDF2 密钥材料
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // PBKDF2 派生 AES-256 密钥
      const aesKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode(PBKDF2_SALT),
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // AES-GCM 解密
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        ctWithTag
      );

      const text = new TextDecoder().decode(plain);
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  // ============================================
  //  管理员入口彩蛋：3 秒内连点主题切换按钮 7 次
  //  → 弹出登录框（账号：页脚邮箱前缀 / 密码：创始人的名字拼音）
  //  → 验证通过写入 sessionStorage 并跳转后台页 /admin/
  // ============================================
  const AdminLogin = {
    ADMIN_USER: 's_will',
    CLICK_WINDOW: 3000,
    CLICK_TARGET: 7,
    clicks: [],
    modal: null,

    init() {
      if (!DOM.themeToggle) return;
      // 主题切换照常进行；这里只做连击计数
      DOM.themeToggle.addEventListener('click', () => this.registerClick());
    },

    registerClick() {
      const now = Date.now();
      // 滑动窗口：只保留最近 3 秒内的点击
      this.clicks = this.clicks.filter(t => now - t < this.CLICK_WINDOW);
      this.clicks.push(now);
      if (this.clicks.length >= this.CLICK_TARGET) {
        this.clicks = [];
        this.open();
      }
    },

    open() {
      if (!this.modal) this.build();
      this.modal.classList.add('admin-modal--open');
      const user = this.modal.querySelector('#adminUserInput');
      const input = this.modal.querySelector('#adminPasswordInput');
      const err = this.modal.querySelector('#adminModalError');
      user.value = '';
      input.value = '';
      err.textContent = '';
      setTimeout(() => user.focus(), 200);
    },

    close() {
      if (this.modal) this.modal.classList.remove('admin-modal--open');
    },

    async attempt() {
      const user = this.modal.querySelector('#adminUserInput');
      const input = this.modal.querySelector('#adminPasswordInput');
      const err = this.modal.querySelector('#adminModalError');
      const card = this.modal.querySelector('.admin-modal__card');
      const okUser = user.value.trim().toLowerCase() === this.ADMIN_USER;
      const okPass = await verifyAdminPassword(input.value);
      if (okUser && okPass) {
        try { sessionStorage.setItem('problog_admin', '1'); } catch (e) { }
        window.location.href = `${BASE}admin/`;
      } else {
        err.textContent = '账号或密码错误';
        // 重启动摇动画
        card.classList.remove('admin-modal__card--shake');
        void card.offsetWidth;
        card.classList.add('admin-modal__card--shake');
      }
    },

    build() {
      this.modal = document.createElement('div');
      this.modal.className = 'admin-modal';
      this.modal.innerHTML = `
        <div class="admin-modal__card">
          <button class="admin-modal__close" aria-label="关闭">
            <i data-lucide="x"></i>
          </button>
          <h3 class="admin-modal__title">管理员登录</h3>
          <form class="admin-modal__form" id="adminModalForm">
            <input type="text" class="admin-modal__input" id="adminUserInput"
                   placeholder="账号" autocomplete="username" spellcheck="false">
            <input type="password" class="admin-modal__input" id="adminPasswordInput"
                   placeholder="密码" autocomplete="current-password">
            <p class="admin-modal__error" id="adminModalError" role="alert"></p>
            <button type="submit" class="admin-modal__btn">登录</button>
          </form>
        </div>`;
      document.body.appendChild(this.modal);

      this.modal.querySelector('.admin-modal__close').addEventListener('click', () => this.close());
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal.classList.contains('admin-modal--open')) this.close();
      });
      this.modal.querySelector('#adminModalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        this.attempt();
      });

      if (window.lucide) {
        try {
          const origWarn = console.warn;
          console.warn = function () { };
          lucide.createIcons();
          console.warn = origWarn;
        } catch (e) { }
      }
    }
  };

  // ============================================
  //  邮件订阅模块
  // ============================================
  const Newsletter = {
    init() {
      // 隐私政策/使用条款/RSS 等静态页没有订阅表单，跳过以避免空引用错误中断后续图标初始化
      if (!DOM.newsletterForm) return;
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
        if (article.hidden) return;  // 加密文章不参与关键字搜索
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
        // 纯数字且命中文章 ID → 直接跳转文章页
        if (/^\d+$/.test(keyword)) {
          const article = MOCK_DATA.articles.find(a => a.id === Number(keyword));
          if (article) {
            window.location.replace(`${BASE}article/?id=${article.id}`);
            return;
          }
        }
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
        this.filteredResults = MOCK_DATA.articles.filter(a => !a.hidden && utils.getAuthor(a.authorId).name === author);
        document.title = `作者：${author} · Pro博客`;

        this.headerHTML = `${backLink}
          <span class="search-page__label">作者</span>
          <h1 class="search-page__title">${author}</h1>
          <p class="search-page__subtitle">
            共找到 <strong>${this.filteredResults.length}</strong> 篇由「${author}」撰写的文章
          </p>`;
      } else if (tag) {
        this.filteredResults = MOCK_DATA.articles.filter(a => !a.hidden && a.tags.includes(tag));
        document.title = `标签：${tag} · Pro博客`;

        this.headerHTML = `${backLink}
          <span class="search-page__label">标签</span>
          <h1 class="search-page__title">#${tag}</h1>
          <p class="search-page__subtitle">
            共找到 <strong>${this.filteredResults.length}</strong> 篇与「${tag}」相关的文章
          </p>`;
      } else if (category) {
        this.filteredResults = MOCK_DATA.articles.filter(a => !a.hidden && a.categoryName === category);
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
  //  [ARG] 伪造的 id=1 文章
  //  仅当访客带着 GAD-7 最高分的一次性标记（problog_gad_fake）跳转而来时渲染。
  //  元信息与真实 id=1 完全一致，正文却是被「替换」过的内容；
  //  标记读取后立即销毁——刷新页面，文章恢复原样，无法复现。
  //  正文以 AES-256-GCM 密文存储（密钥 = SHA-256(FAKE_KEY_SEED)），渲染前浏览器端解密。
  //  bundle(base64)：IV(12) + authTag(16) + ciphertext
  // ============================================
  const FAKE_KEY_SEED = 'problog-2026-biancheng';
  const FAKE_ARTICLE_1 = {
    id: 1,
    title: '当所爱之人离去：理解丧亲后的心理重建与哀伤过程',
    cover: 'image/bg_abyss.png',
    category: 'grief',
    categoryName: '悲伤疗愈',
    tags: ['丧亲', '哀伤反应', '心理重建'],
    authorId: 1,
    date: '2026-08-08',
    contentCipher: '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'
  };

  /* 固定种子 SHA-256 派生 AES-256-GCM 密钥，解密自动渲染类密文（无需访客输入密码） */
  async function decryptSeedBundle(seed, cipherBundle) {
    if (!cipherBundle || !window.crypto || !crypto.subtle) return null;
    try {
      const rawKey = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
      const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
      const bundle = base64ToBytes(cipherBundle);
      const iv = bundle.slice(0, AES_IV_LEN);
      const tag = bundle.slice(AES_IV_LEN, AES_IV_LEN + AES_TAG_LEN);
      const ct = bundle.slice(AES_IV_LEN + AES_TAG_LEN);
      const ctWithTag = new Uint8Array(ct.length + tag.length);
      ctWithTag.set(ct, 0);
      ctWithTag.set(tag, ct.length);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctWithTag);
      const list = JSON.parse(new TextDecoder().decode(plain));
      return Array.isArray(list) ? list : null;
    } catch (e) {
      return null;
    }
  }

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
        this.renderNotFound(container);
        return;
      }

      // [ARG] GAD-7 最高分跳转：带一次性标记访问 id=1 时，渲染被替换的伪造文章。
      // 标记在密文成功解密后才销毁——刷新或再次访问都将看到真实文章。
      if (id === 1) {
        let fake = false;
        try { fake = sessionStorage.getItem('problog_gad_fake') === '1'; } catch (e) { }
        if (fake) {
          this.renderFakeArticle(article, container);
          return;
        }
      }

      // 加密文章：每次进入都必须输入管理员密码，不记忆、不放行
      if (article.protected) {
        this.renderGate(article, container);
        return;
      }

      this.renderArticle(article, container);
    },

    /* [ARG] 解密伪造文章正文并渲染；解密失败则静默回落到真实文章。一次性标记随之销毁。 */
    async renderFakeArticle(realArticle, container) {
      const blocks = await decryptSeedBundle(FAKE_KEY_SEED, FAKE_ARTICLE_1.contentCipher);
      try { sessionStorage.removeItem('problog_gad_fake'); } catch (e) { }
      if (blocks && blocks.length) {
        this.renderArticle(Object.assign({}, FAKE_ARTICLE_1, { content: blocks }), container);
      } else {
        this.renderArticle(realArticle, container);
      }
    },

    renderNotFound(container) {
      container.innerHTML = `
          <div class="article-notfound">
            <h1 class="article-notfound__title">文章未找到</h1>
            <p class="article-notfound__text">抱歉，您访问的文章不存在或已被移除。</p>
            <a href="${BASE}" class="btn btn--primary">返回首页</a>
          </div>`;
      document.title = '文章未找到 · Pro博客';
    },

    renderGate(article, container) {
      document.title = '受保护的文章 · Pro博客';
      container.innerHTML = `
        <div class="article-gate">
          <div class="article-gate__icon"><i data-lucide="lock"></i></div>
          <h1 class="article-gate__title">这篇文章被加密了</h1>
          <p class="article-gate__desc">它没有被放进任何列表、任何分类、任何标签里。<br>能找到这里的人，请输入 S_WILL 的管理员密码。</p>
          <form class="article-gate__form" id="articleGateForm">
            <input type="password" class="article-gate__input" id="articleGateInput" placeholder="管理员密码" autocomplete="current-password" required>
            <button type="submit" class="btn btn--primary article-gate__submit">进入</button>
          </form>
          <p class="article-gate__error" id="articleGateError"></p>
        </div>`;
      if (window.lucide) { try { lucide.createIcons(); } catch (e) { } }
      const input = container.querySelector('#articleGateInput');
      setTimeout(() => input.focus(), 100);

      container.querySelector('#articleGateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = container.querySelector('#articleGateError');
        const gate = container.querySelector('.article-gate');
        const submit = container.querySelector('.article-gate__submit');
        submit.disabled = true;
        const ok = await verifyAdminPassword(input.value);
        if (ok) {
          // 密码通过后，用同一密码解密加密存储的 content
          article.content = await decryptArticleContent(input.value, article.contentCipher);
        }
        submit.disabled = false;
        if (ok && article.content) {
          this.renderArticle(article, container);
        } else {
          err.textContent = '密码错误';
          gate.classList.remove('article-gate--shake');
          void gate.offsetWidth;
          gate.classList.add('article-gate--shake');
          input.select();
        }
      });

      window.scrollTo(0, 0);
    },

    renderArticle(article, container) {
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
        console.log('%c有一封信，没有被放进任何列表、任何分类、任何标签里。\n它不在目录中，也不在链接中。\n\n想找到它：去"搜索"，在搜索框里输入下面这串字——\n\n    722-32\n\n然后回车。它会认出你的。', 'font-size:13px;line-height:2;color:#888;');
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
    AdminLogin.init();

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
        window.lucide.createIcons();
        console.warn = origWarn;
      } catch (e) { }
    };
    if (window.lucide) {
      createIconsSilently();
      // 延迟一帧再跑一次，确保所有 defer 内联脚本（如 RSS 页）注入的 DOM 也被处理
      requestAnimationFrame(() => createIconsSilently());
    } else {
      const retry = setInterval(() => {
        if (window.lucide) {
          createIconsSilently();
          requestAnimationFrame(() => createIconsSilently());
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
