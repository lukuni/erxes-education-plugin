// Small, dependency-free effects: confetti bursts and feedback tones.

const COLORS = ["#5b5bf6", "#1fc99a", "#ffb020", "#ff5d5d", "#8b8bff", "#6ee7c3"];

/** Confetti from a point on screen (defaults to the centre). */
export const confetti = (origin?: { x: number; y: number }, pieces = 70) => {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const layer = document.createElement("div");
  layer.className = "edu-confetti";
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2.5;

  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement("i");
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 260;
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = COLORS[i % COLORS.length] ?? "#5b5bf6";
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance + 220}px`);
    piece.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    piece.style.animationDelay = `${Math.random() * 120}ms`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1700);
};

export const confettiFrom = (element: Element | null) => {
  if (!element) return confetti();
  const rect = element.getBoundingClientRect();
  confetti({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, 50);
};

let audio: AudioContext | null = null;

const tone = (frequency: number, start: number, duration: number, type: OscillatorType = "sine") => {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, audio.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(audio.currentTime + start);
  osc.stop(audio.currentTime + start + duration + 0.05);
};

/** Short "ding" / "bonk" / fanfare tones; silently skipped where audio is blocked. */
export const sound = (kind: "good" | "bad" | "win") => {
  try {
    audio ??= new AudioContext();
    if (kind === "good") {
      tone(660, 0, 0.12);
      tone(990, 0.09, 0.18);
    } else if (kind === "bad") {
      tone(220, 0, 0.18, "triangle");
      tone(180, 0.12, 0.22, "triangle");
    } else {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.22));
    }
  } catch {
    // Audio is a nicety; ignore browsers that block it.
  }
};

export const shuffle = <T>(list: T[], seed: number): T[] => {
  const out = [...list];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
};
