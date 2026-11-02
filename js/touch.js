'use strict';
// ─────────────────────────────────────────────
// touch.js — 태블릿용 화면 조작 (왼쪽 조이스틱 + 오른쪽 버튼)
// 키보드와 똑같이 keys / tapped 를 채운다 (main.js). 조이스틱을 끝까지 밀면 달리기.
// 조작 방식은 Esc 메뉴에서 바꾸고 브라우저에 기억한다. 처음엔 터치 화면이면 터치, 아니면 키보드.
// ─────────────────────────────────────────────

const Controls = (() => {
  const STORE = 'comet-night.controls';
  const REPEAT_DELAY = 0.4, REPEAT_RATE = 0.12;   // 조이스틱을 기울인 채로 있으면 메뉴에서 쭉 이동
  const DIRS = ['up', 'down', 'left', 'right'];

  const el = document.getElementById('touch');
  const stick = el.querySelector('.stick');
  const knob = stick.querySelector('i');

  let mode = null;
  try { mode = localStorage.getItem(STORE); } catch (e) { /* 저장소를 못 쓰면 기본값 */ }
  if (mode !== 'touch' && mode !== 'keyboard') mode = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';

  function apply() {
    el.classList.toggle('show', mode === 'touch');
    hint.textContent = mode === 'touch'
      ? '조이스틱 이동 (끝까지 밀면 달리기) · F 조사 · ☰ 메뉴'
      : 'WASD 이동 · F 조사 · Shift 달리기 · M 지도 · Esc 메뉴';
    document.querySelector('#title .tt-press').textContent = mode === 'touch' ? '화면을 누르세요' : '아무 키나 누르세요';
  }

  // ── 조이스틱 ──
  let stickId = null, held = new Set();
  const repeatIn = {};

  function setDirs(dirs, run) {
    for (const d of DIRS) {
      if (dirs.has(d) && !held.has(d)) {
        keys.add(d);
        tapped.add(d);
        repeatIn[d] = REPEAT_DELAY;
      } else if (!dirs.has(d) && held.has(d)) {
        keys.delete(d);
      }
    }
    held = dirs;
    if (run) keys.add('run');
    else keys.delete('run');
  }

  function moveStick(e) {
    const r = stick.getBoundingClientRect();
    const R = r.width / 2;
    let dx = (e.clientX - r.left - R) / R, dy = (e.clientY - r.top - R) / R;
    const m = Math.min(1, Math.hypot(dx, dy));
    if (m > 0) {
      const k = m / Math.hypot(dx, dy);
      dx *= k;
      dy *= k;
    }
    knob.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`;
    const dirs = new Set();
    if (m > 0.3) {
      // 8방향: 단위 벡터 성분이 cos 67.5° 보다 크면 그 방향
      const ux = dx / m, uy = dy / m;
      if (ux > 0.38) dirs.add('right');
      if (ux < -0.38) dirs.add('left');
      if (uy > 0.38) dirs.add('down');
      if (uy < -0.38) dirs.add('up');
    }
    setDirs(dirs, m > 0.92);
  }

  function releaseStick(e) {
    if (e.pointerId !== stickId) return;
    stickId = null;
    knob.style.transform = '';
    setDirs(new Set(), false);
  }

  stick.addEventListener('pointerdown', e => {
    e.preventDefault();
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener('pointerup', releaseStick);
  stick.addEventListener('pointercancel', releaseStick);

  // ── 버튼: data-key 가 main.js 의 입력 이름 (interact, talk, notebook, map, menu) ──
  for (const btn of el.querySelectorAll('[data-key]')) {
    const k = btn.dataset.key;
    const up = () => {
      keys.delete(k);
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      keys.add(k);
      tapped.add(k);
      btn.classList.add('on');
    });
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  }

  // 브라우저는 첫 입력 뒤에야 소리를 허락한다. 대사창이 열려 있으면 화면 아무 데나 눌러도 넘어간다
  addEventListener('pointerdown', e => {
    Sound.start();
    if (mode === 'touch' && dialog.pages && !e.target.closest('#touch .stick, #touch [data-key]')) tapped.add('interact');
  });

  apply();

  return {
    get mode() { return mode; },
    toggle() {
      mode = mode === 'touch' ? 'keyboard' : 'touch';
      try { localStorage.setItem(STORE, mode); } catch (e) { /* 이번에만 적용 */ }
      apply();
    },
    // 매 프레임 (main.js 루프): 기울인 방향 반복 입력, 대사 중엔 버튼을 흐리게
    update(dt) {
      for (const d of held) {
        if ((repeatIn[d] -= dt) <= 0) {
          tapped.add(d);
          repeatIn[d] = REPEAT_RATE;
        }
      }
      el.classList.toggle('dim', !!dialog.pages);
    },
  };
})();
