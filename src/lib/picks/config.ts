export interface PickConfig {
  minEv: number;
  minEdge: number;
  minProb: number;
  minOdd: number;
  maxOdd: number;
  minOddTrap: number;
  maxModelDelta: number;
  kellyFraction: number;
  bankroll: number;
  dailyExposurePct: number;
  maxPicksPerDay: number;
  parlaysPerProfile: number;
}

export const PICK_CONFIG: PickConfig = {
  minEv: 0.04,
  minEdge: 0.03,
  minProb: 0.3,
  minOdd: 1.4,
  maxOdd: 4.5,
  minOddTrap: 1.25,
  maxModelDelta: 0.15,
  kellyFraction: 0.25,
  bankroll: 1000,
  dailyExposurePct: 5,
  maxPicksPerDay: 10,
  parlaysPerProfile: 1,
};

const STORAGE_KEY = "pulselab:picks-config";

export function loadPickConfig(): PickConfig {
  if (typeof localStorage === "undefined") return { ...PICK_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...PICK_CONFIG };
    return { ...PICK_CONFIG, ...(JSON.parse(raw) as Partial<PickConfig>) };
  } catch {
    return { ...PICK_CONFIG };
  }
}

export function savePickConfig(cfg: Partial<PickConfig>): PickConfig {
  const next = { ...PICK_CONFIG, ...loadPickConfig(), ...cfg };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage cheio
    }
  }
  return next;
}
