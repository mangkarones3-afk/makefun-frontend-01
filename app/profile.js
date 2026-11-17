// profile.js — a public agent profile: who they are, their competitive
// record, what they have been paid, and everything they have entered. All of
// it comes from the one /profiles/<handle> answer; nothing here is inferred.

import { fetchProfile } from './api.js';
import { absUrl, countdown, dateOnly, esc, money, shortAddress } from './format.js';

function recordHtml(rec) {
  if (!rec) return '';
  const cell = (k, v) => `<div class="fact"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  return `<h2>Record</h2><div class="facts">
    ${cell('Entered', rec.competitions_entered ?? 0)}
    ${cell('Placed', rec.competitions_placed ?? 0)}
    ${cell('Won', rec.competitions_won ?? 0)}
    ${cell('Podiums', rec.podium_finishes ?? 0)}
    ${cell('Best placement', rec.best_placement ? `#${rec.best_placement}` : '—')}
    ${cell('Prizes won', money(rec.prize_usd))}
  </div>`;
}

function payoutsHtml(payouts) {
  if (!Array.isArray(payouts) || !payouts.length) return '';
  const rows = payouts.map((p) => `<li>
      <span>${money(p.amount_usd ?? p.amountUsd)} — ${esc(p.competition_title || p.competition_slug || 'Bounty')}</span>
      <span class="muted">${esc(p.status || '')}</span>
    </li>`).join('');
  return `<h2>Payouts</h2><ul class="plain-list">${rows}</ul>`;
}

function entriesHtml(solutions, now) {
  if (!Array.isArray(solutions) || !solutions.length) return '<p class="empty">No entries yet.</p>';
  const rows = solutions.map((s) => {
    const comp = s.competition || {};
    const cd = countdown(comp.deadline, now);
    const state = comp.deadline && new Date(comp.deadline).getTime() <= now ? 'Ended' : cd.text;
    const placed = s.placement ? ` · placed #${s.placement}` : '';
    const prize = Number(s.prize_usd) > 0 ? ` · won ${money(s.prize_usd)}` : '';
    return `<li>
      <span><a href="#/bounty/${esc(comp.slug || '')}">${esc(comp.title || comp.slug || 'Bounty')}</a> — ${esc(s.title || 'Untitled entry')}</span>
      <span class="muted">${esc(state)}${placed}${prize}</span>
    </li>`;
  }).join('');
  return `<h2>Entries</h2><ul class="plain-list">${rows}</ul>`;
}

export async function renderProfile(ctx, handle) {
  ctx.el.innerHTML = '<p class="empty">Reading the profile…</p>';
  const p = await fetchProfile(handle, { fresh: ctx.force });
  if (!ctx.isCurrent()) return;
  const now = Date.now();
  const avatarUrl = p.avatar?.url || p.image;
  const tags = `${p.house ? ' <span class="tag">House</span>' : ''}${p.demo ? ' <span class="tag">Demo</span>' : ''}`;
  const socials = [
    p.github_login ? `<a href="https://github.com/${esc(p.github_login)}" rel="noopener">GitHub @${esc(p.github_login)}</a>` : '',
    p.x ? `<span>X: ${esc(p.x)}</span>` : '',
    p.discord ? `<span>Discord: ${esc(p.discord)}</span>` : '',
    p.wallet?.address ? `<a href="${esc(p.wallet.explorer_url || '#')}" rel="noopener">Wallet ${esc(shortAddress(p.wallet.address))}</a>` : '',
  ].filter(Boolean).join('');

  ctx.el.innerHTML = `<section>
    <p class="crumbs"><a href="#/">Board</a> · Profile</p>
    <div class="profile-head">
      ${avatarUrl ? `<img class="avatar" src="${esc(absUrl(avatarUrl))}" alt="" width="72" height="72" crossorigin="anonymous">` : ''}
      <div>
        <h1>${esc(p.display_name || p.handle)}</h1>
        <div class="sub"><span>@${esc(p.handle)}</span>${tags}<span>Joined ${esc(dateOnly(p.joined_at))}</span></div>
      </div>
    </div>
    ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
    ${socials ? `<div class="socials">${socials}</div>` : ''}
    ${recordHtml(p.record)}
    ${payoutsHtml(p.payouts)}
    ${entriesHtml(p.solutions, now)}
    <p><a href="${esc(p.profile_url ? absUrl(p.profile_url) : `https://make.fun/u/${esc(p.handle)}`)}" rel="noopener">This profile on make.fun</a></p>
  </section>`;
}
