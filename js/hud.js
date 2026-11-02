'use strict';
// ─────────────────────────────────────────────
// hud.js — 미니맵, 전체 맵(M), 단서 수첩(Tab), 새 단서 알림
// ─────────────────────────────────────────────

// ── 지도용 축소 그림: 타일 1칸 = 1px ──

const MINI_COLORS = {
  hall: '#c9c4b6', wood: '#b08a5c', lab: '#d8dde0', carpet: '#8a6d8c',
  stairs: '#a39d8f', stairsDown: '#7a7468', door: '#8a7457', gym: '#d9a868',
  grass: '#5e9c4c', dirt: '#c8a36d', path: '#b8b3a6',
  oldhall: '#8a5a32', roof: '#7d7f86',
};
const MINI_WALL = '#3a3346';

function makeMinimap(map) {
  const c = makeCanvas(map.w, map.h);
  const g = c.getContext('2d');
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const k = map.kinds[y][x];
      if (!k) continue;
      g.fillStyle = MINI_COLORS[k] || MINI_WALL;
      g.fillRect(x, y, 1, 1);
    }
  }
  g.fillStyle = 'rgba(40,30,50,0.45)';
  for (const o of map.objects) g.fillRect(o.x, o.y, o.w, o.h);
  g.fillStyle = '#6fa8ff';
  for (const d of map.deco) if (d.elevator) g.fillRect(d.x, d.y, d.w, d.h);
  return c;
}

function drawPlayerDot(g, x, y, time) {
  if (Math.floor(time * 3) % 3 === 2) return; // 깜빡
  rect(g, x - 2, y - 2, 5, 5, '#000');
  rect(g, x - 1, y - 1, 3, 3, '#ff4a4a');
}

// ── 미니맵 (오른쪽 아래) ──

const MINI = { w: 72, h: 54, scale: 2, margin: 6 };

function drawMinimap(g, floor, player, time) {
  // 터치 조작일 땐 오른쪽 아래가 버튼 자리라서 왼쪽 위(장소 이름 아래)로
  const touch = Controls.mode === 'touch';
  const x0 = touch ? MINI.margin : VIEW_W - MINI.w - MINI.margin;
  const y0 = touch ? 32 : VIEW_H - MINI.h - MINI.margin;
  rect(g, x0 - 2, y0 - 2, MINI.w + 4, MINI.h + 4, '#fff');
  rect(g, x0 - 1, y0 - 1, MINI.w + 2, MINI.h + 2, '#000');

  // 캐릭터가 가운데 오도록
  const cx = player.x / TILE, cy = (player.y - 4) / TILE;
  const ox = Math.round(x0 + MINI.w / 2 - cx * MINI.scale);
  const oy = Math.round(y0 + MINI.h / 2 - cy * MINI.scale);
  g.save();
  g.beginPath();
  g.rect(x0, y0, MINI.w, MINI.h);
  g.clip();
  g.drawImage(floor.mini, ox, oy, floor.mini.width * MINI.scale, floor.mini.height * MINI.scale);
  g.restore();

  drawPlayerDot(g, x0 + MINI.w / 2, y0 + MINI.h / 2, time);
}

// ── 전체 맵 (M) ──

const FullMap = (() => {
  const el = document.getElementById('fullmap');
  const title = el.querySelector('.fm-title');
  const labels = el.querySelector('.fm-labels');
  let layout = null;

  function layoutFor(map) {
    const s = Math.max(1, Math.floor(Math.min((VIEW_W - 24) / map.w, (VIEW_H - 44) / map.h)));
    const w = map.w * s, h = map.h * s;
    return { s, x0: (VIEW_W - w) >> 1, y0: 24 + ((VIEW_H - 32 - h) >> 1), w, h };
  }

  function open(floor) {
    layout = layoutFor(floor.map);
    title.textContent = floor.map.label;
    labels.textContent = '';
    for (const r of floor.map.regions) {
      const span = document.createElement('span');
      span.textContent = r.name;
      span.style.setProperty('--x', layout.x0 + (r.x + r.w / 2) * layout.s);
      span.style.setProperty('--y', layout.y0 + (r.y + r.h / 2) * layout.s);
      labels.appendChild(span);
    }
    el.classList.add('open');
  }

  function close() {
    layout = null;
    el.classList.remove('open');
  }

  function draw(g, floor, player, time) {
    const L = layout;
    g.fillStyle = 'rgba(0,0,0,0.9)';
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    rect(g, L.x0 - 2, L.y0 - 2, L.w + 4, L.h + 4, '#fff');
    rect(g, L.x0 - 1, L.y0 - 1, L.w + 2, L.h + 2, '#000');
    g.drawImage(floor.mini, L.x0, L.y0, L.w, L.h);
    drawPlayerDot(g, Math.round(L.x0 + player.x / TILE * L.s), Math.round(L.y0 + (player.y - 4) / TILE * L.s), time);
  }

  return { open, close, draw, get isOpen() { return layout !== null; } };
})();

// ── 단서 수첩 (Tab) ──

const Notebook = (() => {
  const el = document.getElementById('notebook');
  const count = el.querySelector('.nb-count');
  const list = el.querySelector('.nb-list');
  const art = el.querySelector('.nb-art').getContext('2d');
  const name = el.querySelector('.nb-name');
  const place = el.querySelector('.nb-place');
  const text = el.querySelector('.nb-text');
  let clues = [], index = 0, opened = false;

  function render() {
    count.textContent = `${clues.filter(c => c.found).length} / ${clues.length}`;
    list.textContent = '';
    clues.forEach((c, i) => {
      const li = document.createElement('li');
      li.textContent = (i === index ? '▶ ' : '   ') + (c.found ? c.name : '???');
      if (i === index) li.className = 'sel';
      if (!c.found) li.classList.add('unknown');
      list.appendChild(li);
    });
    const c = clues[index];
    art.clearRect(0, 0, CLUE_W, CLUE_H);
    if (c.found) {
      art.drawImage(clueImage(c.name), 0, 0);
    } else {
      // 못 찾은 단서: 어두운 칸에 물음표
      rect(art, 0, 0, CLUE_W, CLUE_H, '#141018');
      for (const [x, y, w, h] of [[17, 8, 6, 2], [22, 10, 2, 4], [19, 14, 3, 2], [19, 16, 2, 3], [19, 21, 2, 2]]) {
        rect(art, x, y, w, h, '#4a4458');
      }
    }
    name.textContent = c.found ? c.name : '???';
    place.textContent = c.found ? c.place : '';
    text.textContent = c.found ? c.text.map(t => '* ' + t).join('\n') : '아직 찾지 못한 단서다.';
    const sel = list.children[index];
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function open(all) {
    clues = all;
    opened = true;
    el.classList.add('open');
    render();
  }

  function close() {
    opened = false;
    el.classList.remove('open');
  }

  function move(d) {
    index = (index + d + clues.length) % clues.length;
    render();
  }

  return { open, close, move, get isOpen() { return opened; } };
})();

// ── 목록형 메뉴 (Esc 메뉴, 개발자 메뉴) ──
// items: [{ id, label }] — 고른 항목은 main.js가 처리한다

function createMenu(id) {
  const el = document.getElementById(id);
  const list = el.querySelector('.mn-list');
  const msg = el.querySelector('.mn-msg');
  let items = [], index = 0, opened = false;

  function render() {
    list.textContent = '';
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.textContent = (i === index ? '▶ ' : '   ') + it.label;
      if (i === index) li.className = 'sel';
      list.appendChild(li);
    });
    const sel = list.children[index];
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  // 메뉴 내용 바꾸기 (하위 메뉴, 확인 질문 등). at: 처음 고른 칸
  function show(newItems, message = '', at = 0) {
    items = newItems;
    index = at;
    msg.textContent = message;
    msg.style.display = message ? '' : 'none';
    render();
  }

  return {
    open(newItems) {
      opened = true;
      el.classList.add('open');
      show(newItems);
    },
    close() {
      opened = false;
      el.classList.remove('open');
    },
    show,
    move(d) {
      index = (index + d + items.length) % items.length;
      render();
    },
    get selected() { return items[index]; },
    get isOpen() { return opened; },
  };
}

const Menu = createMenu('menu');
const DevMenu = createMenu('devmenu');

// ── 개발자용 디버그 정보 (왼쪽 위) ──
const DebugInfo = (() => {
  const el = document.getElementById('debug');
  return {
    show(on) { el.style.display = on ? 'block' : 'none'; },
    set(text) { el.textContent = text; },
  };
})();

// ── 지금 하고 있는 일 (왼쪽 위) ──
// lines: [{ text, key?, kind? }] — 내용은 story.js 의 statusLines()
const Status = (() => {
  const el = document.getElementById('status');
  let last = '';
  return {
    set(lines) {
      const sig = JSON.stringify(lines);
      if (sig === last) return;
      last = sig;
      el.textContent = '';
      for (const l of lines) {
        const div = document.createElement('div');
        if (l.kind) div.className = l.kind;
        div.textContent = l.text;
        if (l.key) div.append(Object.assign(document.createElement('span'), { className: 'key', textContent: `  [${l.key}]` }));
        el.appendChild(div);
      }
    },
    show(on) { el.classList.toggle('show', on); },
  };
})();

// ── 새 단서 알림 ──

// img: 옆에 같이 보여줄 그림 (단서 일러스트), 없으면 글자만
const Toast = (() => {
  const el = document.getElementById('toast');
  const artEl = el.querySelector('.toast-art');
  const art = artEl.getContext('2d');
  const msgEl = el.querySelector('.toast-msg');
  let timer = 0;
  return {
    show(msg, img = null) {
      msgEl.textContent = msg;
      artEl.style.display = img ? '' : 'none';
      if (img) {
        art.clearRect(0, 0, CLUE_W, CLUE_H);
        art.drawImage(img, 0, 0);
      }
      el.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), 2600);
    },
  };
})();
