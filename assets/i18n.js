(function () {
  'use strict';

  var LANGUAGES = [
    { code: 'en', trigger: 'EN' },
    { code: 'zh-CN', trigger: '简体中文' },
    { code: 'zh-TW', trigger: '繁體中文' },
    { code: 'ja', trigger: '日本語' },
    { code: 'de', trigger: 'Deutsch' }
  ];
  var DEFAULT_LANG = 'en';
  var STORAGE_KEY = 'whimcut-lang';
  var LOCALES = {
    'en': 'en_US',
    'zh-CN': 'zh_CN',
    'zh-TW': 'zh_TW',
    'ja': 'ja_JP',
    'de': 'de_DE'
  };

  var langToggle = document.getElementById('langToggle');
  var langToggleLabel = document.getElementById('langToggleLabel');
  var langMenu = document.getElementById('langMenu');

  function lookup(data, dottedKey) {
    return dottedKey.split('.').reduce(function (acc, k) {
      return acc == null ? acc : acc[k];
    }, data);
  }

  function isSupported(code) {
    return LANGUAGES.some(function (l) { return l.code === code; });
  }

  function getSavedLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isSupported(saved)) return saved;
    } catch (e) {}
    return null;
  }

  function getUrlLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      var lang = params.get('lang');
      return isSupported(lang) ? lang : null;
    } catch (e) {}
    return null;
  }

  function resolveInitialLang() {
    return getUrlLang() || getSavedLang() || DEFAULT_LANG;
  }

  function triggerLabelFor(code) {
    for (var i = 0; i < LANGUAGES.length; i++) {
      if (LANGUAGES[i].code === code) return LANGUAGES[i].trigger;
    }
    return code;
  }

  function applyTranslations(lang, data) {
    document.documentElement.lang = lang;

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var val = lookup(data, el.getAttribute('data-i18n'));
      if (val != null) el.textContent = val;
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-html]'), function (el) {
      var val = lookup(data, el.getAttribute('data-i18n-html'));
      if (val != null) el.innerHTML = val;
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-attr]'), function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var idx = pair.indexOf(':');
        if (idx === -1) return;
        var attr = pair.slice(0, idx).trim();
        var key = pair.slice(idx + 1).trim();
        var val = lookup(data, key);
        if (val != null) el.setAttribute(attr, val);
      });
    });
  }

  function setMetaContent(attr, value, content) {
    var el = document.querySelector('meta[' + attr + '="' + value + '"]');
    if (el) el.setAttribute('content', content);
  }

  function applyMeta(lang, data) {
    var meta = data.meta || {};
    if (meta.title) {
      document.title = meta.title;
      setMetaContent('property', 'og:title', meta.title);
      setMetaContent('name', 'twitter:title', meta.title);
    }
    if (meta.description) {
      setMetaContent('name', 'description', meta.description);
      setMetaContent('property', 'og:description', meta.description);
      setMetaContent('name', 'twitter:description', meta.description);
    }
    var locale = LOCALES[lang];
    if (locale) setMetaContent('property', 'og:locale', locale);
  }

  function renderMenu(active) {
    if (!langMenu) return;
    Array.prototype.forEach.call(langMenu.querySelectorAll('[data-lang]'), function (item) {
      item.classList.toggle('is-active', item.getAttribute('data-lang') === active);
    });
  }

  function openMenu() {
    if (!langMenu) return;
    langMenu.hidden = false;
    if (langToggle) langToggle.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    if (!langMenu) return;
    langMenu.hidden = true;
    if (langToggle) langToggle.setAttribute('aria-expanded', 'false');
  }

  function reveal() {
    document.documentElement.classList.remove('i18n-loading');
  }

  function setLang(lang) {
    fetch('locales/' + lang + '.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        applyTranslations(lang, data);
        applyMeta(lang, data);
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
        if (langToggleLabel) langToggleLabel.textContent = triggerLabelFor(lang);
        renderMenu(lang);
        closeMenu();
        reveal();
      })
      .catch(function (err) {
        console.error('i18n: failed to load ' + lang, err);
        reveal();
      });
  }

  if (langToggle && langMenu) {
    langToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (langMenu.hidden) openMenu();
      else closeMenu();
    });

    Array.prototype.forEach.call(langMenu.querySelectorAll('[data-lang]'), function (item) {
      item.addEventListener('click', function () {
        setLang(item.getAttribute('data-lang'));
      });
    });

    document.addEventListener('click', closeMenu);
  }

  setLang(window.__INITIAL_LANG__ || resolveInitialLang());
})();
