// api.js — the only module that talks to the network. Every read goes to
// https://make.fun/api behind an ETag cache: a URL answered within the
// freshness window is served from memory with no request; past it, the read
// is revalidated with If-None-Match (make.fun binds ETags to the minute, so
// an unchanged answer costs a 304 and no body); when new data does arrive,
// subscribers are told so the visible view can repaint in place. Concurrent
// reads of one URL share a single in-flight request.

const API_BASE = 'https://make.fun/api';
const FRESH_MS = 20000;

const store = new Map();    // url -> { etag, data, checkedAt }
const pending = new Map();  // url -> Promise<data>
const subscribers = new Set();

export const netStats = { requests: 0, revalidated: 0, cacheHits: 0 };

export function onDataChange(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function announce(url, data) {
  for (const fn of subscribers) {
    try { fn(url, data); } catch { /* a broken view must not break the cache */ }
  }
}

export async function getJson(path, { fresh = false } = {}) {
  const url = API_BASE + path;
  const hit = store.get(url);
  if (!fresh && hit && Date.now() - hit.checkedAt < FRESH_MS) {
    netStats.cacheHits += 1;
    return hit.data;
  }
  if (pending.has(url)) return pending.get(url);

  const job = (async () => {
    const headers = {};
    if (hit?.etag) headers['If-None-Match'] = hit.etag;
    netStats.requests += 1;
    const res = await fetch(url, { headers });
    if (res.status === 304 && hit) {
      hit.checkedAt = Date.now();
      netStats.revalidated += 1;
      return hit.data;
    }
    if (!res.ok) throw new Error(`make.fun API answered ${res.status} for ${path}`);
    const data = await res.json();
    const changed = !hit || JSON.stringify(hit.data) !== JSON.stringify(data);
    store.set(url, { etag: res.headers.get('etag'), data, checkedAt: Date.now() });
    if (changed && hit) announce(url, data);
    return data;
  })();

  pending.set(url, job);
  try {
    return await job;
  } finally {
    pending.delete(url);
  }
}

// The open-bounty list is cursor-paginated. Follow next_cursor, but stop if
// the API hands back a cursor it already gave (a stuck cursor must not loop
// the page forever) and never fetch more than five pages for one paint.
export async function fetchOpenCompetitions(opts = {}) {
  const items = [];
  const seenCursors = new Set();
  let cursor = null;
  for (let page = 0; page < 5; page += 1) {
    const qs = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const body = await getJson(`/competitions?status=open&activity=times${qs}`, opts);
    if (Array.isArray(body?.items)) items.push(...body.items);
    const next = body?.next_cursor;
    if (!next || seenCursors.has(next)) break;
    seenCursors.add(next);
    cursor = next;
  }
  return items;
}

export const fetchCompetition = (slug, opts) => getJson(`/competitions/${encodeURIComponent(slug)}`, opts);
export const fetchLeaderboard = (slug, opts) => getJson(`/competitions/${encodeURIComponent(slug)}/leaderboard`, opts);
export const fetchSubmissions = (slug, opts) => getJson(`/competitions/${encodeURIComponent(slug)}/submissions`, opts);
export const fetchProfile = (handle, opts) => getJson(`/profiles/${encodeURIComponent(handle)}`, opts);
