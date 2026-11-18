// Procedural weapon audio.
//
// The gunfire used to be three small mp3s, which is why it sounded thin and
// aliased: the sniper sample is 24 kHz, so its crack loses everything above
// 12 kHz and the tail is shorter than the echo it is trying to fake.
//
// Instead of shipping bigger samples we synthesise the shots. Each weapon is a
// stack of layers — a bright noise crack, a filtered body whose cutoff drops as
// it decays, a sub-bass thump and an airy tail — soft-clipped for punch and
// normalised. Three randomised variants per weapon come back as buffers, so the
// existing positional playback and the AudioBuffer cache stay unchanged.

export const GENERATED_GUN_KEYS = ["machinegun", "pistol", "sniper"];

const SAMPLE_RATE = 44100;
const VARIANTS = 3;
const PEAK = 0.9;

// Each recipe describes the whole shot in seconds plus its layers. `freq` is a
// [start, end] sweep, `gain` a peak level, `decay` the falloff length.
const RECIPES = {
  // Fast automatic fire: a snap with almost no tail, so bursts stay readable.
  machinegun: {
    duration: 0.3,
    variance: 0.16,
    noise: [
      { filter: "bandpass", freq: [4300, 1500], q: 1.0, gain: 0.86, attack: 0.0012, decay: 0.075 },
      { filter: "lowpass", freq: [1200, 260], q: 0.7, gain: 0.5, attack: 0.002, decay: 0.17 },
      { filter: "highpass", freq: [900, 420], q: 0.7, gain: 0.22, attack: 0.004, decay: 0.11, delay: 0.012 },
    ],
    tone: [
      { wave: "triangle", freq: [260, 74], gain: 0.5, attack: 0.002, decay: 0.085 },
      { wave: "sine", freq: [118, 46], gain: 0.42, attack: 0.004, decay: 0.15 },
    ],
  },
  // Handgun / marksman: a wider crack with real low end behind it.
  pistol: {
    duration: 0.5,
    variance: 0.12,
    noise: [
      { filter: "bandpass", freq: [3400, 800], q: 1.2, gain: 1.0, attack: 0.0012, decay: 0.11 },
      { filter: "lowpass", freq: [1900, 320], q: 0.6, gain: 0.62, attack: 0.0025, decay: 0.3, delay: 0.008 },
      { filter: "highpass", freq: [2600, 900], q: 0.6, gain: 0.2, attack: 0.006, decay: 0.34, delay: 0.02 },
    ],
    tone: [
      { wave: "triangle", freq: [200, 58], gain: 0.58, attack: 0.002, decay: 0.14 },
      { wave: "sine", freq: [96, 40], gain: 0.55, attack: 0.004, decay: 0.3 },
    ],
  },
  // Sniper / .50 cal: heavy sub-bass slam with a long report rolling away.
  sniper: {
    duration: 1.1,
    variance: 0.09,
    noise: [
      { filter: "bandpass", freq: [2900, 420], q: 0.8, gain: 1.0, attack: 0.0015, decay: 0.2 },
      { filter: "lowpass", freq: [1500, 170], q: 0.5, gain: 0.78, attack: 0.003, decay: 0.55, delay: 0.01 },
      { filter: "highpass", freq: [2400, 700], q: 0.5, gain: 0.26, attack: 0.008, decay: 1.0, delay: 0.03 },
    ],
    tone: [
      { wave: "sine", freq: [150, 30], gain: 0.85, attack: 0.003, decay: 0.55 },
      { wave: "triangle", freq: [320, 76], gain: 0.4, attack: 0.002, decay: 0.22 },
    ],
  },
};

function noiseBuffer(ctx, seconds) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function softClipCurve(amount) {
  const size = 1024;
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    const x = (i * 2) / (size - 1) - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

function scheduleNoise(ctx, destination, noise, jitter) {
  const start = noise.delay ?? 0;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, start + noise.decay + 0.05);
  source.playbackRate.value = jitter;

  const filter = ctx.createBiquadFilter();
  filter.type = noise.filter;
  filter.Q.value = noise.q ?? 0.8;
  filter.frequency.setValueAtTime(Math.min(18000, noise.freq[0] * jitter), start);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(60, noise.freq[1] * jitter),
    start + noise.decay,
  );

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    noise.gain,
    start + (noise.attack ?? 0.002),
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, start + noise.decay);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(start);
  source.stop(start + noise.decay + 0.04);
}

function scheduleTone(ctx, destination, tone, jitter) {
  const start = tone.delay ?? 0;
  const osc = ctx.createOscillator();
  osc.type = tone.wave;
  osc.frequency.setValueAtTime(tone.freq[0] * jitter, start);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20, tone.freq[1] * jitter),
    start + tone.decay * 0.85,
  );

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    tone.gain,
    start + (tone.attack ?? 0.003),
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.decay);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(start);
  osc.stop(start + tone.decay + 0.02);
}

function normalise(buffer, peak = PEAK) {
  const data = buffer.getChannelData(0);
  let max = 0;
  for (let i = 0; i < data.length; i += 1) {
    const value = Math.abs(data[i]);
    if (value > max) max = value;
  }
  if (max > 0 && max !== peak) {
    const scale = peak / max;
    for (let i = 0; i < data.length; i += 1) data[i] *= scale;
  }
  return buffer;
}

async function renderVariant(recipe) {
  const Offline =
    typeof window !== "undefined" &&
    (window.OfflineAudioContext || window.webkitOfflineAudioContext);
  if (!Offline) return null;

  const length = Math.ceil(recipe.duration * SAMPLE_RATE);
  const ctx = new Offline(1, length, SAMPLE_RATE);

  // A soft clipper on the sum glues the layers together and keeps the transient
  // loud without the digital edge of hard clipping.
  const clip = ctx.createWaveShaper();
  clip.curve = softClipCurve(1.9);
  clip.oversample = "4x";
  clip.connect(ctx.destination);

  const jitter = 1 + (Math.random() - 0.5) * recipe.variance;
  recipe.noise.forEach((noise) => scheduleNoise(ctx, clip, noise, jitter));
  recipe.tone.forEach((tone) => scheduleTone(ctx, clip, tone, jitter));

  const rendered = await ctx.startRendering();
  return normalise(rendered);
}

/**
 * Renders every generated gun sound. Returns `{ machinegun: [...], pistol: [...],
 * sniper: [...] }` — a few variants each, so repeated shots are not identical.
 */
export async function renderGunBuffers(variants = VARIANTS) {
  const result = {};
  await Promise.all(
    GENERATED_GUN_KEYS.map(async (key) => {
      const shots = [];
      for (let i = 0; i < variants; i += 1) {
        const buffer = await renderVariant(RECIPES[key]);
        if (buffer) shots.push(buffer);
      }
      result[key] = shots;
    }),
  );
  return result;
}
