/* My Attendance by Group 6 · CIT 1201 coded prototype
   One student journey: sign in, see how many more lectures you can miss under the
   University of Tabuk absence rules, submit an excuse for an absence and track the
   decision, or report a record made by mistake. Facilitators can record usability-test
   results on the evaluation page. Sample data only. Nothing is uploaded or sent
   anywhere, and the sign-in is not real security. */
(function () {
  'use strict';

  /* ---------- Settings ---------- */
  // Absence rules as shown in myUT (University of Tabuk):
  // barred if absences without an excuse exceed 20% of lectures,
  // or if all absences (without excuse + with excuse + times late) exceed 35%.
  var UNEXCUSED_RATE = 0.20;
  var TOTAL_RATE = 0.35;
  // A course is "close to the limit" when this many absences or fewer are left.
  var CLOSE_AT = 2;
  // Time the sample attendance data was last updated, and dates used for new excuses.
  var DATA_UPDATED = '2026-11-08T10:00:00+03:00';
  var TODAY = '2026-11-08';
  var DECISION_DAYS = 7;
  // Simulated network times (ms).
  var SEND_DELAY = 900;
  var SIGNIN_DELAY = 500;
  // Shared password for the Group 6 sample accounts. A prototype only: not real security.
  var PASSWORD = 'group6';
  // Name of the simulated attachment. Nothing is uploaded.
  var SAMPLE_FILE = 'medical-report.pdf';

  // Group 6 accounts. Sign in with the first name in English or Arabic.
  var ACCOUNTS = [
    { id: 'omar', names: ['omar', 'عمر'], first: { en: 'Omar', ar: 'عمر' }, full: { en: 'Omar Al-Kuwaikbi', ar: 'عمر المديغم الكويكبي' } },
    { id: 'bassam', names: ['bassam', 'basam', 'بسام'], first: { en: 'Bassam', ar: 'بسام' }, full: { en: 'Bassam Al-Anazi', ar: 'بسام العنزي' } },
    { id: 'faris', names: ['faris', 'fares', 'فارس'], first: { en: 'Faris', ar: 'فارس' }, full: { en: 'Faris Al-Anazi', ar: 'فارس العنزي' } },
    { id: 'faisal', names: ['faisal', 'faysal', 'فيصل'], first: { en: 'Faisal', ar: 'فيصل' }, full: { en: 'Faisal Al-Mashhouri Al-Huwaiti', ar: 'فيصل المشهوري الحويطي' } },
    { id: 'mohammed', names: ['mohammed', 'mohammad', 'muhammad', 'mohamed', 'محمد'], first: { en: 'Mohammed', ar: 'محمد' }, full: { en: 'Mohammed Al-Salmani Al-Faifi', ar: 'محمد السلماني الفيفي' } },
    { id: 'musaed', names: ['musaed', 'mosaed', 'musaad', 'مساعد'], first: { en: 'Musaed', ar: 'مساعد' }, full: { en: 'Musaed Al-Fakhiri', ar: 'مساعد الفاخري' } }
  ];
  var GUEST = { id: 'guest', guest: true, first: { en: '', ar: '' }, full: { en: 'Sample student', ar: 'طالب تجريبي' } };

  var KEY = {
    user: 'group6-user',
    lastName: 'group6-last-username',
    lang: 'group6-lang',
    large: 'group6-large-text',
    evals: 'group6-evaluation-records'
  };

  /* ---------- Storage (wrapped: storage can be blocked or unavailable) ---------- */
  function storage(kind) {
    try { return kind === 'session' ? window.sessionStorage : window.localStorage; } catch (e) { return null; }
  }
  function readItem(kind, key) {
    var s = storage(kind);
    if (!s) return null;
    try { return s.getItem(key); } catch (e) { return null; }
  }
  function writeItem(kind, key, value) {
    var s = storage(kind);
    if (!s) return false;
    try {
      if (value === null) s.removeItem(key); else s.setItem(key, value);
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Sample data ----------
     Record types: absent (without excuse), review (excuse under review: counts as
     without excuse until decided), excused (accepted excuse), late. */
  function seed() {
    return {
      nextRef: 1042,
      nextExcuse: 2081,
      failNext: false,
      drafts: {},
      excuseDrafts: {},
      courses: [
        {
          id: 'cit1201', code: 'CIT 1201', lectures: 30,
          name: { en: 'Human–Computer Interaction', ar: 'تفاعل الإنسان والحاسب' },
          records: [
            { id: 'cit-5', date: '2026-11-02', type: 'absent' },
            { id: 'cit-4', date: '2026-10-26', type: 'review', excuse: { ref: 'EX-2077', reason: 'medical', file: SAMPLE_FILE, submitted: '2026-10-27', decisionBy: '2026-11-10' } },
            { id: 'cit-3', date: '2026-10-19', type: 'absent' },
            { id: 'cit-2', date: '2026-10-12', type: 'excused' },
            { id: 'cit-1', date: '2026-10-05', type: 'late' }
          ]
        },
        {
          id: 'math1050', code: 'MATH 1050', lectures: 30,
          name: { en: 'Calculus I', ar: 'التفاضل والتكامل ١' },
          records: [
            { id: 'math-5', date: '2026-11-03', type: 'absent' },
            { id: 'math-4', date: '2026-10-27', type: 'absent' },
            { id: 'math-3', date: '2026-10-20', type: 'absent' },
            { id: 'math-2', date: '2026-10-13', type: 'absent' },
            { id: 'math-1', date: '2026-10-06', type: 'absent' }
          ]
        },
        {
          id: 'engl1101', code: 'ENGL 1101', lectures: 30,
          name: { en: 'English Communication I', ar: 'مهارات الاتصال باللغة الإنجليزية ١' },
          records: [
            { id: 'engl-3', date: '2026-10-28', type: 'late' },
            { id: 'engl-2', date: '2026-10-14', type: 'absent' },
            { id: 'engl-1', date: '2026-09-30', type: 'late' }
          ]
        },
        {
          id: 'stat1010', code: 'STAT 1010', lectures: 15,
          name: { en: 'Introduction to Statistics', ar: 'مبادئ الإحصاء' },
          records: [
            { id: 'stat-3', date: '2026-10-28', type: 'absent' },
            { id: 'stat-2', date: '2026-10-21', type: 'absent' },
            { id: 'stat-1', date: '2026-10-07', type: 'absent' }
          ]
        }
      ]
    };
  }

  /* ---------- State ---------- */
  var params = new URLSearchParams(location.search);
  var state = seed();
  state.lang = params.get('lang') === 'ar' || params.get('lang') === 'en'
    ? params.get('lang')
    : (readItem('local', KEY.lang) === 'ar' ? 'ar' : 'en');
  state.testMode = params.has('test');
  state.user = accountById(readItem('session', KEY.user));
  state.largeText = readItem('local', KEY.large) === '1';
  state.menuOpen = false;
  state.loginFails = 0;
  state.evals = loadEvals();
  state.evalParticipant = '';

  function accountById(id) {
    if (!id) return null;
    if (id === GUEST.id) return GUEST;
    return ACCOUNTS.filter(function (a) { return a.id === id; })[0] || null;
  }
  function normaliseName(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }
  function accountByName(name) {
    var n = normaliseName(name);
    return ACCOUNTS.filter(function (a) {
      return a.names.some(function (x) { return normaliseName(x) === n; });
    })[0] || null;
  }

  /* ---------- Formatting ---------- */
  function locale() { return state.lang === 'ar' ? 'ar-u-ca-gregory-nu-arab' : 'en-GB'; }
  function num(n) { return new Intl.NumberFormat(state.lang === 'ar' ? 'ar-u-nu-arab' : 'en-GB').format(n); }
  function asDate(iso) { return new Date(iso + 'T00:00:00Z'); }
  function addDays(iso, days) {
    var d = asDate(iso);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
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
  function fmtStamp(iso) {
    return new Intl.DateTimeFormat(locale(), {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(iso));
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
  function enList(parts) {
    if (parts.length <= 1) return parts.join('');
    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }

  var STR = {
    en: {
      appName: 'My Attendance',
      byGroup: 'By Group 6',
      langButton: 'عربي',
      langButtonLang: 'ar',
      skip: 'Skip to content',

      /* Sign in */
      loginStatement: 'Know how many more lectures you can miss, and get your excuse counted in time.',
      loginTitle: 'Sign in',
      loginIntro: 'Use your Group 6 account to see your courses.',
      username: 'Username',
      usernameHint: 'Your first name, in English or Arabic.',
      password: 'Password',
      show: 'Show',
      hide: 'Hide',
      showLabel: 'Show password',
      hideLabel: 'Hide password',
      capsOn: 'Caps Lock is on.',
      signIn: 'Sign in',
      signingIn: 'Signing in…',
      errUser: 'Enter your username.',
      errPass: 'Enter your password.',
      errWrong: 'The username or password is not correct. Check both and try again.',
      errWrongHelp: 'Still not working? Use the sample student account below, or ask a Group 6 member for the password.',
      or: 'or',
      guestButton: 'Try the sample student account',
      loginNote: 'A Group 6 student design project. It is not a University of Tabuk service, so never enter your university password here.',
      aboutLink: 'About this prototype',
      welcome: function (name) { return name ? 'Signed in as ' + name : 'Signed in with the sample account'; },

      /* Account */
      account: 'Account menu',
      signedInAs: 'Signed in as',
      largeText: 'Larger text',
      evaluationLink: 'Evaluation record',
      signOut: 'Sign out',
      signedOut: 'You are signed out',

      /* Courses */
      term: 'First semester 2026',
      coursesTitle: 'Your courses',
      hello: function (name) { return name ? 'Hello, ' + name + '.' : 'Hello.'; },
      coursesIntro: 'Here is how many more lectures you can miss in each course this semester.',
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
      bindingUnexcused: 'Counted against the limit for absences without an excuse.',
      bindingTotal: 'Counted against the limit for all absences, which includes excused absences and lateness.',
      unexcusedLine: function (u, l) { return 'Without an excuse: ' + u + ' of ' + l + ' allowed absences used.'; },
      totalLine: function (u, l) { return 'All absences: ' + u + ' of ' + l + ' allowed used.'; },
      breakdown: function (c) {
        var parts = [];
        if (c.absent) parts.push(c.absent + ' without excuse');
        if (c.review) parts.push(c.review + ' under review');
        if (c.excused) parts.push(c.excused + ' excused');
        if (c.late) parts.push(c.late + ' late');
        return parts.length ? 'That is ' + enList(parts) + '.' : '';
      },
      withExcuseHint: function (n) { return 'If your excuses are accepted, you could miss up to ' + n + ' more in total. Until they are decided, the number at the top is your limit.'; },
      excusableLine: function (n) { return n === 1 ? '1 absence without an excuse can still be excused.' : n + ' absences without an excuse can still be excused.'; },
      trackReviewLink: function (n) { return n === 1 ? 'Track the excuse under review' : 'Track the excuses under review'; },
      includesReview: function (n) { return n === 1 ? '1 excuse is under review and counts as without an excuse until it is decided.' : n + ' excuses are under review and count as without an excuse until they are decided.'; },
      stripLabel: function (a, r, left) { return 'Without an excuse: ' + a + ' counted, ' + r + ' under review, ' + left + ' left'; },
      meterLabel: function (u, l) { return 'All absences: ' + u + ' of ' + l + ' used'; },
      legend: { absent: 'Without excuse', review: 'Under review', excused: 'Excused', late: 'Late', left: 'Left' },
      unexcusedTitle: 'Without an excuse',
      totalTitle: 'All absences',
      seeRecords: 'See absence records',
      howTitle: 'How is this worked out?',
      howBody: function (total, unexLimit, totalLimit) {
        return [
          'The University of Tabuk bars a student from a course if absences without an excuse exceed 20% of lectures, or if all absences exceed 35%. All absences means absences without an excuse, plus absences with an excuse, plus the number of times late.',
          'This course has ' + total + ' lectures, so you can be absent without an excuse up to ' + unexLimit + ' times, and up to ' + totalLimit + ' times in total.',
          'An excuse under review counts as without an excuse until the committee decides.'
        ];
      },
      closeTitle: 'Act before your next absence',
      closeBody: function (n) {
        return (n === 1 ? 'One more absence without an excuse uses your whole allowance.' : 'Two more absences without an excuse use your whole allowance.') +
          ' If you had a valid reason for a recent absence, submit an excuse now. Your academic advisor can also help you plan.';
      },
      limitTitle: 'You have no absences left',
      limitBody: 'Another absence without an excuse may bar you from the final exam. If you had a valid reason for a recent absence, submit an excuse now and contact your academic advisor today.',
      advisorHours: 'Academic advising office: Sunday to Thursday, 8:00 to 14:00.',
      calloutAction: 'Submit an excuse from your absence records',

      /* Records */
      recordsTitle: 'Absence records',
      recordsIntro: function (code) { return 'Every absence and late arrival recorded in ' + code + ', newest first.'; },
      type: { absent: 'Without excuse', excused: 'Excused', review: 'Excuse under review', late: 'Late' },
      submitExcuseLink: 'Submit an excuse',
      trackLink: 'Track excuse',
      mistake: 'Recorded by mistake?',
      reportSentLine: function (ref) { return 'Report sent, reference ' + ref + '. Your lecturer will review it.'; },
      withdraw: 'Withdraw report',
      withdrawn: 'Report withdrawn',
      backRecords: 'Absence records',

      /* Submit an excuse */
      excuseFormTitle: 'Submit an excuse',
      excuseFormIntro: 'Your lecturer and the excuses committee will review it. You can follow the decision here.',
      reasonLegend: 'Reason for the absence',
      excuseReasons: { medical: 'Medical', family: 'Family emergency', official: 'Official university activity', other: 'Other' },
      docLabel: 'Supporting document',
      docHint: 'For example a medical report or an official letter.',
      attach: 'Attach document',
      sampleNote: 'Sample file. Nothing is uploaded in this prototype.',
      removeFile: 'Remove',
      fileRemoved: 'Document removed',
      excuseNoteLabel: 'Note for the committee (optional)',
      excusePrivacy: 'Your lecturer and the excuses committee will see this excuse and its document.',
      submitExcuse: 'Submit excuse',
      submittingExcuse: 'Submitting excuse…',
      errReason: 'Choose the reason for the absence.',
      errDoc: 'Attach a supporting document.',
      errExcuseSend: 'The excuse was not submitted. Check your connection and submit it again. Your answers are kept.',
      excuseSentTitle: 'Excuse submitted',
      excuseSentLead: function (d) { return 'The excuses committee should decide by ' + d + '. Until then, this absence counts as without an excuse.'; },
      trackExcuse: 'Track this excuse',

      /* Excuse status */
      excuseTitle: 'Excuse under review',
      excuseLead: 'You do not need to do anything now. It counts as an absence without an excuse until the committee decides.',
      stepSent: 'Excuse submitted',
      stepReview: 'Review by the excuses committee',
      stepDecision: 'Decision',
      inProgress: 'In progress',
      expectedBy: function (d) { return 'Expected by ' + d; },
      absenceOn: 'Absence on',
      reasonLabel: 'Reason',
      reference: 'Reference',
      ifAccepted: function (n) { return 'If accepted: ' + STR.en.canMiss(n).replace('You can', 'you can') + '.'; },
      ifRejected: function (n) { return 'If not accepted: no change, ' + STR.en.canMiss(n).replace('You can', 'you can') + '. The committee’s reason will appear here.'; },

      /* Report a record made by mistake */
      reportTitle: 'Report a record made by mistake',
      reportIntro: 'Tell your lecturer what is wrong. The record stays as it is until they review it.',
      whatWrong: 'What is wrong with this record?',
      reasons: { attended: 'I attended this lecture on time', late: 'I was late, not absent', other: 'Something else' },
      noteLabel: 'Details for your lecturer (optional)',
      noteHint: function (n) { return n + ' of 200 characters'; },
      privacy: 'Your lecturer will see this report.',
      send: 'Send report',
      sending: 'Sending report…',
      cancel: 'Cancel',
      errChoose: 'Choose what is wrong with this record.',
      errSend: 'The report was not sent. Check your connection and send it again. Your answers are kept.',
      sentTitle: 'Report sent',
      course: 'Course',
      record: 'Record',
      sentNext: 'Your lecturer will review it within 3 working days. The absence still counts until then.',
      backToRecords: 'Back to absence records',

      /* About */
      aboutTitle: 'About this prototype',
      aboutBody: 'My Attendance helps a University of Tabuk student see how many more lectures they can miss before being barred, submit an excuse for an absence and follow the decision in one place. Group 6 designed it for CIT 1201 Human–Computer Interaction, using the absence rules shown in myUT.',
      teamTitle: 'Group 6',
      dataNote: 'All courses, dates, absences and excuses are sample data. This is a student design project, not a university service, and it is not connected to any university system.',
      backSignIn: 'Sign in',

      /* Evaluation record */
      evalTitle: 'Evaluation record',
      evalIntro: 'For the facilitator and observer. Record one entry for each task a participant attempts.',
      evalPrivacy: 'Use participant codes only, never names. Records stay in this browser until you download or clear them.',
      evalNoStorage: 'This browser is not keeping records between visits. Download the CSV before closing the page.',
      participant: 'Participant code',
      choose: 'Choose',
      task: 'Task',
      tasks: { T1: 'T1 Remaining absences', T2: 'T2 Submit an excuse', T3: 'T3 Track an excuse' },
      outcome: 'Outcome',
      outcomes: { success: 'Success without help', helped: 'Success with help', failed: 'Not completed' },
      errors: 'Errors',
      errorsHint: 'Wrong taps or paths the participant had to undo.',
      help: 'Help given (when and why)',
      satisfaction: 'Satisfaction: “How satisfied were you?”',
      scale: ['Very dissatisfied', 'Dissatisfied', 'Neither', 'Satisfied', 'Very satisfied'],
      comment: '“What felt reassuring or frustrating?” (their words)',
      observation: 'What you observed',
      saveRecord: 'Save record',
      saved: 'Record saved',
      errParticipant: 'Choose a participant code.',
      errTask: 'Choose a task.',
      errOutcome: 'Choose an outcome.',
      errSat: 'Choose a satisfaction score.',
      summaryTitle: 'Summary by task',
      summaryNote: 'Each rate uses attempts on the same task as its denominator. Two or three peers cannot show that the design works for everyone.',
      colTask: 'Task', colAttempts: 'Attempts', colSuccess: 'Without help', colHelped: 'With help', colFailed: 'Not completed', colSat: 'Average satisfaction',
      ofAttempts: function (n, d) { return d ? n + ' of ' + d + ' (' + Math.round(n / d * 100) + '%)' : '–'; },
      recordsListTitle: 'Records',
      noRecords: 'No records yet. Saved entries appear here.',
      download: 'Download CSV',
      clearAll: 'Clear all records',
      confirmClear: 'Select again to clear all',
      cleared: 'All records cleared',
      remove: 'Delete',
      confirmRemove: 'Select again to delete',
      removed: 'Record deleted',
      recorded: 'Recorded',
      satShort: 'Satisfaction',

      /* Footer and test panel */
      footer: 'Designed by Group 6 for CIT 1201. Sample data only; no real student information is used.',
      testTitle: 'Test settings for the facilitator',
      reset: 'Reset sample data',
      failNext: 'Make the next submission fail',
      resetDone: 'Sample data reset',
      docTitle: function (t) { return t + ' · My Attendance'; }
    },
    ar: {
      appName: 'حضوري',
      byGroup: 'من تصميم المجموعة ٦',
      langButton: 'English',
      langButtonLang: 'en',
      skip: 'تخطَّ إلى المحتوى',

      loginStatement: 'اعرف كم محاضرة تقدر تغيب عنها بعد، وخلّ عذرك ينحسب في وقته.',
      loginTitle: 'تسجيل الدخول',
      loginIntro: 'ادخل بحساب المجموعة ٦ لترى مقرراتك.',
      username: 'اسم المستخدم',
      usernameHint: 'اسمك الأول، بالعربي أو الإنجليزي.',
      password: 'كلمة المرور',
      show: 'إظهار',
      hide: 'إخفاء',
      showLabel: 'إظهار كلمة المرور',
      hideLabel: 'إخفاء كلمة المرور',
      capsOn: 'زر الأحرف الكبيرة (Caps Lock) مفعّل.',
      signIn: 'دخول',
      signingIn: 'جارٍ الدخول…',
      errUser: 'اكتب اسم المستخدم.',
      errPass: 'اكتب كلمة المرور.',
      errWrong: 'اسم المستخدم أو كلمة المرور غير صحيحة. تحقق منهما وحاول مرة أخرى.',
      errWrongHelp: 'ما زالت المشكلة؟ ادخل بحساب الطالب التجريبي أدناه، أو اطلب كلمة المرور من أحد أعضاء المجموعة ٦.',
      or: 'أو',
      guestButton: 'جرّب حساب الطالب التجريبي',
      loginNote: 'مشروع تصميم طلابي من المجموعة ٦، وليس خدمة من جامعة تبوك. لا تُدخل كلمة مرور الجامعة هنا أبداً.',
      aboutLink: 'عن هذا النموذج',
      welcome: function (name) { return name ? 'تم الدخول باسم ' + name : 'تم الدخول بالحساب التجريبي'; },

      account: 'قائمة الحساب',
      signedInAs: 'مسجّل الدخول باسم',
      largeText: 'تكبير الخط',
      evaluationLink: 'سجل التقييم',
      signOut: 'تسجيل الخروج',
      signedOut: 'تم تسجيل خروجك',

      term: 'الفصل الأول ٢٠٢٦',
      coursesTitle: 'مقرراتك',
      hello: function (name) { return name ? 'أهلاً ' + name + '.' : 'أهلاً بك.'; },
      coursesIntro: 'هذا عدد المحاضرات التي يمكنك الغياب عنها بعد في كل مقرر هذا الفصل.',
      updated: function (d) { return 'آخر تحديث للحضور ' + d; },
      left: function (n) { return 'المتبقي ' + num(n); },
      reviewCount: function (n) { return n === 1 ? 'عذر واحد قيد المراجعة' : n === 2 ? 'عذران قيد المراجعة' : num(n) + ' أعذار قيد المراجعة'; },
      emptyDetail: 'اختر مقرراً لترى عدد المحاضرات التي يمكنك الغياب عنها بعد.',
      backCourses: 'مقرراتي',
      status: { safe: 'آمن', close: 'قريب من الحد', limit: 'لا يوجد غياب متبقٍ' },
      canMiss: function (n) {
        if (n <= 0) return 'لا يمكنك الغياب عن أي محاضرة أخرى';
        return 'يمكنك الغياب عن ' + arLectures(n) + ' ' + arMore(n);
      },
      bindingUnexcused: 'محسوبة على حد الغياب بدون عذر.',
      bindingTotal: 'محسوبة على حد إجمالي الغياب، ويشمل الغياب بعذر والتأخير.',
      unexcusedLine: function (u, l) { return 'بدون عذر: استخدمت ' + num(u) + ' من ' + num(l) + ' غيابات مسموحة.'; },
      totalLine: function (u, l) { return 'إجمالي الغياب: استخدمت ' + num(u) + ' من ' + num(l) + '.'; },
      breakdown: function (c) {
        var parts = [];
        if (c.absent) parts.push(num(c.absent) + ' بدون عذر');
        if (c.review) parts.push(num(c.review) + ' قيد المراجعة');
        if (c.excused) parts.push(num(c.excused) + ' بعذر');
        if (c.late) parts.push(num(c.late) + ' تأخير');
        return parts.length ? 'منها ' + parts.join('، ') + '.' : '';
      },
      withExcuseHint: function (n) { return 'إذا قُبلت أعذارك، يمكنك الغياب حتى ' + arLectures(n) + ' ' + arMore(n) + ' في الإجمالي. وحتى يصدر القرار، الرقم في الأعلى هو حدّك.'; },
      excusableLine: function (n) { return n === 1 ? 'غياب واحد بدون عذر يمكنك تقديم عذر عنه.' : n === 2 ? 'غيابان بدون عذر يمكنك تقديم عذر عنهما.' : num(n) + ' غيابات بدون عذر يمكنك تقديم عذر عنها.'; },
      trackReviewLink: function (n) { return n === 1 ? 'متابعة العذر قيد المراجعة' : 'متابعة الأعذار قيد المراجعة'; },
      includesReview: function (n) { return n === 1 ? 'عذر واحد قيد المراجعة، ويُحسب بدون عذر حتى يصدر القرار.' : n === 2 ? 'عذران قيد المراجعة، ويُحسبان بدون عذر حتى يصدر القرار.' : num(n) + ' أعذار قيد المراجعة، وتُحسب بدون عذر حتى يصدر القرار.'; },
      stripLabel: function (a, r, left) { return 'بدون عذر: محسوب ' + num(a) + '، قيد المراجعة ' + num(r) + '، المتبقي ' + num(left); },
      meterLabel: function (u, l) { return 'إجمالي الغياب: ' + num(u) + ' من ' + num(l); },
      legend: { absent: 'بدون عذر', review: 'قيد المراجعة', excused: 'بعذر', late: 'تأخير', left: 'متبقٍ' },
      unexcusedTitle: 'الغياب بدون عذر',
      totalTitle: 'إجمالي الغياب',
      seeRecords: 'عرض سجل الغياب',
      howTitle: 'كيف يُحسب هذا؟',
      howBody: function (total, unexLimit, totalLimit) {
        return [
          'في جامعة تبوك يُحرم الطالب من المقرر إذا تجاوز غيابه بدون عذر ٢٠٪ من المحاضرات، أو إذا تجاوز إجمالي غيابه ٣٥٪. إجمالي الغياب = الغياب بدون عذر + الغياب بعذر + عدد مرات التأخير.',
          'هذا المقرر فيه ' + num(total) + ' محاضرة، لذلك يمكنك الغياب بدون عذر حتى ' + num(unexLimit) + ' مرات، وحتى ' + num(totalLimit) + ' مرات في الإجمالي.',
          'العذر قيد المراجعة يُحسب بدون عذر حتى تقرر اللجنة.'
        ];
      },
      closeTitle: 'تصرّف قبل غيابك القادم',
      closeBody: function (n) {
        return (n === 1 ? 'غياب واحد آخر بدون عذر يستنفد رصيدك كاملاً.' : 'غيابان آخران بدون عذر يستنفدان رصيدك كاملاً.') +
          ' إذا كان عندك عذر مقبول لغياب سابق فقدّمه الآن. ويستطيع مرشدك الأكاديمي مساعدتك في التخطيط.';
      },
      limitTitle: 'لم يبقَ لك غياب',
      limitBody: 'أي غياب إضافي بدون عذر قد يحرمك من الاختبار النهائي. إذا كان عندك عذر مقبول لغياب سابق فقدّمه الآن، وتواصل مع مرشدك الأكاديمي اليوم.',
      advisorHours: 'مكتب الإرشاد الأكاديمي: من الأحد إلى الخميس، من ٨:٠٠ إلى ١٤:٠٠.',
      calloutAction: 'قدّم عذراً من سجل الغياب',

      recordsTitle: 'سجل الغياب',
      recordsIntro: function (code) { return 'كل غياب وتأخير مسجّل في ' + code + '، الأحدث أولاً.'; },
      type: { absent: 'بدون عذر', excused: 'بعذر مقبول', review: 'عذر قيد المراجعة', late: 'تأخير' },
      submitExcuseLink: 'تقديم عذر',
      trackLink: 'متابعة العذر',
      mistake: 'مسجّل بالخطأ؟',
      reportSentLine: function (ref) { return 'تم إرسال البلاغ، المرجع ' + ref + '. سيراجعه أستاذ المقرر.'; },
      withdraw: 'سحب البلاغ',
      withdrawn: 'تم سحب البلاغ',
      backRecords: 'سجل الغياب',

      excuseFormTitle: 'تقديم عذر',
      excuseFormIntro: 'يراجعه أستاذ المقرر ولجنة الأعذار، وتتابع القرار من هنا.',
      reasonLegend: 'سبب الغياب',
      excuseReasons: { medical: 'طبي', family: 'ظرف عائلي طارئ', official: 'مهمة رسمية للجامعة', other: 'سبب آخر' },
      docLabel: 'المستند المؤيد',
      docHint: 'مثل تقرير طبي أو خطاب رسمي.',
      attach: 'إرفاق مستند',
      sampleNote: 'ملف تجريبي. لا يُرفع أي شيء في هذا النموذج.',
      removeFile: 'إزالة',
      fileRemoved: 'تمت إزالة المستند',
      excuseNoteLabel: 'ملاحظة للجنة (اختياري)',
      excusePrivacy: 'سيطّلع أستاذ المقرر ولجنة الأعذار على هذا العذر ومستنده.',
      submitExcuse: 'تقديم العذر',
      submittingExcuse: 'جارٍ تقديم العذر…',
      errReason: 'اختر سبب الغياب.',
      errDoc: 'أرفق المستند المؤيد.',
      errExcuseSend: 'لم يُقدَّم العذر. تحقق من الاتصال وأعد التقديم، إجاباتك محفوظة.',
      excuseSentTitle: 'تم تقديم العذر',
      excuseSentLead: function (d) { return 'يُتوقع قرار لجنة الأعذار قبل ' + d + '. وحتى ذلك الحين يُحسب هذا الغياب بدون عذر.'; },
      trackExcuse: 'متابعة هذا العذر',

      excuseTitle: 'عذر قيد المراجعة',
      excuseLead: 'لا تحتاج تسوي شيء الآن. يُحسب غياباً بدون عذر حتى تقرر اللجنة.',
      stepSent: 'تم تقديم العذر',
      stepReview: 'مراجعة لجنة الأعذار',
      stepDecision: 'القرار',
      inProgress: 'جارٍ الآن',
      expectedBy: function (d) { return 'متوقع قبل ' + d; },
      absenceOn: 'تاريخ الغياب',
      reasonLabel: 'السبب',
      reference: 'المرجع',
      ifAccepted: function (n) { return 'إذا قُبل: ' + STR.ar.canMiss(n) + '.'; },
      ifRejected: function (n) { return 'إذا لم يُقبل: لا تغيير، ' + STR.ar.canMiss(n) + '. وسيظهر هنا سبب اللجنة.'; },

      reportTitle: 'الإبلاغ عن سجل مسجّل بالخطأ',
      reportIntro: 'أخبر أستاذ المقرر بالخطأ. يبقى السجل كما هو حتى يراجعه.',
      whatWrong: 'ما الخطأ في هذا السجل؟',
      reasons: { attended: 'حضرت هذه المحاضرة في وقتها', late: 'تأخرت ولم أغب', other: 'سبب آخر' },
      noteLabel: 'تفاصيل لأستاذ المقرر (اختياري)',
      noteHint: function (n) { return num(n) + ' من ٢٠٠ حرف'; },
      privacy: 'سيطّلع أستاذ المقرر على هذا البلاغ.',
      send: 'إرسال البلاغ',
      sending: 'جارٍ إرسال البلاغ…',
      cancel: 'إلغاء',
      errChoose: 'اختر الخطأ في هذا السجل.',
      errSend: 'لم يُرسل البلاغ. تحقق من الاتصال وأعد الإرسال، إجاباتك محفوظة.',
      sentTitle: 'تم إرسال البلاغ',
      course: 'المقرر',
      record: 'السجل',
      sentNext: 'سيراجعه أستاذ المقرر خلال ٣ أيام عمل، ويبقى الغياب محسوباً حتى ذلك الحين.',
      backToRecords: 'العودة إلى سجل الغياب',

      aboutTitle: 'عن هذا النموذج',
      aboutBody: 'يساعد «حضوري» طالب جامعة تبوك على معرفة عدد المحاضرات التي يمكنه الغياب عنها قبل الحرمان، وتقديم عذر لغيابه ومتابعة القرار في مكان واحد. صممته المجموعة ٦ لمقرر CIT 1201 تفاعل الإنسان والحاسب، بناءً على قواعد الغياب المعروضة في myUT.',
      teamTitle: 'المجموعة ٦',
      dataNote: 'كل المقررات والتواريخ والغيابات والأعذار بيانات تجريبية. هذا مشروع تصميم طلابي وليس خدمة جامعية، وغير مرتبط بأي نظام جامعي.',
      backSignIn: 'تسجيل الدخول',

      evalTitle: 'سجل التقييم',
      evalIntro: 'للميسّر والمراقب. سجّل إدخالاً واحداً لكل مهمة يحاولها المشارك.',
      evalPrivacy: 'استخدم رموز المشاركين فقط، ولا تكتب أسماء. تبقى السجلات في هذا المتصفح حتى تنزّلها أو تمسحها.',
      evalNoStorage: 'هذا المتصفح لا يحفظ السجلات بين الزيارات. نزّل ملف CSV قبل إغلاق الصفحة.',
      participant: 'رمز المشارك',
      choose: 'اختر',
      task: 'المهمة',
      tasks: { T1: 'T1 الغياب المتبقي', T2: 'T2 تقديم عذر', T3: 'T3 متابعة عذر' },
      outcome: 'النتيجة',
      outcomes: { success: 'نجح دون مساعدة', helped: 'نجح بمساعدة', failed: 'لم يُكمل' },
      errors: 'الأخطاء',
      errorsHint: 'نقرات أو مسارات خاطئة اضطر المشارك للتراجع عنها.',
      help: 'المساعدة المقدَّمة (متى ولماذا)',
      satisfaction: 'الرضا: «ما مدى رضاك؟»',
      scale: ['غير راضٍ إطلاقاً', 'غير راضٍ', 'محايد', 'راضٍ', 'راضٍ جداً'],
      comment: '«ما الذي طمأنك أو أزعجك؟» (بكلماته)',
      observation: 'ما لاحظته',
      saveRecord: 'حفظ السجل',
      saved: 'تم حفظ السجل',
      errParticipant: 'اختر رمز المشارك.',
      errTask: 'اختر المهمة.',
      errOutcome: 'اختر النتيجة.',
      errSat: 'اختر درجة الرضا.',
      summaryTitle: 'ملخص لكل مهمة',
      summaryNote: 'كل نسبة مقامها عدد محاولات المهمة نفسها. مشاركان أو ثلاثة لا يثبتون أن التصميم يناسب الجميع.',
      colTask: 'المهمة', colAttempts: 'المحاولات', colSuccess: 'دون مساعدة', colHelped: 'بمساعدة', colFailed: 'لم يُكمل', colSat: 'متوسط الرضا',
      ofAttempts: function (n, d) { return d ? num(n) + ' من ' + num(d) + ' (' + num(Math.round(n / d * 100)) + '٪)' : '–'; },
      recordsListTitle: 'السجلات',
      noRecords: 'لا توجد سجلات بعد. تظهر الإدخالات المحفوظة هنا.',
      download: 'تنزيل CSV',
      clearAll: 'مسح كل السجلات',
      confirmClear: 'اضغط مرة أخرى لمسح الكل',
      cleared: 'تم مسح كل السجلات',
      remove: 'حذف',
      confirmRemove: 'اضغط مرة أخرى للحذف',
      removed: 'تم حذف السجل',
      recorded: 'وقت التسجيل',
      satShort: 'الرضا',

      footer: 'من تصميم المجموعة ٦ لمقرر CIT 1201. بيانات تجريبية فقط، ولا يستخدم أي بيانات حقيقية للطلاب.',
      testTitle: 'إعدادات الاختبار للميسّر',
      reset: 'إعادة البيانات التجريبية',
      failNext: 'اجعل الإرسال التالي يفشل',
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
    absent: svg('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9.5 13.5l5 5M14.5 13.5l-5 5"/>'),
    excused: svg('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 15.3l2.2 2.2 4.2-4.3"/>'),
    late: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>'),
    flag: svg('<path d="M6 21V4M6 4h11.5l-2.4 4 2.4 4H6"/>'),
    back: svg('<path d="M15 5l-7 7 7 7"/>', 'ico--flip'),
    chevron: svg('<path d="M9 5l7 7-7 7"/>'),
    down: svg('<path d="M6 9l6 6 6-6"/>'),
    alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4v.3"/>'),
    lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    dash: svg('<path d="M6 12h12"/>'),
    user: svg('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/>'),
    text: svg('<path d="M4 18L8.5 6h1L14 18M5.6 14h6.8"/><path d="M15.5 18l2.7-7h.6l2.7 7M16.4 15.8h4.2"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.3"/>'),
    clipboard: svg('<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5h6v3H9zM8.5 12h7M8.5 16h5"/>'),
    signout: svg('<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l-4-4 4-4M6 12h10"/>', 'ico--flip'),
    download: svg('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>'),
    trash: svg('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
    clip: svg('<path d="M15.5 7.5l-6.4 6.4a1.8 1.8 0 0 0 2.5 2.5l6.7-6.7a3.6 3.6 0 0 0-5.1-5.1l-6.9 6.9a5.4 5.4 0 0 0 7.6 7.6l5.6-5.6"/>'),
    file: svg('<path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5z"/><path d="M14 3.5v4h4"/>')
  };
  var LOGO = '<svg class="logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
    '<path d="M24 3 42.2 13.5v21L24 45 5.8 34.5v-21z" fill="#0F5F59"/>' +
    '<path d="M24 9.6 36.5 16.8v14.4L24 38.4 11.5 31.2V16.8z" fill="none" stroke="#8CCBC0" stroke-width="1.4"/>' +
    '<text x="24" y="30.6" text-anchor="middle" font-family="Readex Pro, system-ui, sans-serif" font-size="17" font-weight="600" fill="#FFFFFF">6</text></svg>';

  /* ---------- Calculations (University of Tabuk rules) ---------- */
  function summary(course) {
    var unexLimit = Math.floor(course.lectures * UNEXCUSED_RATE + 1e-9);
    var totalLimit = Math.floor(course.lectures * TOTAL_RATE + 1e-9);
    var c = { absent: 0, review: 0, excused: 0, late: 0 };
    course.records.forEach(function (r) { c[r.type] += 1; });
    var unexUsed = c.absent + c.review;
    var totalUsed = unexUsed + c.excused + c.late;
    var unexLeft = Math.max(0, unexLimit - unexUsed);
    var totalLeft = Math.max(0, totalLimit - totalUsed);
    var left = Math.min(unexLeft, totalLeft);
    return {
      counts: c, unexLimit: unexLimit, totalLimit: totalLimit,
      unexUsed: unexUsed, totalUsed: totalUsed, unexLeft: unexLeft, totalLeft: totalLeft,
      left: left,
      binding: totalLeft < unexLeft ? 'total' : 'unexcused',
      status: left <= 0 ? 'limit' : left <= CLOSE_AT ? 'close' : 'safe'
    };
  }
  // Remaining allowance if one excuse under review is accepted.
  function leftIfAccepted(s) {
    return Math.max(0, Math.min(s.unexLimit - (s.unexUsed - 1), s.totalLeft));
  }
  var STATUS_ORDER = { limit: 0, close: 1, safe: 2 };

  /* ---------- Routing ---------- */
  function parseRoute() {
    var p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (p[0] === 'about') return { name: 'about' };
    if (!state.user) return { name: 'login' };
    if (p[0] === 'evaluation') return state.testMode ? { name: 'evaluation' } : { name: 'list' };
    if (p[0] !== 'course') return { name: 'list' };
    var course = findCourse(p[1]);
    if (!course) return { name: 'list' };
    if (p[2] !== 'records') return { name: 'course', course: course };
    if (!p[3]) return { name: 'records', course: course };
    var rec = findRecord(course, p[3]);
    if (!rec) return { name: 'records', course: course };
    var base = { course: course, rec: rec };
    if (p[4] === 'excuse') {
      if (p[5] === 'sent' && rec.type === 'review') return assign(base, 'excuseSent');
      if (rec.type === 'absent' && !rec.report) return assign(base, 'excuseForm');
      if (rec.type === 'review') return assign(base, 'excuseStatus');
      return { name: 'records', course: course };
    }
    if (p[4] === 'report') {
      if (p[5] === 'sent' && rec.report) return assign(base, 'sent');
      if (!rec.report && (rec.type === 'absent' || rec.type === 'late')) return assign(base, 'report');
      return { name: 'records', course: course };
    }
    if (rec.type === 'review') return assign(base, 'excuseStatus');
    return { name: 'records', course: course };
  }
  function assign(base, name) { base.name = name; return base; }
  function routeKind(name) {
    if (name === 'login') return 'login';
    if (name === 'about' || name === 'evaluation') return 'page';
    if (name === 'list') return 'list';
    return 'detail';
  }
  function findCourse(id) { return state.courses.filter(function (c) { return c.id === id; })[0]; }
  function findRecord(course, id) { return course.records.filter(function (r) { return r.id === id; })[0]; }
  function href(course, rest) { return '#/course/' + course.id + (rest ? '/' + rest : ''); }
  function go(hash) {
    if (location.hash === hash) render(true); else location.hash = hash;
  }

  /* ---------- Pieces ---------- */
  function chip(kind, label) {
    var icon = {
      safe: ICON.safe, close: ICON.close, limit: ICON.limit, review: ICON.review,
      absent: ICON.absent, excused: ICON.excused, late: ICON.late
    }[kind];
    return '<span class="chip chip--' + kind + '">' + icon + '<span>' + esc(label) + '</span></span>';
  }
  function outcomeChip(outcome) {
    var kind = { success: 'safe', helped: 'close', failed: 'limit' }[outcome];
    return chip(kind, t('outcomes')[outcome]);
  }
  function backLink(target, label, extraClass) {
    return '<a class="back' + (extraClass ? ' ' + extraClass : '') + '" href="' + target + '">' + ICON.back + '<span>' + esc(label) + '</span></a>';
  }
  function courseName(course) { return course.name[state.lang]; }
  function firstName(user) { return user.first[state.lang]; }
  function initial(user) {
    if (user.guest) return ICON.user;
    return esc(firstName(user).charAt(0).toUpperCase());
  }
  function fieldError(id, message) {
    return '<p class="field-error" id="' + id + '">' + ICON.alert + '<span>' + esc(message) + '</span></p>';
  }
  function recordCard(course, rec) {
    return '<div class="record-card"><span><strong>' + esc(course.code) + '</strong> · ' + esc(fmtDate(rec.date, 'long')) + '</span>' + chip(rec.type, t('type')[rec.type]) + '</div>';
  }

  /* ---------- Views: sign in ---------- */
  function viewLogin() {
    var last = readItem('local', KEY.lastName) || '';
    var leaf = function (iso, kind) {
      var d = leafParts(iso);
      return '<li class="leaf leaf--' + kind + '"><span class="leaf-day">' + esc(d.day) + '</span><span class="leaf-mon">' + esc(d.mon) + '</span></li>';
    };
    return '<section class="login">' +
      '<div class="login-hero">' +
        LOGO +
        '<p class="login-statement">' + esc(t('loginStatement')) + '</p>' +
        '<ul class="strip strip--hero" aria-hidden="true">' +
          leaf('2026-10-05', 'absent') + leaf('2026-10-19', 'absent') + leaf('2026-10-26', 'review') +
          '<li class="leaf leaf--left"></li><li class="leaf leaf--left"></li><li class="leaf leaf--left"></li>' +
        '</ul>' +
      '</div>' +
      '<div class="login-card">' +
        '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('loginTitle')) + '</h1>' +
        '<p class="page-intro">' + esc(t('loginIntro')) + '</p>' +
        '<form class="form form--login" id="login-form" novalidate>' +
          '<div id="login-alert" tabindex="-1"></div>' +
          '<div class="field">' +
            '<label for="username">' + esc(t('username')) + '</label>' +
            '<p class="hint" id="username-hint">' + esc(t('usernameHint')) + '</p>' +
            '<div id="username-error"></div>' +
            '<input class="input" id="username" name="username" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" aria-describedby="username-hint" value="' + esc(last) + '">' +
          '</div>' +
          '<div class="field">' +
            '<label for="password">' + esc(t('password')) + '</label>' +
            '<div id="password-error"></div>' +
            '<div class="password-wrap">' +
              '<input class="input" id="password" name="password" type="password" autocomplete="current-password" aria-describedby="caps-note">' +
              '<button type="button" class="reveal" data-action="reveal" aria-controls="password" aria-label="' + esc(t('showLabel')) + '">' + esc(t('show')) + '</button>' +
            '</div>' +
            '<p class="caps" id="caps-note" hidden>' + ICON.alert + '<span>' + esc(t('capsOn')) + '</span></p>' +
          '</div>' +
          '<button type="submit" class="btn btn--primary btn--block" id="signin-btn">' + esc(t('signIn')) + '</button>' +
        '</form>' +
        '<p class="divider"><span>' + esc(t('or')) + '</span></p>' +
        '<button type="button" class="btn btn--secondary btn--block" data-action="guest">' + esc(t('guestButton')) + '</button>' +
        '<p class="login-note">' + ICON.lock + '<span>' + esc(t('loginNote')) + '</span></p>' +
        '<p class="login-links"><a href="#/about">' + esc(t('aboutLink')) + '</a></p>' +
      '</div>' +
      '</section>';
  }

  /* ---------- Views: header account ---------- */
  function viewAccount() {
    if (!state.user) return '';
    var u = state.user;
    var name = u.guest ? u.full[state.lang] : firstName(u);
    return '<div class="account">' +
      '<button type="button" class="account-btn" id="account-btn" data-action="menu" aria-expanded="' + state.menuOpen + '" aria-controls="account-menu">' +
        '<span class="avatar">' + initial(u) + '</span>' +
        '<span class="visually-hidden">' + esc(t('account')) + ', </span>' +
        '<span class="account-name">' + esc(name) + '</span>' + ICON.down +
      '</button>' +
      '<div class="menu" id="account-menu"' + (state.menuOpen ? '' : ' hidden') + '>' +
        '<p class="menu-who">' + esc(t('signedInAs')) + '<strong>' + esc(u.full[state.lang]) + '</strong></p>' +
        '<button type="button" class="menu-item" data-action="large" aria-pressed="' + state.largeText + '">' + ICON.text + '<span>' + esc(t('largeText')) + '</span><span class="menu-check">' + ICON.check + '</span></button>' +
        (state.testMode ? '<a class="menu-item" href="#/evaluation" data-action="close-menu">' + ICON.clipboard + '<span>' + esc(t('evaluationLink')) + '</span></a>' : '') +
        '<a class="menu-item" href="#/about" data-action="close-menu">' + ICON.info + '<span>' + esc(t('aboutLink')) + '</span></a>' +
        '<button type="button" class="menu-item" data-action="signout">' + ICON.signout + '<span>' + esc(t('signOut')) + '</span></button>' +
      '</div>' +
      '</div>';
  }

  /* ---------- Views: courses ---------- */
  function viewList(route) {
    var current = route.course ? route.course.id : null;
    var courses = state.courses.slice().sort(function (a, b) {
      return STATUS_ORDER[summary(a).status] - STATUS_ORDER[summary(b).status];
    });
    var tag = route.name === 'list' ? 'h1' : 'h2';
    var rows = courses.map(function (c) {
      var s = summary(c);
      var note = s.counts.review > 0 ? '<span class="course-note">' + ICON.review + '<span>' + esc(t('reviewCount', s.counts.review)) + '</span></span>' : '';
      return '<li><a class="course-row" href="' + href(c) + '"' + (c.id === current ? ' aria-current="page"' : '') + '>' +
        '<span class="course-code">' + esc(c.code) + '</span>' +
        chip(s.status, t('status')[s.status]) +
        '<span class="course-title">' + esc(courseName(c)) + '</span>' +
        '<span class="course-left">' + esc(t('left', s.left)) + '</span>' +
        note +
        '</a></li>';
    }).join('');
    return '<' + tag + ' class="list-title" id="courses-title" tabindex="-1">' + esc(t('coursesTitle')) + '</' + tag + '>' +
      '<p class="list-intro">' + esc(t('hello', firstName(state.user))) + ' ' + esc(t('coursesIntro')) + '</p>' +
      '<p class="updated">' + esc(t('term')) + '. ' + esc(t('updated', fmtUpdated())) + '</p>' +
      '<ul class="courses">' + rows + '</ul>';
  }

  function viewEmpty() {
    return '<div class="empty only-wide">' +
      '<ul class="strip" aria-hidden="true"><li class="leaf leaf--absent"></li><li class="leaf leaf--review"></li><li class="leaf leaf--left"></li><li class="leaf leaf--left"></li></ul>' +
      '<p>' + esc(t('emptyDetail')) + '</p></div>';
  }

  function viewCourse(course) {
    var s = summary(course);
    var c = s.counts;

    // Strip: one calendar leaf per allowed absence without an excuse.
    var used = course.records.filter(function (r) { return r.type === 'absent' || r.type === 'review'; })
      .slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var leaves = used.map(function (r) {
      var d = leafParts(r.date);
      return '<li class="leaf leaf--' + r.type + '"><span class="leaf-day">' + esc(d.day) + '</span><span class="leaf-mon">' + esc(d.mon) + '</span></li>';
    });
    for (var i = used.length; i < s.unexLimit; i += 1) leaves.push('<li class="leaf leaf--left"></li>');

    // Meter: one segment per allowed absence in total.
    var segs = [];
    var push = function (kind, n) { for (var k = 0; k < n; k += 1) segs.push('<span class="seg seg--' + kind + '"></span>'); };
    push('absent', c.absent); push('review', c.review); push('excused', c.excused); push('late', c.late);
    push('left', Math.max(0, s.totalLimit - s.totalUsed));

    var how = t('howBody', course.lectures, s.unexLimit, s.totalLimit)
      .map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');

    var callout = '';
    if (s.status === 'close' || s.status === 'limit') {
      callout = '<section class="callout callout--' + s.status + '" aria-labelledby="callout-title">' +
        (s.status === 'close' ? ICON.close : ICON.limit) +
        '<h2 id="callout-title">' + esc(s.status === 'close' ? t('closeTitle') : t('limitTitle')) + '</h2>' +
        '<div><p>' + esc(s.status === 'close' ? t('closeBody', s.left) : t('limitBody')) + '</p>' +
        '<p class="callout-link"><a href="' + href(course, 'records') + '">' + esc(t('calloutAction')) + '</a></p>' +
        '<p class="hint">' + esc(t('advisorHours')) + '</p></div>' +
        '</section>';
    }

    var hint = '';
    if (s.left > 0 && s.totalLeft > s.unexLeft) hint = '<p class="block-note">' + esc(t('withExcuseHint', s.totalLeft)) + '</p>';

    // I2 (from EF2): the excuse journey also starts from the allowance, not only from the records list.
    var excusable = course.records.filter(function (r) { return r.type === 'absent' && !r.report; });
    var inReview = course.records.filter(function (r) { return r.type === 'review'; });
    var excuseActions = '';
    if (excusable.length || inReview.length) {
      excuseActions = '<div class="block-actions">' +
        (excusable.length ? '<p class="block-line">' + esc(t('excusableLine', excusable.length)) + '</p>' : '') +
        '<div class="block-buttons">' +
        (excusable.length ? '<a class="btn btn--small" href="' + href(course, excusable.length === 1 ? 'records/' + excusable[0].id + '/excuse' : 'records') + '">' + esc(t('submitExcuseLink')) + '</a>' : '') +
        (inReview.length ? '<a class="btn btn--secondary btn--compact" href="' + href(course, inReview.length === 1 ? 'records/' + inReview[0].id : 'records') + '">' + esc(t('trackReviewLink', inReview.length)) + '</a>' : '') +
        '</div></div>';
    }

    return '<article class="detail">' +
      backLink('#/', t('backCourses'), 'only-narrow') +
      '<p class="eyebrow-code">' + esc(course.code) + '</p>' +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(courseName(course)) + '</h1>' +
      '<p class="allowance">' + esc(t('canMiss', s.left)) + '</p>' +
      '<p class="allowance-sub">' + esc(s.binding === 'total' ? t('bindingTotal') : t('bindingUnexcused')) + '</p>' +
      '<div class="status-line">' + chip(s.status, t('status')[s.status]) + '<p class="muted">' + esc(t('updated', fmtUpdated())) + '</p></div>' +
      callout +
      '<section class="allowances">' +
        '<div class="allowance-block">' +
          '<h2 class="block-title">' + esc(t('unexcusedTitle')) + '</h2>' +
          '<ul class="strip" role="img" aria-label="' + esc(t('stripLabel', c.absent, c.review, s.unexLeft)) + '">' + leaves.join('') + '</ul>' +
          '<ul class="legend" aria-hidden="true">' +
            '<li><span class="swatch swatch--absent"></span>' + esc(t('legend').absent) + '</li>' +
            '<li><span class="swatch swatch--review"></span>' + esc(t('legend').review) + '</li>' +
            '<li><span class="swatch swatch--left"></span>' + esc(t('legend').left) + '</li>' +
          '</ul>' +
          '<p class="block-line">' + esc(t('unexcusedLine', s.unexUsed, s.unexLimit)) + '</p>' +
          (c.review > 0 ? '<p class="block-note">' + esc(t('includesReview', c.review)) + '</p>' : '') +
          excuseActions +
        '</div>' +
        '<div class="allowance-block">' +
          '<h2 class="block-title">' + esc(t('totalTitle')) + '</h2>' +
          '<div class="meter" role="img" aria-label="' + esc(t('meterLabel', s.totalUsed, s.totalLimit)) + '">' + segs.join('') + '</div>' +
          '<ul class="legend" aria-hidden="true">' +
            '<li><span class="swatch swatch--absent"></span>' + esc(t('legend').absent) + '</li>' +
            '<li><span class="swatch swatch--review"></span>' + esc(t('legend').review) + '</li>' +
            '<li><span class="swatch swatch--excused"></span>' + esc(t('legend').excused) + '</li>' +
            '<li><span class="swatch swatch--late"></span>' + esc(t('legend').late) + '</li>' +
            '<li><span class="swatch swatch--left"></span>' + esc(t('legend').left) + '</li>' +
          '</ul>' +
          '<p class="block-line">' + esc(t('totalLine', s.totalUsed, s.totalLimit)) + ' ' + esc(t('breakdown', c)) + '</p>' +
          hint +
        '</div>' +
      '</section>' +
      '<div class="actions"><a class="btn btn--primary" href="' + href(course, 'records') + '">' + esc(t('seeRecords')) + '</a></div>' +
      '<details class="disclosure"><summary>' + ICON.chevron + '<span>' + esc(t('howTitle')) + '</span></summary>' +
        '<div class="disclosure-body">' + how + '</div></details>' +
      '</article>';
  }

  function viewRecords(course) {
    var items = course.records.map(function (r) {
      var actions = [];
      var reportBox = '';
      if (r.report) {
        reportBox = '<p class="record-report">' + ICON.flag + '<span>' + esc(t('reportSentLine', r.report.ref)) + '</span></p>';
        actions.push('<button type="button" class="btn-text" data-action="withdraw" data-course="' + course.id + '" data-record="' + r.id + '">' + esc(t('withdraw')) + '</button>');
      } else if (r.type === 'absent') {
        actions.push('<a class="btn btn--small" href="' + href(course, 'records/' + r.id + '/excuse') + '">' + esc(t('submitExcuseLink')) + '</a>');
        actions.push('<a class="btn-text" href="' + href(course, 'records/' + r.id + '/report') + '">' + esc(t('mistake')) + '</a>');
      } else if (r.type === 'review') {
        actions.push('<a class="btn btn--small" href="' + href(course, 'records/' + r.id) + '">' + esc(t('trackLink')) + '</a>');
      } else if (r.type === 'late') {
        actions.push('<a class="btn-text" href="' + href(course, 'records/' + r.id + '/report') + '">' + esc(t('mistake')) + '</a>');
      }
      return '<li class="record">' +
        '<span class="record-date">' + esc(fmtDate(r.date, 'long')) + '</span>' +
        chip(r.type, t('type')[r.type]) +
        reportBox +
        (actions.length ? '<div class="record-actions">' + actions.join('') + '</div>' : '') +
        '</li>';
    }).join('');
    return '<article class="detail">' +
      backLink(href(course), course.code) +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('recordsTitle')) + '</h1>' +
      '<p class="page-intro">' + esc(t('recordsIntro', course.code)) + '</p>' +
      '<ol class="records">' + items + '</ol>' +
      '</article>';
  }

  function viewExcuseForm(course, rec) {
    var draft = state.excuseDrafts[rec.id] || { reason: '', file: '', note: '' };
    var reasons = ['medical', 'family', 'official', 'other'].map(function (k) {
      return '<label class="choice"><input type="radio" name="excuse-reason" value="' + k + '"' + (draft.reason === k ? ' checked' : '') + '><span>' + esc(t('excuseReasons')[k]) + '</span></label>';
    }).join('');
    var fileArea = draft.file
      ? '<div class="file-chip">' + ICON.file + '<span class="file-name">' + esc(draft.file) + '</span>' +
          '<button type="button" class="btn-text" data-action="remove-file">' + esc(t('removeFile')) + '</button></div>' +
        '<p class="hint">' + esc(t('sampleNote')) + '</p>'
      : '<button type="button" class="btn btn--secondary btn--attach" id="attach-btn" data-action="attach" aria-describedby="doc-hint">' + ICON.clip + '<span>' + esc(t('attach')) + '</span></button>';
    return '<article class="detail">' +
      backLink(href(course, 'records'), t('cancel')) +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('excuseFormTitle')) + '</h1>' +
      '<p class="page-intro">' + esc(t('excuseFormIntro')) + '</p>' +
      recordCard(course, rec) +
      '<form class="form" id="excuse-form" novalidate data-course="' + course.id + '" data-record="' + rec.id + '">' +
        '<div id="excuse-send-error" tabindex="-1"></div>' +
        '<fieldset id="excuse-reason-group">' +
          '<legend>' + esc(t('reasonLegend')) + '</legend>' +
          '<div id="excuse-reason-error"></div>' +
          reasons +
        '</fieldset>' +
        '<div class="field" id="doc-field">' +
          '<p class="field-label" id="doc-label">' + esc(t('docLabel')) + '</p>' +
          '<p class="hint" id="doc-hint">' + esc(t('docHint')) + '</p>' +
          '<div id="doc-error"></div>' +
          '<div id="doc-area">' + fileArea + '</div>' +
        '</div>' +
        '<div>' +
          '<label class="field-label" for="excuse-note">' + esc(t('excuseNoteLabel')) + '</label>' +
          '<textarea id="excuse-note" name="excuse-note" maxlength="200" aria-describedby="excuse-note-hint">' + esc(draft.note) + '</textarea>' +
          '<p class="hint" id="excuse-note-hint">' + esc(t('noteHint', draft.note.length)) + '</p>' +
        '</div>' +
        '<p class="privacy">' + ICON.lock + '<span>' + esc(t('excusePrivacy')) + '</span></p>' +
        '<div class="form-actions">' +
          '<button type="submit" class="btn btn--primary" id="excuse-send-btn">' + esc(t('submitExcuse')) + '</button>' +
          '<a class="btn btn--secondary" href="' + href(course, 'records') + '">' + esc(t('cancel')) + '</a>' +
        '</div>' +
      '</form>' +
      '</article>';
  }

  function viewExcuseSent(course, rec) {
    var s = summary(course);
    return '<article class="detail">' +
      '<div class="sent-mark">' + ICON.check + '</div>' +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('excuseSentTitle')) + '</h1>' +
      '<p class="lead">' + esc(t('excuseSentLead', fmtDate(rec.excuse.decisionBy, 'long'))) + '</p>' +
      '<dl class="keyfacts">' +
        '<div><dt>' + esc(t('reference')) + '</dt><dd class="ref">' + esc(rec.excuse.ref) + '</dd></div>' +
        '<div><dt>' + esc(t('course')) + '</dt><dd>' + esc(course.code) + '</dd></div>' +
        '<div><dt>' + esc(t('absenceOn')) + '</dt><dd>' + esc(fmtDate(rec.date, 'long')) + '</dd></div>' +
      '</dl>' +
      '<p class="outcome outcome--yes spaced">' + ICON.check + '<span>' + esc(t('ifAccepted', leftIfAccepted(s))) + '</span></p>' +
      '<div class="actions">' +
        '<a class="btn btn--primary" href="' + href(course, 'records/' + rec.id) + '">' + esc(t('trackExcuse')) + '</a>' +
        '<a class="btn btn--secondary" href="' + href(course, 'records') + '">' + esc(t('backToRecords')) + '</a>' +
      '</div>' +
      '</article>';
  }

  function viewExcuseStatus(course, rec) {
    var s = summary(course);
    var ex = rec.excuse;
    return '<article class="detail">' +
      backLink(href(course, 'records'), t('backRecords')) +
      '<p class="eyebrow-code">' + esc(course.code) + '</p>' +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('excuseTitle')) + '</h1>' +
      '<p class="lead">' + esc(t('excuseLead')) + '</p>' +
      '<ol class="timeline">' +
        '<li class="step step--done"><span class="step-mark">' + ICON.check + '</span><div><p class="step-title">' + esc(t('stepSent')) + '</p><p class="step-meta">' + esc(fmtDate(ex.submitted, 'long')) + '</p></div></li>' +
        '<li class="step step--current" aria-current="step"><span class="step-mark">' + ICON.review + '</span><div><p class="step-title">' + esc(t('stepReview')) + '</p><p class="step-meta">' + esc(t('inProgress')) + '</p></div></li>' +
        '<li class="step"><span class="step-mark"></span><div><p class="step-title">' + esc(t('stepDecision')) + '</p><p class="step-meta">' + esc(t('expectedBy', fmtDate(ex.decisionBy, 'long'))) + '</p></div></li>' +
      '</ol>' +
      '<dl class="keyfacts">' +
        '<div><dt>' + esc(t('absenceOn')) + '</dt><dd>' + esc(fmtDate(rec.date, 'long')) + '</dd></div>' +
        '<div><dt>' + esc(t('reasonLabel')) + '</dt><dd>' + esc(t('excuseReasons')[ex.reason]) + '</dd></div>' +
        '<div><dt>' + esc(t('docLabel')) + '</dt><dd>' + esc(ex.file) + '</dd></div>' +
        '<div><dt>' + esc(t('reference')) + '</dt><dd class="ref">' + esc(ex.ref) + '</dd></div>' +
      '</dl>' +
      '<div class="outcomes">' +
        '<p class="outcome outcome--yes">' + ICON.check + '<span>' + esc(t('ifAccepted', leftIfAccepted(s))) + '</span></p>' +
        '<p class="outcome outcome--no">' + ICON.dash + '<span>' + esc(t('ifRejected', s.left)) + '</span></p>' +
      '</div>' +
      '</article>';
  }

  function viewReport(course, rec) {
    var draft = state.drafts[rec.id] || { reason: '', note: '' };
    var reasons = ['attended', 'late', 'other'].filter(function (k) {
      return !(rec.type === 'late' && k === 'late');
    }).map(function (k) {
      return '<label class="choice"><input type="radio" name="reason" value="' + k + '"' + (draft.reason === k ? ' checked' : '') + '><span>' + esc(t('reasons')[k]) + '</span></label>';
    }).join('');
    return '<article class="detail">' +
      backLink(href(course, 'records'), t('cancel')) +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('reportTitle')) + '</h1>' +
      '<p class="page-intro">' + esc(t('reportIntro')) + '</p>' +
      recordCard(course, rec) +
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

  /* ---------- Views: about ---------- */
  function viewAbout() {
    var back = state.user ? backLink('#/', t('backCourses')) : backLink('#/login', t('backSignIn'));
    var team = ACCOUNTS.map(function (a) {
      return '<li class="member"><span class="avatar avatar--lg">' + initial(a) + '</span><span>' + esc(a.full[state.lang]) + '</span></li>';
    }).join('');
    return '<article class="detail about">' +
      back +
      LOGO +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('aboutTitle')) + '</h1>' +
      '<p class="lead">' + esc(t('aboutBody')) + '</p>' +
      '<h2 class="section-title">' + esc(t('teamTitle')) + '</h2>' +
      '<ul class="team">' + team + '</ul>' +
      '<p class="page-intro about-note">' + esc(t('dataNote')) + '</p>' +
      '</article>';
  }

  /* ---------- Evaluation record (Topic 7: performance and affective metrics) ---------- */
  var storageWorks = writeItem('local', 'group6-storage-check', '1');
  writeItem('local', 'group6-storage-check', null);

  function loadEvals() {
    var raw = readItem('local', KEY.evals);
    if (!raw) return [];
    try {
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function saveEvals() { writeItem('local', KEY.evals, JSON.stringify(state.evals)); }

  function evalSummary() {
    return ['T1', 'T2', 'T3'].map(function (task) {
      var rows = state.evals.filter(function (r) { return r.task === task; });
      var count = function (o) { return rows.filter(function (r) { return r.outcome === o; }).length; };
      var sats = rows.map(function (r) { return Number(r.sat); }).filter(function (n) { return n >= 1; });
      var avg = sats.length ? sats.reduce(function (a, b) { return a + b; }, 0) / sats.length : null;
      return { task: task, attempts: rows.length, success: count('success'), helped: count('helped'), failed: count('failed'), avg: avg };
    });
  }

  function viewEvaluation() {
    var codes = ['P4', 'P5', 'P6', 'P7', 'P8'];
    var options = '<option value="">' + esc(t('choose')) + '</option>' + codes.map(function (c) {
      return '<option value="' + c + '"' + (state.evalParticipant === c ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
    var tasks = ['T1', 'T2', 'T3'].map(function (k) {
      return '<label class="choice"><input type="radio" name="task" value="' + k + '"><span>' + esc(t('tasks')[k]) + '</span></label>';
    }).join('');
    var outcomes = ['success', 'helped', 'failed'].map(function (k) {
      return '<label class="choice"><input type="radio" name="outcome" value="' + k + '"><span>' + esc(t('outcomes')[k]) + '</span></label>';
    }).join('');
    var scale = t('scale').map(function (label, i) {
      return '<label class="choice"><input type="radio" name="sat" value="' + (i + 1) + '"><span class="scale-num">' + num(i + 1) + '</span><span class="scale-label">' + esc(label) + '</span></label>';
    }).join('');

    var rows = evalSummary().map(function (s) {
      return '<tr><th scope="row">' + esc(s.task) + '</th>' +
        '<td>' + num(s.attempts) + '</td>' +
        '<td>' + esc(t('ofAttempts', s.success, s.attempts)) + '</td>' +
        '<td>' + esc(t('ofAttempts', s.helped, s.attempts)) + '</td>' +
        '<td>' + esc(t('ofAttempts', s.failed, s.attempts)) + '</td>' +
        '<td>' + (s.avg === null ? '–' : esc(num(Math.round(s.avg * 10) / 10)) + ' / ' + num(5)) + '</td></tr>';
    }).join('');

    var list = state.evals.slice().reverse().map(function (r) {
      var details = '';
      details += '<div><dt>' + esc(t('errors')) + '</dt><dd>' + num(r.errors) + '</dd></div>';
      details += '<div><dt>' + esc(t('satShort')) + '</dt><dd>' + num(r.sat) + ' / ' + num(5) + '</dd></div>';
      if (r.help) details += '<div><dt>' + esc(t('help')) + '</dt><dd>' + esc(r.help) + '</dd></div>';
      if (r.comment) details += '<div><dt>' + esc(t('comment')) + '</dt><dd>' + esc(r.comment) + '</dd></div>';
      if (r.observation) details += '<div><dt>' + esc(t('observation')) + '</dt><dd>' + esc(r.observation) + '</dd></div>';
      details += '<div><dt>' + esc(t('recorded')) + '</dt><dd>' + esc(fmtStamp(r.at)) + '</dd></div>';
      return '<li class="eval-record">' +
        '<div class="eval-record-head"><strong>' + esc(r.participant) + ', ' + esc(t('tasks')[r.task] || r.task) + '</strong>' + outcomeChip(r.outcome) + '</div>' +
        '<dl>' + details + '</dl>' +
        '<div><button type="button" class="btn-text btn-text--danger" data-action="eval-remove" data-id="' + esc(r.id) + '">' + esc(t('remove')) + '</button></div>' +
        '</li>';
    }).join('');

    return '<article class="detail eval">' +
      backLink('#/', t('backCourses')) +
      '<h1 class="page-title" id="view-title" tabindex="-1">' + esc(t('evalTitle')) + '</h1>' +
      '<p class="page-intro">' + esc(t('evalIntro')) + '</p>' +
      '<p class="privacy">' + ICON.lock + '<span>' + esc(t('evalPrivacy')) + '</span></p>' +
      (storageWorks ? '' : '<p class="alert">' + ICON.alert + '<span>' + esc(t('evalNoStorage')) + '</span></p>') +
      '<form class="form form--wide" id="eval-form" novalidate>' +
        '<div class="field">' +
          '<label for="participant">' + esc(t('participant')) + '</label>' +
          '<div id="participant-error"></div>' +
          '<select class="input select" id="participant" name="participant">' + options + '</select>' +
        '</div>' +
        '<fieldset id="task-group"><legend>' + esc(t('task')) + '</legend><div id="task-error"></div><div class="segmented">' + tasks + '</div></fieldset>' +
        '<fieldset id="outcome-group"><legend>' + esc(t('outcome')) + '</legend><div id="outcome-error"></div><div class="segmented">' + outcomes + '</div></fieldset>' +
        '<div class="field">' +
          '<label for="errors">' + esc(t('errors')) + '</label>' +
          '<p class="hint" id="errors-hint">' + esc(t('errorsHint')) + '</p>' +
          '<input class="input input--num" id="errors" name="errors" type="number" inputmode="numeric" min="0" max="20" value="0" aria-describedby="errors-hint">' +
        '</div>' +
        '<div class="field"><label for="help">' + esc(t('help')) + '</label><textarea id="help" name="help" maxlength="300"></textarea></div>' +
        '<fieldset id="sat-group"><legend>' + esc(t('satisfaction')) + '</legend><div id="sat-error"></div><div class="scale">' + scale + '</div></fieldset>' +
        '<div class="field"><label for="comment">' + esc(t('comment')) + '</label><textarea id="comment" name="comment" maxlength="300"></textarea></div>' +
        '<div class="field"><label for="observation">' + esc(t('observation')) + '</label><textarea id="observation" name="observation" maxlength="500"></textarea></div>' +
        '<div class="form-actions"><button type="submit" class="btn btn--primary">' + esc(t('saveRecord')) + '</button></div>' +
      '</form>' +
      '<h2 class="section-title">' + esc(t('summaryTitle')) + '</h2>' +
      '<div class="table-wrap"><table class="summary"><thead><tr>' +
        '<th scope="col">' + esc(t('colTask')) + '</th><th scope="col">' + esc(t('colAttempts')) + '</th><th scope="col">' + esc(t('colSuccess')) + '</th>' +
        '<th scope="col">' + esc(t('colHelped')) + '</th><th scope="col">' + esc(t('colFailed')) + '</th><th scope="col">' + esc(t('colSat')) + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="hint">' + esc(t('summaryNote')) + '</p>' +
      '<h2 class="section-title">' + esc(t('recordsListTitle')) + ' (' + num(state.evals.length) + ')</h2>' +
      (state.evals.length ? '<ul class="eval-records">' + list + '</ul>' : '<p class="page-intro">' + esc(t('noRecords')) + '</p>') +
      '<div class="toolbar">' +
        '<button type="button" class="btn btn--secondary" data-action="eval-download"' + (state.evals.length ? '' : ' disabled') + '>' + ICON.download + '<span>' + esc(t('download')) + '</span></button>' +
        '<button type="button" class="btn btn--quiet btn--danger" data-action="eval-clear"' + (state.evals.length ? '' : ' disabled') + '>' + ICON.trash + '<span>' + esc(t('clearAll')) + '</span></button>' +
      '</div>' +
      '</article>';
  }

  function viewTestPanel() {
    if (!state.testMode) return '';
    return '<section class="test-panel" aria-labelledby="test-title">' +
      '<h2 id="test-title">' + esc(t('testTitle')) + '</h2>' +
      '<button type="button" class="btn btn--quiet" data-action="reset">' + esc(t('reset')) + '</button>' +
      '<label><input type="checkbox" data-action="fail-next"' + (state.failNext ? ' checked' : '') + '>' + esc(t('failNext')) + '</label>' +
      (state.user ? '<a class="btn btn--quiet" href="#/evaluation">' + ICON.clipboard + '<span>' + esc(t('evaluationLink')) + '</span></a>' : '') +
      '</section>';
  }

  /* ---------- Render ---------- */
  var listEl = document.getElementById('course-list');
  var mainEl = document.getElementById('main');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function renderHeader() {
    document.getElementById('brand-name').textContent = t('appName');
    document.getElementById('brand-by').textContent = t('byGroup');
    var toggle = document.getElementById('lang-toggle');
    toggle.textContent = t('langButton');
    toggle.lang = t('langButtonLang');
    document.getElementById('account').innerHTML = viewAccount();
  }

  function render(moveFocus) {
    var route = parseRoute();
    var html = document.documentElement;
    html.lang = state.lang;
    html.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    html.classList.toggle('large-text', state.largeText);

    if (moveFocus) state.menuOpen = false;
    renderHeader();
    document.getElementById('footer-note').textContent = t('footer');
    document.getElementById('test-panel').innerHTML = viewTestPanel();
    document.getElementById('skip-link').textContent = t('skip');

    var kind = routeKind(route.name);
    document.body.dataset.route = kind;
    listEl.innerHTML = kind === 'list' || kind === 'detail' ? viewList(route) : '';

    var title;
    switch (route.name) {
      case 'login': mainEl.innerHTML = viewLogin(); title = t('loginTitle'); bindLoginForm(); break;
      case 'about': mainEl.innerHTML = viewAbout(); title = t('aboutTitle'); break;
      case 'evaluation': mainEl.innerHTML = viewEvaluation(); title = t('evalTitle'); bindEvalForm(); break;
      case 'course': mainEl.innerHTML = viewCourse(route.course); title = route.course.code; break;
      case 'records': mainEl.innerHTML = viewRecords(route.course); title = t('recordsTitle'); break;
      case 'excuseForm': mainEl.innerHTML = viewExcuseForm(route.course, route.rec); title = t('excuseFormTitle'); bindExcuseForm(); break;
      case 'excuseSent': mainEl.innerHTML = viewExcuseSent(route.course, route.rec); title = t('excuseSentTitle'); break;
      case 'excuseStatus': mainEl.innerHTML = viewExcuseStatus(route.course, route.rec); title = t('excuseTitle'); break;
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

  /* ---------- Sign in behaviour ---------- */
  function bindLoginForm() {
    var form = document.getElementById('login-form');
    if (!form) return;
    var pw = form.querySelector('#password');
    var caps = form.querySelector('#caps-note');
    function checkCaps(e) {
      if (e.getModifierState) caps.hidden = !e.getModifierState('CapsLock');
    }
    pw.addEventListener('keydown', checkCaps);
    pw.addEventListener('keyup', checkCaps);
    pw.addEventListener('blur', function () { caps.hidden = true; });
    form.addEventListener('input', function (e) {
      if (e.target.id === 'username' || e.target.id === 'password') clearLoginFieldError(form, e.target.id);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitLogin(form);
    });
  }

  function clearLoginFieldError(form, id) {
    form.querySelector('#' + id + '-error').innerHTML = '';
    var input = form.querySelector('#' + id);
    input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', id === 'username' ? 'username-hint' : 'caps-note');
  }

  function setLoginFieldError(form, id, message) {
    form.querySelector('#' + id + '-error').innerHTML = fieldError(id + '-error-text', message);
    var input = form.querySelector('#' + id);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', id + '-error-text ' + (id === 'username' ? 'username-hint' : 'caps-note'));
  }

  function submitLogin(form) {
    var userInput = form.querySelector('#username');
    var pwInput = form.querySelector('#password');
    var alertBox = form.querySelector('#login-alert');
    alertBox.innerHTML = '';
    clearLoginFieldError(form, 'username');
    clearLoginFieldError(form, 'password');

    var name = userInput.value.trim();
    var pw = pwInput.value;
    if (!name) setLoginFieldError(form, 'username', t('errUser'));
    if (!pw) setLoginFieldError(form, 'password', t('errPass'));
    if (!name) { userInput.focus(); return; }
    if (!pw) { pwInput.focus(); return; }

    writeItem('local', KEY.lastName, name);
    var btn = form.querySelector('#signin-btn');
    setBusy(btn, t('signingIn'));

    window.setTimeout(function () {
      var account = accountByName(name);
      if (!account || pw !== PASSWORD) {
        state.loginFails += 1;
        btn.disabled = false;
        btn.textContent = t('signIn');
        pwInput.value = '';
        alertBox.innerHTML = '<div class="alert" role="alert">' + ICON.alert + '<div><p>' + esc(t('errWrong')) + '</p>' +
          (state.loginFails >= 3 ? '<p class="alert-help">' + esc(t('errWrongHelp')) + '</p>' : '') + '</div></div>';
        pwInput.focus();
        return;
      }
      signIn(account);
    }, SIGNIN_DELAY);
  }

  function signIn(account) {
    state.user = account;
    state.loginFails = 0;
    writeItem('session', KEY.user, account.id);
    var h = location.hash;
    if (!h || h === '#' || /^#\/?login/.test(h)) go('#/'); else render(true);
    srAnnounce(t('welcome', account.guest ? '' : account.full[state.lang]));
  }

  function signOut() {
    state.user = null;
    state.menuOpen = false;
    writeItem('session', KEY.user, null);
    go('#/login');
    window.setTimeout(function () { announce(t('signedOut')); }, 80);
  }

  /* ---------- Shared form helpers ---------- */
  function clearGroupError(form, name) {
    var group = form.querySelector('#' + name + '-group');
    if (group) group.classList.remove('has-error');
    var holder = form.querySelector('#' + name + '-error');
    if (holder) holder.innerHTML = '';
    Array.prototype.forEach.call(form.querySelectorAll('input[name="' + name + '"]'), function (r) {
      r.removeAttribute('aria-invalid');
      r.removeAttribute('aria-describedby');
    });
  }

  function setGroupError(form, name, message) {
    var group = form.querySelector('#' + name + '-group');
    if (group) group.classList.add('has-error');
    form.querySelector('#' + name + '-error').innerHTML = fieldError(name + '-error-text', message);
    var inputs = form.querySelectorAll('input[name="' + name + '"]');
    Array.prototype.forEach.call(inputs, function (r) {
      r.setAttribute('aria-invalid', 'true');
      r.setAttribute('aria-describedby', name + '-error-text');
    });
    return inputs[0];
  }

  function setBusy(btn, label) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>' + esc(label) + '</span>';
    srAnnounce(label);
  }

  function failSend(btn, label, holder, message) {
    state.failNext = false;
    document.getElementById('test-panel').innerHTML = viewTestPanel();
    btn.disabled = false;
    btn.textContent = label;
    holder.innerHTML = '<p class="alert" role="alert">' + ICON.alert + '<span>' + esc(message) + '</span></p>';
    holder.focus();
  }

  /* ---------- Excuse form behaviour ---------- */
  function excuseDraft(recId) {
    if (!state.excuseDrafts[recId]) state.excuseDrafts[recId] = { reason: '', file: '', note: '' };
    return state.excuseDrafts[recId];
  }

  function bindExcuseForm() {
    var form = document.getElementById('excuse-form');
    if (!form) return;
    var recId = form.getAttribute('data-record');
    var note = form.querySelector('#excuse-note');
    var hint = form.querySelector('#excuse-note-hint');
    note.addEventListener('input', function () {
      hint.textContent = t('noteHint', note.value.length);
      excuseDraft(recId).note = note.value;
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'excuse-reason') {
        excuseDraft(recId).reason = e.target.value;
        clearGroupError(form, 'excuse-reason');
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      excuseDraft(recId).note = note.value;
      submitExcuse(form);
    });
  }

  function refreshDocArea(form, focusSelector) {
    var course = findCourse(form.getAttribute('data-course'));
    var rec = findRecord(course, form.getAttribute('data-record'));
    var fresh = document.createElement('div');
    fresh.innerHTML = viewExcuseForm(course, rec);
    form.querySelector('#doc-area').innerHTML = fresh.querySelector('#doc-area').innerHTML;
    if (focusSelector) {
      var el = form.querySelector(focusSelector);
      if (el) el.focus();
    }
  }

  function submitExcuse(form) {
    var course = findCourse(form.getAttribute('data-course'));
    var rec = findRecord(course, form.getAttribute('data-record'));
    var d = excuseDraft(rec.id);
    var holder = form.querySelector('#excuse-send-error');
    holder.innerHTML = '';
    form.querySelector('#doc-error').innerHTML = '';

    var firstInvalid = null;
    if (!d.reason) firstInvalid = setGroupError(form, 'excuse-reason', t('errReason'));
    if (!d.file) {
      form.querySelector('#doc-error').innerHTML = fieldError('doc-error-text', t('errDoc'));
      var attachBtn = form.querySelector('#attach-btn');
      if (attachBtn) attachBtn.setAttribute('aria-describedby', 'doc-error-text doc-hint');
      firstInvalid = firstInvalid || attachBtn;
    }
    if (firstInvalid) { firstInvalid.focus(); return; }

    var btn = form.querySelector('#excuse-send-btn');
    setBusy(btn, t('submittingExcuse'));
    window.setTimeout(function () {
      if (state.failNext) { failSend(btn, t('submitExcuse'), holder, t('errExcuseSend')); return; }
      rec.type = 'review';
      rec.excuse = {
        ref: 'EX-' + state.nextExcuse,
        reason: d.reason,
        file: d.file,
        note: d.note,
        submitted: TODAY,
        decisionBy: addDays(TODAY, DECISION_DAYS)
      };
      state.nextExcuse += 1;
      delete state.excuseDrafts[rec.id];
      location.hash = href(course, 'records/' + rec.id + '/excuse/sent');
    }, SEND_DELAY);
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
        clearGroupError(form, 'reason');
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      keepDraft();
      submitReport(form);
    });
  }

  function submitReport(form) {
    var course = findCourse(form.getAttribute('data-course'));
    var rec = findRecord(course, form.getAttribute('data-record'));
    var draft = state.drafts[rec.id];
    var holder = form.querySelector('#send-error');
    holder.innerHTML = '';

    if (!draft.reason) { setGroupError(form, 'reason', t('errChoose')).focus(); return; }

    var btn = form.querySelector('#send-btn');
    setBusy(btn, t('sending'));
    window.setTimeout(function () {
      if (state.failNext) { failSend(btn, t('send'), holder, t('errSend')); return; }
      rec.report = { ref: 'AT-' + state.nextRef, reason: draft.reason, note: draft.note };
      state.nextRef += 1;
      delete state.drafts[rec.id];
      location.hash = href(course, 'records/' + rec.id + '/report/sent');
    }, SEND_DELAY);
  }

  /* ---------- Evaluation form behaviour ---------- */
  function bindEvalForm() {
    var form = document.getElementById('eval-form');
    if (!form) return;
    form.addEventListener('change', function (e) {
      var n = e.target.name;
      if (n === 'task' || n === 'outcome' || n === 'sat') clearGroupError(form, n);
      if (n === 'participant') {
        form.querySelector('#participant-error').innerHTML = '';
        e.target.removeAttribute('aria-invalid');
        state.evalParticipant = e.target.value;
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitEval(form);
    });
  }

  function submitEval(form) {
    var val = function (name) {
      var el = form.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : '';
    };
    var participant = form.querySelector('#participant').value;
    var task = val('task'), outcome = val('outcome'), sat = val('sat');
    var firstInvalid = null;
    if (!participant) {
      form.querySelector('#participant-error').innerHTML = fieldError('participant-error-text', t('errParticipant'));
      form.querySelector('#participant').setAttribute('aria-invalid', 'true');
      firstInvalid = form.querySelector('#participant');
    }
    if (!task) { var a = setGroupError(form, 'task', t('errTask')); firstInvalid = firstInvalid || a; }
    if (!outcome) { var b = setGroupError(form, 'outcome', t('errOutcome')); firstInvalid = firstInvalid || b; }
    if (!sat) { var c = setGroupError(form, 'sat', t('errSat')); firstInvalid = firstInvalid || c; }
    if (firstInvalid) { firstInvalid.focus(); return; }

    var errors = Math.max(0, Math.min(20, parseInt(form.querySelector('#errors').value, 10) || 0));
    state.evals.push({
      id: Date.now().toString(36),
      participant: participant,
      task: task,
      outcome: outcome,
      errors: errors,
      help: form.querySelector('#help').value.trim(),
      sat: Number(sat),
      comment: form.querySelector('#comment').value.trim(),
      observation: form.querySelector('#observation').value.trim(),
      at: new Date().toISOString()
    });
    state.evalParticipant = participant;
    saveEvals();
    render(false);
    announce(t('saved'));
    var next = document.getElementById('participant');
    if (next) next.focus();
  }

  function csvCell(v) {
    var s = String(v === undefined || v === null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function downloadEvals() {
    var en = STR.en;
    var head = ['Participant', 'Task', 'Outcome', 'Errors', 'Help given', 'Satisfaction (1-5)', 'Reassuring or frustrating', 'Observation', 'Recorded at'];
    var lines = [head.join(',')].concat(state.evals.map(function (r) {
      return [r.participant, en.tasks[r.task] || r.task, en.outcomes[r.outcome], r.errors, r.help, r.sat, r.comment, r.observation, r.at].map(csvCell).join(',');
    }));
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'group6-evaluation-records.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Two-step confirmation for destructive actions (error prevention).
  function confirmStep(el, confirmLabel) {
    if (el.getAttribute('data-confirm') === '1') return true;
    el.setAttribute('data-confirm', '1');
    var label = el.querySelector('span') || el;
    var original = label.textContent;
    label.textContent = confirmLabel;
    window.setTimeout(function () {
      if (document.body.contains(el)) {
        el.removeAttribute('data-confirm');
        label.textContent = original;
      }
    }, 4000);
    return false;
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

  /* ---------- Account menu ---------- */
  function setMenu(open, focusFirst) {
    state.menuOpen = open;
    var btn = document.getElementById('account-btn');
    var menu = document.getElementById('account-menu');
    if (!btn || !menu) return;
    btn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (open && focusFirst) {
      var first = menu.querySelector('.menu-item');
      if (first) first.focus();
    }
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (state.menuOpen && !e.target.closest('.account')) setMenu(false);
    if (!el) return;
    var action = el.getAttribute('data-action');
    var form, course, rec;

    if (action === 'skip') {
      e.preventDefault();
      var target = document.body.dataset.route === 'list' ? document.getElementById('courses-title') : document.getElementById('view-title');
      if (target) target.focus();
    } else if (action === 'lang') {
      state.lang = state.lang === 'ar' ? 'en' : 'ar';
      writeItem('local', KEY.lang, state.lang);
      render(false);
      document.getElementById('lang-toggle').focus();
    } else if (action === 'menu') {
      setMenu(!state.menuOpen, true);
    } else if (action === 'close-menu') {
      setMenu(false);
    } else if (action === 'large') {
      state.largeText = !state.largeText;
      writeItem('local', KEY.large, state.largeText ? '1' : '0');
      document.documentElement.classList.toggle('large-text', state.largeText);
      el.setAttribute('aria-pressed', String(state.largeText));
    } else if (action === 'signout') {
      signOut();
    } else if (action === 'guest') {
      signIn(GUEST);
    } else if (action === 'reveal') {
      var pw = document.getElementById('password');
      var showing = pw.type === 'text';
      pw.type = showing ? 'password' : 'text';
      el.textContent = showing ? t('show') : t('hide');
      el.setAttribute('aria-label', showing ? t('showLabel') : t('hideLabel'));
      pw.focus();
    } else if (action === 'attach' || action === 'remove-file') {
      form = document.getElementById('excuse-form');
      var draft = excuseDraft(form.getAttribute('data-record'));
      if (action === 'attach') {
        draft.file = SAMPLE_FILE;
        form.querySelector('#doc-error').innerHTML = '';
        refreshDocArea(form, '[data-action="remove-file"]');
        srAnnounce(SAMPLE_FILE);
      } else {
        draft.file = '';
        refreshDocArea(form, '#attach-btn');
        srAnnounce(t('fileRemoved'));
      }
    } else if (action === 'withdraw') {
      course = findCourse(el.getAttribute('data-course'));
      rec = findRecord(course, el.getAttribute('data-record'));
      delete rec.report;
      render(false);
      announce(t('withdrawn'));
      var title = document.getElementById('view-title');
      if (title) title.focus({ preventScroll: true });
    } else if (action === 'reset') {
      var keep = { lang: state.lang, testMode: state.testMode, user: state.user, largeText: state.largeText, evals: state.evals };
      state = seed();
      state.lang = keep.lang;
      state.testMode = keep.testMode;
      state.user = keep.user;
      state.largeText = keep.largeText;
      state.evals = keep.evals;
      state.menuOpen = false;
      state.loginFails = 0;
      state.evalParticipant = '';
      go('#/');
      window.setTimeout(function () { announce(t('resetDone')); }, 80);
    } else if (action === 'eval-download') {
      downloadEvals();
    } else if (action === 'eval-remove') {
      if (!confirmStep(el, t('confirmRemove'))) return;
      var id = el.getAttribute('data-id');
      state.evals = state.evals.filter(function (r) { return r.id !== id; });
      saveEvals();
      render(false);
      announce(t('removed'));
    } else if (action === 'eval-clear') {
      if (!confirmStep(el, t('confirmClear'))) return;
      state.evals = [];
      saveEvals();
      render(false);
      announce(t('cleared'));
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.menuOpen) {
      setMenu(false);
      var btn = document.getElementById('account-btn');
      if (btn) btn.focus();
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.getAttribute('data-action') === 'fail-next') state.failNext = e.target.checked;
  });
  window.addEventListener('hashchange', function () { hideToast(); render(true); });

  render(false);
})();
