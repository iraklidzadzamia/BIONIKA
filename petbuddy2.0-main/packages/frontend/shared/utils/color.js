// Generate a pleasant, readable color (not too dark, not white)
export function randomPleasantHexColor() {
  const hue = Math.floor(Math.random() * 360); // 0-359
  const saturation = Math.floor(60 + Math.random() * 25); // 60-85%
  const lightness = Math.floor(45 + Math.random() * 20); // 45-65%
  return hslToHex(hue, saturation, lightness);
}

export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => {
    const v = Math.round(255 * x)
      .toString(16)
      .padStart(2, "0");
    return v;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function isValidHexColor(hex) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex || "");
}
