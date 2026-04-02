/* Abot Kamay WiFi — Website Main JS */
(function () {
  'use strict';

  var MOBILE_NAV_BREAKPOINT = 768;
  var DEFAULT_FETCH_TIMEOUT_MS = 7000;

  function getSupportedLang(lang) {
    return (lang === 'en' || lang === 'tl' || lang === 'zh') ? lang : 'en';
  }

  function normalizePath(pathname) {
    if (!pathname) return '/';
    if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
    return pathname;
  }

  function removeDeprecatedAdvertiserLegalSection() {
    var section = null;
    var byTitleId = document.getElementById('adv-legal-title');
    if (byTitleId && byTitleId.closest) section = byTitleId.closest('section');

    if (!section) {
      var byLegacyLabel = document.querySelector('[data-i18n="advPage.legalTitle"]');
      if (byLegacyLabel && byLegacyLabel.closest) section = byLegacyLabel.closest('section');
    }

    if (section && section.parentNode) {
      section.parentNode.removeChild(section);
      return;
    }

    // Fallback: if legacy cards are detached, remove each card and its parent section.
    var legacyCardKey = document.querySelector('[data-i18n="advPage.legalCard1Title"]');
    if (legacyCardKey && legacyCardKey.closest) {
      var fallbackSection = legacyCardKey.closest('section');
      if (fallbackSection && fallbackSection.parentNode) {
        fallbackSection.parentNode.removeChild(fallbackSection);
      }
    }
  }

  function removeDeprecatedAdvertiserPricingSection() {
    var section = null;
    var byTitleId = document.getElementById('pricing-title');
    if (byTitleId && byTitleId.closest) section = byTitleId.closest('section');

    if (!section) {
      var byLegacyLabel = document.querySelector('[data-i18n="advPage.pricingTitle"]');
      if (byLegacyLabel && byLegacyLabel.closest) section = byLegacyLabel.closest('section');
    }

    if (!section) return;
    if (section.parentNode) section.parentNode.removeChild(section);
  }

  function sanitizeMarqueeStyle(style) {
    return (style === 'scroll' || style === 'static' || style === 'flash') ? style : 'scroll';
  }

  function fetchJsonWithTimeout(url, options, timeoutMs) {
    var ms = typeof timeoutMs === 'number' ? timeoutMs : DEFAULT_FETCH_TIMEOUT_MS;
    var opts = options || {};

    if (typeof AbortController === 'function') {
      var controller = new AbortController();
      var id = setTimeout(function () {
        controller.abort();
      }, ms);
      opts.signal = controller.signal;
      return fetch(url, opts).then(function (res) {
        clearTimeout(id);
        if (!res.ok) throw new Error('HTTP_' + res.status);
        return res.json();
      }, function (err) {
        clearTimeout(id);
        throw err;
      });
    }

    return fetch(url, opts).then(function (res) {
      if (!res.ok) throw new Error('HTTP_' + res.status);
      return res.json();
    });
  }

  function getLegalRouteTarget(lang, pathname) {
    var selectedLang = getSupportedLang(lang);
    var currentPath = normalizePath(pathname || window.location.pathname);

    var privacyPaths = {
      '/privacy-policy.html': true,
      '/privacy.html': true,
      '/privacy-tl.html': true,
      '/privacy-zh.html': true
    };
    var termsPaths = {
      '/terms-of-service.html': true,
      '/terms-of-service-en.html': true,
      '/terms-of-service-tl.html': true,
      '/terms-of-service-zh.html': true
    };

    if (privacyPaths[currentPath]) {
      if (selectedLang === 'tl') return '/privacy-tl.html';
      if (selectedLang === 'zh') return '/privacy-zh.html';
      return '/privacy.html';
    }

    if (termsPaths[currentPath]) {
      if (selectedLang === 'tl') return '/terms-of-service-tl.html';
      if (selectedLang === 'zh') return '/terms-of-service-zh.html';
      return '/terms-of-service-en.html';
    }

    return '';
  }

  function routeLegalPageByLang(lang, shouldReplace) {
    var target = getLegalRouteTarget(lang, window.location.pathname);
    if (!target) return false;
    if (normalizePath(window.location.pathname) === normalizePath(target)) return false;

    if (shouldReplace) {
      window.location.replace(target);
    } else {
      window.location.href = target;
    }
    return true;
  }

  /* ---- Marquee ---- */

  function applyMarqueeData(m) {
    var banner = document.getElementById('marquee-banner');
    if (!banner) return;
    if (!m || !m.enabled) {
      banner.classList.add('hidden');
      return;
    }
    var lang = window.AKI18n ? window.AKI18n.getLang() : 'en';
    var msg = (m.messages && m.messages[lang]) || (m.messages && m.messages.en) || '';
    if (!msg) { banner.classList.add('hidden'); return; }

    banner.style.background = m.bgColor || '#C85A38';
    banner.classList.remove('hidden');

    var track = banner.querySelector('.marquee-track');
    var inner = banner.querySelector('.marquee-inner');
    if (track && inner) {
      var style = sanitizeMarqueeStyle(m.style || 'scroll');
      track.className = 'marquee-track marquee-track--' + style;
      inner.textContent = msg;
      if (style === 'scroll') {
        var sep = '\u2003\u2003\u2003\u2003\u2003\u2003';
        var segment = msg + sep;
        var copies = Math.max(4, Math.ceil(120 / msg.length));
        var repeated = '';
        for (var i = 0; i < copies; i++) repeated += segment;
        inner.textContent = repeated;
      }
    }
  }

  function initMarquee() {
    var closeBtn = document.getElementById('marquee-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        var banner = document.getElementById('marquee-banner');
        if (banner) banner.classList.add('hidden');
      });
    }

    /* Load config.json to get apiBaseUrl + offline fallback marquee */
    fetchJsonWithTimeout('/config.json', null, 5000)
      .catch(function () { return {}; })
      .then(function (cfg) {
        var apiBase = (cfg && cfg.apiBaseUrl) ? cfg.apiBaseUrl.replace(/\/$/, '') : '';

        if (apiBase) {
          /* Try portal API first */
          fetchJsonWithTimeout(apiBase + '/api/status')
            .then(function (data) {
              applyMarqueeData(data && data.marquee);
            })
            .catch(function () {
              /* API unreachable — fall back to config.json marquee */
              applyMarqueeData(cfg && cfg.marquee);
            });
        } else {
          /* No apiBaseUrl configured — use config.json directly */
          applyMarqueeData(cfg && cfg.marquee);
        }
      });
  }

  /* ---- Navigation ---- */
  function initNav() {
    /* Mobile toggle */
    var toggle = document.getElementById('nav-toggle');
    var links = document.getElementById('nav-links');
    if (toggle && links) {
      var closeMenu = function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      };

      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('nav-open', open);
      });

      /* Close on link click */
      var navLinks = links.querySelectorAll('.nav-link');
      for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', function () {
          closeMenu();
        });
      }

      document.addEventListener('click', function (event) {
        if (!links.classList.contains('open')) return;
        var target = event.target;
        var clickedToggle = toggle.contains(target);
        var clickedLinks = links.contains(target);
        if (!clickedToggle && !clickedLinks) closeMenu();
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeMenu();
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > MOBILE_NAV_BREAKPOINT) closeMenu();
      });
    }

    /* Active page highlight */
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var allNavLinks = document.querySelectorAll('.nav-link[data-page]');
    for (var j = 0; j < allNavLinks.length; j++) {
      var link = allNavLinks[j];
      if (link.getAttribute('data-page') === page) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    }
  }

  /* ---- Language Switcher ---- */
  function initLangSwitcher() {
    var btns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var lang = this.getAttribute('data-lang');
        if (window.AKI18n) {
          window.AKI18n.setLang(lang);
          if (routeLegalPageByLang(lang, false)) return;
          window.AKI18n.applyI18n();
          
          /* Re-render marquee in new language */
          initMarquee();
          /* Fire any page-specific re-render */
          if (typeof window.onLangChange === 'function') window.onLangChange(lang);
        }
      });
    }
  }

  /* ---- Contact Form ---- */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type=submit]');
      var success = document.getElementById('form-success');
      if (success) success.classList.remove('show');
      if (btn) btn.disabled = true;

      /* Read config for endpoint */
      fetchJsonWithTimeout('/config.json', null, 5000)
        .catch(function () { return {}; })
        .then(function (cfg) {
          var endpoint = cfg && cfg.contact && cfg.contact.formEndpoint;
          if (endpoint) {
            var data = {};
            var fields = form.querySelectorAll('input,select,textarea');
            for (var i = 0; i < fields.length; i++) {
              if (fields[i].name) data[fields[i].name] = fields[i].value;
            }
            return fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            }).then(function (res) {
              if (!res.ok) throw new Error('CONTACT_ENDPOINT_' + res.status);
              return res;
            });
          }
          /* Fallback: mailto */
          var name = form.querySelector('[name=name]');
          var email = form.querySelector('[name=email]');
          var message = form.querySelector('[name=message]');
          var subject = encodeURIComponent('Abot Kamay Inquiry');
          var body = encodeURIComponent(
            'Name: ' + (name ? name.value : '') + '\n' +
            'Email: ' + (email ? email.value : '') + '\n\n' +
            (message ? message.value : '')
          );
          window.location.href = 'mailto:Founder@abotkamay.net?subject=' + subject + '&body=' + body;
          return null;
        })
        .then(function (result) {
          if (result === false) return;
          if (success) { success.classList.add('show'); }
          form.reset();
          if (btn) btn.disabled = false;
        })
        .catch(function () {
          if (btn) btn.disabled = false;
        });
    });
  }

  /* ---- Scroll-reveal (simple, no deps) — skipped when GSAP handles it ---- */
  function initScrollReveal() {
    if (document.body.classList.contains('gsap-ready')) return;
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    for (var i = 0; i < els.length; i++) {
      var children = els[i].children;
      for (var c = 0; c < children.length; c++) {
        children[c].style.setProperty('--reveal-delay', (Math.min(c, 7) * 70) + 'ms');
      }
      if (prefersReducedMotion || !window.IntersectionObserver) {
        els[i].classList.add('revealed');
      }
    }

    if (prefersReducedMotion || !window.IntersectionObserver) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    for (var j = 0; j < els.length; j++) observer.observe(els[j]);
  }

  /* ---- Stats counter animation ---- */
  function initStatsCounter() {
    if (!window.IntersectionObserver) return;
    var stats = document.querySelectorAll('[data-count]');
    if (!stats.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = el.getAttribute('data-count');
        el.textContent = target; /* Just set immediately — no animation needed for symbols like "50+" */
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });
    for (var i = 0; i < stats.length; i++) observer.observe(stats[i]);
  }

  /* ---- Load contact details from config ---- */
  function initContactInfo() {
    var emailEls = document.querySelectorAll('[data-config-email]');
    var phoneEls = document.querySelectorAll('[data-config-phone]');
    var addrEls  = document.querySelectorAll('[data-config-address]');
    if (!emailEls.length && !phoneEls.length && !addrEls.length) return;

    fetch('/config.json')
      .then(function (r) { return r.json(); })
      .catch(function () { return {}; })
      .then(function (cfg) {
        var c = (cfg && cfg.contact) || {};
        for (var i = 0; i < emailEls.length; i++) emailEls[i].textContent = c.email || 'Founder@abotkamay.net';
        for (var j = 0; j < phoneEls.length; j++) phoneEls[j].textContent = c.phone || '+63 XXX XXX XXXX';
        for (var k = 0; k < addrEls.length; k++)  addrEls[k].textContent  = c.address || 'Metro Manila, Philippines';
      });
  }

  /* ---- Init ---- */
  function init() {
    if (window.AKI18n && routeLegalPageByLang(window.AKI18n.getLang(), true)) return;
    removeDeprecatedAdvertiserLegalSection();
    removeDeprecatedAdvertiserPricingSection();
    if (window.AKI18n) window.AKI18n.applyI18n();
    initMarquee();
    initNav();
    initLangSwitcher();
    initContactForm();
    initScrollReveal();
    initStatsCounter();
    initContactInfo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
