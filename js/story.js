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

// 이야기 진행 상태 (조사·대화로 바뀐다)
const flags = {};
function resetFlags() {
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
    ch1Done: false,      // 1장 끝 (민경 선생님 등장까지 봄)
    ch2Started: false,   // 2장 시작: 방과 후, 과학실로 가야 한다
    ch2Intro: false,     // 과학실에서 선생님 이야기를 듣기 시작함
    memory: null,        // 지금 누구의 기억 속인지 ('minkyung' …), 현실이면 null
  });
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

// ── 과학실 실험 (experiment.js) — 주장마다 대사와 단서 반응 ──
// 페이지 형식은 대사창과 같다. clues: 단서 이름 → { dmg: 깎는 신뢰도, text, unlock: 실험 기준이 생김 }
const EXPERIMENTS = {
  combustion: {
    title: '연소 실험',
    mini: 'combustion',
    claim: '"알코올램프가 넘어져서 불이 났다"',
    source: '— 기억 속의 이도현 (1986년, 3학년)',
    intro: [
      '기억 속의 이도현이 알코올램프를 치켜든다.',
      '주장 「알코올램프가 넘어져서 불이 났다」가 앞을 가로막는다!',
    ],
    observe: [
      ['주장을 살펴본다.', '학보에 따르면 알코올램프는 준비실 작업대 위에 있었다.'],
      ['불은 위로, 그리고 옆으로 번진다.', '그래서 벽에 남는 그을음은 V자 모양이 된다.'],
      ['V자의 꼭짓점… 거기가 불이 처음 붙은 곳이다.', '준비실 그을음이 어떤 모양이었는지 떠올려 보자. ([단서])'],
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
          '주장이 움찔했다.',
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
        text: ['학보를 내밀었다.', '…학보도 "램프 부주의"라고 적고 있다. 오히려 주장에 힘을 실어 줬다.'],
      },
      '가스 밸브 경고': {
        dmg: 0,
        text: ['"실험 후 가스 밸브 확인!"', '…준비실 화재와는 상관없는 경고문이다.'],
      },
    },
    wrongClue: name => [`「${name}」… 이 주장과는 관계가 없어 보인다.`],
    noTarget: ['비교할 기준이 없다.', '그을음이 어떤 모양이었는지 먼저 떠올려 보자. ([단서])'],
    expDone: ['이미 확인한 실험이다.'],
    notYet: ['아직 근거가 부족하다.', '주장의 신뢰도를 더 깎아야 한다.'],
    broken: ['주장의 신뢰도가 바닥났다.', '지금이라면… [반박]할 수 있다!'],
    taunts: ['학보에 다 나와 있잖아.', '램프였어. 내가 봤다고.', '40년이나 지난 일이야.', '다 끝난 일을 왜 들쑤셔?'],
    tauntsWeak: ['…램프였어. 그래야만 해.', '콘센트라니… 그럼 그날 밤 정우는…'],
    // 반격 순서 (experiment.js 의 ATTACKS): 비커 비, 바닥에서 솟는 불, 던지는 독 플라스크, 시험관 소나기
    attacks: ['beaker', 'flame', 'poison', 'tube'],
    win: [
      { who: ME, text: '알코올램프는 작업대 위에 있었어. 그런데 그을음의 꼭짓점은 바닥, 콘센트 앞이야.' },
      { who: ME, text: '불은 램프에서 시작된 게 아니야.' },
      '주장 「알코올램프가 넘어져서 불이 났다」를 반박했다!',
    ],
  },
};

resetFlags();

// ── 스크립트에서 쓰는 도구 ──
// 이야기가 새로 시작되거나 건너뛰면(storyRun 이 바뀌면) say·wait 다음에서 STOP 을 던져 스크립트를 끊는다
const STOP = Symbol('stop');
const alive = run => { if (run !== storyRun) throw STOP; };
const say = (...pages) => { const run = storyRun; return openDialog(pages).then(() => alive(run)); };
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

const hasClue = name => CLUES.some(c => c.name === name && c.found);

// 인물(하율 또는 컷신용 NPC)을 (x, y)까지 sec초 동안 걷게 (타일 단위)
async function walkActor(a, x, y, sec) {
  const sx = a.x, sy = a.y, ex = x * TILE, ey = y * TILE;
  a.dir = Math.abs(ex - sx) > Math.abs(ey - sy) ? (ex > sx ? 'right' : 'left') : (ey > sy ? 'down' : 'up');
  a.moving = true;
  const steps = Math.max(1, Math.round(sec * 60));
  for (let i = 1; i <= steps; i++) {
    a.x = sx + (ex - sx) * i / steps;
    a.y = sy + (ey - sy) * i / steps;
    a.anim += 1 / 60;
    await wait(1 / 60);
  }
  a.moving = false;
  a.anim = 0;
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
    return [{ text: '오민경의 기억 — 1986년 3월 21일 새벽' }, { text: '옥상 관측회를 취재하러 가는 중' }];
  }
  if (isPast(here)) return [{ text: '1986년 3월 21일 새벽 — 기억 속' }];
  if (here === 'home') doing = flags.talkedDad ? '현관으로 나가는 중' : '등교 준비 중';
  else if (here === 'bus') doing = '학교 가는 중';
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
        { who: ME, text: '응. 폐부 심사 전에 동아리방 정리해야 돼.' },
        { who: '아빠', text: '…그래. 너무 늦게 다니지는 말고.' },
      );
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
      { who: '아빠', text: '버스 시간 다 됐다. 얼른 가.' },
      '아빠는 신문으로 얼굴을 가렸다.',
    );
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
      if (flags.askedPhoto) await say('"다 옛날 얘기야."', '…옛날 얘기면, 왜 그렇게까지 피하는 걸까.');
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
      { who: ME, text: '…알았어. 고마워, 하율아.' },
      { who: FRIEND, text: '좋아, 일단 동아리방부터 가자!' },
    );
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
      { who: FRIEND, text: '같이 보자, 빛찬아!' },
    );
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
      { who: ME, text: '…근데 준비실 서류함에 "천문부" 칸이 아직 남아 있었어.' },
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
      '선생님은 손을 뻗다 말고, 천천히 다시 내렸다.',
      { who: '오민경 선생님', text: '…아니다. 방과 후에 과학실로 와. 둘 다.' },
    );
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
      { who: '오민경 선생님', text: '…그 일지, 다시 한번 보여 줄래?' },
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
      ambient = null;
      actors.length = 0;
      companion.following = false;
      companion.visible = false;
      flags.memory = 'minkyung';
      setPlayerLook('minkyung86');
      setFloor('old3', MINKYUNG_START);
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

  // 과학실 연소 실험 (지금은 개발자 메뉴로만 — 3장 「검증」에서 이야기에 붙인다)
  async expCombustion() {
    const run = storyRun;
    const won = await Experiment.start(EXPERIMENTS.combustion);
    alive(run);
    if (won && !BURN_CLUE.found) {
      BURN_CLUE.found = true;
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
  ['1장 끝난 뒤', 'ch1done'],
  ['2장 시작 — 방과 후, 과학실로', 'ch2'],
  ['2장 — 오민경의 기억 들어가기', 'mk'],
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
    { id: 'expCombustion', label: '실험: 연소 실험 (1장 단서 지급)' },
    { id: 'noclip', label: `벽 통과: ${onOff(dev.noclip)}` },
    { id: 'fastText', label: `대사 빠르게: ${onOff(dev.fastText)}` },
    { id: 'fastMove', label: `빠르게 걷기: ${onOff(dev.fastMove)}` },
    { id: 'info', label: `좌표·플래그 보기: ${onOff(dev.info)}` },
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
    companion.following = companion.visible = !isPast(where) && flags.friendJoined;
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
    // 1장 끝난 상태로 맞추고 과학실에서 바로 실험 시작
    devStage('ch1done');
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
    runScript('expCombustion');
  }
} else {
  startStory(true);
}
