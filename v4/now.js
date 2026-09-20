(() => {
  'use strict';

  /* =========================================================
     NOW
     Unified Mobile Edition
     v4.5.6

     iOS Safari
     Android Firefox / Violentmonkey
  ========================================================= */

  const VERSION = '4.5.6';

  const ROOT_ID = 'tc-now-root';
  const STYLE_ID = 'tc-now-style';

  const SYNC_INTERVAL = 5000;
  const RENDER_INTERVAL = 1000;

  const WORK_START = '08:30';
  const REGULAR_END = '17:25';

  /* =========================================================
     ENVIRONMENT
  ========================================================= */

  const UA = navigator.userAgent || '';

  const IS_IOS =
    /iPhone|iPad|iPod/i.test(UA);

  const IS_FIREFOX =
    /Firefox|FxiOS/i.test(UA);

  const IS_ANDROID =
    /Android/i.test(UA) ||
    (
      IS_FIREFOX &&
      !IS_IOS &&
      navigator.maxTouchPoints > 0 &&
      /Linux/i.test(
        navigator.platform || UA
      )
    );

  /* =========================================================
     UTIL
  ========================================================= */

  const clean = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  const pad = n =>
    String(n).padStart(2, '0');

  const text = el =>
    clean(el?.textContent);

  const isInsideNow = el =>
    !!el?.closest?.('#' + ROOT_ID);

  const isHM = value =>
    /^\d{1,2}:\d{2}$/.test(clean(value));

  const isHMS = value =>
    /^\d{1,2}:\d{2}:\d{2}$/.test(clean(value));

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

  function hmsToSeconds(value) {
    const m =
      clean(value).match(
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

  function durationToSeconds(value) {
    const m =
      clean(value).match(
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

  function secondsToHM(seconds) {
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
      Math.floor(seconds / 3600);

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

  function hmToMinutes(value) {
    const m =
      clean(value).match(
        /^(\d{1,2}):(\d{2})$/
      );

    if (!m) {
      return null;
    }

    const h =
      Number(m[1]);

    const min =
      Number(m[2]);

    if (
      h < 0 ||
      h > 23 ||
      min < 0 ||
      min > 59
    ) {
      return null;
    }

    return h * 60 + min;
  }

  function clockToSecondsOfDay(value) {
    const m =
      clean(value).match(
        /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
      );

    if (!m) {
      return null;
    }

    const h = Number(m[1]);
    const min = Number(m[2]);
    const sec = Number(m[3] || 0);

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
      clockToSecondsOfDay(value);

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

    const d = new Date();

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
    const t = clean(value);

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
      /^[-\d\s:./]+$/.test(t)
    ) {
      return false;
    }

    return true;
  }

  function isSectionName(value) {
    return (
      /^\d{1,2}:\d{2}\s*[-–—−ー~〜～－]\s*\d{1,2}:\d{2}/
        .test(clean(value))
    );
  }

  function parseSectionRange(value) {
    const v = clean(value);

    const m =
      v.match(
        /^(\d{1,2}:\d{2})\s*[-–—−ー~〜～－]\s*(\d{1,2}:\d{2})/
      );

    if (!m) {
      return null;
    }

    return (
      m[1] +
      '-' +
      m[2]
    );
  }


function parseSectionName(value) {

  const v =
    clean(value);


  if (
    !isSectionName(v)
  ) {

    return null;
  }


  /*
    先頭の時間帯を削除
    例:
    18:00-23:30 夜 5 / 18 4h -3h53m12s
    ↓
    夜 5 / 18 4h -3h53m12s
  */
  let stripped =
    v.replace(
      /^\d{1,2}:\d{2}\s*[-–—−ー~〜～－]\s*\d{1,2}:\d{2}\s*/,
      ''
    );


  /*
    件数表示が始まったところから後ろを全部削除。

    5 / 18
    5/
    5 ／ 18

    のようにDOM側で途中分割されても対応する。
  */
  stripped =
    stripped.replace(
      /\s+\d{1,3}\s*[\/／].*$/,
      ''
    );


  /*
    件数が取れないDOM構造だった場合の保険。
    時間・差分が直接続いていたらそこから削除。
  */
  stripped =
    stripped.replace(
      /\s+[+\-−]?\d+\s*h.*$/,
      ''
    );


  return (
    clean(stripped) ||
    null
  );
}

  function normalizeOptionalAttribute(
    value,
    placeholder
  ) {
    const v = clean(value);

    if (
      !v ||
      v === placeholder ||
      v === '未設定' ||
      v === '-'
    ) {
      return null;
    }

    return v;
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

    currentProject: null,
    currentMode: null,
    currentSection: null,
    currentSectionRange: null,
    currentSectionCount: null,
    currentSectionDuration: null,
    currentSectionBalance: null,

    previous: null,
    next: [],
    leaveTime: null
  };

  /* =========================================================
     TASK ROWS
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

        return (
          r.left >= -20 &&
          r.left <= 150 &&
          r.width >= 250 &&
          r.width <= 1800 &&
          r.height >= 22 &&
          r.height <= 52
        );
      });
  }

  function getRowLeafValues(row) {
    if (!row) {
      return [];
    }

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

  function getProjectModeFromLeaves(
    leaves
  ) {
    /*
      Current TaskChute row structure:
      0 task
      1 start
      2 finish
      3 project
      4 mode
      5 elapsed
      6 planned

      When the DOM differs, placeholders are rejected
      rather than showing incorrect data.
    */

    const project =
      normalizeOptionalAttribute(
        leaves?.[3]?.value,
        'プロジェクト'
      );

    const mode =
      normalizeOptionalAttribute(
        leaves?.[4]?.value,
        'モード'
      );

    return {
      project,
      mode
    };
  }

  /* =========================================================
     SECTION
  ========================================================= */

  function getSectionAncestorLeaves(
    sectionEl
  ) {
    if (!sectionEl) {
      return [];
    }

    let node =
      sectionEl;

    for (
      let depth = 0;
      depth < 7 && node;
      depth++
    ) {
      const leaves =
        [
          ...node.querySelectorAll('*')
        ]
          .filter(el =>
            el.children.length === 0
          )
          .map(el =>
            clean(el.textContent)
          )
          .filter(Boolean);

      const hasCount =
        leaves.some(value =>
          /^\d{1,3}\s*\/\s*\d{1,3}$/
            .test(value)
        );

      const hasDuration =
        leaves.some(value =>
          /^(?:\d+\s*h(?:\s*\d+\s*m)?(?:\s*\d+\s*s)?|\d+\s*m(?:\s*\d+\s*s)?|\d+\s*s)$/
            .test(value)
        );

      const hasBalance =
        leaves.some(value =>
          /^[+\-−]\s*(?:\d+\s*h)?(?:\s*\d+\s*m)?(?:\s*\d+\s*s)?$/
            .test(value)
        );

      if (
        hasCount ||
        hasDuration ||
        hasBalance
      ) {
        return leaves;
      }

      node =
        node.parentElement;
    }

    return [];
  }


  function normalizeCompactDuration(
    value
  ) {
    if (!value) {
      return null;
    }

    return clean(value)
      .replace(/\s+/g, '')
      .replace(/−/g, '-');
  }


  function getSectionStats(
    sectionEl
  ) {
    const leaves =
      getSectionAncestorLeaves(
        sectionEl
      );

    let count = null;
    let duration = null;
    let balance = null;

    for (
      const value
      of leaves
    ) {
      if (
        !count &&
        /^\d{1,3}\s*\/\s*\d{1,3}$/
          .test(value)
      ) {
        const m =
          value.match(
            /^(\d{1,3})\s*\/\s*(\d{1,3})$/
          );

        if (m) {
          count =
            m[1] +
            ' / ' +
            m[2];
        }

        continue;
      }

      if (
        !balance &&
        /^[+\-−]\s*(?:\d+\s*h)?(?:\s*\d+\s*m)?(?:\s*\d+\s*s)?$/
          .test(value)
      ) {
        balance =
          normalizeCompactDuration(
            value
          );

        continue;
      }

      if (
        !duration &&
        /^(?:\d+\s*h(?:\s*\d+\s*m)?(?:\s*\d+\s*s)?|\d+\s*m(?:\s*\d+\s*s)?|\d+\s*s)$/
          .test(value)
      ) {
        duration =
          normalizeCompactDuration(
            value
          );
      }
    }

    return {
      count,
      duration,
      balance
    };
  }


  function getSectionMarkers() {
    const markers = [];

    for (
      const el
      of getTaskRowElements()
    ) {
      const raw =
        clean(el.textContent);

      if (
        !isSectionName(raw)
      ) {
        continue;
      }

      const rect =
        el.getBoundingClientRect();

      const stats =
        getSectionStats(
          el
        );

      markers.push({
        top:
          rect.top,

        range:
          parseSectionRange(
            raw
          ),

        name:
          parseSectionName(
            raw
          ),

        count:
          stats.count,

        duration:
          stats.duration,

        balance:
          stats.balance
      });
    }

    markers.sort(
      (a, b) =>
        a.top - b.top
    );

    return markers;
  }


  /* =========================================================
     SCHEDULE LIST
  ========================================================= */

  function getScheduleRows() {
    const rows = [];

    const sectionMarkers =
      getSectionMarkers();

    for (
      const taskEl
      of getTaskRowElements()
    ) {
      const task =
        clean(taskEl.textContent);

      if (
        !validTaskName(task) ||
        isSectionName(task)
      ) {
        continue;
      }

      const row =
        taskEl.parentElement;

      if (!row) {
        continue;
      }

      const rowText =
        clean(row.textContent);

      if (
        rowText === task ||
        rowText.length <
          task.length + 3
      ) {
        continue;
      }

      const rect =
        taskEl.getBoundingClientRect();

      const leaves =
        getRowLeafValues(row);

      const attributes =
        getProjectModeFromLeaves(
          leaves
        );

      let start = null;
      let finish = null;
      let actualDuration = null;
      let planned = null;
      let scheduleTime = null;

      if (
        leaves[1] &&
        isHM(leaves[1].value)
      ) {
        start =
          leaves[1].value;
      }

      if (
        leaves[2] &&
        (
          isHM(leaves[2].value) ||
          isHMS(leaves[2].value)
        )
      ) {
        finish =
          leaves[2].value;
      }

      if (
        leaves[5] &&
        isHM(leaves[5].value)
      ) {
        actualDuration =
          leaves[5].value;
      }

      if (
        leaves[6] &&
        isHM(leaves[6].value)
      ) {
        planned =
          leaves[6].value;
      }

      const HMvalues =
        leaves
          .map(x => x.value)
          .filter(isHM);

      if (!start) {
        const last =
          HMvalues[
            HMvalues.length - 1
          ];

        if (last) {
          scheduleTime = last;
        }
      } else {
        scheduleTime = start;
      }

      rows.push({
        task,
        start,
        finish,
        actualDuration,
        planned,
        scheduleTime,

        project:
          attributes.project,

        mode:
          attributes.mode,

        section: null,
        sectionRange: null,
        sectionCount: null,
        sectionDuration: null,
        sectionBalance: null,

        top: rect.top,
        taskEl,
        rowEl: row
      });
    }

    rows.sort(
      (a, b) =>
        a.top - b.top
    );

    /*
      Map each task to the nearest section header above it.
    */
    let sectionIndex = -1;

    for (
      const row
      of rows
    ) {
      while (
        sectionIndex + 1 <
          sectionMarkers.length &&
        sectionMarkers[
          sectionIndex + 1
        ].top < row.top
      ) {
        sectionIndex++;
      }

      if (
        sectionIndex >= 0
      ) {
        row.section =
          sectionMarkers[
            sectionIndex
          ].name;

        row.sectionRange =
          sectionMarkers[
            sectionIndex
          ].range;

        row.sectionCount =
          sectionMarkers[
            sectionIndex
          ].count;

        row.sectionDuration =
          sectionMarkers[
            sectionIndex
          ].duration;

        row.sectionBalance =
          sectionMarkers[
            sectionIndex
          ].balance;
      }
    }

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
        unique.push(row);
      }
    }

    return unique;
  }

  /* =========================================================
     CURRENT
  ========================================================= */

  function getCurrentScheduleInfo(
    currentTask,
    currentRow
  ) {
    const row =
      currentRow?.rowEl;

    if (!row) {
      return null;
    }

    const leaves =
      getRowLeafValues(row);

    let start = null;
    let finish = null;
    let planned = null;

    if (
      leaves[1] &&
      isHM(leaves[1].value)
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

    if (
      leaves[6] &&
      isHM(leaves[6].value)
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
              isHM(x.value)
          )
          .map(x => x.value);

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

  function findCurrentPlayer(rows) {
    const now = new Date();

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
      const taskEl =
        elapsedEl
          ?.parentElement
          ?.parentElement
          ?.previousElementSibling;

      if (!taskEl) {
        continue;
      }

      const taskName =
        clean(taskEl.textContent);

      if (
        taskName !==
        currentRow.task
      ) {
        continue;
      }

      const rect =
        elapsedEl.getBoundingClientRect();

      candidates.push({
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

    candidates.sort(
      (a, b) => {
        if (
          a.visible !==
          b.visible
        ) {
          return a.visible
            ? -1
            : 1;
        }

        return b.top - a.top;
      }
    );

    let elapsedSeconds = null;

    if (
      candidates.length
    ) {
      elapsedSeconds =
        hmsToSeconds(
          candidates[0].elapsed
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
     PREVIOUS / NEXT / LEAVE
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

  function getNextTasks(
    rows,
    currentRow
  ) {
    if (!currentRow) {
      return [];
    }

    const index =
      rows.indexOf(currentRow);

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

  function getLeaveTime(rows) {
    const leave =
      rows.find(
        x =>
          x.task === '退勤'
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

  function clearCurrentState() {
    state.currentTask = null;
    state.currentStart = null;
    state.plannedSeconds = null;
    state.elapsedBase = null;
    state.elapsedCapturedAt = null;

    state.currentProject = null;
    state.currentMode = null;
    state.currentSection = null;
    state.currentSectionRange = null;
    state.currentSectionCount = null;
    state.currentSectionDuration = null;
    state.currentSectionBalance = null;
  }

  /* =========================================================
     SYNC
  ========================================================= */

  function sync() {
    const rows =
      getScheduleRows();

    const player =
      findCurrentPlayer(rows);

    if (player) {
      const taskChanged =
        state.currentTask !==
        player.task;

      if (taskChanged) {
        state.currentStart = null;
        state.plannedSeconds = null;
        state.elapsedBase = null;
        state.elapsedCapturedAt = null;
      }

      state.currentTask =
        player.task;

      state.currentProject =
        player.row?.project ||
        null;

      state.currentMode =
        player.row?.mode ||
        null;

      state.currentSection =
        player.row?.section ||
        null;

      state.currentSectionRange =
        player.row?.sectionRange ||
        null;

      state.currentSectionCount =
        player.row?.sectionCount ||
        null;

      state.currentSectionDuration =
        player.row?.sectionDuration ||
        null;

      state.currentSectionBalance =
        player.row?.sectionBalance ||
        null;

      state.currentStart = null;
      state.plannedSeconds = null;

      const info =
        getCurrentScheduleInfo(
          player.task,
          player.row
        );

      if (info) {
        if (info.start) {
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
      /*
        CURRENT clears when no task is running.
        NEXT intentionally keeps the last 5 entries.
      */
      clearCurrentState();

      state.previous =
        getPreviousTask(
          rows,
          new Date()
        );
    }

    state.leaveTime =
      getLeaveTime(rows) ||
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
    .getElementById(ROOT_ID)
    ?.remove();

  document
    .getElementById(STYLE_ID)
    ?.remove();

  document
    .getElementById(
      'tc-now-return-button'
    )
    ?.remove();

  /* =========================================================
     iOS VIEWPORT
  ========================================================= */

  if (IS_IOS) {
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
      box-sizing:border-box;
    }

    #${ROOT_ID} {
      --bg:#07090d;
      --panel:#1a2029;
      --panel2:#0d1016;
      --text:#f5f5f7;
      --muted:#8a8f9b;
      --dim:#666b76;
      --over:#ff6363;

      --timeline:#65aef2;
      --timeline-track:#262d36;
      --timeline-overtime:#d99a3e;

      --card-radius:10px;

      position:fixed;
      top:0;
      left:0;
      z-index:2147483647;

      width:100%;
      height:100%;

      overflow:hidden;

      background:var(--bg);
      color:var(--text);

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        "Helvetica Neue",
        "Hiragino Sans",
        "Yu Gothic",
        sans-serif;

      padding:
        max(5px,env(safe-area-inset-top))
        max(8px,env(safe-area-inset-right))
        max(5px,env(safe-area-inset-bottom))
        max(8px,env(safe-area-inset-left));
    }

    #tc-layout {
      width:100%;
      height:100%;

      display:grid;

      grid-template-rows:
        auto
        auto
        minmax(0,1fr);

      gap:
        clamp(
          4px,
          1vh,
          9px
        );
    }

    /* =====================================================
       HEADER
    ===================================================== */

    #tc-header {
      display:grid;

      grid-template-columns:
        minmax(88px,.45fr)
        minmax(300px,1.15fr)
        minmax(335px,1.1fr);

      align-items:center;

      gap:
        clamp(
          8px,
          1.4vw,
          20px
        );
    }

    #tc-brand {
      color:var(--muted);

      font-size:
        clamp(
          12px,
          1.8vw,
          21px
        );

      font-weight:800;
      letter-spacing:.14em;

      white-space:nowrap;

      position:relative;
      padding-right:
        clamp(
          12px,
          1.5vw,
          22px
        );

      border-right:
        1px solid
        rgba(255,255,255,.22);
    }

    #tc-leave {
      display:flex;

      align-items:center;

      gap:
        clamp(
          14px,
          2vw,
          28px
        );

      font-size:
        clamp(
          17px,
          2.25vw,
          28px
        );

      font-weight:800;
      line-height:1;

      font-variant-numeric:
        tabular-nums;

      white-space:nowrap;
    }

    .tc-leave-row {
      display:grid;

      grid-template-columns:
        3.1em
        max-content;

      column-gap:.45em;
    }

    .tc-leave-row:first-child {
      padding-right:
        clamp(
          14px,
          2vw,
          28px
        );

      border-right:
        1px solid
        rgba(255,255,255,.22);
    }

    #tc-clock {
      justify-self:end;

      display:flex;

      align-items:baseline;

      justify-content:flex-end;

      gap:
        clamp(
          10px,
          1.2vw,
          18px
        );

      white-space:nowrap;
    }

    #tc-date {
      color:#b4b8c1;

      font-size:
        clamp(
          15px,
          2vw,
          24px
        );

      font-weight:700;

      font-variant-numeric:
        tabular-nums;
    }

    #tc-clock-time {
      font-size:
        clamp(
          36px,
          5.5vw,
          66px
        );

      font-weight:800;
      line-height:.95;

      letter-spacing:-.04em;

      font-variant-numeric:
        tabular-nums;
    }

    /* =====================================================
       TIMELINE
    ===================================================== */

    #tc-work-timeline {
      position:relative;

      min-height:
        clamp(
          39px,
          7vh,
          58px
        );

      margin:
        0
        clamp(
          7px,
          1.2vw,
          16px
        );
    }

    #tc-timeline-track {
      position:absolute;

      left:0;
      right:0;

      top:
        clamp(
          15px,
          2.8vh,
          22px
        );

      height:
        clamp(
          4px,
          .7vh,
          6px
        );

      border-radius:999px;

      background:
        var(--timeline-track);
    }

    #tc-timeline-normal {
      position:absolute;

      left:0;
      top:0;
      bottom:0;

      background:
        var(--timeline);

      border-radius:
        999px 0 0 999px;
    }

    #tc-timeline-overtime {
      position:absolute;

      top:0;
      bottom:0;

      background:
        var(--timeline-overtime);

      border-radius:
        0 999px 999px 0;
    }

    .tc-timeline-label {
      position:absolute;

      top:0;

      color:#d5d7dc;

      font-size:
        clamp(
          9px,
          1.2vw,
          14px
        );

      line-height:1;

      font-variant-numeric:
        tabular-nums;

      white-space:nowrap;
    }

    #tc-timeline-start-label {
      left:0;
    }

    #tc-timeline-regular-label {
      transform:
        translateX(-50%);
    }

    #tc-timeline-end-label {
      right:0;
    }

    #tc-timeline-regular-marker {
      position:absolute;

      top:-6px;

      width:1px;
      height:18px;

      background:#fff;

      transform:
        translateX(-50%);
    }

    #tc-timeline-current {
      position:absolute;

      top:
        calc(
          clamp(
            15px,
            2.8vh,
            22px
          ) +
          clamp(
            4px,
            .7vh,
            6px
          ) +
          5px
        );

      transform:
        translateX(-50%);

      z-index:3;

      line-height:1;
    }

    #tc-timeline-current::before {
      content:"▲";

      display:block;

      color:#fff;

      font-size:
        clamp(
          9px,
          1.1vw,
          13px
        );

      line-height:1;
    }

    #tc-timeline-current-text {
      display:none;
    }

    #tc-work-timeline::before,
    #tc-work-timeline::after {
      content:"";

      position:absolute;

      top:
        calc(
          clamp(
            15px,
            2.8vh,
            22px
          ) - 5px
        );

      width:1px;

      height:
        calc(
          clamp(
            4px,
            .7vh,
            6px
          ) + 16px
        );

      background:#fff;

      z-index:4;
    }

    #tc-work-timeline::before {
      left:0;
    }

    #tc-work-timeline::after {
      right:0;
    }

    #tc-timeline-caption-start,
    #tc-timeline-caption-end {
      position:absolute;

      top:
        calc(
          clamp(
            15px,
            2.8vh,
            22px
          ) +
          clamp(
            4px,
            .7vh,
            6px
          ) +
          8px
        );

      color:#fff;

      font-size:
        clamp(
          7px,
          .9vw,
          10px
        );

      font-weight:800;

      letter-spacing:.18em;

      white-space:nowrap;
    }

    #tc-timeline-caption-start {
      left:11px;
    }

    #tc-timeline-caption-end {
      right:11px;
    }

    /* =====================================================
       MAIN
    ===================================================== */

    #tc-main {
      min-width:0;
      min-height:0;

      display:grid;

      grid-template-columns:
        minmax(0,1.32fr)
        minmax(310px,1fr);

      gap:
        clamp(
          7px,
          1vw,
          12px
        );
    }

    /* =====================================================
       CURRENT
    ===================================================== */

    #tc-now {
      position:relative;

      min-width:0;
      min-height:0;

      overflow:hidden;

      background:var(--panel);

      border:
        1px solid
        rgba(255,255,255,.12);

      border-radius:
        var(--card-radius);

      padding:
        clamp(
          8px,
          1.8vh,
          18px
        )
        clamp(
          18px,
          2.4vw,
          32px
        )
        clamp(
          7px,
          1.5vh,
          15px
        )
        clamp(
          22px,
          2.8vw,
          38px
        );

      display:flex;

      flex-direction:column;

      justify-content:flex-start;

      box-shadow:none;
    }

    #tc-now::before {
      content:"";

      position:absolute;

      top:0;
      bottom:0;
      left:0;

      width:
        clamp(
          4px,
          .45vw,
          6px
        );

      background:#fff;
    }

    #tc-current-topline {
      display:flex;

      align-items:center;

      gap:
        clamp(
          10px,
          1.25vw,
          18px
        );

      min-width:0;

      flex:0 0 auto;

      margin-bottom:
        clamp(
          3px,
          .65vh,
          7px
        );
    }

    #tc-now-badge {
      flex:0 0 auto;

      background:#fff;

      color:#101218;

      font-size:
        clamp(
          9px,
          1.2vw,
          14px
        );

      font-weight:900;

      letter-spacing:.14em;

      border-radius:
        var(--card-radius);

      padding:
        clamp(
          5px,
          .9vh,
          8px
        )
        clamp(
          10px,
          1.3vw,
          16px
        );

      white-space:nowrap;
    }

    #tc-current-attributes {
      display:flex;

      align-items:center;

      gap:
        clamp(
          10px,
          1.25vw,
          18px
        );

      min-width:0;

      flex:1 1 auto;

      color:#dce0e7;

      font-size:
        clamp(
          9px,
          1.15vw,
          14px
        );

      font-weight:650;

      line-height:1;
    }

    .tc-current-attr {
      display:none;

      align-items:center;

      gap:
        clamp(
          4px,
          .45vw,
          7px
        );

      min-width:0;

      max-width:
        min(
          190px,
          18vw
        );

      white-space:nowrap;
    }

    .tc-current-attr.is-visible {
      display:flex;
    }

    .tc-current-attr-icon {
      width:
        clamp(
          12px,
          1.2vw,
          16px
        );

      height:
        clamp(
          12px,
          1.2vw,
          16px
        );

      flex:0 0 auto;

      opacity:.95;
    }

    .tc-current-attr-icon svg {
      width:100%;
      height:100%;

      display:block;
    }

    .tc-current-attr-text {
      min-width:0;

      overflow:hidden;

      text-overflow:ellipsis;
    }

    #tc-task {
      flex:0 0 auto;

      margin:
        clamp(
          7px,
          1.35vh,
          14px
        )
        0
        clamp(
          7px,
          1.35vh,
          14px
        );

      font-size:
        clamp(
          27px,
          4.35vw,
          50px
        );

      font-weight:900;

      line-height:1.03;

      white-space:nowrap;

      overflow:hidden;

      text-overflow:ellipsis;
    }

    #tc-current-section-panel {
      display:none;

      min-width:0;

      flex:0 0 auto;

      margin-bottom:
        clamp(
          4px,
          .75vh,
          8px
        );

      color:#cbd0d8;
    }

    #tc-current-section-panel.is-visible {
      display:grid;

      gap:
        clamp(
          2px,
          .35vh,
          4px
        );
    }

    .tc-section-line {
      display:none;

      align-items:center;

      min-width:0;
    }

    .tc-section-line.is-visible {
      display:flex;
    }

    #tc-section-primary {
      gap:
        clamp(
          5px,
          .55vw,
          8px
        );

      font-size:
        clamp(
          10px,
          1.25vw,
          15px
        );

      font-weight:700;

      line-height:1.15;
    }

    #tc-current-section {
      min-width:0;

      white-space:nowrap;

      overflow:hidden;

      text-overflow:ellipsis;
    }

    #tc-section-stats {
      gap:
        clamp(
          11px,
          1.25vw,
          18px
        );
    }

    .tc-section-stat {
      display:none;

      align-items:center;

      gap:
        clamp(
          4px,
          .45vw,
          6px
        );

      color:#9fa5b0;

      font-size:
        clamp(
          9px,
          1.05vw,
          13px
        );

      font-weight:700;

      line-height:1;

      white-space:nowrap;

      font-variant-numeric:
        tabular-nums;
    }

    .tc-section-stat.is-visible {
      display:flex;
    }

    .tc-section-icon {
      width:
        clamp(
          12px,
          1.15vw,
          15px
        );

      height:
        clamp(
          12px,
          1.15vw,
          15px
        );

      flex:0 0 auto;

      color:#cbd0d8;
    }

    .tc-section-icon svg {
      display:block;

      width:100%;
      height:100%;
    }

    #tc-progress {
      display:grid;

      grid-template-rows:
        repeat(
          5,
          minmax(0,1fr)
        );

      gap:0;

      min-height:0;

      flex:1 1 auto;
    }

    .tc-now-metric {
      display:grid;

      grid-template-columns:
        clamp(
          20px,
          2vw,
          28px
        )
        clamp(
          110px,
          11vw,
          160px
        )
        minmax(0,1fr);

      align-items:center;

      column-gap:
        clamp(
          7px,
          .85vw,
          11px
        );

      min-width:0;
      min-height:0;

      padding:
        clamp(
          2px,
          .35vh,
          4px
        )
        0;

      border-top:
        1px solid
        rgba(255,255,255,.09);
    }

    .tc-metric-icon {
      width:
        clamp(
          17px,
          1.75vw,
          23px
        );

      height:
        clamp(
          17px,
          1.75vw,
          23px
        );

      color:#e4e7ec;

      opacity:.92;
    }

    .tc-metric-icon svg {
      width:100%;
      height:100%;

      display:block;
    }

    .tc-now-label {
      color:var(--muted);

      font-size:
        clamp(
          11px,
          1.45vw,
          17px
        );

      font-weight:900;

      letter-spacing:.17em;

      white-space:nowrap;
    }

    .tc-now-value {
      color:#c7cad2;

      font-size:
        clamp(
          20px,
          2.8vw,
          33px
        );

      font-weight:500;

      font-variant-numeric:
        tabular-nums;

      white-space:nowrap;
    }

    #tc-status-label.tc-over,
    #tc-status-value.tc-over {
      color:var(--over);
    }

    #tc-status-value.tc-over {
      font-weight:700;
    }

    /* =====================================================
       SIDE
    ===================================================== */

    #tc-side {
      min-width:0;
      min-height:0;

      display:grid;

      grid-template-rows:
        minmax(0,1.42fr)
        minmax(92px,.72fr);

      gap:
        clamp(
          5px,
          .8vh,
          8px
        );
    }

    .tc-card {
      min-width:0;
      min-height:0;

      overflow:hidden;

      background:var(--panel2);

      border:
        1px solid
        rgba(255,255,255,.12);

      border-radius:
        var(--card-radius);

      box-shadow:none;
    }

    .tc-card-title {
      color:#fff;

      font-size:
        clamp(
          9px,
          1.25vw,
          14px
        );

      font-weight:900;

      letter-spacing:.18em;

      line-height:1;

      margin:0;

      flex:0 0 auto;
    }

    /* =====================================================
       NEXT
    ===================================================== */

    #tc-next-card {
      display:flex;

      flex-direction:column;

      padding:
        clamp(
          5px,
          .8vh,
          9px
        )
        clamp(
          9px,
          1vw,
          13px
        )
        clamp(
          5px,
          .8vh,
          9px
        );

      overflow:hidden;
    }

    #tc-next-card
    .tc-card-title {
      margin-bottom:
        clamp(
          3px,
          .45vh,
          5px
        );
    }

    #tc-next-list {
      display:grid;

      grid-template-rows:
        repeat(
          5,
          minmax(0,1fr)
        );

      gap:0;

      min-height:0;

      flex:1 1 auto;
    }

    .tc-next-row {
      position:relative;

      display:grid;

      grid-template-columns:
        clamp(
          58px,
          5.7vw,
          72px
        )
        minmax(0,1fr)
        clamp(
          10px,
          1vw,
          15px
        );

      column-gap:
        clamp(
          7px,
          .8vw,
          11px
        );

      align-items:center;

      min-height:0;

      padding:
        0
        clamp(
          3px,
          .45vw,
          6px
        );

      border-top:
        1px solid
        rgba(255,255,255,.10);

      overflow:hidden;
    }

    .tc-next-row:first-child {
      border-top:0;

      background:
        rgba(255,255,255,.055);

      border-radius:
        calc(
          var(--card-radius) - 2px
        );

      padding-left:
        clamp(
          8px,
          .85vw,
          11px
        );
    }

    .tc-next-row:first-child::before {
      content:"";

      position:absolute;

      left:0;

      top:0;
      bottom:0;

      width:3px;

      background:#fff;

      border-radius:
        calc(
          var(--card-radius) - 2px
        )
        0
        0
        calc(
          var(--card-radius) - 2px
        );
    }

    .tc-next-time,
    .tc-next-task {
      color:#fff;

      font-size:
        clamp(
          14px,
          1.9vw,
          23px
        );

      line-height:1;
    }

    .tc-next-time {
      font-variant-numeric:
        tabular-nums;

      white-space:nowrap;

      font-weight:450;
    }

    .tc-next-task {
      min-width:0;

      font-weight:700;

      white-space:nowrap;

      overflow:hidden;

      text-overflow:ellipsis;
    }

    .tc-next-arrow {
      color:#e3e6ec;

      font-size:
        clamp(
          14px,
          1.5vw,
          19px
        );

      line-height:1;

      text-align:right;
    }

    /* =====================================================
       PREVIOUS
    ===================================================== */

    #tc-prev-card {
      display:flex;

      flex-direction:column;

      padding:
        clamp(
          5px,
          .75vh,
          8px
        )
        clamp(
          9px,
          1vw,
          13px
        );
    }

    #tc-prev-card
    .tc-card-title {
      margin-bottom:
        clamp(
          3px,
          .4vh,
          5px
        );
    }

    #tc-prev-content {
      display:grid;

      grid-template-columns:
        minmax(0,1fr)
        clamp(
          26px,
          2.5vw,
          34px
        );

      align-items:center;

      gap:
        clamp(
          7px,
          .8vw,
          11px
        );

      min-height:0;

      flex:1 1 auto;
    }

    #tc-prev-data {
      min-width:0;
    }

    #tc-prev-task {
      color:#fff;

      font-size:
        clamp(
          12px,
          1.6vw,
          19px
        );

      font-weight:800;

      line-height:1;

      margin:
        0 0
        clamp(
          3px,
          .45vh,
          5px
        );

      white-space:nowrap;

      overflow:hidden;

      text-overflow:ellipsis;
    }

    .tc-prev-metric {
      display:grid;

      grid-template-columns:
        clamp(
          54px,
          5.2vw,
          72px
        )
        minmax(0,1fr);

      align-items:baseline;

      column-gap:
        clamp(
          5px,
          .6vw,
          8px
        );

      min-height:
        clamp(
          14px,
          2vh,
          18px
        );

      margin:0;
    }

    .tc-prev-label {
      color:#fff;

      font-size:
        clamp(
          7px,
          .9vw,
          10px
        );

      font-weight:900;

      letter-spacing:.15em;
    }

    .tc-prev-value {
      color:#fff;

      font-size:
        clamp(
          10px,
          1.35vw,
          15px
        );

      font-variant-numeric:
        tabular-nums;

      white-space:nowrap;
    }

    #tc-prev-check {
      display:flex;

      align-items:center;

      justify-content:center;

      width:
        clamp(
          25px,
          2.45vw,
          34px
        );

      height:
        clamp(
          25px,
          2.45vw,
          34px
        );

      border:
        1px solid
        rgba(255,255,255,.55);

      border-radius:50%;

      color:#fff;

      font-size:
        clamp(
          14px,
          1.45vw,
          19px
        );
    }

    /* =====================================================
       OVERTIME ACCENT
    ===================================================== */

    #${ROOT_ID}.is-overtime
    #tc-next-card,

    #${ROOT_ID}.is-overtime
    #tc-prev-card,

    #${ROOT_ID}.is-overtime
    #tc-now {
      border-color:
        rgba(
          217,
          154,
          62,
          .52
        );
    }

    #${ROOT_ID}.is-overtime
    .tc-next-row:first-child::before {
      background:
        var(--timeline-overtime);
    }

    /* =====================================================
       ANDROID TASK / NOW
    ===================================================== */

    #tc-task-toggle {
      display:none;

      position:absolute;

      left:
        max(
          10px,
          env(safe-area-inset-left)
        );

      bottom:
        max(
          7px,
          env(safe-area-inset-bottom)
        );

      z-index:5;

      appearance:none;

      border:
        1px solid #3b414d;

      border-radius:999px;

      background:#11151c;

      color:#9da3af;

      font:inherit;

      font-size:9px;
      font-weight:900;

      letter-spacing:.12em;

      line-height:1;

      padding:6px 9px;

      opacity:.88;
    }

    #${ROOT_ID}.platform-android
    #tc-task-toggle {
      display:block;
    }

    #tc-now-return-button {
      display:none;

      position:fixed;

      right:10px;
      bottom:10px;

      z-index:2147483647;

      appearance:none;

      border:
        1px solid #3b414d;

      border-radius:999px;

      background:#11151c;

      color:#f5f5f7;

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        "Helvetica Neue",
        "Hiragino Sans",
        "Yu Gothic",
        sans-serif;

      font-size:11px;
      font-weight:900;

      letter-spacing:.12em;

      line-height:1;

      padding:9px 12px;

      box-shadow:
        0 2px 10px
        rgba(0,0,0,.35);
    }

    #tc-version {
      position:absolute;

      right:
        max(
          9px,
          env(safe-area-inset-right)
        );

      bottom:
        max(
          2px,
          env(safe-area-inset-bottom)
        );

      color:#41454f;

      font-size:7px;

      font-weight:700;
    }

    /* =====================================================
       COMPACT LANDSCAPE
       iPhone 16e actual landscape height baseline
    ===================================================== */

    #${ROOT_ID}.layout-landscape
    #tc-layout {
      grid-template-rows:
        50px
        43px
        minmax(0,1fr);

      gap:3px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-header {
      grid-template-columns:
        minmax(70px,.38fr)
        minmax(250px,1.03fr)
        minmax(292px,1.08fr);

      gap:8px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-brand {
      font-size:12px;

      padding-right:13px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-leave {
      font-size:17px;

      gap:15px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-leave-row:first-child {
      padding-right:15px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-date {
      font-size:16px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-clock {
      gap:10px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-clock-time {
      font-size:38px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-work-timeline {
      height:43px;

      min-height:0;

      margin:
        0 10px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-timeline-track {
      top:15px;

      height:5px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-timeline-label {
      top:0;

      font-size:9px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-timeline-regular-marker {
      top:-5px;

      height:15px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-timeline-current {
      top:25px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-timeline-current::before {
      font-size:9px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-work-timeline::before,
    #${ROOT_ID}.layout-landscape
    #tc-work-timeline::after {
      top:10px;

      height:20px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-timeline-caption-start,
    #${ROOT_ID}.layout-landscape
    #tc-timeline-caption-end {
      top:27px;

      font-size:7px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-main {
      grid-template-columns:
        minmax(0,1.3fr)
        minmax(300px,1fr);

      gap:6px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-now {
      padding:
        6px
        14px
        5px
        18px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-now::before {
      width:5px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-current-topline {
      min-height:21px;

      gap:7px;

      margin-bottom:1px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-now-badge {
      font-size:8px;

      padding:
        4px
        9px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-current-attributes {
      gap:7px;

      font-size:8px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-current-attr {
      gap:3px;

      max-width:132px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-current-attr-icon {
      width:11px;
      height:11px;
    }

    /*
      Give the task name more vertical breathing room,
      while the metric rows below stay compact.
    */
    #${ROOT_ID}.layout-landscape
    #tc-task {
      margin:
        7px
        0
        6px;

      font-size:
        clamp(
          23px,
          4vw,
          31px
        );

      line-height:1;
    }

    #${ROOT_ID}.layout-landscape
    #tc-current-section-panel {
      margin-bottom:3px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-current-section-panel.is-visible {
      gap:1px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-section-primary {
      gap:4px;

      font-size:8.5px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-section-stats {
      gap:10px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-section-stat {
      gap:3px;

      font-size:7.5px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-section-icon {
      width:10px;
      height:10px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-now-metric {
      grid-template-columns:
        19px
        108px
        minmax(0,1fr);

      column-gap:6px;

      padding:
        1px
        0;
    }

    #${ROOT_ID}.layout-landscape
    .tc-metric-icon {
      width:15px;
      height:15px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-now-label {
      font-size:10px;

      letter-spacing:.15em;
    }

    #${ROOT_ID}.layout-landscape
    .tc-now-value {
      font-size:
        clamp(
          15px,
          2.35vw,
          19px
        );

      line-height:1;
    }

    #${ROOT_ID}.layout-landscape
    #tc-side {
      grid-template-rows:
        minmax(0,1.5fr)
        minmax(86px,.70fr);

      gap:5px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-next-card {
      padding:
        4px
        8px
        5px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-next-card
    .tc-card-title {
      font-size:9px;

      margin-bottom:2px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-next-row {
      grid-template-columns:
        56px
        minmax(0,1fr)
        10px;

      column-gap:6px;

      padding:
        0
        3px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-next-row:first-child {
      padding-left:7px;

      padding-right:3px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-next-time,
    #${ROOT_ID}.layout-landscape
    .tc-next-task {
      font-size:
        clamp(
          12px,
          1.95vw,
          15px
        );

      line-height:1;
    }

    #${ROOT_ID}.layout-landscape
    .tc-next-arrow {
      font-size:13px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-prev-card {
      padding:
        4px
        8px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-prev-card
    .tc-card-title {
      font-size:8px;

      margin-bottom:2px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-prev-content {
      grid-template-columns:
        minmax(0,1fr)
        24px;

      gap:6px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-prev-task {
      font-size:11px;

      margin-bottom:2px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-prev-metric {
      grid-template-columns:
        48px
        minmax(0,1fr);

      column-gap:5px;

      min-height:13px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-prev-label {
      font-size:6.5px;
    }

    #${ROOT_ID}.layout-landscape
    .tc-prev-value {
      font-size:9.5px;
    }

    #${ROOT_ID}.layout-landscape
    #tc-prev-check {
      width:22px;
      height:22px;

      font-size:12px;
    }

    /* =====================================================
       PORTRAIT
    ===================================================== */

    #${ROOT_ID}.layout-portrait
    #tc-layout {
      grid-template-rows:
        auto
        auto
        minmax(0,1fr);

      gap:6px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-header {
      grid-template-columns:
        minmax(0,1fr)
        auto;

      grid-template-areas:
        "brand clock"
        "leave leave";

      column-gap:8px;
      row-gap:3px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-brand {
      grid-area:brand;

      font-size:
        clamp(
          13px,
          4vw,
          18px
        );

      border-right:0;

      padding-right:0;
    }

    #${ROOT_ID}.layout-portrait
    #tc-clock {
      grid-area:clock;

      gap:6px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-date {
      font-size:
        clamp(
          10px,
          3vw,
          13px
        );
    }

    #${ROOT_ID}.layout-portrait
    #tc-clock-time {
      font-size:
        clamp(
          29px,
          8.7vw,
          41px
        );
    }

    #${ROOT_ID}.layout-portrait
    #tc-leave {
      grid-area:leave;

      gap:
        clamp(
          14px,
          5vw,
          25px
        );

      font-size:
        clamp(
          13px,
          3.8vw,
          17px
        );
    }

    #${ROOT_ID}.layout-portrait
    .tc-leave-row:first-child {
      border-right:0;

      padding-right:0;
    }

    #${ROOT_ID}.layout-portrait
    #tc-work-timeline {
      min-height:37px;

      margin:0 5px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-main {
      grid-template-columns:1fr;

      grid-template-rows:
        minmax(0,1.12fr)
        minmax(0,1.35fr);

      gap:6px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-side {
      display:flex;

      flex-direction:column;

      gap:5px;

      min-height:0;
    }

    #${ROOT_ID}.layout-portrait
    #tc-next-card {
      flex:1.3 1 0;
    }

    #${ROOT_ID}.layout-portrait
    #tc-prev-card {
      flex:.7 1 0;
    }

    #${ROOT_ID}.layout-portrait
    #tc-now {
      padding:
        9px
        14px
        8px
        17px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-current-topline {
      gap:7px;

      margin-bottom:3px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-now-badge {
      font-size:9px;

      padding:5px 9px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-current-attributes {
      gap:7px;

      font-size:8px;
    }

    #${ROOT_ID}.layout-portrait
    .tc-current-attr {
      max-width:105px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-task {
      font-size:
        clamp(
          24px,
          7vw,
          33px
        );

      margin:
        7px
        0
        6px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-current-section-panel {
      margin-bottom:3px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-current-section-panel.is-visible {
      gap:1px;
    }

    #${ROOT_ID}.layout-portrait
    #tc-section-primary {
      gap:4px;

      font-size:
        clamp(
          8px,
          2.5vw,
          10px
        );
    }

    #${ROOT_ID}.layout-portrait
    #tc-section-stats {
      gap:8px;
    }

    #${ROOT_ID}.layout-portrait
    .tc-section-stat {
      gap:3px;

      font-size:
        clamp(
          7px,
          2.1vw,
          9px
        );
    }

    #${ROOT_ID}.layout-portrait
    .tc-section-icon {
      width:9px;
      height:9px;
    }

    #${ROOT_ID}.layout-portrait
    .tc-now-metric {
      grid-template-columns:
        20px
        100px
        minmax(0,1fr);

      column-gap:7px;

      padding:2px 0;
    }

    #${ROOT_ID}.layout-portrait
    .tc-metric-icon {
      width:16px;
      height:16px;
    }

    #${ROOT_ID}.layout-portrait
    .tc-now-label {
      font-size:
        clamp(
          9px,
          2.8vw,
          11px
        );
    }

    #${ROOT_ID}.layout-portrait
    .tc-now-value {
      font-size:
        clamp(
          17px,
          4.9vw,
          22px
        );
    }

    #${ROOT_ID}.layout-portrait
    .tc-next-row {
      grid-template-columns:
        54px
        minmax(0,1fr)
        11px;
    }

    #${ROOT_ID}.layout-portrait
    .tc-next-time,
    #${ROOT_ID}.layout-portrait
    .tc-next-task {
      font-size:
        clamp(
          14px,
          4.1vw,
          18px
        );
    }

    /* =====================================================
       LOW-RESOLUTION / NARROW VIEWPORT
       Generic breakpoints, not device-specific.
    ===================================================== */

    @media
      (orientation:landscape)
      and (max-width:820px)
      and (max-height:430px) {

      #${ROOT_ID}.layout-landscape {
        padding:
          max(3px,env(safe-area-inset-top))
          max(6px,env(safe-area-inset-right))
          max(3px,env(safe-area-inset-bottom))
          max(6px,env(safe-area-inset-left));
      }

      #${ROOT_ID}.layout-landscape
      #tc-layout {
        grid-template-rows:
          44px
          37px
          minmax(0,1fr);

        gap:2px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-header {
        grid-template-columns:
          minmax(58px,.34fr)
          minmax(212px,1fr)
          minmax(245px,1.02fr);

        gap:6px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-brand {
        font-size:10px;

        padding-right:9px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-leave {
        font-size:14px;

        gap:10px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-leave-row:first-child {
        padding-right:10px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-date {
        font-size:12px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-clock {
        gap:7px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-clock-time {
        font-size:31px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-work-timeline {
        height:37px;

        min-height:0;

        margin:0 7px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-timeline-track {
        top:13px;

        height:4px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-timeline-label {
        font-size:8px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-timeline-regular-marker {
        top:-4px;

        height:13px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-timeline-current {
        top:21px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-timeline-current::before {
        font-size:8px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-work-timeline::before,
      #${ROOT_ID}.layout-landscape
      #tc-work-timeline::after {
        top:8px;

        height:18px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-timeline-caption-start,
      #${ROOT_ID}.layout-landscape
      #tc-timeline-caption-end {
        top:23px;

        font-size:6px;

        letter-spacing:.14em;
      }

      #${ROOT_ID}.layout-landscape
      #tc-main {
        grid-template-columns:
          minmax(0,1.18fr)
          minmax(278px,1fr);

        gap:5px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-now {
        padding:
          5px
          10px
          4px
          15px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-current-topline {
        min-height:18px;

        gap:5px;

        margin-bottom:0;
      }

      #${ROOT_ID}.layout-landscape
      #tc-now-badge {
        font-size:7px;

        padding:
          3px
          7px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-current-attributes {
        gap:5px;

        font-size:7px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-current-attr {
        max-width:104px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-current-attr-icon {
        width:9px;
        height:9px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-task {
        margin:
          5px
          0
          4px;

        font-size:
          clamp(
            20px,
            3.55vw,
            26px
          );
      }

      #${ROOT_ID}.layout-landscape
      #tc-current-section-panel {
        margin-bottom:2px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-section-primary {
        font-size:7px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-section-stats {
        gap:7px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-section-stat {
        font-size:6.3px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-section-icon {
        width:8px;
        height:8px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-now-metric {
        grid-template-columns:
          16px
          88px
          minmax(0,1fr);

        column-gap:5px;

        padding:0;
      }

      #${ROOT_ID}.layout-landscape
      .tc-metric-icon {
        width:13px;
        height:13px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-now-label {
        font-size:8px;

        letter-spacing:.13em;
      }

      #${ROOT_ID}.layout-landscape
      .tc-now-value {
        font-size:
          clamp(
            13px,
            2.2vw,
            16px
          );
      }

      #${ROOT_ID}.layout-landscape
      #tc-side {
        grid-template-rows:
          minmax(0,1.55fr)
          minmax(76px,.68fr);

        gap:4px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-next-card {
        padding:
          3px
          6px
          4px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-next-card
      .tc-card-title {
        font-size:8px;

        margin-bottom:1px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-next-row {
        grid-template-columns:
          48px
          minmax(0,1fr)
          9px;

        column-gap:5px;

        padding:0 2px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-next-row:first-child {
        padding-left:6px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-next-time,
      #${ROOT_ID}.layout-landscape
      .tc-next-task {
        font-size:
          clamp(
            10.5px,
            1.75vw,
            13px
          );
      }

      #${ROOT_ID}.layout-landscape
      .tc-next-arrow {
        font-size:11px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-prev-card {
        padding:
          3px
          6px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-prev-card
      .tc-card-title {
        font-size:7px;

        margin-bottom:1px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-prev-content {
        grid-template-columns:
          minmax(0,1fr)
          20px;

        gap:4px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-prev-task {
        font-size:10px;

        margin-bottom:1px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-prev-metric {
        grid-template-columns:
          42px
          minmax(0,1fr);

        column-gap:4px;

        min-height:11px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-prev-label {
        font-size:5.7px;
      }

      #${ROOT_ID}.layout-landscape
      .tc-prev-value {
        font-size:8.2px;
      }

      #${ROOT_ID}.layout-landscape
      #tc-prev-check {
        width:19px;
        height:19px;

        font-size:10px;
      }
    }


    @media
      (orientation:portrait)
      and (max-width:380px)
      and (max-height:740px) {

      #${ROOT_ID}.layout-portrait {
        padding:
          max(4px,env(safe-area-inset-top))
          6px
          max(4px,env(safe-area-inset-bottom));
      }

      #${ROOT_ID}.layout-portrait
      #tc-layout {
        grid-template-rows:
          64px
          34px
          minmax(0,1fr);

        gap:3px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-header {
        row-gap:1px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-brand {
        font-size:10px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-date {
        font-size:8px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-clock-time {
        font-size:29px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-leave {
        gap:12px;

        font-size:12px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-work-timeline {
        min-height:34px;

        height:34px;

        margin:0 4px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-timeline-track {
        top:13px;

        height:4px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-timeline-label {
        font-size:7px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-timeline-current {
        top:21px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-timeline-current::before {
        font-size:8px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-work-timeline::before,
      #${ROOT_ID}.layout-portrait
      #tc-work-timeline::after {
        top:8px;

        height:18px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-timeline-caption-start,
      #${ROOT_ID}.layout-portrait
      #tc-timeline-caption-end {
        top:23px;

        font-size:5.5px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-main {
        grid-template-rows:
          244px
          minmax(0,1fr);

        gap:4px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-now {
        padding:
          6px
          10px
          5px
          14px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-current-topline {
        gap:5px;

        margin-bottom:0;
      }

      #${ROOT_ID}.layout-portrait
      #tc-now-badge {
        font-size:7px;

        padding:
          4px
          7px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-current-attributes {
        gap:5px;

        font-size:6.5px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-current-attr {
        max-width:86px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-current-attr-icon {
        width:8px;
        height:8px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-task {
        margin:
          5px
          0
          4px;

        font-size:
          clamp(
            21px,
            6.7vw,
            25px
          );
      }

      #${ROOT_ID}.layout-portrait
      #tc-current-section-panel {
        margin-bottom:2px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-section-primary {
        font-size:7px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-section-stats {
        gap:7px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-section-stat {
        font-size:6px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-section-icon {
        width:8px;
        height:8px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-now-metric {
        grid-template-columns:
          16px
          88px
          minmax(0,1fr);

        column-gap:5px;

        padding:0;
      }

      #${ROOT_ID}.layout-portrait
      .tc-metric-icon {
        width:13px;
        height:13px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-now-label {
        font-size:8px;

        letter-spacing:.13em;
      }

      #${ROOT_ID}.layout-portrait
      .tc-now-value {
        font-size:
          clamp(
            15px,
            4.8vw,
            18px
          );
      }

      #${ROOT_ID}.layout-portrait
      #tc-side {
        gap:4px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-next-card {
        flex:1.28 1 0;

        padding:
          4px
          7px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-prev-card {
        flex:.72 1 0;

        padding:
          4px
          7px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-card-title {
        font-size:8px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-next-row {
        grid-template-columns:
          46px
          minmax(0,1fr)
          9px;

        column-gap:5px;

        padding:0 2px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-next-time,
      #${ROOT_ID}.layout-portrait
      .tc-next-task {
        font-size:
          clamp(
            11px,
            3.5vw,
            13px
          );
      }

      #${ROOT_ID}.layout-portrait
      .tc-next-arrow {
        font-size:10px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-prev-task {
        font-size:11px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-prev-metric {
        grid-template-columns:
          44px
          minmax(0,1fr);

        min-height:12px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-prev-label {
        font-size:6px;
      }

      #${ROOT_ID}.layout-portrait
      .tc-prev-value {
        font-size:9px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-prev-check {
        width:21px;
        height:21px;

        font-size:11px;
      }

      #${ROOT_ID}.layout-portrait
      #tc-version {
        font-size:6px;
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

  if (IS_IOS) {
    root.classList.add(
      'platform-ios'
    );
  }

  if (IS_ANDROID) {
    root.classList.add(
      'platform-android'
    );
  }

  if (IS_FIREFOX) {
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
            <span>退勤</span>
            <span id="tc-leave-time">--:--</span>
          </div>

          <div class="tc-leave-row">
            <span id="tc-leave-label">あと</span>
            <span id="tc-leave-count">--:--</span>
          </div>

        </div>

        <div id="tc-clock">

          <span id="tc-date">
            ----/--/-- (---)
          </span>

          <span id="tc-clock-time">
            --:--
          </span>

        </div>

      </header>

      <section id="tc-work-timeline">

        <div
          id="tc-timeline-start-label"
          class="tc-timeline-label">
          08:30
        </div>

        <div
          id="tc-timeline-regular-label"
          class="tc-timeline-label">
          17:25
        </div>

        <div
          id="tc-timeline-end-label"
          class="tc-timeline-label">
          17:25
        </div>

        <div id="tc-timeline-track">
          <div id="tc-timeline-normal"></div>
          <div id="tc-timeline-overtime"></div>
          <div id="tc-timeline-regular-marker"></div>
        </div>

        <div id="tc-timeline-current">
          <div id="tc-timeline-current-text"></div>
        </div>

        <div id="tc-timeline-caption-start">
          REGULAR HOURS
        </div>

        <div id="tc-timeline-caption-end">
          OVERTIME
        </div>

      </section>

      <main id="tc-main">

        <section id="tc-now">

          <div id="tc-current-topline">

            <div id="tc-now-badge">
              CURRENT TASK
            </div>

            <div id="tc-current-attributes">

              <div
                id="tc-current-project"
                class="tc-current-attr">

                <span class="tc-current-attr-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M3 6.5h6l2 2H21v9.5H3z"/>
                  </svg>
                </span>

                <span
                  id="tc-current-project-text"
                  class="tc-current-attr-text"></span>

              </div>

              <div
                id="tc-current-mode"
                class="tc-current-attr">

                <span class="tc-current-attr-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="12" r="8"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </span>

                <span
                  id="tc-current-mode-text"
                  class="tc-current-attr-text"></span>

              </div>

            </div>

          </div>

          <div id="tc-task">
            タスクを取得できません
          </div>

          <div id="tc-current-section-panel">

            <div
              id="tc-section-primary"
              class="tc-section-line">

              <span class="tc-section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="4" y="5" width="6" height="6" rx="1"/>
                  <rect x="14" y="5" width="6" height="6" rx="1"/>
                  <rect x="4" y="15" width="6" height="4" rx="1"/>
                  <rect x="14" y="15" width="6" height="4" rx="1"/>
                </svg>
              </span>

              <span id="tc-current-section"></span>

            </div>


            <div
              id="tc-section-stats"
              class="tc-section-line">

              <span
                id="tc-section-count-wrap"
                class="tc-section-stat">

                <span class="tc-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="12" cy="13" r="7"/>
                    <path d="M9 3h6M12 6v2M12 13V9"/>
                  </svg>
                </span>

                <span id="tc-section-count"></span>

              </span>


              <span
                id="tc-section-duration-wrap"
                class="tc-section-stat">

                <span class="tc-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M7 3h10M7 21h10M8 3c0 4 1.5 5.5 4 7-2.5 1.5-4 3-4 7M16 3c0 4-1.5 5.5-4 7 2.5 1.5 4 3 4 7"/>
                  </svg>
                </span>

                <span id="tc-section-duration"></span>

              </span>


              <span
                id="tc-section-balance-wrap"
                class="tc-section-stat">

                <span class="tc-section-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M12 3v17M6 6h12M8 6l-4 7h8zM16 6l-4 7h8zM8 20h8"/>
                  </svg>
                </span>

                <span id="tc-section-balance"></span>

              </span>

            </div>

          </div>

          <div id="tc-progress">

            <div class="tc-now-metric">

              <span class="tc-metric-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="8"/>
                  <path d="M12 7v5l3 2"/>
                </svg>
              </span>

              <span class="tc-now-label">
                START
              </span>

              <span
                id="tc-start"
                class="tc-now-value">
                --:--
              </span>

            </div>

            <div class="tc-now-metric">

              <span class="tc-metric-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="4" y="5" width="16" height="15" rx="1"/>
                  <path d="M8 3v4M16 3v4M4 9h16"/>
                </svg>
              </span>

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

              <span class="tc-metric-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M6 21V4"/>
                  <path d="M6 5h11l-2.5 3L17 11H6"/>
                </svg>
              </span>

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

              <span class="tc-metric-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="13" r="7"/>
                  <path d="M9 3h6M12 6v2M12 13l3-2"/>
                </svg>
              </span>

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

              <span class="tc-metric-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M7 3h10M7 21h10M8 3c0 4 1.5 5.5 4 7-2.5 1.5-4 3-4 7M16 3c0 4-1.5 5.5-4 7 2.5 1.5 4 3 4 7"/>
                </svg>
              </span>

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
            id="tc-next-card"
            class="tc-card">

            <div class="tc-card-title">
              NEXT
            </div>

            <div id="tc-next-list">

              <div class="tc-next-row">
                <span id="tc-next-time-0" class="tc-next-time">—</span>
                <span id="tc-next-task-0" class="tc-next-task">—</span>
                <span class="tc-next-arrow">›</span>
              </div>

              <div class="tc-next-row">
                <span id="tc-next-time-1" class="tc-next-time">—</span>
                <span id="tc-next-task-1" class="tc-next-task">—</span>
                <span class="tc-next-arrow">›</span>
              </div>

              <div class="tc-next-row">
                <span id="tc-next-time-2" class="tc-next-time">—</span>
                <span id="tc-next-task-2" class="tc-next-task">—</span>
                <span class="tc-next-arrow">›</span>
              </div>

              <div class="tc-next-row">
                <span id="tc-next-time-3" class="tc-next-time">—</span>
                <span id="tc-next-task-3" class="tc-next-task">—</span>
                <span class="tc-next-arrow">›</span>
              </div>

              <div class="tc-next-row">
                <span id="tc-next-time-4" class="tc-next-time">—</span>
                <span id="tc-next-task-4" class="tc-next-task">—</span>
                <span class="tc-next-arrow">›</span>
              </div>

            </div>

          </section>

          <section
            id="tc-prev-card"
            class="tc-card">

            <div class="tc-card-title">
              PREVIOUS
            </div>

            <div id="tc-prev-content">

              <div id="tc-prev-data">

                <div id="tc-prev-task">
                  —
                </div>

                <div class="tc-prev-metric">
                  <span class="tc-prev-label">START</span>
                  <span id="tc-prev-start" class="tc-prev-value">—</span>
                </div>

                <div class="tc-prev-metric">
                  <span class="tc-prev-label">FINISH</span>
                  <span id="tc-prev-finish" class="tc-prev-value">—</span>
                </div>

                <div class="tc-prev-metric">
                  <span class="tc-prev-label">ELAPSED</span>
                  <span id="tc-prev-elapsed" class="tc-prev-value">—</span>
                </div>

              </div>

              <div id="tc-prev-check">
                ✓
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

  document.body.appendChild(
    root
  );

  /* =========================================================
     VIEWPORT
  ========================================================= */

  function getCurrentViewportSize() {
    const vv =
      window.visualViewport;

    return {
      width:
        Math.max(
          1,
          Math.round(
            vv?.width ||
            window.innerWidth ||
            document.documentElement.clientWidth ||
            1
          )
        ),

      height:
        Math.max(
          1,
          Math.round(
            vv?.height ||
            window.innerHeight ||
            document.documentElement.clientHeight ||
            1
          )
        )
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

  let viewportRAF = null;

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
          viewportRAF = null;

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
      passive:true
    }
  );

  window.addEventListener(
    'orientationchange',
    scheduleViewportUpdate,
    {
      passive:true
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
          passive:true
        }
      );

    window.visualViewport
      .addEventListener(
        'scroll',
        scheduleViewportUpdate,
        {
          passive:true
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

        viewportRAF = null;
      }
    };

  /* =========================================================
     ANDROID TASK / NOW
  ========================================================= */

  if (IS_ANDROID) {
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

    document.body.appendChild(
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
     RENDER HELPERS
  ========================================================= */

  const $ =
    id =>
      document.getElementById(id);

  const WEEKDAYS = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat'
  ];

  function renderTimeline(now) {
    const start =
      hmToMinutes(WORK_START);

    const regular =
      hmToMinutes(REGULAR_END);

    let leave =
      hmToMinutes(
        state.leaveTime
      );

    if (
      leave === null
    ) {
      leave = regular;
    }

    const end =
      Math.max(
        regular,
        leave
      );

    const span =
      Math.max(
        1,
        end - start
      );

    const regularPercent =
      clamp(
        (
          (regular - start) /
          span
        ) * 100,
        0,
        100
      );

    const overtimePercent =
      Math.max(
        0,
        100 -
        regularPercent
      );

    const currentMinutes =
      now.getHours() * 60 +
      now.getMinutes() +
      now.getSeconds() / 60;

    const visibleCurrent =
      clamp(
        currentMinutes,
        start,
        end
      );

    const currentPercent =
      clamp(
        (
          (visibleCurrent - start) /
          span
        ) * 100,
        0,
        100
      );

    $('tc-timeline-normal')
      .style.width =
        `${regularPercent}%`;

    $('tc-timeline-overtime')
      .style.left =
        `${regularPercent}%`;

    $('tc-timeline-overtime')
      .style.width =
        `${overtimePercent}%`;

    $('tc-timeline-regular-marker')
      .style.left =
        `${regularPercent}%`;

    $('tc-timeline-regular-label')
      .style.left =
        `${regularPercent}%`;

    $('tc-timeline-end-label')
      .textContent =
        end > regular
          ? state.leaveTime
          : REGULAR_END;

    $('tc-timeline-end-label')
      .style.display =
        end > regular
          ? 'block'
          : 'none';

    $('tc-timeline-current')
      .style.left =
        `${currentPercent}%`;

    root.classList.toggle(
      'is-overtime',
      currentMinutes >
        regular
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  function render() {
    const now = new Date();

    $('tc-date')
      .textContent =
        now.getFullYear() +
        '/' +
        pad(now.getMonth() + 1) +
        '/' +
        pad(now.getDate()) +
        ' (' +
        WEEKDAYS[now.getDay()] +
        ')';

    $('tc-clock-time')
      .textContent =
        pad(now.getHours()) +
        ':' +
        pad(now.getMinutes());

    renderTimeline(now);

    /* CURRENT */

    $('tc-task')
      .textContent =
        state.currentTask ||
        'タスクを取得できません';

    const projectEl =
      $('tc-current-project');

    const modeEl =
      $('tc-current-mode');

    $('tc-current-project-text')
      .textContent =
        state.currentProject ||
        '';

    $('tc-current-mode-text')
      .textContent =
        state.currentMode ||
        '';

    projectEl
      .classList.toggle(
        'is-visible',
        !!state.currentProject
      );

    modeEl
      .classList.toggle(
        'is-visible',
        !!state.currentMode
      );

    const sectionPanel =
      $('tc-current-section-panel');

    const sectionPrimary =
      $('tc-section-primary');

    const sectionStats =
      $('tc-section-stats');

    const sectionName =
      state.currentSection ||
      '';

    const sectionRange =
      state.currentSectionRange ||
      '';

    const sectionCount =
      state.currentSectionCount ||
      '';

    const sectionDuration =
      state.currentSectionDuration ||
      '';

    const sectionBalance =
      state.currentSectionBalance ||
      '';

    const sectionPrimaryText =
      [
        sectionRange,
        sectionName
      ]
        .filter(Boolean)
        .join(' ');

    $('tc-current-section')
      .textContent =
        sectionPrimaryText;

    $('tc-section-count')
      .textContent =
        sectionCount;

    $('tc-section-duration')
      .textContent =
        sectionDuration;

    $('tc-section-balance')
      .textContent =
        sectionBalance;

    $('tc-section-count-wrap')
      .classList.toggle(
        'is-visible',
        !!sectionCount
      );

    $('tc-section-duration-wrap')
      .classList.toggle(
        'is-visible',
        !!sectionDuration
      );

    $('tc-section-balance-wrap')
      .classList.toggle(
        'is-visible',
        !!sectionBalance
      );

    sectionPrimary
      .classList.toggle(
        'is-visible',
        !!sectionPrimaryText
      );

    sectionStats
      .classList.toggle(
        'is-visible',
        !!(
          sectionCount ||
          sectionDuration ||
          sectionBalance
        )
      );

    sectionPanel
      .classList.toggle(
        'is-visible',
        !!(
          sectionPrimaryText ||
          sectionCount ||
          sectionDuration ||
          sectionBalance
        )
      );

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
        secondsToHMS(elapsed);

    const statusLabel =
      $('tc-status-label');

    const statusValue =
      $('tc-status-value');

    if (
      elapsed !== null &&
      state.plannedSeconds !==
        null
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
            secondsToHMS(diff);

        statusLabel
          .classList.remove(
            'tc-over'
          );

        statusValue
          .classList.remove(
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
          .classList.add(
            'tc-over'
          );

        statusValue
          .classList.add(
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
        .classList.remove(
          'tc-over'
        );

      statusValue
        .classList.remove(
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
      prevFinish = '—';
    }

    $('tc-prev-finish')
      .textContent =
        prevFinish;

    let prevElapsed = '—';

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
          secondsToHMS(sec);
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
      ).textContent =
        row?.scheduleTime ||
        '—';

      $(
        `tc-next-task-${i}`
      ).textContent =
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
        Math.abs(diff);

      $('tc-leave-label')
        .textContent =
          '超過';

      $('tc-leave-count')
        .textContent =
          secondsToHMS(diff);
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
