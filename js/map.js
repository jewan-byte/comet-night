'use strict';
// ─────────────────────────────────────────────
// map.js — 동사란고 1~3층과 운동장 (2026년), 주인공의 집, 등굣길 버스
// 좌표는 모두 타일 단위. 실내 방을 파내면(carve) 주변 벽은 자동으로 생긴다.
// obj/dec 마지막 인자로 clue(이름, 대사...)를 넘긴 것만 조사(F)할 수 있고, 조사하면 단서 수첩에 기록된다.
//
// 모든 층 공통 뼈대: 복도(y16~19), 엘리베이터(x32~33 벽), 계단(x30~37 아래쪽)
// ─────────────────────────────────────────────

const OUTDOOR = new Set(['grass', 'dirt', 'path']);

// 단서: 수첩에 적힐 이름 + 조사했을 때 나오는 대사 (한 줄 = 대사창 한 페이지)
const clue = (name, ...text) => ({ name, text });
// 수첩에 안 남는 그냥 살펴보기
const look = (...text) => ({ text });

// n: 학교 층 번호(1~3) 또는 장소 이름('home', 'bus', 'old1' …)
// style: 벽 모양 ('home', 'bus', 'roof'), scenery: 창밖 풍경이 흐르는 줄(타일 y)
// night: 밤 장면 { dark: 어둠 진하기 0~1, sky: 바깥에 별 } — 손전등과 lights 만 밝다 (main.js)
function createFloor(n, W, H, { label = `${n}층`, style = null, scenery = null, night = null } = {}) {
  const tiles = Array.from({ length: H }, () => new Array(W).fill(null));
  const b = {
    n, W, H, tiles, label, style, scenery, night,
    regions: [], deco: [], objects: [], warps: [], lights: [],
    carve(x, y, w, h, type) {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) tiles[yy][xx] = type;
    },
    room(name, x, y, w, h, type) {
      b.carve(x, y, w, h, type);
      b.regions.push({ name, x, y, w, h });
    },
    obj(type, x, y, w = 1, h = 1, info) {
      const o = { type, x, y, w, h, ...info };
      b.objects.push(o);
      return o;
    },
    dec(type, x, y, w = 1, h = 1, info) {
      const d = { type, x, y, w, h, ...info };
      b.deco.push(d);
      return d;
    },
    // 밟으면 다른 층으로 이동 (to.x, to.y 는 도착 지점 픽셀/16, y는 발밑)
    warp(x, y, w, h, to) {
      b.warps.push({ x, y, w, h, to });
    },
    // 밤 장면의 불빛: 중심(타일), 반지름(px), 색('r,g,b' — 없으면 어둠만 걷힌다)
    light(x, y, r, color = null) {
      b.lights.push({ x, y, r, color });
    },
  };
  return b;
}

// ── 공통 뼈대 ──────────────────────────────────

const ELEVATOR_ARRIVE = { x: 33, y: 16, dir: 'down' };

function core(b, { up, down, roof }) {
  const n = b.n;
  b.room(`${n}층 복도`, 2, 16, 60, 4, 'hall');

  // 엘리베이터: 복도 위쪽 벽에 움푹 들어간 자리
  b.carve(32, 14, 2, 2, 'hall');
  const ev = b.dec('elevator', 32, 12, 2, 2);
  ev.floor = n;
  ev.elevator = true;

  // 계단: 왼쪽 절반은 올라가는 계단, 오른쪽 절반은 내려가는 계단
  b.room('계단', 30, 22, 8, 10, 'hall');
  b.carve(31, 20, 6, 2, 'hall');
  if (up || roof) {
    b.carve(30, 25, 4, 7, 'stairs');
    b.dec('arrowUp', 31, 24, 2, 1);
  }
  b.obj('rail', 33, 25, 1, 7);
  if (up) b.warp(30, 30, 4, 2, { floor: n + 1, x: 36, y: 25, dir: 'up' });
  if (roof) b.obj('chain', 30, 27, 4, 1, clue('옥상 출입 금지', '쇠사슬로 막혀 있다. "옥상 출입 금지"', '1986년엔 저 위에서 혜성을 봤다고 했던가.'));
  if (down) {
    b.carve(34, 25, 4, 7, 'stairsDown');
    b.dec('arrowDown', 35, 24, 2, 1);
    b.warp(34, 30, 4, 2, { floor: n - 1, x: 32, y: 25, dir: 'up' });
  } else {
    b.obj('plant', 37, 31);
  }
}

// 위쪽 줄 교실 (문은 아래 벽, 칠판은 위 벽)
function topClassroom(b, name, x0, w = 14) {
  b.room(name, x0, 4, w, 10, 'wood');
  b.carve(x0 + w - 4, 14, 2, 2, 'door');
  b.dec('window', x0 + 1, 2, 2, 2);
  b.dec('blackboard', x0 + ((w - 6) >> 1), 2, 6, 2);
  b.dec('window', x0 + w - 3, 2, 2, 2);
  b.obj('plant', x0, 4);
  b.obj('podium', x0 + (w >> 1) - 1, 5, 2, 1);
  for (let cx = 2; cx <= w - 3; cx += 3) {
    for (const cy of [7, 9, 11]) b.obj('desk', x0 + cx, cy, 1, 2);
  }
}

// 아래쪽 줄 교실 (문과 칠판 모두 위 벽)
function bottomClassroom(b, name, x0, w = 14) {
  b.room(name, x0, 22, w, 9, 'wood');
  b.carve(x0 + w - 4, 20, 2, 2, 'door');
  const bw = Math.min(6, w - 6);
  b.dec('blackboard', x0 + 2, 21, bw, 1);
  b.obj('podium', x0 + 1 + (bw >> 1), 22, 2, 1);
  for (let cx = 2; cx <= w - 3; cx += 3) {
    for (const cy of [24, 26, 28]) b.obj('desk', x0 + cx, cy, 1, 2);
  }
}

// ── 1층 (+ 앞마당, 운동장) ─────────────────────

function build1F() {
  const b = createFloor(1, 96, 64);
  core(b, { up: true });

  b.obj('lockers', 3, 16, 8, 1);
  b.obj('lockers', 19, 16, 8, 1);
  b.dec('bulletin', 14, 15, 4, 1, clue('공사 안내문', '게시판. "과학준비실 리모델링 공사 — 12월 1일 착공"', '공사가 시작되면 준비실 물건은 전부 폐기된다고 한다.'));
  b.dec('bulletin', 30, 15, 2, 1);
  b.dec('extinguisher', 34, 15);
  b.dec('bulletin', 40, 15, 4, 1);
  b.obj('fountain', 46, 16);
  b.obj('plant', 52, 16);
  b.dec('bulletin', 58, 15, 3, 1);
  b.obj('plant', 61, 16);

  topClassroom(b, '1학년 1반', 2);
  topClassroom(b, '1학년 2반', 18);
  // 1학년 1반, 창가 맨 뒷자리
  Object.assign(b.objects.find(o => o.type === 'desk' && o.x === 13 && o.y === 11),
    clue('책상의 낙서', '책상 모서리에 무언가 새겨져 있다.', '"76년 뒤에 또 만나자"'));

  // 과학실
  b.room('과학실', 34, 4, 16, 10, 'lab');
  b.carve(36, 14, 2, 2, 'door');
  b.dec('window', 35, 2, 2, 2);
  b.dec('blackboard', 39, 2, 6, 2, clue('가스 밸브 경고', '칠판. "실험 후 가스 밸브 확인!"이라고 크게 적혀 있다.'));
  b.dec('window', 47, 2, 2, 2);
  b.obj('podium', 41, 4, 2, 1);
  for (const tx of [36, 41, 46]) {
    b.obj('labtable', tx, 6, 3, 2);
    b.obj('labtable', tx, 10, 3, 2);
  }
  // 2장: 방과 후에 과학실에 들어서면 오민경 선생님 장면 (story.js — 2장 전엔 아무 일 없다)
  b.warps.push({ x: 34, y: 4, w: 16, h: 10, script: 'ch2Intro', once: 'ch2Intro' });

  // 과학준비실 (1986년 화재 현장)
  b.room('과학준비실', 52, 4, 10, 10, 'lab');
  b.carve(55, 14, 2, 2, 'door');
  b.carve(50, 8, 2, 2, 'door'); // 과학실과 연결
  b.obj('shelf', 52, 4, 3, 1);
  b.obj('shelf', 56, 4, 3, 1);
  b.obj('cabinet', 60, 4, 2, 1, {
    ...clue('천문부 이름표', '서류함.', '맨 아래 칸에 "천문부"라고 적힌 이름표가 붙어 있다.'),
    // 1장 단서가 다 모이면 조사했을 때 관측일지 장면 (story.js)
    event: { when: 'ch1Ready', done: 'foundLog', script: 'findLog' },
  });
  b.dec('clock', 55, 2, 1, 2, clue('멈춘 시계', '벽시계가 4시 40분에 멈춰 있다.'));
  b.obj('table', 55, 8, 3, 2, clue('먼지 없는 자국', '작업대 위에 먼지가 수북하다.', '…가운데만 네모나게 먼지가 없다.', '최근에 누군가 뭔가를 치워 간 것 같다.'));
  b.dec('scorch', 52, 10, 3, 3, clue('그을음 자국', '바닥에 오래된 그을음 자국이 있다.', '몇 번이고 닦아낸 흔적이 보인다.'));
  b.obj('boxes', 60, 12);
  b.obj('boxes', 61, 12);
  b.obj('boxes', 61, 11);
  // 셋째 날: 사진기를 들고 오면 임시 암실에서 원판 현상 (story.js 의 prepRoom)
  b.warps.push({ x: 52, y: 4, w: 10, h: 10, script: 'prepRoom' });

  // 중앙 현관
  b.room('중앙 현관', 2, 22, 12, 10, 'hall');
  b.carve(4, 20, 8, 2, 'hall');
  b.obj('shoelocker', 5, 24, 6, 1);
  b.obj('shoelocker', 5, 27, 6, 1);
  b.obj('shoelocker', 12, 23, 2, 1);
  b.dec('mat', 6, 30, 4, 2);

  // 기록 보관실
  b.room('기록 보관실', 16, 22, 12, 9, 'carpet');
  b.carve(26, 20, 2, 2, 'door');
  b.obj('bookshelf', 16, 22, 8, 1, clue('비어 있는 1986년', '졸업앨범이 연도순으로 꽂혀 있다.', '…1986년 칸만 비어 있다.'));
  b.obj('bookshelf', 17, 25, 4, 1);
  b.obj('bookshelf', 22, 25, 4, 1);
  b.obj('bookshelf', 17, 28, 4, 1);
  b.obj('bookshelf', 22, 28, 4, 1);

  // 과학탐구부실 (주인공의 동아리방)
  b.room('과학탐구부실', 40, 22, 12, 9, 'wood');
  b.carve(44, 20, 2, 2, 'door');
  b.dec('whiteboard', 46, 21, 3, 1, clue('폐부 심사', '"과학탐구부 — 폐부 심사 11월 30일"', '그 아래에 작게 "포기 안 함"이라고 적혀 있다.'));
  b.obj('telescope', 41, 22, 1, 1, clue('천문부 망원경', '오래된 굴절망원경이다.', '받침대에 "1986 천문부"라고 긁힌 자국이 있다.'));
  b.obj('bookshelf', 49, 22, 3, 1);
  b.obj('table', 44, 25, 4, 2, clue('과학탐구부 활동 일지', '과학탐구부 활동 일지.', '마지막 기록은 3주 전. 부원 수: 1명.'));
  b.obj('boxes', 40, 30, 1, 1, { script: 'clubBox', prompt: '조사하기' });   // 천문부 옛 장비 (셋째 날)
  b.obj('boxes', 41, 30);
  b.obj('plant', 51, 30);

  // 교무실
  b.room('교무실', 54, 22, 8, 9, 'wood');
  b.carve(56, 20, 2, 2, 'door');
  b.dec('whiteboard', 58, 21, 2, 1);
  b.obj('plant', 54, 22);
  b.obj('cabinet', 60, 22, 2, 1, clue('잠긴 서랍', '서류함.', '"학생 지도 기록" 서랍만 잠겨 있다.'));
  for (const [tx, ty] of [[55, 24], [59, 24], [55, 27], [59, 27]]) b.obj('tdesk', tx, ty, 2, 2);
  // 2장 둘째 날: 교무실에 들어서면 이도현 교장 장면 / 테이프를 들고 오면 소리 분석 (story.js 의 office)
  b.warps.push({ x: 54, y: 22, w: 8, h: 9, script: 'office' });

  // 건물 남쪽 외벽 + 현관 통로
  b.carve(1, 32, 62, 3, 'wall');
  b.carve(6, 32, 4, 3, 'hall');
  // 넷째 날: 할 일을 마치고 현관을 나서면 집으로 (story.js 의 schoolExit)
  b.warps.push({ x: 6, y: 33, w: 4, h: 2, script: 'schoolExit' });
  b.dec('plaque', 5, 32, 6, 1);
  for (const wx of [2, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59]) b.dec('facadeWindow', wx, 33, 2, 2);

  // 앞마당
  b.room('앞마당', 1, 35, 62, 5, 'grass');
  b.carve(2, 35, 59, 2, 'path');
  b.carve(6, 37, 4, 3, 'path');
  b.obj('stage', 28, 37, 8, 2);
  b.obj('flagpole', 37, 37);
  for (const tx of [3, 12, 19, 42, 49, 56]) b.obj('tree', tx, 38, 2, 1);
  b.obj('bench', 15, 38, 2, 1);
  b.obj('bench', 52, 38, 2, 1);

  // 운동장
  b.room('운동장', 1, 40, 62, 23, 'grass');
  b.carve(6, 40, 52, 20, 'dirt');
  b.dec('track', 6, 40, 52, 20);
  b.obj('goal', 7, 48, 1, 3);
  b.obj('goal', 56, 48, 1, 3).flip = true;
  for (const ty of [44, 50, 56]) {
    b.obj('tree', 2, ty, 2, 1);
    b.obj('tree', 59, ty, 2, 1);
  }
  b.obj('fence', 1, 35, 1, 27);
  b.obj('fence', 62, 35, 1, 21);   // 오른쪽 울타리는 체육관 가는 길(y56~58)만 비운다
  b.obj('fence', 62, 59, 1, 3);
  b.obj('fence', 1, 62, 65, 1);

  // 체육관 (운동장 오른쪽)
  b.carve(63, 35, 3, 28, 'grass');
  b.obj('fence', 63, 35, 3, 1);
  b.carve(62, 56, 4, 3, 'path');
  b.room('체육관', 67, 38, 26, 23, 'gym');
  b.carve(66, 56, 1, 3, 'door');
  b.dec('court', 69, 40, 22, 19);
  b.dec('scoreboard', 70, 36, 4, 2);
  b.dec('window', 75, 36, 2, 2);
  b.dec('window', 84, 36, 2, 2);
  b.dec('window', 88, 36, 2, 2);
  b.obj('hoop', 79, 38, 2, 1);
  b.obj('hoop', 79, 60, 2, 1);
  b.obj('ballcart', 91, 40);
  b.obj('vault', 91, 44, 2, 1);
  b.obj('gymmat', 91, 48, 2, 1);
  b.obj('gymmat', 91, 50, 2, 1);
  b.obj('lostbox', 92, 54, 1, 1, clue('천문부 완장', '분실물 상자. 체육복, 물병, 짝 잃은 실내화…', '맨 밑바닥에 빛바랜 완장이 하나 깔려 있다.', '"천문부"라고 수놓아져 있다.',
    '뒤집어 보니 안쪽에 이름이 적혀 있다. "3학년 이도현"',
    '천 한쪽 끝이 검게 그을려 있다.'));
  b.obj('bench', 67, 42, 2, 1);
  b.obj('bench', 67, 47, 2, 1);
  // 금요일 강연 준비: 현수막, 무대, 무대 옆 전시함 (story.js 의 gym / gymExhibit)
  b.dec('banner', 77, 36, 6, 2, look('현수막. "박영철 혜성 귀환 기념 특별 강연 — 11월 6일(금) 오후 7시"'));
  b.obj('stage', 76, 40, 8, 2);
  b.obj('trophycase', 86, 41, 3, 1, { script: 'gymExhibit', prompt: '조사하기' });
  b.warps.push({ x: 67, y: 38, w: 26, h: 23, script: 'gym' });

  return finishFloor(b);
}

// ── 2층 ───────────────────────────────────────

function build2F() {
  const b = createFloor(2, 66, 34);
  core(b, { up: true, down: true });

  b.obj('lockers', 3, 16, 8, 1);
  b.obj('lockers', 19, 16, 8, 1);
  b.obj('lockers', 35, 16, 8, 1);
  b.dec('bulletin', 14, 15, 4, 1);
  b.dec('extinguisher', 48, 15);
  b.obj('trophycase', 51, 16, 4, 1, clue('학교 연혁',
    '복도 전시장. 트로피와 낡은 사진 사이에 학교 연혁표가 붙어 있다.',
    '"1972 개교 … 1986.4 과학준비실 화재 … 1987 옥상 천문대 철거"',
    '천문대가 있었구나. 그것도 화재 바로 다음 해에 없어졌다.'));
  b.obj('plant', 61, 16);

  topClassroom(b, '2학년 1반', 2);
  topClassroom(b, '2학년 2반', 18);
  topClassroom(b, '2학년 3반', 34);
  topClassroom(b, '2학년 4반', 50, 12);
  b.obj('easel', 34, 12, 2, 1, clue('40년 전 2학년 3반',
    '교실 뒤에 학급 과제 게시판이 세워져 있다. "40년 전 우리 반"',
    '빛바랜 단체 사진. 앞줄에서 두 학생이 어깨동무를 하고 웃고 있다.',
    '사진 아래 이름표… "한정우", "이도현".',
    '한정우. …아빠 이름이다.'));

  // 음악실
  b.room('음악실', 2, 22, 26, 9, 'wood');
  b.carve(24, 20, 2, 2, 'door');
  b.dec('staffboard', 8, 21, 8, 1);
  b.obj('speaker', 2, 22);
  b.obj('speaker', 27, 22, 1, 1, clue('카세트테이프',
    '스피커 위에 먼지 쌓인 카세트테이프가 하나 얹혀 있다.',
    '라벨에 볼펜 글씨. "86.3.21 새벽 합주 — 축제 연습"',
    '그날 밤… 음악부도 학교에 남아 있었던 걸까.',
    '녹음된 소리를 들어 보면 뭔가 알 수 있을지도 모른다.'));
  b.obj('piano', 3, 24, 3, 2, clue('76년의 궤도', '그랜드 피아노.', '악보대에 손글씨 악보가 끼워져 있다. 제목은 "76년의 궤도".'));
  b.obj('stool', 7, 25);
  b.obj('drums', 20, 23, 2, 2);
  b.obj('guitar', 26, 25);
  b.obj('guitar', 26, 27);
  b.obj('xylophone', 3, 29, 2, 1);
  b.obj('cabinet', 17, 22, 2, 1, clue('핼리 관측회 전단',
    '악보장 맨 아래 칸. 옛 축제 팸플릿 사이에 전단 한 장이 끼어 있다.',
    '"천문부 핼리 혜성 관측회 — 3월 셋째 주 금요일 새벽 4시, 옥상. 누구나 환영!"',
    '귀퉁이에 볼펜 글씨. "선생님 허락 받음 (구두)"',
    '구두로… 정식 허가는 아니었다는 뜻일까.'));
  for (let sx = 9; sx <= 21; sx += 2) {
    b.obj('stool', sx, 27);
    b.obj('stool', sx, 29);
  }

  bottomClassroom(b, '2학년 5반', 40);

  // 2층에 처음 올라오면 하율에게 신문부 호출 (복도·엘리베이터 앞·계단참)
  for (const [x, y, w, h] of [[2, 16, 60, 4], [32, 14, 2, 2], [30, 20, 8, 5]]) {
    b.warps.push({ x, y, w, h, script: 'newspaperCall', once: 'calledAway' });
  }

  // 화장실
  b.room('화장실', 56, 22, 6, 9, 'lab');
  b.carve(58, 20, 2, 2, 'door');
  b.obj('stall', 56, 22, 2, 2);
  b.obj('stall', 60, 22, 2, 2);
  b.obj('sink', 56, 28, 2, 1);
  b.obj('sink', 60, 28, 2, 1);

  return finishFloor(b);
}

// ── 3층 ───────────────────────────────────────

function build3F() {
  const b = createFloor(3, 66, 34);
  core(b, { roof: true, down: true });

  b.obj('lockers', 3, 16, 8, 1);
  b.obj('lockers', 19, 16, 8, 1);
  b.obj('lockers', 35, 16, 8, 1);
  b.dec('bulletin', 14, 15, 4, 1);
  b.dec('extinguisher', 48, 15);
  b.dec('clock', 51, 15);
  b.obj('plant', 61, 16);

  topClassroom(b, '3학년 1반', 2);
  topClassroom(b, '3학년 2반', 18);
  topClassroom(b, '3학년 3반', 34);
  topClassroom(b, '3학년 4반', 50, 12);
  bottomClassroom(b, '3학년 5반', 2);

  // 신문부실 (하율의 동아리방)
  b.room('신문부실', 18, 22, 10, 9, 'wood');
  b.carve(24, 20, 2, 2, 'door');
  b.dec('bulletin', 19, 21, 4, 1);
  b.obj('tdesk', 19, 24, 2, 2);
  b.obj('tdesk', 22, 24, 2, 2);
  b.obj('cabinet', 26, 22, 2, 1, clue('1986년 학보',
    '서류함 맨 아래 칸에 누렇게 바랜 학보가 있다.',
    '"동사란 학보 1986년 4월호 — 과학준비실 화재, 천문부 학생 부주의로 결론"',
    '"천문부는 이번 학기를 끝으로 폐지된다."',
    '기사 맨 끝에 기자 이름이 적혀 있다. "1학년 오민경"'));
  b.obj('boxes', 18, 29, 1, 1, clue('빈 원판 봉투',
    '사진 원판 상자. 연도별로 봉투가 꽂혀 있다.',
    '"1986.3 천문부 핼리 혜성 관측" 봉투만… 텅 비어 있다.'));
  b.obj('boxes', 19, 29);
  b.obj('npc', 26, 27, 1, 1, { who: 'editor', dir: 'left', script: 'editor' });
  // 처음 들어오면 신문부 장면
  b.warps.push({ x: 18, y: 22, w: 10, h: 9, script: 'newsroom', once: 'metNewsroom' });
  // 2층을 건너뛰고 바로 3층에 오면 여기서 신문부 호출 (복도·엘리베이터 앞·계단참)
  for (const [x, y, w, h] of [[2, 16, 60, 4], [32, 14, 2, 2], [30, 20, 8, 5]]) {
    b.warps.push({ x, y, w, h, script: 'newspaperCall3F', once: 'calledAway' });
  }

  // 자율학습실 (1986년 목격자가 야자를 하던 자리)
  b.room('자율학습실', 40, 22, 22, 9, 'carpet');
  b.carve(42, 20, 2, 2, 'door');
  b.dec('bulletin', 46, 21, 4, 1, clue('야간 자율학습 출석부', '"야간 자율학습 출석부"', '맨 아래에 "1986년부터 이어온 전통"이라고 적혀 있다.'));
  b.dec('clock', 52, 21);
  for (const tx of [45, 48, 51, 54, 57]) {
    b.obj('studydesk', tx, 24, 2, 2);
    b.obj('studydesk', tx, 27, 2, 2);
  }
  b.obj('plant', 61, 22);

  return finishFloor(b);
}

// ── 벽 생성 · 충돌 · 조사 ─────────────────────

function finishFloor(b) {
  const { W, H, tiles, regions, deco, objects, warps } = b;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const isFloor = (x, y) => inside(x, y) && tiles[y][x] !== null && tiles[y][x] !== 'wall';
  const isIndoor = (x, y) => isFloor(x, y) && !OUTDOOR.has(tiles[y][x]);
  const isOutdoor = (x, y) => isFloor(x, y) && OUTDOOR.has(tiles[y][x]);

  // 실내 바닥을 둘러싸는 벽
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (tiles[y][x] !== null) continue;
      let near = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) near ||= isIndoor(x + dx, y + dy);
      if (near) tiles[y][x] = 'wall';
    }
  }
  // 바닥 위쪽 벽은 한 칸 더 높여서 벽면이 보이게
  for (let y = 1; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (tiles[y][x] === 'wall' && isIndoor(x, y + 1) && tiles[y - 1][x] === null) tiles[y - 1][x] = 'wall';
    }
  }

  // 그릴 모양
  const isWallAt = (x, y) => inside(x, y) && tiles[y][x] === 'wall';
  const kinds = tiles.map((row, y) => row.map((t, x) => {
    if (t !== 'wall') return t;
    if (isOutdoor(x, y + 1)) return 'facadeLower';
    if (isFloor(x, y + 1)) return 'faceLower';
    if (isWallAt(x, y + 1) && isOutdoor(x, y + 2)) return 'facadeUpper';
    const aboveEmpty = !inside(x, y - 1) || tiles[y - 1][x] === null;
    if (isWallAt(x, y + 1) && isIndoor(x, y + 2) && aboveEmpty) return 'faceUpper';
    return 'wallTop';
  }));

  // 충돌
  const solid = tiles.map(row => row.map(t => t === null || t === 'wall'));
  for (const o of objects) {
    for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) solid[yy][xx] = true;
  }

  const covers = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

  return {
    n: b.n,
    label: b.label,
    style: b.style,
    scenery: b.scenery,
    night: b.night,
    lights: b.lights,
    w: W,
    h: H,
    kinds,
    regions,
    deco,
    objects,
    isFloor,
    isSolid: (x, y) => !inside(x, y) || solid[y][x],
    regionAt: (x, y) => regions.find(r => covers(r, x, y)) || null,
    warpAt: (x, y) => warps.find(r => covers(r, x, y)) || null,
    // 조사(F)할 수 있는 것: 대사가 있는 사물·장식, 엘리베이터, 말 걸 수 있는 사람(script)
    examinables: [...objects, ...deco].filter(r => r.text || r.elevator || r.script),
  };
}

// ── 주인공의 집 ───────────────────────────────

function buildHome() {
  const b = createFloor('home', 34, 24, { label: '집', style: 'home' });

  // 내 방
  b.room('내 방', 2, 4, 10, 8, 'wood');
  b.obj('bed', 2, 4, 2, 3);
  b.dec('poster', 5, 2, 2, 2, look('별자리 포스터. 어릴 때부터 붙어 있던 거다.', '구석에 작게 혜성이 그려져 있다.'));
  b.dec('window', 8, 2, 2, 2);
  b.obj('tdesk', 8, 4, 2, 2, look('책상 위에 과학탐구부 활동 계획서가 펼쳐져 있다.', '"폐부 심사까지 4주" — 빨간 펜으로 동그라미가 쳐져 있다.'));
  b.obj('wardrobe', 10, 4, 2, 1);
  b.obj('bookshelf', 2, 10, 3, 1);
  b.obj('plant', 11, 11);
  b.carve(12, 9, 2, 2, 'door');

  // 거실 + 부엌
  b.room('거실', 14, 4, 16, 12, 'wood');
  b.carve(24, 4, 6, 4, 'lab');
  b.regions.unshift({ name: '부엌', x: 24, y: 4, w: 6, h: 4 });
  b.obj('tv', 15, 4, 3, 1);
  b.obj('sofa', 15, 8, 4, 1);
  b.dec('window', 20, 2, 2, 2);
  b.dec('clock', 23, 2, 1, 2, { script: 'homeClock', prompt: '조사하기' });   // 아침·저녁마다 다르다 (story.js)
  b.dec('window', 25, 2, 2, 2);
  b.obj('counter', 24, 4, 4, 1);
  b.obj('fridge', 28, 4, 2, 1);
  b.obj('npc', 21, 6, 1, 1, { who: 'dad', dir: 'down', script: 'dad' });
  b.obj('dining', 20, 7, 3, 2);
  b.obj('sideboard', 25, 13, 3, 1, {
    ...clue('아빠의 사진', '장식장 위에 낡은 사진이 놓여 있다.', '망원경 옆에 선 고등학생들. 가운데서 웃고 있는 건… 아빠다.', '뒷면에 볼펜으로 적혀 있다. "1986. 3. 천문부 — 핼리 혜성 관측 전날"'),
    flag: 'sawPhoto',
  });
  b.obj('bag', 29, 14, 1, 1, { script: 'dadBag', prompt: '조사하기' });   // 넷째 날 저녁: 뜯긴 일지 장 (story.js)
  b.obj('plant', 14, 15);

  // 현관 (아래로 나가면 등교)
  b.carve(19, 16, 2, 2, 'door');
  b.room('현관', 17, 18, 6, 3, 'hall');
  b.obj('shoelocker', 17, 18, 2, 1);
  b.dec('mat', 18, 19, 4, 2);
  b.carve(19, 21, 2, 1, 'door');
  b.warps.push({ x: 19, y: 21, w: 2, h: 1, script: 'leaveHome' });

  return finishFloor(b);
}

// ── 등굣길 버스 (창밖 풍경이 흘러간다) ────────────

function buildBus() {
  const b = createFloor('bus', 32, 12, { label: '버스', style: 'bus', scenery: 2 });
  b.room('버스', 2, 4, 28, 5, 'busfloor');
  for (let wx = 3; wx < 28; wx += 4) b.dec('busWindow', wx, 2, 3, 2);

  // 승객은 좌석보다 먼저 넣어야 좌석이 하반신을 가려서 앉은 것처럼 보인다
  const seat = (x, y, who) => {
    if (who) b.obj('npc', x, y, 1, 1, { who, dir: 'right' });
    b.obj('busseat', x, y);
  };
  for (const [x, who] of [[3], [5, 'student2'], [7], [9, 'student1'], [11], [13], [15], [17, 'student3'], [19], [21], [23]]) seat(x, 4, who);
  for (const [x, who] of [[4], [6], [8, 'student1'], [10], [16], [18], [20, 'student2'], [22]]) seat(x, 8, who);
  b.obj('buspole', 12, 6);
  b.obj('buspole', 24, 6);
  b.obj('npc', 28, 6, 1, 1, { who: 'driver', dir: 'right' });

  return finishFloor(b);
}

// ── 2026년 옥상 (엔딩: 40년 만에 돌아온 혜성을 본다) ────────
function buildRoof() {
  const b = createFloor('roof26', 40, 26, { label: '옥상', style: 'roof', night: { dark: 0.62, sky: true, comet: true } });
  b.room('옥상', 2, 3, 36, 19, 'roof');
  b.carve(18, 22, 4, 2, 'stairsDown');
  // 천문대가 있던 자리: 둥근 기초만 남았다
  b.dec('scorch', 4, 4, 6, 4, look('둥글게 남은 콘크리트 자국. 1987년에 철거된 천문대 자리다.'));
  b.obj('chain', 18, 21, 4, 1, look('쇠사슬. 오늘 밤만 풀려 있다.'));
  b.light(20, 18, 30, '255,210,150');
  return finishFloor(b);
}

function buildWorld() {
  // 1986년 학교 (회상 장면 무대)는 map1986.js
  return { home: buildHome(), bus: buildBus(), 1: build1F(), 2: build2F(), 3: build3F(), roof26: buildRoof(), ...buildPast() };
}

// 바닥·벽·장식을 한 장의 큰 캔버스에 미리 그려둔다
function renderFloor(floor) {
  const c = makeCanvas(floor.w * TILE, floor.h * TILE);
  const g = c.getContext('2d');
  const kindAt = (x, y) => (floor.kinds[y] && floor.kinds[y][x]) || null;
  const WALLS = new Set(['wallTop', 'faceUpper', 'faceLower', 'facadeUpper', 'facadeLower']);
  const isWall = k => WALLS.has(k);

  for (let y = 0; y < floor.h; y++) {
    for (let x = 0; x < floor.w; x++) {
      const k = kindAt(x, y);
      if (!k) continue;
      const px = x * TILE, py = y * TILE;
      // 장소마다 벽 모양이 다르다 (faceLower → faceLowerHome 등)
      const styled = floor.style && TILE_ART[k + floor.style[0].toUpperCase() + floor.style.slice(1)];
      (styled || TILE_ART[k])(g, px, py, x, y);

      if (k === 'wallTop') {
        // 바닥과 맞닿은 가장자리에 옅은 테두리
        if (floor.isFloor(x - 1, y)) rect(g, px, py, 1, 16, '#4b4058');
        if (floor.isFloor(x + 1, y)) rect(g, px + 15, py, 1, 16, '#4b4058');
        if (floor.isFloor(x, y - 1)) rect(g, px, py, 16, 1, '#4b4058');
      } else if (!isWall(k)) {
        // 벽 아래·옆 바닥에 그림자
        if (isWall(kindAt(x, y - 1))) rect(g, px, py, 16, 3, 'rgba(0,0,0,0.18)');
        if (isWall(kindAt(x - 1, y))) rect(g, px, py, 2, 16, 'rgba(0,0,0,0.12)');
      }
    }
  }

  for (const d of floor.deco) {
    DECO_ART[d.type](g, d.x * TILE, d.y * TILE, d.w * TILE, d.h * TILE, d);
  }
  return c;
}
