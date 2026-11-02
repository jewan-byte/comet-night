'use strict';
// ─────────────────────────────────────────────
// audio.js — 배경음과 대사 타자 소리 (파일 없이 Web Audio로 합성)
// 브라우저는 사용자가 키를 누르기 전엔 소리를 막기 때문에 첫 키 입력 때 start()
// ─────────────────────────────────────────────

const Sound = (() => {
  const VOLUME = 0.5;
  let ctx = null, master = null, muted = false;

  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

  // 음 하나: type 파형, 시작 시각 t, 길이 dur, 크기 vol
  function note(type, midi, t, dur, vol, dest = master) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = hz(midi);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // ── 배경음: 쓸쓸한 미스터리 (Am - F - Dm - E), 8마디 반복 ──
  const BPM = 84;
  const EIGHTH = 60 / BPM / 2;
  const CHORDS = [
    [57, 60, 64], // Am
    [53, 57, 60], // F
    [50, 53, 57], // Dm
    [52, 56, 59], // E
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 2, 1];  // 3 = 근음 한 옥타브 위
  const _ = null;
  const MELODY = [
    76, _, 72, _, 74, 72, 71, _,
    72, _, _, 69, 72, _, 77, _,
    76, _, 74, _, 72, _, 69, _,
    71, _, 68, _, 71, 74, 76, _,
  ];
  let step = 0, nextTime = 0, melodyBus = null;

  function scheduleBgm() {
    while (nextTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % 8, beat = step % 8;
      const chord = CHORDS[bar % 4];
      const i = ARP[beat];
      note('triangle', i === 3 ? chord[0] + 12 : chord[i], nextTime, EIGHTH * 1.6, 0.05);
      if (beat === 0 || beat === 4) note('triangle', chord[0] - 12, nextTime, EIGHTH * 3.5, 0.08);
      // 앞 4마디만 멜로디, 뒤 4마디는 반주만
      const m = bar < 4 ? MELODY[bar * 8 + beat] : null;
      if (m) note('square', m, nextTime, EIGHTH * 1.8, 0.035, melodyBus);
      step++;
      nextTime += EIGHTH;
    }
  }

  function start() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
    // 네모파 멜로디는 살짝 둥글게
    melodyBus = ctx.createBiquadFilter();
    melodyBus.type = 'lowpass';
    melodyBus.frequency.value = 1800;
    melodyBus.connect(master);
    nextTime = ctx.currentTime + 0.1;
    setInterval(scheduleBgm, 50);
  }

  // 대사 한 글자마다 짧은 "삑"
  function blip() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 520 + Math.random() * 40;
    env.gain.setValueAtTime(0.06, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // 실험 화면 효과음
  const SFX = {
    move: [['square', 72, 0, 0.04, 0.05]],
    select: [['square', 76, 0, 0.05, 0.05], ['square', 83, 0.05, 0.08, 0.05]],
    hit: [['triangle', 64, 0, 0.08, 0.2], ['triangle', 57, 0.07, 0.15, 0.2]],
    hurt: [['square', 50, 0, 0.06, 0.12], ['square', 45, 0.06, 0.1, 0.12]],
    fire: [['sawtooth', 40, 0, 0.3, 0.06], ['sawtooth', 43, 0.1, 0.4, 0.05]],
    good: [['square', 72, 0, 0.08, 0.06], ['square', 76, 0.08, 0.08, 0.06], ['square', 79, 0.16, 0.2, 0.06]],
    bad: [['square', 60, 0, 0.1, 0.06], ['square', 55, 0.1, 0.2, 0.06]],
    // 1986년 나무 마루 삐걱
    creak: [['triangle', 43, 0, 0.14, 0.05], ['triangle', 46, 0.06, 0.1, 0.03]],
    // 회상 전환 지지직
    static: Array.from({ length: 14 }, (_, i) => ['square', 30 + ((i * 37) % 60), i * 0.06, 0.05, 0.04]),
  };
  function sfx(kind) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    for (const [type, midi, at, dur, vol] of SFX[kind]) note(type, midi, t + at, dur, vol);
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.05);
    return muted;
  }

  return { start, blip, sfx, toggleMute, get muted() { return muted; } };
})();
