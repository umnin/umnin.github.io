/**
 * 留言板功能模块
 * - 支持两种模式：普通留言 / 向作者留言
 * - URL 参数 ?author=作者名 可直接进入向作者留言模式并选中该作者
 * - 使用 localStorage 存储留言数据，只显示用户本人留言
 */

(function () {
  'use strict';

  // 路径前缀：子目录页面通过内联脚本注入 window.ASSET_BASE='../'，根目录页面为 ''
  var BASE = window.ASSET_BASE || '';
  function assetUrl(p) {
    if (!p || /^(https?:)?\/\//.test(p)) return p;
    return BASE + p;
  }

  function getAuthors() {
    if (typeof ARTICLES_DATA !== 'undefined' && Array.isArray(ARTICLES_DATA.authors)) {
      return ARTICLES_DATA.authors;
    }
    if (window.ARTICLES_DATA && Array.isArray(window.ARTICLES_DATA.authors)) {
      return window.ARTICLES_DATA.authors;
    }
    return [];
  }

  const MessageBoard = {
    STORAGE_KEY: 'pro_blog_messages',
    MAX_LENGTH: 500,

    // 当前模式：'normal' | 'author'
    mode: 'normal',
    // 当前选中的作者名（author 模式下）
    selectedAuthor: null,
    // 作者数据
    authors: [],

    init() {
      this.authors = getAuthors();
      this.loadMessages();
      this.parseUrlParams();
      this.renderAuthorPicker();
      this.syncModeUI();
      this.renderMessageList();
      this.bindEvents();
    },

    parseUrlParams() {
      const params = new URLSearchParams(window.location.search);
      const author = params.get('author');
      if (author) {
        this.mode = 'author';
        this.selectedAuthor = author;
      }
    },

    loadMessages() {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      this.messages = saved ? JSON.parse(saved) : [];
    },

    saveMessages() {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.messages));
    },

    /* ================ UI 渲染 ================ */
    renderAuthorPicker() {
      const listEl = document.getElementById('authorPickerList');
      if (!listEl || this.authors.length === 0) return;

      listEl.innerHTML = this.authors.map(function (a) {
        const selected = a.name === this.selectedAuthor;
        return (
          '<button type="button" class="author-picker__item' + (selected ? ' author-picker__item--selected' : '') + '" ' +
          'data-author="' + this.escapeHtml(a.name) + '">' +
          (a.avatar
            ? '<img src="' + assetUrl(a.avatar) + '" alt="' + this.escapeHtml(a.name) + '">'
            : '<span class="default-avatar">' + this.escapeHtml(a.name.charAt(0)) + '</span>') +
          '<div class="author-picker__item-info">' +
          '<span class="author-picker__item-name">' + this.escapeHtml(a.name) + '</span>' +
          '<span class="author-picker__item-role">' + this.escapeHtml(a.title || '') + '</span>' +
          '</div>' +
          (selected ? '<i data-lucide="check-circle-2" class="author-picker__check"></i>' : '') +
          '</button>'
        );
      }.bind(this)).join('');

      this.refreshIcons();
    },

    syncModeUI() {
      // Tab 高亮
      document.querySelectorAll('#messageTabs .message-tabs__btn').forEach(function (btn) {
        btn.classList.toggle('message-tabs__btn--active', btn.dataset.tab === this.mode);
      }.bind(this));

      // 作者选择区显示
      const picker = document.getElementById('authorPicker');
      if (picker) picker.hidden = this.mode !== 'author';

      // 标题 / 按钮文案
      const title = document.getElementById('formSectionTitle');
      const submit = document.getElementById('submitBtnText');
      const contentLabel = document.getElementById('contentLabel');
      if (this.mode === 'author' && this.selectedAuthor) {
        if (title) title.textContent = '给「' + this.selectedAuthor + '」留言';
        if (submit) submit.textContent = '发送给 ' + this.selectedAuthor;
        if (contentLabel) contentLabel.textContent = '想对 TA 说的话';
      } else if (this.mode === 'author') {
        if (title) title.textContent = '选择作者后留言';
        if (submit) submit.textContent = '发送给作者';
        if (contentLabel) contentLabel.textContent = '留言内容';
      } else {
        if (title) title.textContent = '写下你的留言';
        if (submit) submit.textContent = '发表留言';
        if (contentLabel) contentLabel.textContent = '留言内容';
      }
    },

    renderMessageList() {
      const container = document.getElementById('messageListContainer');
      if (!container) return;

      if (this.messages.length === 0) {
        container.innerHTML =
          '<div class="message-empty">' +
          '<i data-lucide="inbox"></i>' +
          '<p>还没有留言记录，写一条试试吧～</p>' +
          '</div>';
        this.refreshIcons();
        return;
      }

      container.innerHTML = this.messages.map(function (msg) {
        const isToAuthor = !!msg.targetAuthor;
        const authorObj = isToAuthor ? (this.authors.find(function (a) { return a.name === msg.targetAuthor; }) || null) : null;
        const date = new Date(msg.time);
        const dateStr = date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0') + ' ' +
          String(date.getHours()).padStart(2, '0') + ':' +
          String(date.getMinutes()).padStart(2, '0');

        return (
          '<article class="message-item' + (isToAuthor ? ' message-item--to-author' : '') + '" data-id="' + msg.id + '">' +
          (isToAuthor
            ? '<div class="message-item__target">' +
            '<i data-lucide="user-round"></i>' +
            '<span>致：</span>' +
            (authorObj
              ? (authorObj.avatar
                ? '<img src="' + assetUrl(authorObj.avatar) + '" alt="' + this.escapeHtml(authorObj.name) + '">'
                : '<span class="default-avatar">' + this.escapeHtml(authorObj.name.charAt(0)) + '</span>')
              + '<span class="message-item__target-name">' + this.escapeHtml(authorObj.name) + '</span>'
              : '<span class="message-item__target-name">' + this.escapeHtml(msg.targetAuthor) + '</span>') +
            '</div>'
            : '') +
          '<div class="message-item__header">' +
          '<div class="message-item__user">' +
          '<div class="message-item__avatar">' + this.escapeHtml(msg.nickname).slice(0, 1) + '</div>' +
          '<div class="message-item__meta">' +
          '<span class="message-item__nickname">' + this.escapeHtml(msg.nickname) + '</span>' +
          '<span class="message-item__time">' + dateStr + '</span>' +
          '</div>' +
          '</div>' +
          '<button type="button" class="message-item__delete" data-delete="' + msg.id + '" aria-label="删除">' +
          '<i data-lucide="trash-2"></i>' +
          '</button>' +
          '</div>' +
          '<p class="message-item__content">' + this.escapeHtml(msg.content) + '</p>' +
          '</article>'
        );
      }.bind(this)).join('');

      this.refreshIcons();
    },

    refreshIcons() {
      try {
        const _w = console.warn;
        console.warn = function () { };
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
        console.warn = _w;
      } catch (e) { }
    },

    /* ================ 事件绑定 ================ */
    bindEvents() {
      const self = this;

      // Tab 切换
      document.querySelectorAll('#messageTabs .message-tabs__btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.mode = btn.dataset.tab;
          if (self.mode === 'normal') self.selectedAuthor = null;
          self.syncModeUI();
        });
      });

      // 作者选择
      const pickerList = document.getElementById('authorPickerList');
      if (pickerList) {
        pickerList.addEventListener('click', function (e) {
          const item = e.target.closest('.author-picker__item');
          if (!item) return;
          self.selectedAuthor = item.dataset.author;
          self.renderAuthorPicker();
          self.syncModeUI();
        });
      }

      // 字数计数
      const contentInput = document.getElementById('content');
      const charCount = document.getElementById('charCount');
      if (contentInput && charCount) {
        contentInput.addEventListener('input', function () {
          charCount.textContent = contentInput.value.length;
        });
      }

      // 表单提交
      const form = document.getElementById('messageForm');
      if (form) {
        form.addEventListener('submit', function (e) { self.handleSubmit(e); });
      }

      // 留言列表事件委托（删除）
      const listContainer = document.getElementById('messageListContainer');
      if (listContainer) {
        listContainer.addEventListener('click', function (e) {
          const btn = e.target.closest('[data-delete]');
          if (!btn) return;
          const id = parseInt(btn.dataset.delete, 10);
          if (!isNaN(id)) self.deleteMessage(id);
        });
      }
    },

    /* ================ 业务逻辑 ================ */
    handleSubmit(e) {
      e.preventDefault();

      const nickname = document.getElementById('nickname').value.trim();
      const email = document.getElementById('email').value.trim();
      const content = document.getElementById('content').value.trim();

      if (!nickname) { this.showToast('请输入昵称', true); return; }
      if (this.mode === 'author' && !this.selectedAuthor) { this.showToast('请先选择要留言的作者', true); return; }
      if (!content) { this.showToast('请输入留言内容', true); return; }
      if (content.length > this.MAX_LENGTH) { this.showToast('留言不能超过 ' + this.MAX_LENGTH + ' 字', true); return; }

      const newMessage = {
        id: Date.now(),
        nickname: this.escapeHtml(nickname),
        email: this.escapeHtml(email),
        content: this.escapeHtml(content),
        time: Date.now(),
        // 普通留言无 targetAuthor；向作者留言时保存目标作者名
        targetAuthor: this.mode === 'author' ? this.selectedAuthor : null
      };

      this.messages.unshift(newMessage);
      this.saveMessages();

      document.getElementById('messageForm').reset();
      document.getElementById('charCount').textContent = '0';

      this.renderMessageList();
      this.showToast(this.mode === 'author' ? '已发送给「' + this.selectedAuthor + '」！' : '留言发表成功！');
    },

    deleteMessage(id) {
      if (!confirm('确定要删除这条留言吗？')) return;
      this.messages = this.messages.filter(function (m) { return m.id !== id; });
      this.saveMessages();
      this.renderMessageList();
      this.showToast('已删除留言');
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text == null ? '' : String(text);
      return div.innerHTML;
    },

    showToast(message, isError) {
      const toast = document.createElement('div');
      toast.className = 'message-toast' + (isError ? ' message-toast--error' : '');
      toast.textContent = message;
      document.body.appendChild(toast);

      requestAnimationFrame(function () {
        toast.classList.add('message-toast--show');
      });

      setTimeout(function () {
        toast.classList.remove('message-toast--show');
        setTimeout(function () { toast.remove(); }, 300);
      }, 2500);
    }
  };

  function boot() {
    // 若作者数据还未就绪，稍后重试
    if (typeof ARTICLES_DATA === 'undefined' && typeof window.ARTICLES_DATA === 'undefined') {
      setTimeout(boot, 50);
      return;
    }
    MessageBoard.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
