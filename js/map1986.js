'use strict';
// ─────────────────────────────────────────────
// map1986.js — 1986년 3월 21일 새벽의 동산고 (회상 장면 무대)
// 2026년 맵(map.js)과 같은 뼈대 위에 그때만 있던 것들:
//   엘리베이터 없음, 왁스칠한 나무 마루 복도, 시대 포스터, 방화사 양동이, 빽빽한 2인용 책상,
//   암실로 쓰던 과학준비실(전기난로·문어발 멀티탭·아직 돌아가는 시계), 숙직실, 옥상 천문대
// 장소 이름은 'old1' 'old2' 'old3' 'oldroof'. 여기 것들은 look() 만 — 단서 수첩은 2026년 것이다.
// ─────────────────────────────────────────────

const PAST = n => `old${n}`;
const PAST_NIGHT = { dark: 0.86 };

function pastFloor(n, W, H) {
  const b = createFloor(PAST(n), W, H, { label: `1986 · ${n}층`, night: PAST_NIGHT });
  b.num = n;
  return b;
}

// 복도·계단 (엘리베이터 자리는 그냥 벽)
function pastCore(b, { up, down, roof }) {
  const n = b.num;
  b.room(`${n}층 복도`, 2, 16, 60, 4, 'oldhall');
  b.room('계단', 30, 22, 8, 10, 'oldhall');
  b.carve(31, 20, 6, 2, 'oldhall');
  if (up || roof) {
    b.carve(30, 25, 4, 7, 'stairs');
    b.dec('arrowUp', 31, 24, 2, 1);
  }
  b.obj('rail', 33, 25, 1, 7);
  if (up) b.warp(30, 30, 4, 2, { floor: PAST(n + 1), x: 36, y: 25, dir: 'up' });
  // 옥상 계단: 오미녕의 기억에선 4시 전까지 잠겨 있다 (story.js 의 pastRoof)
  if (roof) b.warps.push({ x: 30, y: 30, w: 4, h: 2, script: 'pastRoof' });
  if (down) {
    b.carve(34, 25, 4, 7, 'stairsDown');
    b.dec('arrowDown', 35, 24, 2, 1);
    b.warp(34, 30, 4, 2, { floor: PAST(n - 1), x: 32, y: 25, dir: 'up' });
  } else {
    b.obj('plant', 37, 31);
  }
}

const POSTER_TEXT = {
  hodori: ['"86 아시안게임 성공 기원" 포스터.', '호랑이 마스코트 호돌이가 상모를 돌리며 웃고 있다.'],
  fire: ['"불조심 강조의 달" 포스터.', '"꺼진 불도 다시 보자"'],
  slogan: ['표어가 붙어 있다.', '"복도에서는 사뿐사뿐 — 정숙"'],
  star: ['손으로 그린 성도. 3월 새벽 하늘이다.', '동쪽 지평선 근처에 빨간 펜으로 동그라미. "핼리!"'],
};

// 복도 벽 포스터 [x, 종류] + 방화사 양동이 [x, 비었는지]
function pastHall(b, posters, buckets) {
  for (const [x, kind] of posters) b.dec('poster86', x, 15, 2, 1, { kind, ...look(...POSTER_TEXT[kind]) });
  for (const [x, empty] of buckets) {
    b.obj('sandbucket', x, 16, 1, 1, {
      empty,
      ...(empty
        ? look('빨간 방화사 양동이.', '…텅 비어 있다. 모래 한 톨 없다.')
        : look('빨간 방화사 양동이. 모래가 가득 담겨 있다.')),
    });
  }
}

// 교실: 2인용 나무 책상이 빽빽하다
function pastTopClassroom(b, name, x0, w = 14) {
  b.room(name, x0, 4, w, 10, 'wood');
  b.carve(x0 + w - 4, 14, 2, 2, 'door');
  b.dec('window', x0 + 1, 2, 2, 2);
  b.dec('blackboard', x0 + ((w - 6) >> 1), 2, 6, 2);
  b.dec('window', x0 + w - 3, 2, 2, 2);
  b.obj('podium', x0 + (w >> 1) - 1, 5, 2, 1);
  for (let cx = 1; cx + 2 <= w - 1; cx += 3) {
    for (const cy of [7, 9, 11]) b.obj('olddesk', x0 + cx, cy, 2, 2);
  }
}

function pastBottomClassroom(b, name, x0, w = 14) {
  b.room(name, x0, 22, w, 9, 'wood');
  b.carve(x0 + w - 4, 20, 2, 2, 'door');
  const bw = Math.min(6, w - 6);
  b.dec('blackboard', x0 + 2, 21, bw, 1);
  b.obj('podium', x0 + 1 + (bw >> 1), 22, 2, 1);
  for (let cx = 1; cx + 2 <= w - 1; cx += 3) {
    for (const cy of [24, 26, 28]) b.obj('olddesk', x0 + cx, cy, 2, 2);
  }
}

// ── 1층 (+ 앞마당) ─────────────────────────────

function buildPast1F() {
  const b = pastFloor(1, 64, 41);
  pastCore(b, { up: true });
  pastHall(b, [[14, 'hodori'], [16, 'slogan'], [40, 'fire'], [42, 'hodori'], [59, 'slogan']], [[35, false], [57, true]]);

  pastTopClassroom(b, '1학년 1반', 2);
  pastTopClassroom(b, '1학년 2반', 18);

  // 과학실
  b.room('과학실', 34, 4, 16, 10, 'lab');
  b.carve(36, 14, 2, 2, 'door');
  b.dec('window', 35, 2, 2, 2);
  b.dec('blackboard', 39, 2, 6, 2, look('칠판. "알코올램프는 쓴 뒤 반드시 뚜껑을 덮어 끌 것!"'));
  b.dec('window', 47, 2, 2, 2);
  b.obj('podium', 41, 4, 2, 1);
  for (const tx of [36, 41, 46]) {
    b.obj('labtable', tx, 6, 3, 2);
    b.obj('labtable', tx, 10, 3, 2);
  }

  // 과학준비실 — 암실로 쓰는 중
  b.room('과학준비실', 52, 4, 10, 10, 'lab');
  b.carve(55, 14, 2, 2, 'door');
  b.carve(50, 8, 2, 2, 'door');
  b.obj('shelf', 52, 4, 3, 1);
  // 시계·난로·멀티탭은 누구의 기억이냐에 따라 보이는 게 다르다 (story.js 의 pastPrepLook)
  b.dec('clock', 55, 2, 1, 2, { script: 'pastPrepLook', look: 'clock', prompt: '조사하기' });
  b.dec('safelight', 56, 2, 1, 2, look('빨간 안전등. 과학준비실 전체가 붉게 물들어 있다.', '…여기를 암실로 쓰고 있었구나.'));
  b.dec('dryline', 57, 2, 3, 2, look('줄에 사진들이 빨래집게로 걸려 마르고 있다.', '새까만 밤하늘에 별이 점점이 찍힌 사진들.'));
  b.obj('cabinet', 60, 4, 2, 1, look('서류함. 맨 아래 칸의 "천문부" 이름표가 아직 새것이다.'));
  b.obj('devtable', 55, 8, 3, 2, look('현상액 쟁반 세 개가 나란히 놓여 있다.', '시큼한 약품 냄새. 첫 번째 쟁반 속에서 사진 한 장이 천천히 떠오르고 있다.'));
  b.obj('heater', 52, 10, 1, 1, { script: 'pastPrepLook', look: 'heater', prompt: '조사하기' });
  b.dec('powerstrip', 52, 11, 1, 1, { script: 'pastPrepLook', look: 'strip', prompt: '조사하기' });
  b.obj('boxes', 60, 12);
  b.obj('boxes', 61, 12);
  b.obj('boxes', 61, 11);
  b.light(56.5, 4.5, 72, '255,40,30');
  b.light(52.5, 10.5, 30, '255,130,50');
  // 과학준비실 앞 복도·과학준비실 안: 누구의 기억이냐에 따라 장면이 다르다 (story.js 의 pastPrepHall / pastPrepRoom)
  b.warps.push({ x: 48, y: 16, w: 14, h: 4, script: 'pastPrepHall' });
  b.warps.push({ x: 52, y: 4, w: 10, h: 10, script: 'pastPrepRoom' });

  // 중앙 현관
  b.room('중앙 현관', 2, 22, 12, 10, 'oldhall');
  b.carve(4, 20, 8, 2, 'oldhall');
  b.obj('shoelocker', 5, 24, 6, 1);
  b.obj('shoelocker', 5, 27, 6, 1);
  b.obj('shoelocker', 12, 23, 2, 1);
  b.dec('mat', 6, 30, 4, 2);

  // 최정연의 기억: 원판 상자를 안고 현관으로 나가면 끝 (story.js 의 pastEntrance)
  b.warps.push({ x: 2, y: 22, w: 12, h: 10, script: 'pastEntrance' });

  // 숙직실 (2026년의 기록 보관실 자리)
  b.room('숙직실', 16, 22, 12, 9, 'wood');
  b.carve(26, 20, 2, 2, 'door');
  b.dec('dutyboard', 20, 21, 4, 1, look('숙직 당번표.', '"3월 21일(금) 숙직 — 최정연"'));
  b.obj('bed', 17, 23, 2, 3, look('펼쳐 놓은 이불.', '…비어 있다. 이불이 차갑게 식어 있다.'));
  b.obj('dutydesk', 22, 23, 2, 2, look('다이얼 전화기와 작은 라디오.', '라디오에서 지직거리는 심야 방송이 흘러나온다.'));
  b.obj('bookshelf', 24, 28, 3, 1);
  b.light(23, 23.5, 40, '255,200,130');

  // 천문부실 (2026년의 과학탐구부실 자리)
  b.room('천문부실', 40, 22, 12, 9, 'wood');
  b.carve(44, 20, 2, 2, 'door');
  b.dec('poster86', 46, 21, 2, 1, { kind: 'star', ...look(...POSTER_TEXT.star) });
  b.obj('table', 44, 25, 4, 2, look('천문부 책상. 관측 계획표가 펼쳐져 있다.', '"3/21 새벽 4시 — 옥상 관측회. 망원경, 일지, 원판 챙길 것!"'));
  b.obj('bookshelf', 49, 22, 3, 1);
  b.obj('boxes', 40, 30);
  b.obj('boxes', 41, 30);

  // 교무실
  b.room('교무실', 54, 22, 8, 9, 'wood');
  b.carve(56, 20, 2, 2, 'door');
  b.obj('plant', 54, 22);
  b.obj('cabinet', 60, 22, 2, 1);
  for (const [tx, ty] of [[55, 24], [59, 24], [55, 27], [59, 27]]) b.obj('table', tx, ty, 2, 2);

  // 건물 남쪽 외벽 + 앞마당 (운동장 쪽은 회상에 안 나온다)
  b.carve(1, 32, 62, 3, 'wall');
  b.carve(6, 32, 4, 3, 'oldhall');
  b.dec('plaque', 5, 32, 6, 1);
  for (const wx of [2, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59]) b.dec('facadeWindow', wx, 33, 2, 2);
  b.room('앞마당', 1, 35, 62, 5, 'grass');
  b.carve(2, 35, 59, 2, 'path');
  b.carve(6, 37, 4, 3, 'path');
  b.obj('stage', 28, 37, 8, 2);
  b.obj('flagpole', 37, 37);
  for (const tx of [3, 12, 19, 42, 49, 56]) b.obj('tree', tx, 38, 2, 1);
  b.obj('fence', 1, 35, 1, 5);
  b.obj('fence', 62, 35, 1, 5);
  b.obj('fence', 1, 40, 62, 1);

  return finishFloor(b);
}

// ── 2층 ───────────────────────────────────────

function buildPast2F() {
  const b = pastFloor(2, 66, 34);
  pastCore(b, { up: true, down: true });
  pastHall(b, [[14, 'fire'], [16, 'hodori'], [51, 'slogan']], [[48, false]]);

  pastTopClassroom(b, '2학년 1반', 2);
  pastTopClassroom(b, '2학년 2반', 18);
  pastTopClassroom(b, '2학년 3반', 34);
  pastTopClassroom(b, '2학년 4반', 50, 12);

  // 음악실
  b.room('음악실', 2, 22, 26, 9, 'wood');
  b.carve(24, 20, 2, 2, 'door');
  b.dec('staffboard', 8, 21, 8, 1);
  b.obj('speaker', 2, 22);
  b.obj('speaker', 27, 22);
  b.obj('piano', 3, 24, 3, 2);
  b.obj('stool', 7, 25);
  b.obj('drums', 20, 23, 2, 2);
  b.obj('guitar', 26, 25);
  b.obj('guitar', 26, 27);
  b.obj('xylophone', 3, 29, 2, 1);
  b.obj('cabinet', 17, 22, 2, 1);
  for (let sx = 9; sx <= 21; sx += 2) {
    b.obj('stool', sx, 27);
    b.obj('stool', sx, 29);
  }
  b.obj('boombox', 14, 23, 2, 1, look('커다란 라디오 카세트 녹음기. 빨간 녹음 불이 깜빡인다.', '카운터 숫자가 천천히 올라가고 있다.'));
  // 오미녕의 기억: 음악실에 들어서면 관악부 선배들 장면
  b.warps.push({ x: 2, y: 22, w: 26, h: 9, script: 'mkMusic', once: 'mkMusic' });

  // 이이노의 기억: 2층 계단참을 지날 때마다 음악실 관악부가 말을 건다 (story.js 의 pastHall2)
  // 층을 오가려면 반드시 지나는 자리라서, 녹음될 왕복 대화를 건너뛸 수 없다
  b.warps.push({ x: 30, y: 20, w: 8, h: 10, script: 'pastHall2' });

  pastBottomClassroom(b, '2학년 5반', 40);

  b.room('화장실', 56, 22, 6, 9, 'lab');
  b.carve(58, 20, 2, 2, 'door');
  b.obj('stall', 56, 22, 2, 2);
  b.obj('stall', 60, 22, 2, 2);
  b.obj('sink', 56, 28, 2, 1);
  b.obj('sink', 60, 28, 2, 1);

  return finishFloor(b);
}

// ── 3층 ───────────────────────────────────────

function buildPast3F() {
  const b = pastFloor(3, 66, 34);
  pastCore(b, { roof: true, down: true });
  pastHall(b, [[14, 'slogan'], [16, 'hodori'], [53, 'fire']], [[48, false]]);

  pastTopClassroom(b, '3학년 1반', 2);
  pastTopClassroom(b, '3학년 2반', 18);
  pastTopClassroom(b, '3학년 3반', 34);
  pastTopClassroom(b, '3학년 4반', 50, 12);
  pastBottomClassroom(b, '3학년 5반', 2);

  // 이이노의 기억: 원판을 들고 3층 계단에 올라오면 아래층에서 폭발음 (story.js 의 pastStairs3)
  b.warps.push({ x: 30, y: 22, w: 8, h: 8, script: 'pastStairs3' });

  // 신문부실
  b.room('신문부실', 18, 22, 10, 9, 'wood');
  b.carve(24, 20, 2, 2, 'door');
  b.dec('bulletin', 19, 21, 4, 1);
  b.obj('table', 19, 24, 2, 2, look('학보 원고 뭉치. 빨간 펜 교정 자국이 빼곡하다.'));
  b.obj('table', 22, 24, 2, 2);
  b.obj('cabinet', 26, 22, 2, 1);
  b.obj('boxes', 18, 29);

  // 야간 자율학습실
  b.room('자율학습실', 40, 22, 22, 9, 'carpet');
  b.carve(42, 20, 2, 2, 'door');
  b.dec('clock', 52, 21);
  for (const tx of [43, 46, 49, 52, 55, 58]) {
    b.obj('olddesk', tx, 24, 2, 2);
    b.obj('olddesk', tx, 27, 2, 2);
  }

  return finishFloor(b);
}

// ── 옥상 + 천문대 ─────────────────────────────

function buildPastRoof() {
  const b = createFloor('oldroof', 40, 26, { label: '1986 · 옥상', style: 'roof', night: { dark: 0.74, sky: true } });
  b.room('옥상', 2, 3, 36, 19, 'roof');
  b.carve(18, 22, 4, 2, 'stairsDown');
  b.warp(18, 23, 4, 1, { floor: 'old3', x: 32, y: 25, dir: 'up' });
  b.obj('dome', 4, 4, 6, 5, look('천문대. 둥근 지붕의 틈이 하늘을 향해 열려 있다.', '안쪽에서 낮게 모터 돌아가는 소리가 난다.'));
  b.obj('telescope', 22, 9, 1, 1, look('천문부 망원경. 동쪽 하늘을 겨누고 있다.'));
  b.obj('platecamera', 27, 9, 1, 1, look('원판 사진기. 삼각대 위에 나무 상자가 얹혀 있다.'));
  b.obj('stool', 20, 11);
  b.obj('lampstool', 24, 11, 1, 1, look('의자 위에서 알코올램프가 조용히 타고 있다.', '렌즈에 이슬이 맺히지 않게 켜 둔 거라고 했다.'));
  b.obj('stool', 26, 11);
  // 오미녕의 기억: 옥상에 올라오면 인터뷰 장면
  b.warps.push({ x: 2, y: 3, w: 36, h: 19, script: 'mkRoof', once: 'mkRoof' });
  b.light(7, 8.5, 22, '255,210,140');   // 천문대 문틈으로 새는 불빛

  return finishFloor(b);
}

function buildPast() {
  return { old1: buildPast1F(), old2: buildPast2F(), old3: buildPast3F(), oldroof: buildPastRoof() };
}
