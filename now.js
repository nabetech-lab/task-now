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

  root.innerHTML = `
    <style>
      #${ID}, #${ID} * { box-sizing: border-box; }
      #${ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: #05070c;
        color: #f3f4f6;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
        padding: 22px 20px 26px;
        display: flex;
        flex-direction: column;
      }

      #${ID} .tc-top {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 14px;
        align-items: start;
        margin-bottom: 18px;
      }

      #${ID} .tc-brand {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: .24em;
        line-height: 1.35;
        color: rgba(255,255,255,.72);
        white-space: pre-line;
      }

      #${ID} .tc-meta {
        margin-top: 8px;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
        color: rgba(255,255,255,.92);
      }

      #${ID} .tc-clock {
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -.02em;
        font-variant-numeric: tabular-nums;
        color: #fff;
        text-align: right;
        min-width: 92px;
      }

      #${ID} .tc-main {
        display: grid;
        grid-template-columns: 1fr;
        gap: 18px;
        min-height: 0;
        flex: 1;
      }

      #${ID} .tc-card {
        background: linear-gradient(180deg, #171d28 0%, #111722 100%);
        border-radius: 26px;
        padding: 22px;
        position: relative;
        overflow: hidden;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
      }

      #${ID} .tc-now-card {
        min-height: 56vh;
        display: flex;
        flex-direction: column;
      }

      #${ID} .tc-now-badge {
        display: inline-block;
        align-self: flex-start;
        background: #f2f4f7;
        color: #111827;
        padding: 10px 20px;
        border-radius: 14px;
        font-size: 18px;
        font-weight: 800;
        letter-spacing: .12em;
        margin-bottom: 28px;
      }

      #${ID} .tc-current-time {
        font-size: 28px;
        font-weight: 500;
        margin-bottom: 22px;
        color: rgba(255,255,255,.88);
        font-variant-numeric: tabular-nums;
      }

      #${ID} .tc-task {
        font-size: 32px;
        line-height: 1.22;
        font-weight: 800;
        word-break: break-word;
        letter-spacing: -.02em;
        color: #fff;
      }

      #${ID} .tc-elapsed-wrap {
        margin-top: auto;
      }

      #${ID} .tc-label {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: .22em;
        color: rgba(255,255,255,.44);
        margin-bottom: 8px;
      }

      #${ID} .tc-elapsed {
        font-size: 42px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        letter-spacing: -.03em;
      }

      #${ID} .tc-side {
        display: none;
        grid-template-rows: 170px 1fr;
        gap: 18px;
      }

      #${ID} .tc-side-card {
        background: linear-gradient(180deg, #0d1119 0%, #0b1018 100%);
        border-radius: 26px;
        padding: 22px;
        color: rgba(255,255,255,.88);
      }

      #${ID} .tc-side-title {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: .18em;
        color: rgba(255,255,255,.28);
        margin-bottom: 24px;
      }

      #${ID} .tc-side-empty {
        font-size: 20px;
        font-weight: 700;
        color: rgba(255,255,255,.34);
      }

      #${ID} .tc-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 14px;
        font-size: 13px;
        color: rgba(255,255,255,.42);
      }

      #${ID} .tc-quit {
        text-align: right;
      }

      #${ID} .tc-left-rail {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 10px;
        background: linear-gradient(180deg, rgba(255,255,255,.92) 0%, rgba(255,255,255,.35) 100%);
        border-radius: 20px;
      }

      @media (min-width: 850px) {
        #${ID} {
          padding: 26px 36px 26px;
        }

        #${ID} .tc-top {
          grid-template-columns: 240px 1fr auto;
          gap: 22px;
          margin-bottom: 22px;
        }

        #${ID} .tc-main {
          grid-template-columns: 1.18fr .82fr;
          gap: 22px;
        }

        #${ID} .tc-side {
          display: grid;
        }

        #${ID} .tc-now-card {
          min-height: 0;
        }

        #${ID} .tc-task {
          font-size: 48px;
        }

        #${ID} .tc-elapsed {
          font-size: 56px;
        }

        #${ID} .tc-clock {
          font-size: 56px;
          min-width: 150px;
        }

        #${ID} .tc-current-time {
          font-size: 44px;
        }

        #${ID} .tc-brand {
          font-size: 18px;
        }

        #${ID} .tc-meta {
          font-size: 22px;
          margin-top: 2px;
        }
      }
    </style>

    <div class="tc-top">
      <div class="tc-brand">TASKCHUTE ·
TODAY</div>

      <div class="tc-meta">
        <div id="tc-leave-line">退勤 --:--</div>
        <div id="tc-count-line">あと --:--</div>
      </div>

      <div class="tc-clock" id="tc-clock">--:--</div>
    </div>

    <div class="tc-main">
      <div class="tc-card tc-now-card">
        <div class="tc-left-rail"></div>
        <div class="tc-now-badge">NOW</div>
        <div class="tc-current-time" id="tc-current-time">--:--</div>
        <div class="tc-task" id="tc-task">タスクを取得できません</div>

        <div class="tc-elapsed-wrap">
          <div class="tc-label">ELAPSED</div>
          <div class="tc-elapsed" id="tc-elapsed">--:--:--</div>
        </div>
      </div>

      <div class="tc-side">
        <div class="tc-side-card">
          <div class="tc-side-title">PREVIOUS</div>
          <div class="tc-side-empty">未実装</div>
        </div>

        <div class="tc-side-card">
          <div class="tc-side-title">NEXT</div>
          <div class="tc-side-empty">未実装</div>
        </div>
      </div>
    </div>

    <div class="tc-foot">
      <div>Focus Display</div>
      <div class="tc-quit">再実行で閉じる</div>
    </div>
  `;

  document.body.appendChild(root);

  function visible(el) {
    if (!el) return false;
    if (el.closest('#' + ID)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  }

  function getElapsedElement() {
    const candidates = [...document.querySelectorAll('p,div,span')]
      .filter(el =>
        visible(el) &&
        /^\d{2}:\d{2}:\d{2}$/.test((el.textContent || '').trim())
      );

    if (!candidates.length) return null;

    return candidates.sort(
      (a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top
    )[0];
  }

  function getCurrentTask(elapsedEl) {
    if (!elapsedEl) return null;

    let parent = elapsedEl;

    for (let i = 0; i < 7 && parent; i++, parent = parent.parentElement) {
      const r = parent.getBoundingClientRect();

      if (r.top > innerHeight * 0.55 && r.height > 70) {
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
          .filter(t => t && t !== 'Main' && t !== 'NOW');

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

  function hhmm(d) {
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function update() {
    const now = new Date();
    const elapsedEl = getElapsedElement();
    const currentTask = getCurrentTask(elapsedEl);
    const leaveTime = getLeaveTime();

    document.getElementById('tc-clock').textContent = hhmm(now);
    document.getElementById('tc-current-time').textContent = hhmm(now);
    document.getElementById('tc-task').textContent = currentTask || 'タスクを取得できません';
    document.getElementById('tc-elapsed').textContent =
      elapsedEl ? elapsedEl.textContent.trim() : '--:--:--';

    const leaveLine = document.getElementById('tc-leave-line');
    const countLine = document.getElementById('tc-count-line');

    if (!leaveTime) {
      leaveLine.textContent = '退勤 --:--';
      countLine.textContent = 'あと --:--';
      return;
    }

    leaveLine.textContent = '退勤 ' + leaveTime;

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
      countLine.textContent = 'あと ' + pad(hh) + ':' + pad(mm);
    } else {
      diff = Math.abs(diff);
      const hh = Math.floor(diff / 3600);
      const mm = Math.floor((diff % 3600) / 60);
      const ss = diff % 60;
      countLine.textContent = '超過 ' + pad(hh) + ':' + pad(mm) + ':' + pad(ss);
    }
  }

  update();
  window.tcNowTimer = setInterval(update, 1000);
})();
})();
