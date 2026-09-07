/**
 * 读者讨论区模块（/forum/）
 * - 首次访问写入预设讨论种子，之后用户发帖 / 回复 / 点赞均持久化到 localStorage
 * - 排序：最新回复（或最新发帖）在前
 * - 视觉 token 全部由 forum.css / style.css 提供，本文件只负责 DOM 与交互
 */
(function () {
    'use strict';

    // v2：作者名随 articles.js 更新（冰 / 诺夏 / 爱桑德），旧缓存自动失效
    var STORAGE_KEY = 'pro_blog_forum_v2';
    var DEFAULT_AUTHOR = '匿名读者';
    // 博主名单（与 articles.js 中作者一致），显示"博主"徽章
    var MOD_NAMES = ['冰', '诺夏', '爱桑德'];

    /* ===================== 预设讨论种子 ===================== */
    var PRESET_POSTS = [
        {
            id: 'p1',
            author: '路灯下的猫',
            title: '妈妈走了半年，今天在超市闻到她用的洗衣液味道，当场破防',
            content: '就在货架前面站了快十分钟，眼泪止不住。我以为自己已经好了很多，结果一个味道就把我打回原形。\n原来想念不是每天都以同一种样子来的，它会埋伏在各种奇怪的地方。',
            time: '2026-08-28T21:14:00',
            likes: 128,
            liked: false,
            replies: [
                {
                    id: 'p1r1',
                    author: '诺夏',
                    content: '嗅觉是最忠诚的记忆通道，它不经过理性，直接通往情感。在货架前哭十分钟不是"退步"，是妈妈仍然在你身体里好好活着的证据。不用急着擦干眼泪，买点东西回家吧，她一定希望你好好吃饭。',
                    time: '2026-08-28T22:03:00',
                    likes: 86,
                    liked: false
                },
                {
                    id: 'p1r2',
                    author: '匿名读者',
                    content: '抱抱你。我爸走后第三年，我在公交车上闻到别人身上的烟草味，也是瞬间破防。这种瞬间会越来越少，但不会消失。后来我把它理解成他在跟我打招呼。',
                    time: '2026-08-29T08:40:00',
                    likes: 34,
                    liked: false
                },
                {
                    id: 'p1r3',
                    author: '雾中行走',
                    content: '我是听到某首歌会这样。大家都要好好的。',
                    time: '2026-08-29T12:15:00',
                    likes: 17,
                    liked: false
                }
            ]
        },
        {
            id: 'p2',
            author: '七月的雨',
            title: '确诊中度抑郁，不敢告诉父母，怕他们觉得我"矫情"',
            content: '医生开了药，建议配合心理咨询。但我爸妈那代人对抑郁的理解就是"想太多""心眼小"。\n我现在每天假装正常去上班，晚上关上门就不想动。要不要说？怎么说？',
            time: '2026-08-25T02:31:00',
            likes: 96,
            liked: false,
            replies: [
                {
                    id: 'p2r1',
                    author: '冰',
                    content: '先抱抱你。确诊不是你的错，抑郁症是大脑的疾病，和意志无关。\n告诉父母这件事没有标准答案：如果他们有基本的倾听能力，可以从"我最近生病了，医生说是抑郁症，就像感冒需要吃药一样"开始；如果确定会被否定，优先保护好自己的治疗——按时服药、定期咨询，你不必向任何人证明自己"有资格生病"。',
                    time: '2026-08-25T09:12:00',
                    likes: 64,
                    liked: false
                },
                {
                    id: 'p2r2',
                    author: '边城摆渡人',
                    content: '我当时说了，我妈沉默了三天，第四天默默给我炖了汤。父母的反应有时候需要时间消化，不一定是否定。',
                    time: '2026-08-25T14:20:00',
                    likes: 29,
                    liked: false
                },
                {
                    id: 'p2r3',
                    author: '匿名读者',
                    content: '也可以先不说病情，只说"我最近状态很差，需要休息和支持"。对自己温柔一点。',
                    time: '2026-08-26T20:01:00',
                    likes: 41,
                    liked: false
                }
            ]
        },
        {
            id: 'p3',
            author: '边城摆渡人',
            title: '正念冥想坚持了30天，说说真实感受（不是广告）',
            content: '最开始五分钟都坐不住，满脑子乱七八糟。第二周开始能注意到呼吸，但情绪没有任何变化，差点放弃。\n第三周某天加班到崩溃，回家路上突然发现自己在"观察"愤怒，而不是被愤怒卷走——那一刻觉得值了。它不消除痛苦，但好像给我和痛苦之间留了一点缝隙。',
            time: '2026-08-20T19:45:00',
            likes: 73,
            liked: false,
            replies: [
                {
                    id: 'p3r1',
                    author: '爱桑德',
                    content: '"缝隙"这个词用得很好。正念的核心不是清空念头，而是改变你和念头之间的关系。继续坚持，缝隙会慢慢变宽。',
                    time: '2026-08-21T10:05:00',
                    likes: 38,
                    liked: false
                },
                {
                    id: 'p3r2',
                    author: '无风的夜',
                    content: '求问用的什么引导？我自己坐下来总是走神到放弃。',
                    time: '2026-08-21T16:30:00',
                    likes: 12,
                    liked: false
                }
            ]
        },
        {
            id: 'p4',
            author: '无风的夜',
            title: '有没有适合丧亲之后读的书？求推荐，不要鸡汤',
            content: '父亲去年冬天走的。不想看"一切都会好起来"那种话，想找真正诚实的书。',
            time: '2026-08-15T22:10:00',
            likes: 58,
            liked: false,
            replies: [
                {
                    id: 'p4r1',
                    author: '冰',
                    content: '推荐两本：库布勒-罗斯的《论死亡与临终》，还有琼·狄迪恩的《奇想之年》——后者是她丈夫突然去世后写的，没有一句鸡汤，全是诚实。\n阅读不是为了"好起来"，是为了知道自己的混乱并不孤单。',
                    time: '2026-08-16T08:50:00',
                    likes: 52,
                    liked: false
                },
                {
                    id: 'p4r2',
                    author: '路灯下的猫',
                    content: '《奇想之年》我也读过，读完哭了很久，但心里轻了一点。',
                    time: '2026-08-16T21:33:00',
                    likes: 19,
                    liked: false
                }
            ]
        },
        {
            id: 'p5',
            author: '雾中行走',
            title: '悲伤五阶段，我好像一直在"愤怒"和"讨价还价"之间横跳，正常吗？',
            content: '奶奶走了四个月。白天有时候很平静，晚上突然开始翻旧账——怨医生、怨自己、怨"如果那天我坚持送她去医院"。\n文章里说阶段不是线性的，但我没想到自己会反复得这么厉害。',
            time: '2026-08-10T15:00:00',
            likes: 84,
            liked: false,
            replies: [
                {
                    id: 'p5r1',
                    author: '诺夏',
                    content: '太正常了。阶段是"地图"不是"清单"，横跳本身就是哀伤工作的一部分。愤怒说明这段关系对你重要，讨价还价说明你还在试图找回掌控感。四个月还在潮汐里，一点都不晚。',
                    time: '2026-08-10T18:22:00',
                    likes: 47,
                    liked: false
                },
                {
                    id: 'p5r2',
                    author: '七月的雨',
                    content: '我第十个月还在跳，看到你这条突然不那么慌了。',
                    time: '2026-08-11T09:15:00',
                    likes: 23,
                    liked: false
                }
            ]
        }
    ];

    /* ===================== 工具函数 ===================== */
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    function uid() {
        return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function formatTime(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        var diff = Date.now() - d.getTime();
        if (diff < 60 * 1000) return '刚刚';
        if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' 分钟前';
        if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' 小时前';
        if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / 86400000) + ' 天前';
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function modBadge(name) {
        return MOD_NAMES.indexOf(name) !== -1 ? '<span class="forum-badge">博主</span>' : '';
    }

    function refreshIcons() {
        if (!window.lucide) return;
        try {
            var _warn = console.warn;
            console.warn = function () { };
            lucide.createIcons();
            console.warn = _warn;
        } catch (e) { }
    }

    /* ===================== 数据层 ===================== */
    var state = { posts: [] };

    function load() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                var parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.posts)) {
                    state = parsed;
                    return;
                }
            }
        } catch (e) { /* 数据损坏则回退到种子 */ }
        // 深拷贝种子，避免污染常量
        state = { posts: JSON.parse(JSON.stringify(PRESET_POSTS)) };
        save();
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { }
    }

    function findPost(id) {
        return state.posts.find(function (p) { return p.id === id; }) || null;
    }

    // 排序：最后活跃时间（有回复取最后回复时间，否则取发帖时间）倒序
    function sortedPosts() {
        return state.posts.slice().sort(function (a, b) {
            return lastActive(b) - lastActive(a);
        });
    }

    function lastActive(post) {
        if (post.replies && post.replies.length) {
            return new Date(post.replies[post.replies.length - 1].time).getTime() || 0;
        }
        return new Date(post.time).getTime() || 0;
    }

    // 楼层号按发帖时间升序
    function floorMap() {
        var map = {};
        state.posts.slice()
            .sort(function (a, b) { return new Date(a.time) - new Date(b.time); })
            .forEach(function (p, i) { map[p.id] = i + 1; });
        return map;
    }

    /* ===================== 渲染 ===================== */
    var expanded = {}; // postId -> true 展开回复区

    function renderStats() {
        var postCount = state.posts.length;
        var replyCount = state.posts.reduce(function (sum, p) {
            return sum + (p.replies ? p.replies.length : 0);
        }, 0);
        var pc = document.getElementById('forumPostCount');
        var rc = document.getElementById('forumReplyCount');
        if (pc) pc.textContent = postCount;
        if (rc) rc.textContent = replyCount;
    }

    function replyHTML(post, reply) {
        return '' +
            '<div class="forum-reply">' +
            '<div class="forum-reply__avatar">' + escapeHtml((reply.author || DEFAULT_AUTHOR).slice(0, 1)) + '</div>' +
            '<div class="forum-reply__body">' +
            '<div class="forum-reply__head">' +
            '<span class="forum-reply__name">' + escapeHtml(reply.author || DEFAULT_AUTHOR) + modBadge(reply.author) + '</span>' +
            '<span class="forum-reply__time">' + formatTime(reply.time) + '</span>' +
            '</div>' +
            '<p class="forum-reply__content">' + escapeHtml(reply.content) + '</p>' +
            '<button type="button" class="forum-like forum-like--sm' + (reply.liked ? ' forum-like--active' : '') + '" ' +
            'data-like-reply="' + post.id + '" data-reply-id="' + reply.id + '">' +
            '<i data-lucide="thumbs-up"></i><span>' + (reply.likes || 0) + '</span>' +
            '</button>' +
            '</div>' +
            '</div>';
    }

    function postHTML(post, floor) {
        var isOpen = !!expanded[post.id];
        var replies = post.replies || [];
        var replyCount = replies.length;

        var repliesBlock = '';
        if (isOpen) {
            var repliesHtml = replyCount
                ? '<div class="forum-replies">' + replies.map(function (r) { return replyHTML(post, r); }).join('') + '</div>'
                : '';
            var formHtml = '' +
                '<form class="forum-reply-form" data-reply-form="' + post.id + '">' +
                '<input type="text" class="forum-input" name="author" placeholder="昵称（选填，默认匿名读者）" maxlength="20">' +
                '<div class="forum-reply-form__row">' +
                '<textarea class="forum-textarea forum-textarea--sm" name="content" placeholder="写下你的回复…" rows="2" maxlength="500" required></textarea>' +
                '<button type="submit" class="btn btn--primary">回复</button>' +
                '</div>' +
                '</form>';
            repliesBlock = '<div class="forum-replies-wrap">' + repliesHtml + formHtml + '</div>';
        }

        return '' +
            '<article class="forum-post" data-id="' + post.id + '">' +
            '<div class="forum-post__head">' +
            '<div class="forum-post__user">' +
            '<div class="forum-post__avatar">' + escapeHtml((post.author || DEFAULT_AUTHOR).slice(0, 1)) + '</div>' +
            '<div class="forum-post__meta">' +
            '<span class="forum-post__name">' + escapeHtml(post.author || DEFAULT_AUTHOR) + modBadge(post.author) + '</span>' +
            '<span class="forum-post__time">' + formatTime(post.time) + '</span>' +
            '</div>' +
            '</div>' +
            '<span class="forum-post__floor">#' + floor + ' 楼</span>' +
            '</div>' +
            '<h3 class="forum-post__title">' + escapeHtml(post.title) + '</h3>' +
            '<p class="forum-post__content">' + escapeHtml(post.content) + '</p>' +
            repliesBlock +
            '<div class="forum-post__actions">' +
            '<button type="button" class="forum-like' + (post.liked ? ' forum-like--active' : '') + '" data-like-post="' + post.id + '">' +
            '<i data-lucide="thumbs-up"></i><span>' + (post.likes || 0) + '</span>' +
            '</button>' +
            '<button type="button" class="forum-action-btn" data-toggle="' + post.id + '">' +
            '<i data-lucide="message-square"></i><span>' + (isOpen ? '收起回复' : replyCount + ' 条回复') + '</span>' +
            '</button>' +
            '</div>' +
            '</article>';
    }

    function renderList() {
        var listEl = document.getElementById('forumList');
        if (!listEl) return;

        var posts = sortedPosts();
        var floors = floorMap();

        if (posts.length === 0) {
            listEl.innerHTML = '<div class="forum-empty">还没有讨论，来发第一帖吧。</div>';
            return;
        }

        listEl.innerHTML = posts.map(function (p) {
            return postHTML(p, floors[p.id]);
        }).join('');

        refreshIcons();
    }

    function renderAll() {
        renderStats();
        renderList();
    }

    /* ===================== 交互 ===================== */
    function toggleLike(target) {
        var btn = target.closest('.forum-like');
        if (!btn) return;

        var postId = btn.getAttribute('data-like-post');
        var replyId = btn.getAttribute('data-like-reply');
        var replyInnerId = btn.getAttribute('data-reply-id');

        var post = findPost(replyId || postId);
        if (!post) return;

        var item;
        if (replyId && replyInnerId) {
            item = (post.replies || []).find(function (r) { return r.id === replyInnerId; });
        } else {
            item = post;
        }
        if (!item) return;

        item.liked = !item.liked;
        item.likes = Math.max(0, (item.likes || 0) + (item.liked ? 1 : -1));
        save();

        // 局部更新按钮，避免整列表重渲染打断输入
        btn.classList.toggle('forum-like--active', !!item.liked);
        var num = btn.querySelector('span');
        if (num) num.textContent = item.likes;

        // 回复数不变，无需更新统计
    }

    function toggleReplies(postId) {
        expanded[postId] = !expanded[postId];
        renderList();
        if (expanded[postId]) {
            // 展开后滚动到该帖
            var el = document.querySelector('.forum-post[data-id="' + postId + '"]');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function addReply(postId, author, content) {
        var post = findPost(postId);
        if (!post) return;
        if (!post.replies) post.replies = [];
        post.replies.push({
            id: uid(),
            author: author,
            content: content,
            time: new Date().toISOString(),
            likes: 0,
            liked: false
        });
        expanded[postId] = true;
        save();
        renderAll();
        showToast('回复已发表');
    }

    function addPost(author, title, content) {
        state.posts.push({
            id: uid(),
            author: author,
            title: title,
            content: content,
            time: new Date().toISOString(),
            likes: 0,
            liked: false,
            replies: []
        });
        save();
        renderAll();
        showToast('讨论已发表');
    }

    var toastTimer = null;
    function showToast(message) {
        var toast = document.createElement('div');
        toast.className = 'forum-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(function () { toast.classList.add('forum-toast--show'); });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove('forum-toast--show');
            setTimeout(function () { toast.remove(); }, 350);
        }, 2200);
    }

    function bindEvents() {
        // 发帖表单
        var postForm = document.getElementById('forumPostForm');
        if (postForm) {
            postForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var author = (document.getElementById('forumAuthor').value || '').trim() || DEFAULT_AUTHOR;
                var titleEl = document.getElementById('forumTitle');
                var contentEl = document.getElementById('forumContent');
                var title = (titleEl.value || '').trim();
                var content = (contentEl.value || '').trim();

                if (!title) { showToast('请填写标题'); titleEl.focus(); return; }
                if (!content) { showToast('请填写内容'); contentEl.focus(); return; }

                addPost(author, title, content);
                postForm.reset();
            });
        }

        // 列表事件委托：点赞 / 展开收起 / 回复提交
        var listEl = document.getElementById('forumList');
        if (!listEl) return;

        listEl.addEventListener('click', function (e) {
            var likeBtn = e.target.closest('.forum-like');
            if (likeBtn) {
                e.preventDefault();
                toggleLike(e.target);
                return;
            }
            var toggleBtn = e.target.closest('[data-toggle]');
            if (toggleBtn) {
                toggleReplies(toggleBtn.getAttribute('data-toggle'));
            }
        });

        listEl.addEventListener('submit', function (e) {
            var form = e.target.closest('[data-reply-form]');
            if (!form) return;
            e.preventDefault();
            var author = (form.querySelector('input[name="author"]').value || '').trim() || DEFAULT_AUTHOR;
            var contentEl = form.querySelector('textarea[name="content"]');
            var content = (contentEl.value || '').trim();
            if (!content) { showToast('请填写回复内容'); return; }
            addReply(form.getAttribute('data-reply-form'), author, content);
        });
    }

    /* ===================== 入口 ===================== */
    function init() {
        if (!document.getElementById('forumPage')) return;
        load();
        renderAll();
        bindEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
