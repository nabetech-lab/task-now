(() => {
  'use strict';

  const VERSION = '2.0.0';
  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';
  const CACHE_KEY = 'tc-now-cache-v2';

  /* =========================================================
     共通
  ========================================================= */

  const pad = n =>
    String(n).padStart(2, '0');

  function todayKey() {
    const d = new Date();

    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate())
    );
  }

  function text(el) {
    return (el?.textContent || '').trim();
  }

  function insideNow(el) {
    return !!el?.closest?.('#' + ROOT_ID);
  }

  function hmsToSeconds(value) {
    const m =
      String(value || '').match(
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

  function secondsToHMS(total) {
    total = Math.max(0, Math.floor(total));

    const h =
      Math.floor(total / 3600);

    const m =
      Math.floor((total % 3600) / 60);

    const s =
      total % 60;

    return (
      pad(h) +
      ':' +
      pad(m) +
      ':' +
      pad(s)
    );
  }


  /* =========================================================
     キャッシュ
  ========================================================= */

  function loadCache() {
    try {
      const obj =
        JSON.parse(
          localStorage.getItem(CACHE_KEY) || 'null'
        );

      if (!obj)
        return {};

      if (obj.date !== todayKey())
        return {};

      return obj;

    } catch {
      return {};
    }
  }

  function saveCache(state) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          date: todayKey(),
          task: state.task || null,
          leaveTime: state.leaveTime || null
        })
      );
    } catch {}
  }


  /* =========================================================
     TaskChuteから経過時間を取得
     最初に実際に動いていたロジックをベースにする
  ========================================================= */

  function findElapsedElement() {

    const candidates =
      [...document.querySelectorAll(
        'p, div, span'
      )]
        .filter(el => {

          if (insideNow(el))
            return false;

          return (
            /^\d{2}:\d{2}:\d{2}$/
              .test(text(el))
          );
        });

    if (!candidates.length)
      return null;


    /*
      TaskChuteの下部プレイヤーでは
      Pタグで経過時間が出ていたため優先。
    */

    const pCandidates =
      candidates.filter(
        el => el.tagName === 'P'
      );

    const list =
      pCandidates.length
        ? pCandidates
        : candidates;


    /*
      最も画面下にある時間を優先。
      display:noneの場合でもDOM順をフォールバックに使う。
    */

    list.sort((a, b) => {

      const ar =
        a.getBoundingClientRect();

      const br =
        b.getBoundingClientRect();

      const aVisible =
        ar.width > 0 &&
        ar.height > 0;

      const bVisible =
        br.width > 0 &&
        br.height > 0;

      if (aVisible && bVisible)
        return br.top - ar.top;

      if (aVisible)
        return -1;

      if (bVisible)
        return 1;

      return 0;
    });

    return list[0] || null;
  }


  /* =========================================================
     現在タスク名
  ========================================================= */

  function validTaskText(value) {

    const t =
      String(value || '').trim();

    if (!t)
      return false;

    if (
      t.length < 2 ||
      t.length > 100
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

    const blacklist = new Set([
      'Main',
      'NOW',
      '退勤',
      'プロジェクトモード',
      'PREVIOUS',
      'NEXT',
      'TaskChute Cloud 2'
    ]);

    return !blacklist.has(t);
  }


  function findTaskFromElapsed(elapsedEl) {

    if (!elapsedEl)
      return null;

    /*
      最初に成功した方式。
      経過時間を起点に、親DOMを少しずつ広げる。
    */

    let parent =
      elapsedEl.parentElement;

    for (
      let level = 0;
      level < 10 && parent;
      level++,
      parent = parent.parentElement
    ) {

      const leaves =
        [...parent.querySelectorAll('*')]
          .filter(el => {

            if (insideNow(el))
              return false;

            if (el.children.length !== 0)
              return false;

            return validTaskText(
              text(el)
            );
          });

      const values =
        [...new Set(
          leaves.map(el => text(el))
        )];

      if (!values.length)
        continue;


      /*
        プレイヤー内で現在タスク名に最もなりやすいものを選ぶ。
        単純な「最長文字列」だけではなく、
        明らかなUI語を除外した後で採用。
      */

      const preferred =
        values.filter(v =>
          !v.includes('時間指定') &&
          !v.includes('再実行') &&
          !v.includes('通常画面')
        );

      const pool =
        preferred.length
          ? preferred
          : values;

      pool.sort(
        (a, b) =>
          b.length - a.length
      );

      if (pool[0])
        return pool[0];
    }

    return null;
  }


  function findTaskFromTitle() {

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

    if (m?.[1])
      return m[1].trim();


    m =
      title.match(
        /^(.+?)\s*-\s*TaskChute/i
      );

    if (
      m?.[1] &&
      validTaskText(m[1])
    )
      return m[1].trim();

    return null;
  }


  /* =========================================================
     退勤予定時刻
  ========================================================= */

  function findLeaveTime() {

    const leaveNodes =
      [...document.querySelectorAll(
        'body *'
      )]
        .filter(el =>
          !insideNow(el) &&
          text(el) === '退勤'
        );


    /*
      最も小さい「退勤タスク行」から順に時刻を探す。
    */

    for (const leaveNode of leaveNodes) {

      let parent =
        leaveNode;

      for (
        let level = 0;
        level < 10 && parent;
        level++,
        parent = parent.parentElement
      ) {

        const times =
          [...parent.querySelectorAll('*')]
            .map(el => text(el))
            .filter(value =>
              /^\d{1,2}:\d{2}$/
                .test(value)
            );

        const unique =
          [...new Set(times)];

        if (unique.length) {

          /*
            実機調査では
            行末側のHH:MMが予定開始時刻だった。
          */

          return unique[
            unique.length - 1
          ];
        }
      }
    }

    return null;
  }


  /* =========================================================
     NOWを出す前にTaskChuteをスナップショット
  ========================================================= */

  function captureTaskChute() {

    const cache =
      loadCache();

    const elapsedEl =
      findElapsedElement();

    const elapsedText =
      elapsedEl
        ? text(elapsedEl)
        : null;

    const elapsedSeconds =
      hmsToSeconds(
        elapsedText
      );

    let task =
      findTaskFromElapsed(
        elapsedEl
      );

    if (!task)
      task =
        findTaskFromTitle();

    if (!task)
      task =
        cache.task || null;


    let leaveTime =
      findLeaveTime();

    if (!leaveTime)
      leaveTime =
        cache.leaveTime || null;


    const state = {
      task,
      leaveTime,

      elapsedBase:
        elapsedSeconds,

      capturedAt:
        Date.now()
    };


    if (
      state.task ||
      state.leaveTime
    ) {
      saveCache(state);
    }

    return state;
  }


  /* =========================================================
     ★ここが重要
     NOWを作る前にデータを取る
  ========================================================= */

  let newState =
    captureTaskChute();


  /*
    再実行時にDOM取得できなくても、
    前回の有効データを捨てない。
  */

  if (window.tcNowState) {

    const oldState =
      window.tcNowState;

    if (!newState.task)
      newState.task =
        oldState.task;

    if (!newState.leaveTime)
      newState.leaveTime =
        oldState.leaveTime;

    if (
      newState.elapsedBase == null &&
      oldState.elapsedBase != null
    ) {

      const passed =
        Math.floor(
          (
            Date.now() -
            oldState.capturedAt
          ) / 1000
        );

      newState.elapsedBase =
        oldState.elapsedBase +
        passed;

      newState.capturedAt =
        Date.now();
    }
  }


  window.tcNowState =
    newState;


  /* =========================================================
     再実行は「非表示」にしない
     古いNOWだけ破棄して再生成
  ========================================================= */

  const oldRoot =
    document.getElementById(
      ROOT_ID
    );

  if (oldRoot)
    oldRoot.remove();


  const oldStyle =
    document.getElementById(
      STYLE_ID
    );

  if (oldStyle)
    oldStyle.remove();


  if (window.tcNowTimer) {
    clearInterval(
      window.tcNowTimer
    );

    window.tcNowTimer =
      null;
  }


  /* =========================================================
     ページ背景
  ========================================================= */

  document.documentElement
    .style
    .setProperty(
      'background',
      '#07090d',
      'important'
    );

  document.body
    .style
    .setProperty(
      'background',
      '#07090d',
      'important'
    );


  /* =========================================================
     CSS
  ========================================================= */

  const style =
    document.createElement(
      'style'
    );

  style.id =
    STYLE_ID;

  style.textContent = `

    #${ROOT_ID},
    #${ROOT_ID} * {
      box-sizing: border-box;
    }

    #${ROOT_ID} {
      --bg: #07090d;
      --panel: #1a2029;
      --panel2: #0d1016;
      --text: #f7f7f8;
      --muted: #979ba5;
      --dim: #4b4f59;

      position: fixed;

      inset: 0;

      z-index: 2147483647;

      width: 100vw;
      height: 100dvh;

      overflow: hidden;

      background: var(--bg);
      color: var(--text);

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Helvetica Neue",
        "Hiragino Sans",
        "Yu Gothic",
        sans-serif;

      padding:
        max(8px, env(safe-area-inset-top))
        max(12px, env(safe-area-inset-right))
        max(8px, env(safe-area-inset-bottom))
        max(12px, env(safe-area-inset-left));
    }


    #tc-layout {
      width: 100%;
      height: 100%;

      display: grid;

      grid-template-rows:
        auto
        minmax(0, 1fr);

      gap:
        clamp(
          10px,
          2.5vh,
          26px
        );
    }


    /* HEADER */

    #tc-header {
      min-width: 0;

      display: grid;

      grid-template-columns:
        minmax(140px, .8fr)
        minmax(190px, 1fr)
        minmax(120px, .65fr);

      align-items: center;

      gap:
        clamp(
          12px,
          2.5vw,
          36px
        );
    }


    #tc-brand {
      color:
        var(--muted);

      font-size:
        clamp(
          14px,
          2.3vw,
          28px
        );

      font-weight: 800;

      line-height: 1.4;

      letter-spacing: .22em;

      white-space: nowrap;
    }


    #tc-leave {
      font-size:
        clamp(
          17px,
          2.6vw,
          30px
        );

      font-weight: 800;

      line-height: 1.32;

      font-variant-numeric:
        tabular-nums;

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

      font-size:
        clamp(
          38px,
          6.8vw,
          78px
        );

      font-weight: 800;

      line-height: 1;

      letter-spacing: -.04em;

      white-space: nowrap;

      font-variant-numeric:
        tabular-nums;
    }


    /* MAIN */

    #tc-main {
      min-width: 0;
      min-height: 0;

      display: grid;

      grid-template-columns:
        minmax(0, 1.65fr)
        minmax(190px, .9fr);

      gap:
        clamp(
          12px,
          2.4vw,
          30px
        );
    }


    /* NOW */

    #tc-now {
      position: relative;

      min-width: 0;
      min-height: 0;

      overflow: hidden;

      background:
        var(--panel);

      border-radius:
        clamp(
          18px,
          3.5vw,
          46px
        );

      padding:
        clamp(
          18px,
          4.5vh,
          46px
        )
        clamp(
          26px,
          4.6vw,
          62px
        );

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

      width:
        clamp(
          7px,
          .9vw,
          14px
        );

      background: white;
    }


    #tc-now-badge {
      align-self:
        flex-start;

      background:
        white;

      color:
        #111318;

      font-size:
        clamp(
          15px,
          2.1vw,
          26px
        );

      font-weight: 900;

      letter-spacing:
        .18em;

      border-radius:
        clamp(
          11px,
          1.8vw,
          20px
        );

      padding:
        clamp(
          7px,
          1.5vh,
          14px
        )
        clamp(
          16px,
          2.4vw,
          28px
        );

      margin-bottom:
        clamp(
          18px,
          5vh,
          54px
        );
    }


    #tc-start {
      color:
        #c6cad2;

      font-size:
        clamp(
          21px,
          3.5vw,
          44px
        );

      font-weight: 500;

      font-variant-numeric:
        tabular-nums;

      margin-bottom:
        clamp(
          8px,
          2vh,
          18px
        );
    }


    #tc-task {
      font-size:
        clamp(
          30px,
          5.3vw,
          68px
        );

      font-weight: 900;

      line-height: 1.07;

      overflow-wrap:
        anywhere;
    }


    #tc-elapsed {
      margin-top:
        clamp(
          10px,
          2.5vh,
          25px
        );

      color:
        #aeb2bb;

      font-size:
        clamp(
          16px,
          2.4vw,
          30px
        );

      font-weight: 700;

      font-variant-numeric:
        tabular-nums;
    }


    /* SIDE */

    #tc-side {
      min-width: 0;
      min-height: 0;

      display: grid;

      grid-template-rows:
        minmax(0, 1fr)
        minmax(0, 1fr);

      gap:
        clamp(
          10px,
          2vh,
          20px
        );
    }


    .tc-card {
      min-width: 0;
      min-height: 0;

      overflow: hidden;

      background:
        var(--panel2);

      border-radius:
        clamp(
          16px,
          2.8vw,
          30px
        );

      padding:
        clamp(
          14px,
          3vh,
          30px
        )
        clamp(
          17px,
          2.4vw,
          32px
        );

      display: flex;

      flex-direction: column;

      justify-content: center;
    }


    .tc-card-label {
      color:
        var(--dim);

      font-size:
        clamp(
          12px,
          1.7vw,
          20px
        );

      font-weight: 900;

      letter-spacing:
        .18em;

      margin-bottom:
        clamp(
          8px,
          2vh,
          20px
        );
    }


    .tc-card-row {
      min-width: 0;

      display: grid;

      grid-template-columns:
        max-content
        minmax(0, 1fr);

      align-items: baseline;

      gap:
        clamp(
          8px,
          1.5vw,
          20px
        );
    }


    .tc-card-time,
    .tc-card-task {
      color:
        #707580;

      font-size:
        clamp(
          18px,
          3vw,
          36px
        );
    }


    .tc-card-time {
      white-space:
        nowrap;

      font-variant-numeric:
        tabular-nums;
    }


    .tc-card-task {
      min-width: 0;

      font-weight: 700;

      white-space: nowrap;

      overflow: hidden;

      text-overflow:
        ellipsis;
    }


    #tc-version {
      position: absolute;

      right:
        max(
          11px,
          env(safe-area-inset-right)
        );

      bottom:
        max(
          4px,
          env(safe-area-inset-bottom)
        );

      color:
        #41454f;

      font-size:
        10px;

      font-weight:
        700;

      letter-spacing:
        .08em;
    }


    /* =====================================================
       iPhone横画面
       高さを基準に必ず収める
    ===================================================== */

    @media
      (orientation: landscape)
      and (max-height: 500px) {

      #${ROOT_ID} {
        padding:
          max(
            4px,
            env(safe-area-inset-top)
          )
          max(
            8px,
            env(safe-area-inset-right)
          )
          max(
            4px,
            env(safe-area-inset-bottom)
          )
          max(
            8px,
            env(safe-area-inset-left)
          );
      }


      #tc-layout {
        grid-template-rows:
          17dvh
          minmax(0, 1fr);

        gap: 1.8dvh;
      }


      #tc-header {
        grid-template-columns:
          minmax(90px, .75fr)
          minmax(150px, 1fr)
          minmax(100px, .55fr);

        gap: 1.7vw;
      }


      #tc-brand {
        font-size:
          clamp(
            10px,
            3.3dvh,
            17px
          );

        line-height:
          1.28;
      }


      #tc-leave {
        font-size:
          clamp(
            12px,
            4dvh,
            20px
          );

        line-height:
          1.22;
      }


      #tc-clock {
        font-size:
          clamp(
            28px,
            11.5dvh,
            56px
          );
      }


      #tc-main {
        grid-template-columns:
          minmax(0, 1.67fr)
          minmax(160px, .88fr);

        gap: 1.6vw;
      }


      #tc-now {
        border-radius:
          clamp(
            13px,
            5dvh,
            25px
          );

        padding:
          clamp(
            8px,
            2.2dvh,
            15px
          )
          clamp(
            18px,
            3vw,
            30px
          );
      }


      #tc-now::before {
        width:
          clamp(
            5px,
            .7vw,
            9px
          );
      }


      #tc-now-badge {
        font-size:
          clamp(
            10px,
            3.4dvh,
            17px
          );

        border-radius:
          clamp(
            7px,
            2.7dvh,
            13px
          );

        padding:
          clamp(
            4px,
            1.3dvh,
            7px
          )
          clamp(
            10px,
            1.4vw,
            16px
          );

        margin-bottom:
          clamp(
            6px,
            2dvh,
            11px
          );
      }


      #tc-start {
        font-size:
          clamp(
            16px,
            5.2dvh,
            26px
          );

        margin-bottom:
          clamp(
            3px,
            1.2dvh,
            6px
          );
      }


      #tc-task {
        font-size:
          clamp(
            22px,
            7.5dvh,
            39px
          );

        line-height:
          1.02;
      }


      #tc-elapsed {
        margin-top:
          clamp(
            4px,
            1.4dvh,
            8px
          );

        font-size:
          clamp(
            11px,
            3.5dvh,
            18px
          );
      }


      #tc-side {
        gap:
          1.8dvh;
      }


      .tc-card {
        border-radius:
          clamp(
            11px,
            4dvh,
            21px
          );

        padding:
          clamp(
            6px,
            1.5dvh,
            11px
          )
          clamp(
            10px,
            1.4vw,
            17px
          );
      }


      .tc-card-label {
        font-size:
          clamp(
            9px,
            3dvh,
            15px
          );

        margin-bottom:
          clamp(
            3px,
            1.2dvh,
            6px
          );
      }


      .tc-card-time,
      .tc-card-task {
        font-size:
          clamp(
            14px,
            4.4dvh,
            22px
          );
      }
    }


    /* =====================================================
       縦画面
    ===================================================== */

    @media
      (orientation: portrait) {

      #tc-header {
        grid-template-columns:
          1fr
          auto;

        grid-template-areas:
          "brand clock"
          "leave leave";

        gap: 9px;
      }


      #tc-brand {
        grid-area:
          brand;
      }


      #tc-clock {
        grid-area:
          clock;
      }


      #tc-leave {
        grid-area:
          leave;

        display: flex;

        gap: 20px;
      }


      #tc-main {
        grid-template-columns:
          1fr;

        grid-template-rows:
          minmax(0, 1fr)
          auto;

        gap: 12px;
      }


      #tc-side {
        grid-template-columns:
          1fr 1fr;

        grid-template-rows:
          auto;

        gap: 9px;
      }


      .tc-card {
        padding:
          14px;
      }


      .tc-card-row {
        grid-template-columns:
          1fr;

        gap: 3px;
      }
    }


    @media
      (orientation: portrait)
      and (max-width: 430px) {

      #tc-brand {
        display:
          none;
      }


      #tc-header {
        grid-template-columns:
          1fr;

        grid-template-areas:
          "clock"
          "leave";
      }


      #tc-clock {
        justify-self:
          center;
      }


      #tc-leave {
        justify-content:
          center;
      }


      #tc-side {
        display:
          none;
      }
    }
  `;

  document.head.appendChild(
    style
  );


  /* =========================================================
     HTML
  ========================================================= */

  const root =
    document.createElement(
      'div'
    );

  root.id =
    ROOT_ID;


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
            <span id="tc-leave-time">
              --:--
            </span>
          </div>

          <div class="tc-leave-row">
            <span id="tc-leave-label">
              あと
            </span>

            <span id="tc-leave-count">
              --:--
            </span>
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
                class="tc-card-time">
                —
              </div>

              <div
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
                class="tc-card-time">
                —
              </div>

              <div
                class="tc-card-task">
                —
              </div>

            </div>

          </section>

        </aside>

      </main>

    </div>

    <div id="tc-version">
      v${VERSION}
    </div>
  `;


  document.body.appendChild(
    root
  );


  /* =========================================================
     表示更新
  ========================================================= */

  const $ =
    id =>
      document.getElementById(
        id
      );


  function getElapsedNow() {

    const state =
      window.tcNowState;

    if (
      !state ||
      state.elapsedBase == null
    )
      return null;


    const passed =
      Math.floor(
        (
          Date.now() -
          state.capturedAt
        ) / 1000
      );


    return (
      state.elapsedBase +
      passed
    );
  }


  function calculateStartTime(
    elapsedSeconds
  ) {

    if (
      elapsedSeconds == null
    )
      return '--:--';


    const start =
      new Date(
        Date.now() -
        elapsedSeconds * 1000
      );


    return (
      pad(start.getHours()) +
      ':' +
      pad(start.getMinutes())
    );
  }


  function render() {

    const now =
      new Date();


    /* 時計 */

    $('tc-clock')
      .textContent =
        pad(now.getHours()) +
        ':' +
        pad(now.getMinutes());


    /* 現在タスク */

    const state =
      window.tcNowState || {};


    $('tc-task')
      .textContent =
        state.task ||
        'タスクを取得できません';


    const elapsedSeconds =
      getElapsedNow();


    $('tc-elapsed')
      .textContent =
        elapsedSeconds == null
          ? '--:--:--'
          : secondsToHMS(
              elapsedSeconds
            );


    $('tc-start')
      .textContent =
        calculateStartTime(
          elapsedSeconds
        );


    /* 退勤 */

    const leaveTime =
      state.leaveTime;


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


    const [
      leaveHour,
      leaveMinute
    ] =
      leaveTime
        .split(':')
        .map(Number);


    const leaveDate =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        leaveHour,
        leaveMinute,
        0
      );


    let diff =
      Math.floor(
        (
          leaveDate -
          now
        ) / 1000
      );


    if (diff >= 0) {

      $('tc-leave-label')
        .textContent =
          'あと';


      const hh =
        Math.floor(
          diff / 3600
        );


      const mm =
        Math.floor(
          (
            diff % 3600
          ) / 60
        );


      $('tc-leave-count')
        .textContent =
          pad(hh) +
          ':' +
          pad(mm);

    } else {

      diff =
        Math.abs(diff);


      $('tc-leave-label')
        .textContent =
          '超過';


      const hh =
        Math.floor(
          diff / 3600
        );


      const mm =
        Math.floor(
          (
            diff % 3600
          ) / 60
        );


      const ss =
        diff % 60;


      $('tc-leave-count')
        .textContent =
          pad(hh) +
          ':' +
          pad(mm) +
          ':' +
          pad(ss);
    }
  }


  render();


  window.tcNowTimer =
    setInterval(
      render,
      1000
    );

})();
