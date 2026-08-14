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
  var originalText = typeof WeakMap === 'function' ? new WeakMap() : null;
  var dictionaries = {
    en: {
      'nav.home': 'Home',
      'nav.services': 'Services',
      'nav.contract': 'Contract',
      'nav.quote': 'Quote',
      'nav.regulations': 'Regulations',
      'nav.contact': 'Contact',
      'nav.clientLogin': 'Client Login',
      'language.label': 'Language',
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
      'language.label': 'Idioma',
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
      'language.label': '语言',
      'language.english': '英语',
      'language.spanish': '西班牙语',
      'language.chinese': '中文'
    }
  };
  var literalTranslations = {
    es: {
      'Relocation Progress':'Progreso de la reubicacion', 'Relocation Timeline':'Cronologia de la reubicacion',
      'Upcoming Events':'Próximos eventos', 'Documents':'Documentos', 'Pet Photos':'Fotos de la mascota',
      'Boarding Updates':'Actualizaciones de alojamiento', 'Active Relocations':'Reubicaciones activas',
      'Sign in':'Iniciar sesion', 'Sign out':'Cerrar sesion', 'Save password':'Guardar contraseña',
      'Create your password':'Cree su contraseña', 'Email':'Correo electronico', 'Password':'Contraseña',
      'New password':'Nueva contraseña', 'Confirm password':'Confirmar contraseña',
      'Contract Effective Date':'Fecha de vigencia del contrato', 'Client Information':'Información del cliente',
      'Animal Information':'Información de la mascota', 'Travel Details':'Detalles del viaje',
      'Shipment and Delivery':'Envío y entrega', 'Service Quotation':'Cotización del servicio', 'Payment':'Pago',
      'Carrier Details':'Detalles del transportista', 'Agreement':'Acuerdo', 'Departure':'Salida', 'Arrival':'Llegada',
      'Travel Schedule':'Itinerario de viaje', 'Country':'País', 'State / Province':'Estado / provincia',
      'City / Airport':'Ciudad / aeropuerto', 'Travel Date':'Fecha de viaje', 'Airline / Flight':'Aerolínea / vuelo',
      'Transfer City':'Ciudad de conexión', 'Total Cost':'Costo total', 'Remaining Balance':'Saldo restante',
      'Open Contract':'Abrir contrato', 'Sign and Submit Contract':'Firmar y enviar contrato', 'View':'Ver',
      'Not provided':'No proporcionado', 'Not set':'No establecido', 'Not uploaded':'No cargado',
      'Loading relocation details...':'Cargando detalles de la reubicacion...'
      ,'Pet Information':'Información de la mascota', 'Route':'Ruta', 'Your Details':'Sus datos',
      'Pet Type *':'Tipo de mascota *', 'Pet Name':'Nombre de la mascota', 'Date of Birth':'Fecha de nacimiento',
      'Microchip Number':'Número de microchip', 'Origin Country *':'País de origen *', 'Origin City *':'Ciudad de origen *',
      'Destination Country *':'País de destino *', 'Destination City *':'Ciudad de destino *',
      'Pickup Address':'Dirección de recogida', 'Delivery Address':'Dirección de entrega', 'Additional Notes':'Notas adicionales',
      'Send a Message':'Enviar un mensaje', 'Your Name *':'Su nombre *', 'Subject *':'Asunto *',
      'Request a Quote':'Solicitar una cotización', 'Get a Quote':'Obtener una cotización', 'Get in Touch':'Póngase en contacto',
      'Our Offices':'Nuestras oficinas', 'What We Offer':'Lo que ofrecemos', 'Core Service':'Servicio principal',
      'International Pet Transportation':'Transporte internacional de mascotas', 'Documentation & Compliance':'Documentación y cumplimiento',
      'IATA-Approved Transport Containers':'Contenedores de transporte aprobados por IATA', 'Country Regulations':'Regulaciones del país',
      'Airline Regulations':'Regulaciones de aerolíneas', 'Select a Country':'Seleccione un país', 'Select an Airline':'Seleccione una aerolínea',
      'Need Help?':'¿Necesita ayuda?', 'Overview':'Resumen', 'Requirements':'Requisitos', 'Breed Restrictions':'Restricciones de raza',
      'Import Permit':'Permiso de importación', 'Health Certificate':'Certificado de salud', 'Quarantine':'Cuarentena'
    },
    zh: {
      'Relocation Progress':'搬迁进度', 'Relocation Timeline':'搬迁时间线', 'Upcoming Events':'即将举行的活动',
      'Documents':'文件', 'Pet Photos':'宠物照片', 'Boarding Updates':'寄养更新', 'Active Relocations':'进行中的搬迁',
      'Sign in':'登录', 'Sign out':'退出登录', 'Save password':'保存密码', 'Create your password':'创建您的密码',
      'Email':'电子邮件', 'Password':'密码', 'New password':'新密码', 'Confirm password':'确认密码',
      'Contract Effective Date':'合同生效日期', 'Client Information':'客户信息', 'Animal Information':'宠物信息',
      'Travel Details':'旅行详情', 'Shipment and Delivery':'运输和送达', 'Service Quotation':'服务报价',
      'Payment':'付款', 'Carrier Details':'承运商信息', 'Agreement':'协议', 'Departure':'出发地', 'Arrival':'抵达地',
      'Travel Schedule':'旅行计划', 'Country':'国家', 'State / Province':'州 / 省', 'City / Airport':'城市 / 机场',
      'Travel Date':'旅行日期', 'Airline / Flight':'航空公司 / 航班', 'Transfer City':'中转城市', 'Total Cost':'总费用',
      'Remaining Balance':'剩余余额', 'Open Contract':'打开合同', 'Sign and Submit Contract':'签署并提交合同',
      'View':'查看', 'Not provided':'未提供', 'Not set':'未设置', 'Not uploaded':'未上传',
      'Loading relocation details...':'正在加载搬迁详情...'
      ,'Pet Information':'宠物信息', 'Route':'路线', 'Your Details':'您的信息', 'Pet Type *':'宠物类型 *',
      'Pet Name':'宠物姓名', 'Date of Birth':'出生日期', 'Microchip Number':'芯片号码', 'Origin Country *':'出发国家 *',
      'Origin City *':'出发城市 *', 'Destination Country *':'目的地国家 *', 'Destination City *':'目的地城市 *',
      'Pickup Address':'接送地址', 'Delivery Address':'送达地址', 'Additional Notes':'附加说明', 'Send a Message':'发送消息',
      'Your Name *':'您的姓名 *', 'Subject *':'主题 *', 'Request a Quote':'获取报价', 'Get a Quote':'获取报价',
      'Get in Touch':'联系我们', 'Our Offices':'我们的办公室', 'What We Offer':'我们的服务', 'Core Service':'核心服务',
      'International Pet Transportation':'国际宠物运输', 'Documentation & Compliance':'文件与合规',
      'IATA-Approved Transport Containers':'IATA 认可的运输箱', 'Country Regulations':'国家规定',
      'Airline Regulations':'航空公司规定', 'Select a Country':'选择国家', 'Select an Airline':'选择航空公司',
      'Need Help?':'需要帮助？', 'Overview':'概览', 'Requirements':'要求', 'Breed Restrictions':'品种限制',
      'Import Permit':'进口许可证', 'Health Certificate':'健康证明', 'Quarantine':'隔离'
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

  function translateLiteral(language, value) {
    var selected = normalizeLanguage(language) || 'en';
    return (literalTranslations[selected] && literalTranslations[selected][value]) || value;
  }

  function translateTextNodes(root, language) {
    if (!root || !global || !global.document || !global.document.createTreeWalker) return;
    var walker = global.document.createTreeWalker(root, 4);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parent = node.parentElement;
      var source = originalText && originalText.get(node) || node.nodeValue.trim();
      if (!source || !parent || /^(SCRIPT|STYLE|TEXTAREA|OPTION)$/i.test(parent.tagName)) return;
      if (originalText) originalText.set(node, source);
      var translated = translateLiteral(language, source);
      if (translated !== source) node.nodeValue = node.nodeValue.replace(source, translated);
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
    translateTextNodes(root, selectedLanguage);
  }

  function observe(root) {
    if (!global || !global.MutationObserver || !root) return;
    var observer = new global.MutationObserver(function (records) {
      var language = getLanguage();
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) apply(node, language);
          if (node.nodeType === 3 && node.parentElement) translateTextNodes(node.parentElement, language);
        });
      });
    });
    observer.observe(root, { childList:true, subtree:true });
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
    translateLiteral: translateLiteral,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    apply: apply,
    observe: observe
  };
}));
