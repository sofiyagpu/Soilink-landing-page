// Site language. The HTML is Russian; English lives next to it in data-en
// (text) and data-en-<attr> (attributes, e.g. data-en-aria-label).
// Choice order: the RU/EN switch (?lang=), the saved choice, device language.
// Loaded synchronously in <head> so the page never flashes the wrong language.
(function () {
  var html = document.documentElement;
  var lang = new URLSearchParams(location.search).get('lang');

  if (lang === 'ru' || lang === 'en') {
    try { localStorage.setItem('lang', lang); } catch (e) {}
  } else {
    try { lang = localStorage.getItem('lang'); } catch (e) {}
  }
  if (lang !== 'ru' && lang !== 'en') {
    // Russian for Russian-speaking regions; search bots render in en-US but
    // should keep indexing the Russian page.
    var ruDevice = /^(ru|kk|be|ky|uz|tg)\b/i.test(navigator.language || '');
    lang = ruDevice || /bot|crawl|spider/i.test(navigator.userAgent) ? 'ru' : 'en';
  }

  html.lang = lang;
  if (lang === 'en') html.style.visibility = 'hidden';

  // 'interactive' fires when parsing ends, before deferred scripts run —
  // so script.js splits and animates the already translated text.
  document.addEventListener('readystatechange', function () {
    try {
      if (lang === 'en') {
        document.querySelectorAll('*').forEach(function (el) {
          Array.from(el.attributes).forEach(function (a) {
            if (a.name === 'data-en') el.textContent = a.value;
            else if (a.name.indexOf('data-en-') === 0) el.setAttribute(a.name.slice(8), a.value);
          });
        });
      }
      document.querySelectorAll('.lang-switch [hreflang="' + lang + '"]').forEach(function (a) {
        a.setAttribute('aria-current', 'true');
      });
    } finally {
      html.style.visibility = '';
    }
  }, { once: true });
})();
