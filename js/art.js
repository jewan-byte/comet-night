'use strict';
// ─────────────────────────────────────────────
// art.js — 모든 그래픽을 코드로 그린다 (외부 이미지 없음)
// ─────────────────────────────────────────────

const TILE = 16;
const OUTLINE = '#140f1a';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}

function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

// 좌표로 정해지는 고정 난수 (0~1) — 새로고침해도 무늬가 같다
function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// 투명 픽셀 중 그림과 맞닿은 곳에 외곽선을 친다 (언더테일식 깔끔한 테두리)
function addOutline(c, color = OUTLINE) {
  const g = c.getContext('2d');
  const { width: w, height: h } = c;
  const data = g.getImageData(0, 0, w, h).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  g.setTransform(1, 0, 0, 1, 0, 0); // 그릴 때 쓴 translate가 남아 있으면 외곽선이 밀린다
  g.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) {
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}

// ── 바닥 · 벽 타일 (16×16) ─────────────────────

const TILE_ART = {
  // 복도: 회색 인조석 타일
  hall(g, x, y, tx, ty) {
    rect(g, x, y, 16, 16, '#a6a99b');
    rect(g, x, y, 15, 1, '#b7baac');
    rect(g, x, y + 15, 16, 1, '#878a7d');
    rect(g, x + 15, y, 1, 16, '#878a7d');
    for (let i = 0; i < 4; i++) {
      rect(g, x + Math.floor(hash(tx, ty, i) * 14), y + Math.floor(hash(ty, tx, i + 9) * 14), 1, 1, '#929587');
    }
  },

  // 교실: 나무 마루
  wood(g, x, y, tx, ty) {
    for (let r = 0; r < 4; r++) {
      const py = y + r * 4;
      rect(g, x, py, 16, 3, '#a8743f');
      rect(g, x, py, 16, 1, '#b9844b');
      rect(g, x, py + 3, 16, 1, '#7a4f27');
      rect(g, x + Math.floor(hash(tx, ty * 4 + r) * 16), py, 1, 3, '#7a4f27');
    }
  },

  // 과학실: 흰 타일
  lab(g, x, y) {
    rect(g, x, y, 16, 16, '#d2d7da');
    for (const o of [0, 8]) {
      rect(g, x + o, y + o, 7, 1, '#e3e7e9');
      rect(g, x + o + 7, y, 1, 16, '#adb4b9');
      rect(g, x, y + o + 7, 16, 1, '#adb4b9');
    }
  },

  // 기록실: 낡은 카펫
  carpet(g, x, y) {
    rect(g, x, y, 16, 16, '#6a4d6c');
    rect(g, x + 3, y + 3, 2, 2, '#7d5f7f');
    rect(g, x + 11, y + 11, 2, 2, '#7d5f7f');
    rect(g, x + 11, y + 3, 1, 1, '#5a3f5c');
    rect(g, x + 3, y + 11, 1, 1, '#5a3f5c');
  },

  stairs(g, x, y) {
    for (let r = 0; r < 4; r++) {
      const py = y + r * 4;
      rect(g, x, py, 16, 1, '#cfc8b8');
      rect(g, x, py + 1, 16, 2, '#a49d8d');
      rect(g, x, py + 3, 16, 1, '#6c665b');
    }
  },

  // 체육관 마루 (밝은 단풍나무)
  gym(g, x, y, tx, ty) {
    for (let r = 0; r < 4; r++) {
      const py = y + r * 4;
      rect(g, x, py, 16, 3, '#d9a868');
      rect(g, x, py, 16, 1, '#e8bd80');
      rect(g, x, py + 3, 16, 1, '#c18f52');
      rect(g, x + Math.floor(hash(tx, ty * 4 + r, 2) * 16), py, 1, 3, '#c18f52');
    }
  },

  // 내려가는 계단 (아래로 갈수록 어둡다)
  stairsDown(g, x, y) {
    for (let r = 0; r < 4; r++) {
      const py = y + r * 4;
      rect(g, x, py, 16, 1, '#a59f90');
      rect(g, x, py + 1, 16, 2, '#857f71');
      rect(g, x, py + 3, 16, 1, '#4f4a42');
    }
  },

  // 문턱
  door(g, x, y) {
    rect(g, x, y, 16, 16, '#8a7457');
    for (let r = 0; r < 16; r += 4) rect(g, x, y + r, 16, 1, '#7a6549');
  },

  // ── 바깥 ──
  grass(g, x, y, tx, ty) {
    rect(g, x, y, 16, 16, '#5e9c4c');
    for (let i = 0; i < 6; i++) {
      rect(g, x + Math.floor(hash(tx, ty, i) * 15), y + Math.floor(hash(ty, tx, i + 3) * 14), 1, 2, '#78b862');
    }
    for (let i = 0; i < 3; i++) {
      rect(g, x + Math.floor(hash(tx, ty, i + 20) * 15), y + Math.floor(hash(ty, tx, i + 30) * 15), 1, 1, '#4c8640');
    }
  },

  // 운동장 흙
  dirt(g, x, y, tx, ty) {
    rect(g, x, y, 16, 16, '#c8a36d');
    for (let i = 0; i < 5; i++) {
      rect(g, x + Math.floor(hash(tx, ty, i) * 15), y + Math.floor(hash(ty, tx, i + 5) * 15), 1, 1, '#b38d58');
    }
    for (let i = 0; i < 3; i++) {
      rect(g, x + Math.floor(hash(tx, ty, i + 40) * 15), y + Math.floor(hash(ty, tx, i + 50) * 15), 1, 1, '#d9b985');
    }
  },

  // 보도블록
  path(g, x, y) {
    rect(g, x, y, 16, 16, '#b8b3a6');
    for (const o of [0, 8]) {
      rect(g, x + o, y + o, 7, 1, '#cbc6b9');
      rect(g, x + o + 7, y, 1, 16, '#9d988b');
      rect(g, x, y + o + 7, 16, 1, '#9d988b');
    }
  },

  // 건물 외벽 (붉은 벽돌)
  facadeUpper(g, x, y) {
    bricks(g, x, y, 4);
  },
  facadeLower(g, x, y) {
    bricks(g, x, y, 3);
    rect(g, x, y + 12, 16, 4, '#8f8a80');
    rect(g, x, y + 12, 16, 1, '#aaa59a');
  },

  // 벽 윗면 (어두운 부분)
  wallTop(g, x, y, tx, ty) {
    rect(g, x, y, 16, 16, '#211b29');
    if (hash(tx, ty, 3) < 0.35) {
      rect(g, x + Math.floor(hash(tx, ty, 4) * 12), y + Math.floor(hash(tx, ty, 5) * 14), 3, 1, '#2b2435');
    }
  },

  // 벽면 위쪽 (높은 벽의 윗 칸)
  faceUpper(g, x, y) {
    rect(g, x, y, 16, 16, '#e2d7bc');
    rect(g, x, y, 16, 2, '#c8bc9f');
  },

  // 벽면 아래쪽: 크림색 벽 + 초록 징두리판
  faceLower(g, x, y) {
    rect(g, x, y, 16, 9, '#e2d7bc');
    rect(g, x, y + 9, 16, 1, '#36503f');
    rect(g, x, y + 10, 16, 5, '#557868');
    rect(g, x, y + 10, 16, 1, '#6a8e7d');
    rect(g, x, y + 15, 16, 1, '#2b3a32');
  },
};

function bricks(g, x, y, rows) {
  for (let r = 0; r < rows; r++) {
    const py = y + r * 4;
    rect(g, x, py, 16, 3, '#a4564a');
    rect(g, x, py, 16, 1, '#b5675a');
    rect(g, x, py + 3, 16, 1, '#7a3d33');
    const off = r % 2 ? 4 : 12;
    rect(g, x + off, py, 1, 3, '#7a3d33');
    rect(g, x + (off + 8) % 16, py, 1, 3, '#7a3d33');
  }
}

// 3×5 픽셀 숫자 (엘리베이터 층 표시용)
const DIGITS = {
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
};
function pixelDigit(g, n, x, y, color) {
  (DIGITS[n] || []).forEach((row, r) => {
    for (let c = 0; c < 3; c++) if (row[c] === '1') rect(g, x + c, y + r, 1, 1, color);
  });
}

// ── 벽·바닥 장식 (통과 가능, 맵에 고정) ────────────
// x, y, w, h 는 픽셀 단위

const DECO_ART = {
  window(g, x, y, w, h) {
    const top = y + 3, bh = h - 12;
    rect(g, x + 1, top, w - 2, bh, '#5c6977');
    rect(g, x + 2, top + 1, w - 4, bh - 2, '#9fd0e6');
    rect(g, x + 2, top + 1, w - 4, 2, '#c9e8f5');
    for (let i = 0; i < 6; i++) rect(g, x + 5 + i, top + bh - 5 - i, 2, 1, '#e4f6fd');
    rect(g, x + (w >> 1), top + 1, 1, bh - 2, '#5c6977');
    rect(g, x + 1, top + bh, w - 2, 2, '#cfc6ae');
  },

  // h가 1칸이면 낮은 벽용 작은 칠판
  blackboard(g, x, y, w, h) {
    const X = x + 2, Y = h >= 32 ? y + 4 : y + 1, W = w - 4, H = h >= 32 ? 19 : 11;
    rect(g, X, Y, W, H, '#73532f');
    rect(g, X + 2, Y + 2, W - 4, H - 4, '#2f5b47');
    for (let i = 0; i < 14; i++) {
      const cx = X + 4 + Math.floor(hash(i, x) * (W - 14));
      const cy = Y + 4 + Math.floor(hash(x, i) * (H - 9));
      rect(g, cx, cy, 2 + Math.floor(hash(i, i + x) * 6), 1, '#bcd3c5');
    }
    rect(g, X, Y + H, W, 2, '#8a6a45');
    rect(g, X + 10, Y + H - 1, 3, 1, '#f4f4f4');
  },

  // 게시판 (1칸 높이 벽면용)
  bulletin(g, x, y, w) {
    rect(g, x + 1, y + 1, w - 2, 8, '#7c5a33');
    rect(g, x + 2, y + 2, w - 4, 6, '#b98b55');
    const colors = ['#f2efe6', '#f6d6dc', '#f3e7a8', '#cfe3f2'];
    for (let i = 0; i < Math.floor((w - 6) / 7); i++) {
      const px = x + 3 + i * 7, py = y + 2 + (i % 2);
      rect(g, px, py, 5, 5, colors[i % 4]);
      rect(g, px + 1, py + 1, 3, 1, '#9a948a');
    }
  },

  whiteboard(g, x, y, w) {
    rect(g, x + 1, y, w - 2, 9, '#9aa3ab');
    rect(g, x + 2, y + 1, w - 4, 7, '#f4f6f8');
    rect(g, x + 4, y + 3, 8, 1, '#4a7bd0');
    rect(g, x + 4, y + 5, 5, 1, '#d04a4a');
    rect(g, x + 14, y + 3, 6, 1, '#4a4a4a');
  },

  extinguisher(g, x, y) {
    rect(g, x + 7, y + 3, 2, 2, '#2a2a2a');
    rect(g, x + 6, y + 5, 4, 10, '#c8323c');
    rect(g, x + 7, y + 6, 1, 7, '#e86a6f');
  },

  clock(g, x, y) {
    rect(g, x + 4, y + 4, 8, 8, '#3a3a44');
    rect(g, x + 5, y + 5, 6, 6, '#f2f2f2');
    rect(g, x + 7, y + 6, 1, 3, '#222');
    rect(g, x + 8, y + 8, 2, 1, '#222');
  },

  // 현관 유리문
  glassDoor(g, x, y, w) {
    rect(g, x, y, w, 16, '#2c3540');
    for (let px = x + 2; px + 12 <= x + w; px += 16) {
      rect(g, px, y + 2, 12, 13, '#9fd0e6');
      rect(g, px + 2, y + 4, 1, 6, '#e4f6fd');
    }
  },

  mat(g, x, y, w, h) {
    rect(g, x + 2, y + 2, w - 4, h - 4, '#4b4a55');
    rect(g, x + 3, y + 3, w - 6, h - 6, '#5d5c68');
    for (let r = y + 5; r < y + h - 4; r += 3) rect(g, x + 4, r, w - 8, 1, '#4b4a55');
  },

  // 바깥에서 본 창문 (외벽 2칸 높이)
  facadeWindow(g, x, y, w) {
    rect(g, x + 3, y + 4, w - 6, 19, '#e8e4da');
    rect(g, x + 5, y + 6, w - 10, 15, '#3f5868');
    rect(g, x + 5, y + 6, w - 10, 2, '#6f8fa3');
    for (let i = 0; i < 5; i++) rect(g, x + 7 + i, y + 17 - i, 1, 1, '#8fb0c3');
    rect(g, x + (w >> 1), y + 6, 1, 15, '#e8e4da');
    rect(g, x + 2, y + 23, w - 4, 2, '#cfc9bb');
  },

  // 현관 위 학교 현판
  plaque(g, x, y, w) {
    rect(g, x + 4, y + 4, w - 8, 9, '#3b3326');
    rect(g, x + 5, y + 5, w - 10, 7, '#4a4132');
    for (let px = x + 10; px < x + w - 10; px += 7) rect(g, px, y + 7, 4, 3, '#c9a646');
  },

  // 엘리베이터 문 (2×2, 위에 층 표시)
  elevator(g, x, y, w, h, d) {
    rect(g, x + 1, y + 1, w - 2, h - 1, '#7d858d');
    rect(g, x + 1, y + 1, w - 2, 1, '#9aa2aa');
    rect(g, x + 9, y + 2, 14, 7, '#1a1a1a');
    pixelDigit(g, d.floor, x + 14, y + 3, '#f0a020');
    rect(g, x + 3, y + 10, w - 6, h - 11, '#b9c1c9');
    rect(g, x + (w >> 1), y + 10, 1, h - 11, '#6d757d');
    rect(g, x + 4, y + 11, 1, h - 14, '#dde3e8');
    rect(g, x + (w >> 1) + 2, y + 11, 1, h - 14, '#dde3e8');
  },

  // 음악실 오선 칠판
  staffboard(g, x, y, w) {
    rect(g, x + 1, y, w - 2, 10, '#9aa3ab');
    rect(g, x + 2, y + 1, w - 4, 8, '#f4f6f8');
    for (let r = 0; r < 5; r++) rect(g, x + 3, y + 2 + r * 1.5 | 0, w - 6, 1, '#a0a6ac');
    for (let px = x + 8; px < x + w - 6; px += 9) {
      const ny = y + 3 + Math.floor(hash(px, y) * 4);
      rect(g, px, ny, 2, 2, '#2a2a2a');
      rect(g, px + 1, ny - 3, 1, 3, '#2a2a2a');
    }
  },

  // 계단 앞 바닥 화살표
  arrowUp(g, x, y, w) {
    const cx = x + (w >> 1);
    for (let i = 0; i < 5; i++) rect(g, cx - i - 1, y + 4 + i, i * 2 + 2, 1, 'rgba(255,255,255,0.55)');
    rect(g, cx - 1, y + 9, 2, 3, 'rgba(255,255,255,0.55)');
  },
  arrowDown(g, x, y, w) {
    const cx = x + (w >> 1);
    rect(g, cx - 1, y + 3, 2, 3, 'rgba(255,255,255,0.55)');
    for (let i = 0; i < 5; i++) rect(g, cx - (4 - i) - 1, y + 6 + i, (4 - i) * 2 + 2, 1, 'rgba(255,255,255,0.55)');
  },

  // 체육관 농구 코트 (세로 방향)
  court(g, x, y, w, h) {
    const L = '#f6f1e4', cx = x + (w >> 1);
    rect(g, cx - 24, y, 48, 56, 'rgba(200,70,60,0.22)');
    rect(g, cx - 24, y + h - 56, 48, 56, 'rgba(200,70,60,0.22)');
    rect(g, x, y, w, 1, L);
    rect(g, x, y + h - 1, w, 1, L);
    rect(g, x, y, 1, h, L);
    rect(g, x + w - 1, y, 1, h, L);
    rect(g, x, y + (h >> 1), w, 1, L);
    for (const ky of [y, y + h - 56]) {
      rect(g, cx - 24, ky, 48, 1, L);
      rect(g, cx - 24, ky + 55, 48, 1, L);
      rect(g, cx - 24, ky, 1, 56, L);
      rect(g, cx + 23, ky, 1, 56, L);
    }
    for (let a = 0; a < 360; a += 1) {
      const rad = a * Math.PI / 180;
      rect(g, Math.round(cx + Math.cos(rad) * 22), Math.round(y + h / 2 + Math.sin(rad) * 22), 1, 1, L);
      // 3점 슛 라인 (위·아래 반원)
      const ax = Math.round(cx + Math.cos(rad) * 96);
      if (ax <= x || ax >= x + w - 1) continue;
      const ay = Math.sin(rad) * 96;
      rect(g, ax, Math.round(ay > 0 ? y + 8 + ay : y + h - 9 + ay), 1, 1, L);
    }
  },

  // 체육관 점수판 (2칸 높이 벽)
  scoreboard(g, x, y, w) {
    rect(g, x + 2, y + 4, w - 4, 18, '#1a1a1e');
    rect(g, x + 2, y + 4, w - 4, 1, '#3a3a40');
    rect(g, x + 6, y + 8, 8, 9, '#3a0d0d');
    rect(g, x + w - 14, y + 8, 8, 9, '#3a0d0d');
    rect(g, x + 8, y + 10, 4, 5, '#e84a3a');
    rect(g, x + w - 12, y + 10, 4, 5, '#e84a3a');
    rect(g, x + (w >> 1) - 2, y + 11, 4, 3, '#f0c040');
  },

  // 운동장 트랙과 경기장 선
  track(g, x, y, w, h) {
    const line = '#f4efe2';
    const cy = y + h / 2;
    for (const m of [6, 18]) {
      const r = h / 2 - m;
      const cx1 = x + m + r, cx2 = x + w - m - r;
      rect(g, Math.round(cx1), y + m, Math.round(cx2 - cx1), 1, line);
      rect(g, Math.round(cx1), y + h - m - 1, Math.round(cx2 - cx1), 1, line);
      for (let a = 0; a < 360; a += 0.4) {
        const dx = Math.cos(a * Math.PI / 180) * r, dy = Math.sin(a * Math.PI / 180) * r;
        rect(g, Math.round(dx < 0 ? cx1 + dx : cx2 + dx), Math.round(cy + dy), 1, 1, line);
      }
    }
    rect(g, x + (w >> 1), y + 30, 1, h - 60, line);
    for (let a = 0; a < 360; a += 1) {
      rect(g, Math.round(x + w / 2 + Math.cos(a * Math.PI / 180) * 28), Math.round(cy + Math.sin(a * Math.PI / 180) * 28), 1, 1, line);
    }
  },

  // 오래된 그을음 자국
  scorch(g, x, y, w, h) {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        // 바깥선은 깔끔한 원, 얼룩덜룩함은 안쪽 진하기에만
        const dx = (xx + 0.5 - w / 2) / (w / 2), dy = (yy + 0.5 - h / 2) / (h / 2);
        const d0 = dx * dx + dy * dy;
        const d = d0 + (hash(xx, yy, 7) - 0.5) * 0.5;
        if (d0 < 0.8) {
          g.fillStyle = d < 0.35 ? 'rgba(25,15,15,0.45)' : 'rgba(25,15,15,0.22)';
          g.fillRect(x + xx, y + yy, 1, 1);
        }
      }
    }
  },
};

// ── 가구 · 사물 (충돌 있음, 캐릭터와 앞뒤 정렬) ──────
// up: 타일 위로 튀어나오는 높이(px). draw 안에서 y=0 이 타일 영역의 맨 위.

const BOOK_COLORS = ['#a8434a', '#3f6aa1', '#5e8f4e', '#c9a046', '#7b4f8f', '#d8d0bd', '#2f6b6b'];

const OBJ_ART = {
  // 학생 책상 + 의자 (1×2)
  desk: {
    up: 2,
    draw(g) {
      rect(g, 1, -1, 14, 8, '#c99e68');
      rect(g, 1, -1, 14, 1, '#e0bb85');
      rect(g, 1, 7, 14, 2, '#8c6640');
      rect(g, 2, 9, 1, 4, '#4b4f57');
      rect(g, 13, 9, 1, 4, '#4b4f57');
      rect(g, 3, 16, 10, 4, '#7c8996');
      rect(g, 3, 16, 10, 1, '#98a5b1');
      rect(g, 3, 21, 10, 5, '#5f6b78');
      rect(g, 3, 21, 10, 1, '#7c8996');
      rect(g, 4, 26, 1, 3, '#3b424a');
      rect(g, 11, 26, 1, 3, '#3b424a');
    },
  },

  // 교탁 (2×1)
  podium: {
    up: 8,
    draw(g, w) {
      rect(g, 2, -6, w - 4, 5, '#b98a55');
      rect(g, 2, -6, w - 4, 1, '#d4a771');
      rect(g, 2, -1, w - 4, 15, '#8f6236');
      rect(g, 4, 1, w - 8, 10, '#a47344');
      rect(g, 4, 1, w - 8, 1, '#7a5230');
    },
  },

  // 실험대 (3×2)
  labtable: {
    up: 2,
    draw(g, w) {
      rect(g, 1, -1, w - 2, 14, '#353b41');
      rect(g, 1, -1, w - 2, 1, '#565e66');
      rect(g, 19, 2, 10, 7, '#a4adb5');
      rect(g, 20, 3, 8, 5, '#6c7782');
      rect(g, 23, 0, 2, 3, '#c9d0d6');
      rect(g, 5, 3, 2, 4, '#8fd3c9');
      rect(g, 9, 5, 3, 2, '#e4a2c0');
      rect(g, 1, 13, w - 2, 16, '#d6cdb8');
      rect(g, 1, 13, w - 2, 1, '#b3aa95');
      for (const dx of [16, 32]) rect(g, dx, 14, 1, 15, '#a89f8b');
      for (const hx of [13, 18, 29, 34]) rect(g, hx, 20, 2, 1, '#6d6658');
    },
  },

  // 유리 약품장 (벽에 붙임)
  shelf: {
    up: 16,
    draw(g, w) {
      rect(g, 1, -15, w - 2, 29, '#7a6450');
      rect(g, 1, -15, w - 2, 1, '#9a8268');
      rect(g, 3, -13, w - 6, 15, '#8fb0bd');
      const colors = ['#d16a6a', '#6ab0d1', '#d1c46a', '#7fcf8a'];
      for (let i = 0; 5 + i * 6 + 3 <= w - 4; i++) {
        const c = colors[i % 4];
        rect(g, 5 + i * 6, -11, 3, 5, c);
        rect(g, 6 + i * 6, -12, 1, 1, c);
        rect(g, 5 + i * 6, -3, 3, 4, colors[(i + 2) % 4]);
      }
      rect(g, 3, -6, w - 6, 1, '#6a5644');
      rect(g, 4, -12, 1, 5, '#c6dde6');
      rect(g, w >> 1, -13, 1, 15, '#5f4d3d');
      rect(g, 3, 3, w - 6, 9, '#6a5644');
      rect(g, 3, 7, w - 6, 1, '#5a4838');
    },
  },

  // 책장
  bookshelf: {
    up: 16,
    draw(g, w, h, o) {
      rect(g, 1, -15, w - 2, 29, '#6b4528');
      rect(g, 1, -15, w - 2, 1, '#8a5d38');
      for (let r = 0; r < 3; r++) {
        const sy = -13 + r * 9;
        rect(g, 3, sy, w - 6, 7, '#3e2716');
        let bx = 3;
        while (bx < w - 3) {
          const bw = Math.min(2 + Math.floor(hash(bx + o.x * 16, r, o.y) * 2), w - 3 - bx);
          const bh = 5 + Math.floor(hash(r, bx + o.x * 16, o.y) * 3);
          const col = BOOK_COLORS[Math.floor(hash(bx * 3 + o.x, r * 7 + o.y, 1) * BOOK_COLORS.length)];
          rect(g, bx, sy + 7 - bh, bw, bh, col);
          bx += bw + (hash(bx, r, 9 + o.x) < 0.15 ? 1 : 0);
        }
      }
    },
  },

  // 복도 사물함
  lockers: {
    up: 16,
    draw(g, w) {
      rect(g, 1, -15, w - 2, 29, '#7f93a7');
      rect(g, 1, -15, w - 2, 1, '#9fb2c4');
      for (let lx = 1; lx < w - 1; lx += 8) {
        rect(g, lx, -15, 1, 29, '#5d6f82');
        for (let v = 0; v < 3; v++) rect(g, lx + 2, -12 + v * 2, 4, 1, '#5d6f82');
        rect(g, lx + 5, -2, 1, 3, '#3f4c59');
      }
    },
  },

  // 신발장
  shoelocker: {
    up: 8,
    draw(g, w, h, o) {
      rect(g, 1, -7, w - 2, 21, '#a48a6a');
      rect(g, 1, -7, w - 2, 1, '#bfa582');
      const shoes = ['#f2f2f2', '#2a2a2a', '#c84a4a', '#4a6ac8'];
      for (let cx = 3; cx + 4 <= w - 3; cx += 6) {
        for (const cy of [-5, 1, 7]) {
          rect(g, cx, cy, 4, 5, '#5a4632');
          if (hash(cx + o.x, cy + o.y, 2) < 0.6) {
            rect(g, cx + 1, cy + 3, 2, 2, shoes[Math.floor(hash(cx, cy, o.x) * 4)]);
          }
        }
      }
    },
  },

  plant: {
    up: 12,
    draw(g) {
      rect(g, 3, 5, 10, 2, '#c97a4f');
      rect(g, 4, 7, 8, 7, '#b5653d');
      rect(g, 2, -6, 5, 7, '#4f8a4a');
      rect(g, 9, -8, 5, 8, '#4f8a4a');
      rect(g, 5, -10, 6, 10, '#62a35a');
      rect(g, 6, -9, 2, 2, '#86c67a');
      rect(g, 10, -6, 2, 1, '#86c67a');
      rect(g, 3, 1, 4, 3, '#4f8a4a');
      rect(g, 10, 1, 4, 3, '#4f8a4a');
    },
  },

  // 음수대
  fountain: {
    up: 8,
    draw(g) {
      rect(g, 7, -7, 2, 1, '#8e98a1');
      rect(g, 3, -6, 10, 20, '#b9c1c8');
      rect(g, 3, -6, 10, 3, '#dfe5ea');
      rect(g, 5, -5, 6, 1, '#7f8a94');
      rect(g, 4, 0, 8, 12, '#a3acb4');
    },
  },

  // 천체망원경
  telescope: {
    up: 18,
    draw(g) {
      for (let i = 0; i < 13; i++) {
        rect(g, 10 - Math.round(i * 0.5), -2 + i, 1, 1, '#3a3f48');
        rect(g, 11 + Math.round(i * 0.3), -2 + i, 1, 1, '#3a3f48');
        rect(g, 11, -2 + i, 1, 1, '#3a3f48');
      }
      rect(g, 9, -6, 4, 4, '#3a3f48');
      for (let i = 0; i < 9; i++) {
        rect(g, 3 + i, -15 + i, 4, 3, '#e4e6ee');
        rect(g, 4 + i, -15 + i, 1, 1, '#ffffff');
      }
      rect(g, 3, -15, 2, 2, '#5f8fb8');
    },
  },

  // 나무 탁자 (크기 자유)
  table: {
    up: 2,
    draw(g, w, h) {
      rect(g, 1, -1, w - 2, h - 9, '#b07a45');
      rect(g, 1, -1, w - 2, 1, '#c8935a');
      rect(g, 1, h - 10, w - 2, 3, '#7d5430');
      rect(g, 2, h - 7, 2, 5, '#5a3c22');
      rect(g, w - 4, h - 7, 2, 5, '#5a3c22');
      rect(g, 6, 3, 9, 7, '#f1ece0');
      rect(g, 7, 5, 6, 1, '#b8b2a5');
      rect(g, w - 17, 4, 9, 7, '#5a4a7a');
      rect(g, w - 17, 4, 1, 7, '#3e3258');
    },
  },

  boxes: {
    up: 6,
    draw(g) {
      rect(g, 2, -4, 12, 17, '#c49a5b');
      rect(g, 2, -4, 12, 4, '#d8b073');
      rect(g, 7, -4, 2, 17, '#e3cf9a');
      rect(g, 2, 6, 12, 1, '#a07c45');
    },
  },

  // 철제 서류함
  cabinet: {
    up: 12,
    draw(g, w) {
      rect(g, 1, -11, w - 2, 25, '#8d969e');
      rect(g, 1, -11, w - 2, 1, '#b3bbc2');
      for (const dy of [-9, -1, 6]) {
        rect(g, 3, dy, w - 6, 6, '#9fa8b0');
        rect(g, (w >> 1) - 2, dy + 2, 4, 1, '#4f575e');
      }
    },
  },

  // 교무실 책상 + 모니터 + 의자 (2×2)
  tdesk: {
    up: 8,
    draw(g, w) {
      rect(g, 17, -7, 12, 9, '#2b3038');
      rect(g, 18, -6, 10, 6, '#4c7a9a');
      rect(g, 22, 2, 2, 1, '#2b3038');
      rect(g, 1, 3, w - 2, 9, '#a2a9b0');
      rect(g, 1, 3, w - 2, 1, '#c3c9ce');
      rect(g, 4, 5, 8, 5, '#f3efe5');
      rect(g, 1, 12, w - 2, 3, '#7a828a');
      rect(g, 10, 18, 12, 4, '#4b5563');
      rect(g, 10, 23, 12, 5, '#3b4350');
      rect(g, 11, 28, 1, 2, '#2a2f38');
      rect(g, 20, 28, 1, 2, '#2a2f38');
    },
  },
};

Object.assign(OBJ_ART, {
  // 은행나무 (2×1, 11월이라 노랗다)
  tree: {
    up: 28,
    draw(g) {
      rect(g, 13, -4, 6, 15, '#6b4a2e');
      rect(g, 14, -4, 1, 15, '#86603d');
      rect(g, 12, 11, 8, 2, '#5a3d25');
      rect(g, 4, -20, 24, 14, '#d9b43a');
      rect(g, 2, -16, 28, 8, '#d9b43a');
      rect(g, 8, -26, 16, 8, '#d9b43a');
      rect(g, 6, -8, 20, 4, '#d9b43a');
      rect(g, 4, -8, 24, 2, '#b8922a');
      rect(g, 6, -6, 20, 2, '#b8922a');
      rect(g, 10, -23, 5, 3, '#f0d878');
      rect(g, 20, -18, 4, 2, '#f0d878');
      rect(g, 5, -14, 3, 2, '#e8c95a');
    },
  },

  bench: {
    up: 6,
    draw(g, w) {
      rect(g, 2, -6, w - 4, 3, '#86592f');
      rect(g, 2, -2, w - 4, 4, '#9b6a3a');
      rect(g, 2, -2, w - 4, 1, '#b07d48');
      rect(g, 2, 2, w - 4, 2, '#7d5430');
      rect(g, 4, 4, 2, 8, '#4a4a4a');
      rect(g, w - 6, 4, 2, 8, '#4a4a4a');
    },
  },

  // 구령대
  stage: {
    up: 6,
    draw(g, w) {
      rect(g, 1, -5, w - 2, 20, '#cfc9bb');
      rect(g, 1, -5, w - 2, 1, '#e2ddd1');
      rect(g, 1, 15, w - 2, 14, '#a29b8d');
      const sx = (w >> 1) - 16;
      for (let s = 0; s < 3; s++) {
        rect(g, sx, 17 + s * 4, 32, 4, '#b9b2a4');
        rect(g, sx, 17 + s * 4, 32, 1, '#d0c9bc');
      }
    },
  },

  flagpole: {
    up: 44,
    draw(g) {
      rect(g, 7, -43, 2, 1, '#e0c050');
      rect(g, 7, -42, 2, 50, '#c9ccd0');
      rect(g, 9, -41, 6, 5, '#2f5fa8');
      rect(g, 10, -40, 2, 2, '#f4f4f4');
      rect(g, 4, 8, 8, 6, '#9a958a');
    },
  },

  // 축구 골대 (1×3, flip이면 오른쪽 골대)
  goal: {
    up: 10,
    draw(g, w, h, o) {
      const back = o.flip ? 12 : 2;
      for (let yy = -6; yy < h - 8; yy += 3) {
        for (let xx = 4; xx < 13; xx += 3) rect(g, xx, yy, 1, 1, '#d6d6d6');
      }
      rect(g, back, -8, 2, h - 6, '#f2f2f2');
      rect(g, 2, -8, 12, 2, '#f2f2f2');
      rect(g, 2, h - 9, 12, 2, '#f2f2f2');
    },
  },

  // 철망 울타리 (가로/세로)
  fence: {
    up: 12,
    noOutline: true,
    draw(g, w, h) {
      if (w >= h) {
        for (let yy = -9; yy < 12; yy++) {
          for (let xx = 1; xx < w - 1; xx++) {
            if ((xx + yy) % 4 === 0 || ((xx - yy) % 4 + 4) % 4 === 0) rect(g, xx, yy, 1, 1, '#9aa3ab');
          }
        }
        rect(g, 1, -10, w - 2, 1, '#6d757d');
        for (let lx = 1; lx < w; lx += 16) rect(g, lx, -11, 2, 25, '#5d656d');
      } else {
        rect(g, 7, -10, 2, h + 8, '#9aa3ab');
        for (let ty = 0; ty < h; ty += 16) rect(g, 6, ty - 10, 4, 3, '#5d656d');
      }
    },
  },
});

// ── 음악실 · 화장실 · 자율학습실 ──
Object.assign(OBJ_ART, {
  // 그랜드 피아노 (3×2)
  piano: {
    up: 8,
    draw(g, w) {
      rect(g, 2, -6, w - 4, 20, '#1e1a22');
      rect(g, 2, -6, w - 4, 1, '#3a3440');
      rect(g, 6, -3, 14, 3, '#3a3440');
      rect(g, 3, 14, w - 6, 6, '#f2f2f2');
      for (let kx = 5; kx < w - 5; kx += 3) {
        if (kx % 7 !== 3) rect(g, kx, 14, 1, 3, '#1e1a22');
      }
      rect(g, 3, 20, w - 6, 1, '#b9b9b9');
      rect(g, 4, 21, 3, 8, '#1e1a22');
      rect(g, w - 7, 21, 3, 8, '#1e1a22');
    },
  },

  // 음악실 의자
  stool: {
    up: 2,
    draw(g) {
      rect(g, 3, 1, 10, 6, '#3d4a6b');
      rect(g, 3, 1, 10, 1, '#52608a');
      rect(g, 4, 7, 1, 6, '#2a2a2a');
      rect(g, 11, 7, 1, 6, '#2a2a2a');
    },
  },

  // 드럼 세트 (2×2)
  drums: {
    up: 8,
    draw(g) {
      rect(g, 5, -5, 1, 22, '#8a8a8a');
      rect(g, 1, -7, 9, 2, '#d9b43a');
      rect(g, 4, -2, 8, 6, '#c8323c');
      rect(g, 4, -2, 8, 2, '#e8e0d8');
      rect(g, 20, -2, 8, 6, '#c8323c');
      rect(g, 20, -2, 8, 2, '#e8e0d8');
      rect(g, 8, 6, 16, 16, '#c8323c');
      rect(g, 10, 8, 12, 12, '#f0e8e0');
      rect(g, 14, 12, 4, 4, '#c8323c');
      rect(g, 22, 18, 9, 6, '#c9ccd0');
      rect(g, 22, 18, 9, 2, '#f0f0f0');
    },
  },

  // 실로폰 (2×1)
  xylophone: {
    up: 4,
    draw(g, w) {
      rect(g, 2, 0, w - 4, 10, '#7a5230');
      const colors = ['#d9534f', '#f0a020', '#f0d040', '#5cb85c', '#4a90d9', '#6a5acd', '#b05ad9', '#d9534f'];
      colors.forEach((c, i) => rect(g, 4 + i * 3, -2 + (i >> 1), 2, 11 - i, c));
      rect(g, 4, 10, 1, 4, '#4a3020');
      rect(g, w - 5, 10, 1, 4, '#4a3020');
    },
  },

  // 통기타 (스탠드)
  guitar: {
    up: 14,
    draw(g) {
      rect(g, 6, -13, 4, 2, '#3a2414');
      rect(g, 7, -11, 2, 9, '#5a3a20');
      rect(g, 4, -2, 8, 10, '#c9883e');
      rect(g, 5, -3, 6, 1, '#c9883e');
      rect(g, 7, 1, 2, 2, '#2a1a10');
      rect(g, 5, 8, 1, 5, '#3a3a3a');
      rect(g, 10, 8, 1, 5, '#3a3a3a');
    },
  },

  speaker: {
    up: 10,
    draw(g) {
      rect(g, 3, -8, 10, 21, '#2a2a30');
      rect(g, 3, -8, 10, 1, '#45454f');
      rect(g, 5, -5, 6, 6, '#55555f');
      rect(g, 7, -3, 2, 2, '#2a2a30');
      rect(g, 6, 4, 4, 4, '#55555f');
    },
  },

  // 화장실 칸 (2×2)
  stall: {
    up: 16,
    draw(g, w) {
      rect(g, 1, -15, w - 2, 42, '#7f9fb0');
      rect(g, 1, -15, w - 2, 1, '#a5c1cf');
      rect(g, 4, -12, w - 8, 37, '#a8c4d0');
      rect(g, w - 9, 4, 2, 3, '#555c63');
      rect(g, w - 10, -10, 4, 2, '#5cb85c');
    },
  },

  // 세면대 (2×1)
  sink: {
    up: 6,
    draw(g, w) {
      rect(g, 8, -5, 1, 2, '#9aa2aa');
      rect(g, 23, -5, 1, 2, '#9aa2aa');
      rect(g, 1, -3, w - 2, 7, '#e8e8ee');
      rect(g, 4, -2, 9, 5, '#b9c3cc');
      rect(g, 19, -2, 9, 5, '#b9c3cc');
      rect(g, 1, 4, w - 2, 9, '#c9cfd6');
    },
  },

  // 칸막이 책상 + 의자 (2×2)
  studydesk: {
    up: 10,
    draw(g, w, h, o) {
      rect(g, 1, -9, w - 2, 11, '#c8c0ae');
      rect(g, 1, -9, w - 2, 1, '#ddd6c6');
      rect(g, 3, 2, w - 6, 9, '#d8c39a');
      rect(g, 1, -9, 2, 22, '#b8b09e');
      rect(g, w - 3, -9, 2, 22, '#b8b09e');
      rect(g, 3, 11, w - 6, 2, '#a8916a');
      for (let i = 0; i < 3; i++) {
        rect(g, 5 + i * 3, -6, 2, 7, BOOK_COLORS[Math.floor(hash(o.x, o.y, i) * BOOK_COLORS.length)]);
      }
      rect(g, w - 10, -6, 5, 2, '#f0d878');
      rect(g, w - 8, -4, 1, 5, '#6a6a6a');
      rect(g, 10, 18, 12, 4, '#4a5a7a');
      rect(g, 10, 23, 12, 5, '#3a4868');
      rect(g, 11, 28, 1, 2, '#2a2f38');
      rect(g, 20, 28, 1, 2, '#2a2f38');
    },
  },

  // 농구 골대 (2×1, 벽에 붙임)
  hoop: {
    up: 24,
    draw(g, w) {
      rect(g, (w >> 1) - 1, -6, 2, 20, '#7d858d');
      rect(g, 3, -23, w - 6, 15, '#f4f4f4');
      rect(g, (w >> 1) - 5, -19, 10, 7, '#f4f4f4');
      rect(g, (w >> 1) - 5, -19, 10, 1, '#d9483a');
      rect(g, (w >> 1) - 5, -13, 10, 1, '#d9483a');
      rect(g, (w >> 1) - 5, -19, 1, 7, '#d9483a');
      rect(g, (w >> 1) + 4, -19, 1, 7, '#d9483a');
      rect(g, (w >> 1) - 5, -8, 10, 2, '#f07a20');
      for (let i = 0; i < 4; i++) rect(g, (w >> 1) - 4 + i * 3, -6, 1, 4, '#e0e0e0');
    },
  },

  // 체조 매트 (2×1)
  gymmat: {
    up: 4,
    draw(g, w) {
      rect(g, 1, -2, w - 2, 6, '#3d6fb8');
      rect(g, 1, -2, w - 2, 1, '#5a8ad0');
      rect(g, 1, 4, w - 2, 6, '#2f5a99');
      rect(g, 1, 4, w - 2, 1, '#4a78bf');
      rect(g, 1, 10, w - 2, 3, '#24487d');
    },
  },

  // 뜀틀 (2×1)
  vault: {
    up: 8,
    draw(g, w) {
      rect(g, 3, -6, w - 6, 5, '#f2ede0');
      rect(g, 3, -6, w - 6, 1, '#ffffff');
      for (let i = 0; i < 3; i++) {
        rect(g, 2 - (i > 1 ? 1 : 0), -1 + i * 5, w - 4 + (i > 1 ? 2 : 0), 5, i % 2 ? '#b07a45' : '#c48a50');
        rect(g, 4, i * 5 + 1, w - 8, 1, '#8a5a30');
      }
    },
  },

  // 공 바구니
  ballcart: {
    up: 8,
    draw(g) {
      rect(g, 2, -6, 12, 16, '#5a5f66');
      rect(g, 3, -5, 10, 14, '#2a2d33');
      for (const [bx, by] of [[4, -4], [8, -4], [6, 0], [4, 4], [9, 3]]) {
        rect(g, bx, by, 4, 4, '#e8742a');
        rect(g, bx + 1, by + 1, 1, 1, '#f5a060');
      }
      for (let i = 0; i < 3; i++) rect(g, 3 + i * 4, -5, 1, 14, '#7d858d');
      rect(g, 3, 10, 2, 2, '#2a2a2a');
      rect(g, 11, 10, 2, 2, '#2a2a2a');
    },
  },

  // 분실물 상자
  lostbox: {
    up: 6,
    draw(g) {
      rect(g, 1, -4, 14, 16, '#3a8a9a');
      rect(g, 1, -4, 14, 1, '#5aaabb');
      rect(g, 3, -6, 4, 3, '#e8e0d0');
      rect(g, 8, -7, 3, 4, '#d9534f');
      rect(g, 11, -5, 3, 2, '#4a6ac8');
      rect(g, 4, 3, 8, 4, '#f4f4f4');
      rect(g, 5, 4, 6, 1, '#7a7a7a');
    },
  },

  // 복도 전시장 (유리장 안에 트로피)
  trophycase: {
    up: 16,
    draw(g, w) {
      rect(g, 1, -15, w - 2, 29, '#6b4528');
      rect(g, 3, -13, w - 6, 18, '#a8c8d4');
      rect(g, 3, -4, w - 6, 1, '#6b4528');
      for (let x = 7; x < w - 8; x += 12) {
        rect(g, x, -11, 4, 4, '#e0b840');
        rect(g, x + 1, -7, 2, 3, '#c09a30');
        rect(g, x + 6, -2, 6, 6, '#f0e8d8');
        rect(g, x + 7, -1, 4, 4, '#8a7a60');
      }
      rect(g, 4, -12, 1, 14, '#e4f2f8');
      rect(g, 3, 6, w - 6, 7, '#7d5636');
    },
  },

  // 학급 과제 게시판 (이젤)
  easel: {
    up: 14,
    draw(g, w) {
      rect(g, 4, 6, 2, 8, '#6b4a2e');
      rect(g, w - 6, 6, 2, 8, '#6b4a2e');
      rect(g, 2, -12, w - 4, 19, '#b98b55');
      rect(g, 3, -11, w - 6, 17, '#d8b07a');
      rect(g, 6, -9, 12, 9, '#c8b89a');
      rect(g, 7, -8, 10, 7, '#8a7a60');
      rect(g, 20, -8, 8, 6, '#f4efe2');
      rect(g, 21, 0, 7, 4, '#f6d6dc');
    },
  },

  // 계단 가운데 난간 (세로)
  rail: {
    up: 6,
    draw(g, w, h) {
      for (let ty = 0; ty < h; ty += 16) rect(g, 5, ty - 2, 6, 3, '#5a4630');
      rect(g, 6, -4, 4, h + 2, '#8a6a45');
      rect(g, 7, -4, 1, h + 2, '#a8885f');
    },
  },

  // 출입 금지 쇠사슬
  chain: {
    up: 4,
    draw(g, w) {
      rect(g, 1, -3, 3, 16, '#6d6d6d');
      rect(g, w - 4, -3, 3, 16, '#6d6d6d');
      for (let cx = 4; cx < w - 4; cx += 3) {
        const sag = Math.round(4 * Math.sin(Math.PI * (cx - 4) / (w - 8)));
        rect(g, cx, 1 + sag, 2, 1, '#a0a0a0');
      }
      rect(g, (w >> 1) - 8, 4, 16, 7, '#e8d24a');
      rect(g, (w >> 1) - 6, 6, 12, 1, '#c8323c');
      rect(g, (w >> 1) - 6, 8, 12, 1, '#c8323c');
    },
  },
});

function makeObjectSprite(o) {
  const art = OBJ_ART[o.type];
  const w = o.w * TILE, h = o.h * TILE;
  const c = makeCanvas(w, h + art.up);
  const g = c.getContext('2d');
  g.translate(0, art.up);
  art.draw(g, w, h, o);
  return { canvas: art.noOutline ? c : addOutline(c), up: art.up };
}

// 벽·바닥 장식 하나만 따로 그린 그림 (반짝임 효과용)
function makeDecoSprite(d) {
  const w = d.w * TILE, h = d.h * TILE;
  const c = makeCanvas(w, h);
  DECO_ART[d.type](c.getContext('2d'), 0, 0, w, h, d);
  return c;
}

// ── 조사 가능 표시: 1픽셀 노란 테두리 ────────────────

// 그림 바깥을 1픽셀 두께로 감싸는 노란 테두리만 (그림보다 사방 1px 크다)
function makeHighlight(src, color = '#ffe066') {
  const w = src.width, h = src.height;
  const c = makeCanvas(w + 2, h + 2);
  const g = c.getContext('2d');
  const data = src.getContext('2d').getImageData(0, 0, w, h).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  g.fillStyle = color;
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) {
        g.fillRect(x + 1, y + 1, 1, 1);
      }
    }
  }
  return c;
}

// ── 사람 스프라이트 (16×24, 4방향 × 4프레임) ─────
// 주인공과 NPC가 같은 몸을 쓰고 색(팔레트)과 넥타이·안경만 다르다

const PLAYER_PAL = {
  hair: '#3a2a24', hairHi: '#5b4236',
  skin: '#f2cfa8', skinSh: '#d9a77f', eye: '#1d1626',
  blazer: '#2f3f73', blazerDk: '#222e57',
  shirt: '#eef0f4', tie: '#b8323f',
  pants: '#2d2f3b', pantsDk: '#22232d', shoe: '#1a1418',
};

const PEOPLE = {
  // 아빠: 희끗한 머리, 갈색 니트, 안경
  dad: {
    pal: { ...PLAYER_PAL, hair: '#57524d', hairHi: '#7a756e', blazer: '#6d5b45', blazerDk: '#56472f', shirt: '#e8e2d4', pants: '#3a3a44', pantsDk: '#2e2e36' },
    glasses: true, tie: false,
  },
  // 버스 기사: 하늘색 셔츠
  driver: {
    pal: { ...PLAYER_PAL, hair: '#2a2a2a', hairHi: '#444', blazer: '#8fb3d9', blazerDk: '#6f93b9', tie: '#2f3f73' },
  },
  // 하율: 빛찬의 친구, 신문부. 밤색 머리 + 목에 건 카메라
  friend: {
    pal: { ...PLAYER_PAL, hair: '#7a4128', hairHi: '#a85e38' },
    camera: true,
  },
  // 오민경 선생님: 과학 교사, 1986년 학보 기자·목격자. 쑥색 카디건
  teacher: {
    pal: { ...PLAYER_PAL, hair: '#2a1e1a', hairHi: '#4a3428', blazer: '#5f7a6a', blazerDk: '#4a6254', shirt: '#f0ece2', pants: '#3a3a44', pantsDk: '#2e2e36' },
    tie: false,
  },
  // 1986년의 오민경 (1학년, 신문부 기자): 짙은 남색 교복, 넥타이 대신 노란 리본
  minkyung86: {
    pal: { ...PLAYER_PAL, hair: '#1e1612', hairHi: '#3a2a20', blazer: '#3a3f5e', blazerDk: '#2a2e48', tie: '#d9b43a' },
  },
  // 신문부 부장 (3학년): 짧은 검은 머리, 안경
  editor: {
    pal: { ...PLAYER_PAL, hair: '#15151a', hairHi: '#33333c' },
    glasses: true,
  },
  // 같은 학교 학생들 (머리색만 다르게)
  student1: { pal: { ...PLAYER_PAL, hair: '#1e1612', hairHi: '#3a2a22' } },
  student2: { pal: { ...PLAYER_PAL, hair: '#6b4a2e', hairHi: '#8a6440' } },
  student3: { pal: { ...PLAYER_PAL, hair: '#2a2430', hairHi: '#463c50' }, glasses: true },
};

// frame: 0 서기, 1 왼발, 2 서기, 3 오른발
function drawPerson(g, dir, frame, P = PLAYER_PAL, { tie = true, glasses = false, camera = false } = {}) {
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;

  if (dir === 'down' || dir === 'up') {
    const lLift = step === -1 ? 1 : 0, rLift = step === 1 ? 1 : 0;
    rect(g, 5, 17, 3, 4 - lLift, P.pants);
    rect(g, 5, 21 - lLift, 3, 1, P.shoe);
    rect(g, 8, 17, 3, 4 - rLift, P.pantsDk);
    rect(g, 8, 21 - rLift, 3, 1, P.shoe);

    rect(g, 4, 11, 8, 6, P.blazer);
    rect(g, 11, 11, 1, 6, P.blazerDk);
    const lArm = step === 1 ? 1 : 0, rArm = step === -1 ? 1 : 0;
    rect(g, 3, 11, 1, 5 - lArm, P.blazerDk);
    rect(g, 3, 16 - lArm, 1, 1, P.skin);
    rect(g, 12, 11, 1, 5 - rArm, P.blazerDk);
    rect(g, 12, 16 - rArm, 1, 1, P.skin);

    rect(g, 3, 1, 10, 10, P.hair);
    if (dir === 'down') {
      rect(g, 6, 11, 4, 1, P.shirt);
      if (tie) rect(g, 7, 12, 2, 3, P.tie);
      if (camera) {
        rect(g, 5, 11, 1, 2, '#2a2a2a');
        rect(g, 10, 11, 1, 2, '#2a2a2a');
        rect(g, 5, 13, 6, 3, '#2a2a2e');
        rect(g, 7, 14, 2, 1, '#6fa8d8');
      }
      rect(g, 4, 5, 8, 5, P.skin);
      rect(g, 4, 5, 2, 1, P.hair);
      rect(g, 8, 5, 3, 1, P.hair);
      rect(g, 4, 10, 8, 1, P.skinSh);
      rect(g, 5, 7, 1, 2, P.eye);
      rect(g, 10, 7, 1, 2, P.eye);
      if (glasses) {
        rect(g, 4, 6, 3, 1, '#2a2a2a');
        rect(g, 9, 6, 3, 1, '#2a2a2a');
        rect(g, 7, 7, 2, 1, '#2a2a2a');
      }
    } else {
      rect(g, 6, 11, 4, 1, P.shirt);
      rect(g, 5, 10, 6, 1, P.skinSh);
    }
    rect(g, 5, 2, 4, 1, P.hairHi);
  } else {
    // 왼쪽을 보는 옆모습 (오른쪽은 좌우 반전)
    if (step === 0) {
      rect(g, 6, 17, 4, 4, P.pants);
      rect(g, 5, 21, 5, 1, P.shoe);
    } else {
      const front = step === 1 ? P.pants : P.pantsDk;
      const back = step === 1 ? P.pantsDk : P.pants;
      rect(g, 8, 17, 3, 4, back);
      rect(g, 8, 21, 4, 1, P.shoe);
      rect(g, 4, 17, 3, 4, front);
      rect(g, 3, 21, 4, 1, P.shoe);
    }
    rect(g, 5, 11, 6, 6, P.blazer);
    rect(g, 5, 11, 1, 2, P.shirt);
    const armX = 7 - step;
    rect(g, armX, 11, 2, 5, P.blazerDk);
    rect(g, armX, 16, 2, 1, P.skin);

    rect(g, 3, 1, 10, 10, P.hair);
    rect(g, 3, 5, 5, 5, P.skin);
    rect(g, 3, 5, 1, 1, P.hair);
    rect(g, 4, 10, 4, 1, P.skinSh);
    rect(g, 4, 7, 1, 2, P.eye);
    if (glasses) rect(g, 3, 6, 3, 1, '#2a2a2a');
    rect(g, 8, 7, 1, 2, P.skinSh);
    rect(g, 6, 2, 4, 1, P.hairHi);
  }
  // 머리 모서리 둥글게
  g.clearRect(3, 1, 1, 1);
  g.clearRect(12, 1, 1, 1);
  g.clearRect(3, 10, 1, 1);
  g.clearRect(12, 10, 1, 1);
}

// 걸어다니는 사람의 4방향 × 4프레임 (주인공, 따라다니는 친구)
function makePersonFrames(pal = PLAYER_PAL, opts = {}) {
  const frames = {};
  for (const dir of ['down', 'up', 'left']) {
    frames[dir] = [0, 1, 2, 3].map(f => {
      const c = makeCanvas(16, 24);
      drawPerson(c.getContext('2d'), dir, f, pal, opts);
      return addOutline(c);
    });
  }
  frames.right = frames.left.map(src => {
    const c = makeCanvas(16, 24);
    const g = c.getContext('2d');
    g.translate(16, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  });
  return frames;
}

const makePlayerFrames = () => makePersonFrames();

// ─────────────────────────────────────────────
// 집 · 버스
// ─────────────────────────────────────────────

Object.assign(TILE_ART, {
  // 버스 바닥 (홈 파인 고무)
  busfloor(g, x, y) {
    rect(g, x, y, 16, 16, '#4a5058');
    for (let r = 0; r < 16; r += 4) {
      rect(g, x, y + r, 16, 1, '#565d66');
      rect(g, x, y + r + 2, 16, 1, '#3e434a');
    }
  },

  // 집 벽: 연한 줄무늬 벽지 + 나무 걸레받이
  faceUpperHome(g, x, y) {
    rect(g, x, y, 16, 16, '#efe6d2');
    for (let i = 1; i < 16; i += 4) rect(g, x + i, y, 1, 16, '#e5dbc4');
    rect(g, x, y, 16, 2, '#d6cbb2');
  },
  faceLowerHome(g, x, y) {
    rect(g, x, y, 16, 11, '#efe6d2');
    for (let i = 1; i < 16; i += 4) rect(g, x + i, y, 1, 11, '#e5dbc4');
    rect(g, x, y + 11, 16, 4, '#9b7650');
    rect(g, x, y + 11, 16, 1, '#b38b60');
    rect(g, x, y + 15, 16, 1, '#6e5236');
  },

  // 버스 안쪽 벽: 밝은 회색 + 파란 띠
  faceUpperBus(g, x, y) {
    rect(g, x, y, 16, 16, '#d9dde0');
    rect(g, x, y, 16, 2, '#b9bec2');
  },
  faceLowerBus(g, x, y) {
    rect(g, x, y, 16, 9, '#d9dde0');
    rect(g, x, y + 9, 16, 2, '#3f7fbf');
    rect(g, x, y + 11, 16, 4, '#aeb4ba');
    rect(g, x, y + 15, 16, 1, '#7d848b');
  },
});

Object.assign(DECO_ART, {
  // 별자리 포스터
  poster(g, x, y, w, h) {
    rect(g, x + 4, y + 3, w - 8, h - 11, '#d8d0b8');
    rect(g, x + 5, y + 4, w - 10, h - 13, '#1f2a4a');
    for (let i = 0; i < 9; i++) {
      rect(g, x + 7 + Math.floor(hash(i, x) * (w - 14)), y + 6 + Math.floor(hash(x, i) * (h - 18)), 1, 1, '#ffe9a0');
    }
    rect(g, x + 10, y + 9, 5, 1, '#5a6a9a');
    rect(g, x + 15, y + 10, 4, 1, '#5a6a9a');
    // 혜성
    rect(g, x + w - 12, y + 7, 2, 2, '#ffffff');
    rect(g, x + w - 16, y + 9, 4, 1, '#a8c8ff');
    rect(g, x + w - 19, y + 10, 3, 1, '#6f8fcf');
  },

  // 버스 창문: 테두리만 그리고 유리 부분은 뚫어서 뒤에 흘러가는 풍경이 보이게
  busWindow(g, x, y, w, h) {
    rect(g, x + 1, y + 3, w - 2, h - 8, '#7d848b');
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.fillRect(x + 2, y + 4, w - 4, h - 10);
    g.restore();
  },
});

Object.assign(OBJ_ART, {
  // NPC (o.who = PEOPLE 이름, o.dir = 보는 방향)
  npc: {
    up: 8,
    draw(g, w, h, o) {
      const who = PEOPLE[o.who];
      g.save();
      g.translate(0, -7);
      if (o.dir === 'right') {
        g.translate(16, 0);
        g.scale(-1, 1);
      }
      drawPerson(g, o.dir === 'right' ? 'left' : o.dir || 'down', 0, who.pal, who);
      g.restore();
    },
  },

  // 침대 (2×3, 머리맡이 위)
  bed: {
    up: 8,
    draw(g, w, h) {
      rect(g, 1, -7, w - 2, 10, '#8a6040');
      rect(g, 1, -7, w - 2, 1, '#a87a52');
      rect(g, 2, 2, w - 4, h - 4, '#f2efe8');
      rect(g, 5, 4, w - 10, 7, '#ffffff');
      rect(g, 2, 14, w - 4, h - 18, '#5a7fc0');
      rect(g, 2, 14, w - 4, 3, '#7a9fe0');
      for (let i = 0; i < 5; i++) rect(g, 5 + Math.floor(hash(i, 1) * (w - 10)), 20 + Math.floor(hash(1, i) * (h - 26)), 1, 1, '#f0e08a');
      rect(g, 1, h - 4, w - 2, 3, '#8a6040');
    },
  },

  // 소파 (TV를 보고 있어서 등받이가 이쪽)
  sofa: {
    up: 8,
    draw(g, w) {
      rect(g, 6, -6, w - 12, 8, '#a0604a');
      rect(g, 1, -6, 5, 19, '#7a4a3a');
      rect(g, w - 6, -6, 5, 19, '#7a4a3a');
      rect(g, 1, 2, w - 2, 12, '#8a5040');
      rect(g, 1, 2, w - 2, 1, '#a86a55');
    },
  },

  tv: {
    up: 10,
    draw(g, w) {
      rect(g, 5, -10, w - 10, 15, '#2a2c32');
      rect(g, 6, -9, w - 12, 13, '#1a1c22');
      rect(g, 9, -7, 6, 1, '#4a5060');
      rect(g, 1, 5, w - 2, 9, '#8a6a48');
      rect(g, 1, 5, w - 2, 1, '#a5845e');
      rect(g, (w >> 1) - 1, 8, 2, 2, '#c0e060');
    },
  },

  fridge: {
    up: 18,
    draw(g, w) {
      rect(g, 2, -17, w - 4, 30, '#e6e9ec');
      rect(g, 2, -17, w - 4, 1, '#ffffff');
      rect(g, 2, -6, w - 4, 1, '#b9bec2');
      rect(g, w - 7, -14, 2, 6, '#9aa0a6');
      rect(g, w - 7, -3, 2, 8, '#9aa0a6');
      rect(g, 7, -12, 3, 3, '#e05050');
      rect(g, 12, -10, 3, 3, '#f0c040');
    },
  },

  // 싱크대 + 가스레인지
  counter: {
    up: 10,
    draw(g, w) {
      rect(g, 1, -8, w - 2, 6, '#d9d4c8');
      rect(g, 6, -7, 14, 4, '#9aa3ab');
      rect(g, 12, -9, 2, 2, '#c0c6cc');
      rect(g, w - 26, -7, 20, 4, '#2a2a2e');
      rect(g, w - 23, -6, 4, 2, '#5a5a60');
      rect(g, w - 14, -6, 4, 2, '#5a5a60');
      rect(g, 1, -2, w - 2, 15, '#c8a878');
      for (let lx = 16; lx < w - 1; lx += 16) rect(g, lx, -1, 1, 13, '#a88858');
      for (let hx = 12; hx < w; hx += 16) rect(g, hx, 3, 2, 1, '#6e5236');
    },
  },

  // 거실 장식장 (위에 액자)
  sideboard: {
    up: 10,
    draw(g, w) {
      rect(g, 1, -2, w - 2, 15, '#7a5236');
      rect(g, 1, -3, w - 2, 2, '#9a6a46');
      rect(g, 6, -9, 10, 7, '#c9a646');
      rect(g, 7, -8, 8, 5, '#8fa0a8');
      rect(g, 20, -10, 12, 8, '#3a2a1a');
      rect(g, 21, -9, 10, 6, '#c8b89a');
      rect(g, 23, -7, 2, 3, '#7a6a50');
      rect(g, 27, -7, 2, 3, '#7a6a50');
      rect(g, w - 10, -7, 4, 5, '#5a8ac8');
      rect(g, (w >> 1), 0, 1, 12, '#5a3a22');
      rect(g, (w >> 1) - 4, 5, 2, 1, '#d0b080');
      rect(g, (w >> 1) + 3, 5, 2, 1, '#d0b080');
    },
  },

  // 식탁 (아침밥)
  dining: {
    up: 2,
    draw(g, w, h) {
      rect(g, 1, -1, w - 2, 20, '#b07a45');
      rect(g, 1, -1, w - 2, 1, '#c8935a');
      rect(g, 1, 19, w - 2, 3, '#8a5a30');
      rect(g, 3, 22, 3, 7, '#7d5430');
      rect(g, w - 6, 22, 3, 7, '#7d5430');
      rect(g, 8, 6, 7, 5, '#f4f4f4');
      rect(g, 9, 7, 5, 3, '#f0e6d0');
      rect(g, 19, 4, 9, 6, '#f4f4f4');
      rect(g, 20, 5, 7, 4, '#c8503a');
      rect(g, 32, 7, 6, 5, '#f4f4f4');
      rect(g, 33, 8, 4, 3, '#7a9a4a');
      rect(g, 16, 13, 1, 5, '#c0c6cc');
    },
  },

  wardrobe: {
    up: 16,
    draw(g, w) {
      rect(g, 1, -15, w - 2, 29, '#9a6a40');
      rect(g, 1, -15, w - 2, 1, '#b5814f');
      rect(g, w >> 1, -13, 1, 25, '#6e4a2a');
      rect(g, (w >> 1) - 3, -4, 1, 4, '#e0c080');
      rect(g, (w >> 1) + 2, -4, 1, 4, '#e0c080');
    },
  },

  // 망원경 가방
  bag: {
    up: 4,
    draw(g) {
      rect(g, 4, -2, 8, 2, '#4a4c54');
      rect(g, 1, 1, 14, 10, '#2a2c34');
      rect(g, 2, 5, 12, 1, '#5a5c64');
    },
  },

  // 버스 좌석 (등받이가 왼쪽 — 버스는 오른쪽으로 달린다)
  busseat: {
    up: 4,
    draw(g) {
      rect(g, 1, -3, 4, 14, '#2f5a99');
      rect(g, 4, 4, 10, 8, '#3f6fb5');
      rect(g, 4, 4, 10, 1, '#5a8ad0');
      rect(g, 5, 12, 2, 2, '#444');
      rect(g, 11, 12, 2, 2, '#444');
    },
  },

  buspole: {
    up: 30,
    draw(g) {
      rect(g, 7, -29, 2, 42, '#d9b43a');
      rect(g, 8, -29, 1, 42, '#b8922a');
      rect(g, 5, 12, 6, 2, '#888888');
    },
  },
});

// 버스 창밖 풍경: 먼 건물은 느리게, 가로수는 빠르게 지나간다 (x0,y0,w,h = 화면 좌표)
function drawScenery(g, x0, y0, w, h, t) {
  const ground = y0 + 21;
  g.save();
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  rect(g, x0, y0, w, h, '#a9d6ec');
  rect(g, x0, ground - 8, w, 8, '#cfe8f2');

  const layer = (offset, spacing, drawOne) => {
    const first = Math.floor(offset / spacing);
    const shift = offset - first * spacing;
    for (let k = -1; k * spacing - shift < w + spacing; k++) drawOne(first + k, Math.round(x0 + k * spacing - shift));
  };
  layer(t * 20, 22, (i, x) => {
    const bh = 5 + Math.floor(hash(i, 3) * 11);
    rect(g, x, ground - bh, 18, bh, ['#8fa3b5', '#9fb0bf', '#7f94a8'][Math.floor(hash(i, 4) * 3)]);
    for (let wy = ground - bh + 2; wy < ground - 2; wy += 3) rect(g, x + 3, wy, 12, 1, '#c8d8e4');
  });
  layer(t * 70, 40, (i, x) => {
    if (hash(i, 5) < 0.3) return;
    rect(g, x + 9, ground - 6, 2, 6, '#6b4a2e');
    rect(g, x + 4, ground - 16, 12, 11, hash(i, 6) < 0.6 ? '#d9b43a' : '#5e9c4c');
  });
  rect(g, x0, ground, w, h, '#6a6a70');
  layer(t * 140, 18, (i, x) => rect(g, x, ground + 3, 9, 1, '#e8e2c0'));
  g.restore();
}
