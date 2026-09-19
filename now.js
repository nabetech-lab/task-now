(() => {
  "use strict";

  const APP_ID = "__TASKCHUTE_NOW_APP__";
  const VERSION = "v3.7.1";
  const RESCAN_MS = 5000;
  const RENDER_MS = 1000;

  if (window[APP_ID]?.destroy) {
    window[APP_ID].destroy();
  }

  const HM_RE = /^\d{1,2}:\d{2}$/;
  const HMS_RE = /^\d{1,2}:\d{2}:\d{2}$/;
  const BLANK_HMS_RE = /^--:--(?::--)?$/;
  const DURATION_RE = /^\d{1,2}:\d{2}(?::\d{2})?$/;

  const app = {
    root: null,
    style: null,
    scanTimer: null,
    renderTimer: null,
    scan: null,
    destroy
  };

  window[APP_ID] = app;

  init();

  function init() {
    injectStyle();
    injectRoot();
    runScan();
    render();

    app.scanTimer = setInterval(() => {
      runScan();
      render();
    }, RESCAN_MS);

    app.renderTimer = setInterval(() => {
      render();
    }, RENDER_MS);
  }

  function destroy() {
    if (app.scanTimer) clearInterval(app.scanTimer);
    if (app.renderTimer) clearInterval(app.renderTimer);
    if (app.root?.parentNode) app.root.parentNode.removeChild(app.root);
    if (app.style?.parentNode) app.style.parentNode.removeChild(app.style);
    delete window[APP_ID];
  }

  function injectStyle() {
    const style = document.createElement("style");
    style.id = "tc-now-style";
    style.textContent = `
      #tc-now-overlay, #tc-now-overlay * {
        box-sizing: border-box;
      }

      #tc-now-overlay {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100dvh;
        z-index: 2147483647;
        background: #02050b;
        color: #f5f7fb;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        overflow: auto;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      #tc-now-overlay .tc-shell {
        min-height: 100dvh;
        width: 100%;
        padding: 2.2vh 2.4vw 2.2vh 2.4vw;
        display: flex;
        flex-direction: column;
        gap: 1.8vh;
      }

      #tc-now-overlay .tc-header {
        display: grid;
        grid-template-columns: minmax(180px, 1fr) auto auto;
        align-items: start;
        column-gap: 2vw;
        row-gap: 1vh;
      }

      #tc-brand {
        color: #aab0c6;
        font-weight: 800;
        letter-spacing: 0.12em;
        line-height: 1.15;
        white-space: nowrap;
      }

      #tc-leave {
        display: grid;
        gap: 0.45vh;
        align-content: start;
        justify-content: start;
      }

      #tc-leave .tc-leave-row {
        display: grid;
        grid-template-columns: auto auto;
        align-items: baseline;
        gap: 0.9vw;
        white-space: nowrap;
      }

      #tc-leave .tc-jp-label {
        font-weight: 800;
        color: #ffffff;
      }

      #tc-leave .tc-leave-value {
        font-weight: 900;
        color: #ffffff;
      }

      #tc-clock {
        justify-self: end;
        align-self: start;
        color: #ffffff;
        font-weight: 900;
        line-height: 0.95;
        white-space: nowrap;
      }

      #tc-body {
        flex: 1;
        display: grid;
        gap: 1.8vh 1.6vw;
      }

      .tc-card {
        border-radius: 2.2vw;
        background: linear-gradient(135deg, rgba(27,34,48,0.98), rgba(32,40,56,0.96));
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        overflow: hidden;
        min-width: 0;
      }

      .tc-dark-card {
        background: rgba(8, 13, 24, 0.88);
      }

      #tc-now-card {
        position: relative;
        padding: 3.3vh 3.2vw 3.3vh 3.2vw;
      }

      #tc-now-card::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 1.1vw;
        max-width: 12px;
        min-width: 8px;
        background: rgba(255,255,255,0.96);
        border-radius: 0 999px 999px 0;
      }

      .tc-now-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 8.5ch;
        padding: 0.42em 1.05em 0.45em;
        border-radius: 999px;
        background: rgba(255,255,255,0.96);
        color: #101520;
        font-weight: 900;
        letter-spacing: 0.18em;
        line-height: 1;
        white-space: nowrap;
      }

      .tc-now-stack {
        margin-top: 2.3vh;
        display: grid;
        gap: 1.35vh;
      }

      .tc-now-row {
        display: grid;
        grid-template-columns: max-content 1fr;
        column-gap: 1.4vw;
        align-items: baseline;
      }

      .tc-now-label {
        color: #aab0c6;
        font-weight: 800;
        letter-spacing: 0.18em;
        white-space: nowrap;
      }

      .tc-now-value {
        color: #dce2f0;
        font-weight: 500;
        line-height: 1.05;
        white-space: nowrap;
      }

      #tc-task {
        color: #ffffff;
        font-weight: 900;
        line-height: 1.08;
        word-break: break-word;
        margin: 0.2vh 0 0.2vh 0;
      }

      #tc-over-row .tc-now-label,
      #tc-over-row .tc-now-value {
        color: #ffffff;
        font-weight: 900;
      }

      .tc-side-card {
        padding: 2.1vh 1.8vw 1.8vh 1.8vw;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .tc-card-title {
        color: #9198b1;
        font-weight: 800;
        letter-spacing: 0.18em;
        line-height: 1;
        margin-bottom: 1.3vh;
        white-space: nowrap;
      }

      .tc-prev-task {
        color: #ffffff;
        font-weight: 900;
        line-height: 1.1;
        margin-bottom: 1.2vh;
        word-break: break-word;
      }

      .tc-prev-grid {
        display: grid;
        row-gap: 0.9vh;
      }

      .tc-prev-row {
        display: grid;
        grid-template-columns: max-content 1fr;
        column-gap: 1.2vw;
        align-items: baseline;
      }

      .tc-prev-label {
        color: #9198b1;
        font-weight: 800;
        letter-spacing: 0.18em;
        white-space: nowrap;
      }

      .tc-prev-value {
        color: #dce2f0;
        font-weight: 500;
        white-space: nowrap;
      }

      .tc-next-list {
        display: grid;
        gap: 1.05vh;
      }

      .tc-next-row {
        display: grid;
        grid-template-columns: max-content 1fr;
        column-gap: 1.2vw;
        align-items: baseline;
        min-width: 0;
      }

      .tc-next-time {
        color: #dce2f0;
        font-weight: 500;
        white-space: nowrap;
      }

      .tc-next-task {
        color: #ffffff;
        font-weight: 700;
        min-width: 0;
        word-break: break-word;
      }

      #tc-version {
        position: absolute;
        right: 1.2vw;
        bottom: 0.7vh;
        color: rgba(170,176,198,0.7);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.06em;
        pointer-events: none;
      }

      @media (orientation: landscape) {
        #tc-brand {
          font-size: clamp(18px, 2.2vw, 28px);
        }

        #tc-clock {
          font-size: clamp(72px, 9vw, 112px);
        }

        #tc-leave {
          font-size: clamp(16px, 2.2vw, 26px);
        }

        #tc-body {
          grid-template-columns: minmax(0, 1.8fr) minmax(290px, 0.95fr);
          grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
          grid-template-areas:
            "now previous"
            "now next";
          align-items: stretch;
        }

        #tc-now-card { grid-area: now; }
        #tc-prev-card { grid-area: previous; }
        #tc-next-card { grid-area: next; }

        .tc-now-badge {
          font-size: clamp(22px, 2.7vw, 38px);
        }

        .tc-now-label {
          font-size: clamp(18px, 1.75vw, 28px);
        }

        .tc-now-value {
          font-size: clamp(34px, 3.8vw, 56px);
        }

        #tc-task {
          font-size: clamp(54px, 5vw, 80px);
        }

        .tc-card-title {
          font-size: clamp(20px, 1.85vw, 30px);
        }

        .tc-prev-task {
          font-size: clamp(34px, 2.7vw, 46px);
        }

        .tc-prev-label {
          font-size: clamp(18px, 1.45vw, 24px);
        }

        .tc-prev-value {
          font-size: clamp(24px, 2.15vw, 34px);
        }

        .tc-next-time,
        .tc-next-task {
          font-size: clamp(28px, 2.3vw, 40px);
        }
      }

      @media (orientation: portrait) {
        #tc-now-overlay .tc-shell {
          padding: 1.6vh 2.5vw 2vh 2.5vw;
          gap: 1.5vh;
        }

        #tc-brand {
          font-size: clamp(18px, 5vw, 26px);
        }

        #tc-clock {
          font-size: clamp(66px, 14vw, 96px);
        }

        #tc-leave {
          font-size: clamp(15px, 4.2vw, 22px);
        }

        .tc-header {
          grid-template-columns: 1fr auto;
          grid-template-areas:
            "brand clock"
            "leave leave";
        }

        #tc-brand { grid-area: brand; }
        #tc-clock { grid-area: clock; }
        #tc-leave { grid-area: leave; }

        #tc-body {
          grid-template-columns: 1fr;
          grid-template-areas:
            "now"
            "next"
            "previous";
          align-content: start;
        }

        #tc-now-card { grid-area: now; }
        #tc-next-card { grid-area: next; }
        #tc-prev-card { grid-area: previous; }

        #tc-now-card {
          padding: 2.6vh 4vw 2.8vh 4vw;
        }

        .tc-side-card {
          padding: 1.9vh 3.3vw 1.8vh 3.3vw;
        }

        .tc-now-badge {
          font-size: clamp(20px, 5vw, 30px);
        }

        .tc-now-stack {
          margin-top: 1.9vh;
          gap: 1.05vh;
        }

        .tc-now-row {
          grid-template-columns: max-content 1fr;
          column-gap: 3vw;
        }

        .tc-now-label {
          font-size: clamp(15px, 4vw, 20px);
        }

        .tc-now-value {
          font-size: clamp(34px, 8.1vw, 48px);
        }

        #tc-task {
          font-size: clamp(40px, 10vw, 60px);
        }

        .tc-card-title {
          font-size: clamp(18px, 4.7vw, 24px);
        }

        .tc-prev-task {
          font-size: clamp(26px, 6.8vw, 36px);
        }

        .tc-prev-label {
          font-size: clamp(14px, 3.7vw, 18px);
        }

        .tc-prev-value {
          font-size: clamp(20px, 5.3vw, 30px);
        }

        .tc-next-time,
        .tc-next-task {
          font-size: clamp(22px, 5.7vw, 32px);
        }
      }
    `;
    document.head.appendChild(style);
    app.style = style;
  }

  function injectRoot() {
    const root = document.createElement("div");
    root.id = "tc-now-overlay";
    document.body.appendChild(root);
    app.root = root;
  }

  function runScan() {
    app.scan = scanPage();
  }

  function render() {
    if (!app.root) return;

    const state = buildViewState(app.scan);

    app.root.innerHTML = `
      <div class="tc-shell">
        <div class="tc-header">
          <div id="tc-brand">TaskChute NOW</div>

          <div id="tc-leave">
            <div class="tc-leave-row">
              <span class="tc-jp-label">退勤</span>
              <span class="tc-leave-value">${esc(state.leaveTime)}</span>
            </div>
            <div class="tc-leave-row">
              <span class="tc-jp-label">超過</span>
              <span class="tc-leave-value">${esc(state.leaveOver)}</span>
            </div>
          </div>

          <div id="tc-clock">${esc(state.clock)}</div>
        </div>

        <div id="tc-body">
          <section id="tc-now-card" class="tc-card">
            <div class="tc-now-badge">NOW</div>

            <div class="tc-now-stack">
              <div class="tc-now-row">
                <div class="tc-now-label">START</div>
                <div class="tc-now-value">${esc(state.current.start)}</div>
              </div>

              <div id="tc-task">${esc(state.current.name)}</div>

              <div class="tc-now-row">
                <div class="tc-now-label">PLANNED END</div>
                <div class="tc-now-value">${esc(state.current.plannedEnd)}</div>
              </div>

              <div class="tc-now-row">
                <div class="tc-now-label">ELAPSED</div>
                <div class="tc-now-value">${esc(state.current.elapsed)}</div>
              </div>

              <div class="tc-now-row">
                <div class="tc-now-label">PLANNED</div>
                <div class="tc-now-value">${esc(state.current.planned)}</div>
              </div>

              <div class="tc-now-row" id="tc-over-row">
                <div class="tc-now-label">OVER</div>
                <div class="tc-now-value">${esc(state.current.over)}</div>
              </div>
            </div>
          </section>

          <section id="tc-next-card" class="tc-card tc-dark-card tc-side-card">
            <div class="tc-card-title">NEXT</div>
            <div class="tc-next-list">
              ${state.next.map(item => `
                <div class="tc-next-row">
                  <div class="tc-next-time">${esc(item.time)}</div>
                  <div class="tc-next-task">${esc(item.name)}</div>
                </div>
              `).join("")}
            </div>
          </section>

          <section id="tc-prev-card" class="tc-card tc-dark-card tc-side-card">
            <div class="tc-card-title">PREVIOUS</div>
            <div class="tc-prev-task">${esc(state.previous.name)}</div>

            <div class="tc-prev-grid">
              <div class="tc-prev-row">
                <div class="tc-prev-label">START</div>
                <div class="tc-prev-value">${esc(state.previous.start)}</div>
              </div>

              <div class="tc-prev-row">
                <div class="tc-prev-label">FINISH</div>
                <div class="tc-prev-value">${esc(state.previous.finish)}</div>
              </div>

              <div class="tc-prev-row">
                <div class="tc-prev-label">ELAPSED</div>
                <div class="tc-prev-value">${esc(state.previous.elapsed)}</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div id="tc-version">${VERSION}</div>
    `;
  }

  function buildViewState(scan) {
    const now = new Date();
    const clock = formatClock(now);

    const current = scan?.current || null;
    const previous = scan?.previous || null;
    const next = scan?.next || [];

    const currentStart = current?.start && isHM(current.start) ? current.start : "--:--";
    const plannedDurSec = parseDurationToSeconds(current?.plannedDur);
    const plannedStr = plannedDurSec != null ? formatDuration(plannedDurSec) : "--:--:--";

    const currentStartDate = isHM(currentStart) ? timeToday(currentStart, now) : null;
    const plannedEndDate =
      currentStartDate && plannedDurSec != null
        ? new Date(currentStartDate.getTime() + plannedDurSec * 1000)
        : null;

    const elapsedSec =
      currentStartDate ? Math.max(0, Math.floor((now.getTime() - currentStartDate.getTime()) / 1000)) : null;

    const overSec =
      elapsedSec != null && plannedDurSec != null ? Math.max(0, elapsedSec - plannedDurSec) : null;

    const leaveTime = scan?.leaveTime && isHM(scan.leaveTime) ? scan.leaveTime : "--:--";
    const leaveDate = isHM(leaveTime) ? timeToday(leaveTime, now) : null;
    const leaveOverSec =
      leaveDate ? Math.max(0, Math.floor((now.getTime() - leaveDate.getTime()) / 1000)) : null;

    const prevStart = previous?.start && isHM(previous.start) ? previous.start : "--:--";
    const prevFinish = previous?.finish && isHM(previous.finish) ? previous.finish : "--:--";

    let prevElapsed = "--:--:--";
    if (isHM(prevStart) && isHM(prevFinish)) {
      const s = timeToday(prevStart, now);
      const f = timeToday(prevFinish, now);
      let diff = Math.floor((f.getTime() - s.getTime()) / 1000);
      if (diff < 0) diff += 24 * 60 * 60;
      prevElapsed = formatDuration(diff);
    } else if (previous?.elapsed) {
      prevElapsed = previous.elapsed;
    }

    return {
      clock,
      leaveTime,
      leaveOver: leaveOverSec != null ? formatDuration(leaveOverSec) : "--:--:--",

      current: {
        name: current?.name || "タスクを取得できません",
        start: currentStart,
        plannedEnd: plannedEndDate ? formatClock(plannedEndDate) : "--:--",
        elapsed: elapsedSec != null ? formatDuration(elapsedSec) : "--:--:--",
        planned: plannedStr,
        over: overSec != null ? formatDuration(overSec) : "--:--:--"
      },

      previous: {
        name: previous?.name || "—",
        start: prevStart,
        finish: prevFinish,
        elapsed: prevElapsed
      },

      next: next.length
        ? next.map(item => ({
            time: item?.scheduled || "--:--",
            name: item?.name || "—"
          }))
        : [
            { time: "--:--", name: "—" },
            { time: "--:--", name: "—" },
            { time: "--:--", name: "—" }
          ]
    };
  }

  function scanPage() {
    const rows = scanTaskRows();
    const current = pickCurrentRow(rows);
    const sorted = rows.slice().sort((a, b) => a.y - b.y);

    let previous = null;
    let next = [];

    if (current) {
      const idx = sorted.findIndex(r => r.key === current.key);
      if (idx > 0) previous = sorted[idx - 1];
      if (idx >= 0) next = sorted.slice(idx + 1).slice(0, 3);
    }

    const leaveRow =
      sorted.find(r => r.name === "退勤") ||
      null;

    return {
      rows: sorted,
      current,
      previous,
      next,
      leaveTime: leaveRow?.scheduled || leaveRow?.start || ""
    };
  }

  function scanTaskRows() {
    const nodes = [
      ...document.querySelectorAll('div[class*="MuiBox-root"], div[class*="MuiAutocomplete-root"], span, p')
    ];

    const items = [];
    const seen = new Set();

    for (const el of nodes) {
      if (!isVisible(el)) continue;
      if (app.root && app.root.contains(el)) continue;

      const text = cleanText(el.innerText || el.textContent || "");
      if (!isPossibleTaskLabel(text)) continue;

      const row = findRowAncestor(el, text);
      if (!row) continue;

      const rowText = cleanText(row.innerText || "");
      if (!hasRowStructure(rowText)) continue;

      const rect = row.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) continue;

      const parsed = parseRow(row, text);
      if (!parsed) continue;

      const key = `${parsed.name}__${Math.round(parsed.y)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...parsed, key });
    }

    return items.sort((a, b) => a.y - b.y);
  }

  function pickCurrentRow(rows) {
    if (!rows.length) return null;

    const currentLike = rows.filter(r => r.isCurrent);
    if (currentLike.length) {
      currentLike.sort((a, b) => a.y - b.y);
      return currentLike[0];
    }

    const fallback = rows.find(r => r.start && !r.finish && r.plannedDur);
    if (fallback) return fallback;

    return null;
  }

  function parseRow(row, name) {
    const rect = row.getBoundingClientRect();
    const rowText = cleanText(row.innerText || "");

    const buttonTexts = [
      ...row.querySelectorAll("button")
    ]
      .filter(isVisible)
      .map(el => cleanText(el.innerText || ""))
      .filter(Boolean);

    const pTexts = [
      ...row.querySelectorAll("p")
    ]
      .filter(isVisible)
      .map(el => cleanText(el.innerText || ""))
      .filter(Boolean);

    const hmButtons = buttonTexts.filter(isHM);
    const blankButtons = buttonTexts.filter(isBlankTime);
    const durationButtons = buttonTexts.filter(txt => isDurationToken(txt) && !isHM(txt));

    const start = hmButtons[0] || "";
    const finish = hmButtons[1] || "";

    const plannedDur = durationButtons[0] || "";
    const scheduled = extractScheduledTime(rowText, start);

    const isCurrent =
      Boolean(start) &&
      Boolean(plannedDur) &&
      (blankButtons.length > 0 || !finish);

    const elapsedFromText = pTexts.find(isDurationToken) || "";

    return {
      name,
      y: rect.top,
      rowText,
      start,
      finish,
      plannedDur,
      scheduled,
      elapsed: normalizeDisplayDuration(elapsedFromText),
      isCurrent
    };
  }

  function extractScheduledTime(rowText, start) {
    const times = extractHMs(rowText);
    if (!times.length) return "";

    const filtered = times.filter(t => t !== start);
    if (filtered.length) return filtered[filtered.length - 1];
    return times[times.length - 1] || "";
  }

  function findRowAncestor(el, labelText) {
    let node = el;
    let best = null;

    for (let i = 0; i < 7 && node && node !== document.body; i++) {
      const rect = node.getBoundingClientRect();
      const text = cleanText(node.innerText || "");

      if (
        rect.width > 180 &&
        rect.height >= 20 &&
        rect.height <= 120 &&
        text.includes(labelText) &&
        hasRowStructure(text)
      ) {
        best = node;
      }

      node = node.parentElement;
    }

    return best;
  }

  function hasRowStructure(text) {
    if (!text) return false;
    if (/(プロジェクト|モード|Meeting|会議|Meta|レビュー)/.test(text)) return true;
    if (/--:--/.test(text)) return true;
    return extractHMs(text).length >= 2;
  }

  function isPossibleTaskLabel(text) {
    if (!text) return false;
    if (text.length > 80) return false;
    if (/\n/.test(text)) return false;

    const ng = [
      "NOW",
      "START",
      "FINISH",
      "ELAPSED",
      "PLANNED",
      "PLANNED END",
      "OVER",
      "NEXT",
      "PREVIOUS",
      "TaskChute NOW",
      "TaskChute Cloud",
      "TaskChute Cloud 2",
      "スタートページ",
      "検索/Webサイト名入力",
      "閉じる",
      "ホーム画面に追加"
    ];

    if (ng.includes(text)) return false;
    if (isHM(text)) return false;
    if (isBlankTime(text)) return false;
    if (isDurationToken(text)) return false;
    if (/^(プロジェクト|モード|Meeting|会議|レビュー|Meta)$/.test(text)) return false;
    if (/^\d+$/.test(text)) return false;

    return true;
  }

  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none") return false;
    if (style.visibility === "hidden") return false;
    if (parseFloat(style.opacity || "1") === 0) return false;

    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    if (rect.bottom < 0 || rect.top > window.innerHeight) return false;

    return true;
  }

  function cleanText(str) {
    return String(str || "")
      .replace(/\s+/g, " ")
      .replace(/　/g, " ")
      .trim();
  }

  function extractHMs(text) {
    const matches = String(text || "").match(/\b\d{1,2}:\d{2}\b/g);
    return matches ? matches : [];
  }

  function isHM(text) {
    return HM_RE.test(String(text || ""));
  }

  function isBlankTime(text) {
    return BLANK_HMS_RE.test(String(text || ""));
  }

  function isDurationToken(text) {
    return DURATION_RE.test(String(text || ""));
  }

  function parseDurationToSeconds(text) {
    if (!text) return null;
    const s = String(text).trim();
    if (!DURATION_RE.test(s)) return null;

    const parts = s.split(":").map(Number);
    if (parts.some(n => Number.isNaN(n))) return null;

    if (parts.length === 2) {
      const [hh, mm] = parts;
      return hh * 3600 + mm * 60;
    }

    if (parts.length === 3) {
      const [hh, mm, ss] = parts;
      return hh * 3600 + mm * 60 + ss;
    }

    return null;
  }

  function normalizeDisplayDuration(text) {
    const sec = parseDurationToSeconds(text);
    if (sec == null) return "--:--:--";
    return formatDuration(sec);
  }

  function formatClock(date) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  function timeToday(hm, base = new Date()) {
    const [h, m] = hm.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function formatDuration(totalSec) {
    const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
