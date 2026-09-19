(() => {
  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  /* =========================================================
     既存NOWを閉じる
  ========================================================= */

  const old = document.getElementById(ROOT_ID);

  if (old) {
    old.remove();

    if (window.tcNowTimer) {
      clearInterval(window.tcNowTimer);
      window.tcNowTimer = null;
    }

    const oldStyle = document.getElementById(STYLE_ID);
    if (oldStyle) oldStyle.remove();

    return;
  }


  /* =========================================================
     iPhone横画面の白帯対策
  ========================================================= */

  let viewport = document.querySelector('meta[name="viewport"]');

  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }

  let viewportContent =
    viewport.getAttribute('content') || 'width=device-width,initial-scale=1';

  if (!viewportContent.includes('viewport-fit=cover')) {
    viewportContent += ',viewport-fit=cover';
  }

  viewport.setAttribute('content', viewportContent);

  document.documentElement.style.background = '#07090d';
  document.body.style.background = '#07090d';
  document.body.style.margin = '0';


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
      --dim: #50545e;

      position: fixed;

      top: 0;
      right: 0;
      bottom: 0;
      left: 0;

      width: 100%;
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


    /* =====================================================
       全体
    ===================================================== */

    #tc-layout {
      width: 100%;
      height: 100%;

      display: grid;

      grid-template-rows:
        auto
        minmax(0, 1fr);

      gap: clamp(14px, 2.5vh, 28px);
    }


    /* =====================================================
       HEADER
    ===================================================== */

    #tc-header {
      display: grid;

      grid-template-columns:
        minmax(150px, .8fr)
        minmax(220px, 1fr)
        minmax(140px, .7fr);

      gap: clamp(15px, 3vw, 40px);

      align-items: center;

      min-width: 0;
    }

    #tc-brand {
      color: var(--muted);

      font-size: clamp(16px, 2.4vw, 30px);

      font-weight: 800;

      letter-spacing: .22em;

      line-height: 1.45;

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

      gap: .4em;
    }

    #tc-clock {
      justify-self: end;

      font-size: clamp(40px, 7vw, 82px);

      font-weight: 800;

      line-height: 1;

      letter-spacing: -.04em;

      font-variant-numeric: tabular-nums;

      white-space: nowrap;
    }


    /* =====================================================
       MAIN
    ===================================================== */

    #tc-main {
      min-width: 0;
      min-height: 0;

      display: grid;

      grid-template-columns:
        minmax(0, 1.6fr)
        minmax(220px, .9fr);

      gap: clamp(14px, 2.7vw, 32px);
    }


    /* =====================================================
       NOW
    ===================================================== */

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

      background: white;
    }

    #tc-now-badge {
      align-self: flex-start;

      background: white;

      color: #101116;

      border-radius:
        clamp(13px, 2vw, 23px);

      padding:
        clamp(9px, 1.8vh, 17px)
        clamp(18px, 2.8vw, 32px);

      font-size:
        clamp(16px, 2.3vw, 28px);

      font-weight: 900;

      letter-spacing: .18em;

      margin-bottom:
        clamp(20px, 6vh, 60px);
    }

    #tc-start {
      color: #c9ccd3;

      font-size:
        clamp(23px, 3.7vw, 48px);

      font-weight: 500;

      font-variant-numeric: tabular-nums;

      margin-bottom:
        clamp(10px, 2.5vh, 22px);
    }

    #tc-task {
      font-size:
        clamp(32px, 5.5vw, 72px);

      font-weight: 900;

      line-height: 1.1;

      overflow-wrap: anywhere;
    }

    #tc-elapsed {
      margin-top:
        clamp(12px, 3vh, 30px);

      color: #aeb2bb;

      font-size:
        clamp(17px, 2.6vw, 32px);

      font-weight: 700;

      font-variant-numeric: tabular-nums;
    }


    /* =====================================================
       SIDE
    ===================================================== */

    #tc-side {
      min-width: 0;
      min-height: 0;

      display: grid;

      grid-template-rows:
        minmax(0, 1fr)
        minmax(0, 1fr);

      gap: clamp(12px, 2.3vh, 22px);
    }

    .tc-card {
      min-width: 0;
      min-height: 0;

      background: var(--panel2);

      border-radius:
        clamp(18px, 3vw, 34px);

      padding:
        clamp(18px, 3.5vh, 34px)
        clamp(20px, 2.8vw, 36px);

      overflow: hidden;

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
        clamp(12px, 3vh, 28px);
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

      white-space: nowrap;

      overflow: hidden;

      text-overflow: ellipsis;
    }


    /* =====================================================
       iPHONE 横画面
       縦方向はdvhを基準に縮小
    ===================================================== */

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

        gap: 2dvh;
      }

      #tc-header {
        grid-template-columns:
          minmax(100px, .8fr)
          minmax(170px, 1fr)
          minmax(110px, .6fr);

        gap: 2vw;
      }

      #tc-brand {
        font-size:
          clamp(11px, 3.5dvh, 18px);

        line-height: 1.3;
      }

      #tc-leave {
        font-size:
          clamp(13px, 4.3dvh, 21px);

        line-height: 1.25;
      }

      #tc-clock {
        font-size:
          clamp(30px, 12dvh, 58px);
      }

      #tc-main {
        grid-template-columns:
          minmax(0, 1.6fr)
          minmax(170px, .92fr);

        gap: 1.8vw;
      }

      #tc-now {
        border-radius:
          clamp(14px, 5.5dvh, 28px);

        padding:
          clamp(9px, 2.5dvh, 17px)
          clamp(20px, 3.3vw, 34px);
      }

      #tc-now::before {
        width:
          clamp(6px, .8vw, 10px);
      }

      #tc-now-badge {
        border-radius:
          clamp(8px, 3dvh, 14px);

        padding:
          clamp(5px, 1.6dvh, 8px)
          clamp(12px, 1.6vw, 18px);

        font-size:
          clamp(11px, 3.6dvh, 18px);

        margin-bottom:
          clamp(7px, 2.5dvh, 13px);
      }

      #tc-start {
        font-size:
          clamp(17px, 5.5dvh, 28px);

        margin-bottom:
          clamp(4px, 1.6dvh, 8px);
      }

      #tc-task {
        font-size:
          clamp(24px, 8dvh, 42px);

        line-height: 1.03;
      }

      #tc-elapsed {
        margin-top:
          clamp(5px, 1.6dvh, 9px);

        font-size:
          clamp(12px, 3.8dvh, 19px);
      }

      #tc-side {
        gap: 2dvh;
      }

      .tc-card {
        border-radius:
          clamp(12px, 4.5dvh, 23px);

        padding:
          clamp(7px, 1.8dvh, 13px)
          clamp(12px, 1.6vw, 19px);
      }

      .tc-card-label {
        font-size:
          clamp(10px, 3.2dvh, 16px);

        margin-bottom:
          clamp(4px, 1.5dvh, 8px);
      }

      .tc-card-time,
      .tc-card-task {
        font-size:
          clamp(15px, 4.7dvh, 23px);
      }
    }


    /* =====================================================
       縦画面
    ===================================================== */

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

  const $ = id =>
    document.getElementById(id);

  const pad = n =>
    String(n).padStart(2, '0');

  function inNow(el) {
    return !!el.closest('#' + ROOT_ID);
  }

  function visible(el) {

    if (!el || inNow(el))
      return false;

    const r =
      el.getBoundingClientRect();

    return (
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.top < innerHeight
    );
  }


  /* =========================================================
     CURRENT ELAPSED
  ========================================================= */

  function getElapsedElement() {

    const candidates =
      [...document.querySelectorAll(
        'p,div,span'
      )]
        .filter(el =>
          visible(el) &&
          /^\d{2}:\d{2}:\d{2}$/
            .test(
              (el.textContent || '')
                .trim()
            )
        );

    if (!candidates.length)
      return null;

    candidates.sort(
      (a, b) =>
        b.getBoundingClientRect().top -
        a.getBoundingClientRect().top
    );

    return candidates[0];
  }


  /* =========================================================
     CURRENT TASK
     経過時間の近くから探す
  ========================================================= */

  function validTaskText(text) {

    const t =
      (text || '').trim();

    if (!t)
      return false;

    if (t.length < 2 || t.length > 100)
      return false;

    if (
      /^\d{1,2}:\d{2}(:\d{2})?$/
        .test(t)
    )
      return false;

    if (
      /^-?\d{1,2}:\d{2}(:\d{2})?$/
        .test(t)
    )
      return false;

    if (
      /^[-\d\s:./]+$/
        .test(t)
    )
      return false;

    const blacklist = [
      'Main',
      'NOW',
      '退勤',
      'プロジェクトモード',
      'PREVIOUS',
      'NEXT'
    ];

    if (blacklist.includes(t))
      return false;

    return true;
  }


  function getCurrentTask(elapsedEl) {

    if (!elapsedEl)
      return null;

    /*
      画面位置で判定しない。
      経過時間を起点として
      小さい親DOMから順に探す。
    */

    let parent =
      elapsedEl.parentElement;

    for (
      let level = 0;
      level < 9 && parent;
      level++,
      parent = parent.parentElement
    ) {

      const leaves =
        [...parent.querySelectorAll('*')]
          .filter(el => {

            if (inNow(el))
              return false;

            if (el.children.length)
              return false;

            return validTaskText(
              el.textContent
            );
          });

      if (leaves.length) {

        const texts =
          [...new Set(
            leaves.map(el =>
              (el.textContent || '')
                .trim()
            )
          )];

        if (texts.length) {

          /*
            現在タスク名は、
            プレイヤー内では比較的長い
            通常文字列になるケースが多い。
          */

          texts.sort(
            (a, b) =>
              b.length - a.length
          );

          return texts[0];
        }
      }
    }

    return null;
  }


  /* =========================================================
     LEAVE TIME
  ========================================================= */

  function getLeaveTime() {

    const targets =
      [...document.querySelectorAll(
        'body *'
      )]
        .filter(el =>
          !inNow(el) &&
          (el.textContent || '')
            .trim() === '退勤'
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
     START TIME
  ========================================================= */

  function elapsedToSeconds(text) {

    const match =
      (text || '').match(
        /^(\d{2}):(\d{2}):(\d{2})$/
      );

    if (!match)
      return null;

    return (
      Number(match[1]) * 3600 +
      Number(match[2]) * 60 +
      Number(match[3])
    );
  }


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
     UPDATE
  ========================================================= */

  function update() {

    const now =
      new Date();


    /* CLOCK */

    $('tc-clock')
      .textContent =
        pad(now.getHours()) +
        ':' +
        pad(now.getMinutes());


    /* CURRENT */

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

    $('tc-elapsed')
      .textContent =
        elapsed ||
        '--:--:--';

    $('tc-start')
      .textContent =
        getStartTime(
          elapsed
        );

    $('tc-task')
      .textContent =
        task ||
        'タスクを取得できません';


    /* LEAVE */

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
