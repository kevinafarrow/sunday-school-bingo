/**
 * A short confetti burst over the card. Silent, by design — the whole point is
 * that you're listening to something while you play.
 */

const COLORS = [
  'hsl(44 92% 60%)',
  'hsl(36 88% 48%)',
  'hsl(278 70% 62%)',
  'hsl(350 72% 58%)',
  'hsl(212 72% 58%)',
  'hsl(158 62% 48%)',
  'hsl(40 100% 92%)',
];

const COUNT = 140;
const DURATION = 2600;
const GRAVITY = 0.00042;

/**
 * Fire confetti on a canvas. Returns a function that stops it early.
 *
 * Does nothing (beyond returning a no-op) when the viewer has asked for reduced
 * motion.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {() => void}
 */
export function burst(canvas) {
  const noop = () => {};

  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return noop;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return noop;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pieces = [];
  for (let i = 0; i < COUNT; i++) {
    // Launched from the bottom corners, as if the card itself popped.
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -62 : -118) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7;
    const speed = 0.55 + Math.random() * 0.75;

    pieces.push({
      x: fromLeft ? -10 : width + 10,
      y: height + 10,
      vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1) * -1,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 7,
      tilt: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.22,
      color: COLORS[(Math.random() * COLORS.length) | 0],
    });
  }

  let raf = 0;
  let start = 0;
  let stopped = false;

  function frame(now) {
    if (stopped) return;
    if (!start) start = now;

    const elapsed = now - start;
    if (elapsed > DURATION) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const fade = Math.max(0, 1 - Math.max(0, elapsed - DURATION * 0.65) / (DURATION * 0.35));
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = fade;

    for (const p of pieces) {
      p.x += p.vx * 16;
      p.y += p.vy * 16;
      p.vy += GRAVITY * 16;
      p.vx *= 0.999;
      p.tilt += p.spin;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.tilt);
      ctx.fillStyle = p.color;
      // Squash on the tilt axis so pieces read as tumbling foil, not dots.
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  return function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, width, height);
  };
}
