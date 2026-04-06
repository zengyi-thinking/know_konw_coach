(() => {
  const STORAGE_KEY = 'lifecoach_console_theme';
  const THEMES = ['warm-tea', 'taisho-nouveau', 'zine-handmade'];

  function normalizeTheme(theme) {
    if (THEMES.includes(theme)) {
      return theme;
    }
    return 'warm-tea';
  }

  function readStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem(STORAGE_KEY));
    } catch {
      return 'warm-tea';
    }
  }

  function applyTheme(theme) {
    const next = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', next);
    return next;
  }

  const initialTheme = applyTheme(readStoredTheme());

  function dispatchThemeChange(theme) {
    window.dispatchEvent(new CustomEvent('lifecoach-theme-change', {
      detail: { theme },
    }));
  }

  const runtime = {
    key: STORAGE_KEY,
    themes: THEMES.slice(),
    getTheme() {
      return normalizeTheme(document.documentElement.getAttribute('data-theme'));
    },
    setTheme(theme, options = {}) {
      const next = applyTheme(theme);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}

      if (!options.silent) {
        dispatchThemeChange(next);
      }

      return next;
    },
  };

  window.LifeCoachTheme = runtime;
  runtime.setTheme(initialTheme, { silent: true });

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = runtime.setTheme(event.newValue || 'warm-tea', { silent: true });
    dispatchThemeChange(next);
  });
})();
