/* ============================================
   管理后台逻辑（隐藏页 /admin/）
   页面：admin/index.html  样式：admin.css
   未登录拦截与主题应用在页面内联脚本中（需先于渲染执行）
   ============================================ */
(function () {
    'use strict';

    var RESTRICTED_MSG = '因登录IP地址变更，部分功能不可用';

    function esc(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function readJSON(key) {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); }
        catch (e) { return null; }
    }

    function pad(n) { return String(n).padStart(2, '0'); }
    function fmtTime(v) {
        var d = new Date(v);
        if (isNaN(d.getTime())) return '—';
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function authorName(id) {
        if (typeof ARTICLES_DATA === 'undefined') return '未知';
        var a = ARTICLES_DATA.authors.find(function (x) { return x.id === id; });
        return a ? a.name : '未知';
    }

    /* ---- 受限操作：统一提示 ---- */
    var toastTimer = null;
    function showToast(text) {
        var t = document.getElementById('adminToast');
        if (!t) return;
        t.textContent = text || RESTRICTED_MSG;
        t.classList.add('admin-toast--show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('admin-toast--show'); }, 2600);
    }
    function bindRestricted(root) {
        (root || document).querySelectorAll('[data-restricted]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                showToast();
            });
        });
    }

    /* ---- 数据渲染 ---- */
    function forumState() {
        var f = readJSON('pro_blog_forum_v3');
        return (f && Array.isArray(f.posts)) ? f.posts : null;
    }

    function lastActive(p) {
        if (p.replies && p.replies.length) {
            var t = new Date(p.replies[p.replies.length - 1].time).getTime();
            if (!isNaN(t)) return t;
        }
        var t2 = new Date(p.time).getTime();
        return isNaN(t2) ? 0 : t2;
    }

    function row(key, valueHtml) {
        return '<div class="admin-row"><span class="admin-row__key">' + esc(key) +
            '</span><span class="admin-row__val">' + valueHtml + '</span></div>';
    }

    function renderDashboard() {
        var statsEl = document.getElementById('dashboardStats');
        var sysEl = document.getElementById('dashboardSystem');
        var recentEl = document.getElementById('dashboardRecent');
        if (!statsEl || typeof ARTICLES_DATA === 'undefined') return;

        var articles = ARTICLES_DATA.articles.filter(function (a) { return !a.hidden; });
        var authors = ARTICLES_DATA.authors || [];
        var tags = ARTICLES_DATA.tags || [];
        var cats = {};
        articles.forEach(function (a) { cats[a.categoryName || '未分类'] = 1; });
        var posts = forumState();
        var postCount = posts ? posts.length : 0;
        var replyCount = posts ? posts.reduce(function (s, p) { return s + ((p.replies && p.replies.length) || 0); }, 0) : 0;
        var messages = readJSON('pro_blog_messages');
        var msgCount = Array.isArray(messages) ? messages.length : 0;

        statsEl.innerHTML =
            row('文章', String(articles.length)) +
            row('分类', String(Object.keys(cats).length)) +
            row('标签', String(tags.length)) +
            row('作者', String(authors.length)) +
            row('讨论区', '帖子 ' + postCount + ' · 回复 ' + replyCount) +
            row('留言', msgCount ? String(msgCount) : '暂无本地记录');

        var recent = articles.slice()
            .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })
            .slice(0, 5);
        recentEl.innerHTML = recent.map(function (a) {
            return '<a class="admin-article" href="../article/?id=' + a.id + '">' +
                '<span class="admin-article__title">《' + esc(a.title) + '》</span>' +
                '<span class="admin-article__meta">' + a.date + ' · ' + esc(a.categoryName) + '</span></a>';
        }).join('') || '<p class="admin-empty">暂无文章</p>';

        sysEl.innerHTML =
            row('当前登录', 'S_WILL（冰）') +
            row('站点标题', esc((ARTICLES_DATA.siteContact && ARTICLES_DATA.siteContact.name) || 'Pro博客')) +
            row('程序版本', 'ProBlog 2.6.1') +
            row('存储引擎', '浏览器本地存储') +
            row('更新频率', esc((ARTICLES_DATA.siteContact && ARTICLES_DATA.siteContact.updateSchedule) || '每周六更新'));
    }

    function renderPosts() {
        var el = document.getElementById('postsTable');
        if (!el || typeof ARTICLES_DATA === 'undefined') return;
        var list = ARTICLES_DATA.articles.filter(function (a) { return !a.hidden; })
            .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
        el.innerHTML = '<table class="admin-table"><thead><tr>' +
            '<th>标题</th><th>分类</th><th>作者</th><th>日期</th><th>操作</th></tr></thead><tbody>' +
            list.map(function (a) {
                return '<tr><td class="admin-table__title"><a href="../article/?id=' + a.id + '">' + esc(a.title) + '</a></td>' +
                    '<td>' + esc(a.categoryName) + '</td>' +
                    '<td>' + esc(authorName(a.authorId)) + '</td>' +
                    '<td>' + a.date + '</td>' +
                    '<td class="admin-table__ops"><button type="button" class="admin-linkbtn" data-restricted>编辑</button>' +
                    '<button type="button" class="admin-linkbtn" data-restricted>删除</button></td></tr>';
            }).join('') + '</tbody></table>';
        bindRestricted(el);
    }

    function renderMedia() {
        var el = document.getElementById('mediaTable');
        if (!el || typeof ARTICLES_DATA === 'undefined') return;
        var items = [];
        ARTICLES_DATA.articles.forEach(function (a) {
            if (a.hidden) return;
            if (a.cover) items.push({ file: a.cover.split('/').pop(), ref: '文章《' + a.title + '》' });
        });
        (ARTICLES_DATA.authors || []).forEach(function (a) {
            if (a.avatar) items.push({ file: a.avatar.split('/').pop(), ref: '作者「' + a.name + '」头像' });
        });
        el.innerHTML = '<table class="admin-table"><thead><tr>' +
            '<th>文件名</th><th>引用位置</th><th>类型</th></tr></thead><tbody>' +
            items.map(function (m) {
                return '<tr><td>' + esc(m.file) + '</td><td>' + esc(m.ref) + '</td><td>图片</td></tr>';
            }).join('') + '</tbody></table>';
    }

    function renderForum() {
        var el = document.getElementById('forumTable');
        if (!el) return;
        var posts = forumState();
        if (!posts) {
            el.innerHTML = '<p class="admin-empty">暂无本地记录</p>';
            return;
        }
        var sorted = posts.slice().sort(function (a, b) { return lastActive(b) - lastActive(a); });
        el.innerHTML = '<table class="admin-table"><thead><tr>' +
            '<th>主题</th><th>发帖人</th><th>回复</th><th>最后活跃</th><th>操作</th></tr></thead><tbody>' +
            sorted.map(function (p) {
                return '<tr><td class="admin-table__title">' + esc(p.title) + '</td>' +
                    '<td>' + esc(p.author) + '</td>' +
                    '<td>' + ((p.replies && p.replies.length) || 0) + '</td>' +
                    '<td>' + fmtTime(lastActive(p)) + '</td>' +
                    '<td class="admin-table__ops"><button type="button" class="admin-linkbtn" data-restricted>置顶</button>' +
                    '<button type="button" class="admin-linkbtn" data-restricted>删除</button></td></tr>';
            }).join('') + '</tbody></table>';
        bindRestricted(el);
    }

    function renderMessages() {
        var el = document.getElementById('messagesTable');
        if (!el) return;
        var messages = readJSON('pro_blog_messages');
        if (!Array.isArray(messages) || messages.length === 0) {
            el.innerHTML = '<p class="admin-empty">暂无本地记录</p>';
            return;
        }
        el.innerHTML = '<table class="admin-table"><thead><tr>' +
            '<th>昵称</th><th>内容</th><th>对象</th><th>时间</th><th>操作</th></tr></thead><tbody>' +
            messages.map(function (m) {
                var content = m.content || '';
                if (content.length > 30) content = content.slice(0, 30) + '…';
                return '<tr><td>' + esc(m.nickname || '匿名') + '</td>' +
                    '<td>' + esc(content) + '</td>' +
                    '<td>' + (m.targetAuthor ? '致 ' + esc(m.targetAuthor) : '—') + '</td>' +
                    '<td>' + fmtTime(m.time) + '</td>' +
                    '<td class="admin-table__ops"><button type="button" class="admin-linkbtn" data-restricted>删除</button></td></tr>';
            }).join('') + '</tbody></table>';
        bindRestricted(el);
    }

    function renderAuthors() {
        var el = document.getElementById('authorsTable');
        if (!el || typeof ARTICLES_DATA === 'undefined') return;
        el.innerHTML = '<table class="admin-table"><thead><tr>' +
            '<th>名称</th><th>身份</th><th>邮箱</th><th>操作</th></tr></thead><tbody>' +
            (ARTICLES_DATA.authors || []).map(function (a) {
                return '<tr><td>' + esc(a.name) + '</td>' +
                    '<td>' + esc(a.title || '—') + '</td>' +
                    '<td>' + esc(a.email || '—') + '</td>' +
                    '<td class="admin-table__ops"><button type="button" class="admin-linkbtn" data-restricted>编辑</button></td></tr>';
            }).join('') + '</tbody></table>';
        bindRestricted(el);
    }

    function renderSettings() {
        var el = document.getElementById('settingsForm');
        if (!el || typeof ARTICLES_DATA === 'undefined') return;
        var c = ARTICLES_DATA.siteContact || {};
        function field(label, value) {
            return '<div class="admin-field"><label>' + esc(label) + '</label>' +
                '<input type="text" class="admin-input" value="' + esc(value) + '" disabled></div>';
        }
        el.innerHTML =
            field('站点标题', c.name || 'Pro博客') +
            field('站点副标题', '专业与灵感的交汇，分享有价值的内容。') +
            field('联系邮箱', c.email || '') +
            field('联系电话', c.phone || '') +
            field('电报', c.telegram || '') +
            field('站点地址', c.address || '') +
            field('更新频率', c.updateSchedule || '') +
            '<p class="admin-view__actions"><button type="button" class="admin-btn" data-restricted>保存更改</button></p>' +
            '<p class="admin-empty">部分设置项已由系统锁定。</p>';
        bindRestricted(el);
    }

    /* ---- 内部留言（后台用户之间） ----
       预设往来记录以 AES-256-GCM 密文存储。；
       发送与删除均已因「登录IP地址变更」受限。
    */
    var NOTES_KEY_SEED = 'problog-2026-biancheng';
    var NOTES_CIPHER = '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';

    var NOTES_SEED = [];

    function b64ToBytes(b64) {
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }

    /* AES-256-GCM 解密内部留言：SHA-256(种子) 派生密钥，解包后 JSON.parse */
    function decryptNotes(cipherBundle) {
        if (!cipherBundle || !window.crypto || !crypto.subtle) return Promise.resolve(null);
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(NOTES_KEY_SEED))
            .then(function (rawKey) {
                return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
            })
            .then(function (key) {
                var bundle = b64ToBytes(cipherBundle);
                var iv = bundle.slice(0, 12);
                var tag = bundle.slice(12, 28);
                var ct = bundle.slice(28);
                /* Web Crypto GCM 要求 authTag 附在密文末尾 */
                var ctWithTag = new Uint8Array(ct.length + tag.length);
                ctWithTag.set(ct, 0);
                ctWithTag.set(tag, ct.length);
                return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ctWithTag);
            })
            .then(function (plain) {
                var list = JSON.parse(new TextDecoder().decode(plain));
                return Array.isArray(list) ? list : null;
            })
            .catch(function () { return null; });
    }

    function renderNotes() {
        var el = document.getElementById('notesList');
        if (!el) return;
        el.innerHTML = NOTES_SEED.slice()
            .sort(function (a, b) { return new Date(b.time) - new Date(a.time); })
            .map(function (n) {
                return '<div class="admin-note">' +
                    '<div class="admin-note__head">' +
                    '<span class="admin-note__who">' + esc(n.from) + ' → ' + esc(n.to) + '</span>' +
                    '<span class="admin-note__time">' + fmtTime(n.time) + '</span></div>' +
                    '<p class="admin-note__body">' + esc(n.content) + '</p>' +
                    '<button type="button" class="admin-note__del" data-restricted>删除</button>' +
                    '</div>';
            }).join('');
        bindRestricted(el);
    }

    /* 页面加载后解密内部留言，再注入 NOTES_SEED 并渲染 */
    function initNotes() {
        var el = document.getElementById('notesList');
        if (el) el.innerHTML = '<p class="admin-empty">正在加载内部留言…</p>';
        decryptNotes(NOTES_CIPHER).then(function (list) {
            if (list) {
                NOTES_SEED = list;
                renderNotes();
            } else if (el) {
                el.innerHTML = '<p class="admin-empty">内部留言记录暂不可用</p>';
            }
        });
    }

    /* ---- 视图切换（hash 路由） ---- */
    var VIEWS = ['dashboard', 'posts', 'media', 'forum', 'messages', 'notes', 'authors', 'settings'];

    function switchView(name) {
        if (VIEWS.indexOf(name) === -1) name = 'dashboard';
        VIEWS.forEach(function (v) {
            var sec = document.getElementById('view-' + v);
            if (sec) sec.hidden = (v !== name);
        });
        document.querySelectorAll('#adminNav .admin-sidebar__link').forEach(function (link) {
            link.classList.toggle('admin-sidebar__link--active', link.dataset.view === name);
        });
        if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
        window.scrollTo(0, 0);
    }

    function boot() {
        if (typeof ARTICLES_DATA === 'undefined') return;
        renderDashboard();
        renderPosts();
        renderMedia();
        renderForum();
        renderMessages();
        initNotes();
        renderAuthors();
        renderSettings();
        bindRestricted(document);

        document.getElementById('adminNav').addEventListener('click', function (e) {
            var link = e.target.closest('.admin-sidebar__link');
            if (!link) return;
            e.preventDefault();
            switchView(link.dataset.view);
        });
        switchView((location.hash || '#dashboard').slice(1));

        var logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', function () {
            try { sessionStorage.removeItem('problog_admin'); } catch (e) { }
            window.location.href = '../';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
