(() => {
  'use strict';

  /* =========================================================
     NOW
     Unified Mobile Edition
     v4.3.0

     iOS Safari
     Android Firefox / Violentmonkey

     Common source:
     GitHub Pages /v4/now.js
  ========================================================= */

  const VERSION = '4.3.0';

  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  const SYNC_INTERVAL = 5000;
  const RENDER_INTERVAL = 1000;


  /* =========================================================
     ENVIRONMENT
  ========================================================= */

  const UA =
    navigator.userAgent || '';

  const IS_IOS =
    /iPhone|iPad|iPod/i.test(UA);

  const IS_ANDROID =
    /Android/i.test(UA);

  const IS_FIREFOX =
    /Firefox|FxiOS/i.test(UA);


  /* =========================================================
     UTIL
  ========================================================= */

  const clean = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();


  const pad = n =>
    String(n)
      .padStart(2, '0');


  const text = el =>
    clean(
      el?.textContent
    );


  const isInsideNow = el =>
    !!el?.closest?.(
      '#' + ROOT_ID
    );


  const isHM = value =>
    /^\d{1,2}:\d{2}$/
      .test(
        clean(value)
      );


  const isHMS = value =>
    /^\d{2}:\d{2}:\d{2}$/
      .test(
        clean(value)
      );


  function hmsToSeconds(
    value
  ) {

    const m =
      clean(value)
        .match(
          /^(\d{1,2}):(\d{2}):(\d{2})$/
        );


    if (!m) {
      return null;
    }


    return (
      Number(m[1]) * 3600 +
      Number(m[2]) * 60 +
      Number(m[3])
    );
  }


  function durationToSeconds(
    value
  ) {

    const m =
      clean(value)
        .match(
          /^(\d{1,2}):(\d{2})$/
        );


    if (!m) {
      return null;
    }


    return (
      Number(m[1]) * 3600 +
      Number(m[2]) * 60
    );
  }


  function secondsToHMS(
    seconds
  ) {

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


  function secondsToHM(
    seconds
  ) {

    if (
      seconds === null ||
      seconds === undefined ||
      Number.isNaN(seconds)
    ) {

      return '--:--';
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


    return (
      pad(h) +
      ':' +
      pad(m)
    );
  }


  function clockToSecondsOfDay(
    value
  ) {

    const m =
      clean(value)
        .match(
          /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
        );


    if (!m) {
      return null;
    }


    const h =
      Number(m[1]);

    const min =
      Number(m[2]);

    const sec =
      Number(
        m[3] || 0
      );


    if (
      h < 0 ||
      h > 23 ||
      min < 0 ||
      min > 59 ||
      sec < 0 ||
      sec > 59
    ) {

      return null;
    }


    return (
      h * 3600 +
      min * 60 +
      sec
    );
  }


  function resolveClockAtOrBefore(
    value,
    referenceDate
  ) {

    const secondsOfDay =
      clockToSecondsOfDay(
        value
      );


    if (
      secondsOfDay === null
    ) {

      return null;
    }


    const reference =
      referenceDate instanceof Date
        ? new Date(
            referenceDate.getTime()
          )
        : new Date();


    const result =
      new Date(
        reference.getFullYear(),
        reference.getMonth(),
        reference.getDate(),
        0,
        0,
        0,
        0
      );


    result.setSeconds(
      secondsOfDay
    );


    if (
      result.getTime() >
      reference.getTime()
    ) {

      result.setDate(
        result.getDate() - 1
      );
    }


    return result;
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


  function validTaskName(
    value
  ) {

    const t =
      clean(value);


    if (!t) {
      return false;
    }


    if (
      t.length > 150 ||
      isHM(t) ||
      isHMS(t)
    ) {

      return false;
    }


    if (
      /^[-\d\s:./]+$/
        .test(t)
    ) {

      return false;
    }


    return true;
  }


  function isSectionName(
    value
  ) {

    const t =
      clean(value);


    if (!t) {
      return false;
    }


    return (
      /^\d{1,2}:\d{2}\s*[-–—〜~]\s*\d{1,2}:\d{2}/
        .test(t)
    );
  }


  /* =========================================================
     STATE
  ========================================================= */

  const state = {

    currentTask:
      null,

    currentStart:
      null,

    plannedSeconds:
      null,

    elapsedBase:
      null,

    elapsedCapturedAt:
      null,

    previous:
      null,

    next:
      [],

    leaveTime:
      null
  };


  /* =========================================================
     TASK ROWS
  ========================================================= */

  function getTaskRowElements() {

    return [
      ...document
        .querySelectorAll(
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
          el
            .getBoundingClientRect();


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


  function findScheduleRow(
    taskName
  ) {

    if (!taskName) {
      return null;
    }


    const candidates =
      getTaskRowElements()
        .filter(el =>
          clean(
            el.textContent
          ) ===
          taskName
        );


    for (
      const taskEl
      of candidates
    ) {

      const row =
        taskEl
          .parentElement;


      if (!row) {
        continue;
      }


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


  function getRowLeafValues(
    row
  ) {

    if (!row) {
      return [];
    }


    return [
      ...row
        .querySelectorAll(
          '*'
        )
    ]
      .filter(el =>
        el.children.length === 0 &&
        clean(
          el.textContent
        )
      )
      .map(el => ({

        value:
          clean(
            el.textContent
          ),

        tag:
          el.tagName,

        el
      }));
  }


  /* =========================================================
     SCHEDULE LIST
  ========================================================= */

  function getScheduleRows() {

    const rows =
      [];


    for (
      const taskEl
      of getTaskRowElements()
    ) {

      const task =
        clean(
          taskEl.textContent
        );


      if (
        !validTaskName(
          task
        )
      ) {

        continue;
      }


      if (
        isSectionName(
          task
        )
      ) {

        continue;
      }


      const row =
        taskEl
          .parentElement;


      if (!row) {
        continue;
      }


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


      let start =
        null;

      let finish =
        null;

      let actualDuration =
        null;

      let planned =
        null;

      let scheduleTime =
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


      if (
        leaves[5] &&
        isHM(
          leaves[5].value
        )
      ) {

        actualDuration =
          leaves[5].value;
      }


      if (
        leaves[6] &&
        isHM(
          leaves[6].value
        )
      ) {

        planned =
          leaves[6].value;
      }


      const HMvalues =
        leaves
          .map(
            x =>
              x.value
          )
          .filter(
            isHM
          );


      if (!start) {

        const last =
          HMvalues[
            HMvalues.length - 1
          ];


        if (last) {

          scheduleTime =
            last;
        }

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
          rect.top,

        taskEl,

        rowEl:
          row
      });
    }


    rows.sort(
      (a, b) =>
        a.top -
        b.top
    );


    const unique =
      [];


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
     CURRENT TASK INFO
  ========================================================= */

  function getCurrentScheduleInfo(
    currentTask,
    currentRow
  ) {

    const found =
      currentRow?.rowEl
        ? {
            taskEl:
              currentRow.taskEl,

            row:
              currentRow.rowEl
          }
        : findScheduleRow(
            currentTask
          );


    if (!found) {
      return null;
    }


    const leaves =
      getRowLeafValues(
        found.row
      );


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


    if (
      leaves[2]
    ) {

      const v =
        leaves[2].value;


      if (
        isHM(v) ||
        isHMS(v)
      ) {

        finish =
          v;
      }
    }


    if (
      leaves[6] &&
      isHM(
        leaves[6].value
      )
    ) {

      planned =
        leaves[6].value;
    }


    if (!planned) {

      const buttonDurations =
        leaves
          .filter(
            x =>
              x.tag === 'BUTTON' &&
              isHM(
                x.value
              )
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
     CURRENT PLAYER
  ========================================================= */

  function findCurrentPlayer(
    rows
  ) {

    const now =
      new Date();


    const activeRows =
      rows
        .filter(
          row =>
            !!row.start &&
            !row.finish
        )
        .map(
          row => ({

            row,

            startDate:
              resolveClockAtOrBefore(
                row.start,
                now
              )
          })
        )
        .filter(
          item =>
            item.startDate
        );


    if (
      !activeRows.length
    ) {

      return null;
    }


    activeRows.sort(
      (a, b) => {

        const byStart =
          b.startDate.getTime() -
          a.startDate.getTime();


        if (
          byStart !== 0
        ) {

          return byStart;
        }


        return (
          b.row.top -
          a.row.top
        );
      }
    );


    const active =
      activeRows[0];


    const currentRow =
      active.row;


    const elapsedElements =
      [
        ...document
          .querySelectorAll(
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


    const elapsedCandidates =
      [];


    for (
      const elapsedEl
      of elapsedElements
    ) {

      const taskEl =
        elapsedEl
          ?.parentElement
          ?.parentElement
          ?.previousElementSibling;


      if (!taskEl) {
        continue;
      }


      const taskName =
        clean(
          taskEl.textContent
        );


      if (
        taskName !==
        currentRow.task
      ) {

        continue;
      }


      const rect =
        elapsedEl
          .getBoundingClientRect();


      elapsedCandidates.push({

        elapsed:
          clean(
            elapsedEl.textContent
          ),

        top:
          rect.top,

        visible:
          rect.width > 0 &&
          rect.height > 0
      });
    }


    elapsedCandidates.sort(
      (a, b) => {

        if (
          a.visible !==
          b.visible
        ) {

          return a.visible
            ? -1
            : 1;
        }


        return (
          b.top -
          a.top
        );
      }
    );


    let elapsedSeconds =
      null;


    if (
      elapsedCandidates.length
    ) {

      elapsedSeconds =
        hmsToSeconds(
          elapsedCandidates[0]
            .elapsed
        );
    }


    if (
      elapsedSeconds === null
    ) {

      elapsedSeconds =
        Math.max(
          0,
          Math.floor(
            (
              now.getTime() -
              active.startDate.getTime()
            ) /
            1000
          )
        );
    }


    return {

      task:
        currentRow.task,

      row:
        currentRow,

      startDate:
        active.startDate,

      elapsedSeconds
    };
  }


  /* =========================================================
     PREVIOUS
  ========================================================= */

  function getPreviousTask(
    rows,
    referenceDate
  ) {

    const anchor =
      referenceDate instanceof Date
        ? referenceDate
        : new Date();


    const completed =
      rows
        .filter(
          row =>
            !!row.start &&
            !!row.finish
        )
        .map(
          row => ({

            row,

            finishDate:
              resolveClockAtOrBefore(
                row.finish,
                anchor
              )
          })
        )
        .filter(
          item =>
            item.finishDate &&
            item.finishDate.getTime() <=
              anchor.getTime()
        );


    if (
      !completed.length
    ) {

      return null;
    }


    completed.sort(
      (a, b) => {

        const byFinish =
          b.finishDate.getTime() -
          a.finishDate.getTime();


        if (
          byFinish !== 0
        ) {

          return byFinish;
        }


        return (
          b.row.top -
          a.row.top
        );
      }
    );


    return completed[0].row;
  }


  /* =========================================================
     NEXT
  ========================================================= */

  function getNextTasks(
    rows,
    currentRow
  ) {

    if (!currentRow) {
      return [];
    }


    const index =
      rows.indexOf(
        currentRow
      );


    if (
      index < 0
    ) {

      return [];
    }


    return rows.slice(
      index + 1,
      index + 6
    );
  }


  /* =========================================================
     LEAVE
  ========================================================= */

  function getLeaveTime(
    rows
  ) {

    const leave =
      rows.find(
        x =>
          x.task ===
          '退勤'
      );


    if (!leave) {
      return null;
    }


    return (
      leave.scheduleTime ||
      leave.start ||
      null
    );
  }


  /* =========================================================
     CURRENT CLEAR
  ========================================================= */

  function clearCurrentState() {

    state.currentTask =
      null;

    state.currentStart =
      null;

    state.plannedSeconds =
      null;

    state.elapsedBase =
      null;

    state.elapsedCapturedAt =
      null;
  }


  /* =========================================================
     SYNC
  ========================================================= */

  function sync() {

    const rows =
      getScheduleRows();


    const player =
      findCurrentPlayer(
        rows
      );


    if (
      player
    ) {

      const taskChanged =
        state.currentTask !==
        player.task;


      if (
        taskChanged
      ) {

        state.currentStart =
          null;

        state.plannedSeconds =
          null;

        state.elapsedBase =
          null;

        state.elapsedCapturedAt =
          null;
      }


      state.currentTask =
        player.task;


      state.currentStart =
        null;

      state.plannedSeconds =
        null;


      const info =
        getCurrentScheduleInfo(
          player.task,
          player.row
        );


      if (
        info
      ) {

        if (
          info.start
        ) {

          state.currentStart =
            info.start;
        }


        if (
          info.plannedSeconds !==
          null
        ) {

          state.plannedSeconds =
            info.plannedSeconds;
        }
      }


      if (
        !state.currentStart &&
        player.row?.start
      ) {

        state.currentStart =
          player.row.start;
      }


      if (
        player.elapsedSeconds !==
        null &&
        player.elapsedSeconds !==
        undefined
      ) {

        state.elapsedBase =
          player.elapsedSeconds;

        state.elapsedCapturedAt =
          Date.now();
      }


      state.previous =
        getPreviousTask(
          rows,
          player.startDate
        );


      state.next =
        getNextTasks(
          rows,
          player.row
        );

    } else {

      clearCurrentState();


      state.previous =
        getPreviousTask(
          rows,
          new Date()
        );


      state.next =
        [];
    }


    state.leaveTime =
      getLeaveTime(
        rows
      ) ||
      null;
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
        ) /
        1000
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
     CLEANUP
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


  if (
    typeof window.tcNowViewportCleanup ===
    'function'
  ) {

    window.tcNowViewportCleanup();
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


  document
    .getElementById(
      'tc-now-return-button'
    )
    ?.remove();


  /* =========================================================
     iOS VIEWPORT
  ========================================================= */

  if (
    IS_IOS
  ) {

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
        viewport
          .getAttribute(
            'content'
          ) ||
        '';


      if (
        !content.includes(
          'viewport-fit=cover'
        )
      ) {

        content +=
          ',viewport-fit=cover';


        viewport
          .setAttribute(
            'content',
            content
          );
      }
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

    #${ROOT_ID},
    #${ROOT_ID} * {

      box-sizing:
        border-box;
    }


    #${ROOT_ID} {

      --bg:#07090d;
      --panel:#1a2029;
      --panel2:#0d1016;
      --text:#f5f5f7;
      --muted:#858a96;
      --dim:#555a66;
      --over:#ff6363;

      position:
        fixed;

      top:
        0;

      left:
        0;

      z-index:
        2147483647;

      width:
        100%;

      height:
        100%;

      overflow:
        hidden;

      background:
        var(--bg);

      color:
        var(--text);

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        "Helvetica Neue",
        "Hiragino Sans",
        "Yu Gothic",
        sans-serif;

      padding:
        max(
          8px,
          env(
            safe-area-inset-top
          )
        )
        max(
          12px,
          env(
            safe-area-inset-right
          )
        )
        max(
          8px,
          env(
            safe-area-inset-bottom
          )
        )
        max(
          12px,
          env(
            safe-area-inset-left
          )
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
        minmax(
          0,
          1fr
        );

      gap:
        clamp(
          10px,
          2.5vh,
          26px
        );
    }


    /* =====================================================
       HEADER
    ===================================================== */

    #tc-header {

      display:
        grid;

      grid-template-columns:
        minmax(
          170px,
          .85fr
        )
        minmax(
          330px,
          1.4fr
        )
        minmax(
          130px,
          .7fr
        );

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

      display:
        flex;

      align-items:
        center;

      gap:
        clamp(
          20px,
          3vw,
          48px
        );

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

      white-space:
        nowrap;
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

      white-space:
        nowrap;
    }


    /* =====================================================
       MAIN
    ===================================================== */

    #tc-main {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

      grid-template-columns:
        minmax(
          0,
          1.65fr
        )
        minmax(
          250px,
          .9fr
        );

      gap:
        clamp(
          12px,
          2.4vw,
          30px
        );
    }


    /* =====================================================
       CURRENT TASK
    ===================================================== */

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
        .14em;

      border-radius:
        18px;

      padding:
        9px 20px;

      margin-bottom:
        clamp(
          12px,
          3vh,
          30px
        );

      white-space:
        nowrap;
    }


    .tc-now-metric {

      display:
        grid;

      grid-template-columns:
        clamp(
          150px,
          15vw,
          210px
        )
        minmax(
          0,
          1fr
        );

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


    #tc-status-label.tc-over,
    #tc-status-value.tc-over {

      color:
        var(--over);
    }


    #tc-status-value.tc-over {

      font-weight:
        700;
    }


    /* =====================================================
       SIDE
    ===================================================== */

    #tc-side {

      min-width:
        0;

      min-height:
        0;

      display:
        grid;

      /*
        v4.3.0

        NEXTを広く、
        PREVIOUSをコンパクトに。
      */

      grid-template-rows:
        minmax(
          0,
          1.45fr
        )
        minmax(
          0,
          .55fr
        );

      gap:
        clamp(
          10px,
          2vh,
          20px
        );
    }


    #tc-next-card {

      grid-row:
        1;
    }


    #tc-prev-card {

      grid-row:
        2;
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
        flex-start;
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
          7px,
          1.1vh,
          12px
        );

      flex-shrink:
        0;
    }


    /* =====================================================
       PREVIOUS
    ===================================================== */

    #tc-prev-task {

      color:
        #767b86;

      font-size:
        clamp(
          18px,
          2.6vw,
          32px
        );

      font-weight:
        800;

      line-height:
        1.15;

      margin-top:
        2px;

      margin-bottom:
        clamp(
          8px,
          1.4vh,
          14px
        );

      white-space:
        nowrap;

      overflow:
        hidden;

      text-overflow:
        ellipsis;

      flex-shrink:
        0;
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
        minmax(
          0,
          1fr
        );

      align-items:
        baseline;

      column-gap:
        12px;

      margin:
        1px 0;
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


    /* =====================================================
       NEXT
    ===================================================== */

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
        minmax(
          0,
          1fr
        );

      column-gap:
        clamp(
          10px,
          1.4vw,
          18px
        );

      align-items:
        baseline;
    }


    /*
      v4.3.0
      横・縦ともNEXTは最大5件表示。
    */

    #tc-next-list
    .tc-next-row {

      display:
        grid;
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


    /* =====================================================
       LANDSCAPE PREVIOUS COMPACT
    ===================================================== */

    #${ROOT_ID}.layout-landscape
    #tc-prev-card {

      padding:
        clamp(
          8px,
          1.5vh,
          14px
        )
        clamp(
          14px,
          1.8vw,
          24px
        );
    }


    #${ROOT_ID}.layout-landscape
    #tc-prev-card
    .tc-card-title {

      font-size:
        clamp(
          9px,
          1.1vw,
          14px
        );

      margin-bottom:
        clamp(
          3px,
          .5vh,
          6px
        );
    }


    #${ROOT_ID}.layout-landscape
    #tc-prev-task {

      font-size:
        clamp(
          14px,
          1.65vw,
          23px
        );

      line-height:
        1.05;

      margin:
        0 0
        clamp(
          3px,
          .5vh,
          6px
        );
    }


    #${ROOT_ID}.layout-landscape
    .tc-prev-metric {

      grid-template-columns:
        clamp(
          58px,
          5.8vw,
          85px
        )
        minmax(
          0,
          1fr
        );

      column-gap:
        clamp(
          6px,
          .8vw,
          10px
        );

      margin:
        0;
    }


    #${ROOT_ID}.layout-landscape
    .tc-prev-label {

      font-size:
        clamp(
          8px,
          .9vw,
          12px
        );

      letter-spacing:
        .13em;
    }


    #${ROOT_ID}.layout-landscape
    .tc-prev-value {

      font-size:
        clamp(
          13px,
          1.45vw,
          20px
        );

      line-height:
        1.05;
    }


    /* =====================================================
       ANDROID TASK / NOW
    ===================================================== */

    #tc-task-toggle {

      display:
        none;

      position:
        absolute;

      left:
        max(
          12px,
          env(
            safe-area-inset-left
          )
        );

      bottom:
        max(
          8px,
          env(
            safe-area-inset-bottom
          )
        );

      z-index:
        5;

      appearance:
        none;

      border:
        1px solid #3b414d;

      border-radius:
        999px;

      background:
        #11151c;

      color:
        #9da3af;

      font:
        inherit;

      font-size:
        10px;

      font-weight:
        900;

      letter-spacing:
        .12em;

      line-height:
        1;

      padding:
        7px 10px;

      opacity:
        .88;
    }


    #${ROOT_ID}.platform-android
    #tc-task-toggle {

      display:
        block;
    }


    #tc-now-return-button {

      display:
        none;

      position:
        fixed;

      right:
        10px;

      bottom:
        10px;

      z-index:
        2147483647;

      appearance:
        none;

      border:
        1px solid #3b414d;

      border-radius:
        999px;

      background:
        #11151c;

      color:
        #f5f5f7;

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        "Helvetica Neue",
        "Hiragino Sans",
        "Yu Gothic",
        sans-serif;

      font-size:
        11px;

      font-weight:
        900;

      letter-spacing:
        .12em;

      line-height:
        1;

      padding:
        9px 12px;

      box-shadow:
        0 2px 10px
        rgba(
          0,
          0,
          0,
          .35
        );
    }


    #tc-version {

      position:
        absolute;

      right:
        max(
          11px,
          env(
            safe-area-inset-right
          )
        );

      bottom:
        max(
          4px,
          env(
            safe-area-inset-bottom
          )
        );

      color:
        #41454f;

      font-size:
        10px;

      font-weight:
        700;
    }


    /* =====================================================
       PORTRAIT
    ===================================================== */

    #${ROOT_ID}.layout-portrait {

      padding:
        max(
          8px,
          env(
            safe-area-inset-top
          )
        )
        max(
          10px,
          env(
            safe-area-inset-right
          )
        )
        max(
          8px,
          env(
            safe-area-inset-bottom
          )
        )
        max(
          10px,
          env(
            safe-area-inset-left
          )
        );
    }


    #${ROOT_ID}.layout-portrait
    #tc-layout {

      grid-template-rows:
        auto
        minmax(
          0,
          1fr
        );

      gap:
        8px;
    }


    #${ROOT_ID}.layout-portrait
    #tc-header {

      grid-template-columns:
        minmax(
          0,
          1fr
        )
        auto;

      grid-template-areas:
        "brand clock"
        "leave leave";

      align-items:
        center;

      column-gap:
        10px;

      row-gap:
        4px;
    }


    #${ROOT_ID}.layout-portrait
    #tc-brand {

      grid-area:
        brand;

      font-size:
        clamp(
          15px,
          4.5vw,
          20px
        );

      letter-spacing:
        .11em;
    }


    #${ROOT_ID}.layout-portrait
    #tc-clock {

      grid-area:
        clock;

      justify-self:
        end;

      font-size:
        clamp(
          40px,
          12vw,
          54px
        );

      line-height:
        .95;
    }


    #${ROOT_ID}.layout-portrait
    #tc-leave {

      grid-area:
        leave;

      display:
        flex;

      align-items:
        center;

      gap:
        clamp(
          18px,
          6vw,
          32px
        );

      font-size:
        clamp(
          14px,
          4.1vw,
          18px
        );

      line-height:
        1.1;
    }


    #${ROOT_ID}.layout-portrait
    .tc-leave-row {

      display:
        grid;

      grid-template-columns:
        max-content
        max-content;

      column-gap:
        .45em;
    }


    #${ROOT_ID}.layout-portrait
    #tc-main {

      display:
        grid;

      grid-template-columns:
        1fr;

      grid-template-rows:
        minmax(
          0,
          1.15fr
        )
        minmax(
          0,
          1.35fr
        );

      gap:
        8px;

      min-height:
        0;
    }


    #${ROOT_ID}.layout-portrait
    #tc-side {

      display:
        flex;

      flex-direction:
        column;

      gap:
        7px;

      min-height:
        0;
    }


    #${ROOT_ID}.layout-portrait
    #tc-next-card {

      order:
        1;

      grid-row:
        auto;
    }


    #${ROOT_ID}.layout-portrait
    #tc-prev-card {

      order:
        2;

      grid-row:
        auto;
    }


    #${ROOT_ID}.layout-portrait
    #tc-side
    > .tc-card {

      flex:
        1 1 0;
    }


    #${ROOT_ID}.layout-portrait
    #tc-now {

      justify-content:
        flex-start;

      padding:
        11px
        18px;

      border-radius:
        20px;
    }


    #${ROOT_ID}.layout-portrait
    #tc-now::before {

      width:
        6px;
    }


    #${ROOT_ID}.layout-portrait
    #tc-now-badge {

      font-size:
        11px;

      padding:
        5px
        12px;

      margin-bottom:
        6px;

      border-radius:
        11px;

      letter-spacing:
        .11em;
    }


    #${ROOT_ID}.layout-portrait
    .tc-now-metric {

      grid-template-columns:
        122px
        minmax(
          0,
          1fr
        );

      column-gap:
        10px;
    }


    #${ROOT_ID}.layout-portrait
    .tc-now-label {

      font-size:
        clamp(
          10px,
          3.1vw,
          13px
        );

      letter-spacing:
        .14em;
    }


    #${ROOT_ID}.layout-portrait
    .tc-now-value {

      font-size:
        clamp(
          20px,
          5.8vw,
          27px
        );

      line-height:
        1.02;
    }


    #${ROOT_ID}.layout-portrait
    #tc-task {

      margin:
        5px
        0
        6px;

      font-size:
        clamp(
          27px,
          8.2vw,
          37px
        );

      line-height:
        1.02;

      white-space:
        nowrap;

      overflow:
        hidden;

      text-overflow:
        ellipsis;
    }


    #${ROOT_ID}.layout-portrait
    #tc-progress {

      gap:
        2px;
    }


    #${ROOT_ID}.layout-portrait
    #tc-status-row {

      margin-top:
        0;
    }


    #${ROOT_ID}.layout-portrait
    .tc-card {

      padding:
        9px
        14px;

      border-radius:
        16px;

      justify-content:
        flex-start;
    }


    #${ROOT_ID}.layout-portrait
    .tc-card-title {

      font-size:
        clamp(
          10px,
          3.1vw,
          13px
        );

      letter-spacing:
        .16em;

      margin-bottom:
        4px;
    }


    #${ROOT_ID}.layout-portrait
    #tc-next-list {

      gap:
        3px;
    }


    #${ROOT_ID}.layout-portrait
    #tc-next-list
    .tc-next-row {

      display:
        grid;
    }


    #${ROOT_ID}.layout-portrait
    .tc-next-row {

      grid-template-columns:
        60px
        minmax(
          0,
          1fr
        );

      column-gap:
        9px;
    }


    #${ROOT_ID}.layout-portrait
    .tc-next-time,
    #${ROOT_ID}.layout-portrait
    .tc-next-task {

      font-size:
        clamp(
          15px,
          4.4vw,
          20px
        );

      line-height:
        1.1;
    }


    #${ROOT_ID}.layout-portrait
    #tc-prev-task {

      font-size:
        clamp(
          16px,
          4.8vw,
          21px
        );

      line-height:
        1.05;

      margin-top:
        0;

      margin-bottom:
        4px;

      white-space:
        nowrap;

      overflow:
        hidden;

      text-overflow:
        ellipsis;
    }


    #${ROOT_ID}.layout-portrait
    .tc-prev-metric {

      grid-template-columns:
        76px
        minmax(
          0,
          1fr
        );

      column-gap:
        9px;

      margin:
        0;
    }


    #${ROOT_ID}.layout-portrait
    .tc-prev-label {

      font-size:
        clamp(
          9px,
          2.7vw,
          11px
        );

      letter-spacing:
        .13em;
    }


    #${ROOT_ID}.layout-portrait
    .tc-prev-value {

      font-size:
        clamp(
          14px,
          4.2vw,
          18px
        );

      line-height:
        1.05;
    }


    #${ROOT_ID}.layout-portrait
    #tc-version {

      font-size:
        8px;
    }


    /* =====================================================
       SMALL LANDSCAPE
    ===================================================== */

    @media
      (max-height:500px) {

      #${ROOT_ID}.layout-landscape {

        padding:
          max(
            4px,
            env(
              safe-area-inset-top
            )
          )
          max(
            8px,
            env(
              safe-area-inset-right
            )
          )
          max(
            4px,
            env(
              safe-area-inset-bottom
            )
          )
          max(
            8px,
            env(
              safe-area-inset-left
            )
          );
      }


      #${ROOT_ID}.layout-landscape
      #tc-layout {

        grid-template-rows:
          17dvh
          minmax(
            0,
            1fr
          );

        gap:
          1.8dvh;
      }


      #${ROOT_ID}.layout-landscape
      #tc-header {

        grid-template-columns:
          minmax(
            100px,
            .7fr
          )
          minmax(
            300px,
            1.4fr
          )
          auto;
      }


      #${ROOT_ID}.layout-landscape
      #tc-brand {

        font-size:
          clamp(
            10px,
            3.2dvh,
            17px
          );
      }


      #${ROOT_ID}.layout-landscape
      #tc-leave {

        gap:
          clamp(
            14px,
            2vw,
            28px
          );

        font-size:
          clamp(
            12px,
            4dvh,
            20px
          );
      }


      #${ROOT_ID}.layout-landscape
      #tc-clock {

        font-size:
          clamp(
            29px,
            11.5dvh,
            58px
          );
      }


      #${ROOT_ID}.layout-landscape
      #tc-main {

        grid-template-columns:
          minmax(
            0,
            1.65fr
          )
          minmax(
            190px,
            .9fr
          );

        gap:
          1.6vw;
      }


      #${ROOT_ID}.layout-landscape
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


      #${ROOT_ID}.layout-landscape
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


      #${ROOT_ID}.layout-landscape
      .tc-now-metric {

        grid-template-columns:
          clamp(
            100px,
            12vw,
            145px
          )
          minmax(
            0,
            1fr
          );

        column-gap:
          1.2vw;
      }


      #${ROOT_ID}.layout-landscape
      .tc-now-label {

        font-size:
          clamp(
            9px,
            2.9dvh,
            14px
          );
      }


      #${ROOT_ID}.layout-landscape
      .tc-now-value {

        font-size:
          clamp(
            16px,
            5dvh,
            25px
          );
      }


      #${ROOT_ID}.layout-landscape
      #tc-task {

        font-size:
          clamp(
            22px,
            7.4dvh,
            39px
          );

        margin:
          1.2dvh 0;

        line-height:
          1;
      }


      #${ROOT_ID}.layout-landscape
      #tc-progress {

        gap:
          .4dvh;
      }


      #${ROOT_ID}.layout-landscape
      #tc-side {

        gap:
          1.3dvh;
      }


      #${ROOT_ID}.layout-landscape
      #tc-next-card {

        padding:
          1.3dvh
          1.4vw;
      }


      #${ROOT_ID}.layout-landscape
      #tc-next-card
      .tc-card-title {

        font-size:
          clamp(
            9px,
            2.8dvh,
            14px
          );

        margin-bottom:
          .4dvh;
      }


      #${ROOT_ID}.layout-landscape
      .tc-next-time,
      #${ROOT_ID}.layout-landscape
      .tc-next-task {

        font-size:
          clamp(
            12px,
            3.6dvh,
            19px
          );
      }


      #${ROOT_ID}.layout-landscape
      #tc-next-list {

        gap:
          .35dvh;
      }


      #${ROOT_ID}.layout-landscape
      #tc-prev-card {

        padding:
          .8dvh
          1.4vw;
      }


      #${ROOT_ID}.layout-landscape
      #tc-prev-card
      .tc-card-title {

        font-size:
          clamp(
            8px,
            2.4dvh,
            12px
          );

        margin-bottom:
          .2dvh;
      }


      #${ROOT_ID}.layout-landscape
      #tc-prev-task {

        font-size:
          clamp(
            12px,
            3.3dvh,
            18px
          );

        margin:
          0 0 .2dvh;
      }


      #${ROOT_ID}.layout-landscape
      .tc-prev-metric {

        grid-template-columns:
          clamp(
            55px,
            6vw,
            78px
          )
          1fr;

        margin:
          0;
      }


      #${ROOT_ID}.layout-landscape
      .tc-prev-label {

        font-size:
          clamp(
            7px,
            2.2dvh,
            11px
          );
      }


      #${ROOT_ID}.layout-landscape
      .tc-prev-value {

        font-size:
          clamp(
            11px,
            3dvh,
            17px
          );
      }
    }


    /* =====================================================
       ANDROID / FIREFOX MEDIUM LANDSCAPE
    ===================================================== */

    @media
      (min-height:501px)
      and (max-height:650px) {

      #${ROOT_ID}.browser-firefox.layout-landscape {

        padding:
          10px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-layout {

        grid-template-rows:
          65px
          minmax(
            0,
            1fr
          );

        gap:
          9px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-header {

        grid-template-columns:
          minmax(
            120px,
            .6fr
          )
          minmax(
            280px,
            1.3fr
          )
          auto;

        gap:
          12px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-brand {

        font-size:
          15px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-leave {

        gap:
          clamp(
            14px,
            2vw,
            28px
          );

        font-size:
          14px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-clock {

        font-size:
          44px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-main {

        grid-template-columns:
          minmax(
            0,
            1.68fr
          )
          minmax(
            260px,
            .95fr
          );

        gap:
          9px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-now {

        padding:
          20px
          26px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-now-badge {

        font-size:
          14px;

        margin-bottom:
          13px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      .tc-now-metric {

        grid-template-columns:
          125px
          1fr;

        column-gap:
          12px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      .tc-now-label {

        font-size:
          11px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      .tc-now-value {

        font-size:
          21px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-task {

        font-size:
          32px;

        margin:
          7px 0;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-progress {

        gap:
          3px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-side {

        gap:
          7px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-next-card {

        padding:
          11px
          17px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-next-card
      .tc-card-title {

        font-size:
          10px;

        margin-bottom:
          4px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      .tc-next-time,
      #${ROOT_ID}.browser-firefox.layout-landscape
      .tc-next-task {

        font-size:
          15px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-next-list {

        gap:
          3px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-prev-card {

        padding:
          7px
          17px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-prev-card
      .tc-card-title {

        font-size:
          9px;

        margin-bottom:
          2px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      #tc-prev-task {

        font-size:
          15px;

        margin-bottom:
          2px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      .tc-prev-metric {

        grid-template-columns:
          62px
          1fr;

        column-gap:
          7px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      .tc-prev-label {

        font-size:
          8px;
      }


      #${ROOT_ID}.browser-firefox.layout-landscape
      .tc-prev-value {

        font-size:
          13px;
      }
    }


    /* =====================================================
       VERY NARROW ANDROID PORTRAIT
    ===================================================== */

    @media
      (max-width:520px) {

      #${ROOT_ID}.platform-android.layout-portrait {

        padding:
          7px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-layout {

        gap:
          6px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-brand {

        font-size:
          14px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-clock {

        font-size:
          38px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-leave {

        gap:
          16px;

        font-size:
          13px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-main {

        grid-template-rows:
          minmax(
            0,
            1.1fr
          )
          minmax(
            0,
            1.4fr
          );

        gap:
          6px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-side {

        gap:
          5px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-now {

        padding:
          10px
          14px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-now-badge {

        font-size:
          10px;

        margin-bottom:
          5px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-now-metric {

        grid-template-columns:
          106px
          minmax(
            0,
            1fr
          );

        column-gap:
          7px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-now-label {

        font-size:
          9px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-now-value {

        font-size:
          18px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-task {

        font-size:
          clamp(
            25px,
            7.4vw,
            35px
          );

        margin:
          4px
          0
          5px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-card {

        padding:
          7px
          11px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-card-title {

        font-size:
          9px;

        margin-bottom:
          3px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-next-row {

        grid-template-columns:
          54px
          minmax(
            0,
            1fr
          );

        column-gap:
          7px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-next-time,
      #${ROOT_ID}.platform-android.layout-portrait
      .tc-next-task {

        font-size:
          14px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      #tc-prev-task {

        font-size:
          15px;

        margin-bottom:
          3px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-prev-metric {

        grid-template-columns:
          65px
          minmax(
            0,
            1fr
          );

        column-gap:
          7px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-prev-label {

        font-size:
          8px;
      }


      #${ROOT_ID}.platform-android.layout-portrait
      .tc-prev-value {

        font-size:
          14px;
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


  if (
    IS_IOS
  ) {

    root.classList.add(
      'platform-ios'
    );
  }


  if (
    IS_ANDROID
  ) {

    root.classList.add(
      'platform-android'
    );
  }


  if (
    IS_FIREFOX
  ) {

    root.classList.add(
      'browser-firefox'
    );
  }


  root.innerHTML = `

    <div id="tc-layout">

      <header id="tc-header">

        <div id="tc-brand">
          NOW
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
            CURRENT TASK
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
                PLANNED
              </span>

              <span
                id="tc-planned"
                class="tc-now-value">
                --:--
              </span>

            </div>


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

          <section
            id="tc-prev-card"
            class="tc-card">

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


          <section
            id="tc-next-card"
            class="tc-card">

            <div class="tc-card-title">
              NEXT
            </div>


            <div id="tc-next-list">

              <div class="tc-next-row">
                <span
                  id="tc-next-time-0"
                  class="tc-next-time">—</span>
                <span
                  id="tc-next-task-0"
                  class="tc-next-task">—</span>
              </div>

              <div class="tc-next-row">
                <span
                  id="tc-next-time-1"
                  class="tc-next-time">—</span>
                <span
                  id="tc-next-task-1"
                  class="tc-next-task">—</span>
              </div>

              <div class="tc-next-row">
                <span
                  id="tc-next-time-2"
                  class="tc-next-time">—</span>
                <span
                  id="tc-next-task-2"
                  class="tc-next-task">—</span>
              </div>

              <div class="tc-next-row">
                <span
                  id="tc-next-time-3"
                  class="tc-next-time">—</span>
                <span
                  id="tc-next-task-3"
                  class="tc-next-task">—</span>
              </div>

              <div class="tc-next-row">
                <span
                  id="tc-next-time-4"
                  class="tc-next-time">—</span>
                <span
                  id="tc-next-task-4"
                  class="tc-next-task">—</span>
              </div>

            </div>

          </section>

        </aside>

      </main>

    </div>


    <button
      id="tc-task-toggle"
      type="button">
      TASK
    </button>


    <div id="tc-version">
      v${VERSION}
    </div>
  `;


  document.body
    .appendChild(
      root
    );


  /* =========================================================
     VIEWPORT / WINDOW RESIZE
  ========================================================= */

  function getCurrentViewportSize() {

    const vv =
      window.visualViewport;


    const width =
      Math.max(
        1,
        Math.round(
          vv?.width ||
          window.innerWidth ||
          document.documentElement.clientWidth ||
          1
        )
      );


    const height =
      Math.max(
        1,
        Math.round(
          vv?.height ||
          window.innerHeight ||
          document.documentElement.clientHeight ||
          1
        )
      );


    return {
      width,
      height
    };
  }


  function applyViewportLayout() {

    const size =
      getCurrentViewportSize();


    root.style.width =
      `${size.width}px`;


    root.style.height =
      `${size.height}px`;


    root.classList.toggle(
      'layout-portrait',
      size.height > size.width
    );


    root.classList.toggle(
      'layout-landscape',
      size.width >= size.height
    );
  }


  let viewportRAF =
    null;


  function scheduleViewportUpdate() {

    if (
      viewportRAF !== null
    ) {

      cancelAnimationFrame(
        viewportRAF
      );
    }


    viewportRAF =
      requestAnimationFrame(
        () => {

          viewportRAF =
            null;


          applyViewportLayout();


          render();
        }
      );
  }


  applyViewportLayout();


  window.addEventListener(
    'resize',
    scheduleViewportUpdate,
    {
      passive:
        true
    }
  );


  window.addEventListener(
    'orientationchange',
    scheduleViewportUpdate,
    {
      passive:
        true
    }
  );


  if (
    window.visualViewport
  ) {

    window.visualViewport
      .addEventListener(
        'resize',
        scheduleViewportUpdate,
        {
          passive:
            true
        }
      );


    window.visualViewport
      .addEventListener(
        'scroll',
        scheduleViewportUpdate,
        {
          passive:
            true
        }
      );
  }


  window.tcNowViewportCleanup =
    () => {

      window.removeEventListener(
        'resize',
        scheduleViewportUpdate
      );


      window.removeEventListener(
        'orientationchange',
        scheduleViewportUpdate
      );


      if (
        window.visualViewport
      ) {

        window.visualViewport
          .removeEventListener(
            'resize',
            scheduleViewportUpdate
          );


        window.visualViewport
          .removeEventListener(
            'scroll',
            scheduleViewportUpdate
          );
      }


      if (
        viewportRAF !== null
      ) {

        cancelAnimationFrame(
          viewportRAF
        );


        viewportRAF =
          null;
      }
    };


  /* =========================================================
     ANDROID TASK / NOW SWITCH
  ========================================================= */

  if (
    IS_ANDROID
  ) {

    const taskToggle =
      document.getElementById(
        'tc-task-toggle'
      );


    const returnButton =
      document.createElement(
        'button'
      );


    returnButton.id =
      'tc-now-return-button';


    returnButton.type =
      'button';


    returnButton.textContent =
      'NOW';


    document.body
      .appendChild(
        returnButton
      );


    taskToggle
      ?.addEventListener(
        'click',
        () => {

          root.style.display =
            'none';


          returnButton.style.display =
            'block';
        }
      );


    returnButton
      .addEventListener(
        'click',
        () => {

          applyViewportLayout();


          sync();

          render();


          root.style.display =
            'block';


          returnButton.style.display =
            'none';


          requestAnimationFrame(
            () => {

              applyViewportLayout();

              sync();

              render();
            }
          );
        }
      );
  }


  /* =========================================================
     RENDER
  ========================================================= */

  const $ =
    id =>
      document
        .getElementById(
          id
        );


  function render() {

    const now =
      new Date();


    $('tc-clock')
      .textContent =
        pad(
          now.getHours()
        ) +
        ':' +
        pad(
          now.getMinutes()
        );


    $('tc-task')
      .textContent =
        state.currentTask ||
        'タスクを取得できません';


    $('tc-start')
      .textContent =
        state.currentStart ||
        '--:--';


    $('tc-planned')
      .textContent =
        secondsToHM(
          state.plannedSeconds
        );


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
              Math.abs(
                diff
              )
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


    if (
      prevFinish ===
      '--:--:--'
    ) {

      prevFinish =
        '—';
    }


    $('tc-prev-finish')
      .textContent =
        prevFinish;


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
      i < 5;
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
        ) /
        1000
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
              (
                diff % 3600
              ) /
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
