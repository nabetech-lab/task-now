(() => {
  'use strict';

  /* =========================================================
     TaskChute NOW v3.5.0
  ========================================================= */

  const VERSION = '3.5.0';

  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  const SYNC_INTERVAL = 5000;
  const RENDER_INTERVAL = 1000;


  /* =========================================================
     UTIL
  ========================================================= */

  const clean = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();


  const pad = n =>
    String(n).padStart(2, '0');


  const isInsideNow = el =>
    !!el?.closest?.('#' + ROOT_ID);


  const isHM = value =>
    /^\d{1,2}:\d{2}$/.test(clean(value));


  const isHMS = value =>
    /^\d{2}:\d{2}:\d{2}$/.test(clean(value));


  const text = el =>
    clean(el?.textContent);


  function hmsToSeconds(value) {

    const m =
      clean(value).match(
        /^(\d{1,2}):(\d{2}):(\d{2})$/
      );

    if (!m)
      return null;

    return (
      Number(m[1]) * 3600 +
      Number(m[2]) * 60 +
      Number(m[3])
    );
  }


  /*
    TaskChuteの見積時間
    00:10 = 10分
    01:30 = 1時間30分
  */

  function durationToSeconds(value) {

    const m =
      clean(value).match(
        /^(\d{1,2}):(\d{2})$/
      );

    if (!m)
      return null;

    return (
      Number(m[1]) * 3600 +
      Number(m[2]) * 60
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
      Math.floor(
        seconds / 3600
      );

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


  function addDurationToTime(
    startTime,
    seconds
  ) {

    if (
      !startTime ||
      seconds === null
    ) {
      return '--:--';
    }

    const parts =
      startTime
        .split(':')
        .map(Number);

    if (
      parts.length !== 2 ||
      Number.isNaN(parts[0]) ||
      Number.isNaN(parts[1])
    ) {
      return '--:--';
    }

    const d =
      new Date();

    d.setHours(
      parts[0],
      parts[1],
      0,
      0
    );

    d.setSeconds(
      d.getSeconds() +
      seconds
    );

    return (
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }


  function validTaskName(value) {

    const t =
      clean(value);

    if (!t)
      return false;

    if (
      t.length > 150 ||
      isHM(t) ||
      isHMS(t)
    ) {
      return false;
    }

    if (
      /^[-\d\s:./]+$/.test(t)
    ) {
      return false;
    }

    return true;
  }


  /* =========================================================
     STATE
  ========================================================= */

  const state = {

    currentTask: null,

    currentStart: null,

    plannedSeconds: null,

    elapsedBase: null,

    elapsedCapturedAt: null,

    previous: null,

    next: [],

    leaveTime: null
  };


  /* =========================================================
     CURRENT PLAYER
     下部プレイヤーから
     CURRENT TASK + ELAPSEDを取得
  ========================================================= */

  function findCurrentPlayer() {

    const elapsedElements =
      [
        ...document.querySelectorAll(
          'div, p, span'
        )
      ]
        .filter(el => {

          if (
            isInsideNow(el)
          ) {
            return false;
          }

          return isHMS(
            text(el)
          );
        });


    const candidates = [];


    for (
      const elapsedEl
      of elapsedElements
    ) {

      /*
        実機で確認済み構造

        elapsed
          parent
          parent
          previousElementSibling
          ↓
        current task
      */

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
      ) {
        continue;
      }


      const rect =
        elapsedEl
          .getBoundingClientRect();


      candidates.push({

        task:
          taskName,

        elapsed:
          clean(
            elapsedEl.textContent
          ),

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
      下にあるプレイヤーを優先
    */

    candidates.sort(
      (a, b) => {

        if (
          a.visible !==
          b.visible
        ) {
          return (
            a.visible
              ? -1
              : 1
          );
        }

        return (
          b.top -
          a.top
        );
      }
    );


    return candidates[0];
  }


  /* =========================================================
     SCHEDULE ROW
  ========================================================= */

  function getTaskRowElements() {

    return [
      ...document.querySelectorAll(
        'div.MuiBox-root.my-0'
      )
    ]
      .filter(el => {

        if (
          isInsideNow(el)
        ) {
          return false;
        }

        const r =
          el.getBoundingClientRect();

        /*
          実機で確認した予定タスク名領域
        */

        return (
          r.left >= -20 &&
          r.left <= 150 &&
          r.width >= 250 &&
          r.width <= 1800 &&
          r.height >= 22 &&
          r.height <= 48
        );
      });
  }


  /*
    タスク名DIVの親行を取得
  */

  function findScheduleRow(
    taskName
  ) {

    if (!taskName)
      return null;


    const candidates =
      getTaskRowElements()
        .filter(el =>
          clean(el.textContent) ===
          taskName
        );


    for (
      const taskEl
      of candidates
    ) {

      const row =
        taskEl.parentElement;

      if (!row)
        continue;


      const rowText =
        clean(
          row.textContent
        );


      if (
        rowText.length >
        taskName.length
      ) {
        return {
          taskEl,
          row
        };
      }
    }


    return null;
  }


  /* =========================================================
     ROW LEAVES
     実DOMで確認：

     0 タスク名
     1 START
     2 FINISH
     3 プロジェクト
     4 モード
     5 ELAPSED
     6 PLANNED
     7 ...
  ========================================================= */

  function getRowLeafValues(
    row
  ) {

    if (!row)
      return [];


    return [
      ...row.querySelectorAll('*')
    ]
      .filter(el =>
        el.children.length === 0 &&
        clean(el.textContent)
      )
      .map(el => ({
        value:
          clean(el.textContent),

        tag:
          el.tagName,

        el
      }));
  }


  /* =========================================================
     CURRENT SCHEDULE INFO
  ========================================================= */

  function getCurrentScheduleInfo(
    currentTask
  ) {

    const found =
      findScheduleRow(
        currentTask
      );


    if (!found)
      return null;


    const leaves =
      getRowLeafValues(
        found.row
      );


    /*
      実測例：

      0 夜の薬を飲む
      1 19:25
      2 --:--:--
      3 プロジェクト
      4 モード
      5 00:09
      6 00:10
      7 --:--
    */


    let start =
      null;


    let finish =
      null;


    let planned =
      null;


    if (
      leaves[1] &&
      isHM(
        leaves[1].value
      )
    ) {
      start =
        leaves[1].value;
    }


    if (leaves[2]) {

      const v =
        leaves[2].value;

      if (
        isHM(v) ||
        isHMS(v)
      ) {
        finish = v;
      }
    }


    /*
      PLANNEDは実DOM上、
      6番目のleaf。

      かつBUTTON。
    */

    if (
      leaves[6] &&
      isHM(
        leaves[6].value
      )
    ) {
      planned =
        leaves[6].value;
    }


    /*
      念のためfallback。

      STARTより後にあるBUTTONのHH:MMのうち
      最後のものを見積候補とする。
    */

    if (!planned) {

      const buttonDurations =
        leaves
          .filter(
            x =>
              x.tag === 'BUTTON' &&
              isHM(x.value)
          )
          .map(
            x =>
              x.value
          );


      if (
        buttonDurations.length >= 2
      ) {
        planned =
          buttonDurations[
            buttonDurations.length - 1
          ];
      }
    }


    return {

      start,

      finish,

      planned,

      plannedSeconds:
        planned
          ? durationToSeconds(
              planned
            )
          : null
    };
  }


  /* =========================================================
     SCHEDULE LIST
  ========================================================= */

  function getScheduleRows() {

    const rows = [];


    for (
      const taskEl
      of getTaskRowElements()
    ) {

      const task =
        clean(
          taskEl.textContent
        );


      if (
        !validTaskName(task)
      )
        continue;


      const row =
        taskEl.parentElement;


      if (!row)
        continue;


      const rowText =
        clean(
          row.textContent
        );


      if (
        rowText === task ||
        rowText.length <
          task.length + 3
      ) {
        continue;
      }


      const rect =
        taskEl
          .getBoundingClientRect();


      const leaves =
        getRowLeafValues(
          row
        );


      /*
        START
      */

      let start =
        null;


      if (
        leaves[1] &&
        isHM(
          leaves[1].value
        )
      ) {
        start =
          leaves[1].value;
      }


      /*
        FINISH
      */

      let finish =
        null;


      if (
        leaves[2] &&
        (
          isHM(
            leaves[2].value
          ) ||
          isHMS(
            leaves[2].value
          )
        )
      ) {
        finish =
          leaves[2].value;
      }


      /*
        実績時間
        実機ではleaf 5
      */

      let actualDuration =
        null;


      if (
        leaves[5] &&
        isHM(
          leaves[5].value
        )
      ) {
        actualDuration =
          leaves[5].value;
      }


      /*
        見積
        実機ではleaf 6
      */

      let planned =
        null;


      if (
        leaves[6] &&
        isHM(
          leaves[6].value
        )
      ) {
        planned =
          leaves[6].value;
      }


      /*
        NEXT用の予定開始時刻。

        未実行タスクでは行末のHH:MM。
      */

      let scheduleTime =
        null;


      const HMvalues =
        leaves
          .map(x => x.value)
          .filter(isHM);


      /*
        STARTが未設定のタスクでは、
        最後のHH:MMを予定時刻とする。
      */

      if (!start) {

        const last =
          HMvalues[
            HMvalues.length - 1
          ];


        if (last)
          scheduleTime =
            last;

      } else {

        scheduleTime =
          start;
      }


      rows.push({

        task,

        start,

        finish,

        actualDuration,

        planned,

        scheduleTime,

        top:
          rect.top
      });
    }


    rows.sort(
      (a, b) =>
        a.top -
        b.top
    );


    /*
      nested重複除去
    */

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


      if (!duplicate)
        unique.push(row);
    }


    return unique;
  }


  /* =========================================================
     PREVIOUS + NEXT
  ========================================================= */

  function getNeighbours(
    rows,
    currentTask
  ) {

    const index =
      rows.findIndex(
        x =>
          x.task ===
          currentTask
      );


    if (
      index < 0
    ) {
      return {
        previous: null,
        next: []
      };
    }


    return {

      previous:
        index > 0
          ? rows[
              index - 1
            ]
          : null,

      next:
        rows.slice(
          index + 1,
          index + 4
        )
    };
  }


  /* =========================================================
     LEAVE TIME
  ========================================================= */

  function getLeaveTime(
    rows
  ) {

    const leave =
      rows.find(
        x =>
          x.task === '退勤'
      );


    if (!leave)
      return null;


    /*
      未実行なら予定時刻
      完了済みなら開始時刻
    */

    return (
      leave.scheduleTime ||
      leave.start ||
      null
    );
  }


  /* =========================================================
     SYNC
  ========================================================= */

  function sync() {

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


    /*
      NOWのSTART / PLANNED
    */

    if (
      state.currentTask
    ) {

      const info =
        getCurrentScheduleInfo(
          state.currentTask
        );


      if (info) {

        if (info.start)
          state.currentStart =
            info.start;


        if (
          info.plannedSeconds !==
          null
        ) {
          state.plannedSeconds =
            info.plannedSeconds;
        }
      }
    }


    /*
      一覧
    */

    const rows =
      getScheduleRows();


    const neighbours =
      getNeighbours(
        rows,
        state.currentTask
      );


    state.previous =
      neighbours.previous;


    state.next =
      neighbours.next;


    const leave =
      getLeaveTime(
        rows
      );


    if (leave)
      state.leaveTime =
        leave;
  }


  /* =========================================================
     LIVE VALUES
  ========================================================= */

  function getElapsedSeconds() {

    if (
      state.elapsedBase === null ||
      state.elapsedCapturedAt === null
    ) {
      return null;
    }


    return (
      state.elapsedBase +
      Math.floor(
        (
          Date.now() -
          state.elapsedCapturedAt
        ) / 1000
      )
    );
  }


  function getPlannedEnd() {

    if (
      !state.currentStart ||
      state.plannedSeconds === null
    ) {
      return '--:--';
    }


    return addDurationToTime(
      state.currentStart,
      state.plannedSeconds
    );
  }


  /* =========================================================
     CLEAN OLD INSTANCE
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


  document
    .getElementById(
      ROOT_ID
    )
    ?.remove();


  document
    .getElementById(
      STYLE_ID
    )
    ?.remove();


  /* =========================================================
     VIEWPORT
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

    document.head
      .appendChild(
        viewport
      );

  } else {

    let content =
      viewport.getAttribute(
        'content'
      ) || '';


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
        #f5f5f7;

      --muted:
        #858a96;

      --dim:
        #555a66;


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


    /* ============================
       HEADER
    ============================ */

    #tc-header {

      display:
        grid;

      grid-template-columns:
        minmax(170px, .85fr)
        minmax(220px, 1fr)
        minmax(130px, .7fr);

      align-items:
        center;

      gap:
        2vw;
    }


    #tc-brand {

      color:
        var(--muted);

      font-size:
        clamp(
          14px,
          2.2vw,
          28px
        );

      font-weight:
        800;

      letter-spacing:
        .13em;

      white-space:
        nowrap;
    }


    #tc-leave {

      font-size:
        clamp(
          16px,
          2.5vw,
          29px
        );

      font-weight:
        800;

      line-height:
        1.32;

      font-variant-numeric:
        tabular-nums;
    }


    .tc-leave-row {

      display:
        grid;

      grid-template-columns:
        3.1em
        max-content;

      column-gap:
        .45em;
    }


    #tc-clock {

      justify-self:
        end;

      font-size:
        clamp(
          40px,
          6.7vw,
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
    }


    /* ============================
       MAIN
    ============================ */

    #tc-main {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

      grid-template-columns:
        minmax(0, 1.65fr)
        minmax(250px, .9fr);

      gap:
        clamp(
          12px,
          2.4vw,
          30px
        );
    }


    /* ============================
       NOW
    ============================ */

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
          4vh,
          45px
        )
        clamp(
          28px,
          4vw,
          60px
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

      top:
        0;

      bottom:
        0;

      left:
        0;

      width:
        clamp(
          7px,
          .8vw,
          13px
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
        #101218;

      font-size:
        clamp(
          14px,
          2vw,
          25px
        );

      font-weight:
        900;

      letter-spacing:
        .18em;

      border-radius:
        18px;

      padding:
        9px
        20px;

      margin-bottom:
        clamp(
          12px,
          3vh,
          30px
        );
    }


    /*
      ここが今回の重要点。

      全数値を同じ列から開始。
    */

    .tc-now-metric {

      display:
        grid;

      grid-template-columns:
        clamp(
          150px,
          15vw,
          210px
        )
        minmax(0, 1fr);

      align-items:
        baseline;

      column-gap:
        clamp(
          12px,
          1.7vw,
          24px
        );

      min-width:
        0;
    }


    .tc-now-label {

      color:
        var(--muted);

      font-size:
        clamp(
          12px,
          1.65vw,
          20px
        );

      font-weight:
        900;

      letter-spacing:
        .2em;

      white-space:
        nowrap;
    }


    .tc-now-value {

      color:
        #c7cad2;

      font-size:
        clamp(
          22px,
          3.2vw,
          42px
        );

      font-weight:
        500;

      font-variant-numeric:
        tabular-nums;

      white-space:
        nowrap;
    }


    #tc-task {

      margin:
        clamp(
          8px,
          1.6vh,
          18px
        )
        0;

      font-size:
        clamp(
          31px,
          5.1vw,
          66px
        );

      font-weight:
        900;

      line-height:
        1.08;

      overflow-wrap:
        anywhere;
    }


    #tc-progress {

      display:
        grid;

      gap:
        clamp(
          4px,
          .8vh,
          9px
        );
    }


    #tc-status-row {

      margin-top:
        clamp(
          3px,
          .8vh,
          8px
        );
    }


    #tc-status-label.tc-over {

      color:
        white;
    }


    #tc-status-value.tc-over {

      color:
        white;

      font-weight:
        700;
    }


    /* ============================
       SIDE
    ============================ */

    #tc-side {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

      grid-template-rows:
        minmax(0, .85fr)
        minmax(0, 1.15fr);

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
          28px
        )
        clamp(
          18px,
          2.5vw,
          32px
        );

      display:
        flex;

      flex-direction:
        column;

      justify-content:
        center;
    }


    .tc-card-title {

      color:
        var(--dim);

      font-size:
        clamp(
          12px,
          1.65vw,
          20px
        );

      font-weight:
        900;

      letter-spacing:
        .18em;

      margin-bottom:
        clamp(
          8px,
          1.5vh,
          15px
        );
    }


    /* ============================
       PREVIOUS
    ============================ */

    #tc-prev-task {

      color:
        #767b86;

      font-size:
        clamp(
          20px,
          3vw,
          36px
        );

      font-weight:
        800;

      margin-bottom:
        clamp(
          9px,
          1.7vh,
          18px
        );

      white-space:
        nowrap;

      overflow:
        hidden;

      text-overflow:
        ellipsis;
    }


    .tc-prev-metric {

      display:
        grid;

      grid-template-columns:
        clamp(
          85px,
          8vw,
          120px
        )
        minmax(0, 1fr);

      align-items:
        baseline;

      column-gap:
        12px;

      margin:
        2px 0;
    }


    .tc-prev-label {

      color:
        #555a66;

      font-size:
        clamp(
          11px,
          1.45vw,
          18px
        );

      font-weight:
        900;

      letter-spacing:
        .18em;
    }


    .tc-prev-value {

      color:
        #747985;

      font-size:
        clamp(
          18px,
          2.6vw,
          32px
        );

      font-variant-numeric:
        tabular-nums;

      white-space:
        nowrap;
    }


    /* ============================
       NEXT
    ============================ */

    #tc-next-list {

      display:
        grid;

      gap:
        clamp(
          5px,
          .8vh,
          10px
        );
    }


    .tc-next-row {

      display:
        grid;

      grid-template-columns:
        max-content
        minmax(0, 1fr);

      column-gap:
        clamp(
          10px,
          1.4vw,
          18px
        );

      align-items:
        baseline;
    }


    .tc-next-time,
    .tc-next-task {

      color:
        #747985;

      font-size:
        clamp(
          18px,
          2.7vw,
          33px
        );
    }


    .tc-next-time {

      font-variant-numeric:
        tabular-nums;

      white-space:
        nowrap;
    }


    .tc-next-task {

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
    }


    /* ============================
       iPHONE LANDSCAPE
    ============================ */

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


      #tc-brand {

        font-size:
          clamp(
            10px,
            3.2dvh,
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
      }


      #tc-clock {

        font-size:
          clamp(
            29px,
            11.5dvh,
            58px
          );
      }


      #tc-main {

        grid-template-columns:
          minmax(0, 1.65fr)
          minmax(190px, .9fr);

        gap:
          1.6vw;
      }


      #tc-now {

        padding:
          2.2dvh
          3vw;

        border-radius:
          clamp(
            13px,
            5dvh,
            25px
          );
      }


      #tc-now-badge {

        font-size:
          clamp(
            10px,
            3.2dvh,
            16px
          );

        padding:
          1.2dvh
          1.4vw;

        margin-bottom:
          1.7dvh;
      }


      .tc-now-metric {

        grid-template-columns:
          clamp(
            100px,
            12vw,
            145px
          )
          minmax(0, 1fr);

        column-gap:
          1.2vw;
      }


      .tc-now-label {

        font-size:
          clamp(
            9px,
            2.9dvh,
            14px
          );
      }


      .tc-now-value {

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
            7.4dvh,
            39px
          );

        margin:
          1.2dvh
          0;

        line-height:
          1;
      }


      #tc-progress {

        gap:
          .4dvh;
      }


      #tc-side {

        gap:
          1.8dvh;
      }


      .tc-card {

        padding:
          1.4dvh
          1.4vw;

        border-radius:
          clamp(
            11px,
            4dvh,
            21px
          );
      }


      .tc-card-title {

        font-size:
          clamp(
            9px,
            3dvh,
            15px
          );

        margin-bottom:
          1.1dvh;
      }


      #tc-prev-task {

        font-size:
          clamp(
            15px,
            5dvh,
            25px
          );

        margin-bottom:
          1dvh;
      }


      .tc-prev-metric {

        grid-template-columns:
          clamp(
            65px,
            6.5vw,
            90px
          )
          1fr;

        margin:
          .25dvh 0;
      }


      .tc-prev-label {

        font-size:
          clamp(
            8px,
            2.7dvh,
            13px
          );
      }


      .tc-prev-value {

        font-size:
          clamp(
            13px,
            4.1dvh,
            21px
          );
      }


      .tc-next-time,
      .tc-next-task {

        font-size:
          clamp(
            13px,
            4.1dvh,
            21px
          );
      }


      #tc-next-list {

        gap:
          .7dvh;
      }
    }
  `;


  document.head
    .appendChild(
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


          <div class="tc-now-metric">

            <span class="tc-now-label">
              START
            </span>

            <span
              id="tc-start"
              class="tc-now-value">
              --:--
            </span>

          </div>


          <div id="tc-task">
            タスクを取得できません
          </div>


          <div id="tc-progress">

            <div class="tc-now-metric">

              <span class="tc-now-label">
                PLANNED END
              </span>

              <span
                id="tc-planned-end"
                class="tc-now-value">
                --:--
              </span>

            </div>


            <div class="tc-now-metric">

              <span class="tc-now-label">
                ELAPSED
              </span>

              <span
                id="tc-elapsed"
                class="tc-now-value">
                --:--:--
              </span>

            </div>


            <div class="tc-now-metric">

              <span class="tc-now-label">
                PLANNED
              </span>

              <span
                id="tc-planned"
                class="tc-now-value">
                --:--:--
              </span>

            </div>


            <div
              id="tc-status-row"
              class="tc-now-metric">

              <span
                id="tc-status-label"
                class="tc-now-label">
                REMAINING
              </span>

              <span
                id="tc-status-value"
                class="tc-now-value">
                --:--:--
              </span>

            </div>

          </div>

        </section>


        <aside id="tc-side">

          <section class="tc-card">

            <div class="tc-card-title">
              PREVIOUS
            </div>


            <div id="tc-prev-task">
              —
            </div>


            <div class="tc-prev-metric">

              <span class="tc-prev-label">
                START
              </span>

              <span
                id="tc-prev-start"
                class="tc-prev-value">
                —
              </span>

            </div>


            <div class="tc-prev-metric">

              <span class="tc-prev-label">
                FINISH
              </span>

              <span
                id="tc-prev-finish"
                class="tc-prev-value">
                —
              </span>

            </div>


            <div class="tc-prev-metric">

              <span class="tc-prev-label">
                ELAPSED
              </span>

              <span
                id="tc-prev-elapsed"
                class="tc-prev-value">
                —
              </span>

            </div>

          </section>


          <section class="tc-card">

            <div class="tc-card-title">
              NEXT
            </div>


            <div id="tc-next-list">

              <div class="tc-next-row">
                <span
                  id="tc-next-time-0"
                  class="tc-next-time">
                  —
                </span>

                <span
                  id="tc-next-task-0"
                  class="tc-next-task">
                  —
                </span>
              </div>


              <div class="tc-next-row">
                <span
                  id="tc-next-time-1"
                  class="tc-next-time">
                  —
                </span>

                <span
                  id="tc-next-task-1"
                  class="tc-next-task">
                  —
                </span>
              </div>


              <div class="tc-next-row">
                <span
                  id="tc-next-time-2"
                  class="tc-next-time">
                  —
                </span>

                <span
                  id="tc-next-task-2"
                  class="tc-next-task">
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


  document.body
    .appendChild(
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


    /* CLOCK */

    $('tc-clock')
      .textContent =
        pad(
          now.getHours()
        ) +
        ':' +
        pad(
          now.getMinutes()
        );


    /* CURRENT TASK */

    $('tc-task')
      .textContent =
        state.currentTask ||
        'タスクを取得できません';


    $('tc-start')
      .textContent =
        state.currentStart ||
        '--:--';


    $('tc-planned-end')
      .textContent =
        getPlannedEnd();


    const elapsed =
      getElapsedSeconds();


    $('tc-elapsed')
      .textContent =
        secondsToHMS(
          elapsed
        );


    $('tc-planned')
      .textContent =
        secondsToHMS(
          state.plannedSeconds
        );


    /* REMAINING / OVER */

    const statusLabel =
      $('tc-status-label');


    const statusValue =
      $('tc-status-value');


    if (
      elapsed !== null &&
      state.plannedSeconds !== null
    ) {

      const diff =
        state.plannedSeconds -
        elapsed;


      if (
        diff >= 0
      ) {

        statusLabel
          .textContent =
            'REMAINING';


        statusValue
          .textContent =
            secondsToHMS(
              diff
            );


        statusLabel
          .classList
          .remove(
            'tc-over'
          );


        statusValue
          .classList
          .remove(
            'tc-over'
          );

      } else {

        statusLabel
          .textContent =
            'OVER';


        statusValue
          .textContent =
            secondsToHMS(
              Math.abs(diff)
            );


        statusLabel
          .classList
          .add(
            'tc-over'
          );


        statusValue
          .classList
          .add(
            'tc-over'
          );
      }

    } else {

      statusLabel
        .textContent =
          'REMAINING';


      statusValue
        .textContent =
          '--:--:--';
    }


    /* PREVIOUS */

    const prev =
      state.previous;


    $('tc-prev-task')
      .textContent =
        prev?.task ||
        '—';


    $('tc-prev-start')
      .textContent =
        prev?.start ||
        '—';


    let prevFinish =
      prev?.finish ||
      '—';


    /*
      --:--:-- は未完了扱い
    */

    if (
      prevFinish === '--:--:--'
    ) {
      prevFinish = '—';
    }


    $('tc-prev-finish')
      .textContent =
        prevFinish;


    /*
      TaskChuteの実績時間はHH:MMなので、
      表示はHH:MM:00にする。
    */

    let prevElapsed =
      '—';


    if (
      prev?.actualDuration
    ) {

      const sec =
        durationToSeconds(
          prev.actualDuration
        );


      if (
        sec !== null
      ) {
        prevElapsed =
          secondsToHMS(
            sec
          );
      }
    }


    $('tc-prev-elapsed')
      .textContent =
        prevElapsed;


    /* NEXT */

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
          row?.scheduleTime ||
          '—';


      $(
        `tc-next-task-${i}`
      )
        .textContent =
          row?.task ||
          '—';
    }


    /* LEAVE */

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


    const parts =
      state.leaveTime
        .split(':')
        .map(Number);


    if (
      parts.length !== 2
    ) {
      return;
    }


    const leaveDate =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        parts[0],
        parts[1],
        0
      );


    let diff =
      Math.floor(
        (
          leaveDate.getTime() -
          now.getTime()
        ) / 1000
      );


    if (
      diff >= 0
    ) {

      $('tc-leave-label')
        .textContent =
          'あと';


      $('tc-leave-count')
        .textContent =
          pad(
            Math.floor(
              diff / 3600
            )
          ) +
          ':' +
          pad(
            Math.floor(
              (diff % 3600) /
              60
            )
          );

    } else {

      diff =
        Math.abs(
          diff
        );


      $('tc-leave-label')
        .textContent =
          '超過';


      $('tc-leave-count')
        .textContent =
          secondsToHMS(
            diff
          );
    }
  }


  /* =========================================================
     START
  ========================================================= */

  sync();

  render();


  window.tcNowRenderTimer =
    setInterval(
      render,
      RENDER_INTERVAL
    );


  window.tcNowSyncTimer =
    setInterval(
      () => {

        sync();

        render();

      },
      SYNC_INTERVAL
    );

})();
