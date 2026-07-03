export const PHONE_RE = /^0\d{9}$/;

export function genRef(prefix, digits = 6) {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return `${prefix}-${Math.floor(min + Math.random() * (max - min))}`;
}

export function scrollTop() {
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { /* noop */ }
}

export function stepBars(total, active) {
  return Array.from({ length: total }, (_, i) => ({
    flex: 1,
    height: '6px',
    borderRadius: '4px',
    background: i <= active ? 'var(--primary)' : 'var(--line)',
    transition: 'all .3s',
  }));
}
