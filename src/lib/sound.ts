'use client';

/**
 * Tiny Web Audio helper for celebratory UI sounds — synthesized on the fly so
 * we ship no audio assets. Lazily creates a single shared AudioContext (browsers
 * only allow it after a user gesture, which our confetti triggers always are).
 * Silently no-ops when Web Audio is unavailable.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(ac: AudioContext, freq: number, start: number, dur: number, gain: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const t0 = ac.currentTime + start;
  // sine reads warmer/rounder than triangle — no bright harmonics
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  // gentle upward glide (subtle, not a sparkle "zip")
  osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t0 + dur);
  // low-pass rolls off any edge for a softer, deeper body
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1800, t0);
  // slow attack + long tail = mellow, not a click
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(lp).connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/**
 * A soft, deep confetti/crystal-charge chime — a warm, rounded major arpeggio a
 * couple of octaves lower than a bright "sparkle". Mellow enough to fire on
 * every solve without being piercing.
 */
export function playConfetti() {
  const ac = audio();
  if (!ac) return;
  // C4, E4, G4, C5 — warm mid-range major arpeggio, slower and rounder
  const notes = [261.6, 329.6, 392.0, 523.3];
  notes.forEach((f, i) => blip(ac, f, i * 0.09, 0.5, 0.08));
}

/**
 * A whisper-quiet "particle shimmer" for hovering the crystal — a handful of
 * very soft, high, quickly-decaying blips at gentle random pitches, like tiny
 * motes catching light. Rate-limited so rapid re-hovers don't stack.
 */
let lastShimmer = 0;
export function playShimmer() {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  if (now - lastShimmer < 0.18) return; // debounce jittery hovers
  lastShimmer = now;
  // sparse high overtones around C6–C7, very low gain and short tails
  const base = [1046.5, 1318.5, 1568.0, 2093.0];
  for (let i = 0; i < 3; i++) {
    const f = base[Math.floor(Math.random() * base.length)] * (0.98 + Math.random() * 0.04);
    blip(ac, f, Math.random() * 0.08, 0.22, 0.02);
  }
}

/**
 * A continuous "particles drifting" stream for while the crystal is held down —
 * a soft airy bed (filtered noise) plus sparse twinkles, kept very quiet. Call
 * startParticleStream() on press and invoke the returned stop() on release.
 * Fades in/out so it never clicks. Returns a no-op if audio is unavailable.
 */
export function startParticleStream(): () => void {
  const ac = audio();
  if (!ac) return () => {};
  const now = ac.currentTime;

  // Airy bed: looping white noise through a gentle band-pass — like a faint wind
  // of drifting motes. Kept whisper-low.
  const bufLen = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2600;
  bp.Q.value = 0.8;
  const bed = ac.createGain();
  bed.gain.setValueAtTime(0.0001, now);
  bed.gain.exponentialRampToValueAtTime(0.012, now + 0.25); // fade in
  noise.connect(bp).connect(bed).connect(ac.destination);
  noise.start(now);

  // Sparse twinkles sprinkled on top while held.
  const twinkle = setInterval(() => playShimmerRaw(ac), 260);

  return () => {
    const t = ac.currentTime;
    clearInterval(twinkle);
    bed.gain.cancelScheduledValues(t);
    bed.gain.setValueAtTime(bed.gain.value, t);
    bed.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); // fade out
    noise.stop(t + 0.35);
  };
}

/**
 * A tiny, dry "tick" for a checkmark drawing in — a short soft blip that reads
 * as a pen stroke landing. Pitched a little higher each call would feel busy, so
 * it stays fixed and gentle; fire one per row as a validation list fills in.
 */
export function playTick() {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const lp = ac.createBiquadFilter();
  osc.type = 'sine';
  // brief upward chirp — the "flick" of a checkmark
  osc.frequency.setValueAtTime(660, t0);
  osc.frequency.exponentialRampToValueAtTime(1040, t0 + 0.06);
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
  osc.connect(lp).connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.15);
}

/**
 * A near-subliminal "brush" for hovering a nav row — one very quiet, very short
 * low blip. Quieter and duller than playTick (that one announces an event; this
 * one just acknowledges the pointer). Debounced hard: a pointer swept down a
 * list fires onMouseEnter per row, and without this it machine-guns.
 */
let lastHover = 0;
export function playHover() {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  if (t0 - lastHover < 0.06) return;
  lastHover = t0;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const lp = ac.createBiquadFilter();
  osc.type = 'sine';
  // flat and low — a pitch glide would read as a "confirm", not a graze
  osc.frequency.setValueAtTime(420, t0);
  lp.type = 'lowpass';
  lp.frequency.value = 1200;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.018, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  osc.connect(lp).connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.07);
}

/**
 * A light two-note "resolved" chime — softer and quicker than playConfetti, for
 * a small confirmation like clearing a validation warning.
 */
export function playChime() {
  const ac = audio();
  if (!ac) return;
  blip(ac, 523.3, 0, 0.32, 0.06); // C5
  blip(ac, 784.0, 0.08, 0.36, 0.06); // G5
}

/**
 * A slow, rising sub-bass rumble — the "pressure building" under the rock before
 * it breaks. A deep sine gliding up plus low-passed noise that swells, so the
 * break lands with weight instead of out of silence. Fire it as the rock starts
 * to tremble; it self-ends just after the moment of the break.
 */
export function playRockRumble() {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const dur = 1.25;

  // sub-bass glide — the ground groaning under strain
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(38, t0);
  osc.frequency.exponentialRampToValueAtTime(74, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.3, t0 + dur * 0.9);
  g.gain.exponentialRampToValueAtTime(0.42, t0 + dur); // final swell into the break
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);

  // low rumble bed — filtered noise that grows and opens up
  const bufLen = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    const p = i / bufLen;
    d[i] = (Math.random() * 2 - 1) * p * p; // ramps from silence
  }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(120, t0);
  lp.frequency.exponentialRampToValueAtTime(340, t0 + dur);
  const ng = ac.createGain();
  ng.gain.value = 0.45;
  noise.connect(lp).connect(ng).connect(ac.destination);
  noise.start(t0);
}

/**
 * The break itself, in three layers for depth: (1) a deep detuned boom for body,
 * (2) a bright high-passed noise crack for the shatter, and (3) a shimmering
 * crystalline chord that blooms a beat later — the crystal "singing" as it
 * emerges. Fire at the instant the rock detonates.
 */
export function playRockShatter() {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);

  // (1) deep boom — two detuned sines dropping fast for a fat body
  ([[128, 40, 0.9], [92, 32, 0.5]] as const).forEach(([f0, f1, peak]) => {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(f1, now + 0.4);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + 0.65);
  });

  // (2) crack — a bright high-passed noise burst that decays fast
  const dur = 0.55;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1100;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.6, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  noise.connect(hp).connect(ng).connect(master);
  noise.start(now);

  // (3) crystalline chime — a soft major chord that blooms as the crystal rises
  const chord = [523.3, 659.3, 784.0, 1046.5, 1318.5]; // C5 E5 G5 C6 E6
  chord.forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ac.createGain();
    const s = now + 0.14 + i * 0.05; // staggered so it shimmers open
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.09, s + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 1.1);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    o.connect(lp).connect(g).connect(master);
    o.start(s);
    o.stop(s + 1.2);
  });
}

// Internal: one very soft twinkle (no debounce), used by the held stream.
function playShimmerRaw(ac: AudioContext) {
  const base = [1046.5, 1318.5, 1568.0, 2093.0];
  const f = base[Math.floor(Math.random() * base.length)] * (0.98 + Math.random() * 0.04);
  blip(ac, f, Math.random() * 0.05, 0.26, 0.015);
}
