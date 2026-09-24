// Parte5 — backtest offline a partir do pick_ledger (Supabase service role).
// Sem ledger resolvido → imprime aviso e sai (não inventa números).

interface Row {
  pick_kind: string;
  market: string;
  probability: number;
  odd_at_pick: number;
  closing_odd: number | null;
  ev: number;
  edge: number;
  outcome: boolean | null;
  void: boolean;
  stake_units: number | null;
  confidence: string;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function brier(rows: Array<{ p: number; y: number }>): number {
  if (!rows.length) return NaN;
  return mean(rows.map((r) => (r.p - r.y) ** 2));
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const res = await fetch(`${url}/rest/v1/pick_ledger?select=*&limit=2000&order=created_at.asc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.error(`pick_ledger HTTP ${res.status} — rode migrações + cron snapshot`);
    process.exit(1);
  }
  const rows = (await res.json()) as Row[];
  const resolved = rows.filter((r) => !r.void && r.outcome != null);
  if (!resolved.length) {
    console.log("Ledger vazio ou sem outcomes. Sem backtest real — nada a reportar.");
    process.exit(0);
  }

  let staked = 0;
  let returned = 0;
  for (const r of resolved) {
    const stake = r.stake_units ?? 1;
    staked += stake;
    returned += r.outcome ? stake * r.odd_at_pick : 0;
  }
  const roi = staked > 0 ? returned / staked - 1 : 0;

  const singles = resolved.filter((r) => r.pick_kind === "single");
  const parlays = resolved.filter((r) => r.pick_kind === "parlay");

  const br = brier(resolved.map((r) => ({ p: r.probability, y: r.outcome ? 1 : 0 })));
  const hit = resolved.filter((r) => r.outcome).length / resolved.length;

  const clv = resolved
    .filter((r) => r.closing_odd != null && r.closing_odd > 1)
    .map((r) => r.odd_at_pick / (r.closing_odd as number) - 1);
  const clvMean = clv.length ? mean(clv) : null;

  const byMarket = new Map<string, { n: number; wins: number; pnl: number }>();
  for (const r of resolved) {
    const m = byMarket.get(r.market) ?? { n: 0, wins: 0, pnl: 0 };
    const stake = r.stake_units ?? 1;
    m.n++;
    if (r.outcome) m.wins++;
    m.pnl += r.outcome ? stake * (r.odd_at_pick - 1) : -stake;
    byMarket.set(r.market, m);
  }

  console.log("── Backtest pick_ledger ──");
  console.log(
    `n resolvido: ${resolved.length} (singles ${singles.length}, parlays ${parlays.length})`,
  );
  console.log(`hit rate: ${(hit * 100).toFixed(1)}%`);
  console.log(`ROI flat (stake 1u): ${(roi * 100).toFixed(2)}%`);
  console.log(`Brier: ${br.toFixed(4)}`);
  console.log(
    clvMean != null
      ? `CLV médio: ${(clvMean * 100).toFixed(2)}% (n=${clv.length})`
      : "CLV: sem closing odds",
  );
  console.log("por mercado:");
  for (const [m, s] of [...byMarket].sort((a, b) => b[1].n - a[1].n)) {
    console.log(
      `  ${m}: n=${s.n} hit=${((s.wins / s.n) * 100).toFixed(1)}% pnl=${s.pnl.toFixed(2)}u`,
    );
  }

  console.log("\nBaselines (mesmo ledger):");
  const favorite = resolved.filter((r) => r.market === "1X2_HOME" || r.market === "1X2_AWAY");
  // baseline cego: sempre stake 1 no evento com maior odd do ledger 1X2 (aprox: home)
  const fh = resolved.filter((r) => r.market === "1X2_HOME");
  if (fh.length) {
    const fs = fh.length;
    const fr = fh.reduce((a, r) => a + (r.outcome ? r.odd_at_pick : 0), 0);
    console.log(`  always-home: n=${fs} ROI=${((fr / fs - 1) * 100).toFixed(2)}%`);
  }
  const fd = resolved.filter((r) => r.market === "DRAW");
  if (fd.length) {
    const fs = fd.length;
    const fr = fd.reduce((a, r) => a + (r.outcome ? r.odd_at_pick : 0), 0);
    console.log(`  always-draw: n=${fs} ROI=${((fr / fs - 1) * 100).toFixed(2)}%`);
  }
  void favorite;
  console.log(
    "\nSem odd histórica de mercado (Bzzoiro free) → não dá pValue/CLV completo. Sem odd combinada histórica → parlays só product/MC local.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
