/** Substituto do escudo: iniciais + cor estável derivada do nome do time. */
export function teamMonogram(name: string): { initials: string; hue: number } {
  const clean = (name ?? "").trim();
  const words = clean
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(fc|sc|cf|ac|afc|de|do|da|of|the)$/i.test(w));

  let initials: string;
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    initials = words[0].slice(0, 3).toUpperCase();
  } else {
    initials = "?";
  }

  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) % 360;
  return { initials, hue: hash };
}
