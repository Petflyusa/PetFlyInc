(function (root, factory) {
  var api = factory(root);

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.PetFlyI18n = api;
  }
}(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null, function (global) {
  'use strict';

  var storageKey = 'petfly_language';
  var dictionaries = {
    en: {
      'nav.home': 'Home',
      'nav.services': 'Services',
      'nav.contract': 'Contract',
      'nav.quote': 'Quote',
      'nav.regulations': 'Regulations',
      'nav.contact': 'Contact',
      'nav.clientLogin': 'Client Login',
      'language.english': 'English',
      'language.spanish': 'Spanish',
      'language.chinese': 'Chinese'
    },
    es: {
      'nav.home': 'Inicio',
      'nav.services': 'Servicios',
      'nav.contract': 'Contrato',
      'nav.quote': 'Cotizacion',
      'nav.regulations': 'Regulaciones',
      'nav.contact': 'Contacto',
      'nav.clientLogin': 'Acceso de cliente',
      'language.english': 'Ingles',
      'language.spanish': 'Espanol',
      'language.chinese': 'Chino'
    },
    zh: {
      'nav.home': '首页',
      'nav.services': '服务',
      'nav.contract': '合同',
      'nav.quote': '报价',
      'nav.regulations': '法规',
      'nav.contact': '联系我们',
      'nav.clientLogin': '客户登录',
      'language.english': '英语',
      'language.spanish': '西班牙语',
      'language.chinese': '中文'
    }
  };

  function normalizeLanguage(value) {
    var prefix = String(value || '').toLowerCase().split('-')[0];
    return prefix === 'en' || prefix === 'es' || prefix === 'zh' ? prefix : null;
  }

  function normalizeStoredLanguage(value) {
    var language = String(value || '').toLowerCase();
    return language === 'en' || language === 'es' || language === 'zh' ? language : null;
  }

  function resolveLanguage(stored, browserLanguages, fallback) {
    var browserLanguage = (browserLanguages || []).map(normalizeLanguage).find(Boolean);
    var savedLanguage = normalizeStoredLanguage(stored);

    return savedLanguage || browserLanguage || normalizeLanguage(fallback) || 'en';
  }

  function translate(language, key, replacements) {
    var selected = normalizeLanguage(language) || 'en';
    var value = (dictionaries[selected] || dictionaries.en)[key] || dictionaries.en[key] || key;

    return String(value).replace(/\{(\w+)\}/g, function (_, name) {
      return replacements && replacements[name] != null ? replacements[name] : '{' + name + '}';
    });
  }

  function getLanguage() {
    var stored = null;
    var browserLanguages = [];

    if (global) {
      try {
        stored = global.localStorage && global.localStorage.getItem(storageKey);
      } catch (_) {
        stored = null;
      }

      if (global.navigator) {
        browserLanguages = global.navigator.languages || [global.navigator.language];
      }
    }

    return resolveLanguage(stored, browserLanguages, 'en');
  }

  function apply(root, language) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    var selectedLanguage = normalizeLanguage(language) || getLanguage();
    var attributeTargets = [
      ['[data-i18n]', 'data-i18n', 'textContent'],
      ['[data-i18n-placeholder]', 'data-i18n-placeholder', 'placeholder'],
      ['[data-i18n-aria-label]', 'data-i18n-aria-label', 'aria-label']
    ];

    attributeTargets.forEach(function (target) {
      root.querySelectorAll(target[0]).forEach(function (element) {
        var key = element.getAttribute(target[1]);
        var value = translate(selectedLanguage, key);

        if (target[2] === 'aria-label') {
          element.setAttribute(target[2], value);
        } else {
          element[target[2]] = value;
        }
      });
    });
  }

  function setLanguage(language) {
    var chosen = normalizeLanguage(language) || 'en';

    if (global) {
      try {
        if (global.localStorage) {
          global.localStorage.setItem(storageKey, chosen);
        }
      } catch (_) {
        // Browsers can disable storage without preventing localization.
      }

      if (global.document) {
        global.document.documentElement.lang = chosen === 'zh' ? 'zh-CN' : chosen;
        apply(global.document, chosen);
      }
    }

    return chosen;
  }

  return {
    normalizeLanguage: normalizeLanguage,
    resolveLanguage: resolveLanguage,
    translate: translate,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    apply: apply
  };
}));
