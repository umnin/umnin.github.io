/**
 * 读者讨论区模块（/forum/）
 * - 首次访问写入预设讨论种子，之后用户发帖 / 回复 / 点赞均持久化到 localStorage
 * - 排序：最新回复（或最新发帖）在前
 * - 视觉 token 全部由 forum.css / style.css 提供，本文件只负责 DOM 与交互
 */
(function () {
    'use strict';

    // v3：预设讨论改写为更口语化、带短回复/分歧/楼主更新的拟真种子，旧缓存自动失效
    var STORAGE_KEY = 'pro_blog_forum_v3';
    var DEFAULT_AUTHOR = '匿名读者';
    // 博主名单（与 articles.js 中作者一致），显示"博主"徽章
    var MOD_NAMES = ['冰', '诺夏', '爱桑德'];

    /* ===================== 预设讨论种子 =====================
       拟真原则：长短不一的口语表达、半截话、错别字式随意标点、
       一句话回复、意见相左、楼主隔段时间回来更新、不规整的点赞数。 */
    var PRESET_POSTS = [
        {
            id: 'p1',
            author: '路灯猫',
            title: '在超市闻到我妈用的洗衣液味道，没绷住，太丢人了',
            content: '说出来挺丢人的。\n今天逛超市，路过洗衣液那排，突然闻到我妈以前一直用的那个味道，眼泪直接下来了，就站货架前头，导购过来问我要不要帮忙，我摇头摇得话都讲不出。\n这半年我明明觉得自己快好了。怎么一个味道就把人打回原形啊。。',
            time: '2026-08-28T21:14:00',
            likes: 231,
            liked: false,
            replies: [
                {
                    id: 'p1r1',
                    author: '诺夏',
                    content: '嗅觉那根神经是直连情绪的，不经过脑子，所以真不是你不争气……后来那瓶你买了吗',
                    time: '2026-08-28T21:40:00',
                    likes: 73,
                    liked: false
                },
                {
                    id: 'p1r2',
                    author: '匿名读者',
                    content: '我爸的烟味。走后第三年，有位大爷抽旱烟，我当场就不行了，幸好没人看我。这种瞬间不会消失的，就是间隔会变长',
                    time: '2026-08-29T08:40:00',
                    likes: 52,
                    liked: false
                },
                {
                    id: 'p1r3',
                    author: '大雾',
                    content: '我是某首歌，前奏一响直接不行，哎',
                    time: '2026-08-29T12:15:00',
                    likes: 18,
                    liked: false
                },
                {
                    id: 'p1r4',
                    author: '路灯猫',
                    content: '回来更新一下，评论我都看了，谢谢你们。后来买了，买了两瓶，拎回家路上又哭了一次，但这次哭完没那么空了',
                    time: '2026-08-30T20:05:00',
                    likes: 96,
                    liked: false
                }
            ]
        },
        {
            id: 'p2',
            author: '七月的雨',
            title: '确诊中度抑郁，不敢跟家里说，有人说过吗，说完啥后果',
            content: '上周拿到的结果，中度，开了药，让配合咨询。\n不敢告诉我爸妈。我妈肯定要说我"想太多""太闲了"，我爸更别提，他只会觉得丢人。\n现在就是白天照常上班，回房间躺着，澡都不想洗。到底说不说啊。',
            time: '2026-08-25T02:31:00',
            likes: 187,
            liked: false,
            replies: [
                {
                    id: 'p2r1',
                    author: '冰',
                    content: '我建议你现在最好不要说，当然你要说也可以，遭受反感是一方面，另一方面，你自己的病，不用先拿到谁的许可才能治。爱怎样怎样吧，大不了做仇人',
                    time: '2026-08-25T09:12:00',
                    likes: 104,
                    liked: false
                },
                {
                    id: 'p2r2',
                    author: '摆渡',
                    content: '我当时赌了一把说了，我妈三天没理我，第四天端了碗汤放我门口，还是没说话。她估计那三天自己在消化。不过这个真的看家庭，有人赌赢有人赌输',
                    time: '2026-08-25T14:20:00',
                    likes: 47,
                    liked: false
                },
                {
                    id: 'p2r3',
                    author: '匿名读者',
                    content: '劝你慎重。我说了，第二天我舅我姨全知道了，轮流来电话让我"想开点"，药还逼我扔了。我到现在都后悔',
                    time: '2026-08-25T23:47:00',
                    likes: 38,
                    liked: false
                },
                {
                    id: 'p2r4',
                    author: '月雨',
                    content: '看完更纠结了哈哈哈。算了，先瞒着吃药吧，至少心头好受些',
                    time: '2026-08-26T07:33:00',
                    likes: 61,
                    liked: false
                },
                {
                    id: 'p2r5',
                    author: '冰',
                    content: '大不了做仇人，看自己吧',
                    time: '2026-08-26T08:01:00',
                    likes: 44,
                    liked: false
                }
            ]
        },
        {
            id: 'p3',
            author: '摆渡',
            title: '正念满一个月，来还个愿（不卖课）',
            content: '开头五分钟都坐不住，脑子比平时还吵，一度怀疑智商税。\n第二周勉强能盯住呼吸，情绪一点没变，差点放弃。\n第三周有天加班被骂惨，回家路上气得发抖，然后突然发现自己在"看着"自己生气，而不是陷在气里面……说不上来，就是中间有条缝。\n它不会让痛苦消失，但那条缝是真的。给坐不住的人打个气。',
            time: '2026-08-20T19:45:00',
            likes: 142,
            liked: false,
            replies: [
                {
                    id: 'p3r1',
                    author: '爱桑德',
                    content: '不卖课？真的假的',
                    time: '2026-08-20T22:18:00',
                    likes: 35,
                    liked: false
                },
                {
                    id: 'p3r2',
                    author: '风夜',
                    content: '楼主用的啥引导啊，我每次坐下脑子里就开始点外卖',
                    time: '2026-08-21T16:30:00',
                    likes: 27,
                    liked: false
                },
                {
                    id: 'p3r3',
                    author: '摆渡',
                    content: '回楼上：就免费app里随便挑的，挑个声音你听得下去的就行，别花钱',
                    time: '2026-08-21T17:02:00',
                    likes: 9,
                    liked: false
                },
                {
                    id: 'p3r4',
                    author: '匿名读者',
                    content: '泼个冷水，这因人而异，前排别抱太大期望',
                    time: '2026-08-22T01:12:00',
                    likes: 13,
                    liked: false
                },
                {
                    id: 'p3r5',
                    author: '爱桑德',
                    content: '能找到对自己合适的方法就是最好的',
                    time: '2026-08-22T09:40:00',
                    likes: 21,
                    liked: false
                }
            ]
        },
        {
            id: 'p4',
            author: '无风的夜',
            title: '求书，丧亲之后看的，不要鸡汤，谢谢',
            content: '我爸去年冬天走的。\n不要"一切都会好起来""时间治愈一切"那种，真的看不下去，有点想呕。\n想要诚实点的。',
            time: '2026-08-15T22:10:00',
            likes: 89,
            liked: false,
            replies: [
                {
                    id: 'p4r1',
                    author: '冰',
                    content: '琼·狄迪恩《奇想之年》，库布勒·罗斯《论死亡与临终》',
                    time: '2026-08-16T08:50:00',
                    likes: 67,
                    liked: false
                },
                {
                    id: 'p4r2',
                    author: '路灯猫',
                    content: '奇想之年+1，哭完会轻一点，虽然说不上来为啥',
                    time: '2026-08-16T21:33:00',
                    likes: 24,
                    liked: false
                },
                {
                    id: 'p4r3',
                    author: '月雨',
                    content: '讨论区甩两本书就走的最狠了',
                    time: '2026-08-17T13:22:00',
                    likes: 6,
                    liked: false
                },
                {
                    id: 'p4r4',
                    author: '诺夏',
                    content: '《爱丽丝梦游游记》',
                    time: '2026-08-17T14:05:00',
                    likes: 11,
                    liked: false
                },
                {
                    id: 'p4r5',
                    author: '冰',
                    content: '这算什么？',
                    time: '2026-08-17T14:05:04',
                    likes: 13,
                    liked: false
                },
                {
                    id: 'p4r6',
                    author: '诺夏',
                    content: '童话',
                    time: '2026-08-17T14:05:04',
                    likes: 13,
                    liked: false
                }
            ]
        },
        {
            id: 'p5',
            author: '大雾',
            title: '四个月了情绪不正常，正常吗',
            content: '奶奶走四个月。\n白天好好的，半夜突然开始复盘：那天我要是坚持送她去医院呢？医生是不是耽误了？越想越清醒。\n文章里说阶段不是线性的，道理我都懂，但自己弹成这样还是慌。。',
            time: '2026-08-10T03:02:00',
            likes: 156,
            liked: false,
            replies: [
                {
                    id: 'p5r1',
                    author: '诺夏',
                    content: '知道是一回事，经历是另一回事。横跳才是常态，直线走完五个阶段的我现实里一个没见过。那些半夜冒出来的"如果当初"，其实是你大脑在拼命想把一件不讲理的事讲出道理——它找不到答案的，但得给它点时间接受"找不到"',
                    time: '2026-08-10T03:40:00',
                    likes: 78,
                    liked: false
                },
                {
                    id: 'p5r2',
                    author: '月雨',
                    content: '十个月的在这，还在想。看到楼主突然不孤单了……',
                    time: '2026-08-10T09:15:00',
                    likes: 33,
                    liked: false
                },
                {
                    id: 'p5r3',
                    author: '匿名读者',
                    content: '一年半，只有偶尔还想，频率低多了',
                    time: '2026-08-10T11:48:00',
                    likes: 41,
                    liked: false
                },
                {
                    id: 'p5r4',
                    author: '大雾',
                    content: '凌晨三点发的，发完哭了一场居然睡着了，醒来看见这些回复。谢谢，我慢慢来吧',
                    time: '2026-08-10T18:26:00',
                    likes: 29,
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
