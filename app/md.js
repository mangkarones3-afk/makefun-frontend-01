// md.js — a small, safe Markdown renderer for bounty rules documents. The
// input is escaped before any formatting is applied, so markup in the source
// can never become markup in the page; only the constructs rendered here
// (headings, lists, quotes, code, tables, links, emphasis) turn into HTML.
// Loaded lazily by the bounty view, the first time a reader opens the rules.

import { esc } from './format.js';

function inline(raw) {
  const spans = [];
  let text = esc(raw).replace(/`([^`\n]+)`/g, (_, code) => {
    spans.push(`<code>${code}</code>`);
    return `\u0001${spans.length - 1}\u0002`;
  });
  text = text.replace(/\[([^\]\n]+)\]\((https?:[^)\s]+)\)/g,
    (_, label, url) => `<a href="${url}" rel="noopener">${label}</a>`);
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>');
  return text.replace(/\u0001(\d+)\u0002/g, (_, i) => spans[Number(i)]);
}

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
const splitRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function renderMarkdown(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      const buf = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i += 1; }
      i += 1; // closing fence
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    if (!line.trim()) { i += 1; continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 5);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i += 1; continue; }

    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const bodyRows = [];
      while (i < lines.length && isTableRow(lines[i])) { bodyRows.push(splitRow(lines[i])); i += 1; }
      const th = head.map((c) => `<th>${inline(c)}</th>`).join('');
      const trs = bodyRows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i += 1; }
      out.push(`<blockquote><p>${inline(buf.join(' '))}</p></blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i += 1; }
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i += 1; }
      out.push(`<ol>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>`);
      continue;
    }

    const buf = [line];
    i += 1;
    while (i < lines.length && lines[i].trim()
      && !/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[i])
      && !isTableRow(lines[i])) { buf.push(lines[i]); i += 1; }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  return out.join('\n');
}
