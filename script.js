// Audio setup (the browser makes the drum sounds, no sound files needed)
let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// A drum "thump": a tone that drops in pitch
function thump(ctx, startFreq, endFreq, length, volume) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.setValueAtTime(startFreq, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + length);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + length);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + length);
}

// A "hiss": filtered random noise (used for snare, hi-hat, crash)
function hiss(ctx, length, volume, filterFreq) {
  const t = ctx.currentTime;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = filterFreq;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + length);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(t);
  source.stop(t + length);
}

// Each key plays one drum
const drums = {
  " ": (ctx) => thump(ctx, 150, 40, 0.4, 1),                          // kick
  "d": (ctx) => { thump(ctx, 200, 120, 0.15, 0.5); hiss(ctx, 0.2, 0.7, 1500); }, // snare
  "s": (ctx) => hiss(ctx, 0.07, 0.6, 7000),                           // hi-hat
  "a": (ctx) => hiss(ctx, 1.0, 0.6, 4000),                            // crash
  "f": (ctx) => thump(ctx, 260, 130, 0.3, 0.8),                       // tom 1
  "g": (ctx) => thump(ctx, 200, 100, 0.35, 0.8),                      // tom 2
  "j": (ctx) => thump(ctx, 140, 70, 0.45, 0.9)                        // floor tom
};

// Play a drum and flash its button
function play(key) {
  if (!drums[key]) return;

  drums[key](getAudio());

  const pad = document.querySelector('[data-key="' + key + '"]');
  pad.classList.add("hit");
  setTimeout(() => pad.classList.remove("hit"), 100);
}

// Click or tap a drum
document.querySelectorAll(".pad").forEach((pad) => {
  pad.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    play(pad.dataset.key);
  });
});

// Press a key
document.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (drums[key]) {
    event.preventDefault();
    play(key);
  }
});

// Beat machine: a simple 8-step rock beat
const beat = [
  ["s", " "], ["s"], ["s", "d"], ["s"],
  ["s", " "], ["s", " "], ["s", "d"], ["s"]
];

let timer = null;
let step = 0;

document.getElementById("beat").addEventListener("click", () => {
  if (timer) return;
  step = 0;
  timer = setInterval(() => {
    beat[step % beat.length].forEach(play);
    step++;
  }, 250);
});

document.getElementById("stop").addEventListener("click", () => {
  clearInterval(timer);
  timer = null;
});