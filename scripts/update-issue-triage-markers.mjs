#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const repo = process.env.GH_REPO || 'microsoft/teams-sdk';
const htmlPath = process.argv[2] || 'issue-triage-analysis.html';
const recentHours = Number(process.env.RECENT_HOURS || 24);
const maxEventPages = Number(process.env.MAX_EVENT_PAGES || 5);
const cutoff = new Date(Date.now() - recentHours * 60 * 60 * 1000);

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

let html = readFileSync(htmlPath, 'utf8');
const issueNumbers = [...new Set([...html.matchAll(/github\.com\/microsoft\/teams-sdk\/issues\/(\d+)/g)].map((m) => Number(m[1])))]
  .sort((a, b) => a - b);

if (issueNumbers.length === 0) {
  throw new Error(`No issue links found in ${htmlPath}`);
}

// Fetch current state for all issues represented on the page.
const states = [];
for (const number of issueNumbers) {
  const raw = gh(['api', `repos/${repo}/issues/${number}`, '--jq', '{number:.number,state:.state,closed_at:.closed_at,state_reason:.state_reason,title:.title}']);
  states.push(JSON.parse(raw));
}
const closed = new Map(states.filter((issue) => issue.state === 'closed').map((issue) => [issue.number, issue]));

// Fetch recent label events cheaply. Stop once event pages are older than cutoff.
const recentTaggedByIssue = new Map();
for (let page = 1; page <= maxEventPages; page += 1) {
  const events = JSON.parse(gh(['api', '--method', 'GET', `repos/${repo}/issues/events`, '-F', 'per_page=100', '-F', `page=${page}`]));
  if (events.length === 0) break;

  let pageHasRecent = false;
  for (const event of events) {
    const createdAt = new Date(event.created_at);
    if (createdAt >= cutoff) pageHasRecent = true;
    if (event.event !== 'labeled' || createdAt < cutoff) continue;

    const number = event.issue?.number;
    if (!number || !issueNumbers.includes(number)) continue;

    if (!recentTaggedByIssue.has(number)) {
      recentTaggedByIssue.set(number, []);
    }
    recentTaggedByIssue.get(number).push({
      number,
      label: event.label?.name || 'unknown label',
      actor: event.actor?.login || 'unknown',
      created_at: event.created_at,
      title: event.issue?.title || '',
    });
  }

  if (!pageHasRecent) break;
}

const recentTagged = [...recentTaggedByIssue.entries()]
  .map(([number, events]) => ({
    number,
    labels: [...new Set(events.map((event) => event.label))],
    latest: events.map((event) => event.created_at).sort().at(-1),
    actors: [...new Set(events.map((event) => event.actor))],
  }))
  .sort((a, b) => a.number - b.number);

// Make marker updates idempotent.
html = html.replace(/(<a href="https:\/\/github\.com\/microsoft\/teams-sdk\/issues\/\d+" target="_blank" rel="noreferrer">)(?:✅ |🏷️ )?#(\d+)<\/a>/g, '$1#$2</a>');
html = html.replace(/\s*<span class="closed-badge"[^>]*>✅ CLOSED<\/span>/g, '');
html = html.replace(/\s*<span class="tagged-badge"[^>]*>🏷️ TAGGED<\/span>/g, '');

// Ensure CSS exists.
if (!html.includes('.tagged-badge{')) {
  html = html.replace(
    '.closed-badge{display:inline-flex;',
    '.tagged-badge{display:inline-flex;align-items:center;gap:.3em;border-radius:999px;padding:.28em .7em;font-weight:900;letter-spacing:.02em;color:#201602;background:linear-gradient(180deg,#ffd166,#ffb703);border:1px solid rgba(255,209,102,.85);box-shadow:0 0 0 2px rgba(255,209,102,.12),0 8px 20px rgba(0,0,0,.22)}.closed-badge{display:inline-flex;'
  );
}
if (!html.includes('.closed-badge{')) {
  html = html.replace(
    '.track{color:#cfe3ff;border-color:rgba(124,199,255,.38);background:rgba(124,199,255,.075)}',
    '.track{color:#cfe3ff;border-color:rgba(124,199,255,.38);background:rgba(124,199,255,.075)}.tagged-badge{display:inline-flex;align-items:center;gap:.3em;border-radius:999px;padding:.28em .7em;font-weight:900;letter-spacing:.02em;color:#201602;background:linear-gradient(180deg,#ffd166,#ffb703);border:1px solid rgba(255,209,102,.85);box-shadow:0 0 0 2px rgba(255,209,102,.12),0 8px 20px rgba(0,0,0,.22)}.closed-badge{display:inline-flex;align-items:center;gap:.3em;border-radius:999px;padding:.28em .7em;font-weight:900;letter-spacing:.02em;color:#082015;background:linear-gradient(180deg,#9cffd1,#4bea9f);border:1px solid rgba(156,255,209,.8);box-shadow:0 0 0 2px rgba(156,255,209,.12),0 8px 20px rgba(0,0,0,.22)}'
  );
}

// Update snapshot cards if present.
html = html.replace(/<div class="card"><div class="num">\d+<\/div><div class="label">(?:✅ )?Now closed<\/div><\/div>/, `<div class="card"><div class="num">${closed.size}</div><div class="label">✅ Now closed</div></div>`);
html = html.replace(/<div class="card"><div class="num">\d+<\/div><div class="label">Recently tagged 🏷️<\/div><\/div>/, `<div class="card"><div class="num">${recentTagged.length}</div><div class="label">Recently tagged 🏷️</div></div>`);

// If cards do not exist, place them after the first card.
if (!html.includes('✅ Now closed</div></div>')) {
  html = html.replace(/(<div class="cards"><div class="card">.*?<\/div><\/div>)/, `$1<div class="card"><div class="num">${closed.size}</div><div class="label">✅ Now closed</div></div>`);
}
if (!html.includes('Recently tagged 🏷️</div></div>')) {
  html = html.replace(/(<div class="label">✅ Now closed<\/div><\/div>)/, `$1<div class="card"><div class="num">${recentTagged.length}</div><div class="label">Recently tagged 🏷️</div></div>`);
}

// Replace summary paragraphs.
const closedLinks = [...closed.keys()].sort((a, b) => a - b)
  .map((number) => `<a href="https://github.com/microsoft/teams-sdk/issues/${number}" target="_blank" rel="noreferrer">✅ #${number}</a>`)
  .join(' ');
const closedPara = `<p><strong>Closed since the initial pass:</strong> ${closedLinks}</p>`;
if (html.includes('Closed since the initial pass:</strong>')) {
  html = html.replace(/<p><strong>Closed since the initial pass:<\/strong>.*?<\/p>/, closedPara);
} else {
  html = html.replace('</p><div class="table-wrap"><table><thead><tr><th>New bucket</th>', `</p>${closedPara}<div class="table-wrap"><table><thead><tr><th>New bucket</th>`);
}

const taggedLinks = recentTagged.map((item) => {
  const labelText = escapeHtml(item.labels.join(', '));
  return `<a href="https://github.com/microsoft/teams-sdk/issues/${item.number}" target="_blank" rel="noreferrer">🏷️ #${item.number}</a> <span class="pill">${labelText}</span>`;
}).join(' ');
const taggedPara = `<p><strong>Recently tagged:</strong> ${taggedLinks}</p>`;
if (html.includes('Recently tagged:</strong>')) {
  html = html.replace(/<p><strong>Recently tagged:<\/strong>.*?<\/p>/, taggedPara);
} else {
  html = html.replace(closedPara, `${closedPara}${taggedPara}`);
}

// Mark links and main table rows.
for (const number of issueNumbers) {
  const isClosed = closed.has(number);
  const tagged = recentTaggedByIssue.get(number);
  const prefix = isClosed ? '✅ ' : tagged ? '🏷️ ' : '';
  if (prefix) {
    const linkPattern = new RegExp(`(<a href="https:\\/\\/github\\.com\\/microsoft\\/teams-sdk\\/issues\\/${number}" target="_blank" rel="noreferrer">)#${number}<\\/a>`, 'g');
    html = html.replace(linkPattern, `$1${prefix}#${number}</a>`);
  }

  const tableStart = html.findIndex;
  const tbodyIndex = html.indexOf('<tbody><tr data-priority');
  const issueIndex = html.indexOf(`issues/${number}`, tbodyIndex);
  if (issueIndex < 0) continue;
  const rowEnd = html.indexOf('</tr>', issueIndex);
  const anchorEnd = html.indexOf('</a>', issueIndex) + 4;
  const row = html.slice(issueIndex, rowEnd);

  const badges = [];
  if (isClosed) {
    const closedAt = closed.get(number).closed_at?.slice(0, 10) || 'unknown date';
    badges.push(`<span class="closed-badge" title="✅ closed ${closedAt}">✅ CLOSED</span>`);
  }
  if (tagged) {
    const labels = [...new Set(tagged.map((event) => event.label))].join(', ');
    const latest = tagged.map((event) => event.created_at).sort().at(-1)?.slice(0, 10) || 'unknown date';
    badges.push(`<span class="tagged-badge" title="🏷️ tagged ${latest}: ${escapeHtml(labels)}">🏷️ TAGGED</span>`);
  }
  if (badges.length && !row.includes('closed-badge') && !row.includes('tagged-badge')) {
    html = html.slice(0, anchorEnd) + ` ${badges.join(' ')}` + html.slice(anchorEnd);
  }
}

writeFileSync(htmlPath, html);
console.log(`Updated ${htmlPath}`);
console.log(`Closed: ${closed.size}`);
console.log(`Recently tagged in last ${recentHours}h: ${recentTagged.length}`);
for (const item of recentTagged) {
  console.log(`- #${item.number}: ${item.labels.join(', ')}`);
}
