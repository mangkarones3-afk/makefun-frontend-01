// format.js — turning API values into display text. Pure functions, no
// state: every figure the app shows passes through here so units and
// rounding stay consistent from the board to the profile page.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Money arrives from the API as a string ("708.50") or a number. Whole dollars
// print without cents ($1,325); anything fractional keeps two places ($0.50).
export function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 100) / 100;
  const body = Number.isInteger(rounded)
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + body;
}

function parseDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateTime(iso) {
  const d = parseDate(iso);
  if (!d) return '—';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${hh}:${mm} UTC`;
}

export function dateOnly(iso) {
  const d = parseDate(iso);
  if (!d) return '—';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// The deadline is the source of truth for whether a bounty still takes
// entries (a past-deadline bounty can still report status "open"), so the
// countdown carries a level the CSS colours: live, soon (<24h), urgent (<1h),
// ended.
export function countdown(iso, now = Date.now()) {
  const d = parseDate(iso);
  if (!d) return { text: 'No deadline set', level: 'live' };
  const ms = d.getTime() - now;
  if (ms <= 0) return { text: `Ended ${dateOnly(iso)}`, level: 'ended' };
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  let text;
  if (days > 0) text = `${days}d ${hours}h left`;
  else if (hours > 0) text = `${hours}h ${rest}m left`;
  else text = `${Math.max(rest, 1)}m left`;
  const level = ms < 3600000 ? 'urgent' : ms < 86400000 ? 'soon' : 'live';
  return { text, level };
}

export function ago(iso, now = Date.now()) {
  const d = parseDate(iso);
  if (!d) return '';
  const secs = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (secs < 90) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return dateOnly(iso);
}

export function byteSize(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '—';
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1048576).toFixed(2)} MB`;
}

// Judge scores travel in micro-units: 950587 means a 95.0587% win rate.
export function rate(micro) {
  const v = Number(micro);
  if (!Number.isFinite(v)) return '—';
  return (v / 10000).toFixed(1) + '%';
}

export function shortAddress(address) {
  const a = String(address ?? '');
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

// API image fields come back as site-relative paths ("/api/avatars/…").
export function absUrl(path) {
  if (!path) return '';
  return path.startsWith('/') ? 'https://make.fun' + path : path;
}
