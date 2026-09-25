---
name: PulseLab Quant
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 12px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system serves institutional-grade quantitative sports traders, value analysts, and algorithmic bettors. It bridges the computational rigor of a Bloomberg terminal with the refined micro-interactions of modern mobile financial products.

The visual direction centers on **High-Contrast Precision & Technical Minimalism**. Rather than mimicking casual consumer sportsbooks with gamified badges and saturated banners, the system treats soccer match predictions as financial derivatives. The emotional response is one of absolute analytical clarity, calculated edge, and zero noise.

### Core Principles
- **Signal-to-Noise Purity:** Interfaces are structured to prioritize market alpha, probability divergence, and Kelly fractional sizing. Decorative clutter is eliminated; data structures drive layout.
- **Epistemic Honesty:** Probabilistic metrics (Brier loss, Poisson distributions, shrinkage adjustments) and fair values are visually decoupled from volatile sportsbook lines via distinct semantic treatments.
- **Instrument Precision:** Dense information density calibrated for rapid visual parsing under live match conditions using high-contrast surface layering, thin mechanical dividers, and monospaced tabular alignment.

## Colors

The palette operates in a default dark color space built from deep obsidian, tactical slate, and luminous emissive markers.

### Palette Architecture
- **Canvas & Surfaces:**
  - `canvas`: `#090D16` (Deep obsidian background)
  - `surface-base`: `#0F172A` (Slate card and container fill)
  - `surface-subtle`: `#162032` (Elevated rows, input fields, inset panels)
  - `surface-overlay`: `#1E293B` (Dropdown menus, modals, tooltips)

- **Structural Borders:**
  - `border-subtle`: `#1E293B` (Base dividers, card perimeters)
  - `border-strong`: `#334155` (Active states, focus rings, header separations)
  - `border-accent`: `#10B981` (Edge indicator markers, selected tabs)

- **Quantitative Semantics:**
  - `primary` (`#10B981` Emerald Neon): Represents model confidence, statistical alpha, +EV opportunities, and positive Kelly recommendations.
  - `secondary` (`#06B6D4` Cyan Matrix): Highlights internal model distributions, fair odds calculations, baseline probabilities, and expected goals (xG).
  - `warning` (`#F59E0B` Amber Shrinkage): Alerts for high-variance data, variance shrinkage, line drift, and injury dampening.
  - `destructive` (`#EF4444` Crimson Risk): Denotes negative expectation (-EV), overvalued public sentiment, line liability, and model degradation.

- **Data Contrasts (Text):**
  - `text-primary`: `#F8FAFC` (Highest contrast for odds values and metric labels)
  - `text-secondary`: `#94A3B8` (Column keys, league identifiers, secondary metadata)
  - `text-muted`: `#64748B` (Timestamps, historical notes, inactive toggles)

### Semantic Odds Token Rules
- **Fair Odds (`1 / p`):** Styled strictly using `secondary` tint overlays or monospaced cyan typography.
- **Market Odds:** Rendered in neutral high-contrast white text (`#F8FAFC`) with subtle opacity shifts reflecting bookmaker margin (vigorish).

## Typography

The type system implements a bifurcated role model:
1. **Interface Hierarchy (Inter):** Applied across global screen titles, team designations, league taxonomy, and analytical narrative readouts. It provides neutral, unadorned structural legibility.
2. **Computational Layer (JetBrains Mono):** Applied strictly to odds quotes, implied probability percentages, EV differentials, Kelly bankroll fractions, and statistical test outputs (Brier score, Poisson λ, z-scores).

### Typographic Execution Guidelines
- Always enable `font-feature-settings: "tnum" 1, "cv05" 1, "cv11" 1` for body text to maintain strict tabular digit tracking across dynamic line changes.
- Monospaced metric figures must align right within numeric data columns to preserve rapid visual scanning across multiple match markets.
- All column metric caps and quantitative headers use `label-xs` with uppercase transformation and a subtle `0.04em` tracking expansion.

## Layout & Spacing

The layout system is tailored for high-density, viewport-constrained mobile devices while scaling systematically to tablet breakdown canvases.

### Mobile Grid & Spatial Architecture
- **Layout Grid:** 4-column fluid system on mobile viewports (<640px) with fixed `margin: 1rem` and `gutter: 0.75rem`. Expands to an 8-column layout on tablet devices (640px - 1024px) and 12-column on desktop analytics dashboards.
- **Rhythm Scale:** Strict 4px base increments. Spacing is intentionally condensed (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 12px) to maximize the vertical volume of actionable match fixtures without user fatigue.
- **Data Table Layout:** Compact rows pinned to a baseline 44px min-height to maintain accessibility compliance while permitting rapid multi-game comparison.
- **Screen Margins:** Horizontal safety margin defaults to `1rem` on mobile, scaling to `1.5rem` on larger viewing frames.

## Elevation & Depth

This system intentionally rejects skeuomorphic drop shadows and heavy multi-stop blurred drop-offs, which cause visual mud on low-luminance displays. Depth is established through **Tonal Layering** accompanied by **Subtle Structural Outlines**.

### Elevation Stack
- **Level 0 (Base Canvas - `#090D16`):** The primary application canvas. Zero elevation.
- **Level 1 (Card & Section Containers - `#0F172A`):** Boundary delineated by a 1px solid stroke in `#1E293B`. No shadow.
- **Level 2 (Active/Hover Cards & Inset Modules - `#162032`):** Boundary highlighted by 1px solid `#334155`. Soft optical elevation created by a localized top edge highlight (`border-t: 1px solid rgba(255, 255, 255, 0.05)`).
- **Level 3 (Sticky Tactical Headers, Sheets, Flyouts - `#1E293B`):** Includes a minimal drop shadow to isolate the overlay from moving data streams: `box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.6)`. Backdrops leverage hardware-accelerated CSS blur: `backdrop-filter: blur(12px)`.

### High-Alpha EV Glowing Edge
For outlier values (+EV > 8%), cards dispense with typical shadows and apply a targeted rim glow using the primary color: `box-shadow: 0 0 0 1px #10B981, 0 0 16px -4px rgba(16, 185, 129, 0.25)`.

## Shapes

The interface embraces a precise, calibrated aesthetic using compact corner radii (`roundedness: 1`). Soft 4px (`rounded-sm`) to 8px (`rounded-lg`) geometry creates a cohesive instrument feel that aligns with trading terminals and technical charts.

### Radius Assignments
- **Chips, Metric Badges, Table Pills:** `0.25rem` (4px). Tightly bounds numeric values without wasting canvas area.
- **Form Inputs, Buttons, Segmented Controls:** `0.375rem` (6px). Provides ergonomic interaction affordance while sustaining angular precision.
- **Data Cards, Probability Panels, Modal Sheets:** `0.5rem` (8px). Delivers structural cohesion without ballooning outer container silhouettes.
- **Continuous Geometry:** Avoid full circular pill radii for data chips. Metrics retain mechanical rectangular foundations to enhance tabular horizontal scanlines.

## Components

### Buttons & Action Triggers
- **Primary (+EV Action):** Solid `#10B981` background, `#090D16` high-contrast bold typography (`label-md`). Hover/Active state shifts to `#059669`.
- **Secondary / Ghost Action:** Deep `#0F172A` background with 1px border in `#334155`. White typography with subtle cyan hover highlight.
- **Quick-Wager Odds Button:** Dual-tier button containing Market Odds top-aligned in `label-md` and implied probability bottom-aligned in muted `label-xs`.

### Badges & Analytical Chips
- **+EV Edge Badge:** Background `#10B981` at 10% opacity, border 1px solid `#10B981`, text `#10B981` in `label-sm`. Prefixed with directional triangle delta (`▲ +4.2%`).
- **Fair Value Badge:** Background `#06B6D4` at 10% opacity, border 1px solid `#06B6D4`, text `#06B6D4`. Displays theoretical mathematical price (`FV: 2.14`).
- **Shrinkage / High Variance Badge:** Background `#F59E0B` at 10% opacity, text `#F59E0B`. Warns of low sample size or injury volatility.

### Data Tables & Odds Matrices
- **Column Headers:** Monospaced, uppercase, right-aligned for numeric fields (`MATCH`, `P(WIN)`, `FAIR`, `BEST MKT`, `EDGE`, `KELLY`).
- **Row Styling:** Subtle alternating zebra fill using `#090D16` and `#0F172A`. Separated by 1px bottom border in `#1E293B`.
- **Divergence Heat Cells:** Edge columns tint dynamically; green background tint scales in luminosity as EV percentage increases from 0% to +10%.

### Input Fields & Sliders
- **Bankroll / Sizing Inputs:** Inset container `#162032` with border `#1E293B`. Text renders in `label-md` JetBrains Mono with absolute unit affix (`$`, `u`, or `%`).
- **Fractional Kelly Slider:** Flat horizontal track (`#1E293B`, 4px height) with active fill in `#10B981` and a precise square thumb with rounded corners (12px × 12px, `#F8FAFC`).

### Match Analytical Card
- Structured modular card with a persistent header: League flag, Match minute/date, and live Brier score confidence indicator.
- Internal split-screen layout comparing Poisson probability projections directly against live consensus sportsbook book pricing.