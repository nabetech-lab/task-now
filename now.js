(() => {
  'use strict';

  /* =========================================================
     TaskChute NOW v3.3.0
  ========================================================= */

  const VERSION = '3.3.0';

  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  const RENDER_INTERVAL = 1000;
  const SYNC_INTERVAL = 5000;


  /* =========================================================
     UTIL
  ========================================================= */

  const pad = n =>
    String(n).padStart(2, '0');


  const clean = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();


  const text = el =>
    clean(el?.textContent);


  const isInsideNow = el =>
    !!el?.closest?.('#' + ROOT_ID);


  const isHMS = value =>
    /^\d{2}:\d{2}:\d{2}$/
      .test(clean(value));


  const isHM = value =>
    /^\d{1,2}:\d{2}$/
      .test(clean(value));


  function hmsToSeconds(value) {

    const m =
      clean(value).match(
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


  function secondsToHMS(seconds) {

    if (
      seconds === null ||
      seconds === undefined ||
      Number.isNaN(seconds)
    ) {
      return '--:--:--';
    }

    seconds =
      Math.max(
        0,
        Math.floor(seconds)
      );

    const h =
      Math.floor(seconds / 3600);

    const m =
      Math.floor(
        (seconds % 3600) / 60
      );

    const s =
      seconds % 60;

    return (
      pad(h) +
      ':' +
      pad(m) +
      ':' +
      pad(s)
    );
  }


  function validTaskName(value) {

    const t =
      clean(value);

    if (!t)
      return false;

    if (
      t.length < 1 ||
      t.length > 120
    )
      return false;

    if (
      isHM(t) ||
      isHMS(t)
    )
      return false;

    if (
      /^[-\d\s:./]+$/
        .test(t)
    )
      return false;

    const blacklist =
      new Set([
        'Main',
        'NOW',
        'PREVIOUS',
        'NEXT',
        'プロジェクトモード',
        'プロジェクト',
        'TaskChute Cloud 2',
        'タスクを取得できません'
      ]);

    return !blacklist.has(t);
  }


  /* =========================================================
     STATE
  ========================================================= */

  if (!window.tcNowStateV33) {

    window.tcNowStateV33 = {

      currentTask: null,

      elapsedBase: null,
      elapsedCapturedAt: null,

      leaveTime: null,

      previous: null,

      next: [],

      lastSync: null
    };
  }


  const state =
    window.tcNowStateV33;


  /* =========================================================
     CURRENT PLAYER
     実機で確認したDOM構造：

     経過時間
       ↓ parent
       ↓ parent
       ↓ previousElementSibling
     現在タスク名
  ========================================================= */

  function findCurrentPlayer() {

    const timeElements =
      [...document.querySelectorAll(
        'p, div, span'
      )]
        .filter(el => {

          if (isInsideNow(el))
            return false;

          return isHMS(
            text(el)
          );
        });


    const candidates = [];


    for (
      const elapsedEl
      of timeElements
    ) {

      const taskEl =
        elapsedEl
          ?.parentElement
          ?.parentElement
          ?.previousElementSibling;


      if (!taskEl)
        continue;


      const taskName =
        clean(
          taskEl.textContent
        );


      if (
        !validTaskName(
          taskName
        )
      )
        continue;


      const rect =
        elapsedEl
          .getBoundingClientRect();


      candidates.push({

        elapsedEl,

        taskEl,

        task:
          taskName,

        elapsed:
          text(elapsedEl),

        top:
          rect.top,

        visible:
          (
            rect.width > 0 &&
            rect.height > 0
          )
      });
    }


    if (!candidates.length)
      return null;


    /*
      下部プレイヤーを優先。
    */

    candidates.sort(
      (a, b) => {

        if (
          a.visible &&
          !b.visible
        )
          return -1;

        if (
          !a.visible &&
          b.visible
        )
          return 1;

        return (
          b.top -
          a.top
        );
      }
    );


    return candidates[0];
  }


  /* =========================================================
     SCHEDULE ROWS
     実機調査で確定：

     TAG   : DIV
     CLASS : MuiBox-root my-0
     高さ  : 約32px

     親要素に
     タスク詳細・予定時刻等が入っている。
  ========================================================= */

  function extractTimes(
    value
  ) {

    /*
      HH:MM:SSの一部を誤検出しないように
      先にHH:MM:SSを消す。
    */

    const stripped =
      clean(value)
        .replace(
          /\d{1,2}:\d{2}:\d{2}/g,
          ' '
        )
        .replace(
          /--:--:--/g,
          ' '
        );


    return (
      stripped.match(
        /\d{1,2}:\d{2}/g
      ) || []
    );
  }


  function getScheduleTime(
    task,
    parentText
  ) {

    const times =
      extractTimes(
        parentText
      );


    if (!times.length)
      return null;


    /*
      現在・完了済みタスク

      DailyReview
      16:07 16:13 ...

      → 最初の時刻 = 開始時刻
    */

    const hasActualExecution =
      (
        !parentText.includes(
          '--:--:--'
        ) &&
        times.length >= 1
      );


    if (
      task === state.currentTask ||
      hasActualExecution
    ) {
      return times[0];
    }


    /*
      未実行タスク：

      夜の薬...
      --:--:--
      ...
      19:19

      → 最後の時刻が予定開始時刻
    */

    return times[
      times.length - 1
    ];
  }


  function getScheduleRows() {

    const rows = [];


    const elements =
      [
        ...document.querySelectorAll(
          'div.MuiBox-root.my-0'
        )
      ];


    for (
      const el
      of elements
    ) {

      if (
        isInsideNow(el)
      )
        continue;


      const task =
        clean(
          el.textContent
        );


      if (
        !validTaskName(task)
      )
        continue;


      const rect =
        el.getBoundingClientRect();


      /*
        実機の予定タスク名行を
        十分広めの条件で識別。
      */

      if (
        rect.left < -20 ||
        rect.left > 150 ||
        rect.width < 250 ||
        rect.width > 900 ||
        rect.height < 22 ||
        rect.height > 48
      ) {
        continue;
      }


      const parent =
        el.parentElement;


      if (!parent)
        continue;


      const parentText =
        clean(
          parent.textContent
        );


      /*
        タスク名だけのnested要素を除外。
      */

      if (
        !parentText ||
        parentText === task
      ) {
        continue;
      }


      /*
        本物のタスク行では、
        親テキストがタスク名より明確に長い。
      */

      if (
        parentText.length <
        task.length + 5
      ) {
        continue;
      }


      /*
        TaskChute予定行には、
        プロジェクトモード / 時刻 / --:-- 等
        のいずれかが存在する。
      */

      if (
        !parentText.includes(
          'プロジェクト'
        ) &&
        !parentText.includes(
          '--:--'
        ) &&
        !/\d{1,2}:\d{2}/
          .test(parentText)
      ) {
        continue;
      }


      const scheduledTime =
        getScheduleTime(
          task,
          parentText
        );


      rows.push({

        task,

        time:
          scheduledTime,

        top:
          rect.top,

        element:
          el,

        parentText
      });
    }


    /*
      同一位置・同一タスクの
      nested重複を削除。
    */

    rows.sort(
      (a, b) =>
        a.top -
        b.top
    );


    const unique = [];


    for (
      const row
      of rows
    ) {

      const duplicate =
        unique.some(
          x =>
            x.task ===
              row.task &&
            Math.abs(
              x.top -
              row.top
            ) < 3
        );


      if (!duplicate) {

        unique.push(
          row
        );
      }
    }


    return unique;
  }


  /* =========================================================
     PREVIOUS + NEXT 3
  ========================================================= */

  function getNeighbours(
    currentTask
  ) {

    if (!currentTask) {

      return {

        previous: null,

        next: []
      };
    }


    const rows =
      getScheduleRows();


    const index =
      rows.findIndex(
        row =>
          row.task ===
          currentTask
      );


    if (index < 0) {

      return {

        previous: null,

        next: []
      };
    }


    const previous =
      index > 0
        ? rows[
            index - 1
          ]
        : null;


    /*
      退勤も普通にNEXTへ含める。
    */

    const next =
      rows.slice(
        index + 1,
        index + 4
      );


    return {

      previous,

      next
    };
  }


  /* =========================================================
     LEAVE TIME
  ========================================================= */

  function findLeaveTime(
    scheduleRows
  ) {

    /*
      まず予定一覧から退勤を取得。
    */

    const row =
      scheduleRows.find(
        item =>
          item.task === '退勤'
      );


    if (
      row &&
      row.time
    ) {
      return row.time;
    }


    /*
      フォールバック：
      「退勤」の親DOMを直接検索。
    */

    const leaveNodes =
      [
        ...document.querySelectorAll(
          'body *'
        )
      ]
        .filter(
          el =>
            !isInsideNow(el) &&
            text(el) === '退勤'
        );


    for (
      const node
      of leaveNodes
    ) {

      let parent =
        node;


      for (
        let level = 0;
        level < 8 &&
        parent;
        level++,
        parent =
          parent.parentElement
      ) {

        const times =
          extractTimes(
            parent.textContent
          );


        if (
          times.length
        ) {
          return times[
            times.length - 1
          ];
        }
      }
    }


    return null;
  }


  /* =========================================================
     DOM SYNC - 5 sec
  ========================================================= */

  function syncFromTaskChute() {

    const player =
      findCurrentPlayer();


    if (player) {

      state.currentTask =
        player.task;


      const elapsedSeconds =
        hmsToSeconds(
          player.elapsed
        );


      if (
        elapsedSeconds !== null
      ) {

        state.elapsedBase =
          elapsedSeconds;


        state.elapsedCapturedAt =
          Date.now();
      }
    }


    const rows =
      getScheduleRows();


    const neighbours =
      getNeighbours(
        state.currentTask
      );


    state.previous =
      neighbours.previous;


    state.next =
      neighbours.next;


    const leaveTime =
      findLeaveTime(
        rows
      );


    if (leaveTime) {

      state.leaveTime =
        leaveTime;
    }


    state.lastSync =
      Date.now();
  }


  /* =========================================================
     LIVE ELAPSED
  ========================================================= */

  function getElapsedSeconds() {

    if (
      state.elapsedBase === null ||
      state.elapsedCapturedAt === null
    ) {
      return null;
    }


    const passed =
      Math.floor(
        (
          Date.now() -
          state.elapsedCapturedAt
        ) / 1000
      );


    return (
      state.elapsedBase +
      passed
    );
  }


  function getStartTime() {

    const elapsed =
      getElapsedSeconds();


    if (
      elapsed === null
    )
      return '--:--';


    const start =
      new Date(
        Date.now() -
        elapsed * 1000
      );


    return (
      pad(
        start.getHours()
      ) +
      ':' +
      pad(
        start.getMinutes()
      )
    );
  }


  /* =========================================================
     RE-RUN
     再実行しても閉じない。
     UIだけ再生成する。
  ========================================================= */

  if (
    window.tcNowRenderTimer
  ) {

    clearInterval(
      window.tcNowRenderTimer
    );
  }


  if (
    window.tcNowSyncTimer
  ) {

    clearInterval(
      window.tcNowSyncTimer
    );
  }


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


  /* =========================================================
     VIEWPORT / SAFE AREA
  ========================================================= */

  let viewport =
    document.querySelector(
      'meta[name="viewport"]'
    );


  if (!viewport) {

    viewport =
      document.createElement(
        'meta'
      );


    viewport.name =
      'viewport';


    viewport.content =
      'width=device-width,initial-scale=1,viewport-fit=cover';


    document.head.appendChild(
      viewport
    );

  } else {

    let content =
      viewport.getAttribute(
        'content'
      ) ||
      'width=device-width,initial-scale=1';


    if (
      !content.includes(
        'viewport-fit=cover'
      )
    ) {

      content +=
        ',viewport-fit=cover';


      viewport.setAttribute(
        'content',
        content
      );
    }
  }


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

    html,
    body {
      background:
        #07090d !important;
    }


    #${ROOT_ID},
    #${ROOT_ID} * {
      box-sizing:
        border-box;
    }


    #${ROOT_ID} {

      --bg:
        #07090d;

      --panel:
        #1a2029;

      --panel2:
        #0d1016;

      --text:
        #f7f7f8;

      --muted:
        #979ba5;

      --dim:
        #4b4f59;


      position:
        fixed;

      inset:
        0;

      z-index:
        2147483647;

      width:
        100vw;

      height:
        100dvh;

      overflow:
        hidden;

      background:
        var(--bg);

      color:
        var(--text);

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Helvetica Neue",
        "Hiragino Sans",
        "Yu Gothic",
        sans-serif;

      padding:
        max(
          8px,
          env(safe-area-inset-top)
        )
        max(
          12px,
          env(safe-area-inset-right)
        )
        max(
          8px,
          env(safe-area-inset-bottom)
        )
        max(
          12px,
          env(safe-area-inset-left)
        );
    }


    #tc-layout {

      width:
        100%;

      height:
        100%;

      display:
        grid;

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

      min-width:
        0;

      display:
        grid;

      grid-template-columns:
        minmax(150px, .82fr)
        minmax(190px, 1fr)
        minmax(120px, .65fr);

      align-items:
        center;

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

      font-weight:
        800;

      letter-spacing:
        .12em;

      white-space:
        nowrap;
    }


    #tc-leave {

      font-size:
        clamp(
          17px,
          2.6vw,
          30px
        );

      font-weight:
        800;

      line-height:
        1.32;

      font-variant-numeric:
        tabular-nums;

      white-space:
        nowrap;
    }


    .tc-leave-row {

      display:
        grid;

      grid-template-columns:
        max-content
        max-content;

      gap:
        .4em;
    }


    #tc-clock {

      justify-self:
        end;

      font-size:
        clamp(
          38px,
          6.8vw,
          78px
        );

      font-weight:
        800;

      line-height:
        1;

      letter-spacing:
        -.04em;

      font-variant-numeric:
        tabular-nums;

      white-space:
        nowrap;
    }


    /* MAIN */

    #tc-main {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

      grid-template-columns:
        minmax(0, 1.65fr)
        minmax(220px, .9fr);

      gap:
        clamp(
          12px,
          2.4vw,
          30px
        );
    }


    /* NOW */

    #tc-now {

      position:
        relative;

      min-width:
        0;

      min-height:
        0;

      overflow:
        hidden;

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

      display:
        flex;

      flex-direction:
        column;

      justify-content:
        center;
    }


    #tc-now::before {

      content:
        "";

      position:
        absolute;

      left:
        0;

      top:
        0;

      bottom:
        0;

      width:
        clamp(
          7px,
          .9vw,
          14px
        );

      background:
        white;
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

      font-weight:
        900;

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


    .tc-metric {

      display:
        flex;

      align-items:
        baseline;

      gap:
        clamp(
          12px,
          1.8vw,
          24px
        );

      min-width:
        0;
    }


    .tc-metric-label {

      color:
        #747985;

      font-size:
        clamp(
          12px,
          1.65vw,
          21px
        );

      font-weight:
        900;

      letter-spacing:
        .22em;

      white-space:
        nowrap;
    }


    .tc-metric-value {

      color:
        #c6cad2;

      font-size:
        clamp(
          22px,
          3.5vw,
          44px
        );

      font-weight:
        500;

      font-variant-numeric:
        tabular-nums;

      white-space:
        nowrap;
    }


    #tc-start-row {

      margin-bottom:
        clamp(
          9px,
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

      font-weight:
        900;

      line-height:
        1.07;

      overflow-wrap:
        anywhere;
    }


    #tc-elapsed-row {

      margin-top:
        clamp(
          10px,
          2.5vh,
          25px
        );
    }


    /* SIDE */

    #tc-side {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

      grid-template-rows:
        minmax(0, .78fr)
        minmax(0, 1.22fr);

      gap:
        clamp(
          10px,
          2vh,
          20px
        );
    }


    .tc-card {

      min-width:
        0;

      min-height:
        0;

      overflow:
        hidden;

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

      display:
        flex;

      flex-direction:
        column;

      justify-content:
        center;
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

      font-weight:
        900;

      letter-spacing:
        .18em;

      margin-bottom:
        clamp(
          8px,
          2vh,
          20px
        );
    }


    .tc-task-row {

      min-width:
        0;

      display:
        grid;

      grid-template-columns:
        max-content
        minmax(0, 1fr);

      align-items:
        baseline;

      column-gap:
        clamp(
          10px,
          1.5vw,
          20px
        );

      min-height:
        1.65em;
    }


    .tc-task-row-time,
    .tc-task-row-name {

      color:
        #707580;

      font-size:
        clamp(
          17px,
          2.8vw,
          34px
        );
    }


    .tc-task-row-time {

      white-space:
        nowrap;

      font-variant-numeric:
        tabular-nums;
    }


    .tc-task-row-name {

      min-width:
        0;

      font-weight:
        700;

      white-space:
        nowrap;

      overflow:
        hidden;

      text-overflow:
        ellipsis;
    }


    #tc-next-list {

      display:
        grid;

      gap:
        clamp(
          3px,
          .7vh,
          8px
        );
    }


    #tc-version {

      position:
        absolute;

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
       iPHONE LANDSCAPE
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

        gap:
          1.8dvh;
      }


      #tc-header {

        grid-template-columns:
          minmax(110px, .8fr)
          minmax(150px, 1fr)
          minmax(100px, .55fr);

        gap:
          1.7vw;
      }


      #tc-brand {

        font-size:
          clamp(
            10px,
            3.3dvh,
            17px
          );
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
          minmax(185px, .88fr);

        gap:
          1.6vw;
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


      .tc-metric {

        gap:
          clamp(
            8px,
            1.3vw,
            15px
          );
      }


      .tc-metric-label {

        font-size:
          clamp(
            9px,
            3dvh,
            15px
          );
      }


      .tc-metric-value {

        font-size:
          clamp(
            16px,
            5dvh,
            25px
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


      #tc-elapsed-row {

        margin-top:
          clamp(
            4px,
            1.4dvh,
            8px
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


      .tc-task-row-time,
      .tc-task-row-name {

        font-size:
          clamp(
            13px,
            4.1dvh,
            21px
          );
      }


      #tc-next-list {

        gap:
          1dvh;
      }
    }


    /* =====================================================
       PORTRAIT
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

        gap:
          9px;
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

        display:
          flex;

        gap:
          20px;
      }


      #tc-main {

        grid-template-columns:
          1fr;

        grid-template-rows:
          minmax(0, 1fr)
          auto;

        gap:
          12px;
      }


      #tc-side {

        grid-template-columns:
          1fr 1fr;

        grid-template-rows:
          auto;

        gap:
          9px;
      }


      .tc-card {

        padding:
          14px;
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
          TaskChute NOW
        </div>


        <div id="tc-leave">

          <div class="tc-leave-row">

            <span>
              退勤
            </span>

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


          <div
            id="tc-start-row"
            class="tc-metric">

            <span
              class="tc-metric-label">
              START
            </span>

            <span
              id="tc-start"
              class="tc-metric-value">
              --:--
            </span>

          </div>


          <div id="tc-task">
            タスクを取得できません
          </div>


          <div
            id="tc-elapsed-row"
            class="tc-metric">

            <span
              class="tc-metric-label">
              ELAPSED
            </span>

            <span
              id="tc-elapsed"
              class="tc-metric-value">
              --:--:--
            </span>

          </div>

        </section>


        <aside id="tc-side">

          <section class="tc-card">

            <div class="tc-card-label">
              PREVIOUS
            </div>


            <div class="tc-task-row">

              <span
                id="tc-prev-time"
                class="tc-task-row-time">
                —
              </span>

              <span
                id="tc-prev-task"
                class="tc-task-row-name">
                —
              </span>

            </div>

          </section>


          <section class="tc-card">

            <div class="tc-card-label">
              NEXT
            </div>


            <div id="tc-next-list">

              <div class="tc-task-row">

                <span
                  id="tc-next-time-0"
                  class="tc-task-row-time">
                  —
                </span>

                <span
                  id="tc-next-task-0"
                  class="tc-task-row-name">
                  —
                </span>

              </div>


              <div class="tc-task-row">

                <span
                  id="tc-next-time-1"
                  class="tc-task-row-time">
                  —
                </span>

                <span
                  id="tc-next-task-1"
                  class="tc-task-row-name">
                  —
                </span>

              </div>


              <div class="tc-task-row">

                <span
                  id="tc-next-time-2"
                  class="tc-task-row-time">
                  —
                </span>

                <span
                  id="tc-next-task-2"
                  class="tc-task-row-name">
                  —
                </span>

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
     RENDER
  ========================================================= */

  const $ =
    id =>
      document.getElementById(
        id
      );


  function render() {

    const now =
      new Date();


    /* ---------- CLOCK ---------- */

    $('tc-clock')
      .textContent =
        pad(
          now.getHours()
        ) +
        ':' +
        pad(
          now.getMinutes()
        );


    /* ---------- CURRENT ---------- */

    $('tc-task')
      .textContent =
        state.currentTask ||
        'タスクを取得できません';


    $('tc-start')
      .textContent =
        getStartTime();


    const elapsed =
      getElapsedSeconds();


    $('tc-elapsed')
      .textContent =
        secondsToHMS(
          elapsed
        );


    /* ---------- PREVIOUS ---------- */

    $('tc-prev-time')
      .textContent =
        state.previous?.time ||
        '—';


    $('tc-prev-task')
      .textContent =
        state.previous?.task ||
        '—';


    /* ---------- NEXT 3 ---------- */

    for (
      let i = 0;
      i < 3;
      i++
    ) {

      const row =
        state.next[i];


      $(
        `tc-next-time-${i}`
      )
        .textContent =
          row?.time ||
          '—';


      $(
        `tc-next-task-${i}`
      )
        .textContent =
          row?.task ||
          '—';
    }


    /* ---------- LEAVE ---------- */

    $('tc-leave-time')
      .textContent =
        state.leaveTime ||
        '--:--';


    if (
      !state.leaveTime
    ) {

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
      state.leaveTime
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
          leaveDate.getTime() -
          now.getTime()
        ) / 1000
      );


    if (diff >= 0) {

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
          (
            diff % 3600
          ) / 60
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

  /*
    NOW表示直前に一度実DOMを取得。
  */

  syncFromTaskChute();


  render();


  /*
    表示：
    1秒更新
  */

  window.tcNowRenderTimer =
    setInterval(
      render,
      RENDER_INTERVAL
    );


  /*
    TaskChute：
    5秒ごと再同期
  */

  window.tcNowSyncTimer =
    setInterval(
      () => {

        syncFromTaskChute();

        render();

      },
      SYNC_INTERVAL
    );

})();
