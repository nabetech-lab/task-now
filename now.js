(() => {
  'use strict';

  const VERSION = 'v3.6.0';
  const ROOT_ID = 'tcnow-root';
  const STYLE_ID = 'tcnow-style';

  // ---------------------------
  // cleanup old instance
  // ---------------------------
  if (window.__TCNOW__) {
    try {
      (window.__TCNOW__.timers || []).forEach(clearInterval);
      if (window.__TCNOW__.observer) window.__TCNOW__.observer.disconnect();
      if (window.__TCNOW__.root && window.__TCNOW__.root.remove) {
        window.__TCNOW__.root.remove();
      }
      const oldStyle = document.getElementById(STYLE_ID);
      if (oldStyle) oldStyle.remove();
    } catch (e) {}
  }

  // ---------------------------
  // utilities
  // ---------------------------
  const pad2 = (n) => String(n).padStart(2, '0');

  const cleanText = (s) =>
    (s || '')
      .replace(/\s+/g, ' ')
      .replace(/[ \t\r\n]+/g, ' ')
      .trim();

  const isVisible = (el) => {
    if (!el || !el.getBoundingClientRect) return false;
    if (el.closest(`#${ROOT_ID}`)) return false;
    const style = getComputedStyle(el);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity || '1') === 0
    ) {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const isClockHM = (t) => /^\d{1,2}:\d{2}$/.test(t);
  const isClockHMSPlaceholder = (t) => /^--:--(?::--)?$/.test(t);
  const isDurationLike = (t) => /^\d{2}:\d{2}(?::\d{2})?$/.test(t);

  const parseClockHM = (t) => {
    if (!isClockHM(t)) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const clockToDate = (t) => {
    const mins = parseClockHM(t);
    if (mins == null) return null;
    const now = new Date();
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    d.setMinutes(mins);
    return d;
  };

  // duration:
  // "00:10" => 10 minutes
  // "01:17:53" => 1h17m53s
  const parseDurationSec = (t) => {
    if (!t || !isDurationLike(t)) return 0;
    const parts = t.split(':').map(Number);
    if (parts.length === 2) {
      const [h, m] = parts;
      return h * 3600 + m * 60;
    }
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return h * 3600 + m * 60 + s;
    }
    return 0;
  };

  const formatClock = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  const formatDuration = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(ss)}`;
  };

  const addSecToClock = (clockText, sec) => {
    const base = clockToDate(clockText);
    if (!base) return '--:--';
    const d = new Date(base.getTime() + Math.max(0, sec) * 1000);
    return formatClock(d);
  };

  const diffClockSec = (startText, finishText) => {
    const s = clockToDate(startText);
    const f = clockToDate(finishText);
    if (!s || !f) return 0;
    return Math.max(0, Math.floor((f - s) / 1000));
  };

  const nowClock = () => {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const ignoreWords = [
    'TaskChute',
    'NOW',
    'PREVIOUS',
    'NEXT',
    'START',
    'FINISH',
    'PLANNED',
    'PLANNED END',
    'ELAPSED',
    'OVER',
    'Main',
    'Code',
    'Issues',
    'Pull requests',
    'github',
    'TaskChute NOW',
    '検索',
    'スタートページ',
    'プロジェクト',
    'モード',
    'Meeting',
    'Meta',
    '最近',
    'もっと表示',
    '新しいノートを作成',
    '何もない状態で書く',
    'ホーム',
    'インボックス',
    '探す',
    'Copilot',
    'コピー',
    'ブックマーク',
    'マークアップ',
    'プリント',
    'ChatGPT に聞く',
    'JavaScript',
    'Webページ',
    '共有シート'
  ];

  const looksLikeTaskName = (t) => {
    const s = cleanText(t);
    if (!s) return false;
    if (s.length > 80) return false;
    if (isClockHM(s) || isClockHMSPlaceholder(s) || isDurationLike(s)) return false;
    if (/^[\d:：\-ー—–/. ]+$/.test(s)) return false;
    if (ignoreWords.some((w) => s.includes(w))) return false;
    return true;
  };

  const getLeafElements = (root) => {
    const out = [];
    const walk = (node) => {
      if (!node || node.nodeType !== 1) return;
      const el = node;
      if (el.closest(`#${ROOT_ID}`)) return;
      const children = [...el.children].filter((c) => isVisible(c));
      if (children.length === 0) {
        const txt = cleanText(el.textContent);
        if (txt) out.push(el);
        return;
      }
      children.forEach(walk);
    };
    walk(root);
    return out;
  };

  const firstTaskNameFromLeaves = (leaves) => {
    for (const el of leaves) {
      const t = cleanText(el.textContent);
      if (!looksLikeTaskName(t)) continue;
      if (t === '退勤') return t;
      return t;
    }
    return '';
  };

  const uniqueBy = (arr, keyFn) => {
    const m = new Map();
    arr.forEach((item) => {
      const k = keyFn(item);
      if (!m.has(k)) m.set(k, item);
    });
    return [...m.values()];
  };

  // ---------------------------
  // DOM extraction
  // ---------------------------
  const extractTaskRows = () => {
    const vw = window.innerWidth;
    const candidates = [];

    const divs = [...document.querySelectorAll('div')];

    for (const el of divs) {
      if (!isVisible(el)) continue;
      if (el.closest(`#${ROOT_ID}`)) continue;

      const r = el.getBoundingClientRect();

      // task rows are shallow horizontal rows on left side
      if (r.width < vw * 0.45) continue;
      if (r.height < 20 || r.height > 60) continue;
      if (r.left > vw * 0.2) continue;

      const leaves = getLeafElements(el);
      if (!leaves.length) continue;

      const buttons = leaves.filter((x) => x.tagName === 'BUTTON');
      if (buttons.length < 2) continue;

      const name = firstTaskNameFromLeaves(leaves);
      if (!name) continue;

      // ignore row-like junk
      if (name.includes('TaskChute')) continue;

      const leafTexts = leaves.map((x) => cleanText(x.textContent)).filter(Boolean);
      const btnTexts = buttons.map((x) => cleanText(x.textContent)).filter(Boolean);
      const pTexts = leaves
        .filter((x) => x.tagName === 'P')
        .map((x) => cleanText(x.textContent))
        .filter(Boolean);

      const start = btnTexts[0] || '--:--';
      const finish = btnTexts[1] || '--:--';
      const plannedRaw = btnTexts[2] || '';
      const elapsedRaw = pTexts.find((t) => isDurationLike(t)) || '';

      const item = {
        el,
        rect: r,
        y: r.top,
        x: r.left,
        name,
        leaves,
        leafTexts,
        btnTexts,
        pTexts,
        start,
        finish,
        plannedRaw,
        elapsedRaw
      };

      candidates.push(item);
    }

    const rows = uniqueBy(
      candidates.sort((a, b) => a.y - b.y),
      (r) => `${Math.round(r.y / 4)}|${r.name}|${r.start}|${r.finish}|${r.plannedRaw}`
    );

    return rows;
  };

  const detectCurrentTaskNameFromBottomBar = (rows) => {
    const rowNames = new Set(rows.map((r) => r.name));
    const vh = window.innerHeight;

    const texts = [...document.querySelectorAll('div, span, p')]
      .filter(isVisible)
      .map((el) => {
        const t = cleanText(el.textContent);
        const r = el.getBoundingClientRect();
        return { el, t, r };
      })
      .filter(({ t, r }) => {
        if (!rowNames.has(t)) return false;
        if (r.top < vh * 0.6) return false;
        if (r.height < 16 || r.height > 60) return false;
        if (r.width < 30 || r.width > 260) return false;
        return true;
      })
      .sort((a, b) => {
        // prefer lower and larger
        const aScore = a.r.top + a.r.width * 0.01;
        const bScore = b.r.top + b.r.width * 0.01;
        return bScore - aScore;
      });

    return texts[0]?.t || '';
  };

  const fallbackCurrentIndex = (rows) => {
    if (!rows.length) return -1;

    // prefer rows with a valid start time and still unfinished
    const unfinished = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => isClockHM(r.start) && (isClockHMSPlaceholder(r.finish) || r.finish === '--:--'));

    if (unfinished.length) {
      // prefer the one nearest screen center vertically
      const center = window.innerHeight * 0.55;
      unfinished.sort((a, b) => Math.abs(a.r.y - center) - Math.abs(b.r.y - center));
      return unfinished[0].i;
    }

    return Math.min(rows.length - 1, Math.max(0, Math.floor(rows.length / 2)));
  };

  const detectCurrentIndex = (rows) => {
    if (!rows.length) return -1;

    const currentName = detectCurrentTaskNameFromBottomBar(rows);

    if (currentName) {
      const candidates = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.name === currentName);

      if (candidates.length) {
        const center = window.innerHeight * 0.5;
        candidates.sort((a, b) => Math.abs(a.r.y - center) - Math.abs(b.r.y - center));
        return candidates[0].i;
      }
    }

    return fallbackCurrentIndex(rows);
  };

  const inferQuitClock = (rows) => {
    const quit = rows.find((r) => r.name === '退勤');
    if (!quit) return '--:--';

    if (isClockHM(quit.start)) return quit.start;

    const all = cleanText(quit.el.textContent).match(/\d{1,2}:\d{2}/g) || [];
    if (all.length) return all[all.length - 1];

    return '--:--';
  };

  const toNowData = (row) => {
    if (!row) {
      return {
        task: 'タスクを取得できません',
        start: '--:--',
        plannedEnd: '--:--',
        elapsed: '--:--:--',
        planned: '--:--:--',
        over: '--:--:--'
      };
    }

    const start = isClockHM(row.start) ? row.start : '--:--';
    const plannedSec = parseDurationSec(row.plannedRaw);
    const plannedEnd = start !== '--:--' && plannedSec > 0 ? addSecToClock(start, plannedSec) : '--:--';

    let elapsedSec = 0;
    if (start !== '--:--') {
      const s = clockToDate(start);
      const now = new Date();
      if (s) elapsedSec = Math.max(0, Math.floor((now - s) / 1000));
    } else {
      elapsedSec = parseDurationSec(row.elapsedRaw);
    }

    const overSec = Math.max(0, elapsedSec - plannedSec);

    return {
      task: row.name,
      start,
      plannedEnd,
      elapsed: formatDuration(elapsedSec),
      planned: plannedSec > 0 ? formatDuration(plannedSec) : '--:--:--',
      over: plannedSec > 0 ? formatDuration(overSec) : '--:--:--'
    };
  };

  const toPrevData = (row, fallbackFinishClock) => {
    if (!row) {
      return {
        task: '—',
        start: '--:--',
        finish: '--:--',
        elapsed: '--:--:--'
      };
    }

    const start = isClockHM(row.start) ? row.start : '--:--';

    let finish = '--:--';
    if (isClockHM(row.finish)) {
      finish = row.finish;
    } else if (fallbackFinishClock && isClockHM(fallbackFinishClock)) {
      finish = fallbackFinishClock;
    } else if (start !== '--:--') {
      finish = start;
    }

    let elapsedSec = 0;
    if (start !== '--:--' && finish !== '--:--') {
      elapsedSec = diffClockSec(start, finish);
    } else {
      elapsedSec = parseDurationSec(row.elapsedRaw);
    }

    return {
      task: row.name,
      start,
      finish,
      elapsed: formatDuration(elapsedSec)
    };
  };

  const toNextData = (rows) =>
    rows.slice(0, 3).map((r) => {
      let at = '--:--';
      if (isClockHM(r.start)) {
        at = r.start;
      } else {
        const all = cleanText(r.el.textContent).match(/\d{1,2}:\d{2}/g) || [];
        if (all.length) at = all[all.length - 1];
      }
      return { task: r.name, at };
    });

  const buildSnapshot = () => {
    const rows = extractTaskRows();
    const currentIndex = detectCurrentIndex(rows);
    const currentRow = currentIndex >= 0 ? rows[currentIndex] : null;
    const prevRow = currentIndex > 0 ? rows[currentIndex - 1] : null;
    const nextRows = currentIndex >= 0 ? rows.slice(currentIndex + 1) : [];
    const quitClock = inferQuitClock(rows);

    const nowData = toNowData(currentRow);
    const prevData = toPrevData(prevRow, nowData.start);
    const nextData = toNextData(nextRows);

    return {
      rows,
      currentIndex,
      currentRow,
      prevRow,
      nextRows,
      quitClock,
      nowData,
      prevData,
      nextData
    };
  };

  // ---------------------------
  // UI
  // ---------------------------
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --tc-bg: #05070d;
      --tc-card: #1a2230;
      --tc-card-2: #0b101b;
      --tc-text: #f1f3f7;
      --tc-muted: #8a90a0;
      --tc-dim: #6f7583;
      --tc-white: #ffffff;
      --tc-shadow: rgba(0,0,0,.28);
      --tc-radius: 26px;
      --tc-gap: clamp(16px, 2.1vw, 28px);
      --tc-side-gap: clamp(10px, 1.6vw, 20px);
      --tc-pad: clamp(20px, 2.2vw, 34px);
      --tc-card-pad: clamp(24px, 2.3vw, 40px);
      --tc-font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    #${ROOT_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: var(--tc-bg);
      color: var(--tc-text);
      font-family: var(--tc-font);
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    #${ROOT_ID} * {
      box-sizing: border-box;
    }

    #tc-frame {
      position: absolute;
      inset: 0;
      padding: var(--tc-pad);
      display: grid;
      grid-template-rows: auto 1fr;
      gap: var(--tc-gap);
    }

    #tc-top {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: start;
      gap: var(--tc-gap);
      min-height: 0;
    }

    #tc-title {
      color: var(--tc-muted);
      font-weight: 800;
      letter-spacing: .16em;
      font-size: clamp(18px, 1.9vw, 28px);
      line-height: 1.15;
      white-space: nowrap;
    }

    #tc-summary {
      display: grid;
      gap: .35em;
      align-self: start;
      min-width: max-content;
    }

    .tc-summary-row {
      display: grid;
      grid-template-columns: max-content max-content;
      align-items: baseline;
      column-gap: .6em;
      color: var(--tc-white);
      font-weight: 800;
      font-size: clamp(16px, 1.8vw, 28px);
      line-height: 1.1;
    }

    .tc-summary-row .k {
      min-width: 2.3em;
    }

    .tc-summary-row .v {
      min-width: 4.2em;
      text-align: left;
    }

    #tc-clock {
      justify-self: end;
      align-self: start;
      color: var(--tc-white);
      font-weight: 900;
      font-size: clamp(58px, 7vw, 100px);
      line-height: .92;
      letter-spacing: -.04em;
      white-space: nowrap;
    }

    #tc-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 1.95fr) minmax(300px, 1fr);
      gap: var(--tc-gap);
    }

    .tc-card {
      min-width: 0;
      min-height: 0;
      border-radius: var(--tc-radius);
      background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02)), var(--tc-card-2);
      box-shadow: 0 10px 30px var(--tc-shadow) inset;
      padding: var(--tc-card-pad);
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      overflow: hidden;
    }

    #tc-now-card {
      background:
        linear-gradient(90deg, rgba(255,255,255,.98) 0 10px, transparent 10px 100%),
        linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.015)),
        var(--tc-card);
    }

    #tc-side {
      min-width: 0;
      min-height: 0;
      display: grid;
      grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
      gap: var(--tc-side-gap);
    }

    .tc-card-title {
      color: #717889;
      font-weight: 800;
      letter-spacing: .18em;
      font-size: clamp(18px, 1.9vw, 28px);
      line-height: 1;
      margin-bottom: clamp(10px, 1.4vh, 18px);
      flex-shrink: 0;
    }

    #tc-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      align-self: flex-start;
      min-width: 0;
      padding: .34em 1em;
      margin-bottom: clamp(18px, 2.3vh, 28px);
      border-radius: 20px;
      background: #f7f7f8;
      color: #0e1118;
      font-weight: 900;
      letter-spacing: .16em;
      font-size: clamp(18px, 2vw, 36px);
      line-height: 1;
      flex-shrink: 0;
    }

    #tc-now-body {
      display: grid;
      grid-template-columns: max-content 1fr;
      column-gap: clamp(18px, 2vw, 34px);
      row-gap: clamp(12px, 1.6vh, 18px);
      align-content: start;
      min-height: 0;
      width: 100%;
    }

    .tc-metric-label {
      color: var(--tc-muted);
      font-weight: 900;
      letter-spacing: .18em;
      font-size: clamp(18px, 1.8vw, 30px);
      line-height: 1;
      align-self: end;
      white-space: nowrap;
    }

    .tc-metric-label.strong {
      color: var(--tc-white);
    }

    .tc-metric-value {
      color: #d8ddea;
      font-weight: 500;
      font-size: clamp(28px, 3.25vw, 56px);
      line-height: 1;
      justify-self: start;
      white-space: nowrap;
      text-align: left;
    }

    .tc-metric-value.strong {
      color: var(--tc-white);
      font-weight: 700;
    }

    #tc-now-task {
      grid-column: 1 / -1;
      color: var(--tc-white);
      font-weight: 900;
      font-size: clamp(36px, 4.3vw, 82px);
      line-height: 1.05;
      margin-top: clamp(-2px, -.2vh, 0px);
      margin-bottom: clamp(4px, .6vh, 8px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #tc-prev-task {
      color: var(--tc-white);
      font-size: clamp(20px, 2.2vw, 36px);
      font-weight: 900;
      line-height: 1.1;
      margin-top: 2px;
      margin-bottom: clamp(12px, 1.8vh, 18px);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
    }

    .tc-prev-metrics {
      display: grid;
      gap: clamp(10px, 1.25vh, 16px);
      min-height: 0;
    }

    .tc-mini-row {
      display: grid;
      grid-template-columns: max-content 1fr;
      column-gap: clamp(14px, 1.5vw, 22px);
      align-items: baseline;
      min-width: 0;
    }

    .tc-mini-row .k {
      color: #798092;
      font-weight: 900;
      letter-spacing: .16em;
      font-size: clamp(14px, 1.4vw, 24px);
      line-height: 1;
      white-space: nowrap;
    }

    .tc-mini-row .v {
      color: #aeb6c9;
      font-weight: 500;
      font-size: clamp(16px, 2vw, 34px);
      line-height: 1.05;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
    }

    #tc-next-list {
      display: grid;
      gap: clamp(12px, 1.5vh, 18px);
      min-height: 0;
      align-content: start;
    }

    .tc-next-item {
      display: grid;
      grid-template-columns: max-content 1fr;
      column-gap: clamp(16px, 1.7vw, 24px);
      align-items: baseline;
      min-width: 0;
    }

    .tc-next-time {
      color: #aeb6c9;
      font-weight: 500;
      font-size: clamp(16px, 2.1vw, 34px);
      line-height: 1.05;
      white-space: nowrap;
    }

    .tc-next-task {
      color: #aeb6c9;
      font-weight: 700;
      font-size: clamp(18px, 2.35vw, 36px);
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    #tc-version {
      position: absolute;
      right: clamp(12px, 1.4vw, 22px);
      bottom: clamp(8px, 1vh, 16px);
      color: rgba(255,255,255,.22);
      font-weight: 700;
      font-size: clamp(10px, 1vw, 16px);
      letter-spacing: .04em;
      pointer-events: none;
    }

    @media (orientation: portrait) {
      #tc-frame {
        grid-template-rows: auto 1fr;
      }

      #tc-top {
        grid-template-columns: 1fr auto;
        grid-template-areas:
          "title clock"
          "summary summary";
        row-gap: clamp(10px, 1.6vh, 16px);
      }

      #tc-title {
        grid-area: title;
      }

      #tc-clock {
        grid-area: clock;
        font-size: clamp(42px, 11vw, 80px);
      }

      #tc-summary {
        grid-area: summary;
      }

      #tc-grid {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(0, 1.4fr) minmax(0, 1fr);
      }

      #tc-side {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
      }

      #tc-now-task {
        white-space: normal;
      }

      #tc-prev-task {
        white-space: normal;
      }

      .tc-next-task {
        white-space: normal;
      }
    }

    @media (orientation: landscape) and (max-height: 500px) {
      #tc-frame {
        padding: clamp(14px, 2.2dvh, 20px) clamp(18px, 2.4dvw, 28px);
        gap: clamp(12px, 2dvh, 18px);
      }

      #tc-top {
        gap: clamp(14px, 2dvw, 22px);
      }

      #tc-title {
        font-size: clamp(15px, 4.2dvh, 24px);
      }

      .tc-summary-row {
        font-size: clamp(14px, 4dvh, 24px);
      }

      #tc-clock {
        font-size: clamp(46px, 15dvh, 90px);
      }

      .tc-card-title {
        font-size: clamp(14px, 4dvh, 24px);
        margin-bottom: .7dvh;
      }

      #tc-badge {
        font-size: clamp(15px, 4dvh, 26px);
        margin-bottom: clamp(10px, 2dvh, 16px);
      }

      #tc-now-body {
        row-gap: clamp(8px, 1.5dvh, 14px);
        column-gap: clamp(12px, 2dvw, 22px);
      }

      .tc-metric-label {
        font-size: clamp(13px, 3.4dvh, 22px);
      }

      .tc-metric-value {
        font-size: clamp(20px, 7dvh, 48px);
      }

      #tc-now-task {
        font-size: clamp(28px, 8.4dvh, 64px);
        margin-bottom: .8dvh;
      }

      #tc-prev-task {
        font-size: clamp(14px, 4.5dvh, 23px);
        line-height: 1.15;
        margin-top: .4dvh;
        margin-bottom: 1.2dvh;
      }

      .tc-mini-row .k {
        font-size: clamp(11px, 2.8dvh, 18px);
      }

      .tc-mini-row .v {
        font-size: clamp(14px, 4.2dvh, 28px);
      }

      .tc-next-time {
        font-size: clamp(14px, 4.2dvh, 26px);
      }

      .tc-next-task {
        font-size: clamp(15px, 4.4dvh, 28px);
      }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <div id="tc-frame">
      <div id="tc-top">
        <div id="tc-title">TaskChute NOW</div>

        <div id="tc-summary">
          <div class="tc-summary-row">
            <span class="k">退勤</span>
            <span class="v" id="tc-quit-clock">--:--</span>
          </div>
          <div class="tc-summary-row">
            <span class="k">超過</span>
            <span class="v" id="tc-quit-over">--:--:--</span>
          </div>
        </div>

        <div id="tc-clock">--:--</div>
      </div>

      <div id="tc-grid">
        <section id="tc-now-card" class="tc-card">
          <div id="tc-badge">NOW</div>

          <div id="tc-now-body">
            <div class="tc-metric-label">START</div>
            <div class="tc-metric-value" id="tc-now-start">--:--</div>

            <div id="tc-now-task">タスクを取得できません</div>

            <div class="tc-metric-label">PLANNED END</div>
            <div class="tc-metric-value" id="tc-now-planned-end">--:--</div>

            <div class="tc-metric-label">ELAPSED</div>
            <div class="tc-metric-value" id="tc-now-elapsed">--:--:--</div>

            <div class="tc-metric-label">PLANNED</div>
            <div class="tc-metric-value" id="tc-now-planned">--:--:--</div>

            <div class="tc-metric-label strong">OVER</div>
            <div class="tc-metric-value strong" id="tc-now-over">--:--:--</div>
          </div>
        </section>

        <div id="tc-side">
          <section id="tc-prev-card" class="tc-card">
            <div class="tc-card-title">PREVIOUS</div>
            <div id="tc-prev-task">—</div>

            <div class="tc-prev-metrics">
              <div class="tc-mini-row">
                <div class="k">START</div>
                <div class="v" id="tc-prev-start">--:--</div>
              </div>
              <div class="tc-mini-row">
                <div class="k">FINISH</div>
                <div class="v" id="tc-prev-finish">--:--</div>
              </div>
              <div class="tc-mini-row">
                <div class="k">ELAPSED</div>
                <div class="v" id="tc-prev-elapsed">--:--:--</div>
              </div>
            </div>
          </section>

          <section id="tc-next-card" class="tc-card">
            <div class="tc-card-title">NEXT</div>
            <div id="tc-next-list">
              <div class="tc-next-item">
                <div class="tc-next-time">--:--</div>
                <div class="tc-next-task">—</div>
              </div>
              <div class="tc-next-item">
                <div class="tc-next-time">--:--</div>
                <div class="tc-next-task">—</div>
              </div>
              <div class="tc-next-item">
                <div class="tc-next-time">--:--</div>
                <div class="tc-next-task">—</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div id="tc-version">${VERSION}</div>
  `;
  document.body.appendChild(root);

  const $ = (id) => document.getElementById(id);

  const els = {
    clock: $('tc-clock'),
    quitClock: $('tc-quit-clock'),
    quitOver: $('tc-quit-over'),

    nowStart: $('tc-now-start'),
    nowTask: $('tc-now-task'),
    nowPlannedEnd: $('tc-now-planned-end'),
    nowElapsed: $('tc-now-elapsed'),
    nowPlanned: $('tc-now-planned'),
    nowOver: $('tc-now-over'),

    prevTask: $('tc-prev-task'),
    prevStart: $('tc-prev-start'),
    prevFinish: $('tc-prev-finish'),
    prevElapsed: $('tc-prev-elapsed'),

    nextList: $('tc-next-list')
  };

  let snapshot = null;

  const renderNext = (items) => {
    const normalized = [...items];
    while (normalized.length < 3) normalized.push({ at: '--:--', task: '—' });

    els.nextList.innerHTML = normalized
      .slice(0, 3)
      .map(
        (x) => `
          <div class="tc-next-item">
            <div class="tc-next-time">${x.at || '--:--'}</div>
            <div class="tc-next-task">${x.task || '—'}</div>
          </div>
        `
      )
      .join('');
  };

  const render = () => {
    const d = snapshot || buildSnapshot();
    snapshot = d;

    const now = new Date();
    els.clock.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    // fixed quit summary
    els.quitClock.textContent = d.quitClock || '--:--';

    if (isClockHM(d.quitClock)) {
      const qd = clockToDate(d.quitClock);
      const overSec = qd ? Math.max(0, Math.floor((now - qd) / 1000)) : 0;
      els.quitOver.textContent = formatDuration(overSec);
    } else {
      els.quitOver.textContent = '--:--:--';
    }

    // NOW
    const liveNow = d.currentRow ? toNowData(d.currentRow) : d.nowData;
    els.nowStart.textContent = liveNow.start || '--:--';
    els.nowTask.textContent = liveNow.task || 'タスクを取得できません';
    els.nowPlannedEnd.textContent = liveNow.plannedEnd || '--:--';
    els.nowElapsed.textContent = liveNow.elapsed || '--:--:--';
    els.nowPlanned.textContent = liveNow.planned || '--:--:--';
    els.nowOver.textContent = liveNow.over || '--:--:--';

    // PREVIOUS
    const prev = d.prevData || {
      task: '—',
      start: '--:--',
      finish: '--:--',
      elapsed: '--:--:--'
    };

    els.prevTask.textContent = prev.task || '—';
    els.prevStart.textContent = prev.start || '--:--';
    els.prevFinish.textContent = prev.finish || '--:--';
    els.prevElapsed.textContent = prev.elapsed || '--:--:--';

    // NEXT
    renderNext(d.nextData || []);
  };

  const refreshSnapshot = () => {
    try {
      snapshot = buildSnapshot();
      render();
    } catch (e) {
      console.error('[TCNOW] refreshSnapshot failed:', e);
    }
  };

  const refreshLive = () => {
    try {
      render();
    } catch (e) {
      console.error('[TCNOW] refreshLive failed:', e);
    }
  };

  refreshSnapshot();

  const timers = [
    setInterval(refreshLive, 1000),
    setInterval(refreshSnapshot, 5000)
  ];

  const observer = new MutationObserver(() => {
    // DOMが大きく変わったら次回スナップショットで拾う
  });

  try {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } catch (e) {}

  window.__TCNOW__ = {
    version: VERSION,
    root,
    timers,
    observer
  };
})();
