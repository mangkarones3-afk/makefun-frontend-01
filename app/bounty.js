// bounty.js — one bounty's page: the facts an entrant decides on (live pot,
// entry fee, whether the deadline still allows entries, time left), the
// rewards table at today's pot, the brief, a top-10 leaderboard preview, the
// latest entries, and the full rules — rendered from markdown only when the
// reader opens them, so the 45 KB rules document costs nothing up front.

import { fetchCompetition, fetchLeaderboard, fetchSubmissions } from './api.js';
import { ago, countdown, dateTime, esc, money } from './format.js';
import { leaderboardRow } from './leaderboard.js';

function factsHtml(b, now) {
  const cd = countdown(b.deadline, now);
  const open = b.deadline ? new Date(b.deadline).getTime() > now : b.acceptingSubmissions === true;
  const fee = Number(b.entryFeeUsd);
  const fact = (k, v, s = '', cls = '') => `<div class="fact"><span class="k">${k}</span><span class="v ${cls}">${v}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
  return `<div class="facts">
    ${fact('Live pot', money(b.potUsd), `Base ${money(b.rewardAmount)} + ${money(b.entryFeesUsd || 0)} in entry fees`, 'big')}
    ${fact('Entry fee', !b.entryFeeUsd || fee === 0 ? 'Free' : money(b.entryFeeUsd), b.entryFeePayers ? `Paid by ${Number(b.entryFeePayers).toLocaleString('en-US')} entrants` : '')}
    ${fact('Status', open ? 'Open for entries' : 'Closed', `API status: ${esc(b.status || '—')} — the deadline decides`)}
    ${fact('Time left', `<span class="cd" data-countdown="${esc(b.deadline || '')}" data-level="${cd.level}">${esc(cd.text)}</span>`)}
    ${fact('Deadline', dateTime(b.deadline))}
    ${fact('Opened', dateTime(b.opensAt))}
    ${fact('Entries', Number(b.submissionCount || 0).toLocaleString('en-US'))}
    ${fact('Category', esc(b.category || '—'))}
  </div>`;
}

function rewardsHtml(b) {
  const rows = Array.isArray(b.rewardsNow) && b.rewardsNow.length
    ? b.rewardsNow.map((r) => `<tr><td>${r.place}</td><td class="num">${money(r.amountUsd)}</td><td class="num">${money(r.baseUsd)}</td><td class="num">${money(r.feeShareUsd)}</td></tr>`).join('')
    : Object.entries(b.rewards || {}).map(([place, amt]) => `<tr><td>${esc(place)}</td><td class="num">${money(amt)}</td></tr>`).join('');
  if (!rows) return '';
  const head = Array.isArray(b.rewardsNow) && b.rewardsNow.length
    ? '<tr><th>Place</th><th class="num">Prize now</th><th class="num">Base</th><th class="num">Fee share</th></tr>'
    : '<tr><th>Place</th><th class="num">Prize</th></tr>';
  const fees = Number(b.entryFeesUsd) || 0;
  const explain = fees > 0
    ? `The pot is the ${money(b.rewardAmount)} base prize plus ${money(fees)} of entry fees from ${Number(b.entryFeePayers || 0).toLocaleString('en-US')} paid entries, split across the places below in the same proportions as the base. Every new paid entry raises every prize.`
    : `The pot is the ${money(b.rewardAmount)} base prize, split across the places below. This bounty takes no entry fee, so the prizes do not grow.`;
  return `<h2>Rewards</h2><p class="lede">${esc(explain)}</p>
    <table><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

function submissionsHtml(subs) {
  const list = (subs?.items || []).slice(0, 10);
  if (!list.length) return '';
  const rows = list.map((s) => `<li>
      <span><a href="#/u/${esc(s.handle || '')}">@${esc(s.handle || 'unknown')}</a> — ${esc(s.title || 'Untitled entry')}</span>
      <span class="muted">${esc(s.status || '')} · ${esc(ago(s.created_at))}</span>
    </li>`).join('');
  return `<h2>Latest entries</h2><ul class="plain-list">${rows}</ul>`;
}

export async function renderBounty(ctx, slug) {
  ctx.el.innerHTML = '<p class="empty">Reading the bounty…</p>';
  const [b, lb, subs] = await Promise.all([
    fetchCompetition(slug, { fresh: ctx.force }),
    fetchLeaderboard(slug).catch(() => null),
    fetchSubmissions(slug).catch(() => null),
  ]);
  if (!ctx.isCurrent()) return;
  const now = Date.now();
  const paragraphs = String(b.description || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const preview = lb?.entries?.length
    ? `<p class="lb-note">Top 10 of ${lb.entries.length} entries${lb.phase?.title ? ` · ${esc(lb.phase.title)} phase` : ''}</p>
       <div>${lb.entries.slice(0, 10).map(leaderboardRow).join('')}</div>
       <p><a href="#/bounty/${esc(slug)}/leaderboard">Full leaderboard (${lb.entries.length} entries)</a></p>`
    : '<p class="empty">No leaderboard yet.</p>';

  ctx.el.innerHTML = `<section>
    <p class="crumbs"><a href="#/">Board</a> · Bounty</p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary || '')}</p>
    ${factsHtml(b, now)}
    ${rewardsHtml(b)}
    <h2>About this bounty</h2>
    <div class="about">${paragraphs.map((p) => `<p>${esc(p)}</p>`).join('') || '<p class="empty">No description published.</p>'}</div>
    <h2>Leaderboard preview</h2>
    ${preview}
    ${submissionsHtml(subs)}
    <h2>Rules</h2>
    <details class="rules" id="rules-box"><summary>Read the full rules for this bounty</summary>
      <div class="md" id="rules-body"><p class="empty">Loading the rules…</p></div>
    </details>
    <p><a href="https://make.fun/bounty/${esc(slug)}" rel="noopener">This bounty on make.fun</a></p>
  </section>`;

  const box = ctx.el.querySelector('#rules-box');
  box.addEventListener('toggle', async () => {
    if (!box.open || box.dataset.loaded) return;
    box.dataset.loaded = '1';
    const { renderMarkdown } = await import('./md.js');
    const body = ctx.el.querySelector('#rules-body');
    if (body) body.innerHTML = renderMarkdown(b.rules || 'No rules published.');
  }, { once: false });
}
