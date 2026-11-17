// leaderboard.js — one bounty's standings. The whole board arrives in a
// single API answer; the page paints it in chunks of PAGE rows with a
// "show more" button, so even a several-hundred-entry board never costs a
// second request or one giant layout. The row renderer is shared with the
// bounty page's top-10 preview.

import { fetchLeaderboard } from './api.js';
import { absUrl, byteSize, esc, rate } from './format.js';

export const PAGE = 40;

export function leaderboardHead(lb) {
  const count = (lb.entries || []).length;
  const phase = lb.phase?.title ? ` · ${lb.phase.title} phase` : '';
  const note = lb.metrics_withheld
    ? '<p class="lb-note">make.fun holds placements until the phase finalizes; the standings below are live and provisional.</p>'
    : '';
  return `<div class="lb-head"><h2>${esc(lb.competition?.title || 'Leaderboard')}</h2>
    <span class="lb-note">${count} ${count === 1 ? 'entry' : 'entries'}${phase}</span></div>${note}`;
}

export function leaderboardRow(e) {
  const v = e.values || {};
  const j = e.judge || {};
  const judged = Number.isFinite(Number(v.judge));
  const rateHtml = judged ? rate(v.judge) : '—';
  const interval = judged && Number.isFinite(Number(v.judge_low)) && Number.isFinite(Number(v.judge_high))
    ? `${rate(v.judge_low)} – ${rate(v.judge_high)}`
    : '—';
  const record = j.matches
    ? `${j.wins ?? 0}W · ${j.draws ?? 0}D · ${j.losses ?? 0}L of ${j.matches}`
    : 'Not judged yet';
  const tags = `${e.house ? ' <span class="tag">House</span>' : ''}${e.baseline ? ' <span class="tag">Baseline</span>' : ''}`;
  const avatar = e.image
    ? `<img class="avatar" src="${esc(absUrl(e.image))}" alt="" width="26" height="26" loading="lazy" crossorigin="anonymous">`
    : '';
  return `<div class="lb-row">
    <span class="lb-rank">${e.rank ?? '—'}</span>
    <span class="lb-who">${avatar}<span class="names">
      <a class="handle" href="#/u/${esc(e.handle || '')}">@${esc(e.handle || 'unknown')}</a>${tags}
      <span class="entry-title">${esc(e.title || 'Untitled entry')}</span>
    </span></span>
    <span class="lb-rate">${rateHtml}</span>
    <span class="lb-interval">${interval}</span>
    <span class="lb-record">${record}</span>
    <span class="lb-size">${byteSize(v.bytes)}</span>
  </div>`;
}

const ROW_HEAD = `<div class="lb-row head"><span>Rank</span><span>Entrant · entry</span><span>Win rate</span><span>90% interval</span><span>Record</span><span>Dossier</span></div>`;

export async function renderLeaderboard(ctx, slug) {
  ctx.el.innerHTML = '<p class="empty">Reading the leaderboard…</p>';
  const lb = await fetchLeaderboard(slug, { fresh: ctx.force });
  if (!ctx.isCurrent()) return;
  const entries = lb.entries || [];
  let shown = Math.min(PAGE, entries.length);

  ctx.el.innerHTML = `<section>
    <p class="crumbs"><a href="#/">Board</a> · <a href="#/bounty/${esc(slug)}">${esc(lb.competition?.title || slug)}</a> · Leaderboard</p>
    ${leaderboardHead(lb)}
    <div id="lb-body">${ROW_HEAD}${entries.slice(0, shown).map(leaderboardRow).join('')}</div>
    <div id="lb-more"></div>
    <p><a href="https://make.fun/bounty/${esc(slug)}" rel="noopener">This leaderboard on make.fun</a></p>
  </section>`;

  const body = ctx.el.querySelector('#lb-body');
  const more = ctx.el.querySelector('#lb-more');
  const paintMore = () => {
    const remaining = entries.length - shown;
    more.innerHTML = remaining > 0
      ? `<button type="button" class="btn showmore">Show more (${remaining} remaining)</button>`
      : '';
    const btn = more.querySelector('button');
    if (btn) btn.addEventListener('click', () => {
      const next = Math.min(shown + PAGE, entries.length);
      body.insertAdjacentHTML('beforeend', entries.slice(shown, next).map(leaderboardRow).join(''));
      shown = next;
      paintMore();
    });
  };
  paintMore();
}
