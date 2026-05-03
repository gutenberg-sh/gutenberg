/** 6-digit hex with leading # */
function parse_hex(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) return null;
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

function rgb_to_hex(r: number, g: number, b: number): string {
  const clamp = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`;
}

function mix_hex(a: string, b: string, t: number): string {
  const A = parse_hex(a);
  const B = parse_hex(b);
  if (!A || !B) return a;
  return rgb_to_hex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t,
  );
}

/** Deep purple (shadow end of the ramp). */
const AVATAR_PURPLE_DARK = '#581c87';
/** Soft lilac (highlight end of the ramp). */
const AVATAR_PURPLE_LIGHT = '#e9d5ff';

/**
 * Five colors for boring-avatars: purple-only ramp from deep violet to soft lilac.
 * Mid tones follow `--primary` at runtime (expected purple family).
 */
export function publisher_avatar_palette(primary_hex: string): string[] {
  const p = parse_hex(primary_hex);
  if (!p) {
    return [
      AVATAR_PURPLE_DARK,
      '#6b21a8',
      '#7c3aed',
      '#c4b5fd',
      AVATAR_PURPLE_LIGHT,
    ];
  }
  const primary = rgb_to_hex(p.r, p.g, p.b);
  return [
    AVATAR_PURPLE_DARK,
    mix_hex(primary, AVATAR_PURPLE_DARK, 0.38),
    primary,
    mix_hex(primary, AVATAR_PURPLE_LIGHT, 0.48),
    AVATAR_PURPLE_LIGHT,
  ];
}
