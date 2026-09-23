/* ============================================
   通用问卷系统
   页面：questionnaire/index.html  样式：questionnaire.css
   数据驱动：QUESTIONNAIRES 配置 → 渲染 → 计分 → 结果
   ============================================ */
(function () {
  'use strict';

  /* ===================== 问卷配置 ===================== */
  /* 通用模板：每个问卷包含
     id / title / subtitle / disclaimer / questions / scoring / results
     question.type: 'choice'（单选）
     scoring: 按 option.value 求和 → 匹配 results 的区间 */
  var QUESTIONNAIRES = [
    {
      id: 'phq9',
      title: '抑郁筛查自评量表（PHQ-9）',
      subtitle: '以下问题涉及你在过去两周内的感受。请根据实际情况选择最符合的选项。',
      disclaimer: '本量表仅供自我了解参考，不能替代专业诊断。如有需要，请咨询心理医生或拨打心理援助热线。',
      estimate: '约 3 分钟',
      backUrl: '../depression/',
      backText: '返回抑郁认知',
      questions: [
        { text: '做事时提不起劲或没有兴趣', options: PHQ9_OPTIONS() },
        { text: '感到心情低落、沮丧或绝望', options: PHQ9_OPTIONS() },
        { text: '入睡困难、睡不安稳或嗜睡', options: PHQ9_OPTIONS() },
        { text: '感觉疲倦或没有活力', options: PHQ9_OPTIONS() },
        { text: '食欲不振或暴饮暴食', options: PHQ9_OPTIONS() },
        { text: '觉得自己很糟糕——或觉得自己很失败，或让自己和家人失望了', options: PHQ9_OPTIONS() },
        { text: '对事物专注有困难，例如阅读报纸或看电视时', options: PHQ9_OPTIONS() },
        { text: '动作或说话速度缓慢到别人已察觉——或正好相反，烦躁或坐立不安、动来动去的情况比平常更严重', options: PHQ9_OPTIONS() },
        { text: '有不如死掉或用某种方式伤害自己的念头', options: PHQ9_OPTIONS() }
      ],
      results: [
        { min: 0, max: 4, level: '无明显抑郁症状', color: 'success', advice: '当前抑郁症状评分在正常范围内。继续保持良好的生活习惯和社交活动。如果情绪有波动，可关注博客相关文章获取调节方法。' },
        { min: 5, max: 9, level: '轻度抑郁', color: 'muted', advice: '可能存在轻度抑郁倾向。建议关注自身情绪变化，尝试规律作息、适度运动，与信任的人交流。可以阅读博客中的相关文章了解自我调节方法。' },
        { min: 10, max: 14, level: '中度抑郁', color: 'warning', advice: '建议尽快咨询心理健康专业人员，获取进一步评估。同时保持基本生活节律，不要独自承受。拨打心理援助热线 400-161-9995 可获得免费咨询。' },
        { min: 15, max: 19, level: '中重度抑郁', color: 'warning', advice: '强烈建议尽快前往精神科或心理科就诊，接受专业评估与治疗。这不是软弱的表现，而是对自己负责。请告诉身边信任的人，让他们陪伴你。' },
        { min: 20, max: 27, level: '重度抑郁', color: 'danger', advice: '请立即寻求专业帮助。前往最近的精神卫生中心或拨打心理援助热线 400-161-9995。如果你有伤害自己的念头，请马上告诉身边的人或拨打危机干预热线。你不是一个人。' }
      ]
    },
    {
      id: 'grief9',
      title: '哀伤情绪自评',
      subtitle: '以下问题涉及近一个月里，失去那个人之后你的感受。没有对错之分，凭直觉选择最接近的一项即可。',
      disclaimer: '本自评改编自延长哀伤相关量表的常见条目，仅供自我了解参考，不能替代专业评估。哀伤没有标准答案，若你感到难以承受，欢迎寻求哀伤辅导或拨打心理援助热线。',
      estimate: '约 3 分钟',
      backUrl: '../grief/',
      backText: '返回悲伤疗愈',
      questions: [
        { text: '我会忍不住反复想起离开的那个人', options: GRIEF_OPTIONS() },
        { text: '我刻意避开会让我想起他/她的地方、物品或话题', options: GRIEF_OPTIONS() },
        { text: '我觉得人生变得空虚，像是缺了一块', options: GRIEF_OPTIONS() },
        { text: '想到这份失去，我会感到苦涩、不甘或愤怒', options: GRIEF_OPTIONS() },
        { text: '我仍然难以相信他/她真的离开了', options: GRIEF_OPTIONS() },
        { text: '我感觉自己的一部分也随着他/她一起离开了', options: GRIEF_OPTIONS() },
        { text: '我难以对其他人敞开心扉，或觉得和周围人疏远了', options: GRIEF_OPTIONS() },
        { text: '我对未来感到渺茫，觉得日子没有了盼头', options: GRIEF_OPTIONS() },
        { text: '这份思念带来的痛苦，让我难以正常工作、学习或生活', options: GRIEF_OPTIONS() }
      ],
      results: [
        { min: 0, max: 5, level: '哀伤反应平稳', color: 'success', advice: '你正在以自己的节奏与这份失去相处。思念偶尔涌起，但它没有把你困住。请继续允许自己想念，也允许自己好好生活——这两者并不矛盾。' },
        { min: 6, max: 11, level: '轻度哀伤反应', color: 'muted', advice: '失去带来的波动还在，但你大体能够维持日常。给自己多一点耐心：哀伤不是需要尽快修好的故障，而是需要时间消化的爱。博客「悲伤疗愈」里的文章或许能陪你走一段。' },
        { min: 12, max: 17, level: '中度哀伤反应', color: 'warning', advice: '这份失去仍然深深影响着你的日常。这不是你不够坚强，而是你爱过、也被爱过的证据。建议找信任的人聊聊，或考虑寻求专业的哀伤辅导，你不必独自扛着。' },
        { min: 18, max: 27, level: '需要关注的哀伤反应', color: 'danger', advice: '近一个月里，哀伤可能已经让你难以正常生活。请认真对待自己的状态：寻求哀伤辅导并不意味着忘记他/她，而是让思念不再以折磨你的方式存在。心理援助热线 400-161-9995 随时有人接听。' }
      ]
    },
    {
      id: 'gad7',
      title: '广泛性焦虑自评量表（GAD-7）',
      subtitle: '以下问题涉及你在过去两周内的感受。请根据实际情况选择最符合的选项。',
      disclaimer: '本量表仅供自我了解参考，不能替代专业诊断。若评分较高或痛苦明显，请咨询心理医生或精神心理科，也可拨打心理援助热线 400-161-9995。',
      estimate: '约 3 分钟',
      backUrl: '../',
      backText: '返回首页',
      questions: [
        { text: '感觉紧张、焦虑或急切', options: PHQ9_OPTIONS() },
        { text: '不能停止或控制担忧', options: PHQ9_OPTIONS() },
        { text: '对各种各样的事情担忧过多', options: PHQ9_OPTIONS() },
        { text: '很难放松下来', options: PHQ9_OPTIONS() },
        { text: '由于不安而无法静坐', options: PHQ9_OPTIONS() },
        { text: '变得容易烦恼或急躁', options: PHQ9_OPTIONS() },
        { text: '感到似乎将有可怕的事情发生而害怕', options: PHQ9_OPTIONS() }
      ],
      results: [
        { min: 0, max: 4, level: '无明显焦虑症状', color: 'success', advice: '你近两周的焦虑水平在正常范围内。偶尔的担心是生活的一部分，继续保持规律作息、适度运动和与他人的联结即可。' },
        { min: 5, max: 9, level: '轻度焦虑', color: 'muted', advice: '你可能正承受轻度焦虑。建议关注睡眠与运动，给自己留出放松时间，可以试试博客文章里介绍过的正念呼吸“刹车”练习。若持续两周以上没有缓解，找信任的人聊聊。' },
        { min: 10, max: 14, level: '中度焦虑', color: 'warning', advice: '焦虑可能已经明显影响到你的日常。建议尽快向心理咨询师或精神心理科寻求专业评估，不要独自硬扛。心理援助热线 400-161-9995 可获得免费咨询。' },
        { min: 15, max: 21, level: '重度焦虑', color: 'danger', advice: '强烈建议尽快前往精神心理科就诊。持续的高度焦虑是可以治疗的，求助不是软弱。如果你同时出现伤害自己的念头，请立即联系身边信任的人或拨打危机干预热线。' }
      ]
    }
  ];

  /* PHQ-9 标准选项（近两周频率） */
  function PHQ9_OPTIONS() {
    return [
      { label: '完全不会', value: 0 },
      { label: '好几天', value: 1 },
      { label: '一半以上的天数', value: 2 },
      { label: '几乎每天', value: 3 }
    ];
  }

  /* 哀伤自评选项（近一个月频率） */
  function GRIEF_OPTIONS() {
    return [
      { label: '从不', value: 0 },
      { label: '偶尔', value: 1 },
      { label: '有时', value: 2 },
      { label: '经常 / 总是', value: 3 }
    ];
  }

  /* ===================== 状态 ===================== */
  var state = {
    quiz: null,         // 当前问卷配置
    answers: [],        // 用户答案：每项是 option.value
    currentStep: 0,     // 当前题号（0-based）
    phase: 'intro',     // intro | quiz | result
    startTime: 0        // 点击「开始测评」的时间戳，用于答题耗时彩蛋
  };

  /* ===================== 工具 ===================== */
  function esc(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getQuizId() {
    var params = new URLSearchParams(location.search);
    return params.get('id') || 'phq9';
  }

  function findQuiz(id) {
    return QUESTIONNAIRES.find(function (q) { return q.id === id; });
  }

  function silentIcons() {
    var _warn = console.warn;
    console.warn = function () { };
    try { if (window.lucide) window.lucide.createIcons(); } finally { console.warn = _warn; }
  }

  /* ===================== 渲染：介绍页 ===================== */
  function renderIntro() {
    var q = state.quiz;
    var root = document.getElementById('quizRoot');
    root.innerHTML =
      '<div class="quiz-intro">' +
      '<span class="quiz-intro__eyebrow">心理测评</span>' +
      '<h1 class="quiz-intro__title">' + esc(q.title) + '</h1>' +
      '<p class="quiz-intro__subtitle">' + esc(q.subtitle) + '</p>' +
      '<div class="quiz-intro__meta">' +
      '<span><i data-lucide="list-ordered"></i> ' + q.questions.length + ' 题</span>' +
      '<span><i data-lucide="clock"></i> ' + esc(q.estimate || '约 3 分钟') + '</span>' +
      '</div>' +
      '<div class="quiz-disclaimer">' +
      '<i data-lucide="info"></i>' +
      '<p>' + esc(q.disclaimer) + '</p>' +
      '</div>' +
      '<button type="button" class="quiz-btn quiz-btn--primary" id="quizStartBtn">开始测评</button>' +
      '<a href="' + (q.backUrl || '../') + '" class="quiz-back">' + esc(q.backText || '返回') + '</a>' +
      '</div>';
    silentIcons();

    document.getElementById('quizStartBtn').addEventListener('click', function () {
      state.phase = 'quiz';
      state.currentStep = 0;
      state.answers = new Array(q.questions.length).fill(null);
      state.startTime = Date.now();
      renderQuestion();
    });
  }

  /* ===================== 渲染：答题页 ===================== */
  function renderQuestion() {
    var q = state.quiz;
    var idx = state.currentStep;
    var total = q.questions.length;
    var question = q.questions[idx];
    var progress = Math.round((idx / total) * 100);

    var root = document.getElementById('quizRoot');
    root.innerHTML =
      '<div class="quiz-test">' +
      '<div class="quiz-progress">' +
      '<div class="quiz-progress__bar" style="width:' + progress + '%"></div>' +
      '</div>' +
      '<div class="quiz-progress__text">第 ' + (idx + 1) + ' / ' + total + ' 题</div>' +
      '<div class="quiz-question">' +
      '<h2 class="quiz-question__text">' + esc(question.text) + '</h2>' +
      '<div class="quiz-options" id="quizOptions">' +
      question.options.map(function (opt, i) {
        var selected = state.answers[idx] === i;
        return '<button type="button" class="quiz-option' + (selected ? ' quiz-option--selected' : '') + '" data-idx="' + i + '">' +
          '<span class="quiz-option__dot"></span>' +
          '<span class="quiz-option__label">' + esc(opt.label) + '</span>' +
          '</button>';
      }).join('') +
      '</div>' +
      '</div>' +
      '<div class="quiz-nav">' +
      (idx > 0 ? '<button type="button" class="quiz-btn quiz-btn--ghost" id="quizPrevBtn">上一题</button>' : '<span></span>') +
      '<button type="button" class="quiz-btn quiz-btn--ghost" id="quizSkipBtn">跳过</button>' +
      '</div>' +
      '</div>';
    silentIcons();

    // 选项点击
    document.querySelectorAll('.quiz-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.answers[idx] = parseInt(btn.dataset.idx, 10);
        // 短暂延迟让选中动画可见
        setTimeout(function () {
          if (state.currentStep < total - 1) {
            state.currentStep++;
            renderQuestion();
          } else {
            state.phase = 'result';
            renderResult();
          }
        }, 200);
      });
    });

    // 上一题
    var prevBtn = document.getElementById('quizPrevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        state.currentStep = Math.max(0, state.currentStep - 1);
        renderQuestion();
      });
    }

    // 跳过（计 0 分）
    document.getElementById('quizSkipBtn').addEventListener('click', function () {
      if (state.answers[idx] === null) state.answers[idx] = 0;
      if (state.currentStep < total - 1) {
        state.currentStep++;
        renderQuestion();
      } else {
        state.phase = 'result';
        renderResult();
      }
    });
  }

  /* ===================== 渲染：结果页 ===================== */
  /* 答题耗时彩蛋：根据分数与耗时给出额外的一句话 */
  function getWhisperLines(score, elapsedMs) {
    var lines = [];
    var under10 = elapsedMs < 10000;
    var under30 = elapsedMs < 30000;
    if (under10) {
      lines.push('你是认真的吗？');
    }
    if (score === 0) {
      lines.push(under10 ? '你看起来很自信。' : '会有很多人羡慕你。');
    }
    if (score >= 24) {
      lines.push(under30 ? '希望你某天会认真对待这个问卷。' : '你真的是认真的吗？如果可以请不要忽视自己。');
    }
    return lines;
  }

  function renderResult() {
    var q = state.quiz;
    var total = state.answers.reduce(function (sum, val, i) {
      return sum + (q.questions[i].options[val] ? q.questions[i].options[val].value : 0);
    }, 0);

    // [ARG] GAD-7 最高档（15-21）：答完最后一题的瞬间不显示结果页，
    // 直接转入一篇「伪造的 id=1 文章」。用 sessionStorage 留一次性标记，
    // 且不写入测评记录——像这份结果从未出现过。
    if (q.id === 'gad7' && total >= 15) {
      try { sessionStorage.setItem('problog_gad_fake', '1'); } catch (e) { }
      location.replace('../article/?id=1');
      return;
    }

    var result = q.results.find(function (r) { return total >= r.min && total <= r.max; })
      || q.results[q.results.length - 1];

    var colorClass = 'quiz-result__score--' + (result.color || 'muted');

    var elapsedMs = state.startTime ? (Date.now() - state.startTime) : 0;
    var whisperLines = getWhisperLines(total, elapsedMs);
    var whisperHtml = whisperLines.length
      ? '<div class="quiz-result__whisper">' +
      whisperLines.map(function (line) { return '<p>' + esc(line) + '</p>'; }).join('') +
      '</div>'
      : '';

    var root = document.getElementById('quizRoot');
    root.innerHTML =
      '<div class="quiz-result">' +
      '<span class="quiz-result__eyebrow">测评完成</span>' +
      '<div class="quiz-result__score ' + colorClass + '">' +
      '<span class="quiz-result__num">' + total + '</span>' +
      '<span class="quiz-result__total">/' + maxScore(q) + '</span>' +
      '</div>' +
      '<h2 class="quiz-result__level">' + esc(result.level) + '</h2>' +
      '<p class="quiz-result__advice">' + esc(result.advice) + '</p>' +
      whisperHtml +
      '<div class="quiz-result__actions">' +
      '<button type="button" class="quiz-btn quiz-btn--ghost" id="quizRetryBtn">重新测评</button>' +
      '<a href="' + (q.backUrl || '../') + '" class="quiz-btn quiz-btn--primary">' + esc(q.backText || '返回') + '</a>' +
      '</div>' +
      '<div class="quiz-result__note">' +
      '<i data-lucide="shield"></i>' +
      '<p>本次测评结果仅保存在你的浏览器本地，不会上传到任何服务器。清除浏览器数据即可删除记录。</p>' +
      '</div>' +
      '</div>';
    silentIcons();

    document.getElementById('quizRetryBtn').addEventListener('click', function () {
      state.phase = 'intro';
      state.currentStep = 0;
      state.answers = [];
      renderIntro();
    });

    // 保存到 localStorage
    try {
      var key = 'problog_quiz_' + q.id;
      var record = { score: total, level: result.level, time: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(record));
    } catch (e) { }
  }

  function maxScore(quiz) {
    return quiz.questions.reduce(function (sum, q) {
      return sum + Math.max.apply(null, q.options.map(function (o) { return o.value; }));
    }, 0);
  }

  /* ===================== 入口 ===================== */
  function boot() {
    var id = getQuizId();
    var quiz = findQuiz(id);
    if (!quiz) {
      document.getElementById('quizRoot').innerHTML =
        '<div class="quiz-intro"><h1 class="quiz-intro__title">未找到该问卷</h1>' +
        '<a href="../" class="quiz-back">返回首页</a></div>';
      return;
    }
    state.quiz = quiz;
    renderIntro();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
