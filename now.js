(() => {
  'use strict';

  /* =========================================================
     TaskChute NOW v3.4.0
  ========================================================= */

  const VERSION = '3.4.0';

  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  const RENDER_INTERVAL = 1000;
  const SYNC_INTERVAL = 5000;


  /* =========================================================
     UTIL
  ========================================================= */

  const clean = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();


  const txt = el =>
    clean(el?.textContent);


  const pad = n =>
    String(n).padStart(2, '0');


  const isInsideNow = el =>
    !!el?.closest?.('#' + ROOT_ID);


  const isHMS = value =>
    /^\d{2}:\d{2}:\d{2}$/.test(clean(value));


  const isHM = value =>
    /^\d{1,2}:\d{2}$/.test(clean(value));


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


  function hmDurationToSeconds(value) {

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


  function hmToMinutes(value) {

    const m =
      clean(value).match(
        /^(\d{1,2}):(\d{2})$/
      );

    if (!m)
      return null;

    return (
      Number(m[1]) * 60 +
      Number(m[2])
    );
  }


  function minutesToHM(minutes) {

    let value =
      Math.round(minutes);

    value =
      ((value % 1440) + 1440) % 1440;

    return (
      pad(
        Math.floor(value / 60)
      ) +
      ':' +
      pad(value % 60)
    );
  }


  function addDurationToClock(
    clock,
    seconds
  ) {

    const startMinutes =
      hmToMinutes(clock);

    if (
      startMinutes === null ||
      seconds === null
    ) {
      return null;
    }

    return minutesToHM(
      startMinutes +
      seconds / 60
    );
  }


  function clockDifferenceSeconds(
    start,
    finish
  ) {

    const a =
      hmToMinutes(start);

    const b =
      hmToMinutes(finish);

    if (
      a === null ||
      b === null
    ) {
      return null;
    }

    let diff =
      b - a;

    if (diff < 0)
      diff += 1440;

    return diff * 60;
  }


  function validTaskName(value) {

    const t =
      clean(value);

    if (!t)
      return false;

    if (
      t.length > 140 ||
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

    return ![
      'NOW',
      'PREVIOUS',
      'NEXT',
      'Main',
      'プロジェクト',
      'プロジェクトモード',
      'TaskChute Cloud 2'
    ].includes(t);
  }


  /* =========================================================
     STATE
  ========================================================= */

  if (!window.tcNowStateV34) {

    window.tcNowStateV34 = {

      currentTask: null,

      elapsedBase: null,
      elapsedCapturedAt: null,

      currentRow: null,

      previous: null,
      next: [],

      leaveTime: null,

      lastSync: null
    };
  }


  const state =
    window.tcNowStateV34;


  /* =========================================================
     CURRENT PLAYER
  ========================================================= */

  function findCurrentPlayer() {

    const elapsedElements =
      [...document.querySelectorAll(
        'p,div,span'
      )]
        .filter(el => {

          if (isInsideNow(el))
            return false;

          return isHMS(
            txt(el)
          );
        });


    const candidates = [];


    for (
      const elapsedEl
      of elapsedElements
    ) {

      /*
        実DOMで確認済み。

        elapsed
          parent
          parent
          previousElementSibling
        = current task
      */

      const taskEl =
        elapsedEl
          ?.parentElement
          ?.parentElement
          ?.previousElementSibling;


      if (!taskEl)
        continue;


      const task =
        clean(
          taskEl.textContent
        );


      if (!validTaskName(task))
        continue;


      const rect =
        elapsedEl
          .getBoundingClientRect();


      candidates.push({

        task,

        elapsed:
          txt(elapsedEl),

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

        /*
          下部プレイヤーなので
          一番下にあるものを優先。
        */

        return b.top - a.top;
      }
    );


    return candidates[0];
  }


  /* =========================================================
     TASK ROW PARSER
  ========================================================= */

  function parseTaskRow(
    task,
    parentText
  ) {

    const s =
      clean(parentText);


    const afterTask =
      s.startsWith(task)
        ? s.slice(task.length)
        : s;


    /*
      実績開始・終了時刻。

      完了済み：
        DailyReview16:0716:13...

      実行中：
        晩ご飯17:29...
    */

    let actualStart = null;
    let actualFinish = null;


    const startMatch =
      afterTask.match(
        /^(\d{1,2}:\d{2})/
      );


    if (startMatch) {

      actualStart =
        startMatch[1];


      const rest =
        afterTask.slice(
          startMatch[0].length
        );


      const finishMatch =
        rest.match(
          /^(\d{1,2}:\d{2})/
        );


      if (finishMatch) {

        actualFinish =
          finishMatch[1];
      }
    }


    /*
      全ての数値 HH:MM を取得。

      例：
      DailyReview
      16:07,16:13,00:06,00:05

      WeeklyReview
      00:30,19:19
    */

    const allTimes =
      [
        ...s.matchAll(
          /(?<!\d)(\d{1,2}:\d{2})(?!:\d{2})(?!\d)/g
        )
      ]
        .map(m => m[1]);


    /*
      行末がHH:MMなら
      TaskChuteの予定開始時刻とみなす。
    */

    const scheduledMatch =
      s.match(
        /(\d{1,2}:\d{2})$/
      );


    const scheduledStart =
      scheduledMatch
        ? scheduledMatch[1]
        : null;


    /*
      実績開始・終了・予定開始を取り除き、
      残った値を経過・見積として解釈する。
    */

    const remaining =
      [...allTimes];


    if (
      actualStart &&
      remaining[0] === actualStart
    ) {
      remaining.shift();
    }


    if (
      actualFinish &&
      remaining[0] === actualFinish
    ) {
      remaining.shift();
    }


    if (
      scheduledStart &&
      remaining[
        remaining.length - 1
      ] === scheduledStart
    ) {
      remaining.pop();
    }


    let actualElapsed = null;
    let planned = null;


    if (actualStart) {

      /*
        完了済み・実行中タスク。

        通常：
        [経過時間, 見積時間]
      */

      if (
        remaining.length >= 1
      ) {
        actualElapsed =
          remaining[0];
      }


      if (
        remaining.length >= 2
      ) {
        planned =
          remaining[1];
      }

    } else {

      /*
        未実行タスク。

        通常：
        [見積時間]
      */

      if (
        remaining.length >= 1
      ) {
        planned =
          remaining[0];
      }
    }


    /*
      00:00:00形式の実経過時間が
      DOMに存在するケースも拾う。
    */

    const hmsMatches =
      [
        ...s.matchAll(
          /(?<!\d)(\d{1,2}:\d{2}:\d{2})(?!\d)/g
        )
      ]
        .map(m => m[1])
        .filter(
          x =>
            !x.includes('--')
        );


    if (
      !actualElapsed &&
      hmsMatches.length
    ) {
      actualElapsed =
        hmsMatches[0];
    }


    return {

      actualStart,

      actualFinish,

      actualElapsed,

      planned,

      scheduledStart
    };
  }


  /* =========================================================
     SCHEDULE ROWS
  ========================================================= */

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

      if (isInsideNow(el))
        continue;


      const task =
        clean(
          el.textContent
        );


      if (!validTaskName(task))
        continue;


      const rect =
        el.getBoundingClientRect();


      /*
        実機調査で確認した
        タスク名行。
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
        nestedされたタスク名単体を排除。
      */

      if (
        parentText === task ||
        parentText.length <
          task.length + 5
      ) {
        continue;
      }


      /*
        TaskChute行らしさ。
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


      const parsed =
        parseTaskRow(
          task,
          parentText
        );


      rows.push({

        task,

        top:
          rect.top,

        parentText,

        ...parsed
      });
    }


    rows.sort(
      (a, b) =>
        a.top - b.top
    );


    /*
      nested重複排除。
    */

    const unique = [];


    for (
      const row
      of rows
    ) {

      const duplicate =
        unique.some(
          x =>
            x.task === row.task &&
            Math.abs(
              x.top - row.top
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
     PREVIOUS / NEXT
  ========================================================= */

  function getNeighbours(
    rows,
    currentTask
  ) {

    const index =
      rows.findIndex(
        row =>
          row.task ===
          currentTask
      );


    if (index < 0) {

      return {

        current: null,

        previous: null,

        next: []
      };
    }


    return {

      current:
        rows[index],

      previous:
        index > 0
          ? rows[index - 1]
          : null,

      /*
        退勤も除外しない。
      */

      next:
        rows.slice(
          index + 1,
          index + 4
        )
    };
  }


  /* =========================================================
     LEAVE
  ========================================================= */

  function findLeaveTime(
    rows
  ) {

    const leaveRow =
      rows.find(
        row =>
          row.task === '退勤'
      );


    if (
      leaveRow?.scheduledStart
    ) {

      return (
        leaveRow
          .scheduledStart
      );
    }


    /*
      実行済みの場合などは
      実開始時刻をフォールバック。
    */

    if (
      leaveRow?.actualStart
    ) {

      return (
        leaveRow
          .actualStart
      );
    }


    return null;
  }


  /* =========================================================
     SYNC
  ========================================================= */

  function syncFromTaskChute() {

    const player =
      findCurrentPlayer();


    if (player) {

      state.currentTask =
        player.task;


      const sec =
        hmsToSeconds(
          player.elapsed
        );


      if (
        sec !== null
      ) {

        state.elapsedBase =
          sec;

        state.elapsedCapturedAt =
          Date.now();
      }
    }


    const rows =
      getScheduleRows();


    const neighbours =
      getNeighbours(
        rows,
        state.currentTask
      );


    state.currentRow =
      neighbours.current;


    state.previous =
      neighbours.previous;


    state.next =
      neighbours.next;


    const leave =
      findLeaveTime(
        rows
      );


    if (leave)
      state.leaveTime = leave;


    state.lastSync =
      Date.now();
  }


  /* =========================================================
     CURRENT CALCULATIONS
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


  function getCurrentStartTime() {

    /*
      TaskChute行の実開始時刻を優先。
    */

    if (
      state.currentRow
        ?.actualStart
    ) {

      return (
        state.currentRow
          .actualStart
      );
    }


    /*
      DOMから取れなければ
      elapsedから逆算。
    */

    const elapsed =
      getElapsedSeconds();


    if (
      elapsed === null
    )
      return null;


    const d =
      new Date(
        Date.now() -
        elapsed * 1000
      );


    return (
      pad(
        d.getHours()
      ) +
      ':' +
      pad(
        d.getMinutes()
      )
    );
  }


  function getCurrentPlannedSeconds() {

    const planned =
      state.currentRow
        ?.planned;


    if (planned) {

      const sec =
        hmDurationToSeconds(
          planned
        );


      if (
        sec !== null
      )
        return sec;
    }


    /*
      見積時間をDOMから直接取れなかった場合、
      現在開始 → NEXT予定開始
      をフォールバックとして使用。
    */

    const start =
      getCurrentStartTime();


    const nextStart =
      state.next?.[0]
        ?.scheduledStart;


    if (
      start &&
      nextStart
    ) {

      return (
        clockDifferenceSeconds(
          start,
          nextStart
        )
      );
    }


    return null;
  }


  function getPlannedEnd() {

    const start =
      getCurrentStartTime();


    const planned =
      getCurrentPlannedSeconds();


    if (
      start &&
      planned !== null
    ) {

      return (
        addDurationToClock(
          start,
          planned
        )
      );
    }


    /*
      最終フォールバック。
    */

    return (
      state.next?.[0]
        ?.scheduledStart ||
      null
    );
  }


  /* =========================================================
     CLEAN PREVIOUS ELAPSED
  ========================================================= */

  function previousElapsed(
    row
  ) {

    if (!row)
      return null;


    /*
      HH:MM:SSならそのまま。
    */

    if (
      row.actualElapsed &&
      isHMS(
        row.actualElapsed
      )
    ) {

      return (
        row.actualElapsed
      );
    }


    /*
      HH:MMなら経過時間として
      HH:MM:00へ。
    */

    if (
      row.actualElapsed &&
      isHM(
        row.actualElapsed
      )
    ) {

      return (
        row.actualElapsed +
        ':00'
      );
    }


    /*
      START / FINISHが取れた場合、
      その差から計算。
    */

    if (
      row.actualStart &&
      row.actualFinish
    ) {

      const sec =
        clockDifferenceSeconds(
          row.actualStart,
          row.actualFinish
        );


      if (
        sec !== null
      ) {

        return (
          secondsToHMS(
            sec
          )
        );
      }
    }


    return null;
  }


  /* =========================================================
     RESET OLD INSTANCE
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

    document.head.appendChild(
      viewport
    );

  } else {

    let c =
      viewport.getAttribute(
        'content'
      ) || '';

    if (
      !c.includes(
        'viewport-fit=cover'
      )
    ) {

      viewport.setAttribute(
        'content',
        c +
        ',viewport-fit=cover'
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
        #f7f7f8;

      --muted:
        #979ba5;

      --dim:
        #555a64;


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
          9px,
          2.3vh,
          23px
        );
    }


    /* ===========================================
       HEADER
    =========================================== */

    #tc-header {

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
        1.3;

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
        .42em;
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


    /* ===========================================
       MAIN
    =========================================== */

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


    /* ===========================================
       NOW
    =========================================== */

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
          15px,
          3.5vh,
          38px
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
          14px,
          2vw,
          24px
        );

      font-weight:
        900;

      letter-spacing:
        .18em;

      border-radius:
        15px;

      padding:
        clamp(
          6px,
          1.2vh,
          11px
        )
        clamp(
          15px,
          2.2vw,
          26px
        );

      margin-bottom:
        clamp(
          13px,
          3vh,
          30px
        );
    }


    .tc-now-line {

      display:
        grid;

      grid-template-columns:
        max-content
        max-content;

      align-items:
        baseline;

      column-gap:
        clamp(
          12px,
          1.8vw,
          24px
        );

      min-height:
        1.5em;
    }


    .tc-now-label {

      color:
        #777c86;

      font-size:
        clamp(
          11px,
          1.45vw,
          18px
        );

      font-weight:
        900;

      letter-spacing:
        .15em;

      white-space:
        nowrap;
    }


    .tc-now-value {

      color:
        #c9cdd4;

      font-size:
        clamp(
          19px,
          3vw,
          37px
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
          9px,
          1.7vh,
          17px
        )
        0;

      font-size:
        clamp(
          30px,
          5.1vw,
          66px
        );

      font-weight:
        900;

      line-height:
        1.06;

      overflow-wrap:
        anywhere;
    }


    #tc-now-metrics {

      margin-top:
        clamp(
          8px,
          1.7vh,
          15px
        );

      display:
        grid;

      gap:
        clamp(
          2px,
          .55vh,
          6px
        );
    }


    #tc-progress-label.tc-over,
    #tc-progress-value.tc-over {

      color:
        #ffffff;
    }


    /* ===========================================
       SIDE
    =========================================== */

    #tc-side {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

      grid-template-rows:
        minmax(0, .9fr)
        minmax(0, 1.1fr);

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
          13px,
          2.5vh,
          26px
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
          11px,
          1.55vw,
          19px
        );

      font-weight:
        900;

      letter-spacing:
        .18em;
    }


    #tc-prev-task {

      margin:
        clamp(
          7px,
          1.3vh,
          13px
        )
        0
        clamp(
          7px,
          1.3vh,
          13px
        );

      color:
        #757a84;

      font-size:
        clamp(
          19px,
          3vw,
          35px
        );

      font-weight:
        800;

      white-space:
        nowrap;

      overflow:
        hidden;

      text-overflow:
        ellipsis;
    }


    #tc-prev-info {

      display:
        grid;

      gap:
        clamp(
          1px,
          .4vh,
          5px
        );
    }


    .tc-prev-line {

      display:
        grid;

      grid-template-columns:
        minmax(
          65px,
          max-content
        )
        max-content;

      align-items:
        baseline;

      column-gap:
        clamp(
          10px,
          1.5vw,
          18px
        );
    }


    .tc-prev-label {

      color:
        #555a64;

      font-size:
        clamp(
          10px,
          1.3vw,
          16px
        );

      font-weight:
        900;

      letter-spacing:
        .12em;
    }


    .tc-prev-value {

      color:
        #737883;

      font-size:
        clamp(
          15px,
          2.25vw,
          27px
        );

      font-variant-numeric:
        tabular-nums;
    }


    #tc-next-title {

      margin-bottom:
        clamp(
          8px,
          1.8vh,
          17px
        );
    }


    #tc-next-list {

      display:
        grid;

      gap:
        clamp(
          4px,
          .9vh,
          10px
        );
    }


    .tc-next-row {

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
    }


    .tc-next-time,
    .tc-next-name {

      color:
        #737883;

      font-size:
        clamp(
          16px,
          2.7vw,
          32px
        );
    }


    .tc-next-time {

      font-variant-numeric:
        tabular-nums;

      white-space:
        nowrap;
    }


    .tc-next-name {

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


    /* ===========================================
       iPHONE LANDSCAPE
    =========================================== */

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
          1.7dvh;
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
          1.2;
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
          minmax(190px, .9fr);

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
          2dvh
          clamp(
            18px,
            3vw,
            30px
          );
      }


      #tc-now-badge {

        font-size:
          clamp(
            9px,
            3.1dvh,
            15px
          );

        padding:
          1.1dvh
          1.3vw;

        margin-bottom:
          1.4dvh;
      }


      .tc-now-line {

        column-gap:
          1.1vw;

        min-height:
          1.35em;
      }


      .tc-now-label {

        font-size:
          clamp(
            8px,
            2.7dvh,
            14px
          );
      }


      .tc-now-value {

        font-size:
          clamp(
            14px,
            4.6dvh,
            23px
          );
      }


      #tc-task {

        margin:
          1.1dvh 0;

        font-size:
          clamp(
            21px,
            7dvh,
            37px
          );
      }


      #tc-now-metrics {

        margin-top:
          1dvh;

        gap:
          .2dvh;
      }


      #tc-side {

        gap:
          1.7dvh;
      }


      .tc-card {

        padding:
          1.5dvh
          1.3vw;

        border-radius:
          clamp(
            11px,
            4dvh,
            21px
          );
      }


      .tc-card-label {

        font-size:
          clamp(
            8px,
            2.7dvh,
            14px
          );
      }


      #tc-prev-task {

        margin:
          .8dvh 0;

        font-size:
          clamp(
            14px,
            4.5dvh,
            23px
          );
      }


      .tc-prev-label {

        font-size:
          clamp(
            8px,
            2.5dvh,
            13px
          );
      }


      .tc-prev-value {

        font-size:
          clamp(
            12px,
            3.7dvh,
            19px
          );
      }


      #tc-next-title {

        margin-bottom:
          .8dvh;
      }


      #tc-next-list {

        gap:
          .65dvh;
      }


      .tc-next-time,
      .tc-next-name {

        font-size:
          clamp(
            13px,
            4dvh,
            21px
          );
      }
    }


    /* ===========================================
       PORTRAIT
    =========================================== */

    @media
      (orientation: portrait) {

      #tc-header {

        grid-template-columns:
          1fr auto;

        grid-template-areas:
          "brand clock"
          "leave leave";

        gap:
          8px;
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
      }


      #tc-side {

        grid-template-columns:
          1fr 1fr;

        grid-template-rows:
          auto;
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

        <!-- ================= NOW ================= -->

        <section id="tc-now">

          <div id="tc-now-badge">
            NOW
          </div>


          <div class="tc-now-line">

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


          <div class="tc-now-line">

            <span class="tc-now-label">
              PLANNED END
            </span>

            <span
              id="tc-planned-end"
              class="tc-now-value">
              --:--
            </span>

          </div>


          <div id="tc-now-metrics">

            <div class="tc-now-line">

              <span class="tc-now-label">
                ELAPSED
              </span>

              <span
                id="tc-elapsed"
                class="tc-now-value">
                --:--:--
              </span>

            </div>


            <div class="tc-now-line">

              <span class="tc-now-label">
                PLANNED
              </span>

              <span
                id="tc-planned"
                class="tc-now-value">
                --:--:--
              </span>

            </div>


            <div class="tc-now-line">

              <span
                id="tc-progress-label"
                class="tc-now-label">
                REMAINING
              </span>

              <span
                id="tc-progress-value"
                class="tc-now-value">
                --:--:--
              </span>

            </div>

          </div>

        </section>


        <!-- ================= SIDE ================= -->

        <aside id="tc-side">


          <!-- PREVIOUS -->

          <section class="tc-card">

            <div class="tc-card-label">
              PREVIOUS
            </div>


            <div id="tc-prev-task">
              —
            </div>


            <div id="tc-prev-info">

              <div class="tc-prev-line">

                <span class="tc-prev-label">
                  START
                </span>

                <span
                  id="tc-prev-start"
                  class="tc-prev-value">
                  --:--
                </span>

              </div>


              <div class="tc-prev-line">

                <span class="tc-prev-label">
                  FINISH
                </span>

                <span
                  id="tc-prev-finish"
                  class="tc-prev-value">
                  --:--
                </span>

              </div>


              <div class="tc-prev-line">

                <span class="tc-prev-label">
                  ELAPSED
                </span>

                <span
                  id="tc-prev-elapsed"
                  class="tc-prev-value">
                  --:--:--
                </span>

              </div>

            </div>

          </section>


          <!-- NEXT -->

          <section class="tc-card">

            <div
              id="tc-next-title"
              class="tc-card-label">
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
                  class="tc-next-name">
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
                  class="tc-next-name">
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
                  class="tc-next-name">
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


  const $ =
    id =>
      document.getElementById(
        id
      );


  /* =========================================================
     RENDER
  ========================================================= */

  function render() {

    const now =
      new Date();


    /* ================= CLOCK ================= */

    $('tc-clock')
      .textContent =
        pad(
          now.getHours()
        ) +
        ':' +
        pad(
          now.getMinutes()
        );


    /* ================= CURRENT ================= */

    const elapsed =
      getElapsedSeconds();


    const start =
      getCurrentStartTime();


    const planned =
      getCurrentPlannedSeconds();


    const plannedEnd =
      getPlannedEnd();


    $('tc-task')
      .textContent =
        state.currentTask ||
        'タスクを取得できません';


    $('tc-start')
      .textContent =
        start ||
        '--:--';


    $('tc-planned-end')
      .textContent =
        plannedEnd ||
        '--:--';


    $('tc-elapsed')
      .textContent =
        secondsToHMS(
          elapsed
        );


    $('tc-planned')
      .textContent =
        planned !== null
          ? secondsToHMS(
              planned
            )
          : '--:--:--';


    /* ================= REMAINING / OVER ================= */

    const progressLabel =
      $('tc-progress-label');


    const progressValue =
      $('tc-progress-value');


    progressLabel
      .classList
      .remove('tc-over');


    progressValue
      .classList
      .remove('tc-over');


    if (
      elapsed !== null &&
      planned !== null
    ) {

      const diff =
        planned -
        elapsed;


      if (diff >= 0) {

        progressLabel
          .textContent =
            'REMAINING';


        progressValue
          .textContent =
            secondsToHMS(
              diff
            );

      } else {

        progressLabel
          .textContent =
            'OVER';


        progressValue
          .textContent =
            secondsToHMS(
              Math.abs(diff)
            );


        progressLabel
          .classList
          .add('tc-over');


        progressValue
          .classList
          .add('tc-over');
      }

    } else {

      progressLabel
        .textContent =
          'REMAINING';


      progressValue
        .textContent =
          '--:--:--';
    }


    /* ================= PREVIOUS ================= */

    const prev =
      state.previous;


    $('tc-prev-task')
      .textContent =
        prev?.task ||
        '—';


    $('tc-prev-start')
      .textContent =
        prev?.actualStart ||
        '--:--';


    $('tc-prev-finish')
      .textContent =
        prev?.actualFinish ||
        '--:--';


    $('tc-prev-elapsed')
      .textContent =
        previousElapsed(
          prev
        ) ||
        '--:--:--';


    /* ================= NEXT ================= */

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
          row?.scheduledStart ||
          row?.actualStart ||
          '—';


      $(
        `tc-next-task-${i}`
      )
        .textContent =
          row?.task ||
          '—';
    }


    /* ================= LEAVE ================= */

    $('tc-leave-time')
      .textContent =
        state.leaveTime ||
        '--:--';


    if (!state.leaveTime) {

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
          leaveDate -
          now
        ) / 1000
      );


    if (diff >= 0) {

      const h =
        Math.floor(
          diff / 3600
        );


      const m =
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
          pad(h) +
          ':' +
          pad(m);

    } else {

      diff =
        Math.abs(diff);


      const h =
        Math.floor(
          diff / 3600
        );


      const m =
        Math.floor(
          (
            diff % 3600
          ) / 60
        );


      const s =
        diff % 60;


      $('tc-leave-label')
        .textContent =
          '超過';


      $('tc-leave-count')
        .textContent =
          pad(h) +
          ':' +
          pad(m) +
          ':' +
          pad(s);
    }
  }


  /* =========================================================
     START
  ========================================================= */

  syncFromTaskChute();

  render();


  window.tcNowRenderTimer =
    setInterval(
      render,
      RENDER_INTERVAL
    );


  window.tcNowSyncTimer =
    setInterval(
      () => {

        syncFromTaskChute();

        render();

      },
      SYNC_INTERVAL
    );

})();
