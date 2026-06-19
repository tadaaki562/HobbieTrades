/**
 * HobbieTrades theme — dark / light mode with localStorage persistence.
 */
(function (global) {
  const KEY = 'ht-theme';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch (_) { /* private browsing */ }
    updateToggleIcon();
  }

  function initTheme() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'dark' || saved === 'light') {
        apply(saved);
        return;
      }
    } catch (_) { /* ignore */ }
    if (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function toggle() {
    apply(currentTheme() === 'dark' ? 'light' : 'dark');
    if (global.feather) global.feather.replace();
  }

  function updateToggleIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const dark = currentTheme() === 'dark';
    btn.innerHTML = dark
      ? '<i data-feather="sun"></i>'
      : '<i data-feather="moon"></i>';
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
    if (global.feather) global.feather.replace();
  }

  function mountToggle() {
    const existing = document.getElementById('theme-toggle');
    if (existing) {
      if (!existing.dataset.wired) {
        existing.addEventListener('click', toggle);
        existing.dataset.wired = '1';
      }
      updateToggleIcon();
      return;
    }

    const anchor = document.querySelector('.navbar .logo');
    if (!anchor) return;

    const wrap = document.createElement('div');
    wrap.className = 'nav-brand';
    anchor.parentNode.insertBefore(wrap, anchor);
    wrap.appendChild(anchor);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.id = 'theme-toggle';
    btn.addEventListener('click', toggle);
    wrap.appendChild(btn);
    updateToggleIcon();
  }

  initTheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle);
  } else {
    mountToggle();
  }

  global.HobbieTheme = { toggle, apply, initTheme };
})(window);
