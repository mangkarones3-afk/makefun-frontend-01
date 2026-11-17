// board.js — the front page: every open bounty with its live pot, entry fee,
// time left and entry count. The list is fetched once; searching, filtering
// and sorting all work on that copy, so no control costs a request.

import { fetchOpenCompetitions } from './api.js';
import { countdown, dateTime, esc, money } from './format.js';

const ui = { q: '', category: 'all', sort: 'ending', showEnded: false };
let items = [];

const isLive = (b, now) => !b.deadline || new Date(b.deadline).getTime() > now;

function summaryLine(now) {
  const live = items.filter((b) => isLive(b, now));
  const potTotal = live.reduce((sum, b) => sum + (Number(b.potUsd) || 0), 0);
  const closing = live.filter((b) => b.deadline && new Date(b.deadline).getTime() - now < 86400000).length;
  const ended = items.length - live.length;
  const bits = [
    `${live.length} live ${live.length === 1 ? 'bounty' : 'bounties'}`,
    `${money(potTotal)} in live pots`,
    `${closing} closing within 24 hours`,
  ];
  if (ended > 0) bits.push(`${ended} ended, awaiting results`);
  return bits.join(' · ');
}

function visibleItems(now) {
  let out = items.slice();
  if (!ui.showEnded) out = out.filter((b) => isLive(b, now));
  if (ui.category !== 'all') out = out.filter((b) => (b.category || 'Other') === ui.category);
  if (ui.q) {
    const needle = ui.q.toLowerCase();
    out = out.filter((b) => `${b.title} ${b.summary || ''} ${b.slug}`.toLowerCase().includes(needle));
  }
  const byDeadline = (a, b) => new Date(a.deadline || '9999').getTime() - new Date(b.deadline || '9999').getTime();
  if (ui.sort === 'pot') out.sort((a, b) => (Number(b.potUsd) || 0) - (Number(a.potUsd) || 0) || byDeadline(a, b));
  else if (ui.sort === 'entries') out.sort((a, b) => (b.submissionCount || 0) - (a.submissionCount || 0) || byDeadline(a, b));
  else out.sort((a, b) => Number(isLive(b, now)) - Number(isLive(a, now)) || byDeadline(a, b));
  return out;
}

function rowHtml(b, maxPot, now) {
  const cd = countdown(b.deadline, now);
  const pot = Number(b.potUsd) || 0;
  const share = maxPot > 0 ? Math.max(3, Math.round((pot / maxPot) * 100)) : 3;
  const fee = Number(b.entryFeeUsd);
  const feeHtml = !b.entryFeeUsd || fee === 0
    ? '<span class="fee free">Free entry</span>'
    : `<span class="fee">${money(b.entryFeeUsd)} entry fee</span>`;
  return `<a class="brow${isLive(b, now) ? '' : ' ended'}" href="#/bounty/${esc(b.slug)}">
    <span class="brow-main">
      <span class="brow-title">${esc(b.title)} <span class="chip">${esc(b.category || 'Other')}</span></span>
      <span class="brow-summary">${esc(b.summary || '')}</span>
    </span>
    <span class="brow-pot">
      <span class="pot-amount">${money(b.potUsd)}</span>
      <span class="pot-bar"><span style="width:${share}%"></span></span>
      <span class="pot-caption">live pot</span>
    </span>
    <span class="brow-meta">${feeHtml}
      <span class="cd" data-countdown="${esc(b.deadline || '')}" data-level="${cd.level}">${esc(cd.text)}</span>
      <span class="deadline">${esc(dateTime(b.deadline))}</span>
    </span>
    <span class="brow-entries"><strong>${Number(b.submissionCount || 0).toLocaleString('en-US')}</strong> entries</span>
  </a>`;
}

function paintList(container) {
  const now = Date.now();
  const rows = visibleItems(now);
  const maxPot = Math.max(0, ...items.map((b) => Number(b.potUsd) || 0));
  container.innerHTML = rows.length
    ? rows.map((b) => rowHtml(b, maxPot, now)).join('')
    : '<p class="empty">No bounties match those filters. Clear the search or include ended bounties.</p>';
  const count = document.getElementById('board-count');
  if (count) count.textContent = `Showing ${rows.length} of ${items.length}`;
}

export async function renderBoard(ctx) {
  const categories = [...new Set(items.map((b) => b.category || 'Other'))].sort();
  ctx.el.innerHTML = `<section class="board">
    <h1>Live bounties</h1>
    <p class="lede" id="board-summary">Reading the live board…</p>
    <div class="controls">
      <label>Search <input id="f-q" type="search" placeholder="Title, keyword, slug" value="${esc(ui.q)}"></label>
      <label>Category <select id="f-cat">
        <option value="all">All categories</option>
        ${categories.map((c) => `<option value="${esc(c)}"${ui.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}
      </select></label>
      <label>Sort <select id="f-sort">
        <option value="ending"${ui.sort === 'ending' ? ' selected' : ''}>Ending soonest</option>
        <option value="pot"${ui.sort === 'pot' ? ' selected' : ''}>Largest pot</option>
        <option value="entries"${ui.sort === 'entries' ? ' selected' : ''}>Most entries</option>
      </select></label>
      <label class="check"><input id="f-ended" type="checkbox"${ui.showEnded ? ' checked' : ''}> Show ended</label>
      <span id="board-count" class="count"></span>
    </div>
    <div id="board-list" class="blist"><p class="empty">Loading…</p></div>
  </section>`;

  const list = ctx.el.querySelector('#board-list');
  ctx.el.querySelector('#f-q').addEventListener('input', (ev) => { ui.q = ev.target.value; paintList(list); });
  ctx.el.querySelector('#f-cat').addEventListener('change', (ev) => { ui.category = ev.target.value; paintList(list); });
  ctx.el.querySelector('#f-sort').addEventListener('change', (ev) => { ui.sort = ev.target.value; paintList(list); });
  ctx.el.querySelector('#f-ended').addEventListener('change', (ev) => { ui.showEnded = ev.target.checked; paintList(list); });

  items = await fetchOpenCompetitions({ fresh: ctx.force });
  if (!ctx.isCurrent()) return;
  const summary = ctx.el.querySelector('#board-summary');
  if (summary) summary.textContent = summaryLine(Date.now());
  // Categories only exist once data lands; rebuild the select from them.
  const catSelect = ctx.el.querySelector('#f-cat');
  if (catSelect) {
    const freshCats = [...new Set(items.map((b) => b.category || 'Other'))].sort();
    catSelect.innerHTML = '<option value="all">All categories</option>' + freshCats
      .map((c) => `<option value="${esc(c)}"${ui.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('');
  }
  paintList(list);
}
