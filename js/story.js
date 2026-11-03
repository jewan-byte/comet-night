'use strict';
// ─────────────────────────────────────────────
// story.js — 이야기 진행
// 프롤로그: 타이틀 → 날짜 → 집에서 눈뜨기 → (아빠, 사진) → 버스 → 학교 도착
//
// 대사는 '문자열'(서술) 또는 { who: '이름', text: '대사' }
// 스크립트는 async 함수라서 위에서 아래로 차례대로 읽으면 된다.
// ─────────────────────────────────────────────

// 주인공: 한빛찬 (동사란고 2학년, 과학탐구부 — 부원은 혼자)
// 아빠: 한정우 — 1986년 천문부 부장. 화재의 누명을 쓰고 전학 갔다. 빛찬에게는 한 번도 말한 적 없다.
// 조력자: 강하율 — 빛찬의 초등학교 친구, 신문부. 증거보다 사람 이야기에 강하다.
//         과학탐구부 두 번째 부원이 되어 주는 대신 "특종은 내 거"
const ME = '빛찬';
const FRIEND = '하율';

// 선택에 따라 쌓이는 숨은 값 — 플레이어에겐 보여 주지 않고 엔딩만 가른다
//   evidence: 밝혀낸 진실 (모순 발견, 실험 승리)
//   heart:    증인들이 빛찬을 믿는 정도 (몰아붙이기 vs 공감)
//   article:  하율이 특종을 서두르는 정도
const route = { evidence: 0, article: 0, heart: { minkyung: 0, dohyun: 0, dad: 0 } };
const addEvidence = n => { route.evidence += n; };
const addArticle = n => { route.article += n; };
const addHeart = (who, n) => { route.heart[who] += n; };

// 화재벨: 울리기 시작하면 끌 때까지 따르릉 반복
let fireBell = null;
function startFireBell() {
  stopFireBell();
  Sound.sfx('bell');
  fireBell = setInterval(() => Sound.sfx('bell'), 900);
}
function stopFireBell() {
  clearInterval(fireBell);
  fireBell = null;
}

// 이야기 진행 상태 (조사·대화로 바뀐다)
const flags = {};
function resetFlags() {
  Object.assign(route, { evidence: 0, article: 0, heart: { minkyung: 0, dohyun: 0, dad: 0 } });
  for (const k of Object.keys(flags)) delete flags[k];
  Object.assign(flags, {
    talkedDad: false,    // 아침 먹으며 아빠와 얘기함
    calledBack: false,   // 밥 안 먹고 나가려다 아빠한테 불려옴
    sawPhoto: false,     // 장식장의 천문부 사진을 봄
    askedPhoto: false,   // 아빠에게 사진에 대해 물어봄
    friendJoined: false, // 하율이 함께 다니기 시작함
    calledAway: false,   // 하율이 신문부 부장 전화를 받음 (2층 또는 3층에서)
    calledOn3F: false,   // 2층을 건너뛰고 3층에서 전화를 받음 (하율이 같이 감)
    metNewsroom: false,  // 3층 신문부실 장면을 봄 (하율 다시 합류)
    ch1Ready: false,     // 1장 핵심 단서를 다 모음 → 준비실 서랍을 열 수 있다
    foundLog: false,     // 천문부 관측일지를 찾음
    gaveLog: false,      // 1장 끝: 민경 선생님에게 일지를 건넸음
    keepClub: false,     // 집 ①: 아빠에게 "동아리 끝까지 해 볼 거야"
    pushedDad: false,    // 집 ②: 사진 얘기를 캐물음
    wantAskDad: false,   // 학교 ③: "아빠한테 먼저 물어보고 싶어"
    ch1Done: false,      // 1장 끝 (민경 선생님 등장까지 봄)
    ch2Started: false,   // 2장 시작: 방과 후, 과학실로 가야 한다
    ch2Intro: false,     // 과학실에서 선생님 이야기를 듣기 시작함
    memory: null,        // 지금 누구의 기억 속인지 ('minkyung' …), 현실이면 null
    // 오민경의 기억
    mkSawNote: false,    // 잠긴 옥상 문의 쪽지를 봄
    mkMusic: false,      // 음악실 관악부 장면 → 4시, 옥상 문이 열린다
    mkRoof: false,       // 옥상 인터뷰 장면
    mkAsk: null,         // 인터뷰에서 고른 질문 ('comet' | 'photo' | 'why')
    saw2061: false,      // 정우의 "2061년엔 내 애랑" — 숨은 장면 「2061」 조건
    mkFire: false,       // 화재벨이 울림
    mkDistort: false,    // 1층에서 어긋난 기억 장면
    mkDone: false,       // 기억에서 돌아와 선택까지 끝남
    articleOk: false,    // 하율에게 기사를 써도 된다고 함
  });
  smoke = null;
  stopFireBell();
  companion.visible = false;
  companion.following = false;
  actors.length = 0;
  ambient = null;
  setPlayerLook(null);
}

// 1장을 마무리하려면 모아야 하는 단서
const CH1_KEYS = ['천문부 이름표', '멈춘 시계', '그을음 자국', '먼지 없는 자국', '천문부 망원경', '1986년 학보'];

// 사물에 붙지 않고 이야기로 얻는 단서 (수첩에는 처음부터 ??? 로 보인다)
const LOG_CLUE = {
  name: '천문부 관측일지',
  text: [
    '과학준비실 서류함 맨 아래 칸에서 찾은 공책. "천문부 관측일지 1985–1986"',
    '"1986. 3. 14 — 핼리 혜성 첫 관측 성공! 꼬리가 보였다. — 부장 한정우"',
    '마지막 기록은 "1986. 3. 21 새벽 —". 그 뒤 몇 장이 칼로 자른 듯 뜯겨 나가 있다.',
  ],
  place: '1층 · 과학준비실',
  found: false,
  story: true,   // 조사로는 못 얻는다 — 하율의 "여기 아직 안 본 게 있어" 힌트에서 뺀다
};
CLUES.push(LOG_CLUE);

// 실험에서 이겨서 얻는 단서
const BURN_CLUE = {
  name: '연소 실험 결과',
  text: [
    '과학실에서 그날의 불을 재현했다.',
    '벽에 남은 V자 그을음의 꼭짓점은 작업대(알코올램프 자리)가 아니라 바닥, 콘센트 바로 앞이었다.',
    '불은 램프가 아니라 콘센트 쪽에서 시작됐다.',
  ],
  place: '1층 · 과학실',
  found: false,
  story: true,
};
CLUES.push(BURN_CLUE);

// 기억 속에서 발견한 모순 (회상이 끝나면 수첩에 적힌다 — 3장 실험의 재료)
const CONTRA = {
  window: {
    name: '모순: 빨간 창문',
    text: [
      '선생님은 "옥상에서 보니 1층 창문이 이미 시뻘겠다 — 불길이었다"고 기억한다.',
      '하지만 기억 속 정우 선배는 분명히 말했다. "저건 암실 안전등이야."',
      '그 시각, 누군가 암실에서 사진을 현상하고 있었다는 뜻이다.',
    ],
  },
  lamp: {
    name: '모순: 램프를 든 정우',
    text: [
      '선생님의 기사: "천문부 부장이 불붙은 램프를 들고 준비실에서 나왔다."',
      '하지만 정우 선배는 화재벨이 울릴 때까지 옥상에서 혜성 고도를 적고 있었다.',
      '벨이 울리고 나서 램프 뚜껑을 덮고 계단으로 뛰어갔다. 준비실 "안"에서 나올 수가 없다.',
    ],
  },
  absent: {
    name: '모순: "없었던 거야"',
    text: [
      '연기 속에서 정우 선배가 누군가에게 낮게 말했다. "…넌 여기 없었던 거야. 가!"',
      '준비실에서 나온 사람은 새 원판을 가지러 내려간 이도현 선배. 완장 끝이 그을려 있었다.',
    ],
  },
  shadow: {
    name: '모순: 어른의 그림자',
    text: [
      '연기 너머로 납작한 상자를 안은 어른의 그림자가 현관 쪽으로 사라졌다.',
      '선생님은 이 얘기를 기사에 쓰지 않았다.',
      '그날 숙직은 신임 박영철 선생님. 순찰은… 한 번도 오지 않았다.',
    ],
  },
};
for (const c of Object.values(CONTRA)) {
  Object.assign(c, { place: '2장 · 오민경의 기억', found: false, story: true });
  CLUES.push(c);
}

// ── 과학실 실험 (experiment.js) — 주장마다 대사와 단서 반응 ──
// 페이지 형식은 대사창과 같다. clues: 단서 이름 → { dmg: 깎는 신뢰도, text, unlock: 실험 기준이 생김 }
//   목록에 없는 단서나 dmg ≤ 0 인 단서를 내밀면 빛찬의 정신력이 깎인다
// portrait: 주장하는 사람 (PEOPLE 이름), prop: 손에 든 것 ('paper' 학보 | 'lamp' 램프), speaker: 대사 이름표
const EXPERIMENTS = {
  // 민경 회상 직후, 첫 검증 — 1986년 학보 기사의 "램프 부주의"
  combustion: {
    title: '연소 실험',
    mini: 'combustion',
    portrait: 'minkyung86',
    prop: 'paper',
    speaker: '기억 속 민경',
    claim: '"천문부 부장의 알코올램프 부주의로 불이 났다"',
    source: '— 동사란 학보 1986년 4월호, 기자 1학년 오민경',
    intro: [
      '기억 속의 오민경이 학보를 펼쳐 든다.',
      '40년 동안 아무도 의심하지 않은 기사. 이제 직접 검증할 차례다.',
    ],
    observe: [
      ['기사를 다시 읽는다.', '"알코올램프는 준비실 작업대 위에 있었다. 부장이 끄는 것을 잊었다."'],
      ['불은 위로, 그리고 옆으로 번진다.', '그래서 벽에 남는 그을음은 V자 모양이 된다.'],
      ['V자의 꼭짓점… 거기가 불이 처음 붙은 곳이다.', '준비실 그을음이 어떤 모양이었는지 떠올려 보자. ([단서 제시])'],
    ],
    clues: {
      '그을음 자국': {
        dmg: 25, unlock: true,
        text: [
          '그을음 자국을 떠올렸다.',
          { who: ME, text: '바닥만이 아니야. 벽에도 V자로 번진 자국이 옅게 남아 있었어.' },
          { who: ME, text: '아래쪽은 닦여서 안 보이지만… 위쪽 선은 아직 남아 있어.' },
          '그을음의 모양을 기억해 냈다. 이제 [실험]으로 비교할 수 있다!',
        ],
      },
      '천문부 관측일지': {
        dmg: 15,
        text: [
          '관측일지를 펼쳐 보였다.',
          { who: ME, text: '"3. 21 새벽" — 천문부는 옥상에서 관측 중이었어. 준비실에 램프를 켜 둘 이유가 없잖아.' },
          '기억 속 민경이 움찔했다.',
        ],
      },
      '모순: 램프를 든 정우': {
        dmg: 20,
        text: [
          { who: ME, text: '정우 선배는 화재벨이 울릴 때까지 옥상에서 혜성 고도를 적고 있었어요.' },
          { who: ME, text: '램프도 옥상에 있었고요. 뚜껑을 덮고 들고 내려간 건 벨이 울린 "뒤"예요.' },
          '학보를 든 손이 흔들렸다.',
        ],
      },
      '모순: 빨간 창문': {
        dmg: 15,
        text: [
          { who: ME, text: '불나기 전부터 준비실 창문은 빨갰어요. 암실 안전등이요.' },
          { who: ME, text: '그 시각 준비실엔 누군가 있었다는 거예요. 천문부가 아니라.' },
        ],
      },
      '멈춘 시계': {
        dmg: 10,
        text: [
          '멈춘 시계를 떠올렸다. 4시 40분.',
          { who: ME, text: '불이 시계까지 번진 시각이야. 그 시각에 램프를 쓰던 사람이 있었다는 기록은 없어.' },
        ],
      },
      '1986년 학보': {
        dmg: -5,
        text: ['학보를 내밀었다.', '…이건 이 주장 그 자체다. 오히려 주장에 힘을 실어 줬다.'],
      },
    },
    wrongClue: name => [`「${name}」을(를) 내밀었다.`, '…이 주장과는 관계가 없다.'],
    noTarget: ['비교할 기준이 없다.', '그을음이 어떤 모양이었는지 먼저 떠올려 보자. ([단서 제시])'],
    expDone: ['이미 확인한 실험이다.'],
    notYet: ['아직 근거가 부족하다.', '성급했다. 주장의 신뢰도를 더 깎아야 한다.'],
    broken: ['기사의 신뢰도가 바닥났다.', '지금이라면… [반박]할 수 있다!'],
    // 틀렸을 때 기억 속 민경의 한마디 (흔들리기 시작하면 tauntsWeak)
    taunts: ['내가 봤어. 내 눈으로.', '학보에 실린 기사야. 선생님들도 다 확인했어.', '천문부 말고 그 시간에 누가 있었겠어?'],
    tauntsWeak: ['…램프였어. 분명히 램프였어.', '그럼… 내가 본 건 뭐였는데?'],
    win: [
      { who: ME, text: '램프는 작업대 위에 있었다고 하셨죠. 그런데 그을음의 꼭짓점은 바닥, 콘센트 바로 앞이에요.' },
      { who: ME, text: '그리고 그 시각 정우 선배는 옥상에 있었어요.' },
      { who: ME, text: '불은 램프에서 시작된 게 아니에요.' },
      '학보가 손에서 미끄러져 떨어졌다.',
      '기사 「알코올램프 부주의로 불이 났다」를 반박했다!',
    ],
  },
};

resetFlags();

// ── 스크립트에서 쓰는 도구 ──
// 이야기가 새로 시작되거나 건너뛰면(storyRun 이 바뀌면) say·wait 다음에서 STOP 을 던져 스크립트를 끊는다
const STOP = Symbol('stop');
const alive = run => { if (run !== storyRun) throw STOP; };
const say = (...pages) => { const run = storyRun; return openDialog(pages).then(() => alive(run)); };
// 선택지: 마지막 페이지에서 options 중 하나를 고르면 그 번호로 끝난다
const choose = (pages, options) => {
  const run = storyRun;
  return new Promise(r => openDialog(pages, { options, index: 0, onPick: r })).then(i => { alive(run); return i; });
};
const wait = sec => { const run = storyRun; return new Promise(r => setTimeout(r, sec * 1000)).then(() => alive(run)); };
const fadeAsync = action => new Promise(r => fadeTo(action, r));
const fadeInAsync = () => new Promise(r => fadeIn(r));

const HOME_START = { x: 5, y: 8, dir: 'down' };     // 침대 옆
const BUS_SEAT = { x: 13.5, y: 4.95, dir: 'up' };   // 창가 자리 (좌석이 하반신을 가린다)
const SCHOOL_ARRIVE = { x: 8, y: 37, dir: 'up' };   // 학교 앞마당, 현관 앞 보도블록
const AFTER_SCHOOL = { x: 40.5, y: 18, dir: 'up' };  // 2장 시작: 1층 복도, 과학실 문 근처
const MINKYUNG_START = { x: 47.5, y: 27, dir: 'up' }; // 1986년 3층 자율학습실, 책상 줄 사이

// 2장 방과 후: 노을 색감, 하율과 함께 1층 복도, 과학실 교탁 앞엔 선생님
function setupAfterSchool() {
  ambient = DUSK;
  companion.visible = true;
  companion.following = true;
  setFloor(1, AFTER_SCHOOL);
  if (!actors.length) addActor('teacher', 39.5, 9, 'down', 1);   // 실험대 사이, 문에서 보이는 자리
}

// 오민경의 기억으로: 하율·노을·현재 인물은 사라지고, 빛찬은 1학년 오민경이 된다
function beginMinkyungMemory(where, at) {
  ambient = null;
  actors.length = 0;
  companion.following = false;
  companion.visible = false;
  flags.memory = 'minkyung';
  setPlayerLook('minkyung86');
  setFloor(where, at);
}

// 기억에서 현재로: 빛찬으로 돌아오고 방과 후 노을
function endMemory() {
  stopFireBell();
  smoke = null;
  actors.length = 0;
  flags.memory = null;
  setPlayerLook(null);
  ambient = DUSK;
}

const hasClue = name => CLUES.some(c => c.name === name && c.found);

// 인물(하율 또는 컷신용 NPC)을 (x, y)까지 sec초 동안 걷게 (타일 단위)
// 플레이어는 main.js 가 매 프레임 걷기 상태를 지우므로 scriptAnim 에 따로 센다
async function walkActor(a, x, y, sec) {
  const sx = a.x, sy = a.y, ex = x * TILE, ey = y * TILE;
  const animKey = a === player ? 'scriptAnim' : 'anim';
  a.dir = Math.abs(ex - sx) > Math.abs(ey - sy) ? (ex > sx ? 'right' : 'left') : (ey > sy ? 'down' : 'up');
  a.moving = true;
  a[animKey] = FRAME_TIME;   // 첫 걸음부터 발을 뗀다
  const steps = Math.max(1, Math.round(sec * 60));
  try {
    for (let i = 1; i <= steps; i++) {
      a.x = sx + (ex - sx) * i / steps;
      a.y = sy + (ey - sy) * i / steps;
      a[animKey] += 1 / 60;
      await wait(1 / 60);
    }
  } finally {
    a.moving = false;
    a[animKey] = 0;
  }
}
const walkCompanion = (x, y, sec) => walkActor(companion, x, y, sec);

// 이야기가 새로 시작되거나 개발자 메뉴로 건너뛰면 번호가 바뀐다 → 진행 중이던 스크립트는 멈춘다
let storyRun = 0;

// 컷신: 실행 중엔 플레이어가 못 움직인다
async function runScript(name) {
  if (cutscene) return;
  cutscene = true;
  const run = storyRun;
  try {
    await SCRIPTS[name]();
  } catch (e) {
    if (e !== STOP) throw e;
  } finally {
    if (run === storyRun) cutscene = false;
  }
}

// 왼쪽 위 "지금 하고 있는 일" — 할 일 한 줄 + 하율이 어디 있는지
function statusLines() {
  const lines = [];
  const here = floor.map.n;
  let doing = null;
  if (flags.memory === 'minkyung') {
    let now = '옥상 관측회를 취재하러 가는 중';
    if (flags.mkFire) now = '불이 났다 — 1층으로!';
    else if (flags.mkMusic) now = '4시 — 옥상으로 가는 중';
    else if (flags.mkSawNote) now = '4시까지 숨어 있을 곳을 찾는 중 (아래층에서 음악 소리)';
    return [{ text: '오민경의 기억 — 1986년 3월 21일 새벽' }, { text: now }];
  }
  if (isPast(here)) return [{ text: '1986년 3월 21일 새벽 — 기억 속' }];
  if (here === 'home') doing = flags.talkedDad ? '현관으로 나가는 중' : '등교 준비 중';
  else if (here === 'bus') doing = '학교 가는 중';
  else if (flags.mkDone) doing = '이도현 교장 선생님을 찾아가야 한다 (다음 이야기 준비 중)';
  else if (flags.ch2Started && !flags.ch2Intro) doing = '방과 후 — 과학실로 가는 중';
  else if (flags.ch1Done) doing = '방과 후 과학실 약속을 기다리는 중';
  else if (flags.ch1Ready && !flags.foundLog) doing = '준비실 "천문부" 칸을 확인하러 가는 중';
  else if (flags.calledAway && !flags.metNewsroom) doing = '3층 신문부실로 가는 중';
  else if (flags.friendJoined) doing = '1986년 화재의 흔적을 조사하는 중';
  if (doing) lines.push({ text: doing });

  if (companion.following) lines.push({ text: '하율과 동행 중', key: 'Q', kind: 'friend' });
  else if (flags.calledAway && !flags.metNewsroom) lines.push({ text: '하율은 3층 신문부실에서 기다리는 중', kind: 'friend' });
  return lines;
}

// 단서를 새로 찾을 때마다 (대사가 끝난 뒤) 이야기 진행 확인
function onClueFound() {
  if (!flags.ch1Ready && CH1_KEYS.every(hasClue)) {
    flags.ch1Ready = true;
    runScript('ch1Hint');
  }
}

// ── 타이틀 · 날짜 화면 ──
const titleEl = document.getElementById('title');
const chapterEl = document.getElementById('chapter');

// 아무 키나 (개발자 메뉴 키 ` 는 빼고), 패드에선 화면 터치
function waitAnyKey() {
  return new Promise(r => {
    const onKey = e => {
      if (e.code === 'Backquote') return;
      removeEventListener('keydown', onKey);
      removeEventListener('pointerdown', onKey);
      r();
    };
    addEventListener('keydown', onKey);
    addEventListener('pointerdown', onKey);
  });
}

async function showTitle() {
  titleEl.classList.add('show');
  await waitAnyKey();
  titleEl.classList.remove('show');
  await wait(0.6);
}

async function showChapter(text, sec) {
  chapterEl.textContent = text;
  chapterEl.classList.add('show');
  await wait(sec);
  chapterEl.classList.remove('show');
  await wait(0.8);
}

// ── 스크립트 ──
const SCRIPTS = {
  // 집에서 눈뜨기
  async wakeUp() {
    await showChapter('2026년 11월 2일 월요일\n오전 7시 40분', 2.4);
    await fadeInAsync();
    await wait(0.4);
    await say(
      '삐비빅— 삐비빅—',
      '…알람 소리에 눈을 떴다.',
      '월요일이다. 부엌 쪽에서 달그락거리는 소리가 들린다.',
    );
  },

  // 아빠에게 말 걸기 (식탁)
  async dad() {
    if (!flags.talkedDad) {
      flags.talkedDad = true;
      if (flags.calledBack) {
        // 현관에서 불려 온 경우
        await say(
          { who: '아빠', text: '아침 거르고 다니면 오전 내내 머리 안 돌아가. 앉아, 국 식겠다.' },
          { who: ME, text: '…응. 잘 먹겠습니다.' },
        );
      } else {
        await say(
          { who: '아빠', text: '일어났어? 국 식기 전에 얼른 앉아.' },
          { who: ME, text: '응. 잘 먹겠습니다.' },
        );
      }
      await say(
        '된장국에 계란말이. 아빠는 맞은편에서 신문을 넘긴다.',
        { who: '아빠', text: '오늘도 늦어? 그… 과학탐구부.' },
        { who: '아빠', text: '부원도 너 하나라며. 힘들면 그냥 접어도 돼.' },
      );
      // 선택 (집 ①): 동아리를 어떻게 할지 — 아빠의 마음
      const keepClub = await choose(['아빠가 신문 너머로 힐끗 쳐다본다.'], ['"끝까지 해 볼 거야."', '"…그냥 정리만 하고 올게."']) === 0;
      flags.keepClub = keepClub;
      if (keepClub) {
        addHeart('dad', 1);
        await say(
          { who: ME, text: '끝까지 해 볼 거야. 폐부 심사, 통과할 거야.' },
          '아빠가 신문을 내려놓았다. 잠깐, 아주 잠깐 웃은 것 같았다.',
          { who: '아빠', text: '…그래. 하고 싶은 건 해 봐야지.' },
        );
      } else {
        await say(
          { who: ME, text: '…그냥 정리만 하고 올게. 어차피 혼자라.' },
          { who: '아빠', text: '그래. 너무 늦게 다니지는 말고.' },
        );
      }
      // 밥 먹기 전에 사진을 이미 봤다면 이 자리에서 바로 물어본다
      if (flags.sawPhoto) await SCRIPTS.askPhoto();
    } else if (flags.sawPhoto && !flags.askedPhoto) {
      await SCRIPTS.askPhoto();
    } else if (flags.askedPhoto) {
      await say({ who: '아빠', text: '…늦겠다. 얼른 가.' }, '아빠는 신문에서 눈을 떼지 않는다.');
    } else {
      await say({ who: '아빠', text: '다 먹었으면 얼른 가. 버스 놓친다.' });
    }
  },

  // 사진에 대해 묻기
  async askPhoto() {
    flags.askedPhoto = true;
    await say(
      { who: ME, text: '아빠, 거실 장식장에 있는 사진… 아빠도 천문부였어?' },
      '신문을 넘기던 아빠의 손이 멈췄다.',
      { who: '아빠', text: '……' },
      { who: '아빠', text: '다 옛날 얘기야.' },
    );
    // 선택 (집 ②): 더 캐물을지, 기다려 줄지 — 아빠의 마음
    const patient = await choose(['아빠는 더 말하고 싶지 않은 눈치다.'], ['"…알았어. 나중에 얘기해 줘."', '"옛날 얘기면 왜 말을 안 해?"']) === 0;
    flags.pushedDad = !patient;
    if (patient) {
      addHeart('dad', 1);
      await say(
        { who: '아빠', text: '…그래. 언젠간.' },
        { who: '아빠', text: '버스 시간 다 됐다. 얼른 가.' },
      );
    } else {
      await say(
        { who: '아빠', text: '빛찬아.' },
        { who: '아빠', text: '…그만. 버스 시간 다 됐다.' },
        '아빠는 신문으로 얼굴을 가렸다.',
      );
    }
  },

  // 현관으로 나가기 → 버스 → 학교
  async leaveHome() {
    if (!flags.talkedDad) {
      player.y -= 10;          // 출구에서 한 걸음 물러나서 다시 걸리지 않게
      player.dir = 'up';
      if (!flags.calledBack) {
        flags.calledBack = true;
        await say(
          { who: '아빠', text: '빛찬아! 아침도 안 먹고 어디 가!' },
          { who: ME, text: '아, 맞다…' },
        );
      } else {
        await say({ who: '아빠', text: '밥은 먹고 가라니까.' });
      }
      return;
    }

    await say({ who: ME, text: '다녀오겠습니다!' }, { who: '아빠', text: '그래. 조심히 다녀와.' });
    await fadeAsync(() => setFloor('bus', BUS_SEAT));
    await wait(1.2);
    await say('버스 창밖으로 익숙한 동네가 흘러간다.');
    if (flags.sawPhoto) {
      await say(
        '…아빠가 천문부였다니.',
        '사진 속 망원경, 동아리방에 있는 거랑 똑같이 생겼었는데.',
      );
      if (flags.askedPhoto && flags.pushedDad) await say('"…그만."', '아빠가 그렇게 딱 잘라 말한 건 처음이었다.');
      else if (flags.askedPhoto) await say('"…그래. 언젠간."', '언젠가는, 얘기해 줄까.');
      else await say('왜 한 번도 그 얘기를 안 했을까.');
    } else {
      await say('폐부 심사까지 4주.', '그 전에 동아리방 정리부터 끝내야 한다.');
    }
    await wait(1);
    await say({ who: '안내 방송', text: '이번 정류장은 동사란고등학교, 동사란고등학교입니다.' });

    await fadeAsync(() => setFloor(1, SCHOOL_ARRIVE));
    await SCRIPTS.meetFriend();
  },

  // 학교 앞에서 하율 합류
  async meetFriend() {
    await wait(0.4);
    await say({ who: FRIEND, text: '한빛찬! 여기!' });
    companion.x = 15 * TILE;
    companion.y = 37 * TILE;
    companion.floor = 1;
    companion.visible = true;
    await walkCompanion(9.5, 37, 0.9);
    player.dir = 'right';
    companion.dir = 'left';

    await say(
      { who: FRIEND, text: '월요일부터 표정이 왜 그래? 무슨 일 있어?' },
    );
    if (flags.sawPhoto) {
      await say(
        { who: ME, text: '…아니. 아침에 아빠 옛날 사진을 봤는데, 아빠가 고등학교 때 천문부였더라.' },
        { who: FRIEND, text: '오, 진짜? 너네 아빠가? 완전 의외다.' },
        { who: ME, text: '근데 물어보니까 대답을 안 해.' },
        { who: FRIEND, text: '…흐음. 그런 건 꼭 뭔가 있더라.' },
      );
    } else {
      await say({ who: ME, text: '아니, 그냥 피곤해서.' });
    }
    await say(
      { who: FRIEND, text: '아 맞다, 들었어? 과학준비실 12월에 공사한대. 안에 있는 거 싹 다 버린다던데.' },
      { who: ME, text: '…준비실에는 옛날 동아리 물건도 있을 텐데.' },
      { who: FRIEND, text: '그치? 이거 신문부 기삿거리 냄새가 나는데.' },
      { who: FRIEND, text: '그리고 너네 과학탐구부, 부원 너 하나잖아. 이대로면 폐부고.' },
      { who: FRIEND, text: '내가 들어가 줄게. 두 명이면 심사 볼 만하지?' },
      { who: ME, text: '…진심이야?' },
      { who: FRIEND, text: '대신 조건이 있어. 뭐가 나오든 특종은 내 거다?' },
    );
    // 선택 (학교 ①): 하율의 조건 — 기사
    const deal = await choose(['하율이 손을 내밀었다.'], ['"좋아. 특종은 네 거."', '"…특종보다 동아리가 먼저야."']) === 0;
    if (deal) {
      addArticle(1);
      await say(
        { who: ME, text: '좋아. 뭐가 나오든 특종은 네 거.' },
        { who: FRIEND, text: '거래 성립! 이제부터 넌 내 취재원이다.' },
      );
    } else {
      await say(
        { who: ME, text: '…특종보다 동아리가 먼저야. 그래도 고마워, 하율아.' },
        { who: FRIEND, text: '쳇, 깐깐하긴. 알았어, 동아리 먼저.' },
      );
    }
    await say({ who: FRIEND, text: '좋아, 일단 동아리방부터 가자!' });
    flags.friendJoined = true;
    companion.following = true;
    placeCompanionBehind();
  },

  // 2층 복도에 처음 오면: 하율이 신문부 부장 전화를 받고 먼저 3층으로
  async newspaperCall() {
    if (!companion.following) return;
    flags.calledAway = true;
    await say(
      '지이잉— 하율의 휴대폰이 울린다.',
      { who: FRIEND, text: '어? 부장님이다. …네, 네? 지금요?' },
      { who: FRIEND, text: '…창고에서요? 알겠어요, 바로 갈게요!' },
      { who: FRIEND, text: '빛찬아, 미안! 신문부 부장님이 급하게 부르셔. 학보 창고에서 뭐가 나왔대.' },
      { who: FRIEND, text: '3층 신문부실이야. 너도 2층 좀 둘러보다가 와! 거기서 보자.' },
    );
    companion.following = false;
    // 계단 쪽으로 뛰어가서 사라진다
    await walkCompanion(companion.x / TILE, 18.5, 0.3);
    await walkCompanion(33, 18.5, Math.min(1.2, Math.abs(companion.x / TILE - 33) * 0.06 + 0.2));
    await walkCompanion(33, 22, 0.5);
    companion.floor = 3;
    companion.x = 21.5 * TILE;
    companion.y = 28 * TILE;
    companion.dir = 'right';
  },

  // 2층을 건너뛰고 3층에 바로 왔을 때: 같은 전화지만 하율은 떠나지 않고 같이 간다
  async newspaperCall3F() {
    if (!companion.following) return;
    flags.calledAway = true;
    flags.calledOn3F = true;
    await say(
      '지이잉— 하율의 휴대폰이 울린다.',
      { who: FRIEND, text: '어? 부장님이다. …네, 네? 창고에서요?' },
      { who: FRIEND, text: '저 마침 3층이에요! 바로 갈게요.' },
      { who: FRIEND, text: '빛찬아, 부장님이 신문부실로 급하게 오래. 학보 창고에서 뭐가 나왔대.' },
      { who: FRIEND, text: '신문부실 바로 저기야, 계단 옆. 같이 가 보자!' },
    );
  },

  // 3층 신문부실에 처음 들어오면 (어떻게 왔는지에 따라 첫마디가 다르다)
  async newsroom() {
    flags.metNewsroom = true;
    flags.calledAway = true;   // 신문부실부터 왔으면 2·3층 호출은 이제 없음
    player.dir = 'down';
    if (!companion.following) {
      // 2층에서 먼저 와서 기다리던 하율
      await say(
        { who: FRIEND, text: '왔어? 딱 맞춰 왔네! 이쪽이야.' },
      );
    } else if (flags.calledOn3F) {
      // 3층에서 전화 받고 같이 온 경우
      await say(
        { who: FRIEND, text: '부장님, 저 왔어요! 친구도 데려왔어요.' },
        { who: '부장', text: '빨리 왔네. 잘됐다, 같이 보자.' },
      );
    } else {
      // 전화 받기 전에 신문부실부터 들어온 경우
      await say(
        { who: FRIEND, text: '짜잔, 여기가 우리 신문부실!' },
        { who: '부장', text: '하율이 왔구나. 마침 잘 왔다, 안 그래도 전화하려던 참이었어.' },
      );
    }
    await say(
      { who: '부장', text: '네가 하율이 친구? 과학탐구부라며.' },
      { who: '부장', text: '창고 정리하다가 1986년 학보가 나왔거든. 과학준비실 화재 기사가 실려 있더라.' },
      { who: FRIEND, text: '준비실 공사 특집 쓰려고 했는데… 이거 완전 특종 냄새야.' },
      { who: '부장', text: '그 서류함에 넣어 뒀어. 사진 원판 상자도 같이 나왔고.' },
      { who: '부장', text: '과학탐구부, 너도 이거 같이 파 볼래? 뭐 나오면 우리 신문부에 제일 먼저 넘기고.' },
    );
    // 선택 (학교 ②): 신문부 부장의 제안 — 기사
    const share = await choose(['부장이 빛찬을 빤히 본다.'], ['"네, 먼저 넘길게요."', '"…저희가 먼저 확인할게요."']) === 0;
    if (share) {
      addArticle(1);
      await say(
        { who: '부장', text: '좋아, 말 통하네. 하율아, 이 친구 잘 챙겨.' },
        { who: FRIEND, text: '같이 보자, 빛찬아!' },
      );
    } else {
      await say(
        { who: '부장', text: '…과학 하는 애들은 다 이렇게 깐깐한가.' },
        { who: '부장', text: '좋아, 확인 끝나면 알려 줘.' },
        { who: FRIEND, text: '헤헤. 같이 보자, 빛찬아!' },
      );
    }
    companion.visible = true;
    companion.following = true;
    placeCompanionBehind();
  },

  // 신문부 부장에게 말 걸기
  async editor() {
    if (!hasClue('1986년 학보')) {
      await say({ who: '부장', text: '학보는 그 서류함 맨 아래 칸에 있어.' });
    } else if (!hasClue('빈 원판 봉투')) {
      await say({ who: '부장', text: '사진 원판 상자도 봤어? 창문 쪽 구석에 있는 거.' });
    } else {
      await say(
        { who: '부장', text: '기자 이름이 오민경이었지? 그 이름, 어디서 들어본 것 같은데…' },
        { who: '부장', text: '하율아, 마감은 금요일이다.' },
      );
    }
  },

  // ── 1장 마무리 ──

  // 핵심 단서가 다 모이면: 하율이 정리하면서 서랍을 짚어 준다
  async ch1Hint() {
    await wait(0.3);
    await say(
      { who: FRIEND, text: '잠깐, 빛찬아. 지금까지 나온 거 한번 정리해 보자.' },
      { who: FRIEND, text: '1986년 3월, 천문부가 새벽에 옥상에서 혜성을 보기로 했어.' },
      { who: FRIEND, text: '그날 밤 준비실에 불이 났고… 시계는 4시 40분에 멈췄지.' },
      { who: FRIEND, text: '학보에선 "천문부 학생 부주의"로 끝. 천문부는 그대로 폐지.' },
      {
        who: FRIEND,
        text: hasClue('40년 전 2학년 3반')
          ? '…근데 빛찬아. 이거 계속 파도 괜찮아? 2학년 3반 사진에 너네 아빠 이름도 있었잖아.'
          : flags.sawPhoto
            ? '…근데 빛찬아. 이거 계속 파도 괜찮아? 너네 아빠도 1986년 천문부였다며.'
            : '…근데 빛찬아. 이거 계속 파도 괜찮을까? 40년 전 일이라지만, 누군가한텐 아픈 얘기일 텐데.',
      },
    );
    // 선택 (학교 ③): 아빠 일일지도 모르는 걸 계속 파헤칠지 — 증거 / 아빠의 마음
    const dig = await choose(['하율이 조심스럽게 물었다.'], ['"그러니까 더 알아야 돼."', '"…아빠한테 먼저 물어보고 싶어."']) === 0;
    flags.wantAskDad = !dig;
    if (dig) {
      addEvidence(1);
      await say(
        { who: ME, text: '그러니까 더 알아야 돼. 아빠가 왜 말을 안 하는지.' },
        { who: FRIEND, text: '…좋아. 그럼 끝까지 가 보자.' },
      );
    } else {
      addHeart('dad', 1);
      await say(
        { who: ME, text: '…아빠한테 먼저 물어보고 싶어. 근데 그러려면 뭘 물어야 할지는 알아야겠지.' },
        { who: FRIEND, text: '응. 그럼 물어볼 거리부터 찾자.' },
      );
    }
    await say(
      { who: ME, text: '…준비실 서류함에 "천문부" 칸이 아직 남아 있었어.' },
      { who: FRIEND, text: '그거! 이름표만 보고 안은 안 열어 봤잖아.' },
      { who: ME, text: '맨 아래 칸. 다시 가 보자.' },
    );
  },

  // 서랍에서 관측일지 발견 → 오민경 선생님 등장 → 1장 끝
  async findLog() {
    flags.foundLog = true;
    await say(
      '맨 아래 칸 손잡이를 힘주어 당겼다.',
      '…덜컥.',
      '서류 더미 안쪽 깊숙이, 비닐에 싸인 공책 한 권이 있다.',
      '표지에 매직으로 쓴 글씨. "천문부 관측일지 1985–1986"',
      { who: FRIEND, text: '대박… 진짜 있었어.' },
      '첫 장을 넘겼다. 반듯한 글씨로 관측 기록이 빼곡하다.',
      '"1986. 3. 14 — 핼리 혜성 첫 관측 성공! 꼬리가 보였다. — 부장 한정우"',
      { who: ME, text: '……한정우.' },
      { who: FRIEND, text: '잠깐, 너네 아빠가… 천문부 부장이었어?' },
      '마지막 기록을 찾아 끝까지 넘겼다. "1986. 3. 21 새벽 —"',
      '…그 뒤 몇 장이, 칼로 자른 것처럼 깨끗하게 뜯겨 나가 있다.',
    );
    LOG_CLUE.found = true;
    Toast.show(`새 단서: ${LOG_CLUE.name}  (Tab)`, clueImage(LOG_CLUE.name));
    await wait(0.6);

    // 오민경 선생님이 준비실 문으로 들어온다
    await say({ who: '???', text: '거기 누구니?' });
    const teacher = addActor('teacher', 55.5, 15.9, 'up', 1);
    await walkActor(teacher, 57.5, 11, 1.1);
    player.dir = 'down';
    await say(
      { who: '오민경 선생님', text: '준비실은 공사 때문에 출입 금지라고 공지했을 텐데.' },
      { who: FRIEND, text: '아, 선생님! 죄송해요, 저희 동아리 물건 좀 정리하려고…' },
      '선생님의 시선이 빛찬의 손에 들린 공책에 멈췄다.',
      { who: '오민경 선생님', text: '……그거, 어디서 났니?' },
      { who: ME, text: '저기 서류함, "천문부" 칸에서요.' },
      { who: '오민경 선생님', text: '……' },
      { who: '오민경 선생님', text: '그 일지, 잠깐 나한테…' },
    );
    // 선택: 일지를 건넬까 (민경의 마음)
    const gave = await choose(['선생님이 손을 내밀었다.'], ['일지를 건넨다', '일지를 꼭 쥔다']) === 0;
    flags.gaveLog = gave;
    if (gave) {
      addHeart('minkyung', 1);
      await say(
        '일지를 건넸다.',
        '선생님은 표지에 적힌 이름을 손끝으로 천천히 쓸었다.',
        { who: '오민경 선생님', text: '…한정우.' },
        '그러고는 조용히 일지를 다시 빛찬의 손에 쥐여 주었다.',
        { who: '오민경 선생님', text: '너희가 찾은 거니까. 잘 갖고 있어.' },
      );
    } else {
      await say(
        '빛찬은 일지를 가슴께로 끌어당겼다.',
        '선생님은 손을 뻗다 말고, 천천히 다시 내렸다.',
        { who: '오민경 선생님', text: '…그래. 그게 맞겠지.' },
      );
    }
    await say({ who: '오민경 선생님', text: '방과 후에 과학실로 와. 둘 다.' });
    await walkActor(teacher, 55.5, 15.9, 1.1);
    removeActor(teacher);
    await say(
      '오민경 선생님은 그 말만 남기고 준비실을 나갔다.',
      { who: FRIEND, text: '오민경… 학보 기자 이름이랑 똑같잖아.' },
      { who: FRIEND, text: '1986년에 1학년이었으면… 그날 밤 학교에 있었던 사람이야.' },
      { who: ME, text: '……' },
    );

    // 1장 끝 카드 → 2장
    flags.ch1Done = true;
    await new Promise(r => fadeTo(() => { fade.dir = 0; r(); }));   // 검은 화면에서 멈춤
    await showChapter('1장  남겨진 흔적\n— 끝 —', 2.6);
    await SCRIPTS.ch2Start();
  },

  // ── 2장 세 개의 기억 ──

  // 같은 날 방과 후: 노을 지는 1층 복도에서 시작, 과학실엔 선생님이 기다린다
  async ch2Start() {
    await showChapter('2장  세 개의 기억', 2.6);
    await showChapter('같은 날 방과 후\n오후 4시 40분', 2.2);
    flags.ch2Started = true;
    setupAfterSchool();
    await fadeInAsync();
    await say(
      '창밖이 붉게 물들었다. 복도엔 아무도 없다.',
      { who: FRIEND, text: '드디어 방과 후다. 과학실… 가 보자.' },
      { who: ME, text: '…응.' },
    );
  },

  // 과학실에 들어서면: 선생님이 입을 연다 → 오민경의 기억으로
  async ch2Intro() {
    if (!flags.ch2Started) return;
    flags.ch2Intro = true;
    player.dir = 'up';
    await say(
      '노을이 비스듬히 드는 과학실. 오민경 선생님이 실험대 사이에 서 있다.',
      { who: '오민경 선생님', text: '왔구나.' },
      { who: FRIEND, text: '선생님! 저희 여쭤볼 게 산더미예요.' },
      flags.gaveLog
        ? { who: '오민경 선생님', text: '…그 일지, 다시 한번 보여 줄래?' }
        : { who: '오민경 선생님', text: '…이번엔 보여 줄 수 있겠니? 그 일지.' },
      '관측일지를 건넸다. 선생님은 뜯겨 나간 마지막 장 자리를 한참 동안 손끝으로 쓸었다.',
      { who: '오민경 선생님', text: '한정우. …네가 정우 선배 아들이구나.' },
      { who: ME, text: '아빠를… 아세요?' },
      { who: '오민경 선생님', text: '그날 밤 학교에 있던 사람이라면, 다 알지.' },
      { who: '오민경 선생님', text: '나도 그 자리에 있었어. 1학년, 신문부 기자였거든.' },
      { who: FRIEND, text: '그럼 학보 기사… "천문부 학생 부주의". 그거 선생님이 쓰신 거예요?' },
      { who: '오민경 선생님', text: '…그래. 내가 썼어. 내가 본 그대로.' },
      { who: '오민경 선생님', text: '적어도, 그때는 그렇게 믿었어.' },
      { who: '오민경 선생님', text: '40년 동안 몇 번이고 다시 떠올렸는데… 떠올릴 때마다 조금씩 달라지더라.' },
      { who: '오민경 선생님', text: '들려줄게. 내가 기억하는 그날 밤을.' },
    );
    await SCRIPTS.enterMinkyung();
  },

  // 지지직 — 1986년 3층 자율학습실, 1학년 오민경이 된다
  async enterMinkyung() {
    startGlitch(1.4);
    await wait(0.5);
    await new Promise(r => fadeTo(() => {
      fade.dir = 0;
      beginMinkyungMemory('old3', MINKYUNG_START);
      r();
    }));
    await showChapter('1986년 3월 21일 금요일\n새벽 3시 50분', 2.4);
    await showChapter('— 오민경의 기억 —', 1.8);
    await fadeInAsync();
    await say(
      '야간 자율학습이 끝난 지 한참. 교실엔 나 혼자 남았다.',
      '가방에서 전단을 다시 꺼냈다.',
      '"천문부 핼리 혜성 관측회 — 새벽 4시, 옥상. 누구나 환영!"',
      '76년 만에 돌아온 혜성. 학보 첫 특종이 될지도 몰라.',
      '…선생님들한테 들키지만 않으면.',
    );
  },

  // ── 오민경의 기억 ──
  // 기억 속 민경의 대사 이름표는 '민경', 속마음은 서술(*)로

  // 옥상 계단: 4시 전에는 잠겨 있다 (기억 밖 — 개발자 메뉴로 왔으면 그냥 올라간다)
  async pastRoof() {
    if (flags.memory === 'minkyung' && !flags.mkMusic) {
      player.y -= 12;
      player.dir = 'up';
      if (!flags.mkSawNote) {
        flags.mkSawNote = true;
        await say(
          '옥상 문이 잠겨 있다. 문에 쪽지가 붙어 있다.',
          '"관측회 — 4시 정각 개방! 숙직 선생님 순찰(3시 50분) 끝난 뒤에 올라올 것. — 천문부"',
          '…3시 52분. 지금쯤 순찰 도실 시간이다.',
          '들키면 끝이야. 4시까지 어디 숨어 있어야 해.',
          '…아래층 어딘가에서 희미하게 트럼펫 소리가 들린다.',
        );
      } else {
        await say('아직 잠겨 있다. "4시 정각 개방"', '…아래층에서 음악 소리가 들린다.');
      }
      return;
    }
    await fadeAsync(() => setFloor('oldroof', { x: 20, y: 21, dir: 'up' }));
  },

  // ② 음악실: 관악부 선배들의 밤샘 합주 — 녹음기가 돌고 있다 (지금의 카세트테이프)
  async mkMusic() {
    if (flags.memory !== 'minkyung') return;
    flags.mkMusic = true;
    addActor('band86', 12.5, 26, 'down', 'old2');
    addActor('band86', 16.5, 26, 'down', 'old2');
    addActor('band86', 22.5, 25, 'left', 'old2');
    player.dir = 'down';
    await say(
      '음악실 문틈으로 불빛과 음악이 새어 나온다.',
      '트럼펫, 클라리넷, 작은북. 관악부 선배 셋이 둘러앉아 있다.',
      { who: '관악부 선배', text: '어? 1학년이 이 시간에 뭐 해?' },
      { who: '민경', text: '저, 신문부예요. 천문부 관측회 취재 왔는데… 4시까지 기다려야 해서요.' },
      { who: '관악부 선배', text: '쉿, 쉿. 녹음 중이야.' },
      '선배가 바닥의 커다란 녹음기를 가리켰다. 빨간 불이 깜빡이고 있다.',
      { who: '관악부 선배', text: '축제 합주, 밤새 녹음해서 들어 보려고. 3시 55분에 카운터 000부터 돌렸어.' },
      { who: '관악부 선배', text: '근데 오늘 숙직, 그 신임 박 선생님. 순찰을 한 번도 안 오시더라.' },
      { who: '관악부 선배', text: '덕분에 맘 편히 분다. 너도 여기 있다 가.' },
      '…잠시 뒤, 멀리서 4시를 알리는 종이 울렸다.',
      { who: '민경', text: '앗, 4시! 감사합니다, 선배님들!' },
    );
  },

  // ③ 옥상: 정우와 도현 인터뷰 → 질문 하나 → 도현이 원판을 가지러 내려감 → 빨간 창문 → 화재벨
  async mkRoof() {
    if (flags.memory !== 'minkyung') return;
    flags.mkRoof = true;
    const jeongwoo = addActor('jeongwoo86', 22.5, 10.9, 'up', 'oldroof');
    const dohyun = addActor('dohyun86', 27.5, 10.9, 'up', 'oldroof');
    await walkActor(player, 22.5, 15, 1.4);
    player.dir = 'up';
    await say(
      '옥상 문을 열자 차가운 바람이 훅 끼쳤다.',
      '천문대 돔 옆, 망원경 앞에 두 사람이 서 있다.',
    );
    jeongwoo.dir = 'down';
    dohyun.dir = 'down';
    await say(
      { who: '정우', text: '어, 손님이다! 관측회 온 거야?' },
      { who: '민경', text: '1학년 신문부 오민경입니다! 취재해도 될까요?' },
      { who: '도현', text: '…신문부? 이 시간에 학교에 있는 거 들키면 너도 혼나.' },
      { who: '정우', text: '괜찮아, 도현아. "누구나 환영"이라고 써 붙인 게 우리잖아.' },
      { who: '정우', text: '난 부장 한정우. 이쪽은 3학년 이도현. 궁금한 거 있으면 물어봐.' },
      '의자 위에서 알코올램프가 조용히 타고 있다.',
      { who: '도현', text: '렌즈에 이슬 맺히지 말라고 켜 둔 거야. 손 녹이기도 좋고.' },
    );

    // 선택: 질문은 하나만 (다시 하면 다른 답을 들을 수 있다)
    const q = await choose(
      ['선배들이 바빠 보인다. 하나만 물어볼 수 있을 것 같다.'],
      ['혜성은 어디 있어요?', '사진은 왜 찍어요?', '왜 천문부를 해요?'],
    );
    flags.mkAsk = ['comet', 'photo', 'why'][q];
    if (q === 0) {
      await say(
        { who: '정우', text: '직접 봐. 여기, 접안렌즈.' },
        '망원경에 눈을 댔다.',
        '…검은 하늘에 뿌연 솜뭉치 하나. 그 뒤로 희미한 꼬리가 길게 뻗어 있다.',
        { who: '민경', text: '이게… 76년 만에 온 혜성.' },
        { who: '정우', text: '4시 10분, 고도 12도.' },
        '선배가 일지에 무언가를 적었다.',
      );
    } else if (q === 1) {
      await say(
        { who: '도현', text: '원판에 찍어 둬야 나중에 별 사이 위치를 재서 궤도를 계산하지.' },
        { who: '도현', text: '지난주 원판은 지금 준비실 암실에서 박 선생님이 현상해 주시는 중이야.' },
        { who: '도현', text: '신임인데 사진엔 엄청 열심이셔. 오늘 숙직도 일부러 바꿔서 서셨대.' },
      );
    } else {
      flags.saw2061 = true;
      await say(
        { who: '정우', text: '…76년에 한 번이잖아.' },
        { who: '정우', text: '이번에 놓치면 다음은 2061년이야. 그땐 나도 아저씨겠지.' },
        { who: '정우', text: '그래서 정했어. 2061년엔 내 애랑 같이 보려고. 오늘 본 걸 그대로 얘기해 주면서.' },
        { who: '도현', text: '애는 무슨. 여자 친구부터 만들어.' },
        '두 선배가 낄낄 웃었다. 입김이 하얗게 흩어졌다.',
      );
    }

    await say(
      { who: '정우', text: '어, 원판 다 썼다. 도현아, 준비실 가서 새 원판 좀 가져와.' },
      { who: '도현', text: '…지금? 박 선생님 암실 쓰고 계실 텐데.' },
      { who: '정우', text: '살짝 들어갔다 나와. 4시 반 전에 한 장 더 찍어야 돼.' },
    );
    await walkActor(dohyun, 27.5, 18, 0.8);
    await walkActor(dohyun, 20, 21.5, 0.9);
    removeActor(dohyun);

    await say(
      '난간 너머로 학교 건물을 내려다보았다.',
      '…1층 창문 하나가 시뻘겋게 빛나고 있다.',
      { who: '민경', text: '선배! 저기 1층 창문 빨개요. 불… 난 거 아니에요?' },
      { who: '정우', text: '아, 저건 암실 안전등이야. 사진 현상할 땐 빨간 불만 켜거든.' },
      { who: '정우', text: '4시 25분, 고도 15도.' },
    );
    await wait(0.8);

    // ④ 화재벨
    flags.mkFire = true;
    startFireBell();
    await say(
      '따르르르르릉—!!',
      { who: '정우', text: '…화재벨?' },
      { who: '정우', text: '도현이…!' },
      '선배는 의자 위 알코올램프를 집어 뚜껑을 덮고는, 그대로 계단으로 뛰어갔다.',
    );
    await walkActor(jeongwoo, 20, 21.5, 0.9);
    removeActor(jeongwoo);
    // 음악실 선배들은 이미 뛰쳐나갔다
    for (const a of actors.filter(a => a.floor === 'old2')) removeActor(a);
    smoke = 'old1';
    await say({ who: '민경', text: '선배, 같이 가요!' });
  },

  // ⑤ 1층 준비실 앞: 어긋난 기억 — 장면이 지지직거리며 두 가지로 겹친다
  async mkDistort() {
    if (flags.memory !== 'minkyung' || !flags.mkFire) return;
    flags.mkDistort = true;
    player.dir = 'right';
    await say(
      '복도에 매캐한 연기가 차 있다. 준비실 쪽에서 붉은빛이 일렁인다.',
      '그때 나는 봤다.',
    );
    // 기억 A: 불붙은 램프를 들고 준비실 "안에서" 나오는 정우 (선생님이 믿는 장면)
    const jeongwoo = addActor('jeongwoo86', 55.5, 16.6, 'down', 'old1');
    startGlitch(0.5);
    await say('준비실 문이 열리고— 불붙은 알코올램프를 든 정우 선배가 걸어 나왔다.');
    // 기억 B: 계단 쪽에서 뚜껑 덮인 램프를 들고 달려오는 정우 — 두 장면이 번갈아 깜빡인다
    for (let i = 0; i < 3; i++) {
      startGlitch(0.35);
      Object.assign(jeongwoo, { x: 46.5 * TILE, y: 18.4 * TILE, dir: 'right' });
      await wait(0.35);
      startGlitch(0.35);
      Object.assign(jeongwoo, { x: 55.5 * TILE, y: 16.6 * TILE, dir: 'down' });
      await wait(0.45);
    }
    await say(
      '…아니.',
      '계단 쪽에서 뛰어오던 선배의 램프는… 뚜껑이 덮여 있지 않았던가?',
      '기억이 지지직거린다. 어느 쪽이었지?',
    );

    // 준비실에서 콜록거리며 나오는 도현, 정우의 한마디
    const dohyun = addActor('dohyun86', 56.5, 16.6, 'down', 'old1');
    await say(
      { who: '도현', text: '콜록, 콜록…!' },
      { who: '정우', text: '도현아! 괜찮아?' },
      '도현 선배의 완장 끝이 검게 그을려 있다.',
      { who: '정우', text: '(낮게) …넌 여기 없었던 거야. 가!' },
      '그 말만, 이상하게 또렷이 들렸다.',
    );
    await walkActor(dohyun, 56.5, 18.6, 0.4);
    await walkActor(dohyun, 46, 18.6, 1.2);
    removeActor(dohyun);

    // 복도 끝, 상자를 안은 어른의 그림자
    const shadow = addActor('shadow', 44.5, 17.4, 'left', 'old1');
    await say('복도 끝, 연기 너머로— 납작한 상자를 안은 어른의 그림자가 보였다.');
    await walkActor(shadow, 40, 17.4, 1.0);
    removeActor(shadow);
    await say('그림자는 현관 쪽으로 사라졌다.', '…나는 그 얘기를, 기사에 쓰지 않았다.');
    await SCRIPTS.mkReturn();
  },

  // ⑥ 현재로: 선생님의 기사 → 모순 → 선택 둘 (선생님에게 / 하율의 기사)
  async mkReturn() {
    stopFireBell();
    startGlitch(1.2);
    await wait(0.4);
    await new Promise(r => fadeTo(() => {
      fade.dir = 0;
      endMemory();
      // 빛찬·하율은 실험대 앞줄 오른쪽에 — 선생님이 나가는 길(왼쪽 문)을 막지 않게
      setFloor(1, { x: 41.5, y: 12.6, dir: 'up' });
      addActor('teacher', 39.5, 9, 'down', 1);
      Object.assign(companion, { floor: 1, x: 43 * TILE, y: 12.6 * TILE, dir: 'up', visible: true, following: false });
      r();
    }));
    await showChapter('2026년 11월 2일\n오후 5시 10분', 1.8);
    await fadeInAsync();
    await say(
      '노을이 거의 다 졌다. 선생님은 한참 말이 없었다.',
      { who: '오민경 선생님', text: '…그래서 썼어. "천문부 부장이 불붙은 램프를 들고 준비실에서 나왔다."' },
      { who: '오민경 선생님', text: '그게 내가 본 거야. 적어도… 그렇게 기억해.' },
      '그런데 이상하다. 선생님의 이야기 속에, 서로 맞지 않는 조각들이 있다.',
    );
    for (const c of Object.values(CONTRA)) {
      c.found = true;
      addEvidence(1);
    }
    Toast.show('수첩에 모순 4개를 적었다  (Tab)');
    await say(
      { who: ME, text: '(빨간 창문. 정우 선배는 "안전등"이라고 했어.)' },
      { who: ME, text: '(아빠는 벨이 울릴 때까지 옥상에 있었는데… 어떻게 준비실 "안"에서 나와?)' },
      { who: ME, text: '(그리고 "없었던 거야"라는 말. 그림자.)' },
    );

    // 선택: 선생님에게 (민경의 마음)
    const kind = await choose(
      ['선생님에게 뭐라고 할까?'],
      ['"왜 사실대로 안 쓰셨어요?"', '"그날… 많이 무서우셨죠."'],
    ) === 1;
    if (kind) {
      addHeart('minkyung', 2);
      await say(
        { who: '오민경 선생님', text: '…무서웠지. 열여섯 살이었으니까.' },
        { who: '오민경 선생님', text: '그리고 40년 동안은… 내가 쓴 그 기사가 무서웠어.' },
        '선생님은 처음으로 작게 웃었다.',
        { who: '오민경 선생님', text: '고마워. 누가 그렇게 물어봐 주길 기다렸나 봐.' },
        { who: '오민경 선생님', text: '…도현 선배. 지금 우리 학교 교장 선생님이야. 그분 기억은 또 다를 거야.' },
      );
    } else {
      addHeart('minkyung', -1);
      await say(
        { who: '오민경 선생님', text: '…사실대로 썼다니까. 내가 본 대로.' },
        '선생님은 창밖으로 고개를 돌렸다.',
        { who: '오민경 선생님', text: '오늘은 여기까지 하자. 늦었어.' },
      );
    }
    // 실험대 사이 통로 → 문 앞 → 문 밖 (꺾어서 걸어야 벽을 안 지난다)
    const teacher = actors.find(a => a.floor === 1);
    await walkActor(teacher, 39.5, 13.3, 0.6);
    await walkActor(teacher, 36.5, 13.3, 0.5);
    await walkActor(teacher, 36.5, 16.5, 0.5);
    removeActor(teacher);

    // 선택: 하율의 기사 (기사 값)
    await say(
      '선생님이 나가고, 과학실엔 둘만 남았다.',
      { who: FRIEND, text: '빛찬아… 이거 진짜 엄청난 얘기야.' },
      { who: FRIEND, text: '근데 선생님 기사엔 "램프 부주의"라고 돼 있잖아. 그게 진짜인지는 어떻게 알아?' },
      { who: ME, text: '확인해 보면 되지. 여긴 과학실이니까.' },
      { who: FRIEND, text: '오, 과학탐구부 부장님 등판?' },
      { who: FRIEND, text: '잘 들어. 맞는 증거를 대면 기사의 신뢰도가 깎여. 바닥나면 반박하면 돼.' },
      { who: FRIEND, text: '대신 엉뚱한 걸 들이밀면 네 머리만 아프다? 정신력 조심해.' },
    );
    // 첫 검증: 학보의 "램프 부주의" (experiment.js)
    await SCRIPTS.expCombustion();
    await say(
      { who: FRIEND, text: '대박… 램프가 아니었어. 40년 동안 기사가 틀렸던 거야.' },
      { who: FRIEND, text: '금요일이 학보 마감이거든. 이거, 40년 만의 정정 기사야.' },
    );
    const allow = await choose(
      ['하율이 기자 수첩을 꼭 쥐고 있다. "이거… 기사로 써도 돼?"'],
      ['"써도 돼."', '"조금만 기다려 줘."'],
    ) === 0;
    flags.articleOk = allow;
    if (allow) {
      addArticle(2);
      await say(
        { who: FRIEND, text: '진짜? 고마워! 특종이다…!' },
        '하율의 눈이 반짝였다.',
        '…괜찮은 걸까. 아직 다 밝혀진 것도 아닌데.',
      );
    } else {
      await say(
        { who: FRIEND, text: '…그래. 네 아빠 일이니까.' },
        { who: FRIEND, text: '대신 약속해. 다 밝혀지면, 그때 제일 먼저 나한테 말하기.' },
        { who: ME, text: '응. 약속.' },
      );
    }
    flags.mkDone = true;
    companion.following = true;
    placeCompanionBehind();
    await say({ who: FRIEND, text: '이도현 교장 선생님… 내일 찾아가 보자.' });
  },

  // 과학실 연소 실험 — 민경 회상 직후 첫 검증 (mkReturn), 개발자 메뉴에서도 바로 할 수 있다
  async expCombustion() {
    const run = storyRun;
    const won = await Experiment.start(EXPERIMENTS.combustion);
    alive(run);
    if (won && !BURN_CLUE.found) {
      BURN_CLUE.found = true;
      addEvidence(1);
      Toast.show(`새 단서: ${BURN_CLUE.name}  (Tab)`, clueImage(BURN_CLUE.name));
    }
  },

  // Q: 하율에게 묻기 — 지금 있는 방 이야기를 먼저, 그다음 해야 할 일 힌트
  async friend() {
    // 1장 마무리 단계에선 그게 최우선
    if (flags.ch1Ready && !flags.foundLog) {
      await say({ who: FRIEND, text: '준비실 서류함, 맨 아래 "천문부" 칸! 얼른 열어 보자.' });
      return;
    }
    if (flags.mkDone) {
      await say(
        { who: FRIEND, text: '선생님 기억엔 구멍이 너무 많아. 빨간 창문, 램프, 그림자…' },
        { who: FRIEND, text: '"넌 여기 없었던 거야." 그 말 들은 사람… 이도현 교장 선생님한테 직접 물어보자.' },
      );
      return;
    }
    if (flags.ch2Started && !flags.ch2Intro) {
      await say({ who: FRIEND, text: '과학실 가자. 선생님 기다리시겠다.' }, { who: FRIEND, text: '…나 좀 떨려. 너는?' });
      return;
    }
    if (flags.ch1Done) {
      await say(
        { who: FRIEND, text: '방과 후에 과학실… 오민경 선생님한테 물어볼 게 산더미야.' },
        { who: FRIEND, text: '뜯겨 나간 일지 마지막 장. 그게 제일 궁금해.' },
      );
      return;
    }
    // 1) 지금 이 방에 아직 안 본 단서가 있으면
    const here = currentRegion ? `${floor.map.label} · ${currentRegion.name}` : null;
    const cluesHere = CLUES.filter(c => c.place === here && !c.story);
    const leftHere = cluesHere.filter(c => !c.found);
    if (leftHere.length) {
      await say(
        { who: FRIEND, text: '여기 아직 안 본 게 있는 것 같은데?' },
        { who: FRIEND, text: leftHere.length > 1 ? '나라면 벽이랑 구석부터 뒤져 볼 거야. 오래된 건 꼭 그런 데 있더라.' : '하나만 더 보면 될 것 같은데. 구석구석 다시 살펴보자.' },
      );
      return;
    }
    // 2) 부장님 호출을 받고 아직 신문부실에 안 갔으면 그게 먼저
    if (flags.calledAway && !flags.metNewsroom) {
      await say(
        { who: FRIEND, text: '부장님 기다리시겠다. 신문부실부터 가자.' },
        { who: FRIEND, text: '3층 계단 바로 옆이야.' },
      );
      return;
    }
    // 3) 이 방은 다 봤으면 한마디 하고 다음 할 일로
    const pages = cluesHere.length ? [{ who: FRIEND, text: '여기선 더 나올 건 없는 것 같아.' }] : [];

    const prepClues = ['멈춘 시계', '그을음 자국', '먼지 없는 자국', '천문부 이름표'];
    const newsClues = ['1986년 학보', '빈 원판 봉투'];
    if (!hasClue('과학탐구부 활동 일지')) {
      pages.push({ who: FRIEND, text: '일단 동아리방부터 가 보자. 1층 계단 바로 옆이었지?' });
    } else if (!hasClue('천문부 망원경')) {
      pages.push(
        { who: FRIEND, text: '동아리방 구석에 있는 그 망원경 말이야.' },
        flags.sawPhoto
          ? { who: FRIEND, text: '엄청 오래돼 보이던데. 너네 아빠 사진에 나온 거랑 비슷하다며?' }
          : { who: FRIEND, text: '엄청 오래돼 보이던데. 한번 자세히 봐 봐.' },
      );
    } else if (!hasClue('공사 안내문')) {
      pages.push({ who: FRIEND, text: '1층 복도 게시판에 공사 안내문 붙어 있던데. 날짜 확인해 두자.' });
    } else if (!prepClues.every(hasClue)) {
      pages.push(
        { who: FRIEND, text: '과학준비실 가 보자. 과학실 바로 옆이야.' },
        { who: FRIEND, text: '버리기 전에 뭐가 있는지 다 봐 둬야지.' },
      );
    } else if (!flags.metNewsroom) {
      pages.push({ who: FRIEND, text: '1층은 거의 다 본 것 같아. 위층도 올라가 보자.' });
    } else if (!newsClues.every(hasClue)) {
      pages.push({ who: FRIEND, text: '신문부실 서류함이랑 원판 상자, 마저 보자.' });
    } else if (hasClue('1986년 학보') && !hasClue('야간 자율학습 출석부')) {
      pages.push(
        { who: FRIEND, text: '학보 기자가 1학년 오민경… 그 밤에 학교에 있었다는 거잖아.' },
        { who: FRIEND, text: '그 시간에 학교에 남아 있을 이유가 뭐였을까? 3층 자율학습실 한번 가 보자.' },
      );
    } else if (!['학교 연혁', '40년 전 2학년 3반', '핼리 관측회 전단'].every(hasClue)) {
      pages.push(
        { who: FRIEND, text: '2층도 제대로 다시 보자. 복도 전시장이랑, 음악실 악보장.' },
        { who: FRIEND, text: '2학년 3반은 요즘 "40년 전 우리 반" 과제 한다더라. 1986년이면 딱 그때잖아.' },
      );
    } else {
      const n = CLUES.filter(c => c.found).length;
      pages.push(
        { who: FRIEND, text: `지금까지 단서 ${n}개. 내 기자 수첩에도 다 적어 놨어.` },
        { who: FRIEND, text: '아직 못 가 본 데 있지? 오래된 건 의외의 데 숨어 있더라.' },
      );
    }
    await say(...pages);
  },
};

// ── 시작 ──
async function startStory(withTitle) {
  const run = ++storyRun;
  cutscene = true;
  fade.alpha = 1;
  fade.dir = 0;
  setFloor('home', HOME_START);
  try {
    if (withTitle) await showTitle();
    if (run !== storyRun) return;
    await SCRIPTS.wakeUp();
    currentRegion = null;   // 타이틀 뒤에 가려져 못 본 "내 방" 이름을 눈뜬 뒤에 다시 띄운다
  } catch (e) {
    if (e !== STOP) throw e;
  } finally {
    if (run === storyRun) cutscene = false;
  }
}

// Esc 메뉴의 '처음부터 다시'
function restartStory() {
  stopStory();
  resetFlags();
  startStory(false);
}

// 진행 중인 컷신·대사·화면 전환을 모두 멈춘다 (처음부터 다시, 개발자 메뉴 이동)
function stopStory() {
  storyRun++;
  titleEl.classList.remove('show');
  chapterEl.classList.remove('show');
  closeDialog();
  Experiment.abort();
  stopFireBell();
  cutscene = false;
  Object.assign(fade, { alpha: 0, dir: 0, action: null, done: null });
  actors.length = 0;
}

// ─────────────────────────────────────────────
// 개발자 메뉴 (` 키) — 테스트할 때 원하는 장소·이야기 단계로 바로 가기
// ─────────────────────────────────────────────

// [이름, 장소, x, y] (x, y 는 발밑 위치, 타일 단위)
const DEV_SPOTS = [
  ['집 · 내 방', 'home', 5, 8],
  ['집 · 거실', 'home', 21, 11],
  ['버스 (창밖 풍경)', 'bus', 13.5, 4.95],
  ['1층 · 앞마당', 1, 8, 37],
  ['1층 · 과학탐구부실', 1, 46, 29],
  ['1층 · 과학준비실', 1, 58, 7],
  ['1층 · 기록 보관실', 1, 26.5, 24],
  ['1층 · 체육관', 1, 80, 50],
  ['2층 · 복도', 2, 20, 18],
  ['2층 · 음악실', 2, 14, 27],
  ['2층 · 2학년 3반', 2, 37.5, 14],
  ['3층 · 복도', 3, 20, 18],
  ['3층 · 신문부실', 3, 24.5, 27],
  ['3층 · 자율학습실', 3, 50, 23],
  ['[1986] 1층 복도', 'old1', 20, 18],
  ['[1986] 과학준비실 (암실)', 'old1', 58, 7],
  ['[1986] 숙직실', 'old1', 21, 28],
  ['[1986] 천문부실', 'old1', 46, 29],
  ['[1986] 2층 음악실', 'old2', 14, 26],
  ['[1986] 3층 자율학습실', 'old3', 50, 23],
  ['[1986] 옥상 천문대', 'oldroof', 20, 20],
];
const isPast = where => String(where).startsWith('old');

// 이야기 단계: 그 시점까지의 플래그·단서를 맞추고 그 자리로
const DEV_STAGES = [
  ['처음부터 (타이틀)', 'title'],
  ['프롤로그 끝 — 학교 도착, 하율 합류', 'school'],
  ['2층 호출 직후 — 하율은 3층에', 'away'],
  ['신문부 합류 후', 'news'],
  ['1장 마무리 직전 — 서랍 열기 전', 'ch1ready'],
  ['2장 시작 — 방과 후, 과학실로', 'ch2'],
  ['2장 — 오민경의 기억 들어가기', 'mk'],
  ['2장 — 민경의 기억: 옥상 인터뷰', 'mkroof'],
  ['2장 — 민경의 기억: 화재 뒤 1층', 'mkfire'],
];

const findClue = name => { const c = CLUES.find(k => k.name === name); if (c) c.found = true; };

function devStage(stage) {
  stopStory();
  resetFlags();
  for (const c of CLUES) c.found = false;
  if (stage === 'title') {
    startStory(true);
    return;
  }
  // 프롤로그는 다 본 것으로
  Object.assign(flags, { talkedDad: true, sawPhoto: true, askedPhoto: true, friendJoined: true });
  findClue('아빠의 사진');
  companion.visible = true;
  companion.following = true;

  if (stage === 'school') {
    setFloor(1, SCHOOL_ARRIVE);
  } else if (stage === 'away') {
    flags.calledAway = true;
    companion.following = false;
    Object.assign(companion, { floor: 3, x: 21.5 * TILE, y: 28 * TILE, dir: 'right' });
    setFloor(2, ELEVATOR_ARRIVE);
  } else {
    Object.assign(flags, { calledAway: true, metNewsroom: true });
    if (stage === 'news') {
      setFloor(3, { x: 24.5, y: 27, dir: 'down' });
      return;
    }
    CH1_KEYS.forEach(findClue);
    flags.ch1Ready = true;
    if (stage !== 'ch1ready') {
      Object.assign(flags, { foundLog: true, ch1Done: true });
      LOG_CLUE.found = true;
    }
    if (stage === 'ch2' || stage === 'mk') {
      flags.ch2Started = true;
      setupAfterSchool();
      if (stage === 'mk') {
        flags.ch2Intro = true;
        runScript('enterMinkyung');
      }
      return;
    }
    if (stage === 'mkroof' || stage === 'mkfire') {
      Object.assign(flags, { ch2Started: true, ch2Intro: true, mkSawNote: true, mkMusic: true });
      if (stage === 'mkroof') {
        beginMinkyungMemory('oldroof', { x: 20, y: 21, dir: 'up' });
      } else {
        Object.assign(flags, { mkRoof: true, mkFire: true, mkAsk: 'comet' });
        beginMinkyungMemory('old1', { x: 44.5, y: 18.5, dir: 'right' });
        smoke = 'old1';
        startFireBell();
      }
      return;
    }
    setFloor(1, { x: 60.5, y: 6, dir: 'up' });   // 준비실 서류함 앞
  }
}

const onOff = v => (v ? '켬' : '끔');
function devMenuItems() {
  return [
    { id: 'spots', label: '장소 이동 ▶' },
    { id: 'stages', label: '이야기 단계로 이동 ▶' },
    { id: 'allClues', label: '단서 모두 얻기' },
    { id: 'noClues', label: '단서 모두 지우기' },
    { id: 'expCombustion', label: '실험: 연소 실험 (민경 회상 직후 단서)' },
    { id: 'noclip', label: `벽 통과: ${onOff(dev.noclip)}` },
    { id: 'fastText', label: `대사 빠르게: ${onOff(dev.fastText)}` },
    { id: 'fastMove', label: `빠르게 걷기: ${onOff(dev.fastMove)}` },
    { id: 'info', label: `FPS·좌표·플래그 보기: ${onOff(dev.info)}` },
    { id: 'close', label: '닫기' },
  ];
}

function pickDev(id) {
  const main = (at, msg = '') => DevMenu.show(devMenuItems(), msg, at);
  if (id === 'spots') {
    DevMenu.show([...DEV_SPOTS.map((s, i) => ({ id: `go:${i}`, label: s[0] })), { id: 'back', label: '◀ 뒤로' }]);
  } else if (id === 'stages') {
    DevMenu.show([...DEV_STAGES.map(([label, key]) => ({ id: `stage:${key}`, label })), { id: 'back', label: '◀ 뒤로' }],
      '그 시점까지의 단서·진행 상태로 맞춘다.');
  } else if (id.startsWith('go:')) {
    const [, where, x, y] = DEV_SPOTS[Number(id.slice(3))];
    stopStory();
    // 1986년 회상엔 하율이 없다 (2026년으로 돌아오면 다시 따라온다)
    // 기억 속에서 현재 장소로 나오면 기억 상태(외형·연기·화재벨)를 정리한다
    if (!isPast(where) && flags.memory) endMemory();
    // 하율이 신문부 호출로 따로 가 있는 동안엔 다시 따라오지 않는다
    const friendAway = flags.calledAway && !flags.metNewsroom;
    companion.visible = !isPast(where) && flags.friendJoined;   // 따로 가 있으면 신문부실에 보인다
    companion.following = companion.visible && !friendAway;
    setFloor(where, { x, y, dir: 'down' });
    DevMenu.close();
  } else if (id.startsWith('stage:')) {
    devStage(id.slice(6));
    DevMenu.close();
  } else if (id === 'allClues') {
    for (const c of CLUES) c.found = true;
    flags.ch1Ready = true;
    main(2, '단서를 모두 얻었다.');
  } else if (id === 'noClues') {
    for (const c of CLUES) c.found = false;
    main(3, '단서를 모두 지웠다.');
  } else if (id === 'expCombustion') {
    // 민경 회상 직후 상태(1장 단서 + 모순 4개)로 맞추고 과학실에서 바로 실험 시작
    devStage('ch1done');
    for (const c of Object.values(CONTRA)) c.found = true;
    setFloor(1, { x: 40.5, y: 9.5, dir: 'up' });
    DevMenu.close();
    runScript('expCombustion');
  } else if (id in dev) {
    dev[id] = !dev[id];
    main(['noclip', 'fastText', 'fastMove', 'info'].indexOf(id) + 5);
  } else if (id === 'back') {
    main(0);
  } else if (id === 'close') {
    DevMenu.close();
  }
}

// 개발용: index.html?at=타일x,타일y[,장소][&friend] — 프롤로그 건너뛰고 그 자리에서 시작
//         index.html?stage=ch2 — 개발자 메뉴의 이야기 단계로 바로 시작 (DEV_STAGES 의 키)
const devParams = new URLSearchParams(location.search);
const devAt = devParams.get('at');
if (devParams.get('stage')) {
  devStage(devParams.get('stage'));
} else if (devAt) {
  const [tx, ty, where = '1'] = devAt.split(',');
  if (devParams.has('friend')) {
    flags.friendJoined = true;
    companion.visible = true;
    companion.following = true;
  }
  setFloor(isNaN(where) ? where : Number(where), { x: Number(tx) + 0.5, y: Number(ty) + 1, dir: 'down' });
  // &exp — 1장 단서를 갖춘 채 연소 실험 바로 시작
  if (devParams.has('exp')) {
    CH1_KEYS.forEach(findClue);
    LOG_CLUE.found = true;
    for (const c of Object.values(CONTRA)) c.found = true;
    runScript('expCombustion');
  }
} else {
  startStory(true);
}
