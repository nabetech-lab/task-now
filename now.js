(() => {
  const ROOT_ID = 'tc-now-root';

  /* =========================================================
     再実行時はNOWを閉じる
  ========================================================= */

  const old = document.getElementById(ROOT_ID);

  if (old) {
    old.remove();

    if (window.tcNowTimer) {
      clearInterval(window.tcNowTimer);
      window.tcNowTimer = null;
    }

    document.documentElement.style.overflow =
      window.tcNowOldHtmlOverflow || '';

    document.body.style.overflow =
      window.tcNowOldBodyOverflow || '';

    const oldStyle = document.getElementById('tc-now-style');
    if (oldStyle) oldStyle.remove();

    return;
  }

  window.tcNowOldHtmlOverflow =
    document.documentElement.style.overflow;

  window.tcNowOldBodyOverflow =
    document.body.style.overflow;

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';


  /* =========================================================
     CSS
  ========================================================= */

  const style = document.createElement('style');
  style.id = 'tc-now-style';

  style.textContent = `

    #${ROOT_ID},
    #${ROOT_ID} * {
      box-sizing: border-box;
    }

    #${ROOT_ID} {
      --bg: #07090d;
      --panel: #1a2029;
      --panel-sub: #0d1016;
      --text: #f7f7f8;
      --muted: #9a9da7;
      --dim: #474b55;

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
        max(14px, env(safe-area-inset-top))
        max(18px, env(safe-area-inset-right))
        max(14px, env(safe-area-inset-bottom))
        max(18px, env(safe-area-inset-left));
    }

    #tc-layout {
      width: 100%;
      height: 100%;

      display: grid;

      grid-template-rows:
        auto
        minmax(0, 1fr);

      gap: clamp(16px, 3vh, 30px);
    }


    /* =====================================================
       HEADER
    ===================================================== */

    #tc-header {
      display: grid;

      grid-template-columns:
        minmax(160px, .9fr)
        minmax(220px, 1fr)
        minmax(130px, .7fr);

      align-items: start;

      gap: clamp(14px, 3vw, 40px);

      min-width: 0;
    }

    #tc-brand {
      color: var(--muted);

      font-size: clamp(17px, 2.5vw, 32px);
      font-weight: 800;

      letter-spacing: .22em;
      line-height: 1.45;

      white-space: nowrap;
    }

    #tc-leave {
      font-size: clamp(20px, 3vw, 34px);
      font-weight: 800;

      line-height: 1.4;

      font-variant-numeric: tabular-nums;

      min-width: 0;
    }

    .tc-leave-line {
      display: grid;

      grid-template-columns:
        max-content
        minmax(0, max-content);

      gap: .35em;

      white-space: nowrap;
    }

    #tc-clock {
      justify-self: end;

      font-size: clamp(42px, 7vw, 84px);
      font-weight: 800;

      line-height: .95;

      letter-spacing: -.04em;

      font-variant-numeric: tabular-nums;

      white-space: nowrap;
    }


    /* =====================================================
       MAIN
    ===================================================== */

    #tc-main {
      min-height: 0;
      min-width: 0;

      display: grid;

      grid-template-columns:
        minmax(0, 1.55fr)
        minmax(240px, .95fr);

      gap: clamp(14px, 3vw, 34px);
    }


    /* =====================================================
       NOW PANEL
    ===================================================== */

    #tc-now {
      position: relative;

      min-width: 0;
      min-height: 0;

      overflow: hidden;

      background: var(--panel);

      border-radius:
        clamp(24px, 4vw, 54px);

      padding:
        clamp(22px, 5vh, 54px)
        clamp(26px, 5vw, 72px);

      display: flex;
      flex-direction: column;

      justify-content: center;
    }

    #tc-now::before {
      content: "";

      position: absolute;

      left: 0;
      top: 0;
      bottom: 0;

      width: clamp(8px, 1.2vw, 18px);

      background: #fff;
    }

    #tc-now-badge {
      align-self: flex-start;

      background: #fff;
      color: #101116;

      border-radius:
        clamp(14px, 2vw, 24px);

      padding:
        clamp(10px, 2vh, 18px)
        clamp(20px, 3vw, 34px);

      font-size:
        clamp(17px, 2.4vw, 30px);

      font-weight: 900;

      letter-spacing: .18em;

      margin-bottom:
        clamp(24px, 7vh, 70px);
    }

    #tc-start {
      color: #c9ccd3;

      font-size:
        clamp(25px, 4vw, 52px);

      font-weight: 500;

      font-variant-numeric: tabular-nums;

      margin-bottom:
        clamp(14px, 3vh, 28px);
    }

    #tc-task {
      font-size:
        clamp(34px, 6vw, 78px);

      font-weight: 900;

      line-height: 1.12;

      overflow-wrap: anywhere;
    }

    #tc-elapsed {
      margin-top:
        clamp(16px, 4vh, 38px);

      color: #aeb2bb;

      font-size:
        clamp(18px, 2.8vw, 34px);

      font-weight: 700;

      font-variant-numeric: tabular-nums;
    }


    /* =====================================================
       SIDE PANEL
    ===================================================== */

    #tc-side {
      min-width: 0;
      min-height: 0;

      display: grid;

      grid-template-rows:
        minmax(0, 1fr)
        minmax(0, 1fr);

      gap:
        clamp(12px, 2.5vh, 24px);
    }

    .tc-side-card {
      min-width: 0;
      min-height: 0;

      overflow: hidden;

      background: var(--panel-sub);

      border-radius:
        clamp(20px, 3vw, 38px);

      padding:
        clamp(20px, 4vh, 40px)
        clamp(22px, 3vw, 42px);

      display: flex;
      flex-direction: column;

      justify-content: center;
    }

    .tc-side-label {
      color: var(--dim);

      font-size:
        clamp(14px, 2vw, 24px);

      font-weight: 900;

      letter-spacing: .18em;

      margin-bottom:
        clamp(16px, 4vh, 36px);
    }

    .tc-side-row {
      display: grid;

      grid-template-columns:
        max-content
        minmax(0, 1fr);

      gap:
        clamp(14px, 2vw, 30px);

      align-items: baseline;

      min-width: 0;
    }

    .tc-side-time {
      color: #6e737e;

      font-size:
        clamp(22px, 3.6vw, 45px);

      white-space: nowrap;

      font-variant-numeric: tabular-nums;
    }

    .tc-side-task {
      color: #6e737e;

      font-size:
        clamp(22px, 3.6vw, 45px);

      font-weight: 700;

      min-width: 0;

      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }


    /* =====================================================
       iPHONE / SMALL LANDSCAPE
       横画面では高さを基準に縮小
    ===================================================== */

    @media
      (orientation: landscape)
      and (max-height: 500px) {

      #${ROOT_ID} {
        padding:
          max(7px, env(safe-area-inset-top))
          max(12px, env(safe-area-inset-right))
          max(7px, env(safe-area-inset-bottom))
          max(12px, env(safe-area-inset-left));
      }

      #tc-layout {
        grid-template-rows:
          minmax(50px, 19dvh)
          minmax(0, 1fr);

        gap: 2.2dvh;
      }

      #tc-header {
        grid-template-columns:
          minmax(110px, .8fr)
          minmax(175px, 1fr)
          minmax(110px, .6fr);

        gap: 2vw;

        align-items: center;
      }

      #tc-brand {
        font-size:
          clamp(12px, 3.8dvh, 19px);

        line-height: 1.3;

        letter-spacing: .19em;
      }

      #tc-leave {
        font-size:
          clamp(14px, 4.5dvh, 22px);

        line-height: 1.25;
      }

      #tc-clock {
        font-size:
          clamp(32px, 13dvh, 62px);
      }

      #tc-main {
        grid-template-columns:
          minmax(0, 1.55fr)
          minmax(180px, .92fr);

        gap: 2vw;
      }

      #tc-now {
        border-radius:
          clamp(16px, 6dvh, 32px);

        padding:
          clamp(10px, 3dvh, 20px)
          clamp(22px, 3.5vw, 38px);
      }

      #tc-now::before {
        width:
          clamp(6px, .9vw, 11px);
      }

      #tc-now-badge {
        border-radius:
          clamp(9px, 3.4dvh, 16px);

        padding:
          clamp(6px, 2dvh, 10px)
          clamp(13px, 1.8vw, 20px);

        font-size:
          clamp(12px, 4dvh, 19px);

        margin-bottom:
          clamp(8px, 3.5dvh, 17px);
      }

      #tc-start {
        font-size:
          clamp(18px, 6dvh, 30px);

        margin-bottom:
          clamp(5px, 2dvh, 10px);
      }

      #tc-task {
        font-size:
          clamp(26px, 8.5dvh, 45px);

        line-height: 1.03;
      }

      #tc-elapsed {
        margin-top:
          clamp(6px, 2dvh, 12px);

        font-size:
          clamp(13px, 4dvh, 20px);
      }

      #tc-side {
        gap: 2.2dvh;
      }

      .tc-side-card {
        border-radius:
          clamp(14px, 5dvh, 26px);

        padding:
          clamp(8px, 2dvh, 15px)
          clamp(13px, 1.8vw, 21px);
      }

      .tc-side-label {
        font-size:
          clamp(11px, 3.5dvh, 17px);

        margin-bottom:
          clamp(5px, 1.7dvh, 10px);
      }

      .tc-side-time,
      .tc-side-task {
        font-size:
          clamp(16px, 5dvh, 25px);
      }
    }


    /* =====================================================
       PORTRAIT
    ===================================================== */

    @media (orientation: portrait) {

      #${ROOT_ID} {
        padding:
          max(18px, env(safe-area-inset-top))
          max(18px, env(safe-area-inset-right))
          max(20px, env(safe-area-inset-bottom))
          max(18px, env(safe-area-inset-left));
      }

      #tc-layout {
        grid-template-rows:
          auto
          minmax(0, 1fr);

        gap: clamp(18px, 3vh, 28px);
      }

      #tc-header {
        grid-template-columns:
          1fr
          auto;

        grid-template-areas:
          "brand clock"
          "leave leave";

        gap:
          clamp(10px, 2vh, 18px)
          14px;
      }

      #tc-brand {
        grid-area: brand;

        font-size:
          clamp(14px, 4vw, 20px);
      }

      #tc-clock {
        grid-area: clock;

        font-size:
          clamp(38px, 12vw, 58px);
      }

      #tc-leave {
        grid-area: leave;

        display: flex;

        gap: 24px;

        font-size:
          clamp(18px, 5vw, 25px);
      }

      #tc-main {
        grid-template-columns: 1fr;

        grid-template-rows:
          minmax(0, 1fr)
          auto;

        gap: 16px;
      }

      #tc-now {
        padding:
          clamp(30px, 5vh, 50px)
          clamp(28px, 7vw, 46px);

        border-radius:
          clamp(28px, 8vw, 42px);
      }

      #tc-now-badge {
        font-size:
          clamp(16px, 5vw, 23px);

        margin-bottom:
          clamp(30px, 7vh, 60px);
      }

      #tc-start {
        font-size:
          clamp(26px, 8vw, 38px);
      }

      #tc-task {
        font-size:
          clamp(38px, 11vw, 60px);
      }

      #tc-elapsed {
        font-size:
          clamp(20px, 6vw, 28px);
      }

      #tc-side {
        grid-template-columns:
          1fr 1fr;

        grid-template-rows: auto;

        gap: 12px;
      }

      .tc-side-card {
        padding: 18px;

        border-radius: 22px;
      }

      .tc-side-label {
        font-size: 13px;

        margin-bottom: 10px;
      }

      .tc-side-time,
      .tc-side-task {
        font-size:
          clamp(15px, 4vw, 20px);
      }

      .tc-side-row {
        grid-template-columns: 1fr;

        gap: 4px;
      }
    }


    /* =====================================================
       SMALL PORTRAIT
    ===================================================== */

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

          <div class="tc-leave-line">
            <span>退勤</span>
            <span id="tc-leave-time">--:--</span>
          </div>

          <div class="tc-leave-line">
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

          <section class="tc-side-card">

            <div class="tc-side-label">
              PREVIOUS
            </div>

            <div class="tc-side-row">

              <div
                id="tc-prev-time"
                class="tc-side-time">
                —
              </div>

              <div
                id="tc-prev-task"
                class="tc-side-task">
                —
              </div>

            </div>

          </section>


          <section class="tc-side-card">

            <div class="tc-side-label">
              NEXT
            </div>

            <div class="tc-side-row">

              <div
                id="tc-next-time"
                class="tc-side-time">
                —
              </div>

              <div
                id="tc-next-task"
                class="tc-side-task">
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

  const $ = id =>
    document.getElementById(id);

  const pad = n =>
    String(n).padStart(2, '0');

  function isInsideNow(el) {
    return !!el.closest('#' + ROOT_ID);
  }

  function visible(el) {
    if (!el) return false;

    if (isInsideNow(el))
      return false;

    const r =
      el.getBoundingClientRect();

    return (
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.top < window.innerHeight
    );
  }


  /* =========================================================
     経過時間
  ========================================================= */

  function getElapsedElement() {

    const list =
      [...document.querySelectorAll('p,div,span')]
        .filter(el =>
          visible(el) &&
          /^\d{2}:\d{2}:\d{2}$/
            .test(
              (el.textContent || '').trim()
            )
        );

    if (!list.length)
      return null;

    list.sort(
      (a, b) =>
        b.getBoundingClientRect().top -
        a.getBoundingClientRect().top
    );

    return list[0];
  }


  /* =========================================================
     現在タスク
  ========================================================= */

  function getCurrentTask(elapsedEl) {

    if (!elapsedEl)
      return null;

    let parent =
      elapsedEl;

    for (
      let level = 0;
      level < 8 && parent;
      level++,
      parent = parent.parentElement
    ) {

      const r =
        parent.getBoundingClientRect();

      if (
        r.top >
          window.innerHeight * .55 &&
        r.height > 60
      ) {

        const candidates =
          [...parent.querySelectorAll('*')]
            .filter(el => {

              if (!visible(el))
                return false;

              if (el.children.length)
                return false;

              const t =
                (el.textContent || '')
                  .trim();

              if (!t)
                return false;

              if (t.length > 100)
                return false;

              if (
                /^-?\d{2}:\d{2}:\d{2}$/
                  .test(t)
              )
                return false;

              if (
                /^[-\d\s:./]+$/
                  .test(t)
              )
                return false;

              return true;
            })
            .map(el =>
              (el.textContent || '')
                .trim()
            )
            .filter(t =>
              t !== 'Main' &&
              t !== 'NOW'
            );

        if (candidates.length) {

          candidates.sort(
            (a, b) =>
              b.length - a.length
          );

          return candidates[0];
        }
      }
    }

    return null;
  }


  /* =========================================================
     退勤予定
  ========================================================= */

  function getLeaveTime() {

    const targets =
      [...document.querySelectorAll('body *')]
        .filter(el =>
          !isInsideNow(el) &&
          (el.textContent || '').trim()
            === '退勤'
        );

    for (const el of targets) {

      let parent = el;

      for (
        let level = 0;
        level < 8 && parent;
        level++,
        parent = parent.parentElement
      ) {

        const times =
          [...parent.querySelectorAll('*')]
            .map(x =>
              (x.textContent || '')
                .trim()
            )
            .filter(t =>
              /^\d{1,2}:\d{2}$/
                .test(t)
            );

        if (times.length) {
          return [
            ...new Set(times)
          ].pop();
        }
      }
    }

    return null;
  }


  /* =========================================================
     経過秒
  ========================================================= */

  function elapsedToSeconds(text) {

    if (!text)
      return null;

    const m =
      text.match(
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

    const date =
      new Date(
        Date.now() -
        sec * 1000
      );

    return (
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes())
    );
  }


  /* =========================================================
     PREVIOUS / NEXT
  ========================================================= */

  function getNeighbourTasks(currentTask) {

    if (!currentTask) {
      return {
        previous: null,
        next: null
      };
    }

    const leaves =
      [...document.querySelectorAll('body *')]
        .filter(el => {

          if (isInsideNow(el))
            return false;

          if (el.children.length)
            return false;

          const t =
            (el.textContent || '')
              .trim();

          if (!t)
            return false;

          if (t.length > 80)
            return false;

          if (
            /^-?\d{1,2}:\d{2}(:\d{2})?$/
              .test(t)
          )
            return false;

          return true;
        });

    const index =
      leaves.findIndex(
        el =>
          (el.textContent || '').trim()
            === currentTask
      );

    if (index < 0) {
      return {
        previous: null,
        next: null
      };
    }

    function taskAround(
      start,
      step
    ) {

      for (
        let i = start;
        i >= 0 &&
        i < leaves.length;
        i += step
      ) {

        const text =
          (leaves[i].textContent || '')
            .trim();

        if (
          text &&
          text !== currentTask &&
          text !== '退勤' &&
          text !== 'Main' &&
          text.length >= 2
        ) {
          return text;
        }
      }

      return null;
    }

    return {
      previous:
        taskAround(
          index - 1,
          -1
        ),

      next:
        taskAround(
          index + 1,
          1
        )
    };
  }


  /* =========================================================
     UPDATE
  ========================================================= */

  function update() {

    const now =
      new Date();


    /* ---------- CLOCK ---------- */

    $('tc-clock').textContent =
      pad(now.getHours()) +
      ':' +
      pad(now.getMinutes());


    /* ---------- CURRENT TASK ---------- */

    const elapsedEl =
      getElapsedElement();

    const elapsed =
      elapsedEl
        ? elapsedEl.textContent.trim()
        : null;

    const task =
      getCurrentTask(
        elapsedEl
      );

    $('tc-elapsed').textContent =
      elapsed ||
      '--:--:--';

    $('tc-task').textContent =
      task ||
      'タスクを取得できません';

    $('tc-start').textContent =
      getStartTime(
        elapsed
      );


    /* ---------- LEAVE ---------- */

    const leaveTime =
      getLeaveTime();

    $('tc-leave-time')
      .textContent =
        leaveTime ||
        '--:--';

    if (leaveTime) {

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

    } else {

      $('tc-leave-label')
        .textContent =
          'あと';

      $('tc-leave-count')
        .textContent =
          '--:--';
    }


    /* ---------- PREVIOUS / NEXT ---------- */

    const neighbours =
      getNeighbourTasks(
        task
      );

    $('tc-prev-task')
      .textContent =
        neighbours.previous ||
        '—';

    $('tc-next-task')
      .textContent =
        neighbours.next ||
        '—';

    $('tc-prev-time')
      .textContent =
        '—';

    $('tc-next-time')
      .textContent =
        '—';
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
