/**
 * Viseme-based lip sync for Avatar SDK / Ready-Player-Me style heads.
 *
 * The Dimitris.glb head exposes the standard Oculus/RPM viseme morph targets
 * (sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, ih, oh, ou) alongside the
 * full 52 ARKit blendshapes, so no re-authoring of blendshapes is required.
 */

export const VISEMES = [
  'sil', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR',
  'aa', 'E', 'ih', 'oh', 'ou',
] as const;

export type Viseme = (typeof VISEMES)[number];

export interface VisemeFrame {
  viseme: Viseme;
  /** seconds from utterance start */
  start: number;
  end: number;
}

interface LipSyncState {
  npcId: string | null;
  startedAt: number;
  frames: VisemeFrame[];
  duration: number;
}

const state: LipSyncState = { npcId: null, startedAt: 0, frames: [], duration: 0 };
const listeners = new Set<() => void>();
let fallbackTimer: number | null = null;
let activeAudio: HTMLAudioElement | null = null;

export function subscribeLipSync(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const notify = () => listeners.forEach((l) => l());

function clearFallbackTimer() {
  if (fallbackTimer === null || typeof window === 'undefined') return;
  window.clearTimeout(fallbackTimer);
  fallbackTimer = null;
}

function startVisemePlayback(npcId: string, visemes: Viseme[], duration: number) {
  state.npcId = npcId;
  state.frames = buildFrames(visemes, duration);
  state.duration = duration;
  state.startedAt = performance.now();
  notify();
}

function buildFallbackVisemes(duration: number): Viseme[] {
  const pattern: Viseme[] = ['aa', 'oh', 'ih', 'E', 'ou', 'aa'];
  const count = Math.max(1, Math.round(Math.max(duration, 0.8) * 8));
  return Array.from({ length: count }, (_, index) => pattern[index % pattern.length]);
}

/** Greek (and latin) grapheme → viseme. Digraphs are matched first. */
const DIGRAPHS: Array<[string, Viseme]> = [
  ['ου', 'ou'], ['ού', 'ou'],
  ['αι', 'E'], ['αί', 'E'],
  ['ει', 'ih'], ['εί', 'ih'], ['οι', 'ih'], ['οί', 'ih'], ['υι', 'ih'],
  ['αυ', 'FF'], ['αύ', 'FF'], ['ευ', 'FF'], ['εύ', 'FF'],
  ['μπ', 'PP'], ['ντ', 'DD'], ['γκ', 'kk'], ['γγ', 'kk'],
  ['τσ', 'CH'], ['τζ', 'CH'],
];

const SINGLES: Record<string, Viseme> = {
  α: 'aa', ά: 'aa',
  ε: 'E', έ: 'E',
  η: 'ih', ή: 'ih', ι: 'ih', ί: 'ih', ϊ: 'ih', ΐ: 'ih', υ: 'ih', ύ: 'ih', ϋ: 'ih',
  ο: 'oh', ό: 'oh', ω: 'oh', ώ: 'oh',
  π: 'PP', β: 'FF', μ: 'PP', φ: 'FF',
  θ: 'TH', δ: 'TH',
  τ: 'DD', ζ: 'SS', σ: 'SS', ς: 'SS', ξ: 'SS', ψ: 'SS',
  κ: 'kk', γ: 'kk', χ: 'kk',
  ν: 'nn', λ: 'RR', ρ: 'RR',
  // latin fallback
  a: 'aa', e: 'E', i: 'ih', o: 'oh', u: 'ou', y: 'ih',
  b: 'PP', p: 'PP', m: 'PP', f: 'FF', v: 'FF', w: 'ou',
  t: 'DD', d: 'DD', n: 'nn', l: 'RR', r: 'RR',
  s: 'SS', z: 'SS', c: 'SS', j: 'CH', g: 'kk', k: 'kk', q: 'kk', x: 'kk', h: 'kk',
};

export function textToVisemes(text: string): Viseme[] {
  const src = text.toLowerCase();
  const out: Viseme[] = [];
  let i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    const digraph = DIGRAPHS.find(([d]) => d === two);
    if (digraph) {
      out.push(digraph[1]);
      i += 2;
      continue;
    }
    const ch = src[i];
    const single = SINGLES[ch];
    if (single) out.push(single);
    else if (/\s|[.,·;:!?«»"'()\-—]/.test(ch)) {
      if (out[out.length - 1] !== 'sil') out.push('sil');
    }
    i += 1;
  }
  return out;
}

function buildFrames(visemes: Viseme[], duration: number): VisemeFrame[] {
  if (!visemes.length) return [];
  const step = duration / visemes.length;
  return visemes.map((viseme, idx) => ({
    viseme,
    start: idx * step,
    end: (idx + 1) * step,
  }));
}

/** Interpolated viseme weights for the current playback time of `npcId`. */
export function getVisemeWeights(npcId: string): Partial<Record<Viseme, number>> | null {
  if (state.npcId !== npcId || !state.frames.length) return null;
  const t = (performance.now() - state.startedAt) / 1000;
  if (t > state.duration + 0.25) return null;

  const weights: Partial<Record<Viseme, number>> = {};
  for (const f of state.frames) {
    if (t < f.start - 0.06 || t > f.end + 0.06) continue;
    const mid = (f.start + f.end) / 2;
    const half = Math.max((f.end - f.start) / 2 + 0.06, 0.001);
    const w = Math.max(0, 1 - Math.abs(t - mid) / half);
    if (w > (weights[f.viseme] ?? 0)) weights[f.viseme] = w;
  }
  return weights;
}

export function isSpeaking(npcId?: string) {
  if (!state.npcId) return false;
  return npcId ? state.npcId === npcId : true;
}

export function stopSpeaking() {
  clearFallbackTimer();
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  if (activeAudio) {
    activeAudio.onplay = null;
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    activeAudio = null;
  }
  state.npcId = null;
  state.frames = [];
  notify();
}

function pickGreekVoice(preferredName?: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  if (preferredName) {
    const preferred = preferredName.toLowerCase();
    const named = voices.find((voice) => voice.name?.toLowerCase().includes(preferred));
    if (named) return named;
  }
  return voices.find((v) => v.lang?.toLowerCase().startsWith('el')) ?? voices[0];
}

/** Speaks `text` with the Web Speech API and drives the visemes of `npcId`. */
export function speak(
  npcId: string,
  text: string,
  opts: { rate?: number; pitch?: number; voiceName?: string } = {},
) {
  if (typeof window === 'undefined') return;
  stopSpeaking();

  const rate = opts.rate ?? 0.95;
  const visemes = textToVisemes(text);
  // ~12 visemes/sec at rate 1 gives a natural mouth cadence.
  const duration = visemes.length / (12 * rate);

  // WebViews can omit SpeechSynthesis entirely. Keep the mouth animation
  // testable there and let a real browser provide audio when available.
  if (!('speechSynthesis' in window) || typeof window.speechSynthesis?.speak !== 'function') {
    startVisemePlayback(npcId, visemes, duration);
    fallbackTimer = window.setTimeout(stopSpeaking, Math.max(250, (duration + 0.25) * 1000));
    return;
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'el-GR';
  utter.rate = rate;
  utter.pitch = opts.pitch ?? 1;
  const voice = pickGreekVoice(opts.voiceName);
  if (voice) utter.voice = voice;

  utter.onstart = () => {
    startVisemePlayback(npcId, visemes, duration);
  };
  utter.onend = stopSpeaking;
  utter.onerror = stopSpeaking;

  window.speechSynthesis.speak(utter);

  // Some browsers populate voices lazily; retrigger start state defensively.
  window.setTimeout(() => {
    if (state.npcId === null && window.speechSynthesis.speaking) utter.onstart?.(null as never);
  }, 250);
}

/** Plays a user-provided audio file and stretches the transcript visemes to its duration. */
export function playAudio(npcId: string, src: string, transcript = '') {
  if (typeof window === 'undefined' || !src.trim()) return;
  stopSpeaking();

  const textVisemes = textToVisemes(transcript);
  if (typeof Audio === 'undefined') {
    const duration = Math.max(textVisemes.length / (12 * 0.95), 0.8);
    startVisemePlayback(npcId, textVisemes.length ? textVisemes : buildFallbackVisemes(duration), duration);
    fallbackTimer = window.setTimeout(stopSpeaking, Math.max(250, (duration + 0.25) * 1000));
    return;
  }

  const audio = new Audio(src);
  audio.preload = 'auto';
  activeAudio = audio;

  audio.onplay = () => {
    if (activeAudio !== audio) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : Math.max(textVisemes.length / (12 * 0.95), 0.8);
    startVisemePlayback(npcId, textVisemes.length ? textVisemes : buildFallbackVisemes(duration), duration);
  };
  audio.onended = () => {
    if (activeAudio === audio) stopSpeaking();
  };
  audio.onerror = () => {
    if (activeAudio === audio) stopSpeaking();
  };

  void audio.play().catch(() => {
    if (activeAudio === audio) stopSpeaking();
  });
}
