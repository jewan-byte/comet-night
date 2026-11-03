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

  // 위치 대조: 일지의 3/14 · 3/17 · 3/20 위치로 3/21 새벽 4:25 위치를 예측해 찍고, 원판 #12의 실제 위치를 겹친다
  //   사흘에 한 칸씩 움직였으니, 하루면 그 1/3 쯤 — 살짝 휘는 길을 따라
  orbit: (() => {
    const W = 282, H = 142;
    const PTS = [{ x: 58, y: 104, d: '3/14' }, { x: 112, y: 82, d: '3/17' }, { x: 162, y: 66, d: '3/20' }];
    const ACTUAL = { x: 178, y: 61 };          // 원판 #12 에 찍힌 3/21 04:25 위치
    const OK = 9;
    const stars = Array.from({ length: 60 }, (_, i) => ({ x: Math.floor(hash(i, 4, 41) * W), y: Math.floor(hash(4, i, 42) * H) }));

    return {
      init: saved => saved || { cx: 140, cy: 40, phase: 'aim', t: 0 },

      update(m, dt) {
        m.t += dt;
        if (m.phase === 'aim') {
          const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
          const dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
          m.cx = Math.max(4, Math.min(W - 4, m.cx + dx * 50 * dt));
          m.cy = Math.max(4, Math.min(H - 4, m.cy + dy * 50 * dt));
          if (tapped.has('interact')) {
            m.phase = 'overlay';
            m.t = 0;
            m.ok = Math.hypot(m.cx - ACTUAL.x, m.cy - ACTUAL.y) <= OK;
            Sound.sfx(m.ok ? 'good' : 'bad');
          }
          return null;
        }
        if (m.t < 1.6) return null;
        if (m.ok) {
          return {
            dmg: 50, solved: true,
            pages: [
              '예측한 점 위로 원판 #12를 겹쳤다. …흐릿한 혜성의 머리가, 정확히 그 자리에 내려앉는다.',
              { who: ME, text: '3월 14일, 17일, 20일. 천문부는 이 혜성을 매일 쫓았어요. 그리고 21일 새벽, 예측한 자리에 그대로 있었어요.' },
              { who: ME, text: '처음 알아보고 추적한 건 박사님이 아니라, 천문부였어요.' },
              '강연장이 술렁였다!',
            ],
          };
        }
        return {
          dmg: 0, miss: true, keep: { cx: m.cx, cy: m.cy, phase: 'aim', t: 0 },
          pages: ['원판 #12의 혜성은 예측한 점과 어긋난 자리에 있다.', '사흘에 그만큼 움직였다면… 하루면 그 3분의 1쯤일 것이다. 길은 조금씩 휘어 있다.'],
        };
      },

      draw(g, m, ox, oy, t) {
        rect(g, ox, oy, W, H, '#0c1430');
        for (const s of stars) rect(g, ox + s.x, oy + s.y, 1, 1, '#c8d0f0');
        // 핼리 (참고)
        rect(g, ox + 30, oy + 30, 3, 3, '#ffffff');
        for (let i = 0; i < 14; i++) rect(g, ox + 26 - i, oy + 31 + (i >> 2), 1, 1, 'rgba(200,220,255,0.5)');
        g.font = WORD_FONT;
        g.textBaseline = 'middle';
        // 일지의 기록 위치 + 날짜
        PTS.forEach((p, i) => {
          rect(g, ox + p.x - 2, oy + p.y - 2, 5, 5, '#ffb86a');
          g.fillStyle = '#ffb86a';
          g.fillText(p.d, ox + p.x - 10, oy + p.y + 10);
          if (i) {
            const q = PTS[i - 1];
            for (let k = 0; k <= 10; k++) rect(g, Math.round(ox + q.x + (p.x - q.x) * k / 10), Math.round(oy + q.y + (p.y - q.y) * k / 10), 1, 1, 'rgba(255,184,106,0.6)');
          }
        });
        // 예측 표시
        const cx = Math.round(ox + m.cx), cy = Math.round(oy + m.cy);
        rect(g, cx - 5, cy, 11, 1, '#6fd3ff');
        rect(g, cx, cy - 5, 1, 11, '#6fd3ff');
        g.fillStyle = '#6fd3ff';
        g.fillText('3/21 04:25 ?', cx + 6, cy - 7);
        if (m.phase === 'overlay') {
          // 원판 #12 의 혜성이 서서히 겹쳐진다
          g.save();
          g.globalAlpha = Math.min(1, m.t / 1.2);
          rect(g, ox + ACTUAL.x - 2, oy + ACTUAL.y - 2, 5, 5, '#ffffff');
          for (let i = 0; i < 9; i++) rect(g, ox + ACTUAL.x + 3 + i, oy + ACTUAL.y + (i >> 2), 1, 1, 'rgba(220,230,255,0.7)');
          g.fillStyle = m.ok ? '#ffe066' : '#ff8a8a';
          g.fillText('원판 #12', ox + ACTUAL.x - 12, oy + ACTUAL.y + 12);
          g.restore();
        }
        rect(g, ox + 6, oy + H - 16, W - 12, 12, 'rgba(0,0,0,0.6)');
        g.fillStyle = '#e8eef8';
        g.fillText(m.phase === 'aim' ? '일지의 세 위치로 3월 21일 새벽 4:25 위치를 예측해 F' : '원판 #12를 겹쳐 본다…', ox + 10, oy + H - 10);
      },
    };
  })(),

  // 원판 현상: 40년 동안 현상되지 않은 원판 #12를 현상액에서 알맞은 순간에 꺼내고(타이밍),
  //   음화(밤하늘이 투명, 별이 검은 점)에서 핼리 말고 "또 하나의 혜성"을 찾아낸다
  plate: (() => {
    const W = 282, H = 142;
    const DEV_TIME = 6;                       // 현상 막대가 다 차는 데 걸리는 시간(초)
    const GOOD = [0.56, 0.76];                // 꺼내기 좋은 구간
    const P = { x: 70, y: 14, w: 142, h: 104 };   // 원판 그림 자리
    const HALLEY = { x: 52, y: 40 }, NEW = { x: 104, y: 70 };   // 원판 안 좌표
    const stars = Array.from({ length: 46 }, (_, i) => ({ x: Math.floor(hash(i, 2, 31) * P.w), y: Math.floor(hash(2, i, 32) * P.h), s: hash(i, i, 33) < 0.2 ? 2 : 1 }));
    const near = (m, o, r) => Math.hypot(m.cx - o.x, m.cy - o.y) <= r;

    function drawPlate(g, ox, oy, dev, t) {
      const x0 = ox + P.x, y0 = oy + P.y;
      // 유리판 (투명한 바탕일수록 현상이 덜 된 것) — dev: 0(흐림)~1(진함)
      rect(g, x0 - 2, y0 - 2, P.w + 4, P.h + 4, '#5a5a62');
      rect(g, x0, y0, P.w, P.h, '#d8dcd0');
      g.save();
      g.globalAlpha = Math.min(1, dev);
      for (const s of stars) rect(g, x0 + s.x, y0 + s.y, s.s, s.s, '#1a1a1e');
      // 핼리: 크고 진한 머리 + 긴 꼬리
      rect(g, x0 + HALLEY.x - 2, y0 + HALLEY.y - 2, 5, 5, '#121216');
      for (let i = 0; i < 22; i++) rect(g, x0 + HALLEY.x - 3 - i, y0 + HALLEY.y - 1 - (i >> 2), 1, 2 + (i >> 3), 'rgba(18,18,22,0.6)');
      // 새 혜성: 작고 흐린 머리 + 짧은 꼬리 (dev 가 충분해야 보인다)
      g.globalAlpha = Math.max(0, Math.min(1, (dev - 0.45) * 2.2));
      rect(g, x0 + NEW.x - 1, y0 + NEW.y - 1, 3, 3, '#2a2a30');
      for (let i = 0; i < 9; i++) rect(g, x0 + NEW.x + 2 + i, y0 + NEW.y + (i >> 2), 1, 1, 'rgba(30,30,36,0.5)');
      g.restore();
      // 천문부 원판의 표시: 모서리 V자 흠 + 긁어 쓴 번호
      rect(g, x0 + P.w - 9, y0, 9, 1, '#5a5a62');
      for (let i = 0; i < 5; i++) rect(g, x0 + P.w - 9 + i, y0 + i, 1, 1, '#5a5a62');
      for (let i = 0; i < 5; i++) rect(g, x0 + P.w - 1 - i, y0 + i, 1, 1, '#5a5a62');
      g.font = WORD_FONT;
      g.textBaseline = 'top';
      g.fillStyle = '#5a5a62';
      g.fillText('#12', x0 + 3, y0 + P.h - 12);
    }

    return {
      init: saved => saved || { phase: 'dev', t: 0, cx: 70, cy: 50, msg: null },

      update(m, dt) {
        m.t += dt;
        if (m.phase === 'dev') {
          const p = m.t / DEV_TIME;
          if (tapped.has('interact') || p >= 1.15) {
            if (p >= GOOD[0] && p <= GOOD[1]) {
              m.phase = 'scan';
              m.dev = p / GOOD[1];
              Sound.sfx('good');
              return null;
            }
            const early = p < GOOD[0];
            return {
              dmg: 0, miss: true, keep: { phase: 'dev', t: 0, cx: 70, cy: 50, msg: null },
              pages: early
                ? ['너무 일찍 꺼냈다. 상이 거의 떠오르지 않았다.', '…다행히 가장자리 시험 조각이었다. 다시 해 보자.']
                : ['너무 오래 담갔다. 시험 조각이 새까맣게 타 버렸다.', '본판은 무사하다. 다시 해 보자.'],
            };
          }
          return null;
        }
        // 판독: WASD 로 돋보기를 옮기고 F
        const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
        const dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
        m.cx = Math.max(0, Math.min(P.w, m.cx + dx * 60 * dt));
        m.cy = Math.max(0, Math.min(P.h, m.cy + dy * 60 * dt));
        if (tapped.has('interact')) {
          if (near(m, NEW, 6)) {
            return {
              dmg: 50, solved: true,
              pages: [
                '돋보기 아래— 핼리의 오른쪽 아래, 흐릿한 점 하나에 짧은 꼬리가 붙어 있다.',
                '별이 아니다. 이건… 또 하나의 혜성이다.',
                { who: ME, text: '천문부 원판 #12. 1986년 3월 21일 새벽 4시 25분, 아빠가 찍은 마지막 한 장.' },
                { who: ME, text: '3월 22일보다 하루 먼저, 천문부 원판엔 이미 이 혜성이 찍혀 있었어요.' },
                '"천문부 원판엔 아무것도 없었다"는 주장이 크게 흔들렸다!',
              ],
            };
          }
          if (near(m, HALLEY, 8)) {
            return {
              dmg: 0, miss: true, keep: { ...m },
              pages: ['…이건 핼리 혜성이다. 크고 진한 머리, 긴 꼬리.', '찾아야 하는 건 "또 하나"다.'],
            };
          }
          m.msg = '…그냥 별이다. 더 흐리고, 꼬리가 달린 걸 찾자.';
          Sound.sfx('move');
        }
        return null;
      },

      draw(g, m, ox, oy, t) {
        rect(g, ox, oy, W, H, '#2a0a08');                                   // 암실: 빨간 안전등 아래
        g.fillStyle = 'rgba(255,40,30,0.18)';
        g.fillRect(ox, oy, W, H);
        g.font = WORD_FONT;
        g.textBaseline = 'middle';
        if (m.phase === 'dev') {
          const p = Math.min(1.15, m.t / DEV_TIME);
          // 현상 쟁반 속 원판: 시간이 지날수록 상이 떠오른다
          rect(g, ox + P.x - 8, oy + P.y - 6, P.w + 16, P.h + 12, '#e8e4da');
          rect(g, ox + P.x - 6, oy + P.y - 4, P.w + 12, P.h + 8, '#c9a95a');
          drawPlate(g, ox, oy, p, t);
          // 막대: 좋은 구간 표시
          const bx = ox + 20, by = oy + H - 14, bw = W - 40;
          rect(g, bx, by, bw, 6, '#1a1a1e');
          rect(g, Math.round(bx + bw * GOOD[0] / 1.15), by, Math.round(bw * (GOOD[1] - GOOD[0]) / 1.15), 6, '#3a7a4a');
          rect(g, Math.round(bx + bw * Math.min(1, p / 1.15)), by - 2, 2, 10, '#ffe066');
          g.fillStyle = '#e8eef8';
          g.fillText('상이 떠오르면, 초록 구간에서 F로 꺼낸다', ox + 20, oy + H - 22);
          return;
        }
        drawPlate(g, ox, oy, m.dev, t);
        // 돋보기
        const cx = Math.round(ox + P.x + m.cx), cy = Math.round(oy + P.y + m.cy);
        ring(g, cx, cy, 7, '#ffe066');
        rect(g, cx + 5, cy + 5, 3, 3, '#ffe066');
        rect(g, ox + 6, oy + H - 18, W - 12, 14, '#0e1420');
        g.fillStyle = '#e8eef8';
        g.fillText(m.msg || '원판을 판독한다. 핼리 말고 "또 하나"를 찾아 F.', ox + 10, oy + H - 11);
      },
    };
  })(),

  // 소리 분석: 1986년 관악부 녹음테이프의 파형을 훑어 네 순간을 찾고, 시간 간격을 따진다
  //   카운터 000 = 3시 55분, 1칸 = 5초. 화면에는 4시 15분(240)~4시 40분(540)만 보인다.
  sound: (() => {
    const W = 282, H = 142;
    const C0 = 240, C1 = 540;                          // 보이는 카운터 범위
    const WAVE = { x: 10, y: 50, w: 262, h: 54 };
    const EVENTS = [
      { id: 'down', c: 348, len: 10, amp: 0.55, label: '"어, 도현 선배! 이 시간에 어디 가요?" "쉿. 금방 올라가."' },
      { id: 'up', c: 396, len: 10, amp: 0.5, label: '"선배, 1층에 박 선생님 계시죠?" …"응, 암실에."' },
      { id: 'bang', c: 432, len: 3, amp: 1, label: '펑— (바닥 너머로 둔탁하게 울리는 소리)' },
      { id: 'bell', c: 456, len: 60, amp: 0.85, label: '따르르르릉— (화재벨. 연주가 뚝 끊긴다)' },
    ];
    const QUIZ = {
      q: '도현 선배가 계단을 올라간 뒤, 몇 분 뒤에 "펑"이 났을까?',
      options: ['곧바로 (0분)', '3분 뒤', '7분 뒤'],
      answer: 1,
    };
    const time = c => {
      const sec = 55 * 60 + c * 5, m = Math.floor(sec / 60);
      return `${3 + Math.floor(m / 60)}시 ${String(m % 60).padStart(2, '0')}분`;
    };
    const xOf = c => WAVE.x + (c - C0) / (C1 - C0) * WAVE.w;
    const eventAt = c => EVENTS.find(e => c >= e.c - 3 && c <= e.c + e.len + 3);
    // 파형 높이: 합주 소리(잔잔) + 사건들(튀어나옴)
    const amp = c => {
      const e = EVENTS.find(v => c >= v.c && c <= v.c + v.len);
      const band = c >= 456 ? 0.05 : 0.18 + hash(c, 3, 14) * 0.14;   // 벨 뒤엔 연주가 끊긴다
      return e ? Math.max(band, e.amp * (0.7 + hash(c, 5, 15) * 0.3)) : band;
    };

    return {
      init: saved => saved || { c: 300, found: new Set(), heard: null, phase: 'scan', pick: 0, t: 0 },

      update(m, dt) {
        m.t += dt;
        if (m.phase === 'scan') {
          const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
          m.c = Math.max(C0, Math.min(C1, m.c + dx * 60 * dt * (keys.has('run') ? 2.5 : 1)));
          if (tapped.has('interact')) {
            const e = eventAt(m.c);
            if (e) m.c = e.c;   // 그 소리가 시작되는 자리로 맞춘다 (시각이 해설과 어긋나지 않게)
            m.heard = e ? e.label : '…합주 소리뿐이다.';
            if (e && !m.found.has(e.id)) {
              m.found.add(e.id);
              Sound.sfx('good');
            } else {
              Sound.sfx('move');
            }
            // 다 찾았으면 질문으로 (다시 듣다가 사건 위에서 F 를 눌러도)
            if (m.found.size === EVENTS.length && (!e || m.found.has(e.id))) {
              m.phase = 'quiz';
              m.t = 0;
            }
          }
          return null;
        }
        // 질문: 고르고 F, Esc 면 파형으로 돌아가 다시 듣는다
        if (tapped.has('menu')) {
          m.phase = 'scan';
          m.heard = '파형으로 돌아왔다. 다 찾았으면 F로 다시 질문에 답하자.';
          return null;
        }
        const d = (tapped.has('down') || tapped.has('right') ? 1 : 0) - (tapped.has('up') || tapped.has('left') ? 1 : 0);
        if (d) {
          m.pick = (m.pick + d + QUIZ.options.length) % QUIZ.options.length;
          Sound.sfx('move');
        }
        if (m.t > 0.3 && tapped.has('interact')) {
          if (m.pick === QUIZ.answer) {
            return {
              dmg: 50, solved: true,
              pages: [
                '4시 24분, 내려가는 인사. 4시 28분, 올라오는 대답 — "응, 암실에."',
                '그리고 4시 31분, 펑. 4시 33분, 화재벨.',
                { who: ME, text: '선생님은 "펑" 소리가 들리기 3분 전에 이미 준비실을 나와 계단을 오르고 계셨어요.' },
                { who: ME, text: '불이 시작된 곳은 선반이 아니라 콘센트였고, 그날 램프는 옥상에 있었어요.' },
                { who: ME, text: '그리고 "암실에" 누가 있었는지… 직접 대답하셨어요.' },
                '증언의 신뢰도가 크게 무너졌다!',
              ],
            };
          }
          return {
            dmg: 0, miss: true, keep: m,
            pages: ['…다시 계산해 보자. 올라오는 대답은 몇 분이었고, "펑"은 몇 분이었지?'],
          };
        }
        return null;
      },

      draw(g, m, ox, oy, t) {
        // 카세트 데크
        rect(g, ox, oy, W, H, '#1c1c22');
        rect(g, ox + 8, oy + 6, 120, 30, '#2a2a32');
        rect(g, ox + 12, oy + 10, 112, 22, '#e8e2cc');
        rect(g, ox + 14, oy + 12, 108, 5, '#4a6ac8');                        // 라벨: 86.3.21 새벽 합주
        ring(g, ox + 40, oy + 25, 4, '#3a3a44');
        ring(g, ox + 96, oy + 25, 4, '#3a3a44');
        rect(g, ox + 44, oy + 23, 48, 4, '#6a4a30');
        // 카운터 · 시각
        g.font = WORD_FONT;
        g.textBaseline = 'middle';
        g.fillStyle = '#ff9a4a';
        g.fillText(`카운터 ${String(Math.round(m.c)).padStart(3, '0')}`, ox + 140, oy + 15);
        g.fillStyle = '#e8eef8';
        g.fillText(`≈ ${time(Math.round(m.c))}`, ox + 140, oy + 29);
        // 찾은 것
        g.fillStyle = '#8fa6c8';
        g.fillText(`찾은 순간 ${m.found.size} / ${EVENTS.length}`, ox + 210, oy + 15);

        // 파형
        rect(g, ox + WAVE.x - 2, oy + WAVE.y - 2, WAVE.w + 4, WAVE.h + 4, '#0e1420');
        const mid = oy + WAVE.y + WAVE.h / 2;
        for (let px = 0; px < WAVE.w; px++) {
          const c = C0 + px / WAVE.w * (C1 - C0);
          const a = amp(Math.floor(c)) * (WAVE.h / 2 - 2);
          const e = EVENTS.find(v => c >= v.c && c <= v.c + v.len);
          rect(g, ox + WAVE.x + px, Math.round(mid - a), 1, Math.max(1, Math.round(a * 2)),
            e && m.found.has(e.id) ? '#ffe066' : '#5fdc7a');
        }
        // 시각 눈금 (5분마다)
        for (let c = C0; c <= C1; c += 60) {
          const x = Math.round(ox + xOf(c));
          rect(g, x, oy + WAVE.y + WAVE.h + 3, 1, 3, '#6f84a6');
          g.fillStyle = '#6f84a6';
          g.fillText(time(c).replace('시 ', ':').replace('분', ''), x - 10, oy + WAVE.y + WAVE.h + 12);
        }
        // 찾은 순간: 파형 위에 기준 시각을 달아 둔다
        for (const e of EVENTS) {
          if (!m.found.has(e.id)) continue;
          const ex = Math.round(ox + xOf(e.c));
          rect(g, ex, oy + WAVE.y - 4, 1, 4, '#ffe066');
          g.fillStyle = '#ffe066';
          g.fillText(time(e.c).replace('시 ', ':').replace('분', ''), ex - 10, oy + WAVE.y - 9);
        }
        // 재생 위치
        const hx = Math.round(ox + xOf(m.c));
        rect(g, hx, oy + WAVE.y - 6, 1, WAVE.h + 12, '#ff6a6a');
        rect(g, hx - 2, oy + WAVE.y - 8, 5, 3, '#ff6a6a');

        // 들은 내용 / 질문 (두 줄)
        rect(g, ox + 6, oy + 112, W - 12, 28, '#0e1420');
        g.fillStyle = '#e8eef8';
        if (m.phase === 'quiz') {
          g.fillText(QUIZ.q, ox + 10, oy + 119);
          QUIZ.options.forEach((o, i) => {
            g.fillStyle = i === m.pick ? '#ffe066' : '#8fa6c8';
            g.fillText((i === m.pick ? '▸ ' : '  ') + o, ox + 10 + i * 88, oy + 132);
          });
        } else if (m.heard) {
          const LINE = 27;
          g.fillText(m.heard.slice(0, LINE), ox + 10, oy + 119);
          if (m.heard.length > LINE) g.fillText(m.heard.slice(LINE), ox + 10, oy + 132);
        } else {
          g.fillStyle = '#6f84a6';
          g.fillText('파형에서 튀어나온 소리를 찾아 F로 들어 보자.', ox + 10, oy + 125);
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
      shake: 0, flash: 0, hurt: 0, mini: null, miniSaved: null,
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
      // 처음부터 다시 정리하되, 미니게임에서 이미 해낸 단계(예: 현상 성공)는 남겨 둔다
      const checkpoint = st.miniSaved;
      say(['머리가 지끈거린다. 생각이 엉켜 버렸다…', '심호흡을 하고, 처음부터 다시 정리하자.'], () => {
        st = fresh(data);
        st.miniSaved = checkpoint;
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
        st.mini = MINIGAMES[d.mini].init(st.miniSaved);   // 틀려도 진행을 이어 가는 미니게임은 상태를 맡겨 둔다
        st.miniSaved = null;
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
        if (res.keep) st.miniSaved = res.keep;
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
      mini: `${st.data.title} — ${st.data.miniHelp}`,
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
