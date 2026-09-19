(() => {
  const ID = 'tc-now-widget';

  const old = document.getElementById(ID);
  if (old) {
    old.remove();
    if (window.tcNowTimer) clearInterval(window.tcNowTimer);
    return;
  }

  const root = document.createElement('div');
  root.id = ID;

  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    background: '#111',
    color: '#fff',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
    textAlign: 'center',
    padding: '28px'
  });

  root.innerHTML = `
    <div style="
      font-size:18px;
      font-weight:700;
      letter-spacing:4px;
      opacity:.55;
      margin-bottom:24px;
    ">NOW</div>

    <div id="tc-now-task" style="
      font-size:30px;
      font-weight:700;
      line-height:1.35;
      width:100%;
      margin-bottom:26px;
      word-break:break-word;
    "></div>

    <div id="tc-now-time" style="
      font-size:56px;
      font-weight:700;
      font-variant-numeric:tabular-nums;
      margin-bottom:52px;
    ">--:--:--</div>

    <div style="
      width:290px;
      font-size:25px;
      font-weight:600;
      line-height:1.75;
      font-variant-numeric:tabular-nums;
      text-align:left;
    ">
      <div style="display:grid;grid-template-columns:75px 1fr;">
        <span>退勤</span>
        <span id="tc-now-leave">--:--</span>
      </div>

      <div style="display:grid;grid-template-columns:75px 1fr;">
        <span id="tc-now-count-label">あと</span>
        <span id="tc-now-count">--:--</span>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  function visible(el) {
    if (!el) return false;
    if (el.closest('#' + ID)) return false;

    const r = el.getBoundingClientRect();

    return (
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.top < innerHeight
    );
  }

  function getElapsedElement() {
    const candidates = [...document.querySelectorAll('p,div,span')]
      .filter(el =>
        visible(el) &&
        /^\d{2}:\d{2}:\d{2}$/.test((el.textContent || '').trim())
      );

    if (!candidates.length) return null;

    return candidates.sort(
      (a, b) =>
        b.getBoundingClientRect().top -
        a.getBoundingClientRect().top
    )[0];
  }

  function getCurrentTask(elapsedEl) {
    if (!elapsedEl) return null;

    let parent = elapsedEl;

    for (let i = 0; i < 7 && parent; i++, parent = parent.parentElement) {
      const r = parent.getBoundingClientRect();

      if (r.top > innerHeight * 0.6 && r.height > 70) {
        const candidates = [...parent.querySelectorAll('*')]
          .filter(el => {
            if (!visible(el)) return false;

            const t = (el.textContent || '').trim();

            if (!t || t.length > 80) return false;
            if (/^-?\d{2}:\d{2}:\d{2}$/.test(t)) return false;
            if (/^[\d\s:./-]+$/.test(t)) return false;
            if (el.children.length > 0) return false;

            return true;
          })
          .map(el => (el.textContent || '').trim())
          .filter(t =>
            t.length >= 2 &&
            t !== 'Main' &&
            t !== 'NOW'
          );

        if (candidates.length) {
          candidates.sort((a, b) => b.length - a.length);
          return candidates[0];
        }
      }
    }

    return null;
  }

  function getLeaveTime() {
    const leaveEls = [...document.querySelectorAll('body *')]
      .filter(el =>
        !el.closest('#' + ID) &&
        (el.textContent || '').trim() === '退勤'
      );

    for (const el of leaveEls) {
      let parent = el;

      for (let i = 0; i < 7 && parent; i++, parent = parent.parentElement) {
        const times = [...parent.querySelectorAll('*')]
          .map(x => (x.textContent || '').trim())
          .filter(t => /^\d{1,2}:\d{2}$/.test(t));

        if (times.length) {
          return [...new Set(times)].pop();
        }
      }
    }

    return null;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function update() {
    const elapsedEl = getElapsedElement();

    document.getElementById('tc-now-time').textContent =
      elapsedEl
        ? elapsedEl.textContent.trim()
        : '--:--:--';

    document.getElementById('tc-now-task').textContent =
      getCurrentTask(elapsedEl) || 'タスクを取得できません';

    const leaveTime = getLeaveTime();
    const leaveEl = document.getElementById('tc-now-leave');
    const labelEl = document.getElementById('tc-now-count-label');
    const countEl = document.getElementById('tc-now-count');

    if (!leaveTime) {
      leaveEl.textContent = '--:--';
      labelEl.textContent = 'あと';
      countEl.textContent = '--:--';
      return;
    }

    leaveEl.textContent = leaveTime;

    const now = new Date();
    const [h, m] = leaveTime.split(':').map(Number);

    const leave = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      h,
      m,
      0
    );

    let diff = Math.floor((leave - now) / 1000);

    if (diff >= 0) {
      const hh = Math.floor(diff / 3600);
      const mm = Math.floor((diff % 3600) / 60);

      labelEl.textContent = 'あと';
      countEl.textContent = `${pad(hh)}:${pad(mm)}`;
    } else {
      diff = Math.abs(diff);

      const hh = Math.floor(diff / 3600);
      const mm = Math.floor((diff % 3600) / 60);
      const ss = diff % 60;

      labelEl.textContent = '超過';
      countEl.textContent =
        `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
    }
  }

  update();
  window.tcNowTimer = setInterval(update, 1000);
})();
