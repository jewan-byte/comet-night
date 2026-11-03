'use strict';
// ─────────────────────────────────────────────
// art1986.js — 1986년 학교(map1986.js)에만 나오는 그림
// art.js 의 TILE_ART / DECO_ART / OBJ_ART 에 덧붙인다
// ─────────────────────────────────────────────

Object.assign(TILE_ART, {
  // 왁스칠한 나무 마루 복도 (교실 마루보다 짙고 반들반들)
  oldhall(g, x, y, tx, ty) {
    for (let r = 0; r < 4; r++) {
      const py = y + r * 4;
      rect(g, x, py, 16, 3, '#8a5a32');
      rect(g, x, py, 16, 1, '#a36d3d');
      rect(g, x, py + 3, 16, 1, '#5e3a1e');
      rect(g, x + Math.floor(hash(tx, ty * 4 + r, 6) * 16), py, 1, 3, '#5e3a1e');
      if (hash(tx, ty * 4 + r, 8) < 0.3) rect(g, x + Math.floor(hash(ty, tx + r, 9) * 10), py + 1, 4, 1, '#b8834e');  // 왁스 광
    }
  },

  // 옥상 콘크리트
  roof(g, x, y, tx, ty) {
    rect(g, x, y, 16, 16, '#7d7f86');
    rect(g, x, y, 16, 1, '#8c8e95');
    rect(g, x, y + 15, 16, 1, '#696b72');
    rect(g, x + 15, y, 1, 16, '#696b72');
    if (hash(tx, ty, 11) < 0.25) {
      const cx = x + 3 + Math.floor(hash(tx, ty, 12) * 8), cy = y + 3 + Math.floor(hash(tx, ty, 13) * 8);
      for (let i = 0; i < 4; i++) rect(g, cx + i, cy + (i >> 1), 1, 1, '#64666c');   // 금
    }
  },

  // 옥상 난간 (벽 대신 낮은 콘크리트 담)
  wallTopRoof(g, x, y) {
    rect(g, x, y, 16, 16, '#5a5c63');
    rect(g, x, y, 16, 1, '#6a6c73');
  },
  faceUpperRoof(g, x, y) {
    rect(g, x, y, 16, 16, '#5a5c63');
  },
  faceLowerRoof(g, x, y) {
    rect(g, x, y, 16, 10, '#8a8c93');
    rect(g, x, y, 16, 2, '#a2a4aa');
    rect(g, x, y + 10, 16, 6, '#6a6c73');
    rect(g, x, y + 15, 16, 1, '#4a4c52');
  },
});

Object.assign(DECO_ART, {
  // 복도 벽 포스터 (2칸 너비, 1칸 높이 벽면) — d.kind: hodori / fire / slogan / star
  poster86(g, x, y, w, h, d) {
    const X = x + 3, Y = y + 1, W = w - 6, H = 9;
    if (d.kind === 'star') {
      rect(g, X, Y, W, H, '#1d2233');
      for (let i = 0; i < 9; i++) rect(g, X + 1 + Math.floor(hash(i, x, 1) * (W - 2)), Y + 1 + Math.floor(hash(x, i, 2) * (H - 2)), 1, 1, '#ffe9a0');
      rect(g, X + W - 7, Y + 5, 3, 3, '#c8323c');
      return;
    }
    rect(g, X, Y, W, H, d.kind === 'slogan' ? '#efe6c8' : '#f4efe2');
    if (d.kind === 'hodori') {
      const cx = X + (W >> 1);
      rect(g, cx - 3, Y + 1, 6, 4, '#f0a030');                // 호돌이 얼굴
      rect(g, cx - 2, Y + 2, 1, 1, '#2a2a2a');
      rect(g, cx + 1, Y + 2, 1, 1, '#2a2a2a');
      rect(g, cx - 1, Y, 2, 1, '#2a2a2a');                    // 상모
      ['#3a6ac8', '#2a2a2a', '#c8323c', '#f0c040', '#3a9a4a'].forEach((c, i) => rect(g, X + 2 + i * 4, Y + 6, 3, 2, c));
    } else if (d.kind === 'fire') {
      rect(g, X, Y, W, 1, '#c8323c');
      rect(g, X, Y + H - 1, W, 1, '#c8323c');
      const cx = X + (W >> 1);
      rect(g, cx - 2, Y + 2, 4, 4, '#ff6a2a');
      rect(g, cx - 1, Y + 1, 2, 1, '#ff6a2a');
      rect(g, cx - 1, Y + 4, 2, 2, '#ffe066');
      rect(g, X + 3, Y + 7, W - 6, 1, '#c8323c');
    } else {
      rect(g, X + 3, Y + 2, W - 6, 1, '#2a2a2a');
      rect(g, X + 4, Y + 4, W - 9, 1, '#2a2a2a');
      rect(g, X + 3, Y + 6, W - 7, 1, '#2a2a2a');
      rect(g, X + W - 5, Y + 6, 3, 2, '#c8323c');             // 도장
    }
  },

  // 암실 빨간 안전등 (벽 2칸 높이)
  safelight(g, x, y) {
    rect(g, x + 7, y + 6, 2, 8, '#2a2a2a');
    rect(g, x + 3, y + 14, 10, 8, '#2a2a2a');
    rect(g, x + 4, y + 15, 8, 6, '#ff3a2a');
    rect(g, x + 4, y + 15, 8, 1, '#ff8a7a');
  },

  // 줄에 걸어 말리는 사진 (벽 2칸 높이)
  dryline(g, x, y, w) {
    rect(g, x, y + 10, w, 1, '#d8d4ca');
    for (let px = x + 3, i = 0; px + 10 < x + w; px += 15, i++) {
      rect(g, px + 4, y + 9, 2, 3, '#c9a646');
      rect(g, px, y + 12, 10, 12, '#e8e4da');
      rect(g, px + 1, y + 13, 8, 9, '#1a1a22');
      for (let s = 0; s < 4; s++) rect(g, px + 2 + Math.floor(hash(i, s, 3) * 6), y + 14 + Math.floor(hash(s, i, 4) * 7), 1, 1, '#ffffff');
      if (i === 1) for (let k = 0; k < 4; k++) rect(g, px + 3 + k, y + 16 + (k >> 1), 1, 1, '#a8c8ff');   // 혜성 꼬리
    }
  },

  // 바닥의 문어발 멀티탭
  powerstrip(g, x, y) {
    rect(g, x + 2, y + 5, 11, 4, '#e8e4da');
    rect(g, x + 2, y + 8, 11, 1, '#b8b4aa');
    for (let i = 0; i < 4; i++) rect(g, x + 3 + i * 3, y + 6, 2, 2, '#1a1a1a');
    rect(g, x + 1, y + 3, 1, 6, '#2a2a2a');                  // 엉킨 전선
    rect(g, x + 5, y + 9, 1, 5, '#2a2a2a');
    rect(g, x + 9, y + 9, 5, 1, '#2a2a2a');
    rect(g, x + 13, y + 9, 1, 6, '#2a2a2a');
  },

  // 숙직 당번표 (1칸 높이 벽면)
  dutyboard(g, x, y, w) {
    rect(g, x + 2, y + 1, w - 4, 9, '#f4efe2');
    for (let r = 0; r < 4; r++) rect(g, x + 4, y + 2 + r * 2, w - 8, 1, '#9a948a');
    rect(g, x + 4, y + 8, w - 8, 1, '#c8323c');
  },
});

Object.assign(OBJ_ART, {
  // 방화사 양동이 — o.empty 면 속이 비었다
  sandbucket: {
    up: 3,
    draw(g, w, h, o) {
      rect(g, 3, -2, 10, 1, '#555');
      rect(g, 3, -2, 1, 4, '#555');
      rect(g, 12, -2, 1, 4, '#555');
      rect(g, 3, 1, 10, 2, '#a02830');
      rect(g, 4, 1, 8, 2, o.empty ? '#2a1414' : '#d9c08a');
      rect(g, 4, 3, 8, 10, '#c8323c');
      rect(g, 4, 3, 1, 10, '#e05a5a');
      rect(g, 4, 7, 8, 2, '#f4efe2');
    },
  },

  // 2인용 나무 책상 + 나무 걸상 둘 (2×2)
  olddesk: {
    up: 2,
    draw(g, w) {
      rect(g, 1, -1, w - 2, 8, '#a8743f');
      rect(g, 1, -1, w - 2, 1, '#c08a52');
      rect(g, w >> 1, -1, 1, 8, '#8a5a2e');
      rect(g, 1, 7, w - 2, 2, '#7a4f27');
      rect(g, 2, 9, 2, 4, '#5a3a1e');
      rect(g, w - 4, 9, 2, 4, '#5a3a1e');
      for (const cx of [3, (w >> 1) + 2]) {
        rect(g, cx, 16, 10, 4, '#b07a45');
        rect(g, cx, 16, 10, 1, '#c8935a');
        rect(g, cx, 21, 10, 5, '#8f6236');
        rect(g, cx + 1, 26, 1, 3, '#5a3a1e');
        rect(g, cx + 8, 26, 1, 3, '#5a3a1e');
      }
    },
  },

  // 현상액 쟁반 셋이 놓인 작업대 (3×2)
  devtable: {
    up: 2,
    draw(g, w, h) {
      rect(g, 1, -1, w - 2, h - 9, '#7a5a3a');
      rect(g, 1, -1, w - 2, 1, '#94704a');
      rect(g, 1, h - 10, w - 2, 3, '#5a3c22');
      rect(g, 2, h - 7, 2, 5, '#3e2814');
      rect(g, w - 4, h - 7, 2, 5, '#3e2814');
      ['#c9a95a', '#9fb8c0', '#b8c8a0'].forEach((liquid, i) => {
        const tx = 3 + i * 15;
        rect(g, tx, 2, 13, 10, '#e8e4da');
        rect(g, tx + 1, 3, 11, 8, liquid);
      });
      rect(g, 5, 4, 7, 5, '#d8d0c0');                       // 떠오르는 사진
      rect(g, 6, 5, 5, 3, '#4a4a52');
      rect(g, 33, 13, 8, 1, '#c0c0c0');                     // 집게
    },
  },

  // 전기난로 (빨간 열선)
  heater: {
    up: 6,
    draw(g) {
      rect(g, 2, -5, 12, 17, '#b8b4aa');
      rect(g, 2, -5, 12, 1, '#d8d4ca');
      rect(g, 3, -3, 10, 11, '#3a2a20');
      for (let i = 0; i < 4; i++) rect(g, 4, -2 + i * 3, 8, 1, '#ff7a2a');
      rect(g, 3, 12, 2, 2, '#555');
      rect(g, 11, 12, 2, 2, '#555');
    },
  },

  // 숙직 책상: 다이얼 전화기 + 라디오 + 나무 의자 (2×2)
  dutydesk: {
    up: 6,
    draw(g, w) {
      rect(g, 5, -2, 9, 5, '#1a1a1e');
      rect(g, 4, -4, 11, 2, '#2a2a2e');
      rect(g, 8, -1, 3, 3, '#e8e4da');
      rect(g, 19, -5, 10, 8, '#6a4a2e');
      rect(g, 20, -4, 4, 6, '#3a2a1a');
      rect(g, 25, -3, 3, 1, '#f0c040');
      rect(g, 1, 3, w - 2, 9, '#a8743f');
      rect(g, 1, 3, w - 2, 1, '#c08a52');
      rect(g, 1, 12, w - 2, 3, '#7a4f27');
      rect(g, 10, 18, 12, 4, '#8f6236');
      rect(g, 10, 23, 12, 5, '#6a4a2a');
      rect(g, 11, 28, 1, 2, '#3e2814');
      rect(g, 20, 28, 1, 2, '#3e2814');
    },
  },

  // 커다란 라디오 카세트 녹음기 (2×1) — 녹음 중 빨간 불
  boombox: {
    up: 6,
    draw(g, w) {
      rect(g, 2, -4, w - 4, 15, '#2a2a30');
      rect(g, 2, -4, w - 4, 1, '#4a4a55');
      rect(g, 9, -7, w - 18, 3, '#6a6a72');                  // 손잡이
      ring(g, 9, 4, 4, '#6a6a72');                            // 스피커
      ring(g, w - 10, 4, 4, '#6a6a72');
      rect(g, 14, 0, 4, 5, '#c8c0aa');                        // 카세트 창
      rect(g, 15, -2, 2, 1, '#ff3a2a');                       // 녹음 불
    },
  },

  // 원판 사진기 (삼각대 위 나무 상자 카메라)
  platecamera: {
    up: 12,
    draw(g) {
      rect(g, 3, -10, 10, 8, '#6a4a2e');
      rect(g, 3, -10, 10, 1, '#8a6440');
      rect(g, 12, -8, 3, 4, '#2a2a2e');                      // 렌즈
      rect(g, 4, -9, 3, 3, '#c9a646');                       // 원판 홀더
      for (let i = 0; i < 11; i++) {
        rect(g, 7 - Math.round(i * 0.5), -2 + i, 1, 1, '#8a8f98');
        rect(g, 8 + Math.round(i * 0.5), -2 + i, 1, 1, '#8a8f98');
      }
      rect(g, 8, -2, 1, 12, '#8a8f98');
    },
  },

  // 알코올램프가 놓인 관측 의자 (불이 켜져 있다)
  lampstool: {
    up: 10,
    draw(g) {
      rect(g, 3, 4, 10, 4, '#2a3a5a');
      rect(g, 3, 4, 10, 1, '#3a4a6a');
      rect(g, 4, 8, 1, 6, '#1e2a40');
      rect(g, 11, 8, 1, 6, '#1e2a40');
      rect(g, 5, -1, 6, 5, '#bfe3ef');                        // 램프
      rect(g, 5, 1, 6, 3, '#7fb8d8');
      rect(g, 7, -3, 2, 2, '#8a8f98');
      rect(g, 7, -8, 2, 5, '#ff8a2a');                        // 불꽃
      rect(g, 7, -6, 1, 3, '#ffe066');
    },
  },

  // 옥상 천문대 (6×5): 원통 벽 + 슬릿이 열린 둥근 지붕
  dome: {
    up: 14,
    draw(g, w, h) {
      const cx = w >> 1, base = 30, R = 42;
      rect(g, 6, base, w - 12, h - base - 2, '#c9ccd0');
      rect(g, 6, base, w - 12, 2, '#e0e2e6');
      rect(g, w - 12, base, 6, h - base - 2, '#a8abb0');
      rect(g, cx - 8, base + 18, 16, h - base - 20, '#2a2e38');   // 열린 문
      rect(g, cx - 8, base + 18, 3, h - base - 20, '#c9ccd0');
      rect(g, cx - 3, base + 24, 6, 1, '#ffd890');                // 새어 나오는 불빛
      for (let y = -12; y < base; y++) {
        const hw = Math.round(Math.sqrt(Math.max(0, R * R - (base - y) * (base - y))));
        rect(g, cx - hw, y, hw * 2, 1, '#e4e6ea');
        rect(g, cx + Math.round(hw * 0.5), y, Math.round(hw * 0.5), 1, '#c9ccd2');
      }
      rect(g, cx - 4, -12, 8, base + 12, '#1a1d2a');             // 슬릿
      rect(g, cx - 2, -14, 4, 10, '#e4e6ee');                     // 슬릿 밖으로 나온 망원경
    },
  },
});
