(function () {
  var LOCAL_KEY = 'rahatpost_admin_pro_v3_config';
  var SNAP_KEY = 'rahatpost_admin_pro_v3_snapshots';
  var PIN_KEY = 'rahatpost_admin_pro_v3_pin';
  var UNLOCK_KEY = 'rahatpost_admin_pro_v3_unlocked';
  var GH_KEY = 'rahatpost_admin_pro_v3_github';
  var PREVIEW_KEY = 'rahatpost_admin_pro_v3_live_preview';
  var CHANNEL_NAME = 'rahatpost_admin_pro_v3_channel';

  var DEFAULT_CONFIG = {"version": 1, "status": "published", "updatedAt": "2026-11-22T00:00:00.000Z", "storageMode": "json-zero-db", "compatibility": {"preserveOriginalDesign": true, "applyToWeb": false, "applyToAndroid": false, "applyToIos": false, "cacheTtlSeconds": 60}, "appearance": {"brandPrimary": "#FACC15", "brandSecondary": "#0F172A", "themeMode": "auto", "borderRadius": "balanced", "density": "comfortable", "showBreakingTicker": true, "stickyHeader": true, "showQuickSearch": true, "showCityWeatherWidget": true, "customHeaderNotice": ""}, "sections": [{"id": "news", "title": "الأخبار", "subtitle": "أخبار رهط والنقب العاجلة والمحلية", "badge": "عاجل", "order": 1, "visible": true, "layoutStyle": "featured", "itemsLimit": 12, "showOnWeb": true, "showOnAndroid": true, "showOnIos": true}, {"id": "buses", "title": "الباصات", "subtitle": "مواعيد وخطوط المواصلات العامة من وإلى رهط", "badge": "محدّث", "order": 2, "visible": true, "layoutStyle": "list", "itemsLimit": 10, "showOnWeb": true, "showOnAndroid": true, "showOnIos": true}, {"id": "services", "title": "الخدمات", "subtitle": "الخدمات البلدية، الطوارئ، والمؤسسات المحلية", "badge": "", "order": 3, "visible": true, "layoutStyle": "grid", "itemsLimit": 8, "showOnWeb": true, "showOnAndroid": true, "showOnIos": true}, {"id": "directory", "title": "الدليل", "subtitle": "دليل المحلات، المصالح التجارية، والمهنيين في رهط والنقب", "badge": "شامل", "order": 4, "visible": true, "layoutStyle": "grid", "itemsLimit": 12, "showOnWeb": true, "showOnAndroid": true, "showOnIos": true}, {"id": "haraj", "title": "الحراج", "subtitle": "إعلانات البيع والشراء، السيارات، العقارات، والمستعمل", "badge": "جديد", "order": 5, "visible": true, "layoutStyle": "carousel", "itemsLimit": 10, "showOnWeb": true, "showOnAndroid": true, "showOnIos": true}, {"id": "menus", "title": "القوائم", "subtitle": "روابط التنقل السريع، الشريط العلوي، وقائمة الجوال", "badge": "", "order": 6, "visible": true, "layoutStyle": "list", "itemsLimit": 8, "showOnWeb": true, "showOnAndroid": true, "showOnIos": true}], "menus": [{"id": "m-1", "label": "الرئيسية", "url": "/", "sectionRef": "news", "location": "header", "order": 1, "visible": true, "openInNewTab": false}, {"id": "m-2", "label": "أخبار رهط والنقب", "url": "/news", "sectionRef": "news", "location": "header", "order": 2, "visible": true, "openInNewTab": false}, {"id": "m-3", "label": "مواعيد الباصات", "url": "/buses", "sectionRef": "buses", "location": "header", "order": 3, "visible": true, "openInNewTab": false, "badge": "مباشر"}, {"id": "m-4", "label": "الخدمات", "url": "/services", "sectionRef": "services", "location": "header", "order": 4, "visible": true, "openInNewTab": false}, {"id": "m-5", "label": "الدليل التجاري", "url": "/directory", "sectionRef": "directory", "location": "header", "order": 5, "visible": true, "openInNewTab": false}, {"id": "m-6", "label": "الحراج", "url": "/haraj", "sectionRef": "haraj", "location": "header", "order": 6, "visible": true, "openInNewTab": false, "badge": "جديد"}, {"id": "mb-1", "label": "الأخبار", "url": "/", "sectionRef": "news", "location": "mobile_bottom", "order": 1, "visible": true, "openInNewTab": false}, {"id": "mb-2", "label": "الباصات", "url": "/buses", "sectionRef": "buses", "location": "mobile_bottom", "order": 2, "visible": true, "openInNewTab": false}, {"id": "mb-3", "label": "الدليل", "url": "/directory", "sectionRef": "directory", "location": "mobile_bottom", "order": 3, "visible": true, "openInNewTab": false}, {"id": "mb-4", "label": "الحراج", "url": "/haraj", "sectionRef": "haraj", "location": "mobile_bottom", "order": 4, "visible": true, "openInNewTab": false}, {"id": "dr-1", "label": "الخدمات البلدية والطوارئ", "url": "/services", "sectionRef": "services", "location": "drawer", "order": 1, "visible": true, "openInNewTab": false}, {"id": "dr-2", "label": "أعلن معنا في رهط بوست", "url": "/advertise", "sectionRef": "custom", "location": "drawer", "order": 2, "visible": true, "openInNewTab": false}, {"id": "ft-1", "label": "عن رهط بوست", "url": "/about", "sectionRef": "custom", "location": "footer", "order": 1, "visible": true, "openInNewTab": false}, {"id": "ft-2", "label": "سياسة الخصوصية", "url": "/privacy", "sectionRef": "custom", "location": "footer", "order": 2, "visible": true, "openInNewTab": false}], "sectionItems": [{"id": "bus-465", "sectionKey": "buses", "title": "خط 465 — رهط ⇄ بئر السبع", "subtitle": "يمر بالمدخل الرئيسي، السوق البلدي، ومحطة القطار", "category": "خطوط خارجية", "badge": "يعمل الآن", "phoneOrRoute": "خط 465", "priceOrTime": "كل 20 دقيقة (05:30 - 23:00)", "isFeatured": true, "isActive": true, "sortOrder": 1}, {"id": "bus-1", "sectionKey": "buses", "title": "خط 1 — دائري داخل أحياء رهط", "subtitle": "الحارات 1 - 15، المركز الجماهيري، العيادات", "category": "خطوط داخلية", "badge": "منتظم", "phoneOrRoute": "خط 1", "priceOrTime": "كل 15 دقيقة", "isFeatured": false, "isActive": true, "sortOrder": 2}, {"id": "srv-1", "sectionKey": "services", "title": "مركز الطوارئ والبلدية 106", "subtitle": "استقبال البلاغات والخدمات البلدية على مدار الساعة", "category": "طوارئ وبلدية", "badge": "24/7", "phoneOrRoute": "106 / 08-9914800", "priceOrTime": "متاح يومياً", "isFeatured": true, "isActive": true, "sortOrder": 1}, {"id": "dir-1", "sectionKey": "directory", "title": "سوق رهط المركزي للمصالح التجارية", "subtitle": "مطاعم، محلات إلكترونيات، وورش صيانة سيارات", "category": "تجارة ومطاعم", "badge": "موثّق", "phoneOrRoute": "الشارع الرئيسي - رهط", "priceOrTime": "08:00 - 22:00", "isFeatured": true, "isActive": true, "sortOrder": 1}, {"id": "hrj-1", "sectionKey": "haraj", "title": "قسم السيارات والعقارات — حراج رهط", "subtitle": "إعلانات يومية محدثة مباشرة من أهل المدينة والنقب", "category": "سيارات وعقار", "badge": "نشط", "phoneOrRoute": "تواصل عبر واتساب", "priceOrTime": "محدّث اليوم", "isFeatured": true, "isActive": true, "sortOrder": 1}, {"id": "nws-1", "sectionKey": "news", "title": "تغطية مباشرة لأهم أخبار رهط وبلدات النقب", "subtitle": "تحديثات فورية للمشاريع البلدية، التعليم، والفعاليات", "category": "أخبار محلية", "badge": "رئيسي", "phoneOrRoute": "تحرير رهط بوست", "priceOrTime": "تحديث تلقائي", "isFeatured": true, "isActive": true, "sortOrder": 1}]};

  var state = {
    unlocked: sessionStorage.getItem(UNLOCK_KEY) === '1',
    tab: 'appearance',
    mobileOpen: false,
    previewMode: 'mobile',
    expandedSection: null,
    menuLocation: 'header',
    searchQuery: '',
    dirty: false,
    publishing: false,
    dragIndex: null,
    config: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
    snapshots: [],
    livePreview: localStorage.getItem(PREVIEW_KEY) === '1',
    github: { repo: '', branch: 'main', path: 'public/rahatpost-layout.json', token: '' }
  };

  var bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  var SECTION_ICONS = {
    news: '📰',
    buses: '🚌',
    services: '🛠️',
    directory: '📒',
    haraj: '🏷️',
    menus: '☰'
  };

  var TAB_TITLES = {
    overview: 'اللوحة السريعة',
    appearance: 'المظهر وترتيب جميع الأقسام',
    menus: 'إدارة القوائم والتنقل',
    news: 'إدارة الأخبار',
    buses: 'إدارة الباصات والمواصلات',
    services: 'إدارة الخدمات',
    directory: 'إدارة الدليل التجاري',
    haraj: 'إدارة الحراج والإعلانات',
    sync: 'الربط المباشر بالموقع (بدون قاعدة بيانات)'
  };

  var SECTION_META = {
    buses: { title: 'إدارة الباصات والمواصلات', f1: 'رقم الخط أو المسار', f2: 'المواعيد والتكرار', ph: 'خط 465 — رهط ⇄ بئر السبع' },
    services: { title: 'إدارة الخدمات المحلية', f1: 'الهاتف أو العنوان', f2: 'ساعات العمل', ph: 'مركز خدمات بلدية رهط' },
    directory: { title: 'إدارة الدليل التجاري', f1: 'الموقع / الهاتف', f2: 'أوقات الدوام', ph: 'مطعم ومشويات النقب' },
    haraj: { title: 'إدارة الحراج والإعلانات', f1: 'وسيلة التواصل', f2: 'السعر أو الحالة', ph: 'تويوتا كورولا هايبرد بحالة ممتازة' },
    news: { title: 'إدارة الأخبار السريعة', f1: 'المصدر / المحرر', f2: 'التصنيف أو الوقت', ph: 'خبر عاجل من مدينة رهط' }
  };

  var MENU_LOCS = [
    { id: 'header', label: 'القائمة العلوية (Header)' },
    { id: 'mobile_bottom', label: 'الشريط السفلي للجوال' },
    { id: 'drawer', label: 'القائمة الجانبية (Drawer)' },
    { id: 'footer', label: 'روابط التذييل (Footer)' }
  ];

  var COLOR_PRESETS = ['#FACC15', '#F59E0B', '#38BDF8', '#10B981', '#EF4444'];

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var toastTimer = null;
  function showToast(msg, type) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.className = 'toast show' + (type === 'warn' ? ' warn' : type === 'info' ? ' info' : '');
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.className = 'toast';
    }, 4200);
  }

  function loadInitialData() {
    try {
      var ghRaw = localStorage.getItem(GH_KEY);
      if (ghRaw) state.github = Object.assign(state.github, JSON.parse(ghRaw));
    } catch (_) {}

    try {
      var snapRaw = localStorage.getItem(SNAP_KEY);
      if (snapRaw) state.snapshots = JSON.parse(snapRaw);
    } catch (_) {}

    try {
      var localRaw = localStorage.getItem(LOCAL_KEY);
      if (localRaw) {
        state.config = Object.assign({}, DEFAULT_CONFIG, JSON.parse(localRaw));
      }
    } catch (_) {}

    // Also pull live public/rahatpost-layout.json if local cache doesn't exist yet
    if (!localStorage.getItem(LOCAL_KEY)) {
      fetch('/rahatpost-layout.json?t=' + Date.now(), { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data && data.sections) {
            state.config = data;
            localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
            render();
          }
        })
        .catch(function () {});
    }
  }

  function persistLocal(silent) {
    state.config.updatedAt = new Date().toISOString();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state.config));
    state.dirty = false;
    if (bc) {
      bc.postMessage({ type: 'LAYOUT_UPDATED', payload: state.config });
    }
    if (!silent) showToast('تم الحفظ السريع والربط اللحظي بنجاح ✓');
  }

  function markDirty() {
    state.dirty = true;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state.config));
    if (bc && state.livePreview) {
      bc.postMessage({ type: 'LAYOUT_UPDATED', payload: state.config });
    }
  }

  function encodeBase64Unicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function publishToGitHub() {
    var gh = state.github;
    if (!gh.repo || !gh.token) {
      state.tab = 'sync';
      render();
      showToast('أدخل اسم المستودع ورمز GitHub مرة واحدة للنشر التلقائي بدون قاعدة بيانات', 'info');
      return;
    }

    state.publishing = true;
    render();
    try {
      state.config.version = (state.config.version || 1) + 1;
      state.config.status = 'published';
      state.config.updatedAt = new Date().toISOString();

      var apiUrl = 'https://api.github.com/repos/' + gh.repo.trim() + '/contents/' + (gh.path || 'public/rahatpost-layout.json').replace(/^\//, '');
      var headers = {
        'Authorization': 'Bearer ' + gh.token.trim(),
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      };

      var sha = undefined;
      var getRes = await fetch(apiUrl + '?ref=' + encodeURIComponent(gh.branch || 'main'), { headers: headers });
      if (getRes.ok) {
        var existing = await getRes.json();
        sha = existing.sha;
      }

      var contentStr = JSON.stringify(state.config, null, 2);
      var putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
          message: 'chore(admin-pro): update rahatpost layout config v' + state.config.version,
          content: encodeBase64Unicode(contentStr),
          branch: gh.branch || 'main',
          sha: sha
        })
      });

      if (!putRes.ok) {
        var errData = await putRes.json().catch(function () { return {}; });
        throw new Error(errData.message || 'HTTP ' + putRes.status);
      }

      persistLocal(true);
      showToast('تم النشر المباشر على GitHub (إصدار v' + state.config.version + ') — سيحدّث Vercel الموقع تلقائياً ✓');
    } catch (err) {
      showToast('تعذر النشر على GitHub: ' + err.message, 'warn');
    } finally {
      state.publishing = false;
      render();
    }
  }

  function downloadJson() {
    persistLocal(true);
    var blob = new Blob([JSON.stringify(state.config, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'rahatpost-layout.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تحميل ملف rahatpost-layout.json الجاهز للرفع في مجلد public/');
  }

  function getSortedSections() {
    return (state.config.sections || []).slice().sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
  }

  function commitSections(list) {
    state.config.sections = list.map(function (s, idx) {
      return Object.assign({}, s, { order: idx + 1 });
    });
    markDirty();
    render();
  }

  // ==================== RENDERERS ====================

  function renderLock() {
    return (
      '<div class="lock-wrap">' +
      '  <form id="pinForm" class="lock-card">' +
      '    <div class="logo-badge">RP</div>' +
      '    <h1 style="margin:16px 0 4px;font-size:20px;font-weight:900;">لوحة تحكم رهط بوست الحصرية</h1>' +
      '    <p style="margin:0 0 20px;font-size:12.5px;color:#94a3b8;">إدارة المظهر وترتيب الأقسام بدون قاعدة بيانات جديدة</p>' +
      '    <input id="pinInput" class="input" type="password" inputmode="numeric" autofocus placeholder="أدخل رمز الدخول (الافتراضي: 2026)" style="text-align:center;letter-spacing:4px;font-size:15px;" />' +
      '    <div id="pinErr" style="color:#f87171;font-size:12px;font-weight:700;margin-top:8px;min-height:18px;"></div>' +
      '    <button type="submit" class="btn btn-primary" style="width:100%;padding:11px;font-size:14px;margin-top:6px;">🔒 دخول آمن</button>' +
      '    <p style="margin:14px 0 0;font-size:11px;color:#64748b;">يمكنك تغيير رمز الدخول من صفحة «الربط المباشر والحماية»</p>' +
      '  </form>' +
      '</div>'
    );
  }

  function renderOverview() {
    var secs = getSortedSections();
    var visCount = secs.filter(function (s) { return s.visible; }).length;
    var activeMenus = (state.config.menus || []).filter(function (m) { return m.visible; }).length;
    var itemsCount = (state.config.sectionItems || []).length;
    var compat = state.config.compatibility || {};

    return (
      '<div class="grid" style="gap:18px;">' +
      '  <div class="card" style="background:linear-gradient(270deg, rgba(250,204,21,0.14), rgba(15,23,42,0.95));border-color:rgba(250,204,21,0.28);">' +
      '    <span class="badge">⚡ مربوطة مباشرة بالموقع • بدون قاعدة بيانات جديدة</span>' +
      '    <h2 style="margin:10px 0 6px;font-size:22px;font-weight:900;">أهلاً بك في لوحة تحكم رهط بوست Pro</h2>' +
      '    <p style="margin:0 0 14px;font-size:13px;color:#cbd5e1;max-width:740px;line-height:1.7;">رتّب جميع الأقسام (الأخبار، الباصات، الخدمات، الدليل، الحراج، والقوائم) وعدّل المظهر بسرعة فائقة مع حماية 100% لشكل موقع rahatpost.com وتطبيقي أندرويد وآبل.</p>' +
      '    <div style="display:flex;flex-wrap:wrap;gap:10px;">' +
      '      <button class="btn btn-primary" data-go="appearance">🎨 فتح صفحة المظهر وترتيب الأقسام</button>' +
      '      <button class="btn btn-dark" data-go="sync">🔗 إعداد النشر المباشر لـ GitHub</button>' +
      '      <a class="btn btn-emerald" href="/" target="_blank">🌐 فتح الموقع الرئيسي</a>' +
      '    </div>' +
      '  </div>' +
      '  <div class="grid grid-4">' +
      '    <div class="card"><div style="font-size:12px;color:#94a3b8;">الأقسام المفعّلة</div><div style="font-size:28px;font-weight:900;margin-top:6px;">' + visCount + ' <span style="font-size:14px;color:#64748b;">/ ' + secs.length + '</span></div></div>' +
      '    <div class="card"><div style="font-size:12px;color:#94a3b8;">روابط القوائم النشطة</div><div style="font-size:28px;font-weight:900;margin-top:6px;">' + activeMenus + '</div></div>' +
      '    <div class="card"><div style="font-size:12px;color:#94a3b8;">عناصر الأقسام السريعة</div><div style="font-size:28px;font-weight:900;margin-top:6px;">' + itemsCount + '</div></div>' +
      '    <div class="card"><div style="font-size:12px;color:#94a3b8;">درع حماية التصميم</div><div style="font-size:18px;font-weight:900;margin-top:8px;color:#34d399;">' + (compat.preserveOriginalDesign ? 'محمي بالكامل ✓' : 'مخصص') + '</div><div style="font-size:11px;color:#94a3b8;margin-top:4px;">ويب: ' + (compat.applyToWeb ? 'مفعّل' : 'أصلي') + ' • أندرويد: ' + (compat.applyToAndroid ? 'مفعّل' : 'أصلي') + ' • آبل: ' + (compat.applyToIos ? 'مفعّل' : 'أصلي') + '</div></div>' +
      '  </div>' +
      '  <div class="card">' +
      '    <h3 style="margin:0 0 12px;font-size:15px;font-weight:900;">الترتيب الحالي لجميع الأقسام</h3>' +
      '    <div class="grid grid-3">' +
      secs.map(function (s, idx) {
        return (
          '<button class="card" data-go="' + esc(s.id) + '" style="text-align:right;cursor:pointer;display:flex;align-items:center;gap:12px;padding:14px;">' +
          '  <span class="order-num">#' + (idx + 1) + '</span>' +
          '  <span style="font-size:20px;">' + (SECTION_ICONS[s.id] || '📌') + '</span>' +
          '  <div style="min-width:0;flex:1;">' +
          '    <div style="font-weight:800;font-size:14px;color:#fff;">' + esc(s.title) + (s.badge ? ' <span class="badge">' + esc(s.badge) + '</span>' : '') + '</div>' +
          '    <div style="font-size:11.5px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(s.subtitle) + '</div>' +
          '  </div>' +
          '  <span style="width:10px;height:10px;border-radius:99px;background:' + (s.visible ? '#10b981' : '#475569') + ';"></span>' +
          '</button>'
        );
      }).join('') +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
  }

  function renderAppearance() {
    var secs = getSortedSections();
    var app = state.config.appearance;
    var radiusPx = app.borderRadius === 'sharp' ? '6px' : app.borderRadius === 'rounded' ? '18px' : '12px';
    var isLight = app.themeMode === 'light';

    var sectionRows = secs.map(function (s, idx) {
      var expanded = state.expandedSection === s.id;
      return (
        '<div class="section-row ' + (s.visible ? '' : 'hidden-sec') + '" draggable="true" data-drag-idx="' + idx + '">' +
        '  <div class="section-row-head">' +
        '    <span class="drag-handle" title="اسحب للترتيب">⋮⋮</span>' +
        '    <span class="order-num">' + (idx + 1) + '</span>' +
        '    <span style="font-size:18px;">' + (SECTION_ICONS[s.id] || '📌') + '</span>' +
        '    <div style="flex:1;min-width:140px;">' +
        '      <div style="font-size:14px;font-weight:800;">' + esc(s.title) + (s.badge ? ' <span class="badge">' + esc(s.badge) + '</span>' : '') + '</div>' +
        '      <div style="font-size:11.5px;color:#94a3b8;">' + esc(s.subtitle) + '</div>' +
        '    </div>' +
        '    <div style="display:flex;gap:5px;flex-wrap:wrap;">' +
        '      <button class="btn btn-dark btn-icon" data-sec-up="' + idx + '" ' + (idx === 0 ? 'disabled' : '') + ' title="للأعلى">↑</button>' +
        '      <button class="btn btn-dark btn-icon" data-sec-down="' + idx + '" ' + (idx === secs.length - 1 ? 'disabled' : '') + ' title="للأسفل">↓</button>' +
        '      <button class="btn ' + (s.visible ? 'btn-emerald' : 'btn-dark') + ' btn-icon" data-sec-vis="' + esc(s.id) + '" title="إظهار / إخفاء">' + (s.visible ? '👁️' : '🙈') + '</button>' +
        '      <button class="btn ' + (expanded ? 'btn-primary' : 'btn-dark') + ' btn-icon" data-sec-exp="' + esc(s.id) + '" title="إعدادات القسم">⚙️</button>' +
        '    </div>' +
        '  </div>' +
        (expanded
          ? '<div class="section-expand grid grid-2">' +
            '  <div><label class="label">عنوان القسم</label><input class="input" data-sec-field="title" data-sec-id="' + esc(s.id) + '" value="' + esc(s.title) + '" /></div>' +
            '  <div><label class="label">شارة القسم</label><input class="input" data-sec-field="badge" data-sec-id="' + esc(s.id) + '" value="' + esc(s.badge) + '" placeholder="عاجل / جديد" /></div>' +
            '  <div><label class="label">نمط العرض</label><select class="select" data-sec-field="layoutStyle" data-sec-id="' + esc(s.id) + '">' +
            '    <option value="featured"' + (s.layoutStyle === 'featured' ? ' selected' : '') + '>بارز علوي</option>' +
            '    <option value="grid"' + (s.layoutStyle === 'grid' ? ' selected' : '') + '>شبكة بطاقات</option>' +
            '    <option value="list"' + (s.layoutStyle === 'list' ? ' selected' : '') + '>قائمة سريعة</option>' +
            '    <option value="carousel"' + (s.layoutStyle === 'carousel' ? ' selected' : '') + '>شريط أفقي</option>' +
            '  </select></div>' +
            '  <div><label class="label">عدد العناصر (' + s.itemsLimit + ')</label><input type="range" min="3" max="24" value="' + s.itemsLimit + '" data-sec-range="' + esc(s.id) + '" style="width:100%;accent-color:#facc15;" /></div>' +
            '  <div style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;">' +
            '    <button class="btn ' + (s.showOnWeb ? 'btn-primary' : 'btn-dark') + '" data-sec-plat="showOnWeb" data-sec-id="' + esc(s.id) + '">' + (s.showOnWeb ? '✓' : '✕') + ' الموقع (Web)</button>' +
            '    <button class="btn ' + (s.showOnAndroid ? 'btn-primary' : 'btn-dark') + '" data-sec-plat="showOnAndroid" data-sec-id="' + esc(s.id) + '">' + (s.showOnAndroid ? '✓' : '✕') + ' أندرويد</button>' +
            '    <button class="btn ' + (s.showOnIos ? 'btn-primary' : 'btn-dark') + '" data-sec-plat="showOnIos" data-sec-id="' + esc(s.id) + '">' + (s.showOnIos ? '✓' : '✕') + ' آبل (iOS)</button>' +
            '  </div>' +
            '</div>'
          : '') +
        '</div>'
      );
    }).join('');

    var previewItems = secs.filter(function (s) { return s.visible; }).map(function (s, idx) {
      return (
        '<div class="preview-card" style="border-radius:' + radiusPx + ';background:' + (isLight ? '#fff' : '#0f172a') + ';color:' + (isLight ? '#0f172a' : '#f8fafc') + ';">' +
        '  <div style="display:flex;align-items:center;gap:8px;">' +
        '    <span style="width:26px;height:26px;border-radius:8px;background:' + esc(app.brandPrimary) + ';color:#020617;display:inline-flex;align-items:center;justify-content:center;font-size:13px;">' + (SECTION_ICONS[s.id] || '📌') + '</span>' +
        '    <div><div style="font-size:12px;font-weight:800;">' + esc(s.title) + '</div><div style="font-size:10px;opacity:0.65;">' + esc(s.layoutStyle) + ' • ' + s.itemsLimit + ' عنصر</div></div>' +
        '  </div>' +
        '  <span style="font-size:10px;font-weight:900;opacity:0.6;">#' + (idx + 1) + '</span>' +
        '</div>'
      );
    }).join('');

    var mobileBottomMenus = (state.config.menus || [])
      .filter(function (m) { return m.location === 'mobile_bottom' && m.visible; })
      .sort(function (a, b) { return a.order - b.order; })
      .slice(0, 4);

    return (
      '<div class="grid grid-12">' +
      '  <div class="col-7 grid">' +
      '    <div class="card">' +
      '      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">' +
      '        <div><h3 style="margin:0;font-size:15.5px;font-weight:900;">ترتيب جميع أقسام رهط بوست (سحب وإفلات فوري)</h3><p style="margin:3px 0 0;font-size:12px;color:#94a3b8;">الأخبار • الباصات • الخدمات • الدليل • الحراج • القوائم</p></div>' +
      '        <button class="btn btn-dark" id="resetDefaultsBtn">↺ استعادة الافتراضي</button>' +
      '      </div>' +
      sectionRows +
      '    </div>' +
      '    <div class="card">' +
      '      <h3 style="margin:0 0 14px;font-size:15.5px;font-weight:900;">🎨 إعدادات المظهر والهوية البصرية</h3>' +
      '      <div class="grid grid-2">' +
      '        <div>' +
      '          <label class="label">اللون الرئيسي للهوية</label>' +
      '          <div class="swatches">' +
      COLOR_PRESETS.map(function (c) {
        return '<button class="swatch ' + (app.brandPrimary.toLowerCase() === c.toLowerCase() ? 'active' : '') + '" style="background:' + c + ';" data-color="' + c + '"></button>';
      }).join('') +
      '            <input type="color" id="customColorPicker" value="' + esc(app.brandPrimary) + '" style="width:36px;height:30px;border:0;background:transparent;cursor:pointer;" />' +
      '          </div>' +
      '        </div>' +
      '        <div>' +
      '          <label class="label">وضع الإضاءة</label>' +
      '          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">' +
      [['light', 'فاتح'], ['dark', 'داكن'], ['auto', 'تلقائي']].map(function (pair) {
        return '<button class="btn ' + (app.themeMode === pair[0] ? 'btn-primary' : 'btn-dark') + '" data-app-opt="themeMode" data-val="' + pair[0] + '">' + pair[1] + '</button>';
      }).join('') +
      '          </div>' +
      '        </div>' +
      '        <div>' +
      '          <label class="label">انحناء البطاقات</label>' +
      '          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">' +
      [['sharp', 'حاد'], ['balanced', 'متوازن'], ['rounded', 'ناعم']].map(function (pair) {
        return '<button class="btn ' + (app.borderRadius === pair[0] ? 'btn-primary' : 'btn-dark') + '" data-app-opt="borderRadius" data-val="' + pair[0] + '">' + pair[1] + '</button>';
      }).join('') +
      '          </div>' +
      '        </div>' +
      '        <div>' +
      '          <label class="label">كثافة العرض</label>' +
      '          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">' +
      [['compact', 'مضغوط'], ['comfortable', 'متوازن'], ['spacious', 'واسع']].map(function (pair) {
        return '<button class="btn ' + (app.density === pair[0] ? 'btn-primary' : 'btn-dark') + '" data-app-opt="density" data-val="' + pair[0] + '">' + pair[1] + '</button>';
      }).join('') +
      '          </div>' +
      '        </div>' +
      '        <label class="toggle-row"><span>شريط الأخبار العاجلة</span><input type="checkbox" data-app-chk="showBreakingTicker" ' + (app.showBreakingTicker ? 'checked' : '') + ' /></label>' +
      '        <label class="toggle-row"><span>تثبيت القائمة العلوية</span><input type="checkbox" data-app-chk="stickyHeader" ' + (app.stickyHeader ? 'checked' : '') + ' /></label>' +
      '        <label class="toggle-row"><span>زر البحث السريع</span><input type="checkbox" data-app-chk="showQuickSearch" ' + (app.showQuickSearch ? 'checked' : '') + ' /></label>' +
      '        <label class="toggle-row"><span>ودجت طقس رهط والنقب</span><input type="checkbox" data-app-chk="showCityWeatherWidget" ' + (app.showCityWeatherWidget ? 'checked' : '') + ' /></label>' +
      '        <div style="grid-column:1/-1;"><label class="label">تنويه علوي مؤقت (يظهر في الموقع عند تفعيل الربط)</label><input class="input" id="headerNoticeInput" value="' + esc(app.customHeaderNotice) + '" placeholder="اتركه فارغاً للإخفاء..." /></div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="col-5">' +
      '    <div class="card preview-sticky">' +
      '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
      '        <div><h4 style="margin:0;font-size:14px;font-weight:900;">معاينة الترتيب والمظهر الحية</h4><p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">تحديث لحظي أثناء السحب</p></div>' +
      '        <div style="display:flex;gap:4px;">' +
      '          <button class="btn ' + (state.previewMode === 'mobile' ? 'btn-primary' : 'btn-dark') + ' btn-icon" data-prev="mobile">📱 جوال</button>' +
      '          <button class="btn ' + (state.previewMode === 'desktop' ? 'btn-primary' : 'btn-dark') + ' btn-icon" data-prev="desktop">🖥️ ويب</button>' +
      '        </div>' +
      '      </div>' +
      '      <div class="preview-frame ' + state.previewMode + '" style="background:' + (isLight ? '#f1f5f9' : '#020617') + ';">' +
      '        <div style="background:' + esc(app.brandSecondary) + ';color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:900;">' +
      '          <span><span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:' + esc(app.brandPrimary) + ';margin-left:6px;"></span>رهط بوست</span>' +
      '          <span style="font-size:10px;opacity:0.8;">' + (app.showCityWeatherWidget ? '☀️ 24° رهط ' : '') + (app.showQuickSearch ? '🔍' : '') + '</span>' +
      '        </div>' +
      (app.showBreakingTicker ? '<div style="background:' + esc(app.brandPrimary) + ';color:#020617;padding:5px 12px;font-size:10.5px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">⚡ عاجل: تغطية مستمرة لأخبار رهط والنقب ومواعيد الباصات...</div>' : '') +
      (app.customHeaderNotice ? '<div style="background:rgba(56,189,248,0.2);color:#7dd3fc;padding:5px 12px;font-size:10.5px;font-weight:700;">' + esc(app.customHeaderNotice) + '</div>' : '') +
      '        <div style="padding:12px;display:grid;gap:' + (app.density === 'compact' ? '6px' : app.density === 'spacious' ? '14px' : '9px') + ';">' +
      previewItems +
      '        </div>' +
      (state.previewMode === 'mobile'
        ? '<div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(148,163,184,0.2);padding:8px 4px;text-align:center;font-size:10px;font-weight:800;background:' + (isLight ? '#fff' : '#0f172a') + ';color:' + (isLight ? '#334155' : '#cbd5e1') + ';">' +
          mobileBottomMenus.map(function (m) { return '<span>' + esc(m.label) + '</span>'; }).join('') +
          '</div>'
        : '') +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
  }

  function renderMenus() {
    var list = (state.config.menus || [])
      .filter(function (m) { return m.location === state.menuLocation; })
      .sort(function (a, b) { return a.order - b.order; });

    return (
      '<div class="grid" style="gap:16px;">' +
      '  <div class="grid grid-4">' +
      MENU_LOCS.map(function (loc) {
        var cnt = (state.config.menus || []).filter(function (m) { return m.location === loc.id; }).length;
        return (
          '<button class="card" data-menu-loc="' + loc.id + '" style="text-align:right;cursor:pointer;border-color:' + (state.menuLocation === loc.id ? '#facc15' : '') + ';background:' + (state.menuLocation === loc.id ? 'rgba(250,204,21,0.12)' : '') + ';">' +
          '  <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;font-weight:800;">' + loc.label + '</span><span class="badge">' + cnt + '</span></div>' +
          '</button>'
        );
      }).join('') +
      '  </div>' +
      '  <div class="grid grid-12">' +
      '    <form id="addMenuForm" class="card col-4 grid" style="gap:10px;align-content:start;">' +
      '      <h3 style="margin:0;font-size:15px;font-weight:900;">إضافة رابط جديد</h3>' +
      '      <div><label class="label">اسم الرابط</label><input class="input" name="label" required placeholder="مثال: مواعيد الباصات" /></div>' +
      '      <div><label class="label">الرابط (URL)</label><input class="input" name="url" required dir="ltr" value="/" /></div>' +
      '      <div><label class="label">شارة (اختياري)</label><input class="input" name="badge" placeholder="جديد / مباشر" /></div>' +
      '      <button type="submit" class="btn btn-primary" style="width:100%;">+ إضافة للقائمة</button>' +
      '    </form>' +
      '    <div class="card col-8">' +
      '      <h3 style="margin:0 0 12px;font-size:15px;font-weight:900;">عناصر القائمة (' + list.length + ')</h3>' +
      (list.length === 0
        ? '<p style="color:#94a3b8;font-size:13px;">لا توجد روابط في هذا الموقع بعد.</p>'
        : list.map(function (m, idx) {
            return (
              '<div class="section-row ' + (m.visible ? '' : 'hidden-sec') + '"><div class="section-row-head">' +
              '  <span class="order-num">' + (idx + 1) + '</span>' +
              '  <div style="flex:1;"><div style="font-weight:800;font-size:13.5px;">' + esc(m.label) + (m.badge ? ' <span class="badge">' + esc(m.badge) + '</span>' : '') + '</div><div dir="ltr" style="font-size:11px;color:#94a3b8;text-align:right;">' + esc(m.url) + '</div></div>' +
              '  <button class="btn btn-dark btn-icon" data-m-up="' + esc(m.id) + '">↑</button>' +
              '  <button class="btn btn-dark btn-icon" data-m-down="' + esc(m.id) + '">↓</button>' +
              '  <button class="btn btn-dark btn-icon" data-m-vis="' + esc(m.id) + '">' + (m.visible ? '👁️' : '🙈') + '</button>' +
              '  <button class="btn btn-danger btn-icon" data-m-del="' + esc(m.id) + '">🗑️</button>' +
              '</div></div>'
            );
          }).join('')) +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
  }

  function renderSectionManager(secKey) {
    var meta = SECTION_META[secKey];
    var list = (state.config.sectionItems || [])
      .filter(function (i) { return i.sectionKey === secKey; })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
    var q = state.searchQuery.trim().toLowerCase();
    var filtered = q
      ? list.filter(function (i) { return (i.title + ' ' + i.subtitle + ' ' + i.category + ' ' + i.phoneOrRoute).toLowerCase().indexOf(q) >= 0; })
      : list;

    return (
      '<div class="grid" style="gap:16px;">' +
      '  <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
      '    <div><h3 style="margin:0;font-size:17px;font-weight:900;">' + meta.title + '</h3><p style="margin:3px 0 0;font-size:12px;color:#94a3b8;">كل عنصر يُحفظ مباشرة في rahatpost-layout.json بدون الحاجة لأي جدول جديد</p></div>' +
      '    <input id="secSearchInput" class="input" style="max-width:260px;" value="' + esc(state.searchQuery) + '" placeholder="بحث سريع داخل القسم..." />' +
      '  </div>' +
      '  <div class="grid grid-12">' +
      '    <form id="addItemForm" data-sec="' + secKey + '" class="card col-4 grid" style="gap:10px;align-content:start;">' +
      '      <h4 style="margin:0;color:#facc15;font-size:14px;font-weight:900;">+ إضافة عنصر جديد</h4>' +
      '      <div><label class="label">العنوان الرئيسي</label><input class="input" name="title" required placeholder="' + esc(meta.ph) + '" /></div>' +
      '      <div><label class="label">وصف مختصر</label><textarea class="textarea" name="subtitle" rows="2"></textarea></div>' +
      '      <div class="grid grid-2">' +
      '        <div><label class="label">التصنيف</label><input class="input" name="category" placeholder="عام" /></div>' +
      '        <div><label class="label">شارة</label><input class="input" name="badge" placeholder="مميز" /></div>' +
      '      </div>' +
      '      <div><label class="label">' + meta.f1 + '</label><input class="input" name="phoneOrRoute" /></div>' +
      '      <div><label class="label">' + meta.f2 + '</label><input class="input" name="priceOrTime" /></div>' +
      '      <button type="submit" class="btn btn-primary" style="width:100%;">حفظ وإضافة</button>' +
      '    </form>' +
      '    <div class="card col-8">' +
      '      <h4 style="margin:0 0 12px;font-size:14px;font-weight:900;">العناصر الحالية (' + filtered.length + ')</h4>' +
      (filtered.length === 0
        ? '<p style="color:#94a3b8;font-size:13px;">لا توجد عناصر مطابقة.</p>'
        : filtered.map(function (it, idx) {
            return (
              '<div class="section-row ' + (it.isActive ? '' : 'hidden-sec') + '"><div class="section-row-head">' +
              '  <span class="order-num">#' + (idx + 1) + '</span>' +
              '  <div style="flex:1;min-width:180px;">' +
              '    <div style="font-weight:800;font-size:14px;">' + esc(it.title) + (it.badge ? ' <span class="badge">' + esc(it.badge) + '</span>' : '') + (it.isFeatured ? ' <span class="badge badge-green">★ مثبّت</span>' : '') + '</div>' +
              (it.subtitle ? '<div style="font-size:12px;color:#94a3b8;margin-top:2px;">' + esc(it.subtitle) + '</div>' : '') +
              '    <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">' +
              (it.category ? '<span class="badge badge-muted">' + esc(it.category) + '</span>' : '') +
              (it.phoneOrRoute ? '<span class="badge badge-muted">' + esc(it.phoneOrRoute) + '</span>' : '') +
              (it.priceOrTime ? '<span class="badge">' + esc(it.priceOrTime) + '</span>' : '') +
              '    </div>' +
              '  </div>' +
              '  <div style="display:flex;gap:4px;">' +
              '    <button class="btn btn-dark btn-icon" data-it-up="' + esc(it.id) + '">↑</button>' +
              '    <button class="btn btn-dark btn-icon" data-it-down="' + esc(it.id) + '">↓</button>' +
              '    <button class="btn ' + (it.isFeatured ? 'btn-primary' : 'btn-dark') + ' btn-icon" data-it-feat="' + esc(it.id) + '">★</button>' +
              '    <button class="btn btn-dark btn-icon" data-it-vis="' + esc(it.id) + '">' + (it.isActive ? '👁️' : '🙈') + '</button>' +
              '    <button class="btn btn-danger btn-icon" data-it-del="' + esc(it.id) + '">🗑️</button>' +
              '  </div>' +
              '</div></div>'
            );
          }).join('')) +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
  }

  function renderSync() {
    var c = state.config.compatibility;
    return (
      '<div class="grid" style="gap:16px;">' +
      '  <div class="card">' +
      '    <h3 style="margin:0 0 6px;font-size:16px;font-weight:900;">🛡️ درع حماية الموقع وتطبيقي أندرويد وآبل</h3>' +
      '    <p style="margin:0 0 14px;font-size:12.5px;color:#94a3b8;">كل الخيارات مغلقة افتراضياً للحفاظ على الشكل الحالي 100%. فعّل أي منصة فقط عندما تريد منها تطبيق الترتيب الجديد.</p>' +
      '    <div class="grid grid-2">' +
      '      <label class="toggle-row" style="border-color:rgba(16,185,129,0.4);"><span>الحفاظ على التصميم الأصلي بالكامل (بدون تغيير CSS)</span><input type="checkbox" data-compat="preserveOriginalDesign" ' + (c.preserveOriginalDesign ? 'checked' : '') + ' /></label>' +
      '      <label class="toggle-row"><span>تطبيق الترتيب على الموقع (Web)</span><input type="checkbox" data-compat="applyToWeb" ' + (c.applyToWeb ? 'checked' : '') + ' /></label>' +
      '      <label class="toggle-row"><span>تطبيق الترتيب على تطبيق أندرويد</span><input type="checkbox" data-compat="applyToAndroid" ' + (c.applyToAndroid ? 'checked' : '') + ' /></label>' +
      '      <label class="toggle-row"><span>تطبيق الترتيب على تطبيق آبل (iOS)</span><input type="checkbox" data-compat="applyToIos" ' + (c.applyToIos ? 'checked' : '') + ' /></label>' +
      '      <label class="toggle-row" style="grid-column:1/-1;border-color:rgba(250,204,21,0.35);"><span>⚡ المعاينة الحية على نفس المتصفح (شاهد التغييرات فوراً في تبويب الموقع قبل النشر)</span><input type="checkbox" id="livePreviewToggle" ' + (state.livePreview ? 'checked' : '') + ' /></label>' +
      '    </div>' +
      '  </div>' +

      '  <div class="grid grid-2">' +
      '    <form id="githubForm" class="card grid" style="gap:10px;align-content:start;">' +
      '      <h3 style="margin:0;font-size:15.5px;font-weight:900;">🚀 النشر المباشر لـ GitHub (بدون قاعدة بيانات!)</h3>' +
      '      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">عند الضغط على «نشر مباشر للموقع»، تحدّث اللوحة ملف <code>public/rahatpost-layout.json</code> في مستودعك مباشرة ليقوم Vercel بتحديث الموقع وتطبيقات الجوال فوراً. يُحفظ الرمز في متصفحك فقط.</p>' +
      '      <div><label class="label">اسم المستودع (owner/repo)</label><input class="input" dir="ltr" name="repo" value="' + esc(state.github.repo) + '" placeholder="username/rahatpost" /></div>' +
      '      <div class="grid grid-2">' +
      '        <div><label class="label">الفرع (Branch)</label><input class="input" dir="ltr" name="branch" value="' + esc(state.github.branch || 'main') + '" /></div>' +
      '        <div><label class="label">مسار الملف</label><input class="input" dir="ltr" name="path" value="' + esc(state.github.path || 'public/rahatpost-layout.json') + '" /></div>' +
      '      </div>' +
      '      <div><label class="label">رمز GitHub Personal Access Token (صلاحية Contents: Read & Write)</label><input class="input" dir="ltr" type="password" name="token" value="' + esc(state.github.token) + '" placeholder="github_pat_..." /></div>' +
      '      <div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '        <button type="submit" class="btn btn-primary">حفظ إعدادات الربط</button>' +
      '        <button type="button" class="btn btn-emerald" id="testPublishBtn">🚀 نشر الآن لـ GitHub</button>' +
      '      </div>' +
      '    </form>' +

      '    <div class="card grid" style="gap:12px;align-content:start;">' +
      '      <h3 style="margin:0;font-size:15.5px;font-weight:900;">📦 النسخ الاحتياطي وتغيير رمز الدخول</h3>' +
      '      <div style="display:flex;gap:8px;">' +
      '        <input id="snapNameInput" class="input" placeholder="اسم النسخة الاحتياطية (مثلاً: قبل التعديل)" />' +
      '        <button class="btn btn-primary" id="saveSnapBtn">حفظ نسخة</button>' +
      '      </div>' +
      '      <div style="display:grid;gap:6px;max-height:130px;overflow:auto;">' +
      (state.snapshots.length === 0
        ? '<div style="font-size:12px;color:#64748b;">لا توجد نسخ احتياطية بعد.</div>'
        : state.snapshots.map(function (sn) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;background:#020617;padding:8px 10px;border-radius:10px;font-size:12px;"><span><strong>' + esc(sn.label) + '</strong></span><button class="btn btn-dark btn-icon" data-restore="' + esc(sn.id) + '">↺ استرجاع</button></div>';
          }).join('')) +
      '      </div>' +
      '      <div style="display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid rgba(148,163,184,0.16);padding-top:12px;">' +
      '        <button class="btn btn-dark" id="downloadJsonBtn">⬇️ تحميل rahatpost-layout.json</button>' +
      '        <label class="btn btn-dark" style="cursor:pointer;">⬆️ استيراد JSON<input id="importJsonInput" type="file" accept="application/json" style="display:none;" /></label>' +
      '      </div>' +
      '      <div style="display:flex;gap:8px;border-top:1px solid rgba(148,163,184,0.16);padding-top:12px;">' +
      '        <input id="newPinInput" class="input" type="password" inputmode="numeric" placeholder="رمز دخول جديد (مثلاً 4829)" />' +
      '        <button class="btn btn-dark" id="changePinBtn">تغيير الرمز</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +

      '  <div class="card grid" style="gap:10px;">' +
      '    <h4 style="margin:0;font-size:14px;font-weight:900;">🔗 سطر الربط التلقائي داخل index.html (نفس المشروع)</h4>' +
      '    <pre class="code-box">&lt;script src="/rahatpost-bridge.js" defer&gt;&lt;/script&gt;</pre>' +
      '    <h4 style="margin:6px 0 0;font-size:14px;font-weight:900;">📱 رابط JSON المباشر لتطبيقي أندرويد وآبل (بدون قاعدة بيانات)</h4>' +
      '    <pre class="code-box">GET ' + esc(window.location.origin) + '/rahatpost-layout.json</pre>' +
      '  </div>' +
      '</div>'
    );
  }

  function render() {
    var root = document.getElementById('app');
    if (!state.unlocked) {
      root.innerHTML = renderLock();
      bindEvents();
      return;
    }

    var counts = {
      menus: (state.config.menus || []).length,
      news: (state.config.sectionItems || []).filter(function (i) { return i.sectionKey === 'news'; }).length,
      buses: (state.config.sectionItems || []).filter(function (i) { return i.sectionKey === 'buses'; }).length,
      services: (state.config.sectionItems || []).filter(function (i) { return i.sectionKey === 'services'; }).length,
      directory: (state.config.sectionItems || []).filter(function (i) { return i.sectionKey === 'directory'; }).length,
      haraj: (state.config.sectionItems || []).filter(function (i) { return i.sectionKey === 'haraj'; }).length
    };

    var navItems = [
      { group: 'التحكم الرئيسي', items: [
        { id: 'overview', icon: '📊', label: 'اللوحة السريعة' },
        { id: 'appearance', icon: '🎨', label: 'المظهر وترتيب الأقسام', pill: 'جديد' },
        { id: 'menus', icon: '☰', label: 'إدارة القوائم', count: counts.menus }
      ]},
      { group: 'أقسام رهط بوست', items: [
        { id: 'news', icon: '📰', label: 'الأخبار', count: counts.news },
        { id: 'buses', icon: '🚌', label: 'الباصات والمواصلات', count: counts.buses },
        { id: 'services', icon: '🛠️', label: 'الخدمات', count: counts.services },
        { id: 'directory', icon: '📒', label: 'الدليل التجاري', count: counts.directory },
        { id: 'haraj', icon: '🏷️', label: 'الحراج والإعلانات', count: counts.haraj }
      ]},
      { group: 'الربط والأمان', items: [
        { id: 'sync', icon: '🛡️', label: 'الربط المباشر والحماية' }
      ]}
    ];

    var bodyHtml = '';
    if (state.tab === 'overview') bodyHtml = renderOverview();
    else if (state.tab === 'appearance') bodyHtml = renderAppearance();
    else if (state.tab === 'menus') bodyHtml = renderMenus();
    else if (state.tab === 'sync') bodyHtml = renderSync();
    else bodyHtml = renderSectionManager(state.tab);

    root.innerHTML =
      '<div class="mobile-backdrop ' + (state.mobileOpen ? 'open' : '') + '" id="mobileBackdrop"></div>' +
      '<div class="app-shell">' +
      '  <aside class="sidebar ' + (state.mobileOpen ? 'open' : '') + '">' +
      '    <div class="sidebar-head">' +
      '      <div style="display:flex;align-items:center;gap:10px;">' +
      '        <div class="logo-badge" style="width:38px;height:38px;font-size:15px;border-radius:11px;">RP</div>' +
      '        <div><div style="font-size:15px;font-weight:900;">رهط بوست Pro</div><div style="font-size:11px;color:#facc15;font-weight:700;">بدون قاعدة بيانات جديدة</div></div>' +
      '      </div>' +
      '      <button class="btn btn-dark btn-icon mobile-menu-btn" id="closeSidebarBtn">✕</button>' +
      '    </div>' +
      '    <div class="sidebar-nav">' +
      navItems.map(function (g) {
        return '<div class="nav-group-title">' + g.group + '</div>' + g.items.map(function (it) {
          return (
            '<button class="nav-btn ' + (state.tab === it.id ? 'active' : '') + '" data-tab="' + it.id + '">' +
            '  <span>' + it.icon + '</span><span>' + it.label + '</span>' +
            (it.pill ? '<span class="nav-pill">' + it.pill + '</span>' : '') +
            (typeof it.count === 'number' ? '<span class="nav-count">' + it.count + '</span>' : '') +
            '</button>'
          );
        }).join('');
      }).join('') +
      '    </div>' +
      '    <div class="sidebar-foot"><div class="shield-box"><strong>🛡️ التصميم الأصلي محمي</strong><br/>الموقع وتطبيقا أندرويد وآبل لن يتغير شكلها إلا بتفعيلك.</div></div>' +
      '  </aside>' +
      '  <div class="main-col">' +
      '    <header class="topbar">' +
      '      <div style="display:flex;align-items:center;gap:10px;">' +
      '        <button class="btn btn-dark btn-icon mobile-menu-btn" id="openSidebarBtn">☰</button>' +
      '        <div>' +
      '          <div style="font-size:17px;font-weight:900;">' + (TAB_TITLES[state.tab] || 'لوحة التحكم') + ' <span class="badge badge-muted">v' + (state.config.version || 1) + '</span></div>' +
      '          <div style="font-size:11.5px;color:' + (state.dirty ? '#f59e0b' : '#34d399') + ';font-weight:700;">' + (state.dirty ? '● يوجد تعديلات بانتظار الحفظ أو النشر' : '✓ جميع الإعدادات محفوظة') + '</div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="topbar-actions">' +
      '        <button class="btn btn-dark" id="quickSaveBtn">💾 حفظ سريع</button>' +
      '        <button class="btn btn-primary" id="publishGhBtn" ' + (state.publishing ? 'disabled' : '') + '>' + (state.publishing ? '⏳ جاري النشر...' : '🚀 نشر للموقع') + '</button>' +
      '        <button class="btn btn-dark btn-icon" id="lockBtn" title="قفل اللوحة">🔒</button>' +
      '      </div>' +
      '    </header>' +
      '    <main class="content">' + bodyHtml + '</main>' +
      '  </div>' +
      '</div>';

    bindEvents();
  }

  function bindEvents() {
    var pinForm = document.getElementById('pinForm');
    if (pinForm) {
      pinForm.onsubmit = function (e) {
        e.preventDefault();
        var entered = (document.getElementById('pinInput').value || '').trim();
        var expected = localStorage.getItem(PIN_KEY) || '2026';
        if (entered === expected) {
          sessionStorage.setItem(UNLOCK_KEY, '1');
          state.unlocked = true;
          render();
        } else {
          document.getElementById('pinErr').textContent = 'رمز الدخول غير صحيح';
        }
      };
      return;
    }

    var openBtn = document.getElementById('openSidebarBtn');
    if (openBtn) openBtn.onclick = function () { state.mobileOpen = true; render(); };
    var closeBtn = document.getElementById('closeSidebarBtn');
    if (closeBtn) closeBtn.onclick = function () { state.mobileOpen = false; render(); };
    var backdrop = document.getElementById('mobileBackdrop');
    if (backdrop) backdrop.onclick = function () { state.mobileOpen = false; render(); };

    document.querySelectorAll('[data-tab],[data-go]').forEach(function (el) {
      el.onclick = function () {
        state.tab = el.getAttribute('data-tab') || el.getAttribute('data-go');
        state.mobileOpen = false;
        state.searchQuery = '';
        render();
      };
    });

    var quickSaveBtn = document.getElementById('quickSaveBtn');
    if (quickSaveBtn) quickSaveBtn.onclick = function () { persistLocal(false); render(); };
    var pubBtn = document.getElementById('publishGhBtn');
    if (pubBtn) pubBtn.onclick = publishToGitHub;
    var lockBtn = document.getElementById('lockBtn');
    if (lockBtn) lockBtn.onclick = function () {
      sessionStorage.removeItem(UNLOCK_KEY);
      state.unlocked = false;
      render();
    };

    // Section Ordering (Drag & Drop + Buttons)
    document.querySelectorAll('[data-drag-idx]').forEach(function (row) {
      var idx = Number(row.getAttribute('data-drag-idx'));
      row.ondragstart = function () { state.dragIndex = idx; row.classList.add('dragging'); };
      row.ondragover = function (e) {
        e.preventDefault();
        if (state.dragIndex === null || state.dragIndex === idx) return;
        var list = getSortedSections();
        var moved = list.splice(state.dragIndex, 1)[0];
        list.splice(idx, 0, moved);
        state.dragIndex = idx;
        commitSections(list);
      };
      row.ondragend = function () { state.dragIndex = null; row.classList.remove('dragging'); };
    });

    document.querySelectorAll('[data-sec-up]').forEach(function (b) {
      b.onclick = function () {
        var idx = Number(b.getAttribute('data-sec-up'));
        if (idx <= 0) return;
        var list = getSortedSections();
        var moved = list.splice(idx, 1)[0];
        list.splice(idx - 1, 0, moved);
        commitSections(list);
      };
    });
    document.querySelectorAll('[data-sec-down]').forEach(function (b) {
      b.onclick = function () {
        var idx = Number(b.getAttribute('data-sec-down'));
        var list = getSortedSections();
        if (idx >= list.length - 1) return;
        var moved = list.splice(idx, 1)[0];
        list.splice(idx + 1, 0, moved);
        commitSections(list);
      };
    });
    document.querySelectorAll('[data-sec-vis]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-sec-vis');
        commitSections(getSortedSections().map(function (s) {
          return s.id === id ? Object.assign({}, s, { visible: !s.visible }) : s;
        }));
      };
    });
    document.querySelectorAll('[data-sec-exp]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-sec-exp');
        state.expandedSection = state.expandedSection === id ? null : id;
        render();
      };
    });
    document.querySelectorAll('[data-sec-field]').forEach(function (inp) {
      inp.onchange = function () {
        var id = inp.getAttribute('data-sec-id');
        var field = inp.getAttribute('data-sec-field');
        commitSections(getSortedSections().map(function (s) {
          if (s.id !== id) return s;
          var next = Object.assign({}, s);
          next[field] = inp.value;
          return next;
        }));
      };
    });
    document.querySelectorAll('[data-sec-range]').forEach(function (inp) {
      inp.onchange = function () {
        var id = inp.getAttribute('data-sec-range');
        commitSections(getSortedSections().map(function (s) {
          return s.id === id ? Object.assign({}, s, { itemsLimit: Number(inp.value) }) : s;
        }));
      };
    });
    document.querySelectorAll('[data-sec-plat]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-sec-id');
        var field = b.getAttribute('data-sec-plat');
        commitSections(getSortedSections().map(function (s) {
          if (s.id !== id) return s;
          var next = Object.assign({}, s);
          next[field] = !next[field];
          return next;
        }));
      };
    });

    // Appearance controls
    document.querySelectorAll('[data-color]').forEach(function (b) {
      b.onclick = function () { state.config.appearance.brandPrimary = b.getAttribute('data-color'); markDirty(); render(); };
    });
    var colorPicker = document.getElementById('customColorPicker');
    if (colorPicker) colorPicker.oninput = function () { state.config.appearance.brandPrimary = colorPicker.value; markDirty(); render(); };
    document.querySelectorAll('[data-app-opt]').forEach(function (b) {
      b.onclick = function () {
        state.config.appearance[b.getAttribute('data-app-opt')] = b.getAttribute('data-val');
        markDirty();
        render();
      };
    });
    document.querySelectorAll('[data-app-chk]').forEach(function (chk) {
      chk.onchange = function () {
        state.config.appearance[chk.getAttribute('data-app-chk')] = chk.checked;
        markDirty();
        render();
      };
    });
    var noticeInp = document.getElementById('headerNoticeInput');
    if (noticeInp) noticeInp.onchange = function () { state.config.appearance.customHeaderNotice = noticeInp.value; markDirty(); render(); };
    document.querySelectorAll('[data-prev]').forEach(function (b) {
      b.onclick = function () { state.previewMode = b.getAttribute('data-prev'); render(); };
    });
    var resetBtn = document.getElementById('resetDefaultsBtn');
    if (resetBtn) resetBtn.onclick = function () {
      state.config.sections = JSON.parse(JSON.stringify(DEFAULT_CONFIG.sections));
      state.config.appearance = JSON.parse(JSON.stringify(DEFAULT_CONFIG.appearance));
      markDirty();
      render();
      showToast('تمت استعادة الترتيب والمظهر الافتراضي', 'info');
    };

    // Menus
    document.querySelectorAll('[data-menu-loc]').forEach(function (b) {
      b.onclick = function () { state.menuLocation = b.getAttribute('data-menu-loc'); render(); };
    });
    var addMenuForm = document.getElementById('addMenuForm');
    if (addMenuForm) {
      addMenuForm.onsubmit = function (e) {
        e.preventDefault();
        var fd = new FormData(addMenuForm);
        var locItems = (state.config.menus || []).filter(function (m) { return m.location === state.menuLocation; });
        state.config.menus.push({
          id: 'm-' + Date.now(),
          label: String(fd.get('label') || '').trim(),
          url: String(fd.get('url') || '/').trim(),
          badge: String(fd.get('badge') || '').trim() || undefined,
          location: state.menuLocation,
          order: locItems.length + 1,
          visible: true,
          openInNewTab: false
        });
        markDirty();
        render();
        showToast('تمت إضافة الرابط للقائمة ✓');
      };
    }
    function mutateMenu(id, fn) {
      var loc = state.menuLocation;
      var list = state.config.menus.filter(function (m) { return m.location === loc; }).sort(function (a, b) { return a.order - b.order; });
      var others = state.config.menus.filter(function (m) { return m.location !== loc; });
      var next = fn(list).map(function (m, i) { return Object.assign({}, m, { order: i + 1 }); });
      state.config.menus = others.concat(next);
      markDirty();
      render();
    }
    document.querySelectorAll('[data-m-up]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-m-up');
        mutateMenu(id, function (list) {
          var i = list.findIndex(function (m) { return m.id === id; });
          if (i > 0) { var t = list.splice(i, 1)[0]; list.splice(i - 1, 0, t); }
          return list;
        });
      };
    });
    document.querySelectorAll('[data-m-down]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-m-down');
        mutateMenu(id, function (list) {
          var i = list.findIndex(function (m) { return m.id === id; });
          if (i >= 0 && i < list.length - 1) { var t = list.splice(i, 1)[0]; list.splice(i + 1, 0, t); }
          return list;
        });
      };
    });
    document.querySelectorAll('[data-m-vis]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-m-vis');
        mutateMenu(id, function (list) {
          return list.map(function (m) { return m.id === id ? Object.assign({}, m, { visible: !m.visible }) : m; });
        });
      };
    });
    document.querySelectorAll('[data-m-del]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-m-del');
        mutateMenu(id, function (list) { return list.filter(function (m) { return m.id !== id; }); });
      };
    });

    // Section Quick Items
    var searchInp = document.getElementById('secSearchInput');
    if (searchInp) searchInp.oninput = function () { state.searchQuery = searchInp.value; render(); };
    var addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
      addItemForm.onsubmit = function (e) {
        e.preventDefault();
        var secKey = addItemForm.getAttribute('data-sec');
        var fd = new FormData(addItemForm);
        var cur = (state.config.sectionItems || []).filter(function (i) { return i.sectionKey === secKey; });
        state.config.sectionItems.push({
          id: secKey + '-' + Date.now(),
          sectionKey: secKey,
          title: String(fd.get('title') || '').trim(),
          subtitle: String(fd.get('subtitle') || '').trim(),
          category: String(fd.get('category') || 'عام').trim(),
          badge: String(fd.get('badge') || '').trim(),
          phoneOrRoute: String(fd.get('phoneOrRoute') || '').trim(),
          priceOrTime: String(fd.get('priceOrTime') || '').trim(),
          isFeatured: false,
          isActive: true,
          sortOrder: cur.length + 1
        });
        markDirty();
        render();
        showToast('تمت إضافة العنصر بنجاح ✓');
      };
    }
    function mutateItem(id, fn) {
      var target = state.config.sectionItems.find(function (i) { return i.id === id; });
      if (!target) return;
      var k = target.sectionKey;
      var list = state.config.sectionItems.filter(function (i) { return i.sectionKey === k; }).sort(function (a, b) { return a.sortOrder - b.sortOrder; });
      var others = state.config.sectionItems.filter(function (i) { return i.sectionKey !== k; });
      var next = fn(list).map(function (it, idx) { return Object.assign({}, it, { sortOrder: idx + 1 }); });
      state.config.sectionItems = others.concat(next);
      markDirty();
      render();
    }
    document.querySelectorAll('[data-it-up]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-it-up');
        mutateItem(id, function (list) {
          var i = list.findIndex(function (x) { return x.id === id; });
          if (i > 0) { var t = list.splice(i, 1)[0]; list.splice(i - 1, 0, t); }
          return list;
        });
      };
    });
    document.querySelectorAll('[data-it-down]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-it-down');
        mutateItem(id, function (list) {
          var i = list.findIndex(function (x) { return x.id === id; });
          if (i >= 0 && i < list.length - 1) { var t = list.splice(i, 1)[0]; list.splice(i + 1, 0, t); }
          return list;
        });
      };
    });
    document.querySelectorAll('[data-it-feat]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-it-feat');
        mutateItem(id, function (list) { return list.map(function (x) { return x.id === id ? Object.assign({}, x, { isFeatured: !x.isFeatured }) : x; }); });
      };
    });
    document.querySelectorAll('[data-it-vis]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-it-vis');
        mutateItem(id, function (list) { return list.map(function (x) { return x.id === id ? Object.assign({}, x, { isActive: !x.isActive }) : x; }); });
      };
    });
    document.querySelectorAll('[data-it-del]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-it-del');
        mutateItem(id, function (list) { return list.filter(function (x) { return x.id !== id; }); });
      };
    });

    // Sync & Compatibility
    document.querySelectorAll('[data-compat]').forEach(function (chk) {
      chk.onchange = function () {
        state.config.compatibility[chk.getAttribute('data-compat')] = chk.checked;
        markDirty();
        render();
      };
    });
    var liveToggle = document.getElementById('livePreviewToggle');
    if (liveToggle) {
      liveToggle.onchange = function () {
        state.livePreview = liveToggle.checked;
        localStorage.setItem(PREVIEW_KEY, liveToggle.checked ? '1' : '0');
        persistLocal(true);
        showToast(liveToggle.checked ? 'تم تفعيل المعاينة الحية على الموقع في هذا المتصفح' : 'تم إيقاف المعاينة الحية', 'info');
      };
    }
    var ghForm = document.getElementById('githubForm');
    if (ghForm) {
      ghForm.onsubmit = function (e) {
        e.preventDefault();
        var fd = new FormData(ghForm);
        state.github = {
          repo: String(fd.get('repo') || '').trim(),
          branch: String(fd.get('branch') || 'main').trim(),
          path: String(fd.get('path') || 'public/rahatpost-layout.json').trim(),
          token: String(fd.get('token') || '').trim()
        };
        localStorage.setItem(GH_KEY, JSON.stringify(state.github));
        showToast('تم حفظ إعدادات الربط مع GitHub محلياً ✓');
      };
    }
    var testPub = document.getElementById('testPublishBtn');
    if (testPub) testPub.onclick = publishToGitHub;

    var saveSnapBtn = document.getElementById('saveSnapBtn');
    if (saveSnapBtn) saveSnapBtn.onclick = function () {
      var label = (document.getElementById('snapNameInput').value || '').trim() || ('نسخة v' + state.config.version);
      state.snapshots.unshift({ id: 'snap-' + Date.now(), label: label, config: JSON.parse(JSON.stringify(state.config)) });
      state.snapshots = state.snapshots.slice(0, 12);
      localStorage.setItem(SNAP_KEY, JSON.stringify(state.snapshots));
      render();
      showToast('تم حفظ النسخة الاحتياطية ✓');
    };
    document.querySelectorAll('[data-restore]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-restore');
        var found = state.snapshots.find(function (s) { return s.id === id; });
        if (found) {
          state.config = JSON.parse(JSON.stringify(found.config));
          markDirty();
          render();
          showToast('تم استرجاع النسخة: ' + found.label, 'info');
        }
      };
    });
    var dlBtn = document.getElementById('downloadJsonBtn');
    if (dlBtn) dlBtn.onclick = downloadJson;
    var impInp = document.getElementById('importJsonInput');
    if (impInp) impInp.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(String(reader.result));
          if (!parsed.sections || !parsed.appearance) throw new Error('bad');
          state.config = parsed;
          markDirty();
          render();
          showToast('تم استيراد ملف الإعدادات بنجاح ✓');
        } catch (_) {
          showToast('ملف JSON غير صالح', 'warn');
        }
      };
      reader.readAsText(file);
    };
    var pinBtn = document.getElementById('changePinBtn');
    if (pinBtn) pinBtn.onclick = function () {
      var np = (document.getElementById('newPinInput').value || '').trim();
      if (np.length < 4) {
        showToast('أدخل رمزاً من 4 أرقام على الأقل', 'warn');
        return;
      }
      localStorage.setItem(PIN_KEY, np);
      document.getElementById('newPinInput').value = '';
      showToast('تم تحديث رمز الدخول السري ✓');
    };
  }

  // Ctrl+S shortcut
  window.addEventListener('keydown', function (e) {
    if (!state.unlocked) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      persistLocal(false);
      render();
    }
  });

  loadInitialData();
  render();
})();
