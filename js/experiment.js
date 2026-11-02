'use strict';
// ─────────────────────────────────────────────
// experiment.js — 과학실 실험 (언더테일의 전투 자리)
// 적 = 누군가의 '주장', 적 HP = 신뢰도. [관찰][실험][단서]로 신뢰도를 깎고, 바닥나면 [반박].
// 내 차례가 끝나면 주장이 반격한다 — 상자 안으로 날아오는 실험 도구(비커·불·독·시험관)를 피한다 (집중력이 0이면 처음부터 다시).
// 주장의 대사·단서 반응은 story.js 의 EXPERIMENTS, 실험 미니게임은 아래 MINIGAMES.
// Experiment.start(data) 는 반박에 성공하면 true 로 끝나는 Promise.
// ─────────────────────────────────────────────

const EX_BUTTONS = ['관찰', '실험', '단서', '반박'];
const MAX_FOCUS = 20;
const HIT_DAMAGE = 4;
const DODGE_TIME = 5;          // 반격 한 번의 길이(초)
const SOUL_SPEED = 70;         // px/초
const BOX_EASE = 12;
// 가운데 상자 크기: 평소(글) / 실험 / 피하기
const BOX_NORMAL = { x: 16, y: 104, w: 288, h: 70 };
const BOX_MINI = { x: 16, y: 26, w: 288, h: 148 };
const BOX_DODGE = { x: 110, y: 100, w: 100, h: 74 };
const BORDER = 3;
const WORD_FONT = '10px Galmuri9';

// ── 반격: 날아오는 실험 도구 ──
// art: 작은 픽셀 그림, every: 나오는 간격(초), hit: 그림 안쪽으로 줄인 충돌 여백(px)
const ATTACKS = (() => {
  const make = (w, h, draw) => {
    const c = makeCanvas(w, h);
    draw(c.getContext('2d'));
    return c;
  };
  const GLASS = '#d8e4ea';
  return {
    // 비커: 위에서 쏟아진다
    beaker: {
      every: 0.42, hit: 1,
      art: make(9, 10, g => {
        rect(g, 0, 0, 9, 1, '#f4f8fa');
        rect(g, 1, 1, 1, 9, GLASS);
        rect(g, 7, 1, 1, 9, GLASS);
        rect(g, 1, 9, 7, 1, GLASS);
        rect(g, 2, 5, 5, 4, '#6fc3ff');
        rect(g, 2, 5, 5, 1, '#a8dcff');
        rect(g, 3, 2, 1, 2, '#ffffff');
      }),
      spawn: (W, H, sp) => ({ x: Math.random() * (W - 9), y: -10, vx: (Math.random() - 0.5) * 16, vy: sp }),
    },
    // 불: 바닥에서 불씨가 깜빡이다가 위로 솟는다
    flame: {
      every: 0.5, hit: 2, warn: 0.6,
      art: [0, 1].map(f => make(7, 10, g => {
        rect(g, 2, f, 3, 2, '#ff8a2a');
        rect(g, 1, 2, 5, 3, '#ff8a2a');
        rect(g, 0, 4, 7, 5, '#ff5a1a');
        rect(g, 1, 9, 5, 1, '#ff5a1a');
        rect(g, 2, 4 + f, 3, 4 - f, '#ffe066');
        rect(g, 3, 7, 1, 2, '#fff4c0');
      })),
      spawn: (W, H, sp) => ({ x: Math.random() * (W - 7), y: H - 10, vx: 0, vy: -(sp + 60), warn: 0.6 }),
    },
    // 독: 양옆에서 포물선으로 던져진다
    poison: {
      every: 0.7, hit: 1,
      art: make(9, 11, g => {
        rect(g, 3, 0, 3, 2, '#8a5a30');
        rect(g, 3, 2, 3, 2, GLASS);
        rect(g, 1, 4, 7, 1, GLASS);
        rect(g, 0, 5, 9, 5, GLASS);
        rect(g, 1, 10, 7, 1, GLASS);
        rect(g, 1, 5, 7, 5, '#7ad04a');
        rect(g, 3, 6, 3, 3, '#f4f4f4');                  // 해골
        rect(g, 3, 7, 1, 1, '#2a4a1a');
        rect(g, 5, 7, 1, 1, '#2a4a1a');
        rect(g, 4, 9, 1, 1, '#f4f4f4');
      }),
      spawn: (W, H, sp) => {
        const left = Math.random() < 0.5;
        return { x: left ? -9 : W, y: H * (0.3 + Math.random() * 0.4), vx: (left ? 1 : -1) * (sp + 15), vy: -55, ay: 95 };
      },
    },
    // 시험관: 왼쪽 위에서 비스듬히 쏟아진다
    tube: {
      every: 0.32, hit: 2,
      art: make(8, 8, g => {
        for (let i = 0; i < 7; i++) rect(g, i, i, 2, 1, GLASS);
        for (let i = 4; i < 7; i++) rect(g, i, i, 2, 1, '#e4a2c0');
        rect(g, 6, 7, 2, 1, '#e4a2c0');
      }),
      spawn: (W, H, sp) => ({ x: Math.random() * W * 0.8 - 20, y: -8, vx: sp * 0.6, vy: sp }),
    },
  };
})();

// ── 실험 미니게임 ──
// init() → 상태, update(m, dt) → 끝나면 { dmg, pages, solved }, draw(g, m, ox, oy, t)
const MINIGAMES = {
  // 연소 실험: 열원을 놓고 불을 붙여서, 벽에 남은 V자 그을음과 겹치는 자리를 찾는다
  combustion: (() => {
    const W = 282, H = 142, FLOOR = 128;
    const TABLE = { x0: 34, x1: 104, top: 92 };
    const OUTLET = { x: 194, y: 112 };
    const APEX = { x: 198, y: 124 };            // 실제 발화점 (콘센트 앞 바닥)
    const SLOPE = 0.45;                         // V자가 벌어지는 정도 (tan 24°)
    const KEEP = 66;                            // 이 높이(y)보다 아래는 닦여서 안 보인다
    const BURN_TIME = 1.6;
    const SUCCESS_DIST = 12;

    const heightAt = (x, raised) => (raised && x >= TABLE.x0 && x <= TABLE.x1 ? TABLE.top - 2 : FLOOR - 2);

    function sootRows(g, ox, oy, sx, sy, top, alpha) {
      for (let y = Math.floor(sy); y >= top; y--) {
        const half = 3 + (sy - y) * SLOPE;
        const n = hash(Math.floor(sx), y, 3);
        g.fillStyle = `rgba(30,20,20,${alpha * (0.7 + n * 0.3)})`;
        g.fillRect(Math.round(ox + sx - half), oy + y, Math.round(half * 2), 1);
      }
    }

    return {
      init: () => ({ x: 140, raised: false, phase: 'aim', t: 0, result: null }),

      update(m, dt) {
        if (m.phase === 'aim') {
          const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
          m.x = Math.max(8, Math.min(W - 8, m.x + dx * 90 * dt));
          if (tapped.has('up') && m.x >= TABLE.x0 && m.x <= TABLE.x1) m.raised = true;
          if (tapped.has('down')) m.raised = false;
          if (m.x < TABLE.x0 || m.x > TABLE.x1) m.raised = false;
          if (tapped.has('interact')) {
            m.phase = 'burn';
            m.t = 0;
            m.sy = heightAt(m.x, m.raised);
            Sound.sfx('fire');
          }
          return null;
        }
        m.t += dt;
        if (m.phase === 'burn' && m.t >= BURN_TIME) {
          m.phase = 'show';
          m.t = 0;
          const dist = Math.hypot(m.x - APEX.x, m.sy - APEX.y);
          m.match = Math.max(2, Math.min(99, Math.round(100 - dist * 0.75)));
          m.ok = dist <= SUCCESS_DIST;
          Sound.sfx(m.ok ? 'good' : 'bad');
        }
        if (m.phase === 'show' && m.t >= 1.4) return judge(m);
        return null;
      },

      draw(g, m, ox, oy, t) {
        // 준비실 벽 (옆에서 본 모습)
        rect(g, ox, oy, W, FLOOR, '#c9cfd3');
        for (let x = 0; x < W; x += 24) rect(g, ox + x, oy, 1, FLOOR, '#b6bdc2');
        for (let y = 20; y < FLOOR; y += 24) rect(g, ox, oy + y, W, 1, '#b6bdc2');
        rect(g, ox, oy + FLOOR, W, H - FLOOR, '#7a6a58');
        rect(g, ox, oy + FLOOR, W, 1, '#5a4c3e');
        // 선반, 시계
        rect(g, ox + 236, oy + 26, 38, 3, '#8a7457');
        for (let i = 0; i < 5; i++) rect(g, ox + 240 + i * 7, oy + 15 + (i % 2) * 3, 4, 11 - (i % 2) * 3, ['#8fd3c9', '#e4a2c0', '#a4adb5'][i % 3]);
        ring(g, ox + 40, oy + 26, 7, '#3a3a44');
        rect(g, ox + 40, oy + 21, 1, 5, '#1a1a1a');

        // 남아 있는 그을음 (위쪽만 — 아래는 닦여서 안 보인다)
        const keepTop = 8;
        for (let y = keepTop; y < KEEP; y++) {
          const half = 3 + (APEX.y - y) * SLOPE;
          const fade = 1 - (y - keepTop) / (KEEP - keepTop) * 0.6;
          for (const side of [-1, 1]) {
            const ex = Math.round(ox + APEX.x + side * half);
            if (hash(ex, y, 9) < 0.85) rect(g, side < 0 ? ex : ex - 2, oy + y, 2, 1, `rgba(40,28,28,${0.55 * fade})`);
          }
          if (y % 2 === 0) {
            g.fillStyle = `rgba(40,28,28,${0.08 * fade})`;
            g.fillRect(Math.round(ox + APEX.x - half), oy + y, Math.round(half * 2), 1);
          }
        }
        // 닦아낸 자국
        for (let i = 0; i < 6; i++) rect(g, ox + 150 + i * 16, oy + KEEP + 4 + (i % 3) * 9, 10, 1, '#d6dbde');

        // 콘센트
        rect(g, ox + OUTLET.x, oy + OUTLET.y, 8, 8, '#e8e4da');
        rect(g, ox + OUTLET.x, oy + OUTLET.y, 8, 1, '#b8b4aa');
        rect(g, ox + OUTLET.x + 2, oy + OUTLET.y + 3, 1, 2, '#3a3a3a');
        rect(g, ox + OUTLET.x + 5, oy + OUTLET.y + 3, 1, 2, '#3a3a3a');

        // 작업대 + 알코올램프
        rect(g, ox + TABLE.x0, oy + TABLE.top, TABLE.x1 - TABLE.x0, 4, '#8f6236');
        rect(g, ox + TABLE.x0, oy + TABLE.top, TABLE.x1 - TABLE.x0, 1, '#b98a55');
        rect(g, ox + TABLE.x0 + 3, oy + TABLE.top + 4, 3, FLOOR - TABLE.top - 4, '#6a4a2a');
        rect(g, ox + TABLE.x1 - 6, oy + TABLE.top + 4, 3, FLOOR - TABLE.top - 4, '#6a4a2a');
        rect(g, ox + 62, oy + TABLE.top - 7, 8, 7, '#bfe3ef');
        rect(g, ox + 62, oy + TABLE.top - 3, 8, 3, '#7fb8d8');
        rect(g, ox + 65, oy + TABLE.top - 9, 2, 2, '#8a8f98');

        // 내가 만든 그을음
        if (m.phase !== 'aim') {
          const p = m.phase === 'burn' ? Math.min(1, m.t / BURN_TIME) : 1;
          const top = Math.max(2, Math.round(m.sy - p * (m.sy - 2)));
          sootRows(g, ox, oy, m.x, m.sy, top, 0.35);
          if (m.phase === 'burn') {
            // 불꽃
            const fh = 6 + Math.round(Math.sin(t * 30) * 2);
            rect(g, ox + m.x - 3, oy + m.sy - fh, 6, fh, '#ff8a2a');
            rect(g, ox + m.x - 1, oy + m.sy - fh + 3, 2, fh - 3, '#ffe066');
          }
        }

        // 열원 표시
        const sy = m.phase === 'aim' ? heightAt(m.x, m.raised) : m.sy;
        if (m.phase === 'aim') {
          const blink = Math.floor(t * 4) % 2 === 0;
          rect(g, ox + m.x - 4, oy + sy - 4, 8, 6, blink ? '#ff4a4a' : '#d03a3a');
          rect(g, ox + m.x - 2, oy + sy - 2, 4, 2, '#ffd0a0');
          // 위로 올라갈 수 있으면 화살표
          if (!m.raised && m.x >= TABLE.x0 && m.x <= TABLE.x1) {
            rect(g, ox + m.x, oy + sy - 12, 1, 5, '#ffe066');
            rect(g, ox + m.x - 1, oy + sy - 11, 3, 1, '#ffe066');
          }
        }

        if (m.phase === 'show') {
          rect(g, ox + 80, oy + 4, 122, 18, '#000');
          g.font = WORD_FONT;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = m.ok ? '#ffe066' : '#ffffff';
          g.fillText(`일치율 ${m.match}%`, ox + 141, oy + 13);
          g.textAlign = 'left';
        }
      },
    };

    function judge(m) {
      if (m.ok) {
        return {
          dmg: 60, solved: true,
          pages: [
            '불길이 번지며 벽에 V자를 그린다…',
            `남아 있던 그을음과 정확히 겹친다! 일치율 ${m.match}%`,
            { who: ME, text: '꼭짓점은 작업대 위가 아니야. 바닥… 콘센트 바로 앞이야.' },
            '주장의 신뢰도가 크게 흔들렸다!',
          ],
        };
      }
      const onTable = m.sy < FLOOR - 10;
      if (onTable) {
        const first = !m.tableTried;
        return {
          dmg: 10, once: 'table',
          pages: [
            '알코올램프가 있던 작업대 위에서 불을 붙였다.',
            `그을음이 훨씬 높은 데서부터 퍼진다. 일치율 ${m.match}%`,
            first ? '…램프 자리에서는 이런 모양이 나오지 않는다.' : '역시 램프 자리는 아니다.',
          ],
        };
      }
      const hint = m.x < APEX.x ? '선을 아래로 이어 보면… 꼭짓점은 조금 더 오른쪽이다.' : '선을 아래로 이어 보면… 꼭짓점은 조금 더 왼쪽이다.';
      return { dmg: 0, pages: [`남은 자국과 어긋난다. 일치율 ${m.match}%`, hint] };
    }
  })(),
};

const Experiment = (() => {
  const el = document.getElementById('experiment');
  const claimEl = el.querySelector('.ex-claim');
  const bubble = el.querySelector('.ex-bubble');
  const textEl = el.querySelector('.ex-text');
  const statsEl = el.querySelector('.ex-stats');
  const focusBar = el.querySelector('.ex-focus .bar i');
  const focusNum = el.querySelector('.ex-focus .num');
  const credBar = el.querySelector('.ex-cred .bar i');
  const buttons = [...el.querySelectorAll('.ex-buttons span')];
  const help = el.querySelector('.ex-help');

  let st = null, resolve = null;

  function fresh(data) {
    return {
      data, cred: 100, credShown: 100, focus: MAX_FOCUS,
      mode: 'text', menu: 0, clueIndex: 0, turn: 0, observed: 0,
      knowsTarget: false, solved: false, used: new Set(), once: new Set(),
      pages: [], page: 0, shown: 0, after: null,
      box: { ...BOX_NORMAL }, boxTo: BOX_NORMAL,
      shake: 0, flash: 0, shakeBox: 0, mini: null, dodge: null,
    };
  }

  function start(data) {
    st = fresh(data);
    document.fonts.load(WORD_FONT, '일치율 0123456789%');   // 캔버스 글자용 픽셀 폰트를 미리 불러온다
    el.classList.add('open');
    hint.classList.add('hide');   // 조작 안내가 실험 화면 아래 글자와 겹치지 않게
    banner.classList.remove('show');
    claimEl.innerHTML = '';
    claimEl.append(data.claim, Object.assign(document.createElement('small'), { textContent: data.source }));
    say(data.intro, toMenu);
    return new Promise(r => { resolve = r; });
  }

  function finish(won) {
    st = null;
    el.classList.remove('open');
    const r = resolve;
    resolve = null;
    if (r) r(won);
  }

  // ── 흐름 ──
  function say(pages, after) {
    st.mode = 'text';
    st.pages = pages;
    st.page = 0;
    st.shown = 0;
    st.after = after;
    st.boxTo = BOX_NORMAL;
  }
  function toMenu() {
    st.mode = 'menu';
    st.boxTo = BOX_NORMAL;
  }

  // 신뢰도를 깎고(또는 올리고) 대사 → 다 깎였으면 반박 안내, 아니면 반격
  function hit(dmg, pages) {
    if (dmg > 0) {
      st.shake = 0.4;
      st.flash = 0.4;
      Sound.sfx('hit');
    }
    st.cred = Math.max(0, Math.min(100, st.cred - dmg));
    say(pages, () => (st.cred <= 0 ? say(st.data.broken, toMenu) : enemyTurn()));
  }

  function pick(i) {
    const d = st.data;
    Sound.sfx('select');
    if (i === 0) {                                     // 관찰
      const lines = d.observe[Math.min(st.observed++, d.observe.length - 1)];
      say(lines, enemyTurn);
    } else if (i === 1) {                              // 실험
      if (st.solved) say(d.expDone, toMenu);
      else if (!st.knowsTarget) say(d.noTarget, toMenu);
      else {
        st.mode = 'mini';
        st.mini = MINIGAMES[d.mini].init();
        st.mini.tableTried = st.once.has('table');
        st.boxTo = BOX_MINI;
      }
    } else if (i === 2) {                              // 단서
      if (!foundClues().length) say(['수첩이 비어 있다.'], toMenu);
      else {
        st.mode = 'clues';
        st.clueIndex = Math.min(st.clueIndex, foundClues().length - 1);
      }
    } else {                                           // 반박
      if (st.cred > 0) say(d.notYet, toMenu);
      else say(d.win, () => finish(true));
    }
  }

  const foundClues = () => CLUES.filter(c => c.found);

  function presentClue(c) {
    const d = st.data, r = d.clues[c.name];
    if (st.used.has(c.name)) return say(['이미 제시한 단서다.'], toMenu);
    st.used.add(c.name);
    if (!r) return hit(0, d.wrongClue(c.name));
    if (r.unlock) st.knowsTarget = true;
    hit(r.dmg, r.text);
  }

  // ── 반격: 상자 안으로 날아오는 실험 도구 피하기 ──
  function enemyTurn() {
    const d = st.data;
    st.mode = 'dodge';
    st.boxTo = BOX_DODGE;
    const taunts = st.cred <= 40 ? d.tauntsWeak : d.taunts;
    st.dodge = {
      t: 0, spawn: 0.6, attack: ATTACKS[d.attacks[st.turn % d.attacks.length]], bullets: [],
      x: BOX_DODGE.w / 2, y: BOX_DODGE.h / 2, inv: 0,
      taunt: taunts[st.turn % taunts.length],
    };
    st.turn++;
  }

  function spawnBullet(dg) {
    const a = dg.attack, art = Array.isArray(a.art) ? a.art[0] : a.art;
    const W = BOX_DODGE.w - BORDER * 2, H = BOX_DODGE.h - BORDER * 2;
    const speed = 34 + Math.min(st.turn, 6) * 4;
    dg.bullets.push({ ay: 0, warn: 0, ...a.spawn(W, H, speed), w: art.width, h: art.height, a });
  }

  function updateDodge(dt) {
    const dg = st.dodge;
    dg.t += dt;
    dg.inv = Math.max(0, dg.inv - dt);
    const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    const dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    const W = BOX_DODGE.w - BORDER * 2, H = BOX_DODGE.h - BORDER * 2;
    dg.x = Math.max(4, Math.min(W - 4, dg.x + dx * SOUL_SPEED * dt));
    dg.y = Math.max(4, Math.min(H - 4, dg.y + dy * SOUL_SPEED * dt));

    if (dg.t < DODGE_TIME - 1 && (dg.spawn -= dt) <= 0) {
      spawnBullet(dg);
      dg.spawn = Math.max(dg.attack.every * 0.6, dg.attack.every - st.turn * 0.02);
    }
    for (const b of dg.bullets) {
      if (b.warn > 0) {           // 불씨: 깜빡이는 동안은 안 움직이고 안 맞는다
        b.warn -= dt;
        continue;
      }
      b.vy += b.ay * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const m = b.a.hit;
      const hitIt = dg.inv <= 0 && dg.x + 3 > b.x + m && dg.x - 3 < b.x + b.w - m && dg.y + 3 > b.y + m && dg.y - 3 < b.y + b.h - m;
      if (hitIt) {
        dg.inv = 0.9;
        st.focus = Math.max(0, st.focus - HIT_DAMAGE);
        st.shakeBox = 0.25;
        Sound.sfx('hurt');
      }
    }
    dg.bullets = dg.bullets.filter(b => b.x > -60 && b.x < W + 60 && b.y < H + 20 && b.y > -30);

    if (st.focus <= 0) {
      const data = st.data;
      st.dodge = null;
      say(['생각이 엉켜 버렸다…', '심호흡을 하고, 처음부터 다시 정리하자.'], () => {
        st = fresh(data);
        say(data.intro, toMenu);
      });
    } else if (dg.t >= DODGE_TIME) {
      st.dodge = null;
      toMenu();
    }
  }

  // ── 업데이트 ──
  function update(dt) {
    // 상자 크기는 부드럽게 바뀐다
    const k = 1 - Math.exp(-dt * BOX_EASE);
    let moving = false;
    for (const p of ['x', 'y', 'w', 'h']) {
      st.box[p] += (st.boxTo[p] - st.box[p]) * k;
      if (Math.abs(st.boxTo[p] - st.box[p]) < 0.5) st.box[p] = st.boxTo[p];
      else moving = true;
    }
    st.shake = Math.max(0, st.shake - dt);
    st.flash = Math.max(0, st.flash - dt);
    st.shakeBox = Math.max(0, st.shakeBox - dt);
    st.credShown += (st.cred - st.credShown) * (1 - Math.exp(-dt * 5));

    if (st.mode === 'text') {
      const text = pageText(st.pages[st.page]);
      if (tapped.has('interact')) {
        if (st.shown < text.length) st.shown = text.length;
        else if (st.page < st.pages.length - 1) {
          st.page++;
          st.shown = 0;
        } else {
          st.after();
          return;
        }
      }
      const before = Math.floor(st.shown);
      st.shown = Math.min(text.length, st.shown + dt * TYPE_SPEED * (dev.fastText ? 6 : 1));
      const after = Math.floor(st.shown);
      if (after > before && text[after - 1].trim()) Sound.blip();
    } else if (st.mode === 'menu') {
      const d = (tapped.has('right') ? 1 : 0) - (tapped.has('left') ? 1 : 0);
      if (d) {
        st.menu = (st.menu + d + 4) % 4;
        Sound.sfx('move');
      }
      if (tapped.has('interact')) pick(st.menu);
    } else if (st.mode === 'clues') {
      const list = foundClues();
      const d = (tapped.has('down') ? 1 : 0) - (tapped.has('up') ? 1 : 0);
      if (d) {
        st.clueIndex = (st.clueIndex + d + list.length) % list.length;
        Sound.sfx('move');
      }
      if (tapped.has('menu')) toMenu();
      else if (tapped.has('interact')) {
        Sound.sfx('select');
        presentClue(list[st.clueIndex]);
      }
    } else if (st.mode === 'mini' && !moving) {
      const res = MINIGAMES[st.data.mini].update(st.mini, dt);
      if (res) {
        if (res.once) {
          if (st.once.has(res.once)) res.dmg = 0;
          st.once.add(res.once);
        }
        if (res.solved) st.solved = true;
        st.mini = null;
        hit(res.dmg, res.pages);
      }
    } else if (st.mode === 'dodge' && !moving) {
      updateDodge(dt);
    }
    render();
  }

  // ── 글자 (HTML) ──
  function setText(node, s) { if (node.textContent !== s) node.textContent = s; }

  function render() {
    const b = st.box;
    textEl.style.setProperty('--bx', b.x);
    textEl.style.setProperty('--by', b.y);
    textEl.style.setProperty('--bw', b.w);
    textEl.style.setProperty('--bh', b.h);

    if (st.mode === 'text') {
      const p = st.pages[st.page];
      const who = typeof p === 'string' ? '' : p.who;
      const shown = pageText(p).slice(0, Math.floor(st.shown));
      textEl.innerHTML = '';
      if (who) textEl.append(Object.assign(document.createElement('b'), { textContent: who }));
      textEl.append((who ? '' : '* ') + shown);
    } else if (st.mode === 'clues') {
      const list = foundClues();
      const top = Math.max(0, Math.min(st.clueIndex - 1, list.length - 4));
      textEl.innerHTML = '';
      textEl.append(Object.assign(document.createElement('b'), { textContent: '어떤 단서를 제시할까?' }));
      list.slice(top, top + 4).forEach((c, i) => {
        const sel = top + i === st.clueIndex;
        const line = Object.assign(document.createElement('div'), { textContent: (sel ? '▶ ' : '   ') + c.name + (st.used.has(c.name) ? ' (제시함)' : '') });
        if (sel) line.className = 'sel';
        textEl.append(line);
      });
    } else if (st.mode === 'menu') {
      setText(textEl, '* 어떻게 할까?');
    } else {
      setText(textEl, '');
    }

    focusBar.style.width = (st.focus / MAX_FOCUS * 100) + '%';
    setText(focusNum, `${st.focus} / ${MAX_FOCUS}`);
    credBar.style.width = st.credShown + '%';
    statsEl.classList.toggle('low', st.cred <= 0);

    buttons.forEach((btn, i) => {
      btn.classList.toggle('sel', st.mode === 'menu' && i === st.menu);
      btn.classList.toggle('ready', i === 3 && st.cred <= 0);
    });

    const dodgeTaunt = st.mode === 'dodge' && st.dodge && st.dodge.t < 2.2;
    bubble.classList.toggle('show', !!dodgeTaunt);
    if (dodgeTaunt) setText(bubble, st.dodge.taunt);

    setText(help, {
      text: 'F : 넘기기',
      menu: 'A/D : 고르기  ·  F : 선택',
      clues: 'W/S : 고르기  ·  F : 제시  ·  Esc : 뒤로',
      mini: `${st.data.title} — A/D : 이동  ·  W/S : 높이  ·  F : 불 붙이기`,
      dodge: 'WASD : 피하기',
    }[st.mode]);
  }

  // ── 그림 (캔버스) ──
  function draw(g, t) {
    rect(g, 0, 0, VIEW_W, VIEW_H, '#000');
    const b = st.box;
    if (b.y > 80) drawClaimSprite(g, t);

    const sx = st.shakeBox > 0 ? Math.round(Math.sin(t * 90) * 2) : 0;
    const x = Math.round(b.x) + sx, y = Math.round(b.y), w = Math.round(b.w), h = Math.round(b.h);
    rect(g, x, y, w, h, '#fff');
    rect(g, x + BORDER, y + BORDER, w - BORDER * 2, h - BORDER * 2, '#000');

    const settled = b.w === st.boxTo.w && b.h === st.boxTo.h;
    if (st.mode === 'mini' && st.mini && settled) {
      MINIGAMES[st.data.mini].draw(g, st.mini, x + BORDER, y + BORDER, t);
    } else if (st.mode === 'dodge' && st.dodge && settled) {
      const dg = st.dodge, ox = x + BORDER, oy = y + BORDER;
      g.save();
      g.beginPath();
      g.rect(ox, oy, w - BORDER * 2, h - BORDER * 2);
      g.clip();
      for (const bl of dg.bullets) {
        const bx = Math.round(ox + bl.x), by = Math.round(oy + bl.y);
        if (bl.warn > 0) {
          // 솟기 전 불씨
          if (Math.floor(t * 12) % 2 === 0) rect(g, bx + 2, by + 7, 3, 3, '#ff8a2a');
          continue;
        }
        const art = Array.isArray(bl.a.art) ? bl.a.art[Math.floor(t * 10) % bl.a.art.length] : bl.a.art;
        g.drawImage(art, bx, by);
      }
      g.restore();
      if (dg.inv <= 0 || Math.floor(t * 16) % 2 === 0) drawSoul(g, Math.round(ox + dg.x), Math.round(oy + dg.y));
    }
  }

  // 플레이어: 작은 빨간 플라스크
  function drawSoul(g, cx, cy) {
    rect(g, cx - 1, cy - 4, 3, 3, '#ff4a4a');
    rect(g, cx - 2, cy - 4, 5, 1, '#ff8a8a');
    rect(g, cx - 3, cy - 1, 7, 3, '#ff4a4a');
    rect(g, cx - 4, cy + 1, 9, 3, '#ff4a4a');
    rect(g, cx - 2, cy + 1, 2, 1, '#ffb0b0');
  }

  // 주장을 하는 사람: 기억 속 1986년의 이도현 (교복, 오른손에 불 붙은 알코올램프). 2배 크기
  const MEMORY_PAL = {
    hair: '#2a2632', hairHi: '#423c50', skin: '#e6cfb8', skinSh: '#c9ab90', eye: '#1a1a22',
    coat: '#4a5070', coatHi: '#5e6688', coatDk: '#3a3f5a', collar: '#eef0f4', button: '#d9b43a',
    pants: '#353a52', shoe: '#15151c',
  };
  function drawClaimSprite(g, t) {
    const S = 2, P = MEMORY_PAL;
    const ox = 160 - 13 * S + (st.shake > 0 ? Math.round(Math.sin(t * 80) * 3) : 0);
    const oy = 26 + Math.round(Math.sin(t * 2));
    const white = st.flash > 0 && Math.floor(t * 20) % 2 === 0;
    const R = (x, y, w, h, c) => rect(g, ox + x * S, oy + y * S, w * S, h * S, white ? '#fff' : c);

    // 램프 불빛
    const fh = 3 + (Math.floor(t * 8) % 2);
    g.fillStyle = 'rgba(255,150,60,0.10)';
    g.beginPath();
    g.arc(ox + 24 * S, oy + 9 * S, 22 + Math.sin(t * 9) * 2, 0, Math.PI * 2);
    g.fill();

    // 다리
    R(8, 29, 4, 7, P.pants);
    R(14, 29, 4, 7, P.pants);
    R(7, 36, 5, 2, P.shoe);
    R(14, 36, 5, 2, P.shoe);
    // 몸 (교복)
    R(6, 14, 14, 15, P.coat);
    R(6, 14, 14, 1, P.coatHi);
    R(18, 15, 2, 14, P.coatDk);
    R(10, 14, 6, 2, P.collar);
    R(12, 16, 2, 1, P.collar);
    for (const by of [18, 21, 24, 27]) R(12, by, 1, 1, P.button);
    R(15, 17, 3, 1, '#f4f4f4');                 // 이름표
    // 왼팔 (늘어뜨림)
    R(4, 15, 2, 11, P.coatDk);
    R(4, 26, 2, 2, P.skin);
    // 오른팔: 램프를 앞으로 치켜든다
    R(20, 15, 2, 6, P.coatDk);
    R(20, 20, 5, 2, P.coatDk);
    R(23, 18, 3, 3, P.skin);
    // 알코올램프
    R(22, 12, 5, 1, '#2a3a48');
    R(21, 13, 7, 5, '#2a3a48');
    R(22, 13, 5, 4, '#bfe3ef');
    R(22, 15, 5, 2, '#7fb8d8');
    R(22, 13, 1, 2, '#ffffff');
    R(23, 10, 3, 2, '#8a8f98');
    R(24, 10 - fh, 1, fh, '#ff8a2a');
    R(23, 10 - fh + 1, 1, fh - 1, '#ff8a2a');
    R(25, 10 - fh + 1, 1, fh - 1, '#ff8a2a');
    R(24, 10 - fh + 1, 1, fh - 2, '#ffe066');

    // 머리
    R(7, 0, 12, 10, P.hair);
    R(9, 1, 5, 1, P.hairHi);
    R(8, 4, 10, 9, P.skin);
    R(8, 4, 4, 1, P.hair);
    R(14, 4, 4, 2, P.hair);
    R(7, 7, 1, 2, P.skin);
    R(18, 7, 1, 2, P.skin);
    R(8, 12, 10, 1, P.skinSh);
    R(11, 13, 4, 1, P.skinSh);

    // 얼굴: 신뢰도가 떨어지면 흔들리는 표정
    // 눈은 다른 인물 스프라이트처럼 세로로 긴 점 (1×2), 눈썹은 한 칸 띄운다
    const blink = Math.floor(t * 10) % 40 === 0;
    for (const ex of [10, 15]) {
      if (blink) R(ex, 9, 1, 1, P.eye);
      else R(ex, 8, 1, 2, P.eye);
    }
    if (st.cred <= 40) {
      // 흔들림: 눈썹 안쪽이 올라가고 입이 비뚤어진다
      R(9, 7, 2, 1, P.hair);
      R(11, 6, 1, 1, P.hair);
      R(16, 7, 2, 1, P.hair);
      R(15, 6, 1, 1, P.hair);
      R(11, 11, 2, 1, '#7a4a3a');
      R(13, 12, 2, 1, '#7a4a3a');
      R(19, 4 + (Math.floor(t * 3) % 2), 1, 2, '#6fc3ff');   // 식은땀
    } else {
      // 굳은 얼굴: 곧은 눈썹, 꾹 다문 입
      R(9, 6, 3, 1, P.hair);
      R(14, 6, 3, 1, P.hair);
      R(12, 11, 2, 1, '#7a4a3a');
    }
  }

  return {
    start,
    update,
    draw,
    abort() { if (st) finish(false); },
    get isOpen() { return st !== null; },
  };
})();
