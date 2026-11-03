'use strict';
// ─────────────────────────────────────────────
// main.js — 입력, 이동, 장소 이동, 대사창, 카메라, 그리기
// 스토리 진행(컷신, 대사 순서)은 story.js
// ─────────────────────────────────────────────

const VIEW_W = 320, VIEW_H = 240;   // 언더테일과 같은 4:3 저해상도
const WALK_SPEED = 80;              // px/초
const RUN_MULT = 1.7;
const FRAME_TIME = 0.13;            // 걷기 애니메이션 한 프레임
const HITBOX = { w: 10, h: 6 };     // 발밑 충돌 영역
const FADE_SPEED = 4;               // 화면 전환 (1/초)
const EXAMINE_RANGE = 28;           // 이 거리(px) 안에 들어오면 조사 가능
const SCHOOL_FLOORS = [1, 2, 3];    // 엘리베이터로 갈 수 있는 층

const stage = document.getElementById('stage');
const canvas = document.getElementById('screen');
const banner = document.getElementById('banner');
const hint = document.getElementById('hint');
const dialogBox = document.getElementById('dialog');
const dialogName = document.getElementById('dialog-name');
const dialogText = document.getElementById('dialog-text');
const dialogChoices = document.getElementById('dialog-choices');
const dialogNext = document.getElementById('dialog-next');
const keyPrompt = document.getElementById('key-prompt');
const keyPromptLabel = keyPrompt.querySelector('.label');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;

// 모든 장소를 미리 그려둔다
const FLOORS = {};
for (const [n, map] of Object.entries(buildWorld())) {
  const props = map.objects.map(o => ({ ...o, ...makeObjectSprite(o) }));
  // 조사 가능한 것마다 반짝임용 그림을 준비 (src = 원래 그림)
  const spots = map.examinables.map(r => {
    const prop = props.find(p => p.x === r.x && p.y === r.y && p.type === r.type);
    const src = prop ? prop.canvas : makeDecoSprite(r);
    return { ref: r, prop, src, highlight: makeHighlight(src) };
  });
  FLOORS[n] = { map, canvas: renderFloor(map), mini: makeMinimap(map), props, spots };
}

// 단서 목록 (이야기 순서대로). 장소는 사물 바로 아래 칸이 속한 방 이름
const CLUES = [];
for (const key of ['home', 1, 2, 3]) {
  const f = FLOORS[key];
  for (const s of f.spots) {
    const r = s.ref;
    if (!r.name) continue;
    const region = f.map.regionAt(r.x, r.y + r.h) || f.map.regionAt(r.x, r.y);
    s.clue = { name: r.name, text: r.text, place: `${f.map.label} · ${region ? region.name : ''}`, found: false };
    CLUES.push(s.clue);
  }
}
// 회상 속에선 다른 사람(예: 1986년의 김연수)이 된다 — who: PEOPLE 이름, null 이면 비찬
let playerFrames = makePlayerFrames();
function setPlayerLook(who) {
  playerFrames = who ? makePersonFrames(PEOPLE[who].pal, PEOPLE[who]) : makePlayerFrames();
}
const friendFrames = makePersonFrames(PEOPLE.friend.pal, PEOPLE.friend);

let floor = FLOORS.home;
const player = { x: 0, y: 0, dir: 'down', anim: 0, moving: false, scriptAnim: 0 };
let cutscene = false;   // 컷신 중엔 움직이거나 조사할 수 없다 (대사 넘기기만 가능)

// 동료(저궁): floor 층에 visible 이면 보이고, following 이면 플레이어가 지나간 길을 따라온다
const companion = { visible: false, following: false, floor: 1, x: 0, y: 0, dir: 'down', anim: 0, moving: false, moveTimer: 0 };
const COMPANION_GAP = 17;     // 플레이어 뒤로 얼마나(px) 떨어져서 따라오는지 (걸을 땐 조금 더 벌어진다)
const COMPANION_EASE = 9;     // 클수록 바짝, 작을수록 느긋하게 따라온다
let trail = [];               // 플레이어가 지나간 자리

// ── 화면 크기: 정수 배율로 꽉 차게 ──
function fit() {
  const s = Math.max(1, Math.floor(Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H)));
  stage.style.width = VIEW_W * s + 'px';
  stage.style.height = VIEW_H * s + 'px';
  stage.style.setProperty('--s', s);
}
addEventListener('resize', fit);
fit();

// ── 입력 ──
const keys = new Set();     // 누르고 있는 키
const tapped = new Set();   // 이번 프레임에 새로 누른 키
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyF: 'interact', Enter: 'interact',
  KeyQ: 'talk',
  Escape: 'menu',
  Tab: 'notebook',
  KeyM: 'map',
  KeyN: 'mute',
  Backquote: 'dev',
};

// 개발자 메뉴(` 키)에서 켜고 끄는 테스트용 설정
const dev = { noclip: false, fastText: false, fastMove: false, info: false };
addEventListener('keydown', e => {
  Sound.start(); // 브라우저는 첫 키 입력 뒤에야 소리를 허락한다
  const k = KEYMAP[e.code];
  if (!k) return;
  keys.add(k);
  // 방향키는 꾹 누르면 반복 입력 (메뉴·수첩 목록을 쭉 내려가게). 걷기는 keys 로 따로 처리
  if (!e.repeat || ['up', 'down', 'left', 'right'].includes(k)) tapped.add(k);
  e.preventDefault();
});
addEventListener('keyup', e => keys.delete(KEYMAP[e.code]));
addEventListener('blur', () => keys.clear());

// ── 충돌 ──
function blocked(x, y) {
  if (dev.noclip) return false;
  const x0 = Math.floor((x - HITBOX.w / 2) / TILE), x1 = Math.floor((x + HITBOX.w / 2 - 0.01) / TILE);
  const y0 = Math.floor((y - HITBOX.h) / TILE), y1 = Math.floor((y - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) if (floor.map.isSolid(tx, ty)) return true;
  }
  return false;
}

// 1px씩 나눠 움직여서 벽에 딱 붙어 멈춘다
function moveAxis(axis, amount) {
  let left = amount;
  while (left !== 0) {
    const step = Math.abs(left) > 1 ? Math.sign(left) : left;
    const nx = axis === 'x' ? player.x + step : player.x;
    const ny = axis === 'y' ? player.y + step : player.y;
    if (blocked(nx, ny)) break;
    player.x = nx;
    player.y = ny;
    left -= step;
  }
}

const feetTile = () => [Math.floor(player.x / TILE), Math.floor((player.y - 1) / TILE)];

// ── 장소 이름 표시 ──
// 컷신 중에도 시간이 지나면 사라지도록 타이머는 setTimeout 으로
let currentRegion = null, bannerTimer = 0, floorChanged = false;
function updateRegion() {
  const r = floor.map.regionAt(...feetTile());
  if (r && r !== currentRegion) {
    currentRegion = r;
    const showFloor = floorChanged && typeof floor.map.n === 'number' && !r.name.includes('층');
    banner.textContent = showFloor ? `${floor.map.label} · ${r.name}` : r.name;
    floorChanged = false;
    banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => banner.classList.remove('show'), 2200);
  }
}

// ── 장소 이동 + 화면 전환 ──
// fadeTo(action, done): 어두워지면 action, 다시 밝아지면 done
const fade = { alpha: 0, dir: 0, action: null, done: null };

function fadeTo(action, done = null) {
  fade.dir = 1;
  fade.action = action;
  fade.done = done;
}

// 검은 화면에서 밝아지기만
function fadeIn(done = null) {
  fade.alpha = 1;
  fade.dir = -1;
  fade.action = null;
  fade.done = done;
}

// to: { x, y, dir } — x, y 는 픽셀/16 (y는 발밑)
function setFloor(n, to) {
  floor = FLOORS[n];
  camFocus = null;
  player.x = to.x * TILE;
  player.y = to.y * TILE;
  player.dir = to.dir;
  player.anim = 0;
  currentRegion = null;
  floorChanged = true;
  // 컷신으로 옮겨져도 (버스 등) 바로 새 장소 이름이 뜨게
  updateRegion();
  if (companion.following) placeCompanionBehind();
}

// ── 동료 따라오기 ──

// 플레이어 등 뒤 한 칸 (벽이면 같은 자리)
function placeCompanionBehind() {
  const [fx, fy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.dir];
  const bx = player.x - fx * COMPANION_GAP, by = player.y - fy * COMPANION_GAP;
  const free = !floor.map.isSolid(Math.floor(bx / TILE), Math.floor((by - 1) / TILE));
  companion.x = free ? bx : player.x;
  companion.y = free ? by : player.y;
  companion.dir = player.dir;
  companion.floor = floor.map.n;
  companion.anim = 0;
  companion.moveTimer = 0;
  trail = [{ x: companion.x, y: companion.y }, { x: player.x, y: player.y }];
}

// 길 위에서 플레이어보다 COMPANION_GAP 만큼 뒤에 있는 지점
function trailPointBehind() {
  let dist = 0, i = trail.length - 1;
  while (i > 0) {
    const seg = Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
    if (dist + seg >= COMPANION_GAP) {
      // 선분 안에서 정확한 위치를 보간 (뚝뚝 끊기지 않게)
      const t = (COMPANION_GAP - dist) / seg;
      return { x: trail[i].x + (trail[i - 1].x - trail[i].x) * t, y: trail[i].y + (trail[i - 1].y - trail[i].y) * t };
    }
    dist += seg;
    i--;
  }
  return trail[0];
}

function updateCompanion(dt) {
  if (!companion.following) return;
  const last = trail[trail.length - 1];
  if (Math.hypot(player.x - last.x, player.y - last.y) >= 2) trail.push({ x: player.x, y: player.y });
  if (trail.length > 120) trail.shift();

  // 목표 지점으로 미끄러지듯 (멀면 빠르게, 가까우면 천천히)
  const p = trailPointBehind();
  const dx = p.x - companion.x, dy = p.y - companion.y;
  const k = 1 - Math.exp(-dt * COMPANION_EASE);
  companion.x += dx * k;
  companion.y += dy * k;

  const speed = Math.hypot(dx, dy) * k / Math.max(dt, 1e-3);
  if (speed > 15) {
    companion.moveTimer = 0.15;   // 잠깐 멈칫해도 걷는 동작이 끊기지 않게
    // 한쪽 축이 확실히 클 때만 방향을 바꿔서 대각선에서 깜빡이지 않게
    if (Math.abs(dx) > Math.abs(dy) * 1.4) companion.dir = dx > 0 ? 'right' : 'left';
    else if (Math.abs(dy) > Math.abs(dx) * 1.4) companion.dir = dy > 0 ? 'down' : 'up';
  }
  companion.moveTimer -= dt;
  companion.moving = companion.moveTimer > 0;
  if (companion.moving) {
    if (companion.anim === 0) companion.anim = FRAME_TIME;
    companion.anim += dt * (keys.has('run') ? RUN_MULT : 1);
  } else {
    companion.anim = 0;
  }
}

function updateFade(dt) {
  fade.alpha += dt * FADE_SPEED * fade.dir;
  if (fade.dir > 0 && fade.alpha >= 1) {
    fade.alpha = 1;
    if (fade.action) fade.action();
    if (fade.dir > 0) fade.dir = -1;   // action 이 fade.dir = 0 으로 바꾸면 검은 화면 유지
  } else if (fade.dir < 0 && fade.alpha <= 0) {
    fade.alpha = 0;
    fade.dir = 0;
    const done = fade.done;
    fade.done = null;
    if (done) done();
  }
}

// ── 대사창 ──
// 페이지는 '문자열'(서술, * 표시) 또는 { who: '이름', text: '대사' }
const TYPE_SPEED = 30; // 초당 글자 수
const dialog = { pages: null, page: 0, shown: 0, choice: null, resolve: null };
const pageText = p => (typeof p === 'string' ? p : p.text);

// choice: { options: [...], index, onPick(i) } — 마지막 페이지에서 고른다
// 대사창이 닫히면 끝나는 Promise를 돌려준다 (story.js에서 await)
function openDialog(pages, choice = null) {
  dialog.pages = pages;
  dialog.page = 0;
  dialog.shown = 0;
  dialog.choice = choice;
  // 캐릭터가 화면 아래쪽에 있으면 대사창을 위로
  const screenY = Math.round(player.y) - camera.y;
  // 화면을 고정한 컷신에선 위쪽(무대 등)을 가리지 않게 늘 아래에
  dialogBox.classList.toggle('top', !camFocus && screenY > VIEW_H * 0.6);
  dialogBox.classList.add('open');
  updateDialog(0);
  return new Promise(resolve => { dialog.resolve = resolve; });
}

function closeDialog() {
  dialog.pages = null;
  dialogBox.classList.remove('open');
  const resolve = dialog.resolve;
  dialog.resolve = null;
  if (resolve) resolve();
}

function renderChoices() {
  dialogChoices.textContent = '';
  if (!dialog.choice) return;
  dialog.choice.options.forEach((label, i) => {
    const span = document.createElement('span');
    span.textContent = (i === dialog.choice.index ? '▶ ' : '  ') + label;
    if (i === dialog.choice.index) span.className = 'picked';
    dialogChoices.appendChild(span);
  });
}

function updateDialog(dt) {
  const lastPage = dialog.page === dialog.pages.length - 1;
  const typed = dialog.shown >= pageText(dialog.pages[dialog.page]).length;
  const choosing = lastPage && typed && dialog.choice;

  if (choosing) {
    const c = dialog.choice, count = c.options.length;
    if (tapped.has('left') || tapped.has('up')) c.index = (c.index + count - 1) % count;
    if (tapped.has('right') || tapped.has('down')) c.index = (c.index + 1) % count;
  }
  if (tapped.has('interact')) {
    if (!typed) {
      dialog.shown = pageText(dialog.pages[dialog.page]).length;   // 타자 효과 건너뛰기
    } else if (!lastPage) {
      dialog.page++;
      dialog.shown = 0;
    } else {
      const c = dialog.choice;
      tapped.delete('interact');
      closeDialog();
      if (c) c.onPick(c.index);
      return;
    }
  }

  const p = dialog.pages[dialog.page];
  const text = pageText(p);
  const before = Math.floor(dialog.shown);
  dialog.shown = Math.min(text.length, dialog.shown + dt * TYPE_SPEED * (dev.fastText ? 6 : 1));
  const after = Math.floor(dialog.shown);
  if (after > before && text[after - 1].trim()) Sound.blip();  // 글자 나올 때 타자 소리

  const who = typeof p === 'string' ? '' : p.who;
  dialogName.textContent = who;
  dialogName.style.display = who ? '' : 'none';
  dialogText.textContent = (who ? '' : '* ') + text.slice(0, after);
  const showChoices = dialog.choice && lastPage && dialog.shown >= text.length;
  if (showChoices) renderChoices();
  else dialogChoices.textContent = '';
  dialogNext.classList.toggle('show', dialog.shown >= text.length && !showChoices);
}

// ── 엘리베이터 ──
function useElevator() {
  const here = floor.map.n;
  openDialog(['엘리베이터다. 몇 층으로 갈까?'], {
    options: [...SCHOOL_FLOORS.map(n => `${n}층`), '취소'],
    index: SCHOOL_FLOORS.indexOf(here),
    onPick(i) {
      const n = SCHOOL_FLOORS[i];
      if (n === undefined) return;
      if (n === here) {
        openDialog([`여기가 ${n}층이다.`]);
        return;
      }
      fadeTo(() => setFloor(n, ELEVATOR_ARRIVE));
    },
  });
}

// ── 조사 대상: 가까이 있는 것 중 가장 가까운 하나 ──
let target = null;
function findTarget() {
  const px = player.x, py = player.y - HITBOX.h;   // 몸 아래쪽 기준
  let best = null, bestD = EXAMINE_RANGE;
  for (const s of floor.spots) {
    const r = s.ref;
    const dx = Math.max(r.x * TILE - px, 0, px - (r.x + r.w) * TILE);
    const dy = Math.max(r.y * TILE - py, 0, py - (r.y + r.h) * TILE);
    const d = Math.hypot(dx, dy);
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

function examine() {
  if (!target) return;
  const r = target.ref;
  if (r.elevator) return useElevator();
  if (r.script) return runScript(r.script, r);   // 사람에게 말 걸기, 상황마다 달라지는 조사 (story.js)
  // 이야기 조건이 맞으면 평소 대사 대신 이벤트 (예: 1장 마무리 서랍)
  if (r.event && flags[r.event.when] && !flags[r.event.done]) return runScript(r.event.script);
  const closed = openDialog(r.text);
  if (r.flag) flags[r.flag] = true;
  const c = target.clue;
  if (c && !c.found) {
    c.found = true;
    Toast.show(`새 단서: ${c.name}  (Tab)`, clueImage(c.name));
    closed.then(onClueFound);   // 대사가 끝나면 이야기 진행 확인 (story.js)
  }
}

// ── 컷신용 인물 (잠깐 등장했다 사라지는 NPC) ──
const actors = [];
function addActor(who, x, y, dir, floorKey) {
  const a = {
    who, frames: makePersonFrames(PEOPLE[who].pal, PEOPLE[who]),
    x: x * TILE, y: y * TILE, dir, floor: floorKey, moving: false, anim: 0,
  };
  actors.push(a);
  return a;
}
function removeActor(a) {
  const i = actors.indexOf(a);
  if (i >= 0) actors.splice(i, 1);
}

// ── Esc 메뉴 ──
let notebookFromMenu = false;
let minimapOn = true;

const menuItems = () => [
  { id: 'resume', label: '계속하기' },
  { id: 'notebook', label: '단서 수첩' },
  { id: 'map', label: '전체 지도' },
  { id: 'minimap', label: minimapOn ? '미니맵 끄기' : '미니맵 켜기' },
  { id: 'sound', label: Sound.muted ? '소리 켜기' : '소리 끄기' },
  { id: 'controls', label: `조작 방식: ${Controls.mode === 'touch' ? '터치 (조이스틱)' : '키보드'}` },
  { id: 'reset', label: '처음부터 다시' },
  { id: 'dev', label: '개발자 메뉴 (`)' },
];

function pickMenu(id) {
  switch (id) {
    case 'resume':
      Menu.close();
      break;
    case 'notebook':
      Menu.close();
      Notebook.open(CLUES);
      notebookFromMenu = true;
      break;
    case 'map':
      Menu.close();
      FullMap.open(floor);
      break;
    case 'minimap':
      minimapOn = !minimapOn;
      Menu.show(menuItems(), '', 3);
      break;
    case 'sound':
      Sound.toggleMute();
      Menu.show(menuItems(), '', 4);
      break;
    case 'controls':
      Controls.toggle();
      Menu.show(menuItems(), Controls.mode === 'touch'
        ? '왼쪽 조이스틱으로 이동, 끝까지 밀면 달리기.\nF 조사 · Q 저궁 · ☰ 메뉴 · 수첩 · 지도'
        : 'WASD 이동 · Shift 달리기 · F 조사\nQ 저궁 · Tab 수첩 · M 지도 · Esc 메뉴', 5);
      break;
    case 'reset':
      Menu.show(
        [{ id: 'reset-no', label: '아니요' }, { id: 'reset-yes', label: '네, 처음부터' }],
        '정말 처음부터 다시 할까?\n찾은 단서가 모두 사라진다.',
      );
      break;
    case 'reset-no':
      Menu.show(menuItems());
      break;
    case 'reset-yes':
      Menu.close();
      resetGame();
      break;
    case 'dev':
      Menu.close();
      DevMenu.open(devMenuItems());
      break;
  }
}

// 처음 상태로: 단서 초기화 후 프롤로그(집에서 눈뜨기)부터
function resetGame() {
  Save.clear();
  for (const c of CLUES) c.found = false;
  restartStory();
}

// Esc: 열려 있는 창을 하나 닫거나, 아무것도 없으면 메뉴를 연다
function handleEscape() {
  if (Notebook.isOpen) {
    Notebook.close();
    if (notebookFromMenu) Menu.open(menuItems());
    notebookFromMenu = false;
  } else if (FullMap.isOpen) {
    FullMap.close();
  } else if (Menu.isOpen) {
    Menu.close();
  } else {
    Menu.open(menuItems());
  }
}

// ── 업데이트 ──
let hintShown = true;
let time = 0;
let creakTimer = 0;
function update(dt) {
  time += dt;
  player.moving = false;

  // 개발자 메뉴는 컷신·대사 중에도 열린다 (story.js 의 devMenuItems / pickDev)
  if (tapped.has('dev') || (DevMenu.isOpen && tapped.has('menu'))) {
    if (DevMenu.isOpen) DevMenu.close();
    else DevMenu.open(devMenuItems());
    tapped.clear();
  }
  if (DevMenu.isOpen) {
    if (tapped.has('up')) DevMenu.move(-1);
    if (tapped.has('down')) DevMenu.move(1);
    if (tapped.has('interact')) {
      tapped.delete('interact');
      pickDev(DevMenu.selected.id);
    }
    player.anim = 0;
    return;
  }

  if (fade.dir) {
    updateFade(dt);
    player.anim = 0;
    target = null;
    return;
  }
  if (dialog.pages) {
    updateDialog(dt);
    player.anim = 0;
    return;
  }
  // 과학실 실험 화면 (experiment.js)
  if (Experiment.isOpen) {
    Experiment.update(dt);
    player.anim = 0;
    target = null;
    return;
  }
  if (cutscene) {
    player.anim = 0;
    target = null;
    return;
  }

  if (tapped.has('menu')) handleEscape();

  // 메뉴 / 단서 수첩 / 전체 맵이 열려 있으면 게임은 멈춘다
  if (Menu.isOpen) {
    if (tapped.has('up')) Menu.move(-1);
    if (tapped.has('down')) Menu.move(1);
    if (tapped.has('interact')) {
      tapped.delete('interact'); // 메뉴를 닫은 같은 키 입력으로 조사까지 되지 않게
      pickMenu(Menu.selected.id);
    }
  } else {
    if (tapped.has('mute')) Toast.show(Sound.toggleMute() ? '소리 끔' : '소리 켬');
    if (tapped.has('notebook') && !FullMap.isOpen) {
      if (Notebook.isOpen) handleEscape();
      else Notebook.open(CLUES);
    }
    if (tapped.has('map') && !Notebook.isOpen) {
      if (FullMap.isOpen) FullMap.close();
      else FullMap.open(floor);
    }
    if (Notebook.isOpen) {
      if (tapped.has('up')) Notebook.move(-1);
      if (tapped.has('down')) Notebook.move(1);
    }
  }
  if (Menu.isOpen || Notebook.isOpen || FullMap.isOpen || fade.dir || cutscene) {
    player.anim = 0;
    target = null;
    return;
  }

  if (tapped.has('interact')) {
    tapped.delete('interact');
    examine();
    if (dialog.pages || cutscene) return;
  }
  // Q: 따라다니는 동료에게 묻기 (story.js)
  if (tapped.has('talk') && flags.friendJoined) {
    if (companion.following) {
      runScript('friend');
      return;
    }
    Toast.show(flags.memory ? '저궁이 없는 기억 속' : '저궁은 지금 3층 신문부실에 있다.');
  }

  const dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  const dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
  const moving = dx !== 0 || dy !== 0;

  if (moving) {
    // 대각선 이동 중엔 이미 보고 있던 방향을 유지
    const want = [];
    if (dy < 0) want.push('up');
    if (dy > 0) want.push('down');
    if (dx < 0) want.push('left');
    if (dx > 0) want.push('right');
    if (!want.includes(player.dir)) player.dir = want[0];

    const speed = WALK_SPEED * (keys.has('run') ? RUN_MULT : 1) * (dev.fastMove ? 2.5 : 1) * dt;
    const norm = dx && dy ? Math.SQRT1_2 : 1;
    moveAxis('x', dx * speed * norm);
    moveAxis('y', dy * speed * norm);

    if (player.anim === 0) player.anim = FRAME_TIME; // 첫 걸음부터 발을 뗀다
    player.anim += dt * (keys.has('run') ? RUN_MULT : 1);

    // 1986년 나무 마루는 걸을 때 삐걱거린다
    const [ftx, fty] = feetTile();
    if (floor.map.kinds[fty] && floor.map.kinds[fty][ftx] === 'oldhall' && (creakTimer -= dt) <= 0) {
      Sound.sfx('creak');
      creakTimer = 0.45 + Math.random() * 0.5;
    }

    if (hintShown) {
      hintShown = false;
      setTimeout(() => hint.classList.add('hide'), 2500);
    }
  } else {
    player.anim = 0;
  }
  player.moving = moving;
  updateCompanion(dt);

  // 계단이나 현관 같은 출구를 밟으면
  const warp = floor.map.warpAt(...feetTile());
  if (warp) {
    // once: 그 플래그가 켜지면 다시는 실행 안 하는 이벤트 구역
    if (warp.script) {
      if (!warp.once || !flags[warp.once]) runScript(warp.script);
    } else {
      fadeTo(() => setFloor(warp.to.floor, warp.to));
    }
  }

  target = findTarget();
  updateRegion();
}

// ── 그리기 ──
const camera = { x: 0, y: 0 };
let camFocus = null;   // 컷신에서 화면을 한 자리에 고정할 때 (픽셀 좌표). 층을 옮기면 풀린다

// 맵이 화면보다 작으면 가운데, 크면 캐릭터를 따라가되 맵 밖은 안 보이게
function follow(center, mapSize, view) {
  if (mapSize <= view) return Math.round((mapSize - view) / 2);
  return Math.max(0, Math.min(mapSize - view, center - view / 2));
}

function draw() {
  const px = Math.round(player.x), py = Math.round(player.y);
  const mapW = floor.map.w * TILE, mapH = floor.map.h * TILE;
  const camX = camera.x = follow(camFocus ? camFocus.x : px, mapW, VIEW_W);
  const camY = camera.y = follow(camFocus ? camFocus.y : py - 12, mapH, VIEW_H);

  g.fillStyle = '#000';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  // 버스 창밖 풍경 (맵 그림의 창문이 뚫려 있어서 뒤에 깔린다)
  if (floor.map.scenery !== null) drawScenery(g, -camX, floor.map.scenery * TILE - camY, mapW, 2 * TILE, time);
  if (floor.map.night && floor.map.night.sky) drawStars(camX, camY);
  g.drawImage(floor.canvas, -camX, -camY);

  // 조사 가능한 것 근처면 1픽셀 노란 테두리
  const lit = target && !dialog.pages ? target : null;
  const drawLit = (s, sx, sy) => {
    if (s.prop) g.drawImage(s.src, sx, sy);   // 벽·바닥 장식은 이미 맵에 그려져 있다
    g.drawImage(s.highlight, sx - 1, sy - 1);
  };
  if (lit && !lit.prop) drawLit(lit, lit.ref.x * TILE - camX, lit.ref.y * TILE - camY);

  // 사물과 캐릭터를 발밑(y) 기준으로 정렬해 앞뒤를 맞춘다
  const drawables = [];
  for (const p of floor.props) {
    const sx = p.x * TILE - camX, sy = p.y * TILE - p.up - camY;
    if (sx > VIEW_W || sy > VIEW_H || sx + p.canvas.width < 0 || sy + p.canvas.height < 0) continue;
    const s = lit && lit.prop === p ? lit : null;
    drawables.push({ base: (p.y + p.h) * TILE, draw: () => (s ? drawLit(s, sx, sy) : g.drawImage(p.canvas, sx, sy)) });
  }
  // 컷신에서 걷게 할 땐 scriptAnim (story.js 의 walkActor)
  const walkAnim = player.scriptAnim || (player.moving ? player.anim : 0);
  const frame = walkAnim ? Math.floor(walkAnim / FRAME_TIME) % 4 : 0;
  drawables.push({ base: py, draw: () => g.drawImage(playerFrames[player.dir][frame], px - 8 - camX, py - 22 - camY) });
  for (const a of actors) {
    if (a.floor !== floor.map.n) continue;
    const ax = Math.round(a.x), ay = Math.round(a.y);
    const af = a.moving ? Math.floor(a.anim / FRAME_TIME) % 4 : 0;
    drawables.push({ base: ay, draw: () => g.drawImage(a.frames[a.dir][af], ax - 8 - camX, ay - 22 - camY) });
  }
  if (companion.visible && companion.floor === floor.map.n) {
    const cx = Math.round(companion.x), cy = Math.round(companion.y);
    const cf = companion.moving ? Math.floor(companion.anim / FRAME_TIME) % 4 : 0;
    // 같은 줄이면 플레이어가 앞에 오도록 살짝 뒤로
    drawables.push({ base: cy - 0.5, draw: () => g.drawImage(friendFrames[companion.dir][cf], cx - 8 - camX, cy - 22 - camY) });
  }
  drawables.sort((a, b) => a.base - b.base);
  for (const d of drawables) d.draw();
  if (floor.map.night) {
    drawNight(camX, camY, px, py);
    if (smoke === floor.map.n) drawSmoke();
    // 엔딩 옥상: 고개를 들면 보이는 혜성 — 밤하늘 띠와 함께 화면 위쪽에 겹쳐 그린다
    if (floor.map.night.comet) {
      const sky = g.createLinearGradient(0, 0, 0, 90);
      sky.addColorStop(0, 'rgba(8,12,34,0.95)');
      sky.addColorStop(1, 'rgba(8,12,34,0)');
      g.fillStyle = sky;
      g.fillRect(0, 0, VIEW_W, 90);
      for (let i = 0; i < 40; i++) rect(g, Math.floor(hash(i, 7, 51) * VIEW_W), Math.floor(hash(7, i, 52) * 60), 1, 1, hash(i, Math.floor(time * 2), 53) < 0.08 ? '#8a8aa0' : '#e8e8ff');
      drawComet(250, 26);
    }
  } else if (ambient) {
    for (const c of ambient) {
      g.fillStyle = c;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  // 캐릭터 옆 상호작용 표시 (글자를 또렷하게 하려고 HTML로 띄운다, 위치는 게임 픽셀 단위)
  const showPrompt = lit && !fade.dir && !Experiment.isOpen;
  keyPrompt.classList.toggle('show', !!showPrompt);
  if (showPrompt) {
    keyPrompt.style.setProperty('--x', px + 9 - camX);
    keyPrompt.style.setProperty('--y', py - 16 - camY);
    keyPromptLabel.textContent = lit.ref.prompt || (lit.ref.elevator ? '엘리베이터 타기' : lit.ref.script ? '말 걸기' : '조사하기');
  }

  // 지금 하고 있는 일: 화면을 가리는 게 없을 때만
  const statusOn = !Experiment.isOpen && !dialog.pages && !Notebook.isOpen && !Menu.isOpen && !DevMenu.isOpen
    && !FullMap.isOpen && fade.alpha < 0.5 && !titleEl.classList.contains('show');
  Status.show(statusOn);
  if (statusOn) Status.set(statusLines());

  if (Experiment.isOpen) Experiment.draw(g, time);
  else if (FullMap.isOpen) FullMap.draw(g, floor, player, time);
  else if (minimapOn && !cutscene && !dialog.pages && !Notebook.isOpen && !Menu.isOpen && !DevMenu.isOpen) drawMinimap(g, floor, player, time);

  if (fade.alpha > 0) {
    g.fillStyle = `rgba(0,0,0,${fade.alpha})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (time < glitchUntil) drawGlitch();

  DebugInfo.show(dev.info);
  if (dev.info) {
    const [tx, ty] = feetTile();
    const on = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join(' ');
    DebugInfo.set(
      `FPS ${Math.round(fps)}  (프레임 ${(1000 / fps).toFixed(1)}ms)\n` +
      `${floor.map.label} [${floor.map.n}]  타일 ${tx},${ty}  ${currentRegion ? currentRegion.name : '-'}\n` +
      `단서 ${CLUES.filter(c => c.found).length}/${CLUES.length}  컷신 ${cutscene ? 'O' : 'X'}\n` +
      `숨은 값: 증거 ${route.evidence} · 기사 ${route.article} · 마음 연수 ${route.heart.minkyung} 이노 ${route.heart.dohyun} 아빠 ${route.heart.dad}\n` +
      `플래그: ${on || '-'}`,
    );
  }
}

// ── 시간대 색감: 밤이 아닌 장소에 덧칠할 색들 (예: 방과 후 노을), null 이면 없음 ──
let ambient = null;
const DUSK = ['rgba(255,120,40,0.22)', 'rgba(60,20,70,0.16)'];
const EVENING = ['rgba(18,26,72,0.4)', 'rgba(255,200,120,0.06)'];   // 저녁 집: 푸른 어둠 + 형광등

// ── 불이 난 층: 연기 + 일렁이는 붉은빛 (smoke = 그 층 이름, 없으면 null) ──
let smoke = null;
function drawSmoke() {
  g.fillStyle = 'rgba(120,112,118,0.24)';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.fillStyle = `rgba(255,70,20,${0.05 + Math.abs(Math.sin(time * 5)) * 0.06})`;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
}

// ── 회상으로 넘어갈 때 지지직 ──
let glitchUntil = 0;
function startGlitch(sec) {
  glitchUntil = time + sec;
  Sound.sfx('static');
}
function drawGlitch() {
  for (let i = 0; i < 16; i++) {
    const y = Math.floor(Math.random() * VIEW_H), h = 1 + Math.floor(Math.random() * 3);
    const c = ['255,255,255', '120,220,255', '255,90,120'][i % 3];
    g.fillStyle = `rgba(${c},${0.08 + Math.random() * 0.3})`;
    g.fillRect(Math.floor(Math.random() * 40) - 20, y, VIEW_W, h);
  }
}

// ── 밤 장면 (1986년 회상) ──
// 화면 전체를 어둡게 덮고, 손전등(플레이어 주변)과 맵의 lights 자리만 둥글게 걷어낸다
const nightLayer = makeCanvas(VIEW_W, VIEW_H);
const ng = nightLayer.getContext('2d');
const FLASHLIGHT = 62;

function drawNight(camX, camY, px, py) {
  const { dark } = floor.map.night;
  ng.globalCompositeOperation = 'source-over';
  ng.clearRect(0, 0, VIEW_W, VIEW_H);
  ng.fillStyle = `rgba(6,8,24,${dark})`;
  ng.fillRect(0, 0, VIEW_W, VIEW_H);
  ng.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => {
    const gr = ng.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.55, 'rgba(0,0,0,0.85)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ng.fillStyle = gr;
    ng.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const flicker = Math.sin(time * 13) * 1.2 + Math.sin(time * 31) * 0.8;
  hole(px - camX, py - 10 - camY, FLASHLIGHT + flicker);
  for (const l of floor.map.lights) hole(l.x * TILE - camX, l.y * TILE - camY, l.r);
  g.drawImage(nightLayer, 0, 0);

  // 색 있는 불빛 (암실 안전등, 난로 …)은 위에 한 번 더 물들인다
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const l of floor.map.lights) {
    if (!l.color) continue;
    const x = l.x * TILE - camX, y = l.y * TILE - camY;
    const gr = g.createRadialGradient(x, y, 0, x, y, l.r);
    gr.addColorStop(0, `rgba(${l.color},0.32)`);
    gr.addColorStop(1, `rgba(${l.color},0)`);
    g.fillStyle = gr;
    g.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
  }
  g.restore();
}

// 바깥 장면의 별 (맵 바깥 검은 곳에 깔린다, 카메라보다 천천히 움직인다)
function drawStars(camX, camY) {
  for (let i = 0; i < 90; i++) {
    const sx = Math.floor((hash(i, 1, 21) * 640 - camX * 0.3) % 640 + 640) % 640 - 160;
    const sy = Math.floor((hash(1, i, 22) * 480 - camY * 0.3) % 480 + 480) % 480 - 120;
    const tw = hash(i, Math.floor(time * 2), 23) < 0.06 ? '#8a8aa0' : '#e8e8ff';
    rect(g, sx, sy, 1, 1, tw);
  }
}

// 40년 만에 돌아온 혜성 (하늘에 고정, 꼬리는 천천히 일렁인다)
function drawComet(x, y) {
  for (let i = 0; i < 70; i++) {
    const a = 0.5 * (1 - i / 70);
    const wob = Math.sin(time * 1.5 + i * 0.15) * (i / 70) * 2;
    g.fillStyle = `rgba(170,200,255,${a})`;
    g.fillRect(Math.round(x - i * 1.2), Math.round(y + i * 0.45 + wob), 1 + (i >> 4), 1 + (i >> 5));
  }
  rect(g, Math.round(x) - 1, Math.round(y) - 1, 3, 3, '#ffffff');
  rect(g, Math.round(x) - 2, Math.round(y), 5, 1, 'rgba(255,255,255,0.6)');
}

// ── 루프 ──
let last = performance.now();
// 초당 프레임 (개발자 메뉴 "좌표·플래그 보기"에 표시) — 튀지 않게 부드럽게 평균
let fps = 60;
function loop(now) {
  const real = (now - last) / 1000;
  if (real > 0) fps += (1 / real - fps) * 0.05;
  const dt = Math.min(real, 1 / 30);
  last = now;
  Controls.update(dt);
  update(dt);
  tapped.clear();
  draw();
  requestAnimationFrame(loop);
}
// story.js 까지 다 읽은 뒤에 시작 (스크립트 사이에 첫 프레임이 돌면 story.js 쪽 이름을 못 찾는다)
addEventListener('DOMContentLoaded', () => {
  last = performance.now();
  requestAnimationFrame(loop);
});
