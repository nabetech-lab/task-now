(() => {
  'use strict';

  /* =========================================================
     TaskChute NOW v3.1.0
  ========================================================= */

  const VERSION = '3.1.0';

  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  const RENDER_INTERVAL = 1000;
  const SYNC_INTERVAL = 5000;


  /* =========================================================
     BASIC HELPERS
  ========================================================= */

  const pad = n =>
    String(n).padStart(2, '0');


  const clean = value =>
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();


  const getText = el =>
    clean(el?.textContent);


  const isHM = value =>
    /^\d{1,2}:\d{2}$/.test(
      clean(value)
    );


  const isHMS = value =>
    /^\d{2}:\d{2}:\d{2}$/.test(
      clean(value)
    );


  const isInsideNow = el =>
    !!el?.closest?.('#' + ROOT_ID);


  function escapeRegExp(value) {

    return String(value)
      .replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
  }


  function hmsToSeconds(value) {

    const match =
      clean(value).match(
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


  function secondsToHMS(total) {

    if (
      total === null ||
      total === undefined ||
      Number.isNaN(total)
    ) {
      return '--:--:--';
    }


    total =
      Math.max(
        0,
        Math.floor(total)
      );


    const hours =
      Math.floor(
        total / 3600
      );


    const minutes =
      Math.floor(
        (total % 3600) / 60
      );


    const seconds =
      total % 60;


    return (
      pad(hours) +
      ':' +
      pad(minutes) +
      ':' +
      pad(seconds)
    );
  }


  /* =========================================================
     STATE
  ========================================================= */

  if (!window.tcNowStateV31) {

    window.tcNowStateV31 = {

      currentTask: null,

      elapsedBase: null,
      elapsedCapturedAt: null,

      leaveTime: null,

      previous: null,

      next: [],

      schedule: [],

      lastSync: null
    };
  }


  const state =
    window.tcNowStateV31;


  /* =========================================================
     STOP OLD TIMERS / REMOVE OLD UI
  ========================================================= */

  if (window.tcNowRenderTimer) {

    clearInterval(
      window.tcNowRenderTimer
    );

    window.tcNowRenderTimer =
      null;
  }


  if (window.tcNowSyncTimer) {

    clearInterval(
      window.tcNowSyncTimer
    );

    window.tcNowSyncTimer =
      null;
  }


  document
    .getElementById(ROOT_ID)
    ?.remove();


  document
    .getElementById(STYLE_ID)
    ?.remove();


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
     CURRENT PLAYER
     実機で確認済みのDOM構造を使う
  ========================================================= */

  function findElapsedElement() {

    const candidates =
      [
        ...document.querySelectorAll(
          'p, div, span'
        )
      ]
        .filter(el => {

          if (isInsideNow(el))
            return false;

          return isHMS(
            getText(el)
          );
        });


    if (!candidates.length)
      return null;


    /*
      実機では経過時間はPタグ。
    */

    const pElements =
      candidates.filter(
        el =>
          el.tagName === 'P'
      );


    const pool =
      pElements.length
        ? pElements
        : candidates;


    /*
      下部プレイヤーなので、
      画面上で最も下にある候補を優先。
    */

    pool.sort((a, b) => {

      const ra =
        a.getBoundingClientRect();

      const rb =
        b.getBoundingClientRect();


      const aVisible =
        ra.width > 0 &&
        ra.height > 0;


      const bVisible =
        rb.width > 0 &&
        rb.height > 0;


      if (
        aVisible &&
        bVisible
      ) {
        return (
          rb.top -
          ra.top
        );
      }


      if (aVisible)
        return -1;


      if (bVisible)
        return 1;


      return 0;
    });


    return pool[0] || null;
  }


  function findCurrentTaskFromPlayer(
    elapsedElement
  ) {

    if (!elapsedElement)
      return null;


    /*
      実機調査：

      経過時間
      ↓ parent
      ↓ parent
      ↓ previousElementSibling
      = 現在タスク名
    */

    const taskElement =
      elapsedElement
        ?.parentElement
        ?.parentElement
        ?.previousElementSibling;


    const taskName =
      clean(
        taskElement?.textContent
      );


    if (
      taskName &&
      taskName.length <= 120
    ) {
      return taskName;
    }


    return null;
  }


  /* =========================================================
     SCHEDULE ROWS
     実機調査結果：
     タスク名領域
       left ≒ 24
       width ≒ 580
       height ≒ 32
     親に「プロジェクトモード」等の行情報
  ========================================================= */

  function validScheduleTaskName(
    value
  ) {

    const name =
      clean(value);


    if (!name)
      return false;


    if (
      name.length < 1 ||
      name.length > 120
    )
      return false;


    if (
      isHM(name) ||
      isHMS(name)
    )
      return false;


    if (
      /^[-\d\s:./]+$/
        .test(name)
    )
      return false;


    const blacklist =
      new Set([
        'Main',
        'NOW',
        'PREVIOUS',
        'NEXT',
        'プロジェクトモード',
        'TaskChute Cloud 2'
      ]);


    return !blacklist.has(
      name
    );
  }


  function findScheduleTasks() {

    const result = [];


    const elements =
      [
        ...document.querySelectorAll(
          'body *'
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


      const name =
        getText(el);


      if (
        !validScheduleTaskName(
          name
        )
      )
        continue;


      const rect =
        el.getBoundingClientRect();


      /*
        実機で確認した
        TaskChute予定表のタスク名領域。

        完全な固定値ではなく
        ある程度余裕を持たせる。
      */

      if (
        rect.left > 120 ||
        rect.width < 220 ||
        rect.height < 18 ||
        rect.height > 65
      ) {
        continue;
      }


      const parent =
        el.parentElement;


      if (!parent)
        continue;


      const parentText =
        getText(
          parent
        );


      /*
        予定タスク行の特徴。
      */

      if (
        !parentText.includes(
          'プロジェクトモード'
        )
      ) {
        continue;
      }


      /*
        タスク名だけを包む
        nested DIVを除外。
      */

      if (
        parentText.length <=
        name.length + 3
      ) {
        continue;
      }


      /*
        実機例：
        晩ご飯17:29--:--:--プロジェクトモード...
      */

      const directMatch =
        parentText.match(
          new RegExp(
            '^' +
            escapeRegExp(name) +
            '(\\d{1,2}:\\d{2})'
          )
        );


      let scheduledTime =
        directMatch
          ? directMatch[1]
          : null;


      /*
        直接取れない場合は
        行内のHH:MMを探す。
      */

      if (!scheduledTime) {

        const times =
          [
            ...parent.querySelectorAll(
              '*'
            )
          ]
            .map(node =>
              getText(node)
            )
            .filter(value =>
              isHM(value)
            );


        const uniqueTimes =
          [
            ...new Set(times)
          ];


        if (
          uniqueTimes.length
        ) {
          scheduledTime =
            uniqueTimes[0];
        }
      }


      result.push({

        task:
          name,

        time:
          scheduledTime,

        top:
          rect.top,

        left:
          rect.left,

        element:
          el
      });
    }


    /*
      同じタスク行について
      nestedされた候補が重複する可能性がある。

      タスク名 + top位置がほぼ同じなら1件化。
    */

    const unique = [];


    for (
      const row
      of result
    ) {

      const duplicate =
        unique.some(
          existing =>
            existing.task ===
              row.task &&
            Math.abs(
              existing.top -
              row.top
            ) < 3
        );


      if (!duplicate) {

        unique.push(
          row
        );
      }
    }


    /*
      画面上の予定順。
    */

    unique.sort(
      (a, b) =>
        a.top -
        b.top
    );


    return unique;
  }


  /* =========================================================
     PREVIOUS / NEXT x3
  ========================================================= */

  function findCurrentScheduleIndex(
    schedule,
    currentTask
  ) {

    if (
      !currentTask ||
      !schedule.length
    )
      return -1;


    /*
      同名タスクが複数ある可能性もあるが、
      まず完全一致。
    */

    const indexes = [];


    schedule.forEach(
      (row, index) => {

        if (
          row.task ===
          currentTask
        ) {
          indexes.push(
            index
          );
        }
      }
    );


    if (
      indexes.length === 1
    ) {
      return indexes[0];
    }


    if (
      indexes.length > 1
    ) {

      /*
        同名が複数ある場合は、
        現在時刻に近い予定開始時刻を優先。
      */

      const now =
        new Date();


      const nowMinutes =
        now.getHours() * 60 +
        now.getMinutes();


      let bestIndex =
        indexes[0];


      let bestDistance =
        Infinity;


      for (
        const index
        of indexes
      ) {

        const time =
          schedule[index].time;


        if (!time)
          continue;


        const [
          h,
          m
        ] =
          time
            .split(':')
            .map(Number);


        const minutes =
          h * 60 + m;


        const distance =
          Math.abs(
            minutes -
            nowMinutes
          );


        if (
          distance <
          bestDistance
        ) {

          bestDistance =
            distance;

          bestIndex =
            index;
        }
      }


      return bestIndex;
    }


    return -1;
  }


  function updateNeighbours() {

    const schedule =
      state.schedule;


    const index =
      findCurrentScheduleIndex(
        schedule,
        state.currentTask
      );


    if (index < 0) {

      state.previous =
        null;

      state.next =
        [];

      return;
    }


    state.previous =
      index > 0
        ? schedule[
            index - 1
          ]
        : null;


    state.next =
      schedule.slice(
        index + 1,
        index + 4
      );
  }


  /* =========================================================
     LEAVE TIME
  ========================================================= */

  function findLeaveTime(
    schedule
  ) {

    /*
      予定一覧から取れるなら
      こちらを優先。
    */

    const leaveRows =
      schedule.filter(
        row =>
          row.task ===
          '退勤'
      );


    if (
      leaveRows.length
    ) {

      /*
        同名「退勤」が複数ある場合、
        現在時刻以降で最も近いものを優先。
      */

      const now =
        new Date();


      const nowMinutes =
        now.getHours() * 60 +
        now.getMinutes();


      let best = null;
      let bestDistance =
        Infinity;


      for (
        const row
        of leaveRows
      ) {

        if (!row.time)
          continue;


        const [
          h,
          m
        ] =
          row.time
            .split(':')
            .map(Number);


        const rowMinutes =
          h * 60 + m;


        const distance =
          rowMinutes -
          nowMinutes;


        if (
          distance >= 0 &&
          distance <
            bestDistance
        ) {

          bestDistance =
            distance;

          best =
            row.time;
        }
      }


      if (best)
        return best;


      /*
        全部過去なら最後の退勤。
      */

      const withTime =
        leaveRows
          .filter(
            row =>
              !!row.time
          );


      if (
        withTime.length
      ) {
        return (
          withTime[
            withTime.length - 1
          ].time
        );
      }
    }


    /*
      旧方式をフォールバック。
    */

    const leaveElements =
      [
        ...document.querySelectorAll(
          'body *'
        )
      ]
        .filter(el =>
          !isInsideNow(el) &&
          getText(el) ===
            '退勤'
        );


    for (
      const leaveElement
      of leaveElements
    ) {

      let parent =
        leaveElement;


      for (
        let level = 0;
        level < 9 &&
        parent;
        level++,
        parent =
          parent.parentElement
      ) {

        const times =
          [
            ...parent.querySelectorAll(
              '*'
            )
          ]
            .map(el =>
              getText(el)
            )
            .filter(value =>
              isHM(value)
            );


        const unique =
          [
            ...new Set(times)
          ];


        if (
          unique.length
        ) {

          return unique[
            unique.length - 1
          ];
        }
      }
    }


    return null;
  }


  /* =========================================================
     DOM SYNC — EVERY 5 sec
  ========================================================= */

  function syncFromTaskChute() {

    /*
      1. 現在タスク・経過時間
    */

    const elapsedElement =
      findElapsedElement();


    const elapsedText =
      elapsedElement
        ? getText(
            elapsedElement
          )
        : null;


    const elapsedSeconds =
      hmsToSeconds(
        elapsedText
      );


    const currentTask =
      findCurrentTaskFromPlayer(
        elapsedElement
      );


    if (
      currentTask
    ) {

      state.currentTask =
        currentTask;
    }


    if (
      elapsedSeconds !== null
    ) {

      state.elapsedBase =
        elapsedSeconds;

      state.elapsedCapturedAt =
        Date.now();
    }


    /*
      2. 予定一覧を全部取得
    */

    const schedule =
      findScheduleTasks();


    if (
      schedule.length
    ) {

      state.schedule =
        schedule;
    }


    /*
      3. PREVIOUS / NEXT
    */

    updateNeighbours();


    /*
      4. 退勤
    */

    const leaveTime =
      findLeaveTime(
        state.schedule
      );


    if (
      leaveTime
    ) {

      state.leaveTime =
        leaveTime;
    }


    state.lastSync =
      Date.now();
  }


  /* =========================================================
     LOCAL ELAPSED CLOCK
  ========================================================= */

  function getCurrentElapsedSeconds() {

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
      getCurrentElapsedSeconds();


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
        #969ba5;

      --dim:
        #515660;


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
          2.3vh,
          24px
        );
    }


    /* ===============================
       HEADER
    =============================== */

    #tc-header {

      min-width:
        0;

      display:
        grid;

      grid-template-columns:
        minmax(170px, .9fr)
        minmax(190px, 1fr)
        minmax(120px, .65fr);

      align-items:
        center;

      gap:
        clamp(
          12px,
          2.4vw,
          34px
        );
    }


    #tc-brand {

      color:
        var(--muted);

      font-size:
        clamp(
          15px,
          2.3vw,
          28px
        );

      font-weight:
        850;

      line-height:
        1.2;

      letter-spacing:
        .10em;

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

      white-space:
        nowrap;

      font-variant-numeric:
        tabular-nums;
    }


    /* ===============================
       MAIN
    =============================== */

    #tc-main {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

      grid-template-columns:
        minmax(0, 1.62fr)
        minmax(210px, .95fr);

      gap:
        clamp(
          12px,
          2.4vw,
          30px
        );
    }


    /* ===============================
       NOW PANEL
    =============================== */

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
          16px,
          4vh,
          46px
        );
    }


    .tc-current-meta {

      display:
        grid;

      grid-template-columns:
        max-content
        max-content;

      align-items:
        baseline;

      gap:
        clamp(
          8px,
          1.3vw,
          18px
        );

      margin-bottom:
        clamp(
          7px,
          1.6vh,
          14px
        );
    }


    .tc-meta-label {

      color:
        #747985;

      font-size:
        clamp(
          11px,
          1.5vw,
          18px
        );

      font-weight:
        850;

      letter-spacing:
        .15em;
    }


    .tc-meta-value {

      color:
        #c7cbd3;

      font-size:
        clamp(
          20px,
          3.3vw,
          42px
        );

      font-weight:
        550;

      font-variant-numeric:
        tabular-nums;
    }


    #tc-task {

      margin:
        clamp(
          5px,
          1.3vh,
          12px
        )
        0;

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


    /* ===============================
       SIDE
    =============================== */

    #tc-side {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

      grid-template-rows:
        .72fr
        1.28fr;

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
          2.7vh,
          28px
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
          7px,
          1.7vh,
          16px
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

      gap:
        clamp(
          8px,
          1.3vw,
          17px
        );
    }


    .tc-task-row +
    .tc-task-row {

      margin-top:
        clamp(
          5px,
          1.2vh,
          12px
        );
    }


    .tc-row-time {

      color:
        #737883;

      font-size:
        clamp(
          17px,
          2.8vw,
          34px
        );

      font-variant-numeric:
        tabular-nums;

      white-space:
        nowrap;
    }


    .tc-row-task {

      min-width:
        0;

      color:
        #737883;

      font-size:
        clamp(
          17px,
          2.8vw,
          34px
        );

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


    /* ===============================
       iPHONE LANDSCAPE
    =============================== */

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
          minmax(130px, .8fr)
          minmax(145px, 1fr)
          minmax(95px, .55fr);

        gap:
          1.5vw;
      }


      #tc-brand {

        font-size:
          clamp(
            11px,
            3.5dvh,
            18px
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
          minmax(0, 1.62fr)
          minmax(185px, .95fr);

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
            7px,
            2dvh,
            13px
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
            3.2dvh,
            16px
          );

        border-radius:
          9px;

        padding:
          4px 11px;

        margin-bottom:
          clamp(
            6px,
            1.8dvh,
            10px
          );
      }


      .tc-current-meta {

        gap:
          8px;

        margin-bottom:
          3px;
      }


      .tc-meta-label {

        font-size:
          clamp(
            9px,
            2.8dvh,
            14px
          );
      }


      .tc-meta-value {

        font-size:
          clamp(
            15px,
            4.8dvh,
            24px
          );
      }


      #tc-task {

        font-size:
          clamp(
            22px,
            7.2dvh,
            38px
          );

        line-height:
          1.02;

        margin:
          3px 0;
      }


      #tc-side {

        gap:
          1.7dvh;

        grid-template-rows:
          .7fr
          1.3fr;
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
            1.4dvh,
            10px
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
            2.8dvh,
            14px
          );

        margin-bottom:
          3px;
      }


      .tc-task-row +
      .tc-task-row {

        margin-top:
          2px;
      }


      .tc-row-time,
      .tc-row-task {

        font-size:
          clamp(
            12px,
            3.7dvh,
            19px
          );
      }
    }


    /* ===============================
       PORTRAIT
    =============================== */

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
          .8fr 1.2fr;

        grid-template-rows:
          auto;

        gap:
          9px;
      }


      .tc-card {

        padding:
          13px;
      }


      .tc-task-row {

        grid-template-columns:
          1fr;

        gap:
          2px;
      }
    }


    @media
      (orientation: portrait)
      and (max-width: 430px) {

      #tc-brand {

        font-size:
          15px;
      }


      #tc-header {

        grid-template-columns:
          1fr
          auto;

        grid-template-areas:
          "brand clock"
          "leave leave";
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


          <div class="tc-current-meta">

            <span class="tc-meta-label">
              START
            </span>

            <span
              id="tc-start"
              class="tc-meta-value">
              --:--
            </span>

          </div>


          <div id="tc-task">
            タスクを取得できません
          </div>


          <div class="tc-current-meta">

            <span class="tc-meta-label">
              ELAPSED
            </span>

            <span
              id="tc-elapsed"
              class="tc-meta-value">
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

              <div
                id="tc-prev-time"
                class="tc-row-time">
                —
              </div>


              <div
                id="tc-prev-task"
                class="tc-row-task">
                —
              </div>

            </div>

          </section>


          <section class="tc-card">

            <div class="tc-card-label">
              NEXT
            </div>


            <div id="tc-next-list">

              <div class="tc-task-row">

                <div
                  id="tc-next-time-0"
                  class="tc-row-time">
                  —
                </div>

                <div
                  id="tc-next-task-0"
                  class="tc-row-task">
                  —
                </div>

              </div>


              <div class="tc-task-row">

                <div
                  id="tc-next-time-1"
                  class="tc-row-time">
                  —
                </div>

                <div
                  id="tc-next-task-1"
                  class="tc-row-task">
                  —
                </div>

              </div>


              <div class="tc-task-row">

                <div
                  id="tc-next-time-2"
                  class="tc-row-time">
                  —
                </div>

                <div
                  id="tc-next-task-2"
                  class="tc-row-task">
                  —
                </div>

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


    /* CURRENT CLOCK */

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
        getStartTime();


    $('tc-elapsed')
      .textContent =
        secondsToHMS(
          getCurrentElapsedSeconds()
        );


    /* PREVIOUS */

    $('tc-prev-time')
      .textContent =
        state.previous?.time ||
        '—';


    $('tc-prev-task')
      .textContent =
        state.previous?.task ||
        '—';


    /* NEXT x3 */

    for (
      let i = 0;
      i < 3;
      i++
    ) {

      const row =
        state.next[i];


      $(
        'tc-next-time-' + i
      ).textContent =
        row?.time || '—';


      $(
        'tc-next-task-' + i
      ).textContent =
        row?.task || '—';
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


    const [
      leaveHour,
      leaveMinute
    ] =
      state.leaveTime
        .split(':')
        .map(Number);


    const leave =
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
          leave -
          now
        ) / 1000
      );


    if (
      diff >= 0
    ) {

      const hours =
        Math.floor(
          diff / 3600
        );


      const minutes =
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
          pad(hours) +
          ':' +
          pad(minutes);

    } else {

      diff =
        Math.abs(
          diff
        );


      const hours =
        Math.floor(
          diff / 3600
        );


      const minutes =
        Math.floor(
          (
            diff % 3600
          ) / 60
        );


      const seconds =
        diff % 60;


      $('tc-leave-label')
        .textContent =
          '超過';


      $('tc-leave-count')
        .textContent =
          pad(hours) +
          ':' +
          pad(minutes) +
          ':' +
          pad(seconds);
    }
  }


  /* =========================================================
     START
  ========================================================= */

  /*
    NOW表示直後にまず同期。
  */

  syncFromTaskChute();


  render();


  /*
    表示：1秒
  */

  window.tcNowRenderTimer =
    setInterval(
      render,
      RENDER_INTERVAL
    );


  /*
    TaskChute DOM：5秒
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
