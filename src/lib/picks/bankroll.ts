// ─── Gestão de banca ─────────────────────────────────────────────────

export interface BankrollState {
  bankroll: number;
  dailyExposurePct: number;
  stopLossDailyPct: number;
  stopLossWeeklyPct: number;
  kellyFraction: number;
}

const KEY = "pulselab:bankroll";
const DEFAULT: BankrollState = {
  bankroll: 1000,
  dailyExposurePct: 5,
  stopLossDailyPct: 5,
  stopLossWeeklyPct: 15,
  kellyFraction: 0.25,
};

export function loadBankroll(): BankrollState {
  if (typeof localStorage === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<BankrollState>) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveBankroll(s: Partial<BankrollState>): BankrollState {
  const next = { ...loadBankroll(), ...s };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}

/** Stake em unidades (1u = 1% da banca por convenção) — ¼ Kelly, teto 2%. */
export function suggestedStakeUnits(kellyQuarter: number, bankroll: BankrollState): number {
  const pct = Math.min(kellyQuarter, 0.02);
  if (pct <= 0) return 0;
  return +((pct * bankroll.bankroll) / (bankroll.bankroll * 0.01)).toFixed(2);
}

export function dailyExposureUsed(stakesUnits: number[], bankroll: BankrollState): number {
  const total = stakesUnits.reduce((a, b) => a + b, 0);
  const maxUnits =
    ((bankroll.dailyExposurePct / 100) * bankroll.bankroll) / (bankroll.bankroll * 0.01);
  return { usedUnits: total, maxUnits, over: total > maxUnits } as unknown as number;
}

export function exposureSummary(stakesUnits: number[], bankroll: BankrollState) {
  const usedUnits = stakesUnits.reduce((a, b) => a + b, 0);
  const maxUnits = ((bankroll.dailyExposurePct / 100) * bankroll.bankroll * 100) / 100;
  // max em unidades simples: dailyExposurePct% da banca / 1% banca
  const maxU = bankroll.dailyExposurePct;
  return {
    usedUnits,
    maxUnits: maxU,
    remaining: Math.max(0, maxU - usedUnits),
    over: usedUnits > maxU,
    pct: (usedUnits / maxU) * 100,
  };
}
