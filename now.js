(() => {
  'use strict';

  /* =========================================================
     TaskChute NOW v3.2.0

     UI更新       : 1秒
     TaskChute同期: 5秒

     PREVIOUS : 1件
     NEXT     : 3件
  ========================================================= */

  const VERSION = '3.2.0';

  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  const UI_INTERVAL = 1000;
  const SYNC_INTERVAL = 5000;


  /* =========================================================
     UTIL
  ========================================================= */

  const pad = n =>
    String(n).padStart(2, '0');


  const clean = value =>
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();


  const txt = el =>
    clean(el?.textContent);


  const insideNow = el =>
    !!el?.closest?.('#' + ROOT_ID);


  const isHMS = value =>
    /^\d{2}:\d{2}:\d{2}$/.test(
      clean(value)
    );


  const isHM = value =>
    /^\d{1,2}:\d{2}$/.test(
      clean(value)
    );


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

    const h =
      Math.floor(total / 3600);

    const m =
      Math.floor(
        (total % 3600) / 60
      );

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


  function validTaskName(value) {

    const t =
      clean(value);

    if (!t)
      return false;

    if (
      t.length < 2 ||
      t.length > 120
    ) {
      return false;
    }

    if (
      isHM(t) ||
      isHMS(t)
    ) {
      return false;
    }

    if (
      /^-?\d{1,2}:\d{2}(:\d{2})?$/
        .test(t)
    ) {
      return false;
    }

    if (
      /^[-\d\s:./]+$/
        .test(t)
    ) {
      return false;
    }

    const blacklist =
      new Set([
        'Main',
        'NOW',
        'PREVIOUS',
        'NEXT',
        '退勤',
        'プロジェクトモード',
        'TaskChute Cloud 2',
        'タスクを取得できません'
      ]);

    return !blacklist.has(t);
  }


  /* =========================================================
     STATE
  ========================================================= */

  const state = {

    currentTask: null,

    elapsedBase: null,
    elapsedCapturedAt: null,

    leaveTime: null,

    previous: null,

    next: [],

    lastSync: null
  };


  /* =========================================================
     1. PLAYER取得

     実機DOM:

     経過時間
       ↓ parent
       ↓ parent
       ↓ previousElementSibling
     現在タスク
  ========================================================= */

  function findPlayer() {

    const times =
      [...document.querySelectorAll(
        'p, div, span'
      )]
        .filter(el => {

          if (insideNow(el))
            return false;

          return isHMS(
            txt(el)
          );
        });


    if (!times.length) {

      return {
        elapsedElement: null,
        elapsed: null,
        task: null
      };
    }


    /*
      各HH:MM:SSについて、
      実機で確認済みの位置にタスク名があるか調べる。
    */

    const candidates = [];


    for (const el of times) {

      const taskElement =
        el
          ?.parentElement
          ?.parentElement
          ?.previousElementSibling;


      const taskName =
        txt(taskElement);


      if (!validTaskName(taskName))
        continue;


      const rect =
        el.getBoundingClientRect();


      let score = 0;


      /*
        表示中の下部playerを優先
      */

      if (
        rect.width > 0 &&
        rect.height > 0
      ) {
        score += 1000;
      }


      /*
        画面下側ほどplayerらしい
      */

      score +=
        Math.max(
          0,
          Math.round(rect.top)
        );


      candidates.push({
        elapsedElement: el,
        elapsed: txt(el),
        task: taskName,
        score
      });
    }


    if (candidates.length) {

      candidates.sort(
        (a, b) =>
          b.score - a.score
      );

      return candidates[0];
    }


    /*
      念のため経過時間だけフォールバック
    */

    const fallback =
      times[times.length - 1];


    return {
      elapsedElement: fallback,
      elapsed: txt(fallback),
      task: null
    };
  }


  /* =========================================================
     2. 予定表側の現在タスク行を探す

     実機確認済み:
     タスク名を含む予定行の親には
     「プロジェクトモード」が含まれる。
  ========================================================= */

  function findScheduleRow(
    currentTask
  ) {

    if (!currentTask)
      return null;


    const exact =
      [...document.querySelectorAll(
        'body *'
      )]
        .filter(el => {

          if (insideNow(el))
            return false;

          return (
            txt(el) ===
            currentTask
          );
        });


    let best = null;


    for (const taskElement of exact) {

      let parent =
        taskElement;


      for (
        let level = 0;
        level < 7 && parent;
        level++,
        parent = parent.parentElement
      ) {

        const full =
          txt(parent);


        if (
          !full ||
          full.length > 500
        ) {
          continue;
        }


        /*
          予定タスク行の特徴
        */

        if (
          !full.includes(
            'プロジェクトモード'
          )
        ) {
          continue;
        }


        const rect =
          parent.getBoundingClientRect();


        let score = 0;


        /*
          実機では現在行の高さは小さい
        */

        if (
          rect.height >= 20 &&
          rect.height <= 100
        ) {
          score += 100;
        }


        /*
          横長の予定行
        */

        if (
          rect.width > 250
        ) {
          score += 100;
        }


        /*
          小さい祖先ほど優先
        */

        score -=
          level * 10;


        /*
          テキストがコンパクトなら優先
        */

        if (
          full.length < 250
        ) {
          score += 50;
        }


        if (
          !best ||
          score > best.score
        ) {

          best = {
            element: parent,
            taskElement,
            score
          };
        }
      }
    }


    return best;
  }


  /* =========================================================
     3. 一つの予定行を解析
  ========================================================= */

  function parseScheduleRow(
    row
  ) {

    if (!row)
      return null;


    const leaves =
      [...row.querySelectorAll('*')]
        .filter(el => {

          if (insideNow(el))
            return false;

          return (
            el.children.length === 0
          );
        });


    const values =
      leaves
        .map(el =>
          txt(el)
        )
        .filter(Boolean);


    /*
      最初に出てくる
      タスク名らしい文字列を採用
    */

    let taskName = null;


    for (const value of values) {

      if (
        validTaskName(value) &&
        value !==
          'プロジェクトモード'
      ) {

        taskName = value;

        break;
      }
    }


    /*
      行内の予定開始時刻。

      実機:
      晩ご飯17:29--:--...
    */

    let scheduledTime = null;


    if (taskName) {

      const full =
        txt(row);


      const escaped =
        taskName.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );


      const match =
        full.match(
          new RegExp(
            escaped +
            '(\\d{1,2}:\\d{2})'
          )
        );


      if (match) {

        scheduledTime =
          match[1];
      }
    }


    /*
      上記で取れなければ
      最初のHH:MM
    */

    if (!scheduledTime) {

      const times =
        values.filter(
          value =>
            isHM(value)
        );


      if (times.length) {

        scheduledTime =
          times[0];
      }
    }


    return {

      task:
        taskName,

      time:
        scheduledTime,

      element:
        row
    };
  }


  /* =========================================================
     4. 同じ種類の予定行を全部取得

     現在行と同じclassNameの要素を
     TaskChute予定順に配列化する。
  ========================================================= */

  function getScheduleRows(
    currentTask
  ) {

    const found =
      findScheduleRow(
        currentTask
      );


    if (!found)
      return [];


    const currentRow =
      found.element;


    const className =
      currentRow.className;


    let rows = [];


    /*
      現在行と同じMUI row classを持つ要素
    */

    if (
      typeof className ===
        'string' &&
      className.length
    ) {

      rows =
        [...document.querySelectorAll(
          'body *'
        )]
          .filter(el => {

            if (insideNow(el))
              return false;

            return (
              el.className ===
              className
            );
          });
    }


    /*
      同classが取れなかった場合、
      currentRowの親コンテナ内を探索
    */

    if (rows.length < 2) {

      const container =
        currentRow.parentElement;


      if (container) {

        rows =
          [...container.children];
      }
    }


    /*
      TaskChute予定行として
      パースできるものだけ残す
    */

    const parsed = [];


    for (const row of rows) {

      const item =
        parseScheduleRow(
          row
        );


      if (
        !item ||
        !item.task
      ) {
        continue;
      }


      /*
        section等を誤認しないよう
        「プロジェクトモード」含有を優先
      */

      const full =
        txt(row);


      if (
        !full.includes(
          'プロジェクトモード'
        )
      ) {
        continue;
      }


      parsed.push(item);
    }


    /*
      DOM順をそのまま予定順として使う。

      getBoundingClientRect()順は
      スクロールや非表示で壊れるため使わない。
    */

    return parsed;
  }


  /* =========================================================
     5. PREVIOUS 1件 / NEXT 3件
  ========================================================= */

  function findNeighbours(
    currentTask
  ) {

    const rows =
      getScheduleRows(
        currentTask
      );


    if (!rows.length) {

      return {
        previous: null,
        next: []
      };
    }


    /*
      同名タスクが複数あれば、
      現在予定行に最も近いものを使う。
      通常は最初の完全一致で十分。
    */

    const index =
      rows.findIndex(
        item =>
          item.task ===
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
        ? rows[index - 1]
        : null;


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
     6. 退勤予定時刻
  ========================================================= */

  function findLeaveTime() {

    const leaveNodes =
      [...document.querySelectorAll(
        'body *'
      )]
        .filter(el => {

          if (insideNow(el))
            return false;

          return (
            txt(el) ===
            '退勤'
          );
        });


    for (
      const leaveNode
      of leaveNodes
    ) {

      let parent =
        leaveNode;


      for (
        let level = 0;
        level < 9 && parent;
        level++,
        parent = parent.parentElement
      ) {

        const full =
          txt(parent);


        /*
          予定行を優先
        */

        if (
          full.includes(
            'プロジェクトモード'
          )
        ) {

          const times =
            [...parent.querySelectorAll(
              '*'
            )]
              .map(el =>
                txt(el)
              )
              .filter(value =>
                isHM(value)
              );


          const unique =
            [...new Set(times)];


          if (unique.length) {

            return unique[
              unique.length - 1
            ];
          }
        }
      }
    }


    /*
      以前成功した一般フォールバック
    */

    for (
      const leaveNode
      of leaveNodes
    ) {

      let parent =
        leaveNode;


      for (
        let level = 0;
        level < 9 && parent;
        level++,
        parent = parent.parentElement
      ) {

        const times =
          [...parent.querySelectorAll(
            '*'
          )]
            .map(el =>
              txt(el)
            )
            .filter(value =>
              isHM(value)
            );


        const unique =
          [...new Set(times)];


        if (unique.length) {

          return unique[
            unique.length - 1
          ];
        }
      }
    }


    return null;
  }


  /* =========================================================
     7. 5秒同期
  ========================================================= */

  function syncFromTaskChute() {

    /* ---------- PLAYER ---------- */

    const player =
      findPlayer();


    if (player.task) {

      state.currentTask =
        player.task;
    }


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


    /* ---------- LEAVE ---------- */

    const leave =
      findLeaveTime();


    if (leave) {

      state.leaveTime =
        leave;
    }


    /* ---------- PREV/NEXT ---------- */

    if (state.currentTask) {

      const neighbours =
        findNeighbours(
          state.currentTask
        );


      state.previous =
        neighbours.previous;


      state.next =
        neighbours.next;
    }


    state.lastSync =
      Date.now();
  }


  /* =========================================================
     8. 経過時間
  ========================================================= */

  function currentElapsedSeconds() {

    if (
      state.elapsedBase === null ||
      state.elapsedCapturedAt === null
    ) {
      return null;
    }


    const extra =
      Math.floor(
        (
          Date.now() -
          state.elapsedCapturedAt
        ) / 1000
      );


    return (
      state.elapsedBase +
      extra
    );
  }


  function startTimeText() {

    const elapsed =
      currentElapsedSeconds();


    if (elapsed === null)
      return '--:--';


    const start =
      new Date(
        Date.now() -
        elapsed * 1000
      );


    return (
      pad(start.getHours()) +
      ':' +
      pad(start.getMinutes())
    );
  }


  /* =========================================================
     9. 再実行処理

     再実行しても閉じない。
     古いNOWを消して再生成するだけ。
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
     10. VIEWPORT / SAFE AREA
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
     11. CSS
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
        #969aa4;

      --dim:
        #4c505a;


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
        1.3;

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
        minmax(200px, .90fr);

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
          16px,
          4.5vh,
          48px
        );
    }


    .tc-info-row {

      display:
        flex;

      align-items:
        baseline;

      gap:
        clamp(
          10px,
          1.5vw,
          20px
        );
    }


    .tc-info-label {

      color:
        #737784;

      font-size:
        clamp(
          11px,
          1.7vw,
          20px
        );

      font-weight:
        900;

      letter-spacing:
        .20em;

      flex:
        0 0 auto;
    }


    .tc-info-value {

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
    }


    #tc-task {

      margin:
        clamp(
          8px,
          2vh,
          18px
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
          18px
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

      gap:
        clamp(
          8px,
          1.5vw,
          18px
        );

      align-items:
        baseline;
    }


    .tc-task-row
      + .tc-task-row {

      margin-top:
        clamp(
          5px,
          1.2vh,
          11px
        );
    }


    .tc-side-time {

      color:
        #747985;

      font-size:
        clamp(
          17px,
          2.5vw,
          31px
        );

      white-space:
        nowrap;

      font-variant-numeric:
        tabular-nums;
    }


    .tc-side-task {

      min-width:
        0;

      color:
        #747985;

      font-size:
        clamp(
          17px,
          2.5vw,
          31px
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
          minmax(100px, .75fr)
          minmax(145px, 1fr)
          minmax(95px, .55fr);

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
          minmax(180px, .90fr);

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


      .tc-info-label {

        font-size:
          clamp(
            9px,
            3dvh,
            15px
          );
      }


      .tc-info-value {

        font-size:
          clamp(
            16px,
            5.1dvh,
            25px
          );
      }


      #tc-task {

        margin:
          clamp(
            4px,
            1.4dvh,
            8px
          )
          0;

        font-size:
          clamp(
            22px,
            7.5dvh,
            39px
          );

        line-height:
          1.02;
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
            1dvh,
            6px
          );
      }


      .tc-task-row
        + .tc-task-row {

        margin-top:
          clamp(
            2px,
            .7dvh,
            5px
          );
      }


      .tc-side-time,
      .tc-side-task {

        font-size:
          clamp(
            12px,
            3.7dvh,
            19px
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
     12. HTML
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


          <div class="tc-info-row">

            <span class="tc-info-label">
              START
            </span>

            <span
              id="tc-start"
              class="tc-info-value">
              --:--
            </span>

          </div>


          <div id="tc-task">
            タスクを取得できません
          </div>


          <div class="tc-info-row">

            <span class="tc-info-label">
              ELAPSED
            </span>

            <span
              id="tc-elapsed"
              class="tc-info-value">
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
                class="tc-side-time">
                —
              </span>

              <span
                id="tc-prev-task"
                class="tc-side-task">
                —
              </span>

            </div>

          </section>


          <section class="tc-card">

            <div class="tc-card-label">
              NEXT
            </div>


            <div
              id="tc-next-list">
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
     13. RENDER
  ========================================================= */

  const $ =
    id =>
      document.getElementById(
        id
      );


  function renderNextList() {

    const container =
      $('tc-next-list');


    if (!container)
      return;


    container.innerHTML =
      '';


    for (
      let i = 0;
      i < 3;
      i++
    ) {

      const item =
        state.next[i] || null;


      const row =
        document.createElement(
          'div'
        );


      row.className =
        'tc-task-row';


      const time =
        document.createElement(
          'span'
        );


      time.className =
        'tc-side-time';


      time.textContent =
        item?.time || '—';


      const task =
        document.createElement(
          'span'
        );


      task.className =
        'tc-side-task';


      task.textContent =
        item?.task || '—';


      row.append(
        time,
        task
      );


      container.appendChild(
        row
      );
    }
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


    /* current */

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
        startTimeText();


    /* previous */

    $('tc-prev-time')
      .textContent =
        state.previous?.time ||
        '—';


    $('tc-prev-task')
      .textContent =
        state.previous?.task ||
        '—';


    /* next 3 */

    renderNextList();


    /* leave */

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
        Math.abs(
          diff
        );


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
     14. START

     最初の同期は、
     NOWを表示する前に行う。
  ========================================================= */

  syncFromTaskChute();


  render();


  /* 1秒表示 */

  window.tcNowRenderTimer =
    setInterval(
      render,
      UI_INTERVAL
    );


  /* 5秒DOM同期 */

  window.tcNowSyncTimer =
    setInterval(
      () => {

        syncFromTaskChute();

        render();

      },
      SYNC_INTERVAL
    );

})();
