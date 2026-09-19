(() => {
  const ID = 'tc-now-widget';

  const old = document.getElementById(ID);
  if (old) {
    old.remove();
    if (window.tcNowTimer) clearInterval(window.tcNowTimer);
    return;
  }

  /* =========================
     UI
  ========================= */

  const root = document.createElement('div');
  root.id = ID;

  root.innerHTML = `
    <style>
      #${ID}, #${ID} * {
        box-sizing: border-box;
      }

      #${ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;

        background: #07090e;
        color: #f4f4f4;

        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Helvetica Neue",
          sans-serif;

        padding:
          max(20px, env(safe-area-inset-top))
          max(28px, env(safe-area-inset-right))
          max(18px, env(safe-area-inset-bottom))
          max(28px, env(safe-area-inset-left));

        display: flex;
        flex-direction: column;

        overflow: hidden;
      }

      #${ID} .header {
        height: 86px;

        display: grid;
        grid-template-columns: 250px 1fr 180px;
        align-items: start;

        flex-shrink: 0;
      }

      #${ID} .brand {
        font-size: 20px;
        line-height: 1.45;

        font-weight: 700;

        letter-spacing: .22em;

        color: #989ba6;
      }

      #${ID} .leave {
        padding-top: 2px;

        font-size: 24px;
        line-height: 1.42;

        font-weight: 700;

        font-variant-numeric: tabular-nums;
      }

      #${ID} .clock {
        text-align: right;

        font-size: 44px;
        line-height: 1;

        font-weight: 800;

        font-variant-numeric: tabular-nums;
      }

      #${ID} .layout {
        flex: 1;

        min-height: 0;

        display: grid;

        grid-template-columns:
          minmax(420px, 1.18fr)
          minmax(310px, .82fr);

        gap: 26px;
      }

      #${ID} .nowCard {
        position: relative;

        min-width: 0;

        padding:
          38px
          40px
          36px
          46px;

        border-radius: 30px;

        background: #191f29;

        display: flex;
        flex-direction: column;

        overflow: hidden;
      }

      #${ID} .nowRail {
        position: absolute;

        left: 0;
        top: 0;
        bottom: 0;

        width: 13px;

        background: #fafafa;
      }

      #${ID} .badge {
        align-self: flex-start;

        padding: 12px 22px;

        border-radius: 14px;

        background: #fafafa;
        color: #101217;

        font-size: 20px;

        font-weight: 800;

        letter-spacing: .13em;
      }

      #${ID} .planned {
        margin-top: 54px;

        font-size: 33px;

        font-weight: 500;

        color: #d6d8dd;

        font-variant-numeric: tabular-nums;
      }

      #${ID} .task {
        margin-top: 22px;

        font-size: clamp(35px, 5vw, 56px);

        line-height: 1.15;

        font-weight: 800;

        color: #fff;

        overflow: hidden;
      }

      #${ID} .elapsedBlock {
        margin-top: auto;
      }

      #${ID} .smallTitle {
        margin-bottom: 14px;

        color: #989ca7;

        font-size: 18px;

        font-weight: 500;

        letter-spacing: .18em;
      }

      #${ID} .elapsed {
        font-size: 56px;

        line-height: 1;

        font-weight: 800;

        font-variant-numeric: tabular-nums;
      }

      #${ID} .right {
        min-width: 0;

        display: grid;

        grid-template-rows: 200px 1fr;

        gap: 26px;
      }

      #${ID} .panel {
        border-radius: 30px;

        background: #0d1017;

        padding: 32px 34px;

        overflow: hidden;
      }

      #${ID} .panelTitle {
        margin-bottom: 30px;

        font-size: 19px;

        font-weight: 800;

        letter-spacing: .18em;

        color: #3d4049;
      }

      #${ID} .prevRow,
      #${ID} .nextRow {
        display: grid;

        grid-template-columns: 115px 1fr;

        align-items: center;

        min-width: 0;
      }

      #${ID} .rowTime {
        font-size: 30px;

        color: #555963;

        font-variant-numeric: tabular-nums;
      }

      #${ID} .rowTask {
        font-size: 28px;

        font-weight: 700;

        white-space: nowrap;

        overflow: hidden;

        text-overflow: ellipsis;
      }

      #${ID} .prevRow .rowTask {
        color: #777b84;
      }

      #${ID} .nextRow {
        min-height: 68px;

        border-bottom:
          1px solid rgba(255,255,255,.07);
      }

      #${ID} .nextRow:last-child {
        border-bottom: 0;
      }

      #${ID} .nextRow .rowTask {
        color: #f0f0f2;
      }

      #${ID} .footer {
        height: 52px;

        flex-shrink: 0;

        display: flex;
        justify-content: space-between;
        align-items: end;

        padding-top: 10px;

        color: #4c5059;

        font-size: 15px;
      }
    </style>

    <div class="header">

      <div class="brand">
        TASKCHUTE ·<br>
        TODAY
      </div>

      <div class="leave">
        <div id="tcLeave">退勤 --:--</div>
        <div id="tcRemain">あと --:--</div>
      </div>

      <div
        class="clock"
        id="tcClock"
      >
        --:--
      </div>

    </div>

    <div class="layout">

      <div class="nowCard">

        <div class="nowRail"></div>

        <div class="badge">
          NOW
        </div>

        <div
          class="planned"
          id="tcPlanned"
        >
          --:--
        </div>

        <div
          class="task"
          id="tcTask"
        >
          タスクを取得できません
        </div>

        <div class="elapsedBlock">

          <div class="smallTitle">
            ELAPSED
          </div>

          <div
            class="elapsed"
            id="tcElapsed"
          >
            --:--:--
          </div>

        </div>

      </div>

      <div class="right">

        <div class="panel">

          <div class="panelTitle">
            PREVIOUS
          </div>

          <div
            class="prevRow"
            id="tcPrevious"
          >
          </div>

        </div>

        <div class="panel">

          <div class="panelTitle">
            NEXT
          </div>

          <div id="tcNext">
          </div>

        </div>

      </div>

    </div>

    <div class="footer">
      <div>
        Focus Display
      </div>

      <div>
        再実行：通常画面
      </div>
    </div>
  `;

  document.body.appendChild(root);


  /* =========================
     Utility
  ========================= */

  const $ = id =>
    document.getElementById(id);


  function pad(n) {
    return String(n).padStart(2, '0');
  }


  function hhmm(d) {
    return (
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }


  function visible(el) {
    if (!el) return false;

    if (el.closest('#' + ID))
      return false;

    const r =
      el.getBoundingClientRect();

    return (
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.top < innerHeight
    );
  }


  /* =========================
     下部プレイヤー
  ========================= */

  function getElapsedElement() {

    const list =
      [...document.querySelectorAll(
        'p,div,span'
      )]
      .filter(el =>
        visible(el) &&
        /^\d{2}:\d{2}:\d{2}$/
          .test(
            (el.textContent || '')
            .trim()
          )
      );

    if (!list.length)
      return null;

    return list.sort(
      (a,b) =>
        b.getBoundingClientRect().top -
        a.getBoundingClientRect().top
    )[0];
  }


  function getCurrentTask(elapsedEl) {

    if (!elapsedEl)
      return null;

    let p = elapsedEl;

    for (
      let i = 0;
      i < 8 && p;
      i++, p = p.parentElement
    ) {

      const r =
        p.getBoundingClientRect();

      if (
        r.top >
          innerHeight * .55 &&
        r.height > 70
      ) {

        const names =
          [...p.querySelectorAll('*')]
          .filter(el => {

            if (!visible(el))
              return false;

            const t =
              (el.textContent || '')
              .trim();

            if (!t)
              return false;

            if (t.length > 80)
              return false;

            if (
              /^-?\d{2}:\d{2}:\d{2}$/
              .test(t)
            )
              return false;

            if (
              /^[\d\s:./-]+$/
              .test(t)
            )
              return false;

            return (
              el.children.length === 0
            );
          })
          .map(el =>
            (el.textContent || '')
            .trim()
          )
          .filter(Boolean);

        if (names.length) {

          names.sort(
            (a,b) =>
              b.length -
              a.length
          );

          return names[0];
        }
      }
    }

    return null;
  }


  /* =========================
     タスク行
  ========================= */

  function parseRow(row) {

    let text =
      (row.textContent || '')
      .trim()
      .replace(/\s+/g, ' ');

    if (!text)
      return null;


    /*
      タスク名：
      最初の HH:MM または
      --:-- より前
    */

    const cut =
      text.search(
        /\d{1,2}:\d{2}|--:--/
      );

    let name =
      cut >= 0
        ? text.slice(0, cut)
        : text;

    name = name.trim();

    if (!name)
      return null;


    /*
      HH:MM候補
    */

    const times =
      [...row.querySelectorAll('*')]
      .map(el =>
        (el.textContent || '')
        .trim()
      )
      .filter(t =>
        /^\d{1,2}:\d{2}$/
        .test(t)
      );

    const uniqueTimes =
      [...new Set(times)];


    return {
      row,
      name,
      times: uniqueTimes,
      text
    };
  }


  function getTaskRows() {

    return [
      ...document.querySelectorAll(
        '.MuiStack-root.my-csffzd'
      )
    ]
    .map(parseRow)
    .filter(x =>
      x &&
      x.name &&
      !x.name.startsWith('Main') &&
      !x.name.includes('カレンダービュー') &&
      !x.name.includes('終了予定')
    );
  }


  /* =========================
     予定時刻
  ========================= */

  function getSchedule(task, mode) {

    if (
      !task ||
      !task.times.length
    )
      return '--:--';


    /*
      過去タスク：
      最初の予定時刻

      現在タスク：
      最初の時刻

      未来タスク：
      最後の時刻
    */

    if (
      mode === 'next'
    )
      return (
        task.times[
          task.times.length - 1
        ] || '--:--'
      );

    return (
      task.times[0] ||
      '--:--'
    );
  }


  /* =========================
     退勤
  ========================= */

  function getLeaveTime(tasks) {

    const leave =
      tasks.find(
        t =>
          t.name === '退勤'
      );

    if (!leave)
      return null;

    return (
      leave.times[
        leave.times.length - 1
      ] ||
      null
    );
  }


  /* =========================
     描画
  ========================= */

  function renderRows(
    currentName
  ) {

    const tasks =
      getTaskRows();


    /*
      現在タスク位置
    */

    let currentIndex =
      tasks.findIndex(
        t =>
          t.name === currentName
      );


    if (currentIndex < 0) {

      $('tcPrevious')
        .innerHTML = '';

      $('tcNext')
        .innerHTML = '';

      return {
        tasks,
        current: null
      };
    }


    const current =
      tasks[currentIndex];

    const previous =
      tasks[currentIndex - 1];


    /*
      NOW予定時刻
    */

    $('tcPlanned')
      .textContent =
        getSchedule(
          current,
          'current'
        );


    /*
      PREVIOUS
    */

    if (previous) {

      $('tcPrevious')
        .innerHTML = `
          <div class="rowTime">
            ${getSchedule(
              previous,
              'previous'
            )}
          </div>

          <div class="rowTask">
            ${previous.name}
          </div>
        `;

    } else {

      $('tcPrevious')
        .innerHTML = '';
    }


    /*
      NEXT 最大4件
    */

    const next =
      tasks.slice(
        currentIndex + 1,
        currentIndex + 5
      );


    $('tcNext')
      .innerHTML =
        next.map(t => `
          <div class="nextRow">

            <div class="rowTime">
              ${getSchedule(
                t,
                'next'
              )}
            </div>

            <div class="rowTask">
              ${t.name}
            </div>

          </div>
        `).join('');


    return {
      tasks,
      current
    };
  }


  /* =========================
     更新
  ========================= */

  function update() {

    const now =
      new Date();


    /*
      現在時刻
    */

    $('tcClock')
      .textContent =
        hhmm(now);


    /*
      現在タスク
    */

    const elapsedEl =
      getElapsedElement();

    const currentTask =
      getCurrentTask(
        elapsedEl
      );


    $('tcTask')
      .textContent =
        currentTask ||
        'タスクを取得できません';


    $('tcElapsed')
      .textContent =
        elapsedEl
          ? elapsedEl.textContent.trim()
          : '--:--:--';


    /*
      PREVIOUS / NEXT
    */

    const result =
      renderRows(
        currentTask
      );


    /*
      退勤
    */

    const leaveTime =
      getLeaveTime(
        result.tasks
      );


    if (!leaveTime) {

      $('tcLeave')
        .textContent =
          '退勤 --:--';

      $('tcRemain')
        .textContent =
          'あと --:--';

      return;
    }


    $('tcLeave')
      .textContent =
        '退勤 ' +
        leaveTime;


    const [h,m] =
      leaveTime
      .split(':')
      .map(Number);


    const leave =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        h,
        m,
        0
      );


    let diff =
      Math.floor(
        (leave - now) /
        1000
      );


    if (diff >= 0) {

      const hh =
        Math.floor(
          diff / 3600
        );

      const mm =
        Math.floor(
          (diff % 3600) /
          60
        );


      $('tcRemain')
        .textContent =
          'あと ' +
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
          (diff % 3600) /
          60
        );

      const ss =
        diff % 60;


      $('tcRemain')
        .textContent =
          '超過 ' +
          pad(hh) +
          ':' +
          pad(mm) +
          ':' +
          pad(ss);
    }
  }


  update();

  window.tcNowTimer =
    setInterval(
      update,
      1000
    );

})();
