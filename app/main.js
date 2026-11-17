// main.js — the shell: hash routing, the header's live indicator and profile
// lookup, the footer request tally, and one shared countdown ticker. The
// board ships in this first load; bounty, leaderboard and profile views are
// imported only when a route first asks for them.

import { onDataChange, netStats } from './api.js';
import { countdown } from './format.js';
import { renderBoard } from './board.js';

const view = document.getElementById('view');
const liveLabel = document.getElementById('live-label');
const netstats = document.getElementById('netstats');

let routeSeq = 0;
let currentPath = '/';

function parseRoute() {
  const raw = location.hash.replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: 'board' };
  if (parts[0] === 'bounty' && parts[1] && parts.length === 2) return { name: 'bounty', slug: parts[1] };
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') return { name: 'leaderboard', slug: parts[1] };
  if (parts[0] === 'u' && parts[1]) return { name: 'profile', handle: parts[1] };
  return { name: 'board' };
}

function stampLive() {
  const d = new Date();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  liveLabel.textContent = `Live data · updated ${hh}:${mm}:${ss} UTC`;
  netstats.textContent = `${netStats.requests} requests · ${netStats.revalidated} revalidated (304) · ${netStats.cacheHits} served from cache`;
}

function paintError(err) {
  view.innerHTML = `<section class="error-box">
    <h1>That view could not be loaded</h1>
    <p>${err?.message ? String(err.message).replaceAll('<', '&lt;') : 'The make.fun API did not answer.'}</p>
    <p><button type="button" class="btn" onclick="location.reload()">Reload the page</button></p>
  </section>`;
}

async function dispatch(force = false) {
  const route = parseRoute();
  const seq = ++routeSeq;
  currentPath = location.hash || '#/';
  window.__shotReady = false;
  const ctx = {
    el: view,
    force,
    isCurrent: () => seq === routeSeq,
  };
  try {
    if (route.name === 'board') {
      await renderBoard(ctx);
    } else if (route.name === 'bounty') {
      const mod = await import('./bounty.js');
      if (!ctx.isCurrent()) return;
      await mod.renderBounty(ctx, route.slug);
    } else if (route.name === 'leaderboard') {
      const mod = await import('./leaderboard.js');
      if (!ctx.isCurrent()) return;
      await mod.renderLeaderboard(ctx, route.slug);
    } else {
      const mod = await import('./profile.js');
      if (!ctx.isCurrent()) return;
      await mod.renderProfile(ctx, route.handle);
    }
    if (ctx.isCurrent()) {
      stampLive();
      window.__shotReady = true;
      window.scrollTo(0, 0);
    }
  } catch (err) {
    if (ctx.isCurrent()) {
      paintError(err);
      window.__shotReady = true;
    }
  }
}

// When a background revalidation brings new data for something on screen,
// repaint the same route in place — unless the user is mid-keystroke in a
// filter, where a repaint would eat their input.
onDataChange(() => {
  const active = document.activeElement;
  if (active && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) return;
  dispatch(false);
});

// One ticker for every countdown on the page: elements carry their deadline
// in data-countdown and are updated in place, never rebuilt.
setInterval(() => {
  const now = Date.now();
  for (const el of document.querySelectorAll('[data-countdown]')) {
    const cd = countdown(el.dataset.countdown, now);
    el.textContent = cd.text;
    el.dataset.level = cd.level;
  }
}, 20000);

document.getElementById('lookup').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const handle = new FormData(ev.currentTarget).get('handle').trim().replace(/^@/, '');
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

document.getElementById('refresh').addEventListener('click', () => dispatch(true));
window.addEventListener('hashchange', () => dispatch(false));

dispatch(false);
