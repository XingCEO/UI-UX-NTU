'use strict';

/* ============================================================
   Abot Kamay WiFi — Captive Portal JavaScript
   Version: 1.0.0

   Flow:
     1. Parse Omada redirect params from URL (?clientMac=...&apMac=...&ssidName=...)
     2. POST /api/auth/start — check existing session or get ad to show
     3. User taps "Watch & Connect" → countdown starts → Adcash interstitial fires
     4. After countdown → POST /api/auth/verify → Omada authorises MAC
     5. Success screen → auto-redirect to original destination

   iOS/Android captive portal webview notes:
     - No localStorage persistence (use sessionStorage or in-memory)
     - fetch() works on iOS 13+/Android 5+
     - window.open() blocked — use window.location.href for redirects
     - Keep DOM simple, avoid heavy animations on low-end devices
   ============================================================ */

// ─── Portal Config (from portal-config.js) ───────────────────
var CFG = window.PORTAL_CONFIG || {};
var ADCASH_ZONE_ID      = CFG.adcashZoneId      || '';
var DEFAULT_AD_DURATION = CFG.defaultAdDuration  || 30; // seconds

// Development fallback MAC (used when no clientMac in URL — e.g. direct browser test)
var DEV_TEST_MAC  = '00:11:22:33:44:55';
var DEV_TEST_SSID = 'Abot Kamay Free WiFi (Dev)';

// ─── App State ───────────────────────────────────────────────
var state = {
  lang:           'en',
  clientMac:      '',
  apMac:          '',
  ssidName:       '',
  radioId:        '',
  vid:            '',
  redirectUrl:    '',
  ad:             null,   // {id, type, filePath, durationSec}
  adDuration:     DEFAULT_AD_DURATION,
  viewStartTime:  null,
  countdown:      0,
  countdownTimer: null,
  adcashLoaded:   false,
  noAd:           false,  // true when server has no active ads
};

// ─── User-facing Error Code Registry (mirrors services/error-codes.js) ────────
// Kept inline so it works in captive portal webviews without module bundling.
var ERROR_CODE_MAP = {
  'E-1001': { en: 'Network connection failed',           tl: 'Nabigo ang koneksyon sa network',                           zh: '網路連線失敗' },
  'E-1002': { en: 'Ad failed to load',                   tl: 'Hindi na-load ang advertisement',                           zh: '廣告載入失敗' },
  'E-1003': { en: 'Authentication timeout',              tl: 'Nag-timeout ang pagpapatunay',                              zh: '認證逾時' },
  'E-1004': { en: 'No ads available',                    tl: 'Walang available na advertisement',                         zh: '目前無可用廣告' },
  'E-1005': { en: 'Ad verification failed',              tl: 'Nabigo ang pag-verify ng advertisement',                    zh: '廣告驗證失敗' },
  'E-2001': { en: 'Device blocked',                      tl: 'Na-block ang iyong device',                                 zh: '裝置已被封鎖' },
  'E-2002': { en: 'Session expired',                     tl: 'Nag-expire na ang iyong session',                           zh: 'Session 已過期' },
  'E-2003': { en: 'Invalid device',                      tl: 'Hindi valid ang device',                                    zh: '無效裝置' },
  'E-2004': { en: 'Too many attempts. Please try later.','tl': 'Masyadong maraming pagtatangka.',                         zh: '嘗試次數過多，請稍後再試' },
  'E-3001': { en: 'System maintenance',                  tl: 'Naka-maintenance ang system.',                              zh: '系統維護中' },
  'E-3002': { en: 'Service temporarily unavailable',     tl: 'Hindi muna available ang serbisyo.',                        zh: '服務暫時無法使用' },
  'E-3003': { en: 'Internal server error',               tl: 'May panloob na error sa server',                            zh: '內部伺服器錯誤' },
};

// Support message keys (added to STRINGS below)
// Shown below the error code: "Please provide this code to staff"

// ─── i18n Translations ───────────────────────────────────────
var STRINGS = {
  en: {
    headline:       'Stay connected,<br>on us.',
    subtitle:       'Watch a short ad to enjoy <strong>10 minutes</strong> of free internet access.',
    ssidPrefix:     'Network: ',
    cta:            'Watch &amp; Connect',
    consentPre:     'By connecting, you agree to our\u00a0',
    privacyLink:    'Privacy Policy',
    consentMid:     '\u00a0&amp;\u00a0',
    termsLink:      'Terms of Service',
    consentPost:    '.',
    adLabel:        'YOUR AD IS PLAYING',
    adInstruction:  'Please wait while the ad plays',
    connectLabel:   'Connect Now',
    connectingMsg:  'Connecting\u2026',
    successHeadline:'You\'re connected!',
    successSub:     'Enjoy 10 minutes of free internet access',
    sessionExpiry:  'Expires at\u00a0',
    redirecting:    'Redirecting in\u00a0',
    redirectSec:    's\u2026',
    browseCta:      'Browse Now',
    errorHeadline:  'Something went wrong',
    errorSupport:   'Please share this code with our staff for assistance.',
    retryCta:       'Try Again',
    noAdMsg:        'Connecting you now\u2026',
    maintenanceTitle: 'System Maintenance',
    maintenanceDesc:  'We are performing scheduled maintenance and will be back shortly.',
    upgradingTitle:   'System Upgrade',
    upgradingDesc:    'We are upgrading our systems to serve you better. Hang tight!',
    suspendedTitle:   'Service Suspended',
    suspendedDesc:    'This WiFi service is currently unavailable. Please check back later.',
    customTitle:      'Service Announcement',
    statusEtaPrefix:  'Estimated recovery:\u00a0',
  },
  tl: {
    headline:       'Manatiling konektado,<br>nang libre.',
    subtitle:       'Manood ng maikling ad para mag-enjoy ng <strong>10 minuto</strong> ng libreng internet.',
    ssidPrefix:     'Network: ',
    cta:            'Manood at Kumonekta',
    consentPre:     'Sa pag-konekta, sumasang-ayon ka sa aming\u00a0',
    privacyLink:    'Patakaran sa Privacy',
    consentMid:     '\u00a0at\u00a0',
    termsLink:      'Kasunduan sa Serbisyo',
    consentPost:    '.',
    adLabel:        'PINAPALABAS ANG AD',
    adInstruction:  'Mangyaring hintaying matapos ang ad',
    connectLabel:   'Kumonekta Ngayon',
    connectingMsg:  'Kumokonekta\u2026',
    successHeadline:'Nakakonekta ka na!',
    successSub:     'Mayroon kang 10 minutong libreng internet',
    sessionExpiry:  'Mag-e-expire sa ganap na\u00a0',
    redirecting:    'Nagre-redirect sa loob ng\u00a0',
    redirectSec:    'segundo\u2026',
    browseCta:      'Mag-browse Na',
    errorHeadline:  'May nangyaring mali',
    errorSupport:   'Ibahagi ang code na ito sa aming staff para sa tulong.',
    retryCta:       'Subukang Muli',
    noAdMsg:        'Ikinokonekta na kayo\u2026',
    maintenanceTitle: 'Maintenance ng System',
    maintenanceDesc:  'Nagsasagawa kami ng naka-iskedyul na maintenance. Babalik kami sa loob ng ilang sandali.',
    upgradingTitle:   'Ina-upgrade ang System',
    upgradingDesc:    'Ina-upgrade namin ang aming mga sistema upang mas mapabuti ang aming serbisyo. Maghintay lamang.',
    suspendedTitle:   'Nasuspinde ang Serbisyo',
    suspendedDesc:    'Kasalukuyang hindi available ang serbisyong WiFi na ito. Pakisubukang muli mamaya.',
    customTitle:      'Anunsyo ng Serbisyo',
    statusEtaPrefix:  'Tinatayang oras ng pagbabalik:\u00a0',
  },
  zh: {
    headline:       '保持連線，<br>由我們來。',
    subtitle:       '觀看短暫廣告，享受 <strong>10 分鐘</strong>免費上網。',
    ssidPrefix:     '網路：',
    cta:            '觀看並連線',
    consentPre:     '連線即表示您同意我們的\u00a0',
    privacyLink:    '隱私權政策',
    consentMid:     '\u00a0及\u00a0',
    termsLink:      '服務條款',
    consentPost:    '。',
    adLabel:        '廣告播放中',
    adInstruction:  '請稍候，廣告正在播放',
    connectLabel:   '立即連線',
    connectingMsg:  '連線中\u2026',
    successHeadline:'已成功連線！',
    successSub:     '享 10 分鐘免費上網',
    sessionExpiry:  '到期時間：',
    redirecting:    '即將自動跳轉，倒數\u00a0',
    redirectSec:    '\u00a0秒',
    browseCta:      '開始瀏覽',
    errorHeadline:  '發生錯誤',
    errorSupport:   '請將此錯誤碼提供給工作人員以獲得協助。',
    retryCta:       '重試',
    noAdMsg:        '正在為您連線\u2026',
    maintenanceTitle: '系統維護中',
    maintenanceDesc:  '我們正在進行定期維護，即將恢復服務。',
    upgradingTitle:   '系統升級中',
    upgradingDesc:    '我們正在升級系統以提供更好的服務，請稍候。',
    suspendedTitle:   '服務已暫停',
    suspendedDesc:    '此 WiFi 服務目前無法使用，請稍後再試。',
    customTitle:      '服務公告',
    statusEtaPrefix:  '預計恢復時間：',
  },
};

// ─── Helpers ─────────────────────────────────────────────────
function $(id) {
  return document.getElementById(id);
}

function t(key) {
  var lang = state.lang;
  return (STRINGS[lang] && STRINGS[lang][key] !== undefined)
    ? STRINGS[lang][key]
    : (STRINGS['en'][key] || key);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Language ─────────────────────────────────────────────────
function setLang(lang) {
  if (!STRINGS[lang]) return;
  state.lang = lang;

  try { sessionStorage.setItem('ak_lang', lang); } catch (_) {}

  // html[lang] attribute
  var langAttr = lang === 'zh' ? 'zh-TW' : lang === 'tl' ? 'tl' : 'en';
  document.documentElement.lang = langAttr;

  // Update lang buttons
  var btns = document.querySelectorAll('.lang-btn');
  for (var i = 0; i < btns.length; i++) {
    var active = btns[i].dataset.lang === lang;
    btns[i].classList.toggle('active', active);
    btns[i].setAttribute('aria-pressed', String(active));
  }

  // Update [data-i18n] plain-text elements
  var els = document.querySelectorAll('[data-i18n]');
  for (var j = 0; j < els.length; j++) {
    var key = els[j].dataset.i18n;
    var val = t(key);
    if (val !== undefined) {
      var spanChild = els[j].querySelector('span');
      if (spanChild) {
        spanChild.innerHTML = val;
      } else {
        els[j].innerHTML = val;
      }
    }
  }

  // Update [data-i18n-html] elements (allow safe HTML like <strong>)
  var htmlEls = document.querySelectorAll('[data-i18n-html]');
  for (var k = 0; k < htmlEls.length; k++) {
    var htmlKey = htmlEls[k].dataset.i18nHtml;
    htmlEls[k].innerHTML = t(htmlKey);
  }

  // Rebuild consent text with live links
  renderConsentText();

  // Update SSID badge
  renderSsidBadge();
}

// ─── Screen Management ───────────────────────────────────────
function showScreen(id) {
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) {
    screens[i].classList.remove('active');
    screens[i].setAttribute('aria-hidden', 'true');
  }
  var target = $('screen-' + id);
  if (!target) return;
  target.classList.add('active');
  target.removeAttribute('aria-hidden');

  // Move focus to first heading for screen-reader announcements
  var h1 = target.querySelector('h1');
  if (h1) {
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: true });
  }
}

// ─── Parse Omada redirect params ─────────────────────────────
function parseParams() {
  var p = new URLSearchParams(window.location.search);
  state.clientMac  = p.get('clientMac')  || p.get('client_mac')  || '';
  state.apMac      = p.get('apMac')      || p.get('ap_mac')      || '';
  state.ssidName   = p.get('ssidName')   || p.get('ssid')        || '';
  state.radioId    = p.get('radioId')    || p.get('radio_id')    || '';
  state.vid        = p.get('vid')        || '';
  state.redirectUrl = p.get('redirectUrl') || p.get('url') || '';

  // Development fallback — no real AP, testing directly in browser
  if (!state.clientMac) {
    console.warn('[Portal] No clientMac param — using dev test MAC');
    state.clientMac = DEV_TEST_MAC;
    if (!state.ssidName) state.ssidName = DEV_TEST_SSID;
  }
}

// ─── SSID Badge ───────────────────────────────────────────────
function renderSsidBadge() {
  var badge = $('ssid-badge');
  if (!badge) return;
  if (!state.ssidName) {
    badge.classList.remove('visible');
    return;
  }
  badge.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="12" cy="20" r="1.5" fill="currentColor"/>' +
    '</svg>' +
    '<span>' + escapeHtml(t('ssidPrefix')) + escapeHtml(state.ssidName) + '</span>';
  badge.classList.add('visible');
}

// ─── Consent Text ─────────────────────────────────────────────
function renderConsentText() {
  var el = $('consent-text');
  if (!el) return;
  var legalLang = (state.lang === 'tl' || state.lang === 'zh' || state.lang === 'en') ? state.lang : 'en';
  var legalLangQuery = '?lang=' + encodeURIComponent(legalLang);
  el.innerHTML =
    escapeHtml(t('consentPre')) +
    '<a href="/privacy-policy.html' + legalLangQuery + '" target="_blank" rel="noopener">' +
      escapeHtml(t('privacyLink')) +
    '</a>' +
    t('consentMid') +   // already contains &amp; or localized conjunction
    '<a href="/terms-of-service.html' + legalLangQuery + '" target="_blank" rel="noopener">' +
      escapeHtml(t('termsLink')) +
    '</a>' +
    escapeHtml(t('consentPost'));
}

// ─── API ──────────────────────────────────────────────────────
function apiPost(endpoint, data) {
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(function(res) {
    return res.json().then(function(json) {
      if (!res.ok) {
        var msg = json.message || json.error || ('Request failed (' + res.status + ')');
        var err = new Error(msg);
        err.status    = res.status;
        err.errorCode = json.error_code || null;  // E-xxxx from server
        throw err;
      }
      return json;
    });
  });
}

// ─── System Status Check ──────────────────────────────────────
// Called BEFORE auth flow. If status !== 'normal', show status screen and halt.
function checkStatus() {
  // 1. Check server-side injected status (instant, no fetch needed)
  var injected = window.__PORTAL_STATUS__;
  if (injected && injected.status && injected.status !== 'normal') {
    showStatusScreen(injected.status, injected.message || '', injected.eta || '');
    return Promise.reject({ statusHalt: true });
  }

  // 2. Fallback: fetch from API
  return fetch('/api/status')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var status  = (data && data.status)  || 'normal';
      var message = (data && data.message) || '';
      var eta     = (data && data.eta)     || '';
      if (status === 'normal') return;
      showStatusScreen(status, message, eta);
      throw { statusHalt: true };
    })
    .catch(function(err) {
      if (err && err.statusHalt) throw err;
      console.warn('[Portal] Status check failed — proceeding normally:', err);
    });
}

function showStatusScreen(status, message, eta) {
  // Populate SSID brand name on all status screens
  var ssid = state.ssidName || 'Abot Kamay';
  ['1','2','3','4'].forEach(function(n) {
    var el = $('status-brand-name-' + n);
    if (el) el.textContent = ssid;
  });

  var screenId = 'screen-' + status;
  // Fallback to maintenance if unknown status
  if (!$('screen-' + status)) screenId = 'screen-maintenance';

  // For custom: populate the message element
  if (status === 'custom') {
    var msgEl = $('status-custom-message');
    if (msgEl) msgEl.textContent = message || t('customTitle');
  }

  // Populate ETA on all status screens
  if (eta) {
    ['maintenance','upgrading','suspended','custom'].forEach(function(s) {
      var etaEl = $('status-eta-' + s);
      if (etaEl) {
        etaEl.textContent = t('statusEtaPrefix') + eta;
        etaEl.hidden = false;
      }
    });
  }

  showScreen(status);
  // Re-apply i18n translations for the visible status screen
  setLang(state.lang);

  // Bind language switchers on status screens (they each have their own .lang-btn)
  var allLangBtns = document.querySelectorAll('.lang-btn');
  for (var i = 0; i < allLangBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        setLang(btn.dataset.lang);
        // Re-apply ETA prefix in new language
        if (eta) {
          ['maintenance','upgrading','suspended','custom'].forEach(function(s) {
            var etaEl = $('status-eta-' + s);
            if (etaEl && !etaEl.hidden) {
              etaEl.textContent = t('statusEtaPrefix') + eta;
            }
          });
        }
      });
    })(allLangBtns[i]);
  }
}

// ─── Step 1: Auth Start ───────────────────────────────────────
function authStart() {
  showScreen('loading');

  apiPost('/api/auth/start', {
    clientMac:   state.clientMac,
    apMac:       state.apMac,
    ssidName:    state.ssidName,
    radioId:     state.radioId,
    vid:         state.vid,
    redirectUrl: state.redirectUrl,
  })
  .then(function(res) {
    // Already has an active session — skip ad
    if (res.alreadyAuthorized) {
      showSuccess({
        expiresAt:   res.expiresAt,
        redirectUrl: res.redirectUrl || state.redirectUrl,
      });
      return;
    }

    // No ads configured — connect directly after brief delay
    if (res.noAd) {
      state.noAd = true;
      state.ad = null;
      state.adDuration = DEFAULT_AD_DURATION;
      showScreen('welcome');
      renderSsidBadge();
      renderConsentText();
      return;
    }

    // Normal flow — store ad info and show welcome
    state.ad = res.ad || null;
    state.adDuration = (res.ad && res.ad.durationSec) ? res.ad.durationSec : DEFAULT_AD_DURATION;
    showScreen('welcome');
    renderSsidBadge();
    renderConsentText();
  })
  .catch(function(err) {
    console.error('[Portal] authStart failed:', err);
    showError(err.message || 'Unable to reach the portal. Please try again.', err.errorCode || 'E-1001');
  });
}

// ─── Step 2: Start Watching Ad ────────────────────────────────
function startWatching() {
  showScreen('ad');

  state.countdown    = state.adDuration;
  state.viewStartTime = Date.now();

  // Render initial countdown immediately
  updateCountdownUI(state.countdown, state.adDuration);
  setConnectEnabled(false);

  // No-ad shortcut: server had no active ads, fake a short countdown
  if (state.noAd) {
    var noAdEl = $('ad-slot');
    if (noAdEl) {
      noAdEl.innerHTML =
        '<div class="ad-slot-placeholder">' +
        '<span class="ad-slot-label" style="color:var(--text-secondary);">' +
        escapeHtml(t('noAdMsg')) +
        '</span></div>';
    }
  }

  // Kick off Adcash interstitial (does nothing if no zone ID)
  triggerAdcash();

  // Show local file ad if provided by backend
  if (state.ad && state.ad.filePath) {
    renderLocalAd(state.ad);
  }

  // Countdown tick every second
  state.countdownTimer = setInterval(function() {
    state.countdown -= 1;
    updateCountdownUI(state.countdown, state.adDuration);

    if (state.countdown <= 0) {
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
      setConnectEnabled(true);
    }
  }, 1000);
}

function updateCountdownUI(remaining, total) {
  var numEl    = $('countdown-number');
  var circleEl = $('countdown-circle');

  if (numEl) numEl.textContent = Math.max(0, remaining);

  if (circleEl && total > 0) {
    var circumference = 276.46;
    var fraction      = remaining / total;
    var dashoffset    = circumference * (1 - Math.max(0, fraction));
    circleEl.style.strokeDashoffset = dashoffset;
  }
}

function setConnectEnabled(enabled) {
  var btn = $('btn-connect');
  if (!btn) return;
  btn.disabled = !enabled;
}

// ─── Local Video / Image Ad ───────────────────────────────────
function renderLocalAd(ad) {
  var slot = $('ad-slot');
  if (!slot) return;

  var placeholder = $('ad-placeholder');

  if (ad.type === 'video') {
    var video = document.createElement('video');
    video.src          = ad.filePath;
    video.autoplay     = true;
    video.muted        = false;
    video.playsInline  = true; // required for iOS inline playback
    video.controls     = false;
    video.setAttribute('playsinline', '');
    video.style.cssText = 'width:100%;display:block;';

    video.onerror = function() {
      // Video failed — keep placeholder visible
      if (placeholder) placeholder.style.display = 'flex';
    };

    if (placeholder) placeholder.style.display = 'none';
    slot.appendChild(video);
    video.play().catch(function() {
      // Autoplay blocked (e.g. user gesture required)
      if (placeholder) placeholder.style.display = 'flex';
    });

  } else if (ad.type === 'image') {
    var img = document.createElement('img');
    img.src         = ad.filePath;
    img.alt         = 'Advertisement';
    img.style.cssText = 'width:100%;display:block;';

    img.onerror = function() {
      if (placeholder) placeholder.style.display = 'flex';
    };

    if (placeholder) placeholder.style.display = 'none';
    slot.appendChild(img);
  }
}

// ─── Adcash Interstitial ──────────────────────────────────────
//
// Adcash interstitial shows as a full-screen overlay on top of the page.
// The countdown runs in parallel — the user must wait the full duration
// regardless of when they close the interstitial.
//
// Adcash aclib.js docs: https://publisher.adcash.com/help/integration-guide
//
function triggerAdcash() {
  if (!ADCASH_ZONE_ID) {
    console.info('[Portal] Adcash zone ID not configured — skipping external ad');
    return;
  }

  if (state.adcashLoaded) return;
  state.adcashLoaded = true;

  var script    = document.createElement('script');
  script.type   = 'text/javascript';
  script.async  = true;
  script.src    = '//acscdn.com/script/aclib.js';

  script.onload = function() {
    if (window.aclib && typeof window.aclib.runInterstitial === 'function') {
      window.aclib.runInterstitial({
        zoneId:    ADCASH_ZONE_ID,
        onOpened:  function() {
          console.info('[Portal] Adcash interstitial opened');
        },
        onClosed:  function() {
          console.info('[Portal] Adcash interstitial closed');
          // If countdown already finished, enable connect immediately
          if (state.countdown <= 0) {
            setConnectEnabled(true);
          }
        },
        onError:   function(err) {
          console.warn('[Portal] Adcash error:', err);
        },
      });
    } else {
      console.warn('[Portal] aclib.runInterstitial not available after load');
    }
  };

  script.onerror = function() {
    console.warn('[Portal] Adcash script failed to load — ad skipped');
  };

  document.head.appendChild(script);
}

// ─── Step 3: Verify + Omada Authorize ────────────────────────
function verifyAndConnect() {
  // Disable button and show loading state
  var btn = $('btn-connect');
  if (btn) {
    btn.disabled = true;
    var span = btn.querySelector('span');
    if (span) span.textContent = t('connectingMsg');
  }

  var viewDurationSec = Math.floor((Date.now() - state.viewStartTime) / 1000);

  apiPost('/api/auth/verify', {
    clientMac:       state.clientMac,
    viewDurationSec: viewDurationSec,
    completed:       true,
  })
  .then(function(res) {
    showSuccess({
      sessionId:   res.sessionId,
      expiresAt:   res.expiresAt,
      redirectUrl: res.redirectUrl || state.redirectUrl,
    });
  })
  .catch(function(err) {
    console.error('[Portal] verify failed:', err);

    // Re-enable button on failure
    if (btn) {
      btn.disabled = false;
      var btnSpan = btn.querySelector('span');
      if (btnSpan) btnSpan.textContent = t('connectLabel');
    }

    showError(err.message || 'Authorization failed. Please try again.', err.errorCode || 'E-1005');
  });
}

// ─── Success Screen ───────────────────────────────────────────
function showSuccess(opts) {
  opts = opts || {};
  showScreen('success');

  // Session expiry time
  var expiryEl = $('session-expiry');
  if (expiryEl && opts.expiresAt) {
    var exp = new Date(opts.expiresAt);
    var timeStr = exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    expiryEl.textContent = t('sessionExpiry') + timeStr;
  }

  // Redirect countdown
  var noticeEl = $('redirect-notice');
  var remaining = 5;

  var updateNotice = function() {
    if (noticeEl) {
      noticeEl.textContent = t('redirecting') + remaining + t('redirectSec');
    }
  };
  updateNotice();

  var redirectTimer = setInterval(function() {
    remaining -= 1;
    updateNotice();
    if (remaining <= 0) {
      clearInterval(redirectTimer);
      doRedirect(opts.redirectUrl);
    }
  }, 1000);

  // Manual "Browse Now" button
  var browseBtn = $('btn-browse');
  if (browseBtn) {
    browseBtn.addEventListener('click', function() {
      clearInterval(redirectTimer);
      doRedirect(opts.redirectUrl);
    }, { once: true });
  }
}

// ─── Redirect ─────────────────────────────────────────────────
function isSafeRedirectUrl(url) {
  if (!url) return false;
  // Block javascript:, data:, vbscript: and other dangerous schemes
  var stripped = url.replace(/[\s\x00-\x1f]/g, '').toLowerCase();
  if (/^(javascript|data|vbscript|blob)\s*:/i.test(stripped)) return false;
  // Allow http(s) and relative paths only
  if (/^https?:\/\//i.test(url)) return true;
  if (url.charAt(0) === '/') return true;
  return false;
}

function doRedirect(url) {
  var target = isSafeRedirectUrl(url) ? url : 'https://www.google.com';
  try {
    window.location.href = target;
  } catch (_) {
    window.location.replace(target);
  }
}

// ─── Error Screen ─────────────────────────────────────────────
function showError(message, errorCode) {
  showScreen('error');

  var msgEl = $('error-msg');
  if (msgEl) msgEl.textContent = message || 'An error occurred. Please try again.';

  // Error code badge (e.g. "E-1001")
  var codeEl = $('error-code-badge');
  if (codeEl) {
    if (errorCode) {
      codeEl.textContent = errorCode;
      codeEl.hidden = false;
    } else {
      codeEl.textContent = '';
      codeEl.hidden = true;
    }
  }

  // Code description in current language
  var descEl = $('error-code-desc');
  if (descEl) {
    if (errorCode && ERROR_CODE_MAP[errorCode]) {
      var entry = ERROR_CODE_MAP[errorCode];
      var lang  = state.lang;
      descEl.textContent = entry[lang] || entry.en;
      descEl.hidden = false;
    } else {
      descEl.textContent = '';
      descEl.hidden = true;
    }
  }

  // Support message
  var supportEl = $('error-support-msg');
  if (supportEl) {
    if (errorCode) {
      supportEl.textContent = t('errorSupport');
      supportEl.hidden = false;
    } else {
      supportEl.hidden = true;
    }
  }

  // Refresh i18n on error screen buttons/headings
  setLang(state.lang);
}

// ─── Event Bindings ───────────────────────────────────────────
function bindEvents() {
  // Language switcher
  var langBtns = document.querySelectorAll('.lang-btn');
  for (var i = 0; i < langBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        setLang(btn.dataset.lang);
      });
    })(langBtns[i]);
  }

  // "Watch & Connect" on welcome screen
  var watchBtn = $('btn-watch');
  if (watchBtn) {
    watchBtn.addEventListener('click', startWatching);
  }

  // "Connect Now" on ad screen
  var connectBtn = $('btn-connect');
  if (connectBtn) {
    connectBtn.addEventListener('click', verifyAndConnect);
  }

  // "Try Again" on error screen — restart from auth/start
  var retryBtn = $('btn-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', function() {
      if (state.countdownTimer) {
        clearInterval(state.countdownTimer);
        state.countdownTimer = null;
      }
      state.adcashLoaded = false;
      state.noAd         = false;
      authStart();
    });
  }
}

// ─── Init ─────────────────────────────────────────────────────
function init() {
  // Restore saved language preference
  try {
    var saved = sessionStorage.getItem('ak_lang');
    if (saved && STRINGS[saved]) state.lang = saved;
  } catch (_) {}

  parseParams();
  bindEvents();
  setLang(state.lang);  // apply translations before first API call

  // Check system status first; only proceed to ad flow if status === 'normal'
  checkStatus().then(function() {
    authStart();
  }).catch(function(err) {
    if (err && err.statusHalt) return; // status screen shown, halt
    authStart(); // unexpected error — proceed anyway
  });
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
