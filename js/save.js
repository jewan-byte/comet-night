'use strict';
// ─────────────────────────────────────────────
// save.js — 자동 저장 (브라우저 localStorage)
// 컷신·대사·실험·화면 전환이 없을 때(= 스크립트와 스크립트 사이)만 2초마다 저장한다.
// 그래서 불러오면 항상 "자유롭게 걸어 다니던 순간"으로 돌아온다. 타이틀에서 이어하기를 고른다.
// ─────────────────────────────────────────────

const Save = (() => {
  const KEY = 'comet-night.save.v1';
  let last = '';

  const calm = () => !cutscene && !dialog.pages && !Experiment.isOpen && !fade.dir && fade.alpha === 0
    && !titleEl.classList.contains('show');

  function snapshot() {
    return {
      v: 1,
      savedAt: Date.now(),
      flags: { ...flags },
      route: JSON.parse(JSON.stringify(route)),
      clues: CLUES.filter(c => c.found).map(c => c.name),
      floor: floor.map.n,
      x: player.x, y: player.y, dir: player.dir,
      companion: {
        visible: companion.visible, following: companion.following, floor: companion.floor,
        x: companion.x, y: companion.y, dir: companion.dir,
      },
    };
  }

  function tick() {
    if (!calm()) return;
    const s = snapshot();
    const key = JSON.stringify({ ...s, savedAt: 0 });   // 시각만 다르면 다시 쓰지 않는다
    if (key === last) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      last = key;
    } catch (e) { /* 저장소를 못 쓰는 브라우저 — 저장 없이 진행 */ }
  }
  setInterval(tick, 2000);

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      return s && s.v === 1 && FLOORS[s.floor] ? s : null;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    last = '';
    try { localStorage.removeItem(KEY); } catch (e) { /* 없음 */ }
  }

  // 저장해 둔 순간으로: 플래그·숨은 값·단서·위치, 그리고 그 장면에 있어야 할 것들(노을, 기억 속 모습, 연기, 인물)
  function restore(s) {
    resetFlags();
    Object.assign(flags, s.flags);
    Object.assign(route, JSON.parse(JSON.stringify(s.route)));
    for (const c of CLUES) c.found = s.clues.includes(c.name);

    const memory = flags.memory;
    setPlayerLook(memory ? MEMORY_LOOK[memory] : null);
    ambient = memory ? null : flags.day2Evening ? EVENING : flags.ch2Started && !flags.day2 ? DUSK : null;
    const burning = (memory === 'minkyung' && flags.mkFire && !flags.mkDistort)
      || (memory === 'dohyun' && flags.dhFire && !flags.dhFought);
    if (burning) smoke = 'old1';
    if (memory === 'minkyung' && flags.mkFire && !flags.mkDistort) startFireBell();
    setFloor(s.floor, { x: s.x / TILE, y: s.y / TILE, dir: s.dir });
    // 하율은 저장 당시 자리 그대로, 따라오는 길(trail)만 그 자리에서 다시 시작
    Object.assign(companion, s.companion);
    trail = [{ x: companion.x, y: companion.y }, { x: player.x, y: player.y }];

    if (flags.ch2Started && !flags.ch2Intro) addActor('teacher', 39.5, 9, 'down', 1);
    if (flags.day2 && !memory) addActor('principal', 57.5, 23.6, 'down', 1);
    if (memory === 'minkyung' && flags.mkMusic && !flags.mkFire) {
      addActor('band86', 12.5, 26, 'down', 'old2');
      addActor('band86', 16.5, 26, 'down', 'old2');
      addActor('band86', 22.5, 25, 'left', 'old2');
    }
    if (memory === 'dohyun') addMemoryActors();
    last = JSON.stringify({ ...snapshot(), savedAt: 0 });
  }

  return { load, clear, restore };
})();
