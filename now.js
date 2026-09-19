(() => {
  'use strict';

  /* =========================================================
     TaskChute NOW v3.0.0
     - UI render: 1 sec
     - TaskChute DOM sync: 5 sec
  ========================================================= */

  const VERSION = '3.0.0';

  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  const RENDER_INTERVAL = 1000;
  const SYNC_INTERVAL = 5000;


  /* =========================================================
     HELPERS
  ========================================================= */

  const pad = n =>
    String(n).padStart(2, '0');


  const clean = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();


  const text = el =>
    clean(el?.textContent);


  const isHMS = value =>
    /^\d{2}:\d{2}:\d{2}$/.test(
      clean(value)
    );


  const isHM = value =>
    /^\d{1,2}:\d{2}$/.test(
      clean(value)
    );


  const isInsideNow = el =>
    !!el?.closest?.('#' + ROOT_ID);


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
      Math.floor(total / 3600);

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


  function validTaskName(value) {

    const valueClean =
      clean(value);

    if (!valueClean)
      return false;

    if (
      valueClean.length < 2 ||
      valueClean.length > 120
    )
      return false;

    if (
      isHM(valueClean) ||
      isHMS(valueClean)
    )
      return false;

    if (
      /^-?\d{1,2}:\d{2}(:\d{2})?$/
        .test(valueClean)
    )
      return false;

    if (
      /^[-\d\s:./]+$/
        .test(valueClean)
    )
      return false;


    const blacklist = new Set([
      'Main',
      'NOW',
      'PREVIOUS',
      'NEXT',
      'プロジェクトモード',
      'TaskChute Cloud 2',
      'タスクを取得できません'
    ]);


    if (
      blacklist.has(valueClean)
    )
      return false;


    return true;
  }


  /* =========================================================
     GLOBAL STATE
  ========================================================= */

  if (!window.tcNowV3State) {

    window.tcNowV3State = {

      currentTask: null,

      elapsedBase: null,
      elapsedCapturedAt: null,

      startTime: null,

      leaveTime: null,

      previousTask: null,
      previousTime: null,

      nextTask: null,
      nextTime: null,

      lastSync: null
    };
  }


  const state =
    window.tcNowV3State;


  /* =========================================================
     CURRENT TASK
     1. TaskChute player elapsed
     2. player surrounding DOM
     3. document.title fallback
  ========================================================= */

  function findElapsedElement() {

    const candidates =
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


    if (!candidates.length)
      return null;


    /*
      最初に成功していたTaskChuteでは
      経過時間はP要素。
    */

    const paragraphs =
      candidates.filter(
        el =>
          el.tagName === 'P'
      );


    const pool =
      paragraphs.length
        ? paragraphs
        : candidates;


    /*
      画面下部のplayerを優先。
    */

    pool.sort((a, b) => {

      const ra =
        a.getBoundingClientRect();

      const rb =
        b.getBoundingClientRect();


      const va =
        ra.width > 0 &&
        ra.height > 0;


      const vb =
        rb.width > 0 &&
        rb.height > 0;


      if (va && vb)
        return rb.top - ra.top;

      if (va)
        return -1;

      if (vb)
        return 1;

      return 0;
    });


    return pool[0] || null;
  }


  function findTaskFromElapsed(
    elapsedElement
  ) {

    if (!elapsedElement)
      return null;


    let parent =
      elapsedElement.parentElement;


    for (
      let level = 0;
      level < 9 && parent;
      level++,
      parent = parent.parentElement
    ) {

      const leaves =
        [...parent.querySelectorAll('*')]
          .filter(el => {

            if (isInsideNow(el))
              return false;

            if (
              el.children.length !== 0
            )
              return false;

            return validTaskName(
              text(el)
            );
          });


      const values =
        [...new Set(
          leaves.map(
            el => text(el)
          )
        )];


      if (!values.length)
        continue;


      /*
        player内にはタスク名以外の
        UI文字列も存在する。

        「タスク名として自然」なものを優先。
      */

      const filtered =
        values.filter(value =>
          !value.includes('時間指定') &&
          !value.includes('プロジェクト') &&
          !value.includes('開始') &&
          !value.includes('終了')
        );


      const pool =
        filtered.length
          ? filtered
          : values;


      /*
        実機ではタスク名が比較的長い文字列。
      */

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
      clean(document.title);


    /*
      例：
      [30m] 晩ご飯 - TaskChute Cloud 2
    */

    let match =
      title.match(
        /^\[[^\]]+\]\s*(.+?)\s*-\s*TaskChute/i
      );


    if (
      match &&
      validTaskName(match[1])
    ) {
      return clean(match[1]);
    }


    match =
      title.match(
        /^(.+?)\s*-\s*TaskChute/i
      );


    if (
      match &&
      validTaskName(match[1])
    ) {
      return clean(match[1]);
    }


    return null;
  }


  /* =========================================================
     LEAVE TIME
  ========================================================= */

  function findLeaveTime() {

    const nodes =
      [...document.querySelectorAll(
        'body *'
      )]
        .filter(el =>
          !isInsideNow(el) &&
          text(el) === '退勤'
        );


    for (const node of nodes) {

      let parent =
        node;


      for (
        let level = 0;
        level < 9 && parent;
        level++,
        parent = parent.parentElement
      ) {

        const times =
          [...parent.querySelectorAll('*')]
            .map(el =>
              text(el)
            )
            .filter(value =>
              isHM(value)
            );


        const unique =
          [...new Set(times)];


        if (unique.length) {

          /*
            実機調査では
            最後のHH:MMが予定開始時刻。
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
     TASK ROW DISCOVERY
     TaskChute上の予定タスク列から
     PREVIOUS / NEXT を取得
  ========================================================= */

  function findTaskNameElements(
    taskName
  ) {

    if (!taskName)
      return [];


    return [
      ...document.querySelectorAll(
        'body *'
      )
    ].filter(el => {

      if (isInsideNow(el))
        return false;

      return (
        text(el) === taskName
      );
    });
  }


  /*
    現在タスクが「予定一覧」に表示されているDOMを探す。

    player側ではなく、
    HH:MMの予定開始時刻を持つ方を優先。
  */

  function findScheduleRow(
    taskName
  ) {

    const taskElements =
      findTaskNameElements(
        taskName
      );


    let best = null;


    for (
      const taskElement
      of taskElements
    ) {

      let parent =
        taskElement;


      for (
        let level = 0;
        level < 8 && parent;
        level++,
        parent = parent.parentElement
      ) {

        const fullText =
          text(parent);


        if (
          !fullText ||
          fullText.length > 600
        )
          continue;


        const times =
          [...parent.querySelectorAll('*')]
            .map(el =>
              text(el)
            )
            .filter(value =>
              isHM(value)
            );


        /*
          予定一覧のrowには
          HH:MM予定時刻が存在する可能性が高い。
        */

        if (times.length) {

          const rect =
            parent.getBoundingClientRect();


          const score =
            (
              fullText.length < 250
                ? 20
                : 0
            ) +
            (
              rect.width > 0
                ? 5
                : 0
            ) -
            level;


          if (
            !best ||
            score > best.score
          ) {
            best = {
              element: parent,
              score
            };
          }
        }
      }
    }


    return best
      ? best.element
      : null;
  }


  /*
    一つの予定タスクrowから
    名前と予定時刻を取得
  */

  function parseTaskRow(row) {

    if (!row)
      return null;


    const leaves =
      [...row.querySelectorAll('*')]
        .filter(el => {

          if (isInsideNow(el))
            return false;

          if (
            el.children.length !== 0
          )
            return false;

          return true;
        });


    const values =
      leaves
        .map(el =>
          text(el)
        )
        .filter(Boolean);


    const times =
      values.filter(
        value =>
          isHM(value)
      );


    const names =
      values.filter(
        value =>
          validTaskName(value) &&
          value !== '退勤'
      );


    let taskName =
      null;


    if (names.length) {

      const unique =
        [...new Set(names)];


      unique.sort(
        (a, b) =>
          b.length - a.length
      );


      taskName =
        unique[0];
    }


    return {
      task:
        taskName,

      time:
        times.length
          ? times[
              times.length - 1
            ]
          : null
    };
  }


  /*
    現在rowの前後にある
    「タスクらしい兄弟」を探す。
  */

  function findSiblingTask(
    currentRow,
    direction
  ) {

    if (!currentRow)
      return null;


    let node =
      direction < 0
        ? currentRow.previousElementSibling
        : currentRow.nextElementSibling;


    let attempts = 0;


    while (
      node &&
      attempts < 12
    ) {

      attempts++;


      const parsed =
        parseTaskRow(
          node
        );


      if (
        parsed &&
        parsed.task
      ) {
        return parsed;
      }


      node =
        direction < 0
          ? node.previousElementSibling
          : node.nextElementSibling;
    }


    return null;
  }


  /*
    siblingsだけで取れない場合、
    currentRowの親の子供から探す。
  */

  function findNeighbourFromContainer(
    currentRow,
    direction
  ) {

    if (
      !currentRow ||
      !currentRow.parentElement
    )
      return null;


    const parent =
      currentRow.parentElement;


    const children =
      [
        ...parent.children
      ];


    const index =
      children.indexOf(
        currentRow
      );


    if (index < 0)
      return null;


    for (
      let offset = 1;
      offset <= 12;
      offset++
    ) {

      const targetIndex =
        index +
        direction * offset;


      if (
        targetIndex < 0 ||
        targetIndex >= children.length
      )
        break;


      const parsed =
        parseTaskRow(
          children[targetIndex]
        );


      if (
        parsed &&
        parsed.task
      ) {
        return parsed;
      }
    }


    return null;
  }


  function findNeighbours(
    currentTask
  ) {

    const currentRow =
      findScheduleRow(
        currentTask
      );


    if (!currentRow) {

      return {
        previous:
          null,

        next:
          null
      };
    }


    let previous =
      findSiblingTask(
        currentRow,
        -1
      );


    let next =
      findSiblingTask(
        currentRow,
        1
      );


    if (!previous) {

      previous =
        findNeighbourFromContainer(
          currentRow,
          -1
        );
    }


    if (!next) {

      next =
        findNeighbourFromContainer(
          currentRow,
          1
        );
    }


    return {
      previous,
      next
    };
  }


  /* =========================================================
     DOM SYNC
     5秒ごと
  ========================================================= */

  function syncFromTaskChute() {

    /*
      NOW自身を除外したDOMから読む。
    */

    const elapsedElement =
      findElapsedElement();


    const elapsedText =
      elapsedElement
        ? text(elapsedElement)
        : null;


    const elapsedSeconds =
      hmsToSeconds(
        elapsedText
      );


    let currentTask =
      findTaskFromElapsed(
        elapsedElement
      );


    if (!currentTask) {

      currentTask =
        findTaskFromTitle();
    }


    /*
      タスク切替を検知。
    */

    const taskChanged =
      (
        currentTask &&
        currentTask !==
          state.currentTask
      );


    if (currentTask) {

      state.currentTask =
        currentTask;
    }


    /*
      TaskChute側の実経過時間で
      5秒ごとに補正。
    */

    if (
      elapsedSeconds !== null
    ) {

      state.elapsedBase =
        elapsedSeconds;


      state.elapsedCapturedAt =
        Date.now();
    }


    /*
      タスク切替時も
      同じ処理でelapsedが取り直される。
    */


    /*
      退勤
    */

    const leaveTime =
      findLeaveTime();


    if (leaveTime) {

      state.leaveTime =
        leaveTime;
    }


    /*
      PREVIOUS / NEXT
    */

    if (state.currentTask) {

      const neighbours =
        findNeighbours(
          state.currentTask
        );


      if (
        neighbours.previous
      ) {

        state.previousTask =
          neighbours.previous.task;


        state.previousTime =
          neighbours.previous.time;
      } else {

        state.previousTask =
          null;


        state.previousTime =
          null;
      }


      if (
        neighbours.next
      ) {

        state.nextTask =
          neighbours.next.task;


        state.nextTime =
          neighbours.next.time;
      } else {

        state.nextTask =
          null;


        state.nextTime =
          null;
      }
    }


    state.lastSync =
      Date.now();


    if (taskChanged) {

      /*
        タスクが切り替わった場合は
        即描画。
      */

      render();
    }
  }


  /* =========================================================
     現在経過時間
     DOM同期の間はローカルで増やす
  ========================================================= */

  function currentElapsedSeconds() {

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


  function calculateStartTime() {

    const seconds =
      currentElapsedSeconds();


    if (seconds === null)
      return '--:--';


    const start =
      new Date(
        Date.now() -
        seconds * 1000
      );


    return (
      pad(start.getHours()) +
      ':' +
      pad(start.getMinutes())
    );
  }


  /* =========================================================
     UI PREP
     再実行時も閉じない。
     古いUIだけ作り直す。
  ========================================================= */

  if (window.tcNowRenderTimer) {

    clearInterval(
      window.tcNowRenderTimer
    );
  }


  if (window.tcNowSyncTimer) {

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
     SAFE AREA / BACKGROUND
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
      ) || 'width=device-width,initial-scale=1';


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


    /* =========================
       HEADER
    ========================= */

    #tc-header {

      min-width:
        0;

      display:
        grid;

      grid-template-columns:
        minmax(140px, .8fr)
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

      line-height:
        1.4;

      letter-spacing:
        .22em;

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


    /* =========================
       MAIN
    ========================= */

    #tc-main {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

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


    /* =========================
       NOW
    ========================= */

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


    #tc-start {

      color:
        #c6cad2;

      font-size:
        clamp(
          21px,
          3.5vw,
          44px
        );

      font-weight:
        500;

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

      font-weight:
        900;

      line-height:
        1.07;

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

      font-weight:
        700;

      font-variant-numeric:
        tabular-nums;
    }


    /* =========================
       SIDE
    ========================= */

    #tc-side {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

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


    .tc-card-row {

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

      letter-spacing:
        .08em;
    }


    /* =========================
       iPhone landscape
    ========================= */

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
          minmax(90px, .75fr)
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


    /* =========================
       Portrait
    ========================= */

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


      .tc-card-row {

        grid-template-columns:
          1fr;

        gap:
          3px;
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


    /* 時計 */

    $('tc-clock')
      .textContent =
        pad(now.getHours()) +
        ':' +
        pad(now.getMinutes());


    /* 現在タスク */

    $('tc-task')
      .textContent =
        state.currentTask ||
        'タスクを取得できません';


    const elapsed =
      currentElapsedSeconds();


    $('tc-elapsed')
      .textContent =
        secondsToHMS(
          elapsed
        );


    $('tc-start')
      .textContent =
        calculateStartTime();


    /* PREVIOUS */

    $('tc-prev-task')
      .textContent =
        state.previousTask ||
        '—';


    $('tc-prev-time')
      .textContent =
        state.previousTime ||
        '—';


    /* NEXT */

    $('tc-next-task')
      .textContent =
        state.nextTask ||
        '—';


    $('tc-next-time')
      .textContent =
        state.nextTime ||
        '—';


    /* 退勤 */

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
        Math.abs(
          diff
        );


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
    NOWを表示する前に一度同期
  */

  syncFromTaskChute();


  render();


  /*
    表示更新：1秒
  */

  window.tcNowRenderTimer =
    setInterval(
      render,
      RENDER_INTERVAL
    );


  /*
    TaskChute DOM同期：5秒
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
