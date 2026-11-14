// Early boot diagnostics. Loaded as an external file (not inline) so the app
// can run under a strict Content-Security-Policy without 'unsafe-inline'.
(function () {
  var el = document.getElementById('dnd-boot-error');
  var msgEl = document.getElementById('dnd-boot-error-msg');
  var reload = document.getElementById('dnd-boot-reload');

  function show(msg) {
    if (!el || el.style.display === 'flex') return;
    el.style.display = 'flex';
    if (msgEl && msg) msgEl.textContent = String(msg).slice(0, 300);
  }

  function ok() {
    window.__dndBooted = true;
  }

  window.addEventListener('load', ok);
  window.addEventListener('error', function (e) {
    window.__dndBooted = false;
    show((e && e.message) || (e && e.error && e.error.message) || 'Script error');
  });
  window.addEventListener('unhandledrejection', function () {
    show('A runtime error interrupted the app.');
  });
  setTimeout(function () {
    if (!window.__dndBooted) show('');
  }, 6000);

  if (reload) {
    reload.addEventListener('click', function () {
      location.reload();
    });
  }
})();
