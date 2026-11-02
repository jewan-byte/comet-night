'use strict';
// ─────────────────────────────────────────────
// clueart.js — 단서마다 작은 픽셀 일러스트 (40×30)
// 단서 수첩과 새 단서 알림에 쓴다. 키는 map.js 의 clue() 이름과 같다.
// ─────────────────────────────────────────────

const CLUE_W = 40, CLUE_H = 30;

// 원 위의 점 찍기 (시계, 망원경 렌즈 등)
function ring(g, cx, cy, r, color) {
  for (let a = 0; a < 360; a += 4) {
    rect(g, Math.round(cx + Math.cos(a * Math.PI / 180) * r), Math.round(cy + Math.sin(a * Math.PI / 180) * r), 1, 1, color);
  }
}
// 중심에서 각도 방향으로 선 (0° = 12시)
function hand(g, cx, cy, deg, len, color) {
  const rad = (deg - 90) * Math.PI / 180;
  for (let i = 0; i <= len; i++) rect(g, Math.round(cx + Math.cos(rad) * i), Math.round(cy + Math.sin(rad) * i), 1, 1, color);
}
// 글줄 흉내
function textLines(g, x, y, w, rows, color, gap = 3) {
  for (let r = 0; r < rows; r++) rect(g, x, y + r * gap, Math.max(2, w - (r * 7) % 9), 1, color);
}

const CLUE_ART = {
  '아빠의 사진'(g) {
    rect(g, 4, 3, 32, 24, '#3a2a1a');
    rect(g, 6, 5, 28, 20, '#c8b89a');
    rect(g, 6, 18, 28, 7, '#a8987a');
    for (const x of [10, 15, 20, 25]) {
      rect(g, x, 11, 3, 3, '#6a5a40');
      rect(g, x - 1, 14, 5, 6, '#5a4a32');
    }
    for (let i = 0; i < 7; i++) rect(g, 29 - i, 8 + i, 2, 1, '#4a3a28');   // 망원경
    rect(g, 26, 15, 1, 5, '#4a3a28');
    rect(g, 30, 20, 4, 4, '#f4efe2');                                       // 뒷면 메모 귀퉁이
  },

  '공사 안내문'(g) {
    rect(g, 9, 2, 22, 26, '#f4efe2');
    rect(g, 9, 2, 22, 5, '#c8323c');
    textLines(g, 12, 10, 16, 5, '#8a847a');
    for (let i = 0; i < 4; i++) rect(g, 12 + i * 4, 24, 2, 2, i % 2 ? '#2a2a2a' : '#f0c040');  // 공사 줄무늬
  },

  '책상의 낙서'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#c99e68');
    for (let y = 3; y < CLUE_H; y += 6) rect(g, 0, y, CLUE_W, 1, '#b88a55');
    // "76"
    const D = { 7: ['1111', '0001', '0010', '0100', '0100'], 6: ['0110', '1000', '1110', '1001', '0110'] };
    [7, 6].forEach((d, i) => D[d].forEach((row, r) => {
      for (let c = 0; c < 4; c++) if (row[c] === '1') rect(g, 10 + i * 11 + c * 2, 8 + r * 2, 2, 2, '#5a3a1e');
    }));
    rect(g, 8, 22, 24, 1, '#7a5230');
  },

  '가스 밸브 경고'(g) {
    rect(g, 2, 3, 36, 24, '#73532f');
    rect(g, 4, 5, 32, 20, '#2f5b47');
    rect(g, 10, 8, 2, 9, '#e8f0e8');
    rect(g, 10, 19, 2, 2, '#e8f0e8');
    ring(g, 26, 15, 5, '#e8f0e8');                 // 밸브 손잡이
    rect(g, 21, 15, 11, 1, '#e8f0e8');
    rect(g, 26, 10, 1, 11, '#e8f0e8');
  },

  '천문부 이름표'(g) {
    rect(g, 3, 4, 34, 22, '#8d969e');
    rect(g, 5, 6, 30, 18, '#9fa8b0');
    rect(g, 10, 11, 20, 8, '#f4efe2');
    rect(g, 13, 13, 3, 3, '#f0c040');              // 별
    rect(g, 14, 12, 1, 5, '#f0c040');
    rect(g, 12, 14, 5, 1, '#f0c040');
    textLines(g, 19, 13, 9, 2, '#6a645a');
    rect(g, 17, 21, 6, 1, '#4f575e');
  },

  '멈춘 시계'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#e2d7bc');
    ring(g, 20, 15, 11, '#3a3a44');
    ring(g, 20, 15, 12, '#3a3a44');
    for (let h = 0; h < 12; h++) hand(g, 20, 15, h * 30, 9, '#e2d7bc');
    for (let h = 0; h < 12; h++) {
      const rad = (h * 30 - 90) * Math.PI / 180;
      rect(g, Math.round(20 + Math.cos(rad) * 9), Math.round(15 + Math.sin(rad) * 9), 1, 1, '#3a3a44');
    }
    hand(g, 20, 15, 140, 5, '#1a1a1a');   // 4시 40분
    hand(g, 20, 15, 240, 8, '#1a1a1a');
    rect(g, 20, 15, 1, 1, '#c8323c');
  },

  '먼지 없는 자국'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#b07a45');
    for (let i = 0; i < 160; i++) rect(g, Math.floor(hash(i, 1) * CLUE_W), Math.floor(hash(1, i) * CLUE_H), 1, 1, '#d8c8b0');
    rect(g, 12, 9, 16, 12, '#8a5a30');            // 깨끗한 네모
    rect(g, 12, 9, 16, 1, '#7a4a24');
  },

  '그을음 자국'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#d2d7da');
    for (let x = 7; x < CLUE_W; x += 8) rect(g, x, 0, 1, CLUE_H, '#adb4b9');
    for (let y = 7; y < CLUE_H; y += 8) rect(g, 0, y, CLUE_W, 1, '#adb4b9');
    DECO_ART.scorch(g, 6, 3, 28, 24);
  },

  '비어 있는 1986년'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#3e2716');
    const colors = ['#a8434a', '#3f6aa1', '#5e8f4e', '#c9a046', '#7b4f8f', '#2f6b6b'];
    for (let i = 0; i < 9; i++) {
      if (i === 5) continue;                                    // 1986년 자리
      rect(g, 2 + i * 4, 5, 3, 22, colors[i % colors.length]);
      rect(g, 2 + i * 4, 9, 3, 1, '#f0e0a0');
    }
    rect(g, 22, 5, 3, 22, '#1a0f08');
    rect(g, 20, 2, 7, 2, '#f0c040');                           // 빈칸 위 표시
  },

  '폐부 심사'(g) {
    rect(g, 2, 3, 36, 24, '#9aa3ab');
    rect(g, 3, 4, 34, 22, '#f4f6f8');
    textLines(g, 6, 8, 18, 2, '#4a4a4a', 4);
    ring(g, 28, 10, 5, '#d04a4a');
    rect(g, 26, 9, 4, 2, '#d04a4a');
    rect(g, 6, 20, 14, 1, '#4a7bd0');                          // "포기 안 함"
    rect(g, 7, 22, 9, 1, '#4a7bd0');
  },

  '천문부 망원경'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#1d2233');
    for (let i = 0; i < 14; i++) rect(g, Math.floor(hash(i, 7) * CLUE_W), Math.floor(hash(7, i) * 16), 1, 1, '#ffe9a0');
    for (let i = 0; i < 14; i++) rect(g, 8 + i, 6 + Math.round(i * 0.6), 4, 3, '#e4e6ee');
    rect(g, 7, 5, 2, 3, '#5f8fb8');
    rect(g, 20, 14, 4, 3, '#3a3f48');
    for (let i = 0; i < 11; i++) {
      rect(g, 21 - Math.round(i * 0.6), 17 + i, 1, 1, '#8a8f98');
      rect(g, 22 + Math.round(i * 0.6), 17 + i, 1, 1, '#8a8f98');
    }
    rect(g, 26, 22, 8, 3, '#c9a646');                          // "1986" 긁힌 자국
  },

  '과학탐구부 활동 일지'(g) {
    rect(g, 3, 3, 34, 24, '#5a4a7a');
    rect(g, 5, 4, 14, 22, '#f4efe2');
    rect(g, 21, 4, 14, 22, '#f4efe2');
    rect(g, 19, 4, 2, 22, '#d8d0bc');
    textLines(g, 7, 8, 10, 5, '#9a948a');
    textLines(g, 23, 8, 10, 3, '#9a948a');
    rect(g, 25, 20, 5, 4, '#d04a4a');                           // "1명"
  },

  '잠긴 서랍'(g) {
    rect(g, 3, 5, 34, 20, '#8d969e');
    rect(g, 5, 7, 30, 16, '#9fa8b0');
    rect(g, 14, 11, 12, 3, '#f4efe2');
    ring(g, 20, 17, 2, '#c9a646');
    rect(g, 17, 18, 7, 6, '#d9b43a');
    rect(g, 20, 20, 1, 2, '#5a4a1a');
  },

  '천문부 완장'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#3a8a9a');
    rect(g, 4, 9, 32, 12, '#c8323c');
    rect(g, 4, 9, 32, 1, '#e05a5a');
    rect(g, 4, 20, 32, 1, '#8a1e28');
    rect(g, 18, 12, 4, 4, '#f0d050');
    rect(g, 19, 11, 2, 6, '#f0d050');
    rect(g, 17, 13, 6, 2, '#f0d050');
    textLines(g, 7, 14, 8, 1, '#f4efe2');
    textLines(g, 25, 14, 8, 1, '#f4efe2');
    for (let i = 0; i < 18; i++) rect(g, 30 + Math.floor(hash(i, 4) * 6), 9 + Math.floor(hash(4, i) * 12), 1, 1, '#2a1a18');   // 그을린 끝
  },

  '연소 실험 결과'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#c9cfd3');
    rect(g, 0, 25, CLUE_W, 5, '#7a6a58');
    for (let y = 2; y < 24; y++) {                              // V자 그을음
      const half = 1 + (23 - y) * 0.45;
      rect(g, Math.round(26 - half), y, Math.round(half * 2), 1, 'rgba(40,28,28,0.35)');
    }
    rect(g, 24, 20, 4, 4, '#e8e4da');                           // 콘센트
    rect(g, 25, 21, 1, 1, '#3a3a3a');
    rect(g, 27, 21, 1, 1, '#3a3a3a');
    rect(g, 3, 17, 14, 2, '#8f6236');                           // 작업대 + 램프 (X)
    rect(g, 8, 13, 4, 4, '#bfe3ef');
    for (let i = 0; i < 5; i++) {
      rect(g, 7 + i, 11 + i, 1, 1, '#d03a3a');
      rect(g, 11 - i, 11 + i, 1, 1, '#d03a3a');
    }
  },

  '카세트테이프'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#3a3440');
    rect(g, 4, 5, 32, 20, '#2a2a30');
    rect(g, 4, 5, 32, 1, '#4a4a55');
    rect(g, 7, 7, 26, 7, '#f4efe2');                            // 라벨
    textLines(g, 9, 9, 20, 2, '#4a6ac8');
    rect(g, 10, 15, 20, 6, '#1a1a1e');                          // 창
    ring(g, 14, 18, 2, '#c8c0aa');                              // 릴
    ring(g, 26, 18, 2, '#c8c0aa');
    rect(g, 15, 17, 10, 3, '#6a4a30');                          // 감긴 테이프
    rect(g, 12, 22, 16, 3, '#45454f');
  },

  '76년의 궤도'(g) {
    rect(g, 3, 2, 34, 26, '#f4efe2');
    for (const y of [7, 18]) for (let r = 0; r < 5; r++) rect(g, 6, y + r * 2, 28, 1, '#a0a6ac');
    for (const [x, y] of [[9, 9], [14, 7], [19, 11], [24, 8], [29, 10], [11, 20], [17, 22], [23, 19], [28, 21]]) {
      rect(g, x, y, 2, 2, '#2a2a2a');
      rect(g, x + 1, y - 3, 1, 3, '#2a2a2a');
    }
    for (let i = 0; i < 6; i++) rect(g, 30 + i, 3 + (i >> 1), 1, 1, '#6f8fcf');   // 혜성 꼬리
    rect(g, 29, 3, 2, 2, '#4a6ac8');
  },

  '옥상 출입 금지'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#a49d8d');
    for (let y = 2; y < CLUE_H; y += 5) rect(g, 0, y, CLUE_W, 1, '#6c665b');
    rect(g, 3, 6, 3, 20, '#6d6d6d');
    rect(g, 34, 6, 3, 20, '#6d6d6d');
    for (let x = 6; x < 34; x += 3) rect(g, x, 9 + Math.round(4 * Math.sin(Math.PI * (x - 6) / 28)), 2, 1, '#d0d0d0');
    rect(g, 12, 15, 16, 9, '#e8d24a');
    rect(g, 14, 17, 12, 1, '#c8323c');
    rect(g, 14, 20, 12, 1, '#c8323c');
  },

  '야간 자율학습 출석부'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#1d2233');
    rect(g, 31, 3, 4, 4, '#f0e08a');                           // 달
    rect(g, 33, 3, 2, 2, '#1d2233');
    rect(g, 8, 4, 22, 24, '#b5874f');
    rect(g, 10, 6, 18, 21, '#f4efe2');
    rect(g, 15, 3, 8, 3, '#7a7a7a');
    for (let r = 0; r < 5; r++) {
      rect(g, 12, 9 + r * 3, 8, 1, '#9a948a');
      if (r !== 3) rect(g, 23, 8 + r * 3, 2, 2, '#4a9a5a');
    }
    rect(g, 12, 25, 14, 1, '#c8323c');                          // "1986년부터"
  },

  '1986년 학보'(g) {
    rect(g, 4, 2, 32, 26, '#e8e0c8');
    rect(g, 6, 4, 28, 4, '#2a2a2a');                           // 제호
    rect(g, 6, 10, 28, 2, '#5a5040');                          // 큰 제목
    rect(g, 6, 14, 12, 10, '#9a9078');                         // 사진
    rect(g, 9, 17, 6, 5, '#6a6050');
    textLines(g, 20, 14, 14, 4, '#7a7060');
    textLines(g, 6, 26, 26, 1, '#7a7060');
    rect(g, 28, 24, 6, 1, '#c8323c');                          // 기자 이름 밑줄
  },

  '학교 연혁'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#6b4528');
    rect(g, 3, 3, 34, 24, '#f4efe2');
    rect(g, 8, 6, 1, 18, '#8a847a');                            // 연표 세로줄
    for (const [y, c] of [[7, '#8a847a'], [12, '#c8323c'], [17, '#4a6ac8'], [22, '#8a847a']]) {
      rect(g, 7, y, 3, 2, c);
      rect(g, 12, y, 18 - (y % 5), 1, '#9a948a');
    }
    rect(g, 12, 13, 20, 1, '#c8323c');                          // 1986 줄 강조
  },

  '40년 전 2학년 3반'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#d8b07a');
    rect(g, 3, 3, 34, 20, '#c8b89a');
    for (let i = 0; i < 6; i++) {                               // 뒷줄
      rect(g, 6 + i * 5, 7, 3, 3, '#7a6a50');
      rect(g, 5 + i * 5, 10, 5, 4, '#5a4a32');
    }
    rect(g, 14, 13, 3, 3, '#6a5a40');                           // 앞줄 어깨동무한 두 사람
    rect(g, 22, 13, 3, 3, '#6a5a40');
    rect(g, 12, 16, 15, 6, '#4a3a28');
    rect(g, 16, 16, 6, 1, '#6a5a40');
    rect(g, 10, 25, 9, 3, '#f4efe2');                           // 이름표
    rect(g, 21, 25, 9, 3, '#f4efe2');
  },

  '핼리 관측회 전단'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#3a3440');
    rect(g, 7, 2, 26, 26, '#f0e6c8');
    rect(g, 9, 4, 22, 12, '#1d2233');
    for (let i = 0; i < 6; i++) rect(g, 10 + Math.floor(hash(i, 9) * 20), 5 + Math.floor(hash(9, i) * 10), 1, 1, '#ffe9a0');
    rect(g, 24, 7, 2, 2, '#ffffff');                            // 혜성
    for (let i = 0; i < 8; i++) rect(g, 23 - i, 9 + (i >> 1), 1, 1, '#8fb0ff');
    textLines(g, 10, 18, 20, 2, '#6a645a');
    rect(g, 20, 24, 11, 1, '#4a7bd0');                          // 볼펜 메모
  },

  '천문부 관측일지'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#3a3440');
    rect(g, 5, 3, 30, 24, '#2f4a3a');                           // 짙은 초록 표지
    rect(g, 5, 3, 3, 24, '#223828');
    rect(g, 9, 3, 26, 24, '#f4efe2');                           // 펼친 속지
    rect(g, 21, 3, 1, 24, '#d8d0bc');
    textLines(g, 11, 6, 9, 6, '#7a7468');
    rect(g, 11, 22, 7, 1, '#4a6ac8');                           // "한정우" 서명
    for (let y = 4; y < 26; y += 2) rect(g, 24 + (y % 4 ? 1 : 0), y, 2, 1, '#c8c0aa');   // 뜯겨 나간 자국
    rect(g, 27, 4, 8, 22, '#3a3440');
    rect(g, 13, 14, 3, 3, '#f0c040');                           // 혜성 그림
    for (let i = 0; i < 4; i++) rect(g, 16 + i, 15 + (i >> 1), 1, 1, '#a8c8ff');
  },

  '빈 원판 봉투'(g) {
    rect(g, 0, 0, CLUE_W, CLUE_H, '#3a3440');
    rect(g, 7, 8, 26, 18, '#c8b48a');
    rect(g, 7, 8, 26, 1, '#a8946a');
    for (let i = 0; i < 13; i++) rect(g, 7 + i, 8 - Math.floor(i / 2), 1, 1, '#d8c49a');   // 열린 뚜껑
    for (let i = 0; i < 13; i++) rect(g, 33 - i, 8 - Math.floor(i / 2), 1, 1, '#d8c49a');
    rect(g, 11, 16, 18, 5, '#f4efe2');
    textLines(g, 13, 18, 12, 1, '#6a645a');
    rect(g, 15, 12, 10, 2, '#1a1a1e');                         // 텅 빈 속
  },
};

// 단서 이름 → 일러스트 캔버스 (한 번만 그려서 재사용)
const clueImageCache = {};
function clueImage(name) {
  if (!clueImageCache[name]) {
    const c = makeCanvas(CLUE_W, CLUE_H);
    const g = c.getContext('2d');
    rect(g, 0, 0, CLUE_W, CLUE_H, '#141018');
    (CLUE_ART[name] || (() => {}))(g);
    clueImageCache[name] = c;
  }
  return clueImageCache[name];
}
