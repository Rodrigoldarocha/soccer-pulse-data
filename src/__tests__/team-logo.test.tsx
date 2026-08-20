// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TeamLogo } from "../components/TeamLogo";

describe("TeamLogo (spec 008)", () => {
  // AC-001: teamId válido → <img> com src do proxy e alt
  it("renders img with proxy src and alt when teamId is valid", () => {
    render(<TeamLogo teamId={7} teamName="Flamengo" size={48} />);
    const img = screen.getByAltText("Flamengo crest");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://sports.bzzoiro.com/img/team/7/?bg=transparent");
    expect(img).toHaveAttribute("width", "48");
    expect(img).toHaveAttribute("height", "48");
  });

  // AC-001/AC-004: loading lazy + dimensões do size prop
  it("uses lazy loading and size prop dimensions", () => {
    render(<TeamLogo teamId={1} teamName="Time" size={56} />);
    const img = screen.getByAltText("Time crest");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("width", "56");
    expect(img).toHaveAttribute("height", "56");
  });

  // AC-002: teamId null → fallback com iniciais e aria-label
  it("renders initials fallback with aria-label when teamId is null", () => {
    render(<TeamLogo teamId={null} teamName="São Paulo" size={48} />);
    const fallback = screen.getByLabelText("São Paulo");
    expect(fallback).toBeInTheDocument();
    expect(fallback.textContent).toBe("SP");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  // AC-003: onError do img → fallback de iniciais
  it("falls back to initials when image load errors", () => {
    render(<TeamLogo teamId={7} teamName="Vasco" size={48} />);
    const img = screen.getByAltText("Vasco crest");
    fireEvent.error(img);
    const fallback = screen.getByLabelText("Vasco");
    expect(fallback).toBeInTheDocument();
    expect(fallback.textContent).toBe("V");
  });

  // AC-004: font-size do fallback proporcional ao size (size * 0.32)
  it("sizes fallback font proportionally to size", () => {
    render(<TeamLogo teamId={null} teamName="Fluminense" size={48} />);
    const fallback = screen.getByLabelText("Fluminense");
    expect(fallback).toHaveStyle({ fontSize: "15.36px" });
    expect(fallback).toHaveStyle({ width: "48px", height: "48px" });
  });

  // AC-005: cores só via tokens semânticos, sem hardcode inline
  it("uses semantic token classes, no inline color", () => {
    render(<TeamLogo teamId={null} teamName="Botafogo" size={48} />);
    const fallback = screen.getByLabelText("Botafogo");
    expect(fallback).toHaveClass("bg-muted", "text-muted-foreground");
    expect(fallback.getAttribute("style")).not.toMatch(/color|background/i);
  });

  // AC-006: contraste bg-muted vs text-muted-foreground ≥ 4.5:1 (WCAG AA)
  it("meets WCAG AA contrast for fallback tokens", () => {
    // tokens lidos do :root real em src/styles.css — quebra se token mudar
    const css = readFileSync(new URL("src/styles.css", `file://${process.cwd()}/`), "utf8");
    const root = css.match(/:root\s*\{([\s\S]*?)\}/);
    if (!root) throw new Error(":root block not found in styles.css");
    const token = (name: string) => {
      const m = root[1].match(new RegExp(`--${name}:\\s*([^;]+);`));
      if (!m) throw new Error(`--${name} not found in :root`);
      return m[1].trim();
    };
    const bg = parseOklch(token("muted"));
    const fg = parseOklch(token("muted-foreground"));
    expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
  });
});

// --- helpers (oklch → sRGB → WCAG relative luminance) ---

type RGB = { r: number; g: number; b: number };

function parseOklch(css: string): RGB {
  const m = css.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!m) throw new Error(`invalid oklch: ${css}`);
  const L = Number(m[1]);
  const C = Number(m[2]);
  const H = (Number(m[3]) * Math.PI) / 180;

  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const mm = m_ ** 3;
  const s = s_ ** 3;

  return {
    r: clamp(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s),
    g: clamp(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s),
    b: clamp(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s),
  };
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance({ r, g, b }: RGB): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(a: RGB, b: RGB): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
