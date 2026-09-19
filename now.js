(() => {
  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  /* =========================================================
     再実行時：既存NOWを破棄して即再生成
  ========================================================= */

  const oldRoot = document.getElementById(ROOT_ID);
  if (oldRoot) oldRoot.remove();

  const oldStyle = document.getElementById(STYLE_ID);
  if (oldStyle) oldStyle.remove();

  if (window.tcNowTimer) {
    clearInterval(window.tcNowTimer);
    window.tcNowTimer = null;
  }


  /* =========================================================
     viewport / 背景
  ========================================================= */

  let viewport =
    document.querySelector('meta[name="viewport"]');

  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }

  let vp =
    viewport.getAttribute('content') ||
    'width=device-width, initial-scale=1';

  if (!vp.includes('viewport-fit=cover')) {
    vp += ', viewport-fit=cover';
  }

  viewport.setAttribute('content', vp);

  document.documentElement.style.background = '#07090d';
  document.body.style.background = '#07090d';


  /* =========================================================
     CSS
  ========================================================= */

  const style = document.createElement('style');
  style.id = STYLE_ID;

  style.textContent = `
    html,
    body {
      background: #07090d !important;
    }

    #${ROOT_ID},
    #${ROOT_ID} * {
      box-sizing: border-box;
    }

    #${ROOT_ID} {
      --bg: #07090d;
      --panel: #1a2029;
      --panel2: #0d1016;
      --text: #f7f7f8;
      --muted: #9a9da7;
      --dim: #4f535d;

      position: fixed;
      inset: 0;

      width: 100vw;
      height: 100dvh;

      z-index: 2147483647;

      background: var(--bg);
      color: var(--text);

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Helvetica Neue",
        "Hiragino Sans",
        "Yu Gothic",
        sans-serif;

      overflow: hidden;

      padding:
        max(12px, env(safe-area-inset-top))
        max(16px, env(safe-area-inset-right))
        max(12px, env(safe-area-inset-bottom))
        max(16px, env(safe-area-inset-left));
    }

    #tc-layout {
      width: 100%;
      height: 100%;

      display: grid;
      grid-template-rows:
        auto
        minmax(0, 1fr);

      gap: clamp(14px, 2.4vh, 28px);
    }

    /* ================= HEADER ================= */

    #tc-header {
      display: grid;

      grid-template-columns:
        minmax(150px, .85fr)
        minmax(220px, 1fr)
        minmax(130px, .7fr);

      gap: clamp(14px, 3vw, 38px);
      align-items: center;

      min-width: 0;
    }

    #tc-brand {
      color: var(--muted);

      font-size: clamp(16px, 2.3vw, 30px);
      font-weight: 800;

      letter-spacing: .22em;
      line-height: 1.4;

      white-space: nowrap;
    }

    #tc-leave {
      font-size: clamp(19px, 2.8vw, 32px);
      font-weight: 800;

      line-height: 1.35;

      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .tc-leave-row {
      display: grid;

      grid-template-columns:
        max-content
        max-content;

      gap: .42em;
    }

    #tc-clock {
      justify-self: end;

      font-size: clamp(40px, 7vw, 82px);
      font-weight: 800;

      line-height: .95;
      letter-spacing: -.04em;

      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    /* ================= MAIN ================= */

    #tc-main {
      min-width: 0;
      min-height: 0;

      display: grid;

      grid-template-columns:
        minmax(0, 1.6fr)
        minmax(220px, .9fr);

      gap: clamp(14px, 2.6vw, 30px);
    }

    /* ================= NOW ================= */

    #tc-now {
      position: relative;

      min-width: 0;
      min-height: 0;

      overflow: hidden;

      background: var(--panel);

      border-radius:
        clamp(22px, 4vw, 52px);

      padding:
        clamp(22px, 5vh, 50px)
        clamp(30px, 5vw, 68px);

      display: flex;
      flex-direction: column;

      justify-content: center;
    }

    #tc-now::before {
      content: "";

      position: absolute;

      top: 0;
      bottom: 0;
      left: 0;

      width:
        clamp(8px, 1vw, 16px);

      background: #fff;
    }

    #tc-now-badge {
      align-self: flex-start;

      background: #fff;
      color: #101116;

      border-radius:
        clamp(13px, 2vw, 22px);

      padding:
        clamp(9px, 1.8vh, 16px)
        clamp(18px, 2.7vw, 31px);

      font-size:
        clamp(16px, 2.2vw, 28px);

      font-weight: 900;
      letter-spacing: .18em;

      margin-bottom:
        clamp(18px, 5vh, 54px);
    }

    #tc-start {
      color: #c9ccd3;

      font-size:
        clamp(23px, 3.7vw, 48px);

      font-weight: 500;

      font-variant-numeric: tabular-nums;

      margin-bottom:
        clamp(10px, 2.4vh, 20px);
    }

    #tc-task {
      font-size:
        clamp(32px, 5.5vw, 72px);

      font-weight: 900;

      line-height: 1.08;

      overflow-wrap: anywhere;
    }

    #tc-elapsed {
      margin-top:
        clamp(10px, 2.6vh, 26px);

      color: #aeb2bb;

      font-size:
        clamp(17px, 2.6vw, 32px);

      font-weight: 700;

      font-variant-numeric: tabular-nums;
    }

    /* ================= SIDE ================= */

    #tc-side {
      min-width: 0;
      min-height: 0;

      display: grid;

      grid-template-rows:
        minmax(0, 1fr)
        minmax(0, 1fr);

      gap:
        clamp(12px, 2.1vh, 22px);
    }

    .tc-card {
      min-width: 0;
      min-height: 0;

      overflow: hidden;

      background: var(--panel2);

      border-radius:
        clamp(18px, 3vw, 34px);

      padding:
        clamp(18px, 3.2vh, 32px)
        clamp(20px, 2.7vw, 35px);

      display: flex;
      flex-direction: column;

      justify-content: center;
    }

    .tc-card-label {
      color: var(--dim);

      font-size:
        clamp(13px, 1.8vw, 22px);

      font-weight: 900;

      letter-spacing: .18em;

      margin-bottom:
        clamp(10px, 2.6vh, 24px);
    }

    .tc-card-row {
      min-width: 0;

      display: grid;

      grid-template-columns:
        max-content
        minmax(0, 1fr);

      gap:
        clamp(12px, 2vw, 26px);

      align-items: baseline;
    }

    .tc-card-time {
      color: #6e737e;

      font-size:
        clamp(20px, 3.2vw, 40px);

      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .tc-card-task {
      min-width: 0;

      color: #6e737e;

      font-size:
        clamp(20px, 3.2vw, 40px);

      font-weight: 700;

      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* =============== SMALL LANDSCAPE =============== */

    @media
      (orientation: landscape)
      and (max-height: 500px) {

      #${ROOT_ID} {
        padding:
          max(5px, env(safe-area-inset-top))
          max(10px, env(safe-area-inset-right))
          max(5px, env(safe-area-inset-bottom))
          max(10px, env(safe-area-inset-left));
      }

      #tc-layout {
        grid-template-rows:
          18dvh
          minmax(0, 1fr);

        gap: 1.8dvh;
      }

      #tc-header {
        grid-template-columns:
          minmax(100px, .8fr)
          minmax(165px, 1fr)
          minmax(105px, .6fr);

        gap: 1.8vw;
      }

      #tc-brand {
        font-size:
          clamp(11px, 3.4dvh, 18px);

        line-height: 1.25;
      }

      #tc-leave {
        font-size:
          clamp(13px, 4.2dvh, 21px);

        line-height: 1.22;
      }

      #tc-clock {
        font-size:
          clamp(30px, 11.5dvh, 56px);
      }

      #tc-main {
        grid-template-columns:
          minmax(0, 1.62fr)
          minmax(165px, .9fr);

        gap: 1.6vw;
      }

      #tc-now {
        border-radius:
          clamp(14px, 5dvh, 27px);

        padding:
          clamp(8px, 2.3dvh, 16px)
          clamp(18px, 3.1vw, 32px);
      }

      #tc-now::before {
        width:
          clamp(6px, .8vw, 10px);
      }

      #tc-now-badge {
        border-radius:
          clamp(8px, 2.8dvh, 14px);

        padding:
          clamp(5px, 1.4dvh, 8px)
          clamp(12px, 1.5vw, 18px);

        font-size:
          clamp(11px, 3.5dvh, 17px);

        margin-bottom:
          clamp(6px, 2dvh, 11px);
      }

      #tc-start {
        font-size:
          clamp(17px, 5.3dvh, 27px);

        margin-bottom:
          clamp(3px, 1.3dvh, 7px);
      }

      #tc-task {
        font-size:
          clamp(24px, 7.8dvh, 40px);

        line-height: 1.02;
      }

      #tc-elapsed {
        margin-top:
          clamp(4px, 1.4dvh, 8px);

        font-size:
          clamp(12px, 3.6dvh, 18px);
      }

      #tc-side {
        gap: 1.8dvh;
      }

      .tc-card {
        border-radius:
          clamp(12px, 4.2dvh, 22px);

        padding:
          clamp(7px, 1.6dvh, 12px)
          clamp(12px, 1.5vw, 18px);
      }

      .tc-card-label {
        font-size:
          clamp(10px, 3dvh, 15px);

        margin-bottom:
          clamp(4px, 1.3dvh, 7px);
      }

      .tc-card-time,
      .tc-card-task {
        font-size:
          clamp(15px, 4.4dvh, 22px);
      }
    }

    /* ================= PORTRAIT ================= */

    @media (orientation: portrait) {

      #tc-header {
        grid-template-columns:
          1fr
          auto;

        grid-template-areas:
          "brand clock"
          "leave leave";

        gap: 10px;
      }

      #tc-brand {
        grid-area: brand;
      }

      #tc-clock {
        grid-area: clock;
      }

      #tc-leave {
        grid-area: leave;

        display: flex;

        gap: 22px;
      }

      #tc-main {
        grid-template-columns: 1fr;

        grid-template-rows:
          minmax(0, 1fr)
          auto;

        gap: 14px;
      }

      #tc-side {
        grid-template-columns:
          1fr 1fr;

        grid-template-rows: auto;

        gap: 10px;
      }

      .tc-card {
        padding: 15px;
      }

      .tc-card-row {
        grid-template-columns: 1fr;

        gap: 3px;
      }
    }

    @media
      (orientation: portrait)
      and (max-width: 430px) {

      #tc-brand {
        display: none;
      }

      #tc-header {
        grid-template-columns: 1fr;

        grid-template-areas:
          "clock"
          "leave";
      }

      #tc-clock {
        justify-self: center;
      }

      #tc-leave {
        justify-content: center;
      }

      #tc-side {
        display: none;
      }
    }
  `;

  document.head.appendChild(style);


  /* =========================================================
     HTML
  ========================================================= */

  const root = document.createElement('div');
  root.id = ROOT_ID;

  root.innerHTML = `
    <div id="tc-layout">

      <header id="tc-header">

        <div id="tc-brand">
          TASKCHUTE ·<br>
          TODAY
        </div>

        <div id="tc-leave">

          <div class="tc-leave-row">
            <span>退勤</span>
            <span id="tc-leave-time">--:--</span>
          </div>

          <div class="tc-leave-row">
            <span id="tc-leave-label">あと</span>
            <span id="tc-leave-count">--:--</span>
          </div>

        </div>

        <div id="tc-clock">
          --:--
        </div>

      </header>

      <main id="tc-main">

        <section id="tc-now">

          <div id="tc-now-badge">
            NOW
          </div>

          <div id="tc-start">
            --:--
          </div>

          <div id="tc-task">
            タスクを取得できません
          </div>

          <div id="tc-elapsed">
            --:--:--
          </div>

        </section>

        <aside id="tc-side">

          <section class="tc-card">

            <div class="tc-card-label">
              PREVIOUS
            </div>

            <div class="tc-card-row">

              <div
                id="tc-prev-time"
                class="tc-card-time">
                —
              </div>

              <div
                id="tc-prev-task"
                class="tc-card-task">
                —
              </div>

            </div>

          </section>

          <section class="tc-card">

            <div class="tc-card-label">
              NEXT
            </div>

            <div class="tc-card-row">

              <div
                id="tc-next-time"
                class="tc-card-time">
                —
              </div>

              <div
                id="tc-next-task"
                class="tc-card-task">
                —
              </div>

            </div>

          </section>

        </aside>

      </main>

    </div>
  `;

  document.body.appendChild(root);


  /* =========================================================
     UTIL
  ========================================================= */

  const $ =
    id => document.getElementById(id);

  const pad =
    n => String(n).padStart(2, '0');

  function inNow(el) {
    return !!el.closest('#' + ROOT_ID);
  }


  /* =========================================================
     現在タスク名
     Safariのタイトルを優先
  ========================================================= */

  function getCurrentTask() {

    const title =
      document.title || '';

    /*
      例:
      [30m] 晩ご飯 - TaskChute Cloud 2
    */

    let m =
      title.match(
        /^\[[^\]]+\]\s*(.+?)\s*-\s*TaskChute/i
      );

    if (m && m[1]) {
      return m[1].trim();
    }

    /*
      念のため
      晩ご飯 - TaskChute Cloud 2
    */

    m =
      title.match(
        /^(.+?)\s*-\s*TaskChute/i
      );

    if (m && m[1]) {
      return m[1].trim();
    }

    return null;
  }


  /* =========================================================
     経過時間
  ========================================================= */

  function getElapsed(taskName) {

    if (taskName) {

      const taskEls =
        [...document.querySelectorAll('body *')]
          .filter(el =>
            !inNow(el) &&
            (el.textContent || '').trim()
              === taskName
          );

      for (const taskEl of taskEls) {

        let parent = taskEl;

        for (
          let level = 0;
          level < 10 && parent;
          level++,
          parent = parent.parentElement
        ) {

          const times =
            [...parent.querySelectorAll('*')]
              .map(el =>
                (el.textContent || '')
                  .trim()
              )
              .filter(text =>
                /^\d{2}:\d{2}:\d{2}$/
                  .test(text)
              );

          if (times.length) {
            return [
              ...new Set(times)
            ][0];
          }
        }
      }
    }

    /*
      フォールバック：
      ページ内のHH:MM:SS
    */

    const allTimes =
      [...document.querySelectorAll('body *')]
        .filter(el =>
          !inNow(el)
        )
        .map(el =>
          (el.textContent || '')
            .trim()
        )
        .filter(text =>
          /^\d{2}:\d{2}:\d{2}$/
            .test(text)
        );

    return [
      ...new Set(allTimes)
    ][0] || null;
  }


  /* =========================================================
     退勤時刻
  ========================================================= */

  function getLeaveTime() {

    const leaveEls =
      [...document.querySelectorAll('body *')]
        .filter(el =>
          !inNow(el) &&
          (el.textContent || '')
            .trim() === '退勤'
        );

    for (const leaveEl of leaveEls) {

      let parent = leaveEl;

      for (
        let level = 0;
        level < 10 && parent;
        level++,
        parent = parent.parentElement
      ) {

        const times =
          [...parent.querySelectorAll('*')]
            .map(el =>
              (el.textContent || '')
                .trim()
            )
            .filter(text =>
              /^\d{1,2}:\d{2}$/
                .test(text)
            );

        if (times.length) {

          const unique =
            [...new Set(times)];

          return unique[
            unique.length - 1
          ];
        }
      }
    }

    return null;
  }


  /* =========================================================
     経過時間 → 秒
  ========================================================= */

  function elapsedToSeconds(text) {

    const m =
      (text || '').match(
        /^(\d{2}):(\d{2}):(\d{2})$/
      );

    if (!m)
      return null;

    return (
      Number(m[1]) * 3600 +
      Number(m[2]) * 60 +
      Number(m[3])
    );
  }


  /* =========================================================
     開始時刻
  ========================================================= */

  function getStartTime(elapsed) {

    const sec =
      elapsedToSeconds(elapsed);

    if (sec == null)
      return '--:--';

    const d =
      new Date(
        Date.now() -
        sec * 1000
      );

    return (
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }


  /* =========================================================
     UPDATE
  ========================================================= */

  function update() {

    const now =
      new Date();

    /* ---------- 時計 ---------- */

    $('tc-clock')
      .textContent =
        pad(now.getHours()) +
        ':' +
        pad(now.getMinutes());


    /* ---------- 現在タスク ---------- */

    const task =
      getCurrentTask();

    const elapsed =
      getElapsed(task);

    $('tc-task')
      .textContent =
        task ||
        'タスクを取得できません';

    $('tc-elapsed')
      .textContent =
        elapsed ||
        '--:--:--';

    $('tc-start')
      .textContent =
        getStartTime(elapsed);


    /* ---------- 退勤 ---------- */

    const leaveTime =
      getLeaveTime();

    $('tc-leave-time')
      .textContent =
        leaveTime ||
        '--:--';

    if (!leaveTime) {

      $('tc-leave-label')
        .textContent =
          'あと';

      $('tc-leave-count')
        .textContent =
          '--:--';

      return;
    }

    const [h, m] =
      leaveTime
        .split(':')
        .map(Number);

    const leave =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        h,
        m,
        0
      );

    let diff =
      Math.floor(
        (leave - now) / 1000
      );

    if (diff >= 0) {

      const hh =
        Math.floor(
          diff / 3600
        );

      const mm =
        Math.floor(
          (diff % 3600) / 60
        );

      $('tc-leave-label')
        .textContent =
          'あと';

      $('tc-leave-count')
        .textContent =
          pad(hh) +
          ':' +
          pad(mm);

    } else {

      diff =
        Math.abs(diff);

      const hh =
        Math.floor(
          diff / 3600
        );

      const mm =
        Math.floor(
          (diff % 3600) / 60
        );

      const ss =
        diff % 60;

      $('tc-leave-label')
        .textContent =
          '超過';

      $('tc-leave-count')
        .textContent =
          pad(hh) +
          ':' +
          pad(mm) +
          ':' +
          pad(ss);
    }
  }


  /* =========================================================
     START
  ========================================================= */

  update();

  window.tcNowTimer =
    setInterval(
      update,
      1000
    );

})();
