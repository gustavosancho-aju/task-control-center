export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'tcc-theme'

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

export function setTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
}

export function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function applyTheme(theme: Theme) {
  const resolved = getResolvedTheme(theme)
  const root = document.documentElement

  // Enable smooth transition
  root.classList.add('theme-transition')

  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Remove transition class after animation completes
  setTimeout(() => root.classList.remove('theme-transition'), 350)
}

/**
 * Inline script string to inject in <head> to prevent FOUC.
 * Reads from localStorage and applies the class before first paint.
 */
export const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    var d = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (d) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`
