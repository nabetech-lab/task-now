(() => {
  const ID = 'tc-now-app';

  // もう一度実行したら閉じる
  const old = document.getElementById(ID);
  if (old) {
    old.remove();
    if (window.tcNowTimer) {
      clearInterval(window.tcNowTimer);
      window.tcNowTimer = null;
    }
    return;
  }

  // =========================================================
  // STYLE
  // =========================================================

  const style = document.createElement('style');
  style.id = 'tc-now-style';

  style.textContent = `
    #${ID},
    #${ID} * {
      box-sizing: border-box;
    }

    #${ID} {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100dvh;
      z-index: 2147483647;

      background: #07090d;
      color: #f7f7f8;

      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Helvetica Neue",
        "Hiragino Sans",
        "Yu Gothic",
        sans-serif;

      overflow: hidden;

      padding:
        max(16px, env(safe-area-inset-top))
        max(18px, env(safe-area-inset-right))
        max(16px, env(safe-area-inset-bottom))
        max(18px, env(safe-area-inset-left));
    }

    /* ===============================
       PORTRAIT
       =============================== */

    #${ID} .tc-portrait {
      width: 100%;
      height: 100%;

      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;

      text-align: center;
    }

    #${ID} .tc-p-now {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #999ca4;
      margin-bottom: 28px;
    }

    #${ID} .tc-p-task {
      width: 100%;
      max-width: 380px;

      font-size: clamp(28px, 8vw, 42px);
      font-weight: 750;
      line-height: 1.25;

      overflow-wrap: anywhere;
      margin-bottom: 34px;
    }

    #${ID} .tc-p-elapsed {
      font-size: clamp(54px, 15vw, 76px);
      font-weight: 750;
      font-variant-numeric: tabular-nums;
      letter-spacing: -2px;

      white-space: nowrap;
      margin-bottom: 70px;
    }

    #${ID} .tc-p-leave {
      width: min(290px, 82vw);

      display: grid;
      grid-template-columns: 90px 1fr;
      row-gap: 12px;

      text-align: left;

      font-size: 25px;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }

    #${ID} .tc-p-value {
      white-space: nowrap;
    }

    /* ===============================
       LANDSCAPE
       =============================== */

    #${ID} .tc-landscape {
      display: none;
      width: 100%;
      height: 100%;

      grid-template-rows: auto minmax(0, 1fr);
      gap: clamp(12px, 3vh, 24px);
    }

    #${ID} .tc-header {
      width: 100%;

      display: grid;
      grid-template-columns:
        minmax(150px, 0.95fr)
        minmax(210px, 1.15fr)
        minmax(120px, 0.65fr);

      align-items: start;
      gap: clamp(12px, 3vw, 34px);

      min-width: 0;
    }

    #${ID} .tc-brand {
      color: #a2a5ae;

      font-size: clamp(16px, 2.6vw, 27px);
      font-weight: 750;
      line-height: 1.55;

      letter-spacing: clamp(4px, .8vw, 9px);

      white-space: nowrap;
    }

    #${ID} .tc-leave-head {
      min-width: 0;

      font-size: clamp(18px, 2.8vw, 30px);
      font-weight: 750;
      line-height: 1.45;

      font-variant-numeric: tabular-nums;
    }

    #${ID} .tc-leave-head-row {
      display: grid;
      grid-template-columns: auto 1fr;
      column-gap: 12px;

      white-space: nowrap;
    }

    #${ID} .tc-clock {
      justify-self: end;

      font-size: clamp(40px, 7vw, 68px);
      font-weight: 750;
      line-height: 1;

      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    #${ID} .tc-main {
      width: 100%;
      min-width: 0;
      min-height: 0;

      display: grid;

      /*
       * ここが今回の重要部分。
       * minmax(0, ...) で右側が画面外へ
       * 押し出されないようにする。
       */
      grid-template-columns:
        minmax(0, 1.58fr)
        minmax(210px, .92fr);

      gap: clamp(12px, 2.8vw, 28px);
    }

    #${ID} .tc-now-card {
      min-width: 0;
      min-height: 0;

      position: relative;

      background: #1b212b;

      border-radius: clamp(24px, 5vw, 50px);

      padding:
        clamp(24px, 5vh, 48px)
        clamp(28px, 5vw, 62px);

      display: flex;
      flex-direction: column;
      justify-content: center;

      overflow: hidden;
    }

    #${ID} .tc-now-card::before {
      content: "";
      position: absolute;

      left: 0;
      top: 0;
      bottom: 0;

      width: clamp(10px, 1.3vw, 20px);

      background: #f7f7f8;
    }

    #${ID} .tc-now-badge {
      position: absolute;

      top: clamp(20px, 5vh, 40px);
      left: clamp(40px, 6vw, 74px);

      background: #f7f7f8;
      color: #090b0f;

      border-radius: clamp(14px, 2vw, 24px);

      padding:
        clamp(10px, 2vh, 18px)
        clamp(18px, 3vw, 30px);

      font-size: clamp(18px, 2.5vw, 27px);
      font-weight: 850;
      letter-spacing: 5px;
    }

    #${ID} .tc-now-body {
      margin-top: clamp(44px, 8vh, 82px);
      min-width: 0;
    }

    #${ID} .tc-now-start {
      color: #cfd2d9;

      font-size: clamp(28px, 4vw, 46px);
      font-weight: 450;

      font-variant-numeric: tabular-nums;

      margin-bottom: clamp(18px, 4vh, 34px);
    }

    #${ID} .tc-now-task {
      width: 100%;

      font-size: clamp(34px, 5vw, 58px);
      font-weight: 800;
      line-height: 1.15;

      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #${ID} .tc-side {
      min-width: 0;
      min-height: 0;

      display: grid;
      grid-template-rows: 1fr 1fr;

      gap: clamp(10px, 2.5vh, 20px);
    }

    #${ID} .tc-side-card {
      min-width: 0;
      min-height: 0;

      background: #0f1218;

      border-radius: clamp(22px, 4vw, 40px);

      padding:
        clamp(18px, 4vh, 34px)
        clamp(20px, 3vw, 38px);

      display: flex;
      flex-direction: column;
      justify-content: center;

      overflow: hidden;
    }

    #${ID} .tc-side-title {
      color: #3c404a;

      font-size: clamp(15px, 2vw, 23px);
      font-weight: 800;

      letter-spacing: clamp(4px, .7vw, 8px);

      margin-bottom: clamp(14px, 3vh, 30px);

      white-space: nowrap;
    }

    #${ID} .tc-side-row {
      min-width: 0;

      display: grid;
      grid-template-columns: auto minmax(0, 1fr);

      align-items: center;

      gap: clamp(14px, 2vw, 28px);
    }

    #${ID} .tc-side-time {
      color: #5e626c;

      font-size: clamp(22px, 3vw, 36px);
      font-weight: 450;

      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    #${ID} .tc-side-task {
      min-width: 0;

      color: #686c76;

      font-size: clamp(22px, 3vw, 36px);
      font-weight: 700;

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #${ID} .tc-empty {
      color: #454953;
    }

    /* ===============================
       orientation switch
       =============================== */

    @media (orientation: landscape) {
      #${ID} .tc-portrait {
        display: none;
      }

      #${ID} .tc-landscape {
        display: grid;
      }
    }

    /* iPhone横画面向け圧縮 */
    @media (orientation: landscape) and (max-height: 500px) {

      #${ID} {
        padding:
          max(8px, env(safe-area-inset-top))
          max(14px, env(safe-area-inset-right))
          max(8px, env(safe-area-inset-bottom))
          max(14px, env(safe-area-inset-left));
      }

      #${ID} .tc-landscape {
        gap: 10px;
      }

      #${ID} .tc-header {
        grid-template-columns:
          minmax(130px, .85fr)
          minmax(190px, 1.05fr)
          minmax(100px, .55fr);

        gap: 14px;
      }

      #${ID} .tc-brand {
        font-size: 16px;
        letter-spacing: 5px;
        line-height: 1.45;
      }

      #${ID} .tc-leave-head {
        font-size: 18px;
        line-height: 1.35;
      }

      #${ID} .tc-clock {
        font-size: 38px;
      }

      #${ID} .tc-main {
        grid-template-columns:
          minmax(0, 1.55fr)
          minmax(190px, .85fr);

        gap: 12px;
      }

      #${ID} .tc-now-card {
        border-radius: 25px;
        padding: 24px 30px;
      }

      #${ID} .tc-now-card::before {
        width: 10px;
      }

      #${ID} .tc-now-badge {
        top: 18px;
        left: 34px;

        padding: 10px 18px;

        font-size: 17px;
        letter-spacing: 4px;

        border-radius: 14px;
      }

      #${ID} .tc-now-body {
        margin-top: 40px;
      }

      #${ID} .tc-now-start {
        font-size: 28px;
        margin-bottom: 15px;
      }

      #${ID} .tc-now-task {
        font-size: 36px;
      }

      #${ID} .tc-side {
        gap: 10px;
      }

      #${ID} .tc-side-card {
        border-radius: 23px;
        padding: 17px 20px;
      }

      #${ID} .tc-side-title {
        font-size: 14px;
        letter-spacing: 4px;
        margin-bottom: 12px;
      }

      #${ID} .tc-side-row {
        gap: 12px;
      }

      #${ID} .tc-side-time {
        font-size: 22px;
      }

      #${ID} .tc-side-task {
        font-size: 22px;
      }
    }
  `;

  document.head.appendChild(style);

  // =========================================================
  // HTML
  // =========================================================

  const root = document.createElement('div');
  root.id = ID;

  root.innerHTML = `
    <!-- 縦画面 -->
    <div class="tc-portrait">

      <div class="tc-p-now">
        NOW
      </div>

      <div
        id="tc-p-task"
        class="tc-p-task"
      >
        タスクを取得できません
      </div>

      <div
        id="tc-p-elapsed"
        class="tc-p-elapsed"
      >
        --:--:--
      </div>

      <div class="tc-p-leave">

        <div>退勤</div>
        <div
          id="tc-p-leave"
          class="tc-p-value"
        >
          --:--
        </div>

        <div id="tc-p-count-label">
          あと
        </div>

        <div
          id="tc-p-count"
          class="tc-p-value"
        >
          --:--
        </div>

      </div>

    </div>


    <!-- 横画面 -->
    <div class="tc-landscape">

      <header class="tc-header">

        <div class="tc-brand">
          TASKCHUTE ·<br>
          TODAY
        </div>

        <div class="tc-leave-head">

          <div class="tc-leave-head-row">
            <span>退勤</span>
            <span id="tc-l-leave">--:--</span>
          </div>

          <div class="tc-leave-head-row">
            <span id="tc-l-count-label">あと</span>
            <span id="tc-l-count">--:--</span>
          </div>

        </div>

        <div
          id="tc-clock"
          class="tc-clock"
        >
          --:--
        </div>

      </header>


      <main class="tc-main">

        <!-- NOW -->
        <section class="tc-now-card">

          <div class="tc-now-badge">
            NOW
          </div>

          <div class="tc-now-body">

            <div
              id="tc-now-start"
              class="tc-now-start"
            >
              --:--
            </div>

            <div
              id="tc-now-task"
              class="tc-now-task"
            >
              タスクを取得できません
            </div>

          </div>

        </section>


        <!-- PREVIOUS / NEXT -->
        <aside class="tc-side">

          <section class="tc-side-card">

            <div class="tc-side-title">
              PREVIOUS
            </div>

            <div class="tc-side-row">

              <div
                id="tc-prev-time"
                class="tc-side-time"
              >
                --:--
              </div>

              <div
                id="tc-prev-task"
                class="tc-side-task"
              >
                —
              </div>

            </div>

          </section>


          <section class="tc-side-card">

            <div class="tc-side-title">
              NEXT
            </div>

            <div class="tc-side-row">

              <div
                id="tc-next-time"
                class="tc-side-time"
              >
                --:--
              </div>

              <div
                id="tc-next-task"
                class="tc-side-task"
              >
                —
              </div>

            </div>

          </section>

        </aside>

      </main>

    </div>
  `;

  document.body.appendChild(root);

  // =========================================================
  // UTILITY
  // =========================================================

  function $(id) {
    return document.getElementById(id);
  }

  function isOwnElement(el) {
    return !!el?.closest?.('#' + ID);
  }

  function visible(el) {
    if (!el) return false;
    if (isOwnElement(el)) return false;

    const r = el.getBoundingClientRect();

    return (
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.top < window.innerHeight
    );
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function clockHHMM(date = new Date()) {
    return (
      pad2(date.getHours()) +
      ':' +
      pad2(date.getMinutes())
    );
  }

  // =========================================================
  // CURRENT ELAPSED
  // =========================================================

  function getElapsedElement() {

    const candidates =
      [...document.querySelectorAll('p,div,span')]
      .filter(el =>
        visible(el) &&
        /^\\d{2}:\\d{2}:\\d{2}$/.test(
          (el.textContent || '').trim()
        )
      );

    if (!candidates.length) {
      return null;
    }

    // TaskChute下部プレイヤーを優先
    return candidates.sort(
      (a, b) =>
        b.getBoundingClientRect().top -
        a.getBoundingClientRect().top
    )[0];
  }

  // =========================================================
  // CURRENT TASK
  // =========================================================

  function getCurrentTask(elapsedEl) {

    if (!elapsedEl) {
      return null;
    }

    let parent = elapsedEl;

    for (
      let depth = 0;
      depth < 8 && parent;
      depth++, parent = parent.parentElement
    ) {

      const r = parent.getBoundingClientRect();

      // 下部プレイヤー領域
      if (
        r.top > window.innerHeight * 0.55 &&
        r.height > 60
      ) {

        const candidates =
          [...parent.querySelectorAll('*')]
          .filter(el => {

            if (!visible(el)) {
              return false;
            }

            if (el.children.length) {
              return false;
            }

            const text =
              (el.textContent || '').trim();

            if (
              !text ||
              text.length < 2 ||
              text.length > 100
            ) {
              return false;
            }

            if (
              /^-?\\d{2}:\\d{2}:\\d{2}$/.test(text)
            ) {
              return false;
            }

            if (
              /^[\\d\\s:./\\-]+$/.test(text)
            ) {
              return false;
            }

            if (
              text === 'Main' ||
              text === 'NOW'
            ) {
              return false;
            }

            return true;
          })
          .map(el =>
            (el.textContent || '').trim()
          );

        if (candidates.length) {

          candidates.sort(
            (a, b) =>
              b.length - a.length
          );

          return candidates[0];
        }
      }
    }

    return null;
  }

  // =========================================================
  // CURRENT START TIME
  // =========================================================

  function getCurrentStartTime(currentTask) {

    if (!currentTask) {
      return null;
    }

    const taskElements =
      [...document.querySelectorAll('body *')]
      .filter(el =>
        !isOwnElement(el) &&
        (el.textContent || '').trim() === currentTask
      );

    for (const taskEl of taskElements) {

      let parent = taskEl;

      for (
        let depth = 0;
        depth < 7 && parent;
        depth++, parent = parent.parentElement
      ) {

        const texts =
          [...parent.querySelectorAll('*')]
          .map(el =>
            (el.textContent || '').trim()
          )
          .filter(text =>
            /^\\d{1,2}:\\d{2}$/.test(text)
          );

        if (texts.length) {
          return [...new Set(texts)][0];
        }
      }
    }

    return clockHHMM();
  }

  // =========================================================
  // LEAVE TIME
  // =========================================================

  function getLeaveTime() {

    const leaveEls =
      [...document.querySelectorAll('body *')]
      .filter(el =>
        !isOwnElement(el) &&
        (el.textContent || '').trim() === '退勤'
      );

    for (const leaveEl of leaveEls) {

      let parent = leaveEl;

      for (
        let depth = 0;
        depth < 7 && parent;
        depth++, parent = parent.parentElement
      ) {

        const times =
          [...parent.querySelectorAll('*')]
          .map(el =>
            (el.textContent || '').trim()
          )
          .filter(text =>
            /^\\d{1,2}:\\d{2}$/.test(text)
          );

        if (times.length) {

          const unique =
            [...new Set(times)];

          return unique[unique.length - 1];
        }
      }
    }

    return null;
  }

  // =========================================================
  // PREVIOUS / NEXT
  // =========================================================

  function getTaskTextFromContainer(container) {

    if (!container) {
      return null;
    }

    const leaves =
      [...container.querySelectorAll('*')]
      .filter(el => {

        if (el.children.length) {
          return false;
        }

        const text =
          (el.textContent || '').trim();

        if (
          !text ||
          text.length < 2 ||
          text.length > 100
        ) {
          return false;
        }

        if (
          /^\\d{1,2}:\\d{2}(:\\d{2})?$/.test(text)
        ) {
          return false;
        }

        if (
          /^[\\d\\s:./\\-]+$/.test(text)
        ) {
          return false;
        }

        return true;
      });

    if (!leaves.length) {
      return null;
    }

    return (
      leaves
        .map(el =>
          (el.textContent || '').trim()
        )
        .sort(
          (a, b) =>
            b.length - a.length
        )[0] || null
    );
  }

  function getTimeFromContainer(container) {

    if (!container) {
      return null;
    }

    const times =
      [...container.querySelectorAll('*')]
      .map(el =>
        (el.textContent || '').trim()
      )
      .filter(text =>
        /^\\d{1,2}:\\d{2}$/.test(text)
      );

    return times.length
      ? [...new Set(times)][0]
      : null;
  }

  function findCurrentTaskRow(currentTask) {

    if (!currentTask) {
      return null;
    }

    const exactMatches =
      [...document.querySelectorAll('body *')]
      .filter(el =>
        !isOwnElement(el) &&
        (el.textContent || '').trim() === currentTask
      );

    for (const el of exactMatches) {

      let parent = el;

      for (
        let depth = 0;
        depth < 5 && parent;
        depth++, parent = parent.parentElement
      ) {

        const rect =
          parent.getBoundingClientRect();

        if (
          rect.height >= 30 &&
          rect.height <= 180 &&
          parent.children.length >= 1
        ) {
          return parent;
        }
      }
    }

    return null;
  }

  function findSiblingTask(
    currentRow,
    direction
  ) {

    if (!currentRow) {
      return null;
    }

    let node =
      direction < 0
        ? currentRow.previousElementSibling
        : currentRow.nextElementSibling;

    let tries = 0;

    while (
      node &&
      tries < 12
    ) {

      const task =
        getTaskTextFromContainer(node);

      if (task) {

        return {
          task,
          time:
            getTimeFromContainer(node)
        };
      }

      node =
        direction < 0
          ? node.previousElementSibling
          : node.nextElementSibling;

      tries++;
    }

    return null;
  }

  function getPrevNext(currentTask) {

    const row =
      findCurrentTaskRow(currentTask);

    return {
      previous:
        findSiblingTask(row, -1),

      next:
        findSiblingTask(row, 1)
    };
  }

  // =========================================================
  // LEAVE COUNTDOWN
  // =========================================================

  function makeLeaveCountdown(
    leaveTime
  ) {

    if (!leaveTime) {
      return {
        label: 'あと',
        value: '--:--'
      };
    }

    const now =
      new Date();

    const [hour, minute] =
      leaveTime
        .split(':')
        .map(Number);

    const leave =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
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

      return {
        label: 'あと',
        value:
          pad2(hh) +
          ':' +
          pad2(mm)
      };
    }

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

    return {
      label: '超過',
      value:
        pad2(hh) +
        ':' +
        pad2(mm) +
        ':' +
        pad2(ss)
    };
  }

  // =========================================================
  // UPDATE
  // =========================================================

  function update() {

    const now =
      new Date();

    // 現在時刻
    $('tc-clock').textContent =
      clockHHMM(now);

    // 経過時間
    const elapsedEl =
      getElapsedElement();

    const elapsed =
      elapsedEl
        ? (elapsedEl.textContent || '').trim()
        : '--:--:--';

    // 現在タスク
    const currentTask =
      getCurrentTask(elapsedEl) ||
      'タスクを取得できません';

    // 開始時刻
    const startTime =
      getCurrentStartTime(currentTask) ||
      '--:--';

    // 退勤時刻
    const leaveTime =
      getLeaveTime();

    const leave =
      makeLeaveCountdown(
        leaveTime
      );

    // Previous / Next
    const pn =
      getPrevNext(currentTask);

    // -------------------------
    // Portrait
    // -------------------------

    $('tc-p-task').textContent =
      currentTask;

    $('tc-p-elapsed').textContent =
      elapsed;

    $('tc-p-leave').textContent =
      leaveTime || '--:--';

    $('tc-p-count-label').textContent =
      leave.label;

    $('tc-p-count').textContent =
      leave.value;

    // -------------------------
    // Landscape header
    // -------------------------

    $('tc-l-leave').textContent =
      leaveTime || '--:--';

    $('tc-l-count-label').textContent =
      leave.label;

    $('tc-l-count').textContent =
      leave.value;

    // -------------------------
    // NOW
    // -------------------------

    $('tc-now-start').textContent =
      startTime;

    $('tc-now-task').textContent =
      currentTask;

    // -------------------------
    // PREVIOUS
    // -------------------------

    if (pn.previous) {

      $('tc-prev-time').textContent =
        pn.previous.time || '--:--';

      $('tc-prev-task').textContent =
        pn.previous.task;

    } else {

      $('tc-prev-time').textContent =
        '--:--';

      $('tc-prev-task').textContent =
        '—';
    }

    // -------------------------
    // NEXT
    // -------------------------

    if (pn.next) {

      $('tc-next-time').textContent =
        pn.next.time || '--:--';

      $('tc-next-task').textContent =
        pn.next.task;

    } else {

      $('tc-next-time').textContent =
        '--:--';

      $('tc-next-task').textContent =
        '—';
    }
  }

  update();

  window.tcNowTimer =
    setInterval(
      update,
      1000
    );

})();
