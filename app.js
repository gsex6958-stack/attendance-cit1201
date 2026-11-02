/* My Attendance · CIT 1201 coded prototype
   One student journey: check the remaining absence allowance (SC1, SC2, SC5),
   review records (SC3), understand an excuse under review (SC4) and
   report a wrong record (SC6). Sample data only; nothing is stored or sent. */
(function () {
  'use strict';

  /* ---------- Settings ---------- */
  // Change this to your university's rule (0.25 = absences allowed in up to 25% of lectures).
  var LIMIT_RATE = 0.25;
  // A course is "close to the limit" when this many absences or fewer are left.
  var CLOSE_AT = 2;
  // Time the sample attendance data was last updated.
  var DATA_UPDATED = '2026-11-08T10:00:00+03:00';
  // Simulated network time when sending a report (ms).
  var SEND_DELAY = 900;

  /* ---------- Sample data ---------- */
  function seed() {
    return {
      nextRef: 1042,
      failNext: false,
      drafts: {},
      courses: [
        {
          id: 'cit1201', code: 'CIT 1201', lectures: 28,
          name: { en: 'Human–Computer Interaction', ar: 'تفاعل الإنسان والحاسب' },
          records: [
            { id: 'cit-5', date: '2026-11-02', type: 'counted' },
            { id: 'cit-4', date: '2026-10-26', type: 'review', submitted: '2026-10-27', decisionBy: '2026-11-10' },
            { id: 'cit-3', date: '2026-10-19', type: 'counted' },
            { id: 'cit-2', date: '2026-10-12', type: 'excused' },
            { id: 'cit-1', date: '2026-10-05', type: 'counted' }
          ]
        },
        {
          id: 'math1050', code: 'MATH 1050', lectures: 28,
          name: { en: 'Calculus I', ar: 'التفاضل والتكامل ١' },
          records: [
            { id: 'math-6', date: '2026-11-03', type: 'counted' },
            { id: 'math-5', date: '2026-10-27', type: 'counted' },
            { id: 'math-4', date: '2026-10-20', type: 'counted' },
            { id: 'math-3', date: '2026-10-13', type: 'counted' },
            { id: 'math-2', date: '2026-10-06', type: 'counted' },
            { id: 'math-1', date: '2026-09-29', type: 'counted' }
          ]
        },
        {
          id: 'engl1101', code: 'ENGL 1101', lectures: 28,
          name: { en: 'English Communication I', ar: 'مهارات الاتصال باللغة الإنجليزية ١' },
          records: [
            { id: 'engl-1', date: '2026-10-14', type: 'counted' }
          ]
        },
        {
          id: 'stat1010', code: 'STAT 1010', lectures: 14,
          name: { en: 'Introduction to Statistics', ar: 'مبادئ الإحصاء' },
          records: [
            { id: 'stat-3', date: '2026-10-28', type: 'counted' },
            { id: 'stat-2', date: '2026-10-21', type: 'counted' },
            { id: 'stat-1', date: '2026-10-07', type: 'counted' }
          ]
        }
      ]
    };
  }

  /* ---------- State ---------- */
  var params = new URLSearchParams(location.search);
  var state = seed();
  state.lang = params.get('lang') === 'ar' || params.get('lang') === 'en' ? params.get('lang') : readLang();
  state.testMode = params.has('test');

  function readLang() {
    try { return localStorage.getItem('attendance-lang') === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; }
  }
  function saveLang() {
    try { localStorage.setItem('attendance-lang', state.lang); } catch (e) { /* storage unavailable: language resets on reload */ }
  }

  /* ---------- Formatting ---------- */
  function locale() { return state.lang === 'ar' ? 'ar-u-ca-gregory-nu-arab' : 'en-GB'; }
  function num(n) { return new Intl.NumberFormat(state.lang === 'ar' ? 'ar-u-nu-arab' : 'en-GB').format(n); }
  function asDate(iso) { return new Date(iso + 'T00:00:00Z'); }
  function fmtDate(iso, style) {
    var opts = style === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }
      : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' };
    return new Intl.DateTimeFormat(locale(), opts).format(asDate(iso));
  }
  function leafParts(iso) {
    var d = asDate(iso);
    return {
      day: new Intl.DateTimeFormat(locale(), { day: 'numeric', timeZone: 'UTC' }).format(d),
      mon: new Intl.DateTimeFormat(locale(), { month: 'short', timeZone: 'UTC' }).format(d)
    };
  }
  function fmtUpdated() {
    return new Intl.DateTimeFormat(locale(), {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: 'Asia/Riyadh'
    }).format(new Date(DATA_UPDATED));
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Words ---------- */
  function arLectures(n) {
    if (n === 1) return 'محاضرة واحدة';
    if (n === 2) return 'محاضرتين';
    if (n >= 3 && n <= 10) return num(n) + ' محاضرات';
    return num(n) + ' محاضرة';
  }
  function arMore(n) { return n === 2 ? 'أخريين' : 'أخرى'; }

  var STR = {
    en: {
      appName: 'My Attendance',
      term: 'Fall 2026',
      langButton: 'عربي',
      langButtonLang: 'ar',
      skip: 'Skip to content',
      coursesTitle: 'Your courses',
      coursesIntro: 'How many more lectures you can miss in each course this semester.',
      updated: function (d) { return 'Attendance updated ' + d; },
      left: function (n) { return n + ' left'; },
      reviewCount: function (n) { return n === 1 ? '1 excuse under review' : n + ' excuses under review'; },
      emptyDetail: 'Choose a course to see how many more lectures you can miss.',
      backCourses: 'My courses',
      status: { safe: 'Safe', close: 'Close to limit', limit: 'No absences left' },
      canMiss: function (n) {
        if (n <= 0) return 'You can’t miss any more lectures';
        if (n === 1) return 'You can miss 1 more lecture';
        return 'You can miss ' + n + ' more lectures';
      },
      usedOf: function (u, l) { return u + ' of ' + l + ' allowed absences used.'; },
      includesReview: function (n) { return n === 1 ? 'This includes 1 excuse under review.' : 'This includes ' + n + ' excuses under review.'; },
      stripLabel: function (c, r, left) { return c + ' counted, ' + r + ' under review, ' + left + ' left'; },
      legend: { counted: 'Counted', review: 'Under review', left: 'Left' },
      seeRecords: 'See absence records',
      howTitle: 'How is this worked out?',
      howBody: function (rate, total, limit) {
        return [
          'Your university allows absences in up to ' + rate + '% of lectures. This course has ' + total + ' lectures, so you can be absent from ' + limit + '.',
          'Absences with an accepted excuse do not count. An excuse under review counts until your lecturer decides.'
        ];
      },
      closeTitle: 'Talk to your advisor before your next absence',
      closeBody: function (n) {
        return n === 1
          ? 'One more absence uses your whole allowance. Your academic advisor can help you plan, or check whether an excuse applies.'
          : 'Two more absences use your whole allowance. Your academic advisor can help you plan, or check whether an excuse applies.';
      },
      limitTitle: 'You have used all your allowed absences',
      limitBody: 'Another absence may bar you from the final exam. Contact your academic advisor today.',
      advisorHours: 'Academic advising office: Sunday to Thursday, 8:00 to 14:00.',
      recordsTitle: 'Absence records',
      recordsIntro: function (code) { return 'Every recorded absence in ' + code + ', newest first.'; },
      type: { counted: 'Counted', excused: 'Excused, not counted', review: 'Excuse under review' },
      viewExcuse: 'View excuse',
      somethingWrong: 'Something wrong with this record?',
      reportSentLine: function (ref) { return 'Report sent, reference ' + ref + '. Your lecturer will review it.'; },
      withdraw: 'Withdraw report',
      withdrawn: 'Report withdrawn',
      backRecords: 'Absence records',
      excuseTitle: 'Excuse under review',
      absenceOn: 'Absence on',
      submittedOn: 'Excuse sent',
      decisionBy: 'Decision expected by',
      excuseLead: 'It counts as an absence until your lecturer decides.',
      ifAccepted: function (n) { return 'If accepted: ' + STR.en.canMiss(n).replace('You can', 'you can') + '.'; },
      ifRejected: function (n) { return 'If not accepted: no change, ' + STR.en.canMiss(n).replace('You can', 'you can') + '.'; },
      reportTitle: 'Report a wrong record',
      reportIntro: 'Tell your lecturer what is wrong. The record stays as it is until they review it.',
      whatWrong: 'What is wrong with this record?',
      reasons: { attended: 'I attended this lecture', late: 'I was late, not absent', other: 'Something else' },
      noteLabel: 'Details for your lecturer (optional)',
      noteHint: function (n) { return n + ' of 200 characters'; },
      privacy: 'Your lecturer will see this report.',
      send: 'Send report',
      sending: 'Sending report…',
      cancel: 'Cancel',
      errChoose: 'Choose what is wrong with this record.',
      errSend: 'The report was not sent. Check your connection and send it again. Your answers are kept.',
      sentTitle: 'Report sent',
      reference: 'Reference',
      course: 'Course',
      record: 'Record',
      sentNext: 'Your lecturer will review it within 3 working days. The absence still counts until then.',
      backToRecords: 'Back to absence records',
      footer: 'Prototype for CIT 1201 with sample data only. No real student information is used.',
      testTitle: 'Test settings for the facilitator',
      reset: 'Reset sample data',
      failNext: 'Make the next report fail to send',
      resetDone: 'Sample data reset',
      docTitle: function (t) { return t + ' · My Attendance'; }
    },
    ar: {
      appName: 'حضوري',
      term: 'الفصل الأول ٢٠٢٦',
      langButton: 'English',
      langButtonLang: 'en',
      skip: 'تخطَّ إلى المحتوى',
      coursesTitle: 'مقرراتك',
      coursesIntro: 'عدد المحاضرات التي يمكنك الغياب عنها بعد في كل مقرر هذا الفصل.',
      updated: function (d) { return 'آخر تحديث للحضور ' + d; },
      left: function (n) { return 'المتبقي ' + num(n); },
      reviewCount: function (n) { return n === 1 ? 'عذر واحد قيد المراجعة' : num(n) + ' أعذار قيد المراجعة'; },
      emptyDetail: 'اختر مقرراً لترى عدد المحاضرات التي يمكنك الغياب عنها بعد.',
      backCourses: 'مقرراتي',
      status: { safe: 'آمن', close: 'قريب من الحد', limit: 'لا يوجد غياب متبقٍ' },
      canMiss: function (n) {
        if (n <= 0) return 'لا يمكنك الغياب عن أي محاضرة أخرى';
        return 'يمكنك الغياب عن ' + arLectures(n) + ' ' + arMore(n);
      },
      usedOf: function (u, l) { return 'استخدمت ' + num(u) + ' من ' + num(l) + ' غيابات مسموحة.'; },
      includesReview: function (n) { return n === 1 ? 'يشمل ذلك عذراً واحداً قيد المراجعة.' : 'يشمل ذلك ' + num(n) + ' أعذار قيد المراجعة.'; },
      stripLabel: function (c, r, left) { return 'محسوب ' + num(c) + '، قيد المراجعة ' + num(r) + '، المتبقي ' + num(left); },
      legend: { counted: 'محسوب', review: 'قيد المراجعة', left: 'متبقٍ' },
      seeRecords: 'عرض سجل الغياب',
      howTitle: 'كيف يُحسب هذا؟',
      howBody: function (rate, total, limit) {
        return [
          'تسمح الجامعة بالغياب عن ' + num(rate) + '٪ من المحاضرات كحد أقصى. هذا المقرر فيه ' + num(total) + ' محاضرة، لذلك يمكنك الغياب عن ' + num(limit) + '.',
          'الغياب بعذر مقبول لا يُحسب. العذر قيد المراجعة يُحسب حتى يقرر أستاذ المقرر.'
        ];
      },
      closeTitle: 'تواصل مع مرشدك الأكاديمي قبل غيابك القادم',
      closeBody: function (n) {
        return n === 1
          ? 'غياب واحد آخر يستنفد رصيدك كاملاً. يستطيع مرشدك الأكاديمي مساعدتك في التخطيط أو التحقق من وجود عذر مناسب.'
          : 'غيابان آخران يستنفدان رصيدك كاملاً. يستطيع مرشدك الأكاديمي مساعدتك في التخطيط أو التحقق من وجود عذر مناسب.';
      },
      limitTitle: 'استخدمت كل الغيابات المسموحة',
      limitBody: 'أي غياب إضافي قد يحرمك من الاختبار النهائي. تواصل مع مرشدك الأكاديمي اليوم.',
      advisorHours: 'مكتب الإرشاد الأكاديمي: من الأحد إلى الخميس، من ٨:٠٠ إلى ١٤:٠٠.',
      recordsTitle: 'سجل الغياب',
      recordsIntro: function (code) { return 'كل غياب مسجّل في ' + code + '، الأحدث أولاً.'; },
      type: { counted: 'محسوب', excused: 'بعذر، غير محسوب', review: 'عذر قيد المراجعة' },
      viewExcuse: 'عرض العذر',
      somethingWrong: 'هل يوجد خطأ في هذا السجل؟',
      reportSentLine: function (ref) { return 'تم إرسال البلاغ، المرجع ' + ref + '. سيراجعه أستاذ المقرر.'; },
      withdraw: 'سحب البلاغ',
      withdrawn: 'تم سحب البلاغ',
      backRecords: 'سجل الغياب',
      excuseTitle: 'عذر قيد المراجعة',
      absenceOn: 'تاريخ الغياب',
      submittedOn: 'تاريخ إرسال العذر',
      decisionBy: 'القرار متوقع قبل',
      excuseLead: 'يُحسب غياباً حتى يقرر أستاذ المقرر.',
      ifAccepted: function (n) { return 'إذا قُبل: ' + STR.ar.canMiss(n) + '.'; },
      ifRejected: function (n) { return 'إذا لم يُقبل: لا تغيير، ' + STR.ar.canMiss(n) + '.'; },
      reportTitle: 'الإبلاغ عن سجل خاطئ',
      reportIntro: 'أخبر أستاذ المقرر بالخطأ. يبقى السجل كما هو حتى يراجعه.',
      whatWrong: 'ما الخطأ في هذا السجل؟',
      reasons: { attended: 'حضرت هذه المحاضرة', late: 'تأخرت ولم أغب', other: 'سبب آخر' },
      noteLabel: 'تفاصيل لأستاذ المقرر (اختياري)',
      noteHint: function (n) { return num(n) + ' من ٢٠٠ حرف'; },
      privacy: 'سيطّلع أستاذ المقرر على هذا البلاغ.',
      send: 'إرسال البلاغ',
      sending: 'جارٍ إرسال البلاغ…',
      cancel: 'إلغاء',
      errChoose: 'اختر الخطأ في هذا السجل.',
      errSend: 'لم يُرسل البلاغ. تحقق من الاتصال وأعد الإرسال، إجاباتك محفوظة.',
      sentTitle: 'تم إرسال البلاغ',
      reference: 'المرجع',
      course: 'المقرر',
      record: 'السجل',
      sentNext: 'سيراجعه أستاذ المقرر خلال ٣ أيام عمل، ويبقى الغياب محسوباً حتى ذلك الحين.',
      backToRecords: 'العودة إلى سجل الغياب',
      footer: 'نموذج أولي لمقرر CIT 1201 ببيانات تجريبية فقط، ولا يستخدم أي بيانات حقيقية للطلاب.',
      testTitle: 'إعدادات الاختبار للميسّر',
      reset: 'إعادة البيانات التجريبية',
      failNext: 'اجعل البلاغ التالي يفشل في الإرسال',
      resetDone: 'تمت إعادة البيانات التجريبية',
      docTitle: function (t) { return t + ' · حضوري'; }
    }
  };
  function t(key) {
    var v = STR[state.lang][key];
    if (typeof v === 'function') return v.apply(null, Array.prototype.slice.call(arguments, 1));
    return v;
  }

  /* ---------- Icons (decorative: text always carries the meaning) ---------- */
  function svg(paths, extra) {
    return '<svg class="ico' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }
  var ICON = {
    safe: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.2 9.6"/>'),
    close: svg('<path d="M12 3.6L21.4 20H2.6z"/><path d="M12 10v4.4"/><path d="M12 17.2v.3"/>'),
    limit: svg('<path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z"/><path d="M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2"/>'),
    review: svg('<path d="M7 3h10M7 21h10"/><path d="M8 3v3.6L12 12l4-5.4V3M8 21v-3.6L12 12l4 5.4V21"/>'),
    counted: svg('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9.5 13.5l5 5M14.5 13.5l-5 5"/>'),
    excused: svg('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 15.3l2.2 2.2 4.2-4.3"/>'),
    flag: svg('<path d="M6 21V4M6 4h11.5l-2.4 4 2.4 4H6"/>'),
    back: svg('<path d="M15 5l-7 7 7 7"/>', 'ico--flip'),
    chevron: svg('<path d="M9 5l7 7-7 7"/>'),
    alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4v.3"/>'),
    lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    dash: svg('<path d="M6 12h12"/>')
  };

  /* ---------- Calculations ---------- */
  function summary(course) {
    var limit = Math.floor(course.lectures * LIMIT_RATE);
    var counted = 0, review = 0;
    course.records.forEach(function (r) {
      if (r.type === 'counted') counted += 1;
      if (r.type === 'review') review += 1;
    });
    var used = counted + review;
    var left = Math.max(0, limit - used);
    var status = left <= 0 ? 'limit' : left <= CLOSE_AT ? 'close' : 'safe';
    return { limit: limit, counted: counted, review: review, used: used, left: left, status: status };
  }
  function usedLeaves(course) {
    // Oldest first, so the strip fills from the start like a calendar.
    return course.records.filter(function (r) { return r.type === 'counted' || r.type === 'review'; })
      .slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  var STATUS_ORDER = { limit: 0, close: 1, safe: 2 };

  /* ---------- Routing ---------- */
  function parseRoute() {
    var p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (p[0] !== 'course') return { name: 'list' };
    var course = findCourse(p[1]);
    if (!course) return { name: 'list' };
    if (p[2] !== 'records') return { name: 'course', course: course };
    if (!p[3]) return { name: 'records', course: course };
    var rec = findRecord(course, p[3]);
    if (!rec) return { name: 'records', course: course };
    if (p[4] === 'report') {
      if (p[5] === 'sent' && rec.report) return { name: 'sent', course: course, rec: rec };
      if (rec.report || rec.type === 'excused') return { name: 'records', course: course };
      return { name: 'report', course: course, rec: rec };
    }
    if (rec.type === 'review') return { name: 'excuse', course: course, rec: rec };
    return { name: 'records', course: course };
  }
  function findCourse(id) { return state.courses.filter(function (c) { return c.id === id; })[0]; }
  function findRecord(course, id) { return course.records.filter(function (r) { return r.id === id; })[0]; }
  function href(course, rest) { return '#/course/' + course.id + (rest ? '/' + rest : ''); }

  /* ---------- Pieces ---------- */
  function chip(kind, label) {
    var icon = { safe: ICON.safe, close: ICON.close, limit: ICON.limit, review: ICON.review, counted: ICON.counted, excused: ICON.excused }[kind];
    return '<span class="chip chip--' + kind + '">' + icon + '<span>' + esc(label) + '</span></span>';
  }
  function backLink(target, label, extraClass) {
    return '<a class="back' + (extraClass ? ' ' + extraClass : '') + '" href="' + target + '">' + ICON.back + '<span>' + esc(label) + '</span></a>';
  }
  function courseName(course) { return course.name[state.lang]; }

  /* ---------- Views ---------- */
  function viewList(route) {
    var current = route.course ? route.course.id : null;
    var courses = state.courses.slice().sort(function (a, b) {
      return STATUS_ORDER[summary(a).status] - STATUS_ORDER[summary(b).status];
    });
    var tag = route.name === 'list' ? 'h1' : 'h2';
    var rows = courses.map(function (c) {
      var s = summary(c);
      var note = s.review > 0 ? '<span class="course-note">' + ICON.review + '<span>' + esc(t('reviewCount', s.review)) + '</span></span>' : '';
      return '<li><a class="course-row" href="' + href(c) + '"' + (c.id === current ? ' aria-current="page"' : '') + '>' +
        '<span class="course-code">' + esc(c.code) + '</span>' +
        chip(s.status, t('status')[s.status]) +
        '<span class="course-title">' + esc(courseName(c)) + '</span>' +
        '<span class="course-left">' + esc(t('left', s.left)) + '</span>' +
        note +
        '</a></li>';
    }).join('');
    return '<' + tag + ' class="list-title" id="courses-title" tabindex="-1">' + esc(t('coursesTitle')) + '</' + tag + '>' +
      '<p class="list-intro">' + esc(t('coursesIntro')) + '</p>' +
      '<p class="updated">' + esc(t('updated', fmtUpdated())) + '</p>' +
      '<ul class="courses">' + rows + '</ul>';
  }

  function viewEmpty() {
    return '<div class="empty only-wide">' +
      '<ul class="strip" aria-hidden="true"><li class="leaf leaf--counted"></li><li class="leaf leaf--review"></li><li class="leaf leaf--left"></li><li class="leaf leaf--left"></li></ul>' +
      '<p>' + esc(t('emptyDetail')) + '</p></div>';
  }

  function viewCourse(course) {
    var s = summary(course);
    var leaves = usedLeaves(course).map(function (r) {
      var d = leafParts(r.date);
      return '<li class="leaf leaf--' + (r.type === 'review' ? 'review' : 'counted') + '"><span class="leaf-day">' + esc(d.day) + '</span><span class="leaf-mon">' + esc(d.mon) + '</span></li>';
    });
    for (var i = s.used; i < s.limit; i += 1) leaves.push('<li class="leaf leaf--left"></li>');
    var how = t('howBody', Math.round(LIMIT_RATE * 100), course.lectures, s.limit)
      .map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');

    var callout = '';
    if (s.status === 'close' || s.status === 'limit') {
      callout = '<section class="callout callout--' + s.status + '" aria-labelledby="callout-title">' +
        (s.status === 'close' ? ICON.close : ICON.limit) +
        '<h2 id="callout-title">' + esc(s.status === 'close' ? t('closeTitle') : t('limitTitle')) + '</h2>' +
        '<div><p>' + esc(s.status === 'close' ? t('closeBody', s.left) : t('limitBody')) + '</p>' +
        '<p class="hint">' + esc(t('advisorHours')) + '</p></div>' +
        '</section>';
    }

    return '<article class="detail">' +
      backLink('#/', t('backCourses'), 'only-narrow') +
      '<p class="eyebrow-code">' + esc(course.code) + '</p>' +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(courseName(course)) + '</h1>' +
      '<p class="allowance">' + esc(t('canMiss', s.left)) + '</p>' +
      '<ul class="strip" role="img" aria-label="' + esc(t('stripLabel', s.counted, s.review, s.left)) + '">' + leaves.join('') + '</ul>' +
      '<ul class="legend" aria-hidden="true">' +
        '<li><span class="swatch swatch--counted"></span>' + esc(t('legend').counted) + '</li>' +
        '<li><span class="swatch swatch--review"></span>' + esc(t('legend').review) + '</li>' +
        '<li><span class="swatch swatch--left"></span>' + esc(t('legend').left) + '</li>' +
      '</ul>' +
      '<div class="facts">' +
        '<div class="status-line">' + chip(s.status, t('status')[s.status]) + '<p>' + esc(t('usedOf', s.used, s.limit)) + '</p></div>' +
        (s.review > 0 ? '<p>' + esc(t('includesReview', s.review)) + '</p>' : '') +
        '<p class="muted">' + esc(t('updated', fmtUpdated())) + '</p>' +
      '</div>' +
      callout +
      '<div class="actions"><a class="btn btn--primary" href="' + href(course, 'records') + '">' + esc(t('seeRecords')) + '</a></div>' +
      '<details class="disclosure"><summary>' + ICON.chevron + '<span>' + esc(t('howTitle')) + '</span></summary>' +
        '<div class="disclosure-body">' + how + '</div></details>' +
      '</article>';
  }

  function viewRecords(course) {
    var items = course.records.map(function (r) {
      var actions = '';
      var reportBox = '';
      if (r.report) {
        reportBox = '<p class="record-report">' + ICON.flag + '<span>' + esc(t('reportSentLine', r.report.ref)) + '</span></p>';
        actions = '<div class="record-actions"><button type="button" class="btn-text" data-action="withdraw" data-course="' + course.id + '" data-record="' + r.id + '">' + esc(t('withdraw')) + '</button></div>';
      } else if (r.type === 'review') {
        actions = '<div class="record-actions"><a class="btn-text" href="' + href(course, 'records/' + r.id) + '">' + esc(t('viewExcuse')) + '</a></div>';
      } else if (r.type === 'counted') {
        actions = '<div class="record-actions"><a class="btn-text" href="' + href(course, 'records/' + r.id + '/report') + '">' + esc(t('somethingWrong')) + '</a></div>';
      }
      return '<li class="record">' +
        '<span class="record-date">' + esc(fmtDate(r.date, 'long')) + '</span>' +
        chip(r.type, t('type')[r.type]) +
        reportBox + actions +
        '</li>';
    }).join('');
    return '<article class="detail">' +
      backLink(href(course), course.code) +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('recordsTitle')) + '</h1>' +
      '<p class="page-intro">' + esc(t('recordsIntro', course.code)) + '</p>' +
      '<ol class="records">' + items + '</ol>' +
      '</article>';
  }

  function viewExcuse(course, rec) {
    var s = summary(course);
    return '<article class="detail">' +
      backLink(href(course, 'records'), t('backRecords')) +
      '<p class="eyebrow-code">' + esc(course.code) + '</p>' +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('excuseTitle')) + '</h1>' +
      '<p class="lead">' + esc(t('excuseLead')) + '</p>' +
      '<dl class="keyfacts">' +
        '<div><dt>' + esc(t('absenceOn')) + '</dt><dd>' + esc(fmtDate(rec.date, 'long')) + '</dd></div>' +
        '<div><dt>' + esc(t('submittedOn')) + '</dt><dd>' + esc(fmtDate(rec.submitted, 'long')) + '</dd></div>' +
        '<div><dt>' + esc(t('decisionBy')) + '</dt><dd>' + esc(fmtDate(rec.decisionBy, 'long')) + '</dd></div>' +
      '</dl>' +
      '<div class="outcomes">' +
        '<p class="outcome outcome--yes">' + ICON.check + '<span>' + esc(t('ifAccepted', s.left + 1)) + '</span></p>' +
        '<p class="outcome outcome--no">' + ICON.dash + '<span>' + esc(t('ifRejected', s.left)) + '</span></p>' +
      '</div>' +
      '</article>';
  }

  function viewReport(course, rec) {
    var draft = state.drafts[rec.id] || { reason: '', note: '' };
    var reasons = ['attended', 'late', 'other'].map(function (k) {
      return '<label class="choice"><input type="radio" name="reason" value="' + k + '"' + (draft.reason === k ? ' checked' : '') + '><span>' + esc(t('reasons')[k]) + '</span></label>';
    }).join('');
    return '<article class="detail">' +
      backLink(href(course, 'records'), t('cancel')) +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('reportTitle')) + '</h1>' +
      '<p class="page-intro">' + esc(t('reportIntro')) + '</p>' +
      '<div class="record-card"><span><strong>' + esc(course.code) + '</strong> · ' + esc(fmtDate(rec.date, 'long')) + '</span>' + chip(rec.type, t('type')[rec.type]) + '</div>' +
      '<form class="form" id="report-form" novalidate data-course="' + course.id + '" data-record="' + rec.id + '">' +
        '<div id="send-error" tabindex="-1"></div>' +
        '<fieldset id="reason-group">' +
          '<legend>' + esc(t('whatWrong')) + '</legend>' +
          '<div id="reason-error"></div>' +
          reasons +
        '</fieldset>' +
        '<div>' +
          '<label class="field-label" for="note">' + esc(t('noteLabel')) + '</label>' +
          '<textarea id="note" name="note" maxlength="200" aria-describedby="note-hint">' + esc(draft.note) + '</textarea>' +
          '<p class="hint" id="note-hint">' + esc(t('noteHint', draft.note.length)) + '</p>' +
        '</div>' +
        '<p class="privacy">' + ICON.lock + '<span>' + esc(t('privacy')) + '</span></p>' +
        '<div class="form-actions">' +
          '<button type="submit" class="btn btn--primary" id="send-btn">' + esc(t('send')) + '</button>' +
          '<a class="btn btn--secondary" href="' + href(course, 'records') + '">' + esc(t('cancel')) + '</a>' +
        '</div>' +
      '</form>' +
      '</article>';
  }

  function viewSent(course, rec) {
    return '<article class="detail">' +
      '<div class="sent-mark">' + ICON.check + '</div>' +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('sentTitle')) + '</h1>' +
      '<p class="lead">' + esc(t('sentNext')) + '</p>' +
      '<dl class="keyfacts">' +
        '<div><dt>' + esc(t('reference')) + '</dt><dd class="ref">' + esc(rec.report.ref) + '</dd></div>' +
        '<div><dt>' + esc(t('course')) + '</dt><dd>' + esc(course.code) + '</dd></div>' +
        '<div><dt>' + esc(t('record')) + '</dt><dd>' + esc(fmtDate(rec.date, 'long')) + '</dd></div>' +
      '</dl>' +
      '<div class="actions"><a class="btn btn--primary" href="' + href(course, 'records') + '">' + esc(t('backToRecords')) + '</a></div>' +
      '</article>';
  }

  function viewTestPanel() {
    if (!state.testMode) return '';
    return '<section class="test-panel" aria-labelledby="test-title">' +
      '<h2 id="test-title">' + esc(t('testTitle')) + '</h2>' +
      '<button type="button" class="btn btn--quiet" data-action="reset">' + esc(t('reset')) + '</button>' +
      '<label><input type="checkbox" data-action="fail-next"' + (state.failNext ? ' checked' : '') + '>' + esc(t('failNext')) + '</label>' +
      '</section>';
  }

  /* ---------- Render ---------- */
  var listEl = document.getElementById('course-list');
  var mainEl = document.getElementById('main');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function render(moveFocus) {
    var route = parseRoute();
    var html = document.documentElement;
    html.lang = state.lang;
    html.dir = state.lang === 'ar' ? 'rtl' : 'ltr';

    document.getElementById('brand-name').textContent = t('appName');
    document.getElementById('brand-term').textContent = t('term');
    var toggle = document.getElementById('lang-toggle');
    toggle.textContent = t('langButton');
    toggle.lang = t('langButtonLang');
    document.getElementById('footer-note').textContent = t('footer');
    document.getElementById('test-panel').innerHTML = viewTestPanel();

    var skip = document.getElementById('skip-link');
    skip.textContent = t('skip');
    skip.setAttribute('href', route.name === 'list' ? '#course-list' : '#main');

    document.body.dataset.route = route.name === 'list' ? 'list' : 'detail';
    listEl.innerHTML = viewList(route);

    var title;
    switch (route.name) {
      case 'course': mainEl.innerHTML = viewCourse(route.course); title = route.course.code; break;
      case 'records': mainEl.innerHTML = viewRecords(route.course); title = t('recordsTitle'); break;
      case 'excuse': mainEl.innerHTML = viewExcuse(route.course, route.rec); title = t('excuseTitle'); break;
      case 'report': mainEl.innerHTML = viewReport(route.course, route.rec); title = t('reportTitle'); bindReportForm(); break;
      case 'sent': mainEl.innerHTML = viewSent(route.course, route.rec); title = t('sentTitle'); break;
      default: mainEl.innerHTML = viewEmpty(); title = t('coursesTitle');
    }
    document.title = t('docTitle', title);

    if (moveFocus) {
      var target = route.name === 'list' ? document.getElementById('courses-title') : document.getElementById('view-title');
      if (target) target.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  /* ---------- Report form behaviour ---------- */
  function bindReportForm() {
    var form = document.getElementById('report-form');
    if (!form) return;
    var note = form.querySelector('#note');
    var hint = form.querySelector('#note-hint');
    var recId = form.getAttribute('data-record');

    function keepDraft() {
      var checked = form.querySelector('input[name="reason"]:checked');
      state.drafts[recId] = { reason: checked ? checked.value : '', note: note.value };
    }
    note.addEventListener('input', function () {
      hint.textContent = t('noteHint', note.value.length);
      keepDraft();
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'reason') {
        keepDraft();
        clearReasonError(form);
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      keepDraft();
      submitReport(form);
    });
  }

  function clearReasonError(form) {
    var group = form.querySelector('#reason-group');
    group.classList.remove('has-error');
    form.querySelector('#reason-error').innerHTML = '';
    Array.prototype.forEach.call(form.querySelectorAll('input[name="reason"]'), function (r) {
      r.removeAttribute('aria-invalid');
      r.removeAttribute('aria-describedby');
    });
  }

  function showReasonError(form) {
    var group = form.querySelector('#reason-group');
    group.classList.add('has-error');
    form.querySelector('#reason-error').innerHTML = '<p class="field-error" id="reason-error-text">' + ICON.alert + '<span>' + esc(t('errChoose')) + '</span></p>';
    var radios = form.querySelectorAll('input[name="reason"]');
    Array.prototype.forEach.call(radios, function (r) {
      r.setAttribute('aria-invalid', 'true');
      r.setAttribute('aria-describedby', 'reason-error-text');
    });
    radios[0].focus();
  }

  function submitReport(form) {
    var course = findCourse(form.getAttribute('data-course'));
    var rec = findRecord(course, form.getAttribute('data-record'));
    var draft = state.drafts[rec.id];
    var sendError = form.querySelector('#send-error');
    sendError.innerHTML = '';

    if (!draft.reason) { showReasonError(form); return; }

    var btn = form.querySelector('#send-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>' + esc(t('sending')) + '</span>';
    srAnnounce(t('sending'));

    window.setTimeout(function () {
      if (state.failNext) {
        state.failNext = false;
        document.getElementById('test-panel').innerHTML = viewTestPanel();
        btn.disabled = false;
        btn.textContent = t('send');
        sendError.innerHTML = '<p class="alert" role="alert">' + ICON.alert + '<span>' + esc(t('errSend')) + '</span></p>';
        sendError.focus();
        return;
      }
      rec.report = { ref: 'AT-' + state.nextRef, reason: draft.reason, note: draft.note };
      state.nextRef += 1;
      delete state.drafts[rec.id];
      location.hash = href(course, 'records/' + rec.id + '/report/sent');
    }, SEND_DELAY);
  }

  /* ---------- Toast and screen-reader announcements ---------- */
  function srAnnounce(message) {
    var el = document.getElementById('sr-status');
    el.textContent = '';
    window.setTimeout(function () { el.textContent = message; }, 50);
  }
  function hideToast() {
    window.clearTimeout(toastTimer);
    toastEl.classList.remove('is-visible');
  }
  function announce(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('is-visible'); }, 3000);
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    if (action === 'lang') {
      state.lang = state.lang === 'ar' ? 'en' : 'ar';
      saveLang();
      render(false);
      document.getElementById('lang-toggle').focus();
    } else if (action === 'withdraw') {
      var course = findCourse(el.getAttribute('data-course'));
      var rec = findRecord(course, el.getAttribute('data-record'));
      delete rec.report;
      render(false);
      announce(t('withdrawn'));
      var title = document.getElementById('view-title');
      if (title) title.focus({ preventScroll: true });
    } else if (action === 'reset') {
      var keep = { lang: state.lang, testMode: state.testMode };
      state = seed();
      state.lang = keep.lang;
      state.testMode = keep.testMode;
      location.hash = '#/';
      render(true);
      // Wait for the hash change to finish so the confirmation is not cleared by it.
      window.setTimeout(function () { announce(t('resetDone')); }, 80);
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.getAttribute('data-action') === 'fail-next') state.failNext = e.target.checked;
  });
  window.addEventListener('hashchange', function () { hideToast(); render(true); });

  render(false);
})();
