import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Canvas size uses `ceil(viewport / SCALE)`. **Lower SCALE ⇒ more canvas pixels ⇒ finer grain.**
 * (Raising SCALE makes chunky blobs — that was wrong before.)
 */
const SCALE = 1;
const FPS = 14;
/** Luminance swing around BASE_GRAY (keeps texture dark, not milky). */
const NOISE_CONTRAST = 0.5;
/** Center noise toward shadow gray so blended layer reads darker. */
const BASE_GRAY = 66;
const REDUCED_MOTION_MS = 3200;

/** Per WHATWG / Chromium, each `getRandomValues` call is limited to 65536 bytes. */
const CRYPTO_RANDOM_CHUNK = 65536;

function paint_noise_to_image_data(data: Uint8ClampedArray) {
  const pixel_count = data.length >> 2;
  if (pixel_count < 1) return;

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const gray = new Uint8Array(pixel_count);
    let offset = 0;
    while (offset < pixel_count) {
      const len = Math.min(CRYPTO_RANDOM_CHUNK, pixel_count - offset);
      crypto.getRandomValues(gray.subarray(offset, offset + len));
      offset += len;
    }
    const spread_mid = 128;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const raw = gray[p] ?? spread_mid;
      const g = Math.max(
        0,
        Math.min(
          255,
          Math.round(BASE_GRAY + (raw - spread_mid) * NOISE_CONTRAST),
        ),
      );
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
      data[i + 3] = 255;
    }
    return;
  }
  const spread_mid_fb = 128;
  for (let i = 0; i < data.length; i += 4) {
    const raw = (Math.random() * 256) | 0;
    const g = Math.max(
      0,
      Math.min(
        255,
        Math.round(BASE_GRAY + (raw - spread_mid_fb) * NOISE_CONTRAST),
      ),
    );
    data[i] = g;
    data[i + 1] = g;
    data[i + 2] = g;
    data[i + 3] = 255;
  }
}

/** Full-viewport noise regenerated each tick — not a translated texture tile. */
export function FilmGrain() {
  const canvas_ref = useRef<HTMLCanvasElement>(null);
  const reduced_motion_ref = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced_motion_ref.current = mq.matches;
    const on_mq = () => {
      reduced_motion_ref.current = mq.matches;
    };
    mq.addEventListener('change', on_mq);
    return () => mq.removeEventListener('change', on_mq);
  }, []);

  useEffect(() => {
    const canvas_el = canvas_ref.current;
    if (!canvas_el) return;
    const ctx2d = canvas_el.getContext('2d', { alpha: false });
    if (!ctx2d) return;

    let timer = 0;
    let alive = true;

    const resize = () => {
      const sw = Math.max(48, Math.ceil(window.innerWidth / SCALE));
      const sh = Math.max(48, Math.ceil(window.innerHeight / SCALE));
      canvas_el.width = sw;
      canvas_el.height = sh;
    };

    const paint = () => {
      const w = canvas_el.width;
      const h = canvas_el.height;
      if (w < 1 || h < 1) return;
      const idata = ctx2d.createImageData(w, h);
      paint_noise_to_image_data(idata.data);
      ctx2d.putImageData(idata, 0, 0);
    };

    const schedule_loop = () => {
      if (!alive) return;
      paint();
      const ms = reduced_motion_ref.current
        ? REDUCED_MOTION_MS
        : Math.round(1000 / FPS);
      timer = window.setTimeout(schedule_loop, ms);
    };

    resize();
    schedule_loop();

    window.addEventListener('resize', resize);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-45"
      style={{
        opacity: 'var(--grain-opacity, 0.11)',
        mixBlendMode:
          'var(--grain-blend-mode, overlay)' as CSSProperties['mixBlendMode'],
      }}
    >
      <canvas ref={canvas_ref} className="block h-full w-full" />
    </div>
  );
}
