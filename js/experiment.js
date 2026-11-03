'use strict';
// ─────────────────────────────────────────────
// experiment.js — 과학실 검증 ("실험 노트" 화면)
// 누군가의 '주장'을 [관찰] [단서 제시] [실험] [반박]으로 무너뜨린다.
//   주장의 신뢰도: 맞는 단서·성공한 실험이 깎는다. 0이 되면 [반박]으로 끝낸다.
//   빛찬의 정신력: 틀린 단서, 실패한 실험, 성급한 반박이 깎는다. 0이 되면 처음부터 다시 정리한다.
// 주장의 대사·단서 반응은 story.js 의 EXPERIMENTS, 실험 미니게임은 아래 MINIGAMES.
// Experiment.start(data) 는 반박에 성공하면 true 로 끝나는 Promise.
// ─────────────────────────────────────────────

const EX_ACTIONS = ['관찰', '단서 제시', '실험', '반박'];
const MAX_MIND = 5;
const WORD_FONT = '10px Galmuri9';

// 화면 배치 (게임 픽셀)
const EX = {
  portrait: { x: 10, y: 8, w: 48, h: 60 },
  card: { x: 64, y: 8, w: 248, h: 44 },
  cred: { x: 104, y: 57, w: 208, h: 7 },
  actions: { x: 8, y: 76, w: 76, h: 126 },
  panel: { x: 90, y: 76, w: 222, h: 126 },
  mini: { x: 16, y: 22, w: 288, h: 150 },   // 실험할 땐 위쪽을 다 쓴다
  mindY: 210,
};
const EX_COLORS = {
  bg: '#0e1420', grid: '#151f33', line: '#3d5278', panel: 'rgba(18,27,44,0.92)',
  accent: '#6fd3ff', select: '#20304c', paper: '#efe9dc', paperEdge: '#c9c0aa',
  credOn: '#6fd3ff', credOff: '#24324c', mind: '#ffb86a', mindOff: '#2a3448', warn: '#ff6a6a',
};

// ── 실험 미니게임 ──
// init() → 상태, update(m, dt) → 끝나면 { dmg, pages, solved?, once?, miss? }, draw(g, m, ox, oy, t)
//   miss: 실패한 시도 (정신력이 깎인다)
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

    function judge(m) {
      if (m.ok) {
        return {
          dmg: 50, solved: true,
          pages: [
            '불길이 번지며 벽에 V자를 그린다…',
            `남아 있던 그을음과 정확히 겹친다! 일치율 ${m.match}%`,
            { who: ME, text: '꼭짓점은 작업대 위가 아니야. 바닥… 콘센트 바로 앞이야.' },
            '주장의 신뢰도가 크게 흔들렸다!',
          ],
        };
      }
      if (m.sy < FLOOR - 10) {
        // 작업대(램프 자리): 처음 한 번은 "램프 자리가 아니다"는 걸 알게 되는 성과
        return {
          dmg: 10, once: 'table', miss: m.tableTried,
          pages: [
            '알코올램프가 있던 작업대 위에서 불을 붙였다.',
            `그을음이 훨씬 높은 데서부터 퍼진다. 일치율 ${m.match}%`,
            m.tableTried ? '역시 램프 자리는 아니다. …같은 걸 또 해 버렸다.' : '…램프 자리에서는 이런 모양이 나오지 않는다.',
          ],
        };
      }
      const hint = m.x < APEX.x ? '선을 아래로 이어 보면… 꼭짓점은 조금 더 오른쪽이다.' : '선을 아래로 이어 보면… 꼭짓점은 조금 더 왼쪽이다.';
      return { dmg: 0, miss: true, pages: [`남은 자국과 어긋난다. 일치율 ${m.match}%`, hint] };
    }

    return {
      init: () => ({ x: 140, raised: false, phase: 'aim', t: 0 }),

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
            const fh = 6 + Math.round(Math.sin(t * 30) * 2);
            rect(g, ox + m.x - 3, oy + m.sy - fh, 6, fh, '#ff8a2a');
            rect(g, ox + m.x - 1, oy + m.sy - fh + 3, 2, fh - 3, '#ffe066');
          }
        }

        // 열원 표시
        if (m.phase === 'aim') {
          const sy = heightAt(m.x, m.raised);
          const blink = Math.floor(t * 4) % 2 === 0;
          rect(g, ox + m.x - 4, oy + sy - 4, 8, 6, blink ? '#ff4a4a' : '#d03a3a');
          rect(g, ox + m.x - 2, oy + sy - 2, 4, 2, '#ffd0a0');
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
  })(),
};

const Experiment = (() => {
  const el = document.getElementById('experiment');
  const claimEl = el.querySelector('.ex-claim');
  const actionsEl = el.querySelector('.ex-actions');
  const textEl = el.querySelector('.ex-text');
  const help = el.querySelector('.ex-help');
  const actionItems = EX_ACTIONS.map(label => {
    const li = document.createElement('li');
    li.textContent = label;
    actionsEl.appendChild(li);
    return li;
  });

  // 모눈종이 배경은 한 번만 그려 둔다
  const backdrop = makeCanvas(320, 240);
  {
    const b = backdrop.getContext('2d');
    rect(b, 0, 0, 320, 240, EX_COLORS.bg);
    for (let x = 0; x < 320; x += 8) rect(b, x, 0, 1, 240, EX_COLORS.grid);
    for (let y = 0; y < 240; y += 8) rect(b, 0, y, 320, 1, EX_COLORS.grid);
  }

  let st = null, resolve = null, portrait = null;

  function fresh(data) {
    return {
      data, cred: 100, credShown: 100, mind: MAX_MIND,
      mode: 'text', menu: 0, clueIndex: 0, observed: 0, wrongs: 0,
      knowsTarget: false, solved: false, used: new Set(), once: new Set(),
      pages: [], page: 0, shown: 0, after: null,
      shake: 0, flash: 0, hurt: 0, mini: null,
    };
  }

  function start(data) {
    st = fresh(data);
    document.fonts.load(WORD_FONT, '일치율 0123456789%');   // 캔버스 글자용 픽셀 폰트를 미리 불러온다
    portrait = makePersonFrames(PEOPLE[data.portrait].pal, PEOPLE[data.portrait]).down[0];
    el.classList.add('open');
    hint.classList.add('hide');
    banner.classList.remove('show');
    claimEl.innerHTML = '';
    claimEl.append(Object.assign(document.createElement('span'), { textContent: data.claim }),
      Object.assign(document.createElement('small'), { textContent: data.source }));
    say(data.intro, toMenu);
    return new Promise(r => { resolve = r; });
  }

  function finish(won) {
    st = null;
    el.classList.remove('open', 'mini');
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
  }
  const toMenu = () => { st.mode = 'menu'; };

  // 주장의 한마디 (틀렸을 때 비웃거나, 흔들릴 때 버티는 말)
  function retort() {
    const d = st.data, lines = st.cred <= 40 ? d.tauntsWeak : d.taunts;
    return { who: d.speaker, text: lines[st.wrongs++ % lines.length] };
  }

  // 신뢰도를 깎는다 → 대사 → 0이면 반박 안내
  function hit(dmg, pages) {
    if (dmg > 0) {
      st.shake = 0.4;
      st.flash = 0.4;
      Sound.sfx('hit');
    }
    st.cred = Math.max(0, Math.min(100, st.cred - dmg));
    say(pages, () => (st.cred <= 0 ? say(st.data.broken, toMenu) : toMenu()));
  }

  // 틀렸다: 정신력이 깎인다 → 0이면 처음부터 다시
  function miss(pages) {
    st.mind = Math.max(0, st.mind - 1);
    st.hurt = 0.5;
    Sound.sfx('hurt');
    const data = st.data;
    say([...pages, retort()], () => {
      if (st.mind > 0) return toMenu();
      say(['머리가 지끈거린다. 생각이 엉켜 버렸다…', '심호흡을 하고, 처음부터 다시 정리하자.'], () => {
        st = fresh(data);
        say(data.intro, toMenu);
      });
    });
  }

  function pick(i) {
    const d = st.data;
    Sound.sfx('select');
    if (i === 0) {                                     // 관찰 (정신력이 들지 않는다)
      say(d.observe[Math.min(st.observed++, d.observe.length - 1)], toMenu);
    } else if (i === 1) {                              // 단서 제시
      if (!foundClues().length) return say(['수첩이 비어 있다.'], toMenu);
      st.mode = 'clues';
      st.clueIndex = Math.min(st.clueIndex, foundClues().length - 1);
    } else if (i === 2) {                              // 실험
      if (st.solved) say(d.expDone, toMenu);
      else if (!st.knowsTarget) say(d.noTarget, toMenu);
      else {
        st.mode = 'mini';
        st.mini = MINIGAMES[d.mini].init();
        st.mini.tableTried = st.once.has('table');
      }
    } else if (st.cred > 0) {                          // 반박 — 아직 이르다
      miss(d.notYet);
    } else {
      say(d.win, () => finish(true));
    }
  }

  const foundClues = () => CLUES.filter(c => c.found);

  function presentClue(c) {
    const d = st.data, r = d.clues[c.name];
    if (st.used.has(c.name)) return say(['이미 제시한 단서다.'], toMenu);
    st.used.add(c.name);
    if (!r) return miss(d.wrongClue(c.name));
    if (r.unlock) st.knowsTarget = true;
    if (r.dmg > 0) return hit(r.dmg, r.text);
    // 상관없거나 오히려 주장을 거드는 단서
    st.cred = Math.min(100, st.cred - r.dmg);
    miss(r.text);
  }

  // ── 업데이트 ──
  function update(dt) {
    st.shake = Math.max(0, st.shake - dt);
    st.flash = Math.max(0, st.flash - dt);
    st.hurt = Math.max(0, st.hurt - dt);
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
      const d = (tapped.has('down') ? 1 : 0) - (tapped.has('up') ? 1 : 0);
      if (d) {
        st.menu = (st.menu + d + EX_ACTIONS.length) % EX_ACTIONS.length;
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
    } else if (st.mode === 'mini') {
      const res = MINIGAMES[st.data.mini].update(st.mini, dt);
      if (res) {
        if (res.once) {
          if (st.once.has(res.once)) res.dmg = 0;
          st.once.add(res.once);
        }
        if (res.solved) st.solved = true;
        st.mini = null;
        if (res.miss) miss(res.pages);
        else hit(res.dmg, res.pages);
      }
    }
    render();
  }

  // ── 글자 (HTML) ──
  function setText(node, s) { if (node.textContent !== s) node.textContent = s; }

  function render() {
    el.classList.toggle('mini', st.mode === 'mini');
    actionItems.forEach((li, i) => {
      li.classList.toggle('sel', st.menu === i);
      li.classList.toggle('active', st.mode === 'menu');
      li.classList.toggle('ready', i === 3 && st.cred <= 0);
    });

    if (st.mode === 'text') {
      const p = st.pages[st.page];
      const who = typeof p === 'string' ? '' : p.who;
      textEl.innerHTML = '';
      if (who) textEl.append(Object.assign(document.createElement('b'), { textContent: who }));
      textEl.append(pageText(p).slice(0, Math.floor(st.shown)));
    } else if (st.mode === 'clues') {
      const list = foundClues();
      const top = Math.max(0, Math.min(st.clueIndex - 2, list.length - 6));
      textEl.innerHTML = '';
      textEl.append(Object.assign(document.createElement('b'), { textContent: '어떤 단서를 제시할까?' }));
      list.slice(top, top + 6).forEach((c, i) => {
        const sel = top + i === st.clueIndex;
        const line = Object.assign(document.createElement('div'), { textContent: (sel ? '▸ ' : '  ') + c.name });
        if (sel) line.className = 'sel';
        if (st.used.has(c.name)) line.classList.add('used');
        textEl.append(line);
      });
    } else if (st.mode === 'menu') {
      setText(textEl, ['주장을 자세히 살펴본다.', '수첩의 단서를 들이민다.', '과학실에서 직접 확인한다.', '주장을 정면으로 무너뜨린다.'][st.menu]);
    } else {
      setText(textEl, '');
    }

    setText(help, {
      text: 'F : 넘기기',
      menu: 'W/S : 고르기  ·  F : 선택',
      clues: 'W/S : 고르기  ·  F : 제시  ·  Esc : 뒤로',
      mini: `${st.data.title} — A/D : 이동  ·  W/S : 높이  ·  F : 불 붙이기`,
    }[st.mode]);
  }

  // ── 그림 (캔버스) ──
  // 얇은 테두리 패널 (모서리 1px 깎기)
  function panel(g, r, fill = EX_COLORS.panel) {
    rect(g, r.x + 1, r.y, r.w - 2, r.h, EX_COLORS.line);
    rect(g, r.x, r.y + 1, r.w, r.h - 2, EX_COLORS.line);
    rect(g, r.x + 1, r.y + 1, r.w - 2, r.h - 2, fill);
  }

  function draw(g, t) {
    g.drawImage(backdrop, 0, 0);

    if (st.mode === 'mini' && st.mini) {
      const M = EX.mini;
      panel(g, M, '#000');
      MINIGAMES[st.data.mini].draw(g, st.mini, M.x + 3, M.y + 3, t);
    } else {
      drawClaim(g, t);
      panel(g, EX.actions);
      if (st.mode === 'menu') {
        // 고른 행동: 밝은 띠 + 왼쪽 강조선
        const y = EX.actions.y + 6 + st.menu * 29;
        rect(g, EX.actions.x + 3, y, EX.actions.w - 6, 24, EX_COLORS.select);
        rect(g, EX.actions.x + 3, y, 2, 24, EX_COLORS.accent);
      }
      panel(g, EX.panel);
    }
    drawMind(g, t);
  }

  // 위쪽: 주장하는 사람의 초상 + 증언 카드 + 신뢰도
  function drawClaim(g, t) {
    const P = EX.portrait, C = EX.card, R = EX.cred;
    const sx = st.shake > 0 ? Math.round(Math.sin(t * 80) * 2) : 0;
    panel(g, P, '#1a2438');
    g.drawImage(portrait, P.x + 8 + sx, P.y + 6, 32, 48);
    const d = st.data;
    if (d.prop === 'paper') {
      // 학보를 펼쳐 든 손
      rect(g, P.x + 26 + sx, P.y + 32, 14, 10, '#e8e0c8');
      rect(g, P.x + 28 + sx, P.y + 34, 10, 1, '#5a5040');
      rect(g, P.x + 28 + sx, P.y + 37, 7, 1, '#9a9078');
    } else if (d.prop === 'lamp') {
      rect(g, P.x + 30 + sx, P.y + 30, 8, 8, '#bfe3ef');
      rect(g, P.x + 33 + sx, P.y + 25 - (Math.floor(t * 8) % 2), 2, 5, '#ff8a2a');
    }
    if (st.cred <= 40) rect(g, P.x + 38, P.y + 12 + (Math.floor(t * 3) % 2) * 2, 2, 3, '#6fc3ff');   // 식은땀
    if (st.flash > 0 && Math.floor(t * 20) % 2 === 0) {
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(P.x + 1, P.y + 1, P.w - 2, P.h - 2);
    }

    // 증언 카드 (종이 + 핀)
    rect(g, C.x + sx + 1, C.y + 1, C.w, C.h, 'rgba(0,0,0,0.35)');
    rect(g, C.x + sx, C.y, C.w, C.h, EX_COLORS.paper);
    rect(g, C.x + sx, C.y + C.h - 1, C.w, 1, EX_COLORS.paperEdge);
    rect(g, C.x + sx + (C.w >> 1) - 2, C.y - 2, 4, 4, '#d04a4a');

    // 신뢰도: 10칸
    const seg = R.w / 10, on = Math.ceil(st.credShown / 10 - 0.001);
    for (let i = 0; i < 10; i++) {
      rect(g, Math.round(R.x + i * seg), R.y, Math.round(seg) - 2, R.h, i < on ? (st.cred <= 0 ? EX_COLORS.warn : EX_COLORS.credOn) : EX_COLORS.credOff);
    }
  }

  // 아래쪽: 빛찬의 정신력 (작은 플라스크 다섯 개)
  function drawMind(g, t) {
    const y = EX.mindY, sx = st.hurt > 0 ? Math.round(Math.sin(t * 70) * 2) : 0;
    for (let i = 0; i < MAX_MIND; i++) {
      // 둥근 플라스크: 입구 → 목 → 둥근 몸통
      const x = 52 + i * 12 + sx, c = i < st.mind ? EX_COLORS.mind : EX_COLORS.mindOff;
      rect(g, x + 2, y, 5, 1, c);
      rect(g, x + 3, y + 1, 3, 2, c);
      rect(g, x + 1, y + 3, 7, 1, c);
      rect(g, x, y + 4, 9, 4, c);
      rect(g, x + 1, y + 8, 7, 1, c);
      if (i < st.mind) rect(g, x + 2, y + 5, 2, 1, '#ffe2b8');
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
