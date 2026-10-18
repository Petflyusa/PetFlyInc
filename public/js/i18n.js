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
      'nav.petconnect': 'PetConnect',
      'nav.contract': 'Contract',
      'nav.quote': 'Quote',
      'nav.regulations': 'Regulations',
      'nav.contact': 'Contact',
      'nav.clientLogin': 'Client Login',
      'nav.importBrokerage': 'Import Brokerage',
      'language.label': 'Language',
      'language.english': 'English',
      'language.spanish': 'Spanish',
      'language.chinese': 'Chinese'
      ,'contract.translationDisclaimer':'Translation notice: This translated contract is provided for convenience only. Pet Fly Inc is a U.S.-based company, and the English version is the controlling and legally binding version of this agreement.'
    },
    es: {
      'nav.home': 'Inicio',
      'nav.services': 'Servicios',
      'nav.petconnect': 'PetConnect',
      'nav.contract': 'Contrato',
      'nav.quote': 'Cotizacion',
      'nav.regulations': 'Regulaciones',
      'nav.contact': 'Contacto',
      'nav.clientLogin': 'Acceso de cliente',
      'nav.importBrokerage': 'Gestión de importación',
      'language.label': 'Idioma',
      'language.english': 'Ingles',
      'language.spanish': 'Espanol',
      'language.chinese': 'Chino'
      ,'contract.translationDisclaimer':'Aviso de traduccion: Este contrato traducido se proporciona solo para su conveniencia. Pet Fly Inc es una empresa con sede en Estados Unidos, y la version en ingles es la version que prevalece y es legalmente vinculante de este acuerdo.'
    },
    zh: {
      'nav.home': '首页',
      'nav.services': '服务',
      'nav.petconnect': 'PetConnect',
      'nav.contract': '合同',
      'nav.quote': '报价',
      'nav.regulations': '法规',
      'nav.contact': '联系我们',
      'nav.clientLogin': '客户登录',
      'nav.importBrokerage': '进口代理',
      'language.label': '语言',
      'language.english': '英语',
      'language.spanish': '西班牙语',
      'language.chinese': '中文'
      ,'contract.translationDisclaimer':'翻译说明：本译文仅供参考。Pet Fly Inc 是一家总部位于美国的公司，本协议的英文版本为具有控制效力和法律约束力的版本。'
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
      ,'Terms and Conditions':'Terminos y condiciones', 'Client Signature':'Firma del cliente', 'Full legal name':'Nombre legal completo',
      'Draw your signature':'Dibuje su firma', 'Clear signature':'Borrar firma',
      'I have reviewed this contract, confirm the information I provided is accurate, and agree to all terms and conditions.':'He revisado este contrato, confirmo que la informacion proporcionada es correcta y acepto todos los terminos y condiciones.'
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
      'Import Permit':'Permiso de importación', 'Health Certificate':'Certificado de salud', 'Quarantine':'Cuarentena',
      'What We Do':'Lo que hacemos', 'Our Services':'Nuestros servicios', 'The Process':'El proceso', 'Global Presence':'Presencia global', 'Our offices around the world':'Nuestras oficinas alrededor del mundo',
      'Transport Quote':'Cotización de transporte', 'Request your':'Solicita tu', 'personalised quote.':'cotización personalizada.', 'What to expect':'Qué esperar', 'Pet and shipment':'Mascota y envío', 'Your details':'Tus datos', 'Import country *':'País de importación *', 'Select destination country':'Selecciona el país de destino', 'Import city, airport, or port':'Ciudad, aeropuerto o puerto de importación', 'Estimated arrival date':'Fecha estimada de llegada', 'Pet type':'Tipo de mascota', 'Number of pets':'Número de mascotas', 'Document status':'Estado de documentos', 'Airline':'Aerolínea', 'Air waybill (AWB) number':'Número de guía aérea (AWB)', 'Flight details':'Detalles del vuelo', 'Support requested':'Ayuda solicitada', 'Additional details':'Detalles adicionales', 'Send import brokerage request':'Enviar solicitud de gestión de importación', 'Request received':'Solicitud recibida',
      'Worldwide Import Brokerage':'Gestión de importación mundial', 'How it works':'Cómo funciona', 'One request for any destination.':'Una solicitud para cualquier destino.', 'Worldwide destination support':'Asistencia para destinos en todo el mundo', 'Import permit / document review':'Revisión de permisos y documentos de importación', 'Customs clearance coordination':'Coordinación del despacho aduanero', 'Airport or port release coordination':'Coordinación de liberación en aeropuerto o puerto', 'Quarantine / inspection guidance':'Orientación sobre cuarentena e inspección', 'Local delivery coordination':'Coordinación de entrega local', 'What We Offer':'Lo que ofrecemos', 'Essentials':'Aspectos esenciales', 'Equipment':'Equipamiento', 'Assistance Dog Travel Support':'Asistencia para viajar con perros de servicio'
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
      ,'Terms and Conditions':'条款和条件', 'Client Signature':'客户签名', 'Full legal name':'法定全名',
      'Draw your signature':'绘制您的签名', 'Clear signature':'清除签名',
      'I have reviewed this contract, confirm the information I provided is accurate, and agree to all terms and conditions.':'我已审阅本合同，确认所提供的信息准确无误，并同意所有条款和条件。'
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
      'Import Permit':'进口许可证', 'Health Certificate':'健康证明', 'Quarantine':'隔离',
      'What We Do':'我们做什么', 'Our Services':'我们的服务', 'The Process':'流程', 'Global Presence':'全球布局', 'Our offices around the world':'我们遍布全球的办公室',
      'Transport Quote':'运输报价', 'Request your':'申请您的', 'personalised quote.':'个性化报价。', 'What to expect':'您将获得什么', 'Pet and shipment':'宠物与运输', 'Your details':'您的信息', 'Import country *':'进口国家 *', 'Select destination country':'选择目的地国家', 'Import city, airport, or port':'进口城市、机场或港口', 'Estimated arrival date':'预计到达日期', 'Pet type':'宠物类型', 'Number of pets':'宠物数量', 'Document status':'文件状态', 'Airline':'航空公司', 'Air waybill (AWB) number':'航空运单（AWB）号码', 'Flight details':'航班详情', 'Support requested':'所需服务', 'Additional details':'补充信息', 'Send import brokerage request':'发送进口代理申请', 'Request received':'已收到申请',
      'Worldwide Import Brokerage':'全球进口代理', 'How it works':'服务流程', 'One request for any destination.':'一份申请，覆盖任何目的地。', 'Worldwide destination support':'全球目的地支持', 'Import permit / document review':'进口许可和文件审核', 'Customs clearance coordination':'海关清关协调', 'Airport or port release coordination':'机场或港口放行协调', 'Quarantine / inspection guidance':'检疫和检查指导', 'Local delivery coordination':'当地配送协调', 'What We Offer':'我们的服务', 'Essentials':'基础服务', 'Equipment':'设备', 'Assistance Dog Travel Support':'辅助犬旅行支持'
    }
  };

  // Shared public-page copy. Keeping this map literal-based lets legacy EJS
  // content and database-managed text participate in the same language switch.
  Object.assign(literalTranslations.es, {
    'Import Brokerage':'Gestión de importación', 'Navigate':'Navegación', 'View Site':'Ver sitio',
    'Scroll':'Desplazar', 'About':'Acerca de nosotros', 'Customer Stories':'Historias de clientes', 'Trusted with every journey.':'La confianza en cada viaje.',
    'Simple steps to global peace of mind':'Pasos sencillos para viajar con tranquilidad', 'Initial assessment & route planning':'Evaluación inicial y planificación de ruta', 'Documentation preparation & review':'Preparación y revisión de documentos', 'Container consultation & delivery':'Asesoría y entrega del contenedor', 'Airport handling & customs clearance':'Gestión aeroportuaria y despacho aduanero', 'Door-to-door delivery at destination':'Entrega puerta a puerta en el destino',
    'Services crafted':'Servicios diseñados', 'for every journey.':'para cada viaje.', 'From solo travelers to entire families of animals — we handle international pet transport with precision and genuine care.':'Desde viajeros individuales hasta familias enteras de animales, gestionamos el transporte internacional con precisión y verdadero cuidado.',
    'Complete door-to-door relocation service covering 15+ countries. We manage the entire process — from pickup at your door to final delivery at the destination.':'Servicio completo puerta a puerta en más de 15 países. Gestionamos todo el proceso, desde la recogida hasta la entrega final.', 'Health certificate preparation & vet coordination':'Preparación del certificado sanitario y coordinación veterinaria', 'Import permit applications':'Solicitudes de permisos de importación', 'Microchip & vaccination record management':'Gestión de microchip y vacunas', 'Customs clearance assistance':'Asistencia con el despacho aduanero',
    'Professional sizing consultation':'Asesoría profesional de medidas', 'ISO-standard containers available':'Contenedores con estándar ISO disponibles', 'Ventilation and temperature management':'Gestión de ventilación y temperatura', 'Water dishes and absorbent bedding included':'Incluye recipientes de agua y cama absorbente', 'Delivery to your door before travel':'Entrega en su domicilio antes del viaje',
    'Partner-program documentation guidance':'Orientación sobre documentos del programa asociado', 'Airline and destination requirement review':'Revisión de requisitos de aerolínea y destino', 'Travel planning for an assistance-dog team':'Planificación de viaje para equipos con perros de asistencia', 'Clear distinction between program records and legal requirements':'Distinción clara entre registros del programa y requisitos legales',
    'Worldwide destination support':'Asistencia para destinos de todo el mundo', 'Local delivery coordination':'Coordinación de entrega local', 'Full Insurance':'Seguro completo', 'Comprehensive transit coverage for all shipments':'Cobertura integral durante el tránsito de todos los envíos', 'IATA Certified':'Certificado por IATA', 'USDA Accredited':'Acreditado por USDA',
    'Select':'Seleccionar', 'Dog':'Perro', 'Cat':'Gato', 'Bird':'Ave', 'Rabbit':'Conejo', 'Other':'Otro', 'Male':'Macho', 'Female':'Hembra', 'Color':'Color', 'Gender':'Sexo', 'Travel Date':'Fecha de viaje', 'Pickup & Delivery Service':'Servicio de recogida y entrega', 'Pickup Address':'Dirección de recogida', 'Delivery Address':'Dirección de entrega', 'Color':'Color',
    'Message *':'Mensaje *', 'Phone':'Teléfono', 'Select destination country':'Seleccionar país de destino', 'Documents ready':'Documentos listos', 'Some documents ready':'Algunos documentos listos', 'Documents not started':'Documentos no iniciados', 'Not sure what is required':'No sé qué se requiere', 'Other / not listed':'Otro / no aparece en la lista', 'Flight details':'Detalles del vuelo', 'Air waybill (AWB) number':'Número de guía aérea (AWB)', 'Send import brokerage request':'Enviar solicitud de gestión de importación', 'We’ll be in touch within 24 hours.':'Nos pondremos en contacto en 24 horas.'
    , 'Whether you have a question, need a quote, or want to discuss your pet\'s specific requirements — our team is here to help.':'Si tienes una pregunta, necesitas una cotización o quieres hablar sobre las necesidades específicas de tu mascota, estamos aquí para ayudarte.', 'For existing shipments requiring urgent assistance outside business hours':'Para envíos existentes que necesiten asistencia urgente fuera del horario laboral', 'We\'ll be in touch within 24 hours.':'Nos pondremos en contacto en 24 horas.'
  });
  Object.assign(literalTranslations.zh, {
    'Import Brokerage':'进口代理', 'Navigate':'导航', 'View Site':'查看网站',
    'Scroll':'滚动', 'About':'关于我们', 'Customer Stories':'客户故事', 'Trusted with every journey.':'每段旅程都值得信赖。',
    'Simple steps to global peace of mind':'轻松获得全球安心的步骤', 'Initial assessment & route planning':'初步评估与路线规划', 'Documentation preparation & review':'文件准备与审核', 'Container consultation & delivery':'运输箱咨询与配送', 'Airport handling & customs clearance':'机场操作与海关清关', 'Door-to-door delivery at destination':'目的地门到门配送',
    'Services crafted':'为每段旅程打造的', 'for every journey.':'专业服务。', 'From solo travelers to entire families of animals — we handle international pet transport with precision and genuine care.':'无论是单只宠物还是完整的动物家庭，我们都以精准和真诚的关怀处理国际宠物运输。',
    'Complete door-to-door relocation service covering 15+ countries. We manage the entire process — from pickup at your door to final delivery at the destination.':'覆盖15多个国家的完整门到门搬迁服务。我们管理从上门接送到目的地最终交付的全过程。', 'Health certificate preparation & vet coordination':'健康证明准备与兽医协调', 'Import permit applications':'进口许可申请', 'Microchip & vaccination record management':'芯片与疫苗记录管理', 'Customs clearance assistance':'海关清关协助',
    'Professional sizing consultation':'专业尺寸咨询', 'ISO-standard containers available':'提供ISO标准运输箱', 'Ventilation and temperature management':'通风与温度管理', 'Water dishes and absorbent bedding included':'包含饮水器和吸水垫料', 'Delivery to your door before travel':'旅行前送到您的家门口',
    'Partner-program documentation guidance':'合作项目文件指导', 'Airline and destination requirement review':'航空公司与目的地要求审核', 'Travel planning for an assistance-dog team':'辅助犬团队旅行规划', 'Clear distinction between program records and legal requirements':'清楚区分项目记录与法律要求',
    'Worldwide destination support':'全球目的地支持', 'Local delivery coordination':'当地配送协调', 'Full Insurance':'全程保险', 'Comprehensive transit coverage for all shipments':'所有运输的全面途中保障', 'IATA Certified':'IATA认证', 'USDA Accredited':'USDA认可',
    'Select':'选择', 'Dog':'狗', 'Cat':'猫', 'Bird':'鸟', 'Rabbit':'兔子', 'Other':'其他', 'Male':'公', 'Female':'母', 'Color':'颜色', 'Gender':'性别', 'Travel Date':'旅行日期', 'Pickup & Delivery Service':'接送服务', 'Pickup Address':'接送地址', 'Delivery Address':'送达地址', 'Message *':'消息 *', 'Phone':'电话', 'Select destination country':'选择目的地国家', 'Documents ready':'文件已准备', 'Some documents ready':'部分文件已准备', 'Documents not started':'文件尚未开始', 'Not sure what is required':'不确定需要哪些文件', 'Other / not listed':'其他 / 未列出', 'Flight details':'航班详情', 'Air waybill (AWB) number':'航空运单（AWB）号码', 'Send import brokerage request':'发送进口代理申请', 'We’ll be in touch within 24 hours.':'我们将在24小时内联系您。'
    , 'Whether you have a question, need a quote, or want to discuss your pet\'s specific requirements — our team is here to help.':'如果您有问题、需要报价，或想讨论宠物的具体需求，我们随时为您提供帮助。', 'For existing shipments requiring urgent assistance outside business hours':'为现有运输在工作时间之外提供紧急协助', 'We\'ll be in touch within 24 hours.':'我们将在24小时内联系您。'
  });

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

  function translateText(language, value) {
    var selected = normalizeLanguage(language) || 'en';
    var source = String(value == null ? '' : value);
    if (selected === 'en' || !source) return source;
    var map = literalTranslations[selected] || {};
    Object.keys(map).sort(function (a, b) { return b.length - a.length; }).forEach(function (phrase) {
      if (!phrase || phrase.length < 2 || source.indexOf(phrase) === -1) return;
      source = source.split(phrase).join(map[phrase]);
    });
    return source;
  }

  function translateTextNodes(root, language) {
    if (!root || !global || !global.document || !global.document.createTreeWalker) return;
    var walker = global.document.createTreeWalker(root, 4);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parent = node.parentElement;
      var source = originalText && originalText.get(node) || node.nodeValue.trim();
      if (!source || !parent || /^(SCRIPT|STYLE)$/i.test(parent.tagName)) return;
      if (originalText) originalText.set(node, source);
      var translated = translateText(language, source);
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
    // Legacy pages use plain placeholders and labels. Translate these literal
    // attributes too, while key-based attributes above remain authoritative.
    root.querySelectorAll('[placeholder], [title]').forEach(function (element) {
      ['placeholder', 'title'].forEach(function (attribute) {
        if (element.hasAttribute(attribute) && !element.hasAttribute('data-i18n-' + attribute)) {
          element.setAttribute(attribute, translateText(selectedLanguage, element.getAttribute(attribute)));
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
    translateText: translateText,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    apply: apply,
    observe: observe
  };
}));
