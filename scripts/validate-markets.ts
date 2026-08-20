#!/usr/bin/env bun
/**
 * Fase 1 — Validação offline de mercados derivados.
 * Uso: bun scripts/validate-markets.ts
 *
 * Valida contra resultados reais (janela de 30 dias fechada):
 *   A) Escanteios: Poisson ajustado às linhas 8.5/9.5/10.5 -> P(over 5.5/6.5/7.5),
 *      comparado com contagem real (corner_kicks de /events/{id}/stats/).
 *   B) Gols: Poisson ajustado às linhas 1.5/2.5/3.5 -> Under 0.5 (0-0);
 *      xG como fonte alternativa; calibração das linhas que a API já entrega.
 *   C) BTTS e corners 8.5+ (mercados diretos da API) como linha de base.
 *   D) Paisagem de odds consensus (total_corners) por linha — onde está o valor.
 */

import { readFileSync } from "node:fs";

const BASE = "https://sports.bzzoiro.com";
const PAGE = 200;
const MAX_PAGES = 6;
const MAX_STATS = 150; // teto de chamadas /stats/ por execução

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadToken(): string {
  const candidates: (string | undefined)[] = [];
  try {
    const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const line = env.split("\n").find((l) => l.startsWith("BZZOIRO_TOKEN="));
    if (line) candidates.push(line.slice("BZZOIRO_TOKEN=".length).trim());
  } catch {
    /* fallback abaixo */
  }
  candidates.push(process.env.BZZOIRO_TOKEN);
  const raw = candidates.find((c): c is string => !!c);
  if (!raw) throw new Error("BZZOIRO_TOKEN ausente (.env ou environment)");
  // .env pode guardar o valor entre aspas (ex: "token"); tira antes de usar.
  return raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
}

const token = loadToken();

async function api<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${path}: ${body.slice(0, 160)}`);
  }
  const json = (await res.json()) as { detail?: unknown; results?: unknown };
  if (typeof json?.detail === "string" && !("results" in json)) {
    throw new Error(`${path}: ${json.detail}`);
  }
  return json as T;
}

async function fetchList<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const q = new URLSearchParams({ ...params, limit: String(PAGE), offset: String(page * PAGE) });
    const json = (await api(`/api/v2/${path}?${q}`)) as { results?: T[] } | T[];
    const rows = Array.isArray(json) ? json : (json.results ?? []);
    out.push(...rows);
    if (rows.length < PAGE) break;
    await sleep(150);
  }
  return out;
}

// -------- Distribuição Poisson --------

function poissonCdf(lambda: number, k: number): number {
  // P(X <= k), X ~ Poisson(lambda), via PMF iterativo (estável p/ lambda <= 25)
  let sum = 0;
  let term = Math.exp(-lambda);
  for (let i = 0; i <= k; i++) {
    sum += term;
    term *= lambda / (i + 1);
  }
  return sum;
}

/** P(X > k) = P(over (k+0.5)) para linha inteira k. */
const survival = (lambda: number, k: number) => 1 - poissonCdf(lambda, k);

/** Ajusta lambda minimizando SSE entre survival(k; λ) e probs (0-100) das linhas. */
function fitLambda(lines: number[], probs: number[]): number | null {
  let best: { lam: number; sse: number } | null = null;
  for (let lam = 0.5; lam <= 25.01; lam += 0.05) {
    let sse = 0;
    for (let i = 0; i < lines.length; i++) {
      const d = survival(lam, lines[i]) - probs[i] / 100;
      sse += d * d;
    }
    if (!best || sse < best.sse) best = { lam, sse };
  }
  return best ? best.lam : null;
}

function statNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.value === "number") return o.value;
    if (typeof o.total === "number") return o.total;
    if (typeof o.actual === "number") return o.actual;
  }
  return NaN;
}

function pct(x: number, n: number): string {
  return n > 0 ? `${((x / n) * 100).toFixed(1)}%` : "—";
}

function log(...args: unknown[]) {
  console.log(...args);
}

interface Prediction {
  id: number;
  created_at?: string;
  event?: { id: number };
  markets?: {
    corners?: { prob_over_85?: number; prob_over_95?: number; prob_over_105?: number };
    over_under?: { prob_over_15?: number; prob_over_25?: number; prob_over_35?: number };
    expected_goals?: { home?: number; away?: number };
    btts?: { prob_yes?: number };
  };
}

interface SoccerEvent {
  id: number;
  home_score?: number;
  away_score?: number;
}

interface StatsSide {
  corner_kicks?: unknown;
}

interface StatsResponse {
  stats?: { home?: StatsSide; away?: StatsSide };
}

interface OddsRow {
  line?: number;
  outcome?: string;
  implied_probability?: number;
  decimal_odds?: number;
}

// -------- Coleta --------

async function main() {
  const dateFrom = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const dateTo = new Date(Date.now() - 1 * 86_400_000).toISOString().slice(0, 10);
  log(`Janela: ${dateFrom}..${dateTo} UTC`);

  const preds = await fetchList<Prediction>("predictions/", {
    date_from: dateFrom,
    date_to: dateTo,
    status: "all",
  });
  log(`predictions no recorte: ${preds.length}`);

  const events = await fetchList<SoccerEvent>("events/", {
    date_from: dateFrom,
    date_to: dateTo,
    status: "finished",
  });
  const scoreById = new Map<number, { h: number; a: number }>();
  for (const e of events) {
    if (typeof e.home_score === "number" && typeof e.away_score === "number") {
      scoreById.set(e.id, { h: e.home_score, a: e.away_score });
    }
  }
  log(`events finished: ${events.length} (com placar: ${scoreById.size})`);

  const matched = preds.filter((p) => scoreById.has(p.event?.id));
  log(`predictions com resultado: ${matched.length}`);

  // 1 predição por evento (a mais recente vence)
  const byEvent = new Map<number, Prediction>();
  for (const p of matched) {
    const eid = p.event?.id;
    if (eid == null) continue;
    const cur = byEvent.get(eid);
    if (!cur || (p.created_at ?? "") > (cur.created_at ?? "")) byEvent.set(eid, p);
  }
  const picks = [...byEvent.values()];
  log(`amostra deduplicada: ${picks.length}`);

  // corners reais via /stats/
  const cornersById = new Map<number, number>();
  for (const id of [...byEvent.keys()].slice(0, MAX_STATS)) {
    try {
      const j = await api<StatsResponse>(`/api/v2/events/${id}/stats/`);
      const h = statNum(j?.stats?.home?.corner_kicks);
      const a = statNum(j?.stats?.away?.corner_kicks);
      if (!Number.isNaN(h) && !Number.isNaN(a)) cornersById.set(id, h + a);
    } catch {
      /* sem stats -> descarta corners deste jogo */
    }
    await sleep(120);
  }
  log(`jogos com corners reais: ${cornersById.size}`);

  // -------- A) Escanteios --------

  const cornerRows: {
    p55: number;
    p65: number;
    p75: number;
    p85: number;
    p95: number;
    p105: number;
    total: number;
  }[] = [];

  for (const p of picks) {
    const c = p.markets?.corners;
    const p85 = c?.prob_over_85;
    const p95 = c?.prob_over_95;
    const p105 = c?.prob_over_105;
    const total = cornersById.get(p.event.id);
    if (
      typeof p85 !== "number" ||
      typeof p95 !== "number" ||
      typeof p105 !== "number" ||
      total === undefined
    ) {
      continue;
    }
    const lam = fitLambda([8, 9, 10], [p85, p95, p105]);
    if (lam == null) continue;
    cornerRows.push({
      p55: survival(lam, 5) * 100,
      p65: survival(lam, 6) * 100,
      p75: survival(lam, 7) * 100,
      p85,
      p95,
      p105,
      total,
    });
  }

  log("\n=== A) ESCANTEIOS — Poisson ajustado às linhas 8.5/9.5/10.5 ===");
  log(`amostra com corners reais: ${cornerRows.length}`);

  for (const [line, key] of [
    ["5.5", "p55"],
    ["6.5", "p65"],
    ["7.5", "p75"],
    ["8.5", "p85"], // linha da própria API — controle
    ["9.5", "p95"],
    ["10.5", "p105"],
  ] as const) {
    const overTh = Number(line) + 0.5 + 0.0001; // over line.5 ⇔ total >= line+1
    const predsOver = cornerRows.map((r) => r[key]);
    const base = cornerRows.filter((r) => r.total >= Math.ceil(overTh)).length;
    const picksOver = cornerRows.filter((r) => predsOver[cornerRows.indexOf(r)] >= 50).length;
    const hits = cornerRows.filter(
      (r, i) => predsOver[i] >= 50 && r.total >= Math.ceil(overTh),
    ).length;
    const mean = predsOver.reduce((a, b) => a + b, 0) / (predsOver.length || 1);
    log(
      `  over ${line}: n=${cornerRows.length} probMédia=${mean.toFixed(1)}% base=${pct(base, cornerRows.length)} picksOver=${picksOver} hits=${hits} hitRate=${pct(hits, picksOver)}`,
    );
  }

  // calibração: média prevista vs taxa observada por linha
  log("\n  Calibração (prob média vs taxa real de over):");
  for (const [line, key] of [
    ["5.5", "p55"],
    ["6.5", "p65"],
    ["7.5", "p75"],
    ["8.5", "p85"],
    ["9.5", "p95"],
    ["10.5", "p105"],
  ] as const) {
    const overTh = Number(line) + 1;
    const mean = cornerRows.reduce((a, r) => a + r[key], 0) / (cornerRows.length || 1);
    const obs = cornerRows.filter((r) => r.total >= overTh).length / (cornerRows.length || 1);
    log(`  over ${line}: prevista=${mean.toFixed(1)}% observada=${(obs * 100).toFixed(1)}%`);
  }

  // -------- B) Gols --------

  const goalRows: {
    lamModel: number;
    lamXg: number;
    under05Model: number;
    under05Xg: number;
    p15: number;
    p25: number;
    p35: number;
    bttsYes: number;
    goals: number;
    home: number;
    away: number;
  }[] = [];

  for (const p of picks) {
    const sc = scoreById.get(p.event.id);
    const ou = p.markets?.over_under;
    const xg = p.markets?.expected_goals;
    if (!sc || !ou) continue;
    const p15 = ou.prob_over_15;
    const p25 = ou.prob_over_25;
    const p35 = ou.prob_over_35;
    if (typeof p15 !== "number" || typeof p25 !== "number" || typeof p35 !== "number") continue;
    const lamModel = fitLambda([1, 2, 3], [p15, p25, p35]);
    const xgTotal =
      typeof xg?.home === "number" && typeof xg?.away === "number" ? xg.home + xg.away : null;
    if (lamModel == null) continue;
    goalRows.push({
      lamModel,
      lamXg: xgTotal ?? lamModel,
      under05Model: Math.exp(-lamModel) * 100,
      under05Xg: xgTotal != null ? Math.exp(-xgTotal) * 100 : NaN,
      p15,
      p25,
      p35,
      bttsYes: p.markets?.btts?.prob_yes,
      goals: sc.h + sc.a,
      home: sc.h,
      away: sc.a,
    });
  }

  log(`\n=== B) GOLS — Poisson ajustado às linhas 1.5/2.5/3.5 ===`);
  log(`amostra com placar: ${goalRows.length}`);

  const zeroZero = goalRows.filter((r) => r.goals === 0).length;
  log(`taxa real de 0-0: ${pct(zeroZero, goalRows.length)} (n=${zeroZero}/${goalRows.length})`);

  const meanU05Model = goalRows.reduce((a, r) => a + r.under05Model, 0) / goalRows.length;
  const meanU05Xg =
    goalRows.reduce((a, r) => a + (Number.isNaN(r.under05Xg) ? 0 : r.under05Xg), 0) /
    goalRows.length;
  log(
    `P(under 0.5) média — λ do modelo: ${meanU05Model.toFixed(2)}% | λ xG: ${meanU05Xg.toFixed(2)}%`,
  );

  for (const [line, key] of [
    ["1.5", "p15"],
    ["2.5", "p25"],
    ["3.5", "p35"],
  ] as const) {
    const overTh = Number(line) + 1;
    const picksOver = goalRows.filter((r) => r[key] >= 50).length;
    const hits = goalRows.filter((r) => r[key] >= 50 && r.goals >= overTh).length;
    const base = goalRows.filter((r) => r.goals >= overTh).length;
    const mean = goalRows.reduce((a, r) => a + r[key], 0) / goalRows.length;
    log(
      `  over ${line} (modelo direto): n=${goalRows.length} probMédia=${mean.toFixed(1)}% base=${pct(base, goalRows.length)} picksOver=${picksOver} hitRate=${pct(hits, picksOver)}`,
    );
  }

  const btts = goalRows.filter((r) => typeof r.bttsYes === "number");
  const bttsPicks = btts.filter((r) => r.bttsYes >= 50).length;
  const bttsHits = btts.filter((r) => r.bttsYes >= 50 && r.home > 0 && r.away > 0).length;
  const bttsBase = btts.filter((r) => r.home > 0 && r.away > 0).length;
  log(
    `\n=== C) BTTS (controle) ===\n  n=${btts.length} picksYes=${bttsPicks} hits=${bttsHits} hitRate=${pct(bttsHits, bttsPicks)} base=${pct(bttsBase, btts.length)}`,
  );

  // -------- D) Paisagem de odds consensus total_corners --------

  log("\n=== D) ODDS CONSENSUS total_corners (amostra atual) ===");
  try {
    const odds: OddsRow[] = [];
    for (let page = 0; page < 3; page++) {
      const q = new URLSearchParams({
        market: "total_corners",
        limit: "200",
        offset: String(page * 200),
      });
      const j = await api<{ results?: OddsRow[] }>(`/api/v2/odds/?${q}`);
      const rows = j.results ?? [];
      odds.push(...rows);
      if (rows.length < 200) break;
      await sleep(200);
    }
    const byLine = new Map<number, { over: number[]; under: number[] }>();
    for (const o of odds) {
      if (o.line == null) continue;
      const bucket = byLine.get(o.line) ?? { over: [], under: [] };
      if (o.outcome === "over") bucket.over.push(o.implied_probability ?? 1 / o.decimal_odds);
      if (o.outcome === "under") bucket.under.push(o.implied_probability ?? 1 / o.decimal_odds);
      byLine.set(o.line, bucket);
    }
    for (const [line, b] of [...byLine.entries()].sort((x, y) => x[0] - y[0])) {
      const med = (arr: number[]) => {
        if (arr.length === 0) return NaN;
        const s = [...arr].sort((a, b) => a - b);
        return s[Math.floor(s.length / 2)];
      };
      log(
        `  linha ${String(line).padStart(4)}: overImplied mediana=${(med(b.over) * 100).toFixed(1)}% (n=${b.over.length}) | under mediana=${(med(b.under) * 100).toFixed(1)}% (n=${b.under.length})`,
      );
    }
  } catch (e) {
    log("  odds indisponíveis:", e instanceof Error ? e.message : String(e));
  }

  log("\nFim da validação.");
}

main().catch((e) => {
  console.error("Falha:", e instanceof Error ? e.message : e);
  process.exit(1);
});
