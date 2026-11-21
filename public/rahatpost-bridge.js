/**
 * RahatPost Zero-DB Live Site Bridge v3
 * =====================================
 * يربط لوحة التحكم الحصرية (/admin-pro/) بالموقع الرئيسي وتطبيقي أندرويد وآبل
 * بدون أي قاعدة بيانات جديدة وبدون المساس بشكل الموقع أو التطبيقات.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.__RAHATPOST_BRIDGE_LOADED__) return;
  window.__RAHATPOST_BRIDGE_LOADED__ = true;

  var LAYOUT_URL = '/rahatpost-layout.json';
  var LOCAL_KEY = 'rahatpost_admin_pro_v3_config';
  var PREVIEW_KEY = 'rahatpost_admin_pro_v3_live_preview';
  var CHANNEL_NAME = 'rahatpost_admin_pro_v3_channel';

  var currentConfig = null;
  var listeners = [];

  function notifyListeners(cfg) {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](cfg);
      } catch (_) {}
    }
    try {
      window.dispatchEvent(new CustomEvent('rahatpost:layout-updated', { detail: cfg }));
    } catch (_) {}
  }

  function applyDomBinding(cfg) {
    if (!cfg || !cfg.compatibility) return;
    if (!cfg.compatibility.applyToWeb) return;

    // 1) Reorder tagged sections safely (data-rp-sections-root + data-rp-section="news|buses|...")
    var sections = Array.isArray(cfg.sections)
      ? cfg.sections.slice().sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        })
      : [];

    var sectionMap = {};
    for (var i = 0; i < sections.length; i++) {
      sectionMap[sections[i].id] = sections[i];
    }

    var roots = document.querySelectorAll('[data-rp-sections-root]');
    roots.forEach(function (root) {
      var nodes = Array.prototype.slice.call(root.querySelectorAll(':scope > [data-rp-section]'));
      if (!nodes.length) return;

      nodes.sort(function (a, b) {
        var idA = a.getAttribute('data-rp-section');
        var idB = b.getAttribute('data-rp-section');
        var ordA = sectionMap[idA] ? sectionMap[idA].order : 999;
        var ordB = sectionMap[idB] ? sectionMap[idB].order : 999;
        return ordA - ordB;
      });

      nodes.forEach(function (node) {
        var id = node.getAttribute('data-rp-section');
        var meta = sectionMap[id];
        if (meta && (!meta.visible || meta.showOnWeb === false)) {
          node.style.display = 'none';
        } else {
          node.style.removeProperty('display');
        }
        root.appendChild(node);
      });
    });

    // 2) Optional non-breaking CSS variables ONLY if preserveOriginalDesign is explicitly turned OFF
    if (!cfg.compatibility.preserveOriginalDesign && cfg.appearance) {
      var rootEl = document.documentElement;
      if (cfg.appearance.brandPrimary) {
        rootEl.style.setProperty('--rp-brand-primary', cfg.appearance.brandPrimary);
      }
      if (cfg.appearance.brandSecondary) {
        rootEl.style.setProperty('--rp-brand-secondary', cfg.appearance.brandSecondary);
      }
      var radiusVal =
        cfg.appearance.borderRadius === 'sharp'
          ? '6px'
          : cfg.appearance.borderRadius === 'rounded'
          ? '18px'
          : '12px';
      rootEl.style.setProperty('--rp-radius', radiusVal);
    }

    // 3) Optional temporary announcement bar ONLY if user typed one
    var existingBar = document.getElementById('rp-dynamic-notice-bar');
    var noticeText = cfg.appearance && cfg.appearance.customHeaderNotice ? String(cfg.appearance.customHeaderNotice).trim() : '';
    if (noticeText) {
      if (!existingBar) {
        existingBar = document.createElement('div');
        existingBar.id = 'rp-dynamic-notice-bar';
        existingBar.setAttribute('dir', 'rtl');
        existingBar.style.cssText =
          'background:#0f172a;color:#facc15;text-align:center;padding:8px 14px;font-size:13px;font-weight:700;border-bottom:1px solid rgba(250,204,21,0.3);position:relative;z-index:9999;font-family:Cairo,system-ui,sans-serif;';
        document.body.insertBefore(existingBar, document.body.firstChild);
      }
      existingBar.textContent = noticeText;
    } else if (existingBar) {
      existingBar.remove();
    }
  }

  function loadLayout() {
    // Allow live admin preview in same browser tab if enabled
    try {
      if (localStorage.getItem(PREVIEW_KEY) === '1') {
        var localRaw = localStorage.getItem(LOCAL_KEY);
        if (localRaw) {
          currentConfig = JSON.parse(localRaw);
          applyDomBinding(currentConfig);
          notifyListeners(currentConfig);
          return Promise.resolve(currentConfig);
        }
      }
    } catch (_) {}

    return fetch(LAYOUT_URL + '?v=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        currentConfig = data;
        applyDomBinding(currentConfig);
        notifyListeners(currentConfig);
        return currentConfig;
      })
      .catch(function () {
        // Silent fallback: keep original site 100% untouched
        return null;
      });
  }

  // Listen to instant cross-tab updates from /admin-pro/
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      var bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = function (event) {
        if (event && event.data && event.data.type === 'LAYOUT_UPDATED' && event.data.payload) {
          currentConfig = event.data.payload;
          applyDomBinding(currentConfig);
          notifyListeners(currentConfig);
        }
      };
    } catch (_) {}
  }

  // Secret keyboard shortcut for admin only: Ctrl + Shift + A
  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'ش')) {
      window.location.href = '/admin-pro/';
    }
  });

  // Public global API for any script or React component on rahatpost.com
  window.RahatPostLayout = {
    getConfig: function () {
      return currentConfig;
    },
    reload: loadLayout,
    getOrderedSections: function (platform) {
      var target = platform || 'web';
      if (!currentConfig || !Array.isArray(currentConfig.sections)) return [];
      return currentConfig.sections
        .filter(function (s) {
          if (!s.visible) return false;
          if (target === 'web') return s.showOnWeb !== false;
          if (target === 'android') return s.showOnAndroid !== false;
          if (target === 'ios') return s.showOnIos !== false;
          return true;
        })
        .sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });
    },
    getMenus: function (location) {
      if (!currentConfig || !Array.isArray(currentConfig.menus)) return [];
      return currentConfig.menus
        .filter(function (m) {
          return m.visible && (!location || m.location === location);
        })
        .sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });
    },
    getSectionItems: function (sectionKey) {
      if (!currentConfig || !Array.isArray(currentConfig.sectionItems)) return [];
      return currentConfig.sectionItems
        .filter(function (it) {
          return it.isActive && (!sectionKey || it.sectionKey === sectionKey);
        })
        .sort(function (a, b) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        });
    },
    onUpdate: function (cb) {
      if (typeof cb === 'function') {
        listeners.push(cb);
        if (currentConfig) cb(currentConfig);
      }
      return function () {
        listeners = listeners.filter(function (fn) {
          return fn !== cb;
        });
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLayout);
  } else {
    loadLayout();
  }
})();
