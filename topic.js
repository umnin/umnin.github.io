/**
 * 专题页渲染逻辑（悲伤疗愈 / 抑郁认知 / 心理学）
 * - 数据统一取自 ARTICLES_DATA.topics 配置（在 articles.js 中维护）
 * - 文章卡片 DOM 结构与搜索页 SearchPage.renderResults 严格一致
 */
(function () {
  'use strict';

  // 每个专题页对应的容器 ID（页面 ID、Hero、简介卡、列表）
  var PAGE_BINDINGS = {
    griefPage: { hero: 'griefHero', intro: 'griefIntro', list: 'griefArticles', count: null },
    depressionPage: { hero: 'depressionHero', intro: 'depressionIntro', list: 'depressionArticles', count: null },
    psychologyPage: { hero: 'psychologyHero', intro: 'psychologyIntro', list: 'psychologyArticles', count: null }
  };

  function getData() {
    if (typeof ARTICLES_DATA !== 'undefined') return ARTICLES_DATA;
    if (window.ARTICLES_DATA) return window.ARTICLES_DATA;
    if (window.MOCK_DATA) return window.MOCK_DATA;
    return null;
  }

  function getAuthor(data, id) {
    if (!data || !Array.isArray(data.authors)) {
      return { name: '未知作者', avatar: 'image/olifu.png' };
    }
    return data.authors.find(function (a) { return a.id === id; })
      || { name: '未知作者', avatar: 'image/olifu.png' };
  }

  function formatDate(dateStr) {
    try {
      var d = new Date(dateStr);
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return y + '年' + m + '月' + day + '日';
    } catch (e) {
      return dateStr;
    }
  }

  function findTopicConfig(data, pageId) {
    if (!data || !Array.isArray(data.topics)) return null;
    return data.topics.find(function (t) { return t.pageId === pageId; }) || null;
  }

  /* ===================== Hero 渲染 ===================== */
  function renderHero(topic, countEl, countNum) {
    var tagsPart = Array.isArray(topic.tagsList) ? topic.tagsList.join(' · ') : '';
    return (
      '<span class="topic-hero__eyebrow">' + (topic.eyebrow || '专题') + '</span>' +
      '<h1 class="topic-hero__title">' + topic.title + '</h1>' +
      '<p class="topic-hero__subtitle">' + topic.subtitle + '</p>' +
      '<div class="topic-hero__meta">' +
      '<div class="topic-hero__meta-item">' +
      '<i data-lucide="file-text"></i>' +
      '<span' + (countEl ? ' id="' + countEl + '"' : '') + '>' + countNum + '</span>' +
      '<span>篇收录文章</span>' +
      '</div>' +
      (tagsPart
        ? ('<div class="topic-hero__meta-item"><i data-lucide="tag"></i><span>' + tagsPart + '</span></div>')
        : '') +
      '</div>'
    );
  }

  /* ===================== 简介卡片渲染 ===================== */
  function renderIntroCards(introCards) {
    if (!Array.isArray(introCards)) return '';
    return introCards.map(function (card) {
      return (
        '<div class="topic-intro__card">' +
        '<i data-lucide="' + (card.icon || 'circle') + '"></i>' +
        '<h3>' + (card.title || '') + '</h3>' +
        '<p>' + (card.desc || '') + '</p>' +
        '</div>'
      );
    }).join('');
  }

  /* ===================== 文章卡片渲染（与 SearchPage.renderResults 严格一致） ===================== */
  function renderArticleCard(data, article, idx) {
    var author = article.author || getAuthor(data, article.authorId);
    return (
      '<article class="article-card card-reveal" data-id="' + article.id + '" ' +
      'style="transition-delay:' + (idx * 60) + 'ms; cursor: pointer;">' +
      '<div class="article-card__cover">' +
      '<img src="' + article.cover + '" alt="' + article.title + '" loading="lazy">' +
      '</div>' +
      '<div class="article-card__body">' +
      '<span class="article-card__tag">' + article.categoryName + '</span>' +
      '<h3 class="article-card__title">' + article.title + '</h3>' +
      '<p class="article-card__excerpt">' + article.excerpt + '</p>' +
      '<div class="article-card__meta">' +
      '<a href="search.html?author=' + encodeURIComponent(author.name) + '" ' +
      'class="article-card__author" onclick="event.stopPropagation()">' +
      '<img src="' + author.avatar + '" alt="' + author.name + '">' +
      '<span>' + author.name + '</span>' +
      '</a>' +
      '<span class="article-card__dot article-card__dot--spacer"></span>' +
      '<time datetime="' + article.date + '">' + formatDate(article.date) + '</time>' +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  /* ===================== 静默图标初始化 ===================== */
  function silentIcons() {
    var _warn = console.warn;
    console.warn = function () { };
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } finally {
      console.warn = _warn;
    }
  }

  /* ===================== 入口 ===================== */
  // 兜底 Reveal Observer：若全局 Animations 不可用，则自建一个
  var _fallbackObserver = null;
  function ensureCardsVisible() {
    var cards = document.querySelectorAll('.card-reveal:not(.is-visible)');
    if (cards.length === 0) return;

    // 优先使用全局 Animations（来自 script.js）
    if (window.Animations && typeof window.Animations.observeCards === 'function') {
      try {
        if (!window.Animations.observer) {
          if (typeof window.Animations.initRevealObserver === 'function') {
            window.Animations.initRevealObserver();
          }
        }
        window.Animations.observeCards();
        return;
      } catch (e) { /* 继续走兜底 */ }
    }

    // 兜底：自建 IntersectionObserver
    try {
      if (!_fallbackObserver) {
        _fallbackObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              _fallbackObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      }
      cards.forEach(function (el) { _fallbackObserver.observe(el); });
    } catch (e) {
      // 极端兜底：不支持 IO 时直接全部显示
      cards.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  function initTopicPage() {
    var data = getData();
    if (!data) {
      setTimeout(initTopicPage, 50);
      return;
    }

    var pageId = null;
    for (var pid in PAGE_BINDINGS) {
      if (Object.prototype.hasOwnProperty.call(PAGE_BINDINGS, pid) && document.getElementById(pid)) {
        pageId = pid;
        break;
      }
    }
    if (!pageId) return;

    var bind = PAGE_BINDINGS[pageId];
    var topicCfg = findTopicConfig(data, pageId);
    if (!topicCfg) {
      console.warn('[topic] 未找到 articles.js.topics 中 pageId=' + pageId + ' 的配置');
      return;
    }

    var articles = (data.articles || []).filter(function (a) {
      return a.categoryName === topicCfg.categoryName;
    });
    var count = articles.length;

    // 1. Hero 注入
    var heroEl = document.getElementById(bind.hero);
    if (heroEl) heroEl.innerHTML = renderHero(topicCfg, bind.count, count);

    // 2. 简介卡片注入
    var introEl = document.getElementById(bind.intro);
    if (introEl) introEl.innerHTML = renderIntroCards(topicCfg.introCards);

    // 3. 文章列表注入
    var listEl = document.getElementById(bind.list);
    if (listEl) {
      if (listEl.classList.contains('topic-articles')) listEl.classList.remove('topic-articles');
      if (!listEl.classList.contains('articles-grid')) listEl.classList.add('articles-grid');

      if (count === 0) {
        listEl.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:var(--space-12) 0;">暂未收录相关文章</p>';
      } else {
        listEl.innerHTML = articles.map(function (article, idx) {
          return renderArticleCard(data, article, idx);
        }).join('');

        listEl.querySelectorAll('.article-card').forEach(function (card) {
          card.addEventListener('click', function () {
            window.location.href = 'article.html?id=' + card.dataset.id;
          });
        });
      }
    }

    // 图标 & 动画
    silentIcons();
    ensureCardsVisible();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopicPage, { once: true });
  } else {
    initTopicPage();
  }
})();
