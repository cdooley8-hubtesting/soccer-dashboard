(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach((c) => { if (c != null) e.append(c.nodeType ? c : String(c)); });
    return e;
  };
  const fmtET = (iso, opts) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('en-US', Object.assign({ timeZone: 'America/New_York' }, opts));
  };
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('trivia') || '{}'); } catch (e) { return {}; } },
    set(v) { try { localStorage.setItem('trivia', JSON.stringify(v)); } catch (e) {} }
  };
  let D = null;
  let ts = store.get();

  function render() {
    $('updated').textContent = D.updated ? 'Updated ' + fmtET(D.updated, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET' : '';
    const h = D.headline || {};
    $('hero').replaceChildren(
      el('div', { style: 'display:flex;flex-direction:column;gap:6px;flex:1 1 480px' },
        el('p', { class: 'eyebrow', style: 'color:#8FD9AE' }, h.kicker || 'Top story'),
        el('h2', null, h.title || ''),
        h.sub ? el('p', null, h.sub) : null,
        safeUrl(h.url) ? el('a', { href: h.url, target: '_blank', rel: 'noopener', style: 'color:#8FD9AE;font-size:13px' }, 'Read at ' + (h.source || 'source') + ' ↗') : null),
      h.score ? el('div', { style: 'display:flex;gap:12px;align-items:center;font-family:Barlow Condensed,sans-serif;font-weight:700' },
        el('span', { style: 'font-size:28px' }, h.home || ''), el('span', { class: 'score' }, h.score), el('span', { style: 'font-size:28px' }, h.away || '')) : null);

    const ups = D.upsets || [];
    $('upsets').classList.toggle('hidden', !ups.length);
    $('upsetList').replaceChildren(...ups.map((u) => el('div', { style: 'display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline' },
      el('strong', { style: 'font-size:17px' }, u.text), el('span', { style: 'font-size:14px;color:#5C1A14' }, u.detail || ''))));

    const st = D.stat || {};
    $('statBig').textContent = st.big || '';
    $('statLabel').textContent = st.label || '';
    $('statCtx').textContent = st.context || '';

    $('chips').replaceChildren(...(D.watchlist || []).map((w) => el('li', { style: 'padding:6px 14px' }, w)));
    const fd = D.feed || {};
    const items = Array.isArray(fd.items) ? fd.items.filter((x) => x && x.title).slice(0, 24) : [];
    $('feedUpd').textContent = fd.updatedAt ? 'Watchlist news updated ' + fmtET(fd.updatedAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET' : '';
    $('feedEmpty').classList.toggle('hidden', items.length > 0);
    $('feed').replaceChildren(...items.map((x) => {
      const url = typeof x.url === 'string' && /^https:\/\//.test(x.url) ? x.url : '';
      return el('article', { class: 'story' },
        el('span', { class: 'pill mint' }, x.topic || ''), el('h3', null, x.title), el('p', { class: 'note' }, x.summary || ''),
        el('span', { class: 'sub', style: 'font-size:12px' }, [x.source, x.date].filter(Boolean).join(' · ')),
        url ? el('a', { href: url, target: '_blank', rel: 'noopener' }, 'Read the story') : null);
    }));

    const U = D.upcoming || {};
    $('pLabel').textContent = U.label || '';
    $('games').replaceChildren(...(U.games || []).map((g) => {
      const probs = [[g.pH, g.home], [g.pD, 'Draw'], [g.pA, g.away]];
      const fav = probs.slice().sort((a, b) => b[0] - a[0])[0];
      return el('div', { class: 'row', style: 'display:flex;flex-direction:column;gap:6px' },
        el('div', { style: 'display:flex;justify-content:space-between;gap:8px' },
          el('strong', null, g.home + ' vs ' + g.away),
          el('span', { class: 'sub', style: 'white-space:nowrap' }, fmtET(g.kickoff, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' ET')),
        el('div', { style: 'display:flex;align-items:center;gap:10px' },
          el('div', { style: 'flex:1;height:8px;background:#E4E8E3;border-radius:4px;overflow:hidden' },
            el('div', { style: 'height:8px;background:var(--green);width:' + Math.round(fav[0]) + '%' })),
          el('span', { class: 'sub', style: 'white-space:nowrap' }, fav[1] + ' ' + Math.round(fav[0]) + '%')));
    }));

    const R = D.results || {};
    $('rLabel').textContent = R.label || '';
    $('results').replaceChildren(...(R.games || []).map((r) => el('div', { class: 'row res' },
      el('span', { style: 'text-align:right;font-weight:500' }, r.home), el('span', { class: 'sc' }, r.score), el('span', { style: 'font-weight:500' }, r.away))));
    $('rumors').replaceChildren(...(D.rumors || []).map((m) => el('div', { class: 'row', style: 'display:flex;flex-direction:column;gap:4px' },
      el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, el('span', { class: 'pill amber' }, m.tag), el('strong', null, m.title)),
      el('span', { class: 'note' }, m.body),
      safeUrl(m.url) ? srcLink(m.url, m.src) : el('span', { class: 'sub', style: 'font-size:12px' }, 'Source: ' + (m.src || '')))));
    $('news').replaceChildren(...(D.news || []).map((n) => el('div', { class: 'row', style: 'display:flex;gap:12px' },
      el('span', { 'aria-hidden': 'true', style: 'flex:0 0 auto;width:8px;height:8px;margin-top:7px;border-radius:50%;background:var(--green)' }),
      el('div', { style: 'display:flex;flex-direction:column;gap:2px' }, el('strong', null, n.title), el('span', { class: 'note' }, n.body), srcLink(n.url, n.source)))));
    renderTable();
    renderTrivia();
  }

  const safeUrl = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : '');
  const srcLink = (url, label) => {
    const u = safeUrl(url);
    return u ? el('a', { class: 'srclink', href: u, target: '_blank', rel: 'noopener' }, 'Read at ' + (label || 'source') + ' ↗') : null;
  };

  let league = 'epl';
  function renderTable() {
    const all = D.tables || { epl: D.table || {} };
    if (!all[league]) league = 'epl';
    const T = all[league] || {};
    ['epl', 'laliga'].forEach((k) => {
      const b = $('tab-' + k);
      b.classList.toggle('hidden', !all[k]);
      b.setAttribute('aria-selected', String(k === league));
    });
    $('table').replaceChildren(...(T.rows || []).map((t) => el('div', { class: 'row tbl' },
      el('span', { class: 'disp', style: 'font-size:20px;color:var(--muted)' }, t.rank), el('span', { style: 'font-weight:500' }, t.team),
      el('span', { class: 'sub' }, t.rec), el('span', { class: 'disp', style: 'text-align:right;font-size:22px' }, t.pts))));
    $('table').scrollTop = 0;
    $('tNote').textContent = T.note || '';
  }
  ['epl', 'laliga'].forEach((k) => $('tab-' + k).addEventListener('click', () => { league = k; renderTable(); }));

  function renderTrivia() {
    const t = D.trivia;
    if (!t) return;
    const done = ts.answeredDate === t.date;
    $('streak').textContent = 'Streak: ' + (ts.streak || 0);
    $('trQ').textContent = t.question;
    $('trOpts').replaceChildren(...t.options.map((o, i) => {
      let cls = 'btn';
      if (done && i === t.answer) cls += ' right';
      else if (done && i === ts.lastPick) cls += ' wrong';
      return el('button', Object.assign({ type: 'button', class: cls, onclick: () => answer(i) }, done ? { disabled: '' } : {}), o);
    }));
    $('trA').classList.toggle('hidden', !done);
    if (done) $('trA').replaceChildren(el('strong', null, ts.lastCorrect ? 'Correct! ' : 'Not quite. '), t.explain || '');
  }

  function answer(i) {
    const t = D.trivia;
    if (ts.answeredDate === t.date) return;
    const ok = i === t.answer;
    ts = { streak: ok ? (ts.streak || 0) + 1 : 0, answeredDate: t.date, lastPick: i, lastCorrect: ok };
    store.set(ts);
    renderTrivia();
  }

  fetch('data.json?t=' + Date.now(), { cache: 'no-store' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { D = d; render(); })
    .catch(() => { $('updated').textContent = 'Couldn’t load today’s data. Try refreshing the page.'; });
})();
