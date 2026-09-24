// ─── Odds providers ──────────────────────────────────────────────────
// Bzzoiro Sports API v2 oferece odds reais:
//   GET /events/{id}/odds/  → consenso 11 mercados (free tier)
//   GET /odds/              → feed por market/outcome/bookmaker
// Provedores plugáveis: bzzoiro (primário) → odds-api (opcional) → manual (Supabase).
// Sem odd real: odds = null. NUNCA derivar de 1/p.

import { apiJson } from "./thesportsdb";

export type OddsField =
  | "home"
  | "draw"
  | "away"
  | "over15"
  | "over25"
  | "over35"
  | "under15"
  | "under25"
  | "under35"
  | "btts"
  | "bttsNo"
  | "doubleChance1X"
  | "doubleChanceX2"
  | "doubleChance12";

export type EventOdds = Partial<Record<OddsField, number>> & {
  bookmaker?: string;
  updatedAt?: string;
  source?: "bzzoiro" | "odds-api" | "manual";
};

export interface OddsProvider {
  readonly name: string;
  fetchOddsBatch(from: string, to: string, eventIds: string[]): Promise<Map<string, EventOdds>>;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 1;
const num = (v: unknown): number | null => (isNum(v) ? +(+v).toFixed(2) : null);

interface BzzoiroEventOdds {
  event_id?: number;
  odds?: Record<string, unknown> | null;
  last_update_at?: string;
}

interface BzzoiroOddsRow {
  event_id?: number;
  market?: string;
  outcome?: string;
  decimal_odds?: number;
  bookmaker_slug?: string;
  updated_at?: string;
  line?: number | null;
}

interface Paginated<T> {
  count?: number;
  next?: string | null;
  results?: T[];
}

function fromEventOddsPayload(row: BzzoiroEventOdds): EventOdds {
  const o = row.odds ?? {};
  const out: EventOdds = {
    home: num(o.home_win),
    draw: num(o.draw),
    away: num(o.away_win),
    over15: num(o.over_15_goals),
    over25: num(o.over_25_goals),
    over35: num(o.over_35_goals),
    under15: num(o.under_15_goals),
    under25: num(o.under_25_goals),
    under35: num(o.under_35_goals),
    btts: num(o.btts_yes),
    bttsNo: num(o.btts_no),
    bookmaker: "consensus",
    updatedAt: row.last_update_at,
    source: "bzzoiro",
  };
  return out;
}

function feedKey(
  market: string | undefined,
  outcome: string | undefined,
  line?: number | null,
): OddsField | null {
  const m = (market ?? "").toLowerCase();
  const o = (outcome ?? "").toLowerCase();
  if (m === "1x2") {
    if (o === "home") return "home";
    if (o === "draw") return "draw";
    if (o === "away") return "away";
  }
  if (m === "over_under") {
    const ln = line ?? 2.5;
    if (ln === 1.5) return o === "over" ? "over15" : "under15";
    if (ln === 2.5) return o === "over" ? "over25" : "under25";
    if (ln === 3.5) return o === "over" ? "over35" : "under35";
  }
  if (m === "btts") return o === "yes" ? "btts" : o === "no" ? "bttsNo" : null;
  if (m === "double_chance") {
    if (o === "1x") return "doubleChance1X";
    if (o === "x2") return "doubleChanceX2";
    if (o === "12") return "doubleChance12";
  }
  return null;
}

/** Consenso por evento: 1 chamada /jogo. Usado como fallback pontual. */
async function fetchEventOdds(eventId: string): Promise<EventOdds | null> {
  const res = await apiJson<BzzoiroEventOdds>(`events/${eventId}/odds/`, { ttlMs: 10 * 60 * 1000 });
  if (!res.success || !res.data?.odds) return null;
  return fromEventOddsPayload(res.data);
}

const FEED_MARKETS = ["1x2", "over_under", "btts", "double_chance"] as const;

/**
 * Lote paginado pelo feed `/odds/`. Filtra por mercado; free tier = consenso.
 * Cache 10 min no apiJson.
 */
class BzzoiroOddsProvider implements OddsProvider {
  readonly name = "bzzoiro";

  async fetchOddsBatch(
    _from: string,
    _to: string,
    eventIds: string[],
  ): Promise<Map<string, EventOdds>> {
    const out = new Map<string, EventOdds>();
    const wanted = new Set(eventIds.map(String));
    const LIMIT = 200;

    // IDs conhecidos → consenso por evento (1 call/jogo). Feed paginado é
    // lento demais (4 mercados × N páginas + gap 350ms) e estoura o timeout
    // do pipeline antes de achar os IDs.
    if (eventIds.length > 0) {
      const direct = eventIds.slice(0, 40);
      for (const id of direct) {
        const one = await fetchEventOdds(id);
        if (one) out.set(id, one);
      }
      if (eventIds.every((id) => out.has(id))) return out;
    }

    for (const market of FEED_MARKETS) {
      let offset = 0;
      for (let page = 0; page < 8; page++) {
        const res = await apiJson<Paginated<BzzoiroOddsRow> | BzzoiroOddsRow[]>(
          `odds/?market=${market}&limit=${LIMIT}&offset=${offset}`,
          { ttlMs: 10 * 60 * 1000 },
        );
        if (!res.success) break;
        const rows = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        if (rows.length === 0) break;
        for (const row of rows) {
          const eid = String(row.event_id ?? "");
          if (wanted.size > 0 && !wanted.has(eid)) continue;
          const field = feedKey(row.market, row.outcome, row.line);
          if (!field || !isNum(row.decimal_odds)) continue;
          const cur = out.get(eid) ?? {
            source: "bzzoiro" as const,
            bookmaker: row.bookmaker_slug ?? "consensus",
          };
          const existing = cur[field];
          const next = +(+row.decimal_odds).toFixed(2);
          // melhor odd entre casas (maior decimal)
          if (existing == null || next > existing) cur[field] = next;
          if (row.updated_at) cur.updatedAt = row.updated_at;
          out.set(eid, cur);
        }
        const nextUrl = Array.isArray(res.data) ? null : (res.data?.next ?? null);
        if (!nextUrl && rows.length < LIMIT) break;
        offset += LIMIT;
      }
    }

    // Feed não achou tudo → completa com consenso por evento
    const missing = eventIds.filter((id) => !out.has(id)).slice(0, 40);
    for (const id of missing) {
      const one = await fetchEventOdds(id);
      if (one) out.set(id, one);
    }
    return out;
  }
}

/** The Odds API (opcional, ODDS_API_KEY). Formato v4 events. */
class OddsApiProvider implements OddsProvider {
  readonly name = "odds-api";
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  async fetchOddsBatch(
    from: string,
    _to: string,
    _eventIds: string[],
  ): Promise<Map<string, EventOdds>> {
    const out = new Map<string, EventOdds>();
    const url = `https://api.the-odds-api.com/v4/sports/soccer_upcoming/odds/?apiKey=${this.key}&regions=eu&markets=h2h,totals,btts,double_chance&oddsFormat=decimal&date=${from}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return out;
      const rows = (await res.json()) as Array<{
        id?: string;
        commence_time?: string;
        bookmakers?: Array<{
          markets?: Array<{ key: string; outcomes?: Array<{ name: string; price: number }> }>;
        }>;
      }>;
      for (const ev of rows) {
        // correlaciona por id Bzzoiro se vier em `id`, senão ignora
        const eid = ev.id ? String(ev.id) : "";
        if (!eid) continue;
        const odds: EventOdds = { source: "odds-api" };
        for (const bk of ev.bookmakers ?? []) {
          for (const mk of bk.markets ?? []) {
            for (const oc of mk.outcomes ?? []) {
              if (!isNum(oc.price)) continue;
              const price = +(+oc.price).toFixed(2);
              if (mk.key === "h2h") {
                if (/home|draw/i.test(oc.name) && (odds.home ?? 0) < price) odds.home = price;
                else if (/draw/i.test(oc.name) && (odds.draw ?? 0) < price) odds.draw = price;
                else if (/away/i.test(oc.name) && (odds.away ?? 0) < price) odds.away = price;
              }
            }
          }
        }
        if (odds.home || odds.draw || odds.away) out.set(eid, odds);
      }
    } catch {
      // degrada silenciosamente
    }
    return out;
  }
}

/** Odds manuais persistidas no Supabase (tabela manual_odds via api_cache key). */
class ManualOddsProvider implements OddsProvider {
  readonly name = "manual";

  async fetchOddsBatch(
    _from: string,
    _to: string,
    eventIds: string[],
  ): Promise<Map<string, EventOdds>> {
    const out = new Map<string, EventOdds>();
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return out;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("api_cache")
        .select("key, payload")
        .like("key", "manual_odds:%");
      if (!data) return out;
      for (const row of data) {
        const eid = String(row.key).replace("manual_odds:", "");
        if (eventIds.length && !eventIds.includes(eid)) continue;
        out.set(eid, { ...(row.payload as EventOdds), source: "manual" });
      }
    } catch {
      // sem supabase
    }
    return out;
  }
}

function buildProviders(): OddsProvider[] {
  const list: OddsProvider[] = [new BzzoiroOddsProvider()];
  const oddsKey = process.env.ODDS_API_KEY;
  if (oddsKey) list.push(new OddsApiProvider(oddsKey));
  list.push(new ManualOddsProvider());
  return list;
}

let providers: OddsProvider[] | null = null;

export function getOddsProviders(): OddsProvider[] {
  if (!providers) providers = buildProviders();
  return providers;
}

export function resetOddsProviders(): void {
  providers = null;
}

/** Modo global: true se alguma odd real foi encontrada em alguma chamada recente. */
let oddsModeAvailable = true;
export function getOddsMode(): "market" | "probability" {
  return oddsModeAvailable ? "market" : "probability";
}
export function setOddsModeAvailable(v: boolean): void {
  oddsModeAvailable = v;
}

/**
 * Busca odds em lote (uma passagem por provedor, cache 10 min).
 * Retorna apenas eventos com ≥1 odd real.
 */
export async function fetchOddsBatch(
  from: string,
  to: string,
  eventIds: string[],
): Promise<Map<string, EventOdds>> {
  const merged = new Map<string, EventOdds>();
  let any = false;
  for (const p of getOddsProviders()) {
    try {
      const part = await p.fetchOddsBatch(
        from,
        to,
        eventIds.filter((id) => !merged.has(id)),
      );
      for (const [k, v] of part) {
        const cur = merged.get(k) ?? {};
        merged.set(k, {
          ...cur,
          ...Object.fromEntries(Object.entries(v).filter(([, val]) => val != null)),
        });
        if (Object.values(v).some((x) => typeof x === "number")) any = true;
      }
      if (eventIds.every((id) => merged.has(id))) break;
    } catch {
      // provedor seguinte
    }
  }
  setOddsModeAvailable(any || merged.size > 0);
  return merged;
}

/** Converte EventOdds + fairOdds do modelo para o shape MatchOdds (null = sem odd). */
export function emptyMatchOdds(): {
  home: number | null;
  draw: number | null;
  away: number | null;
  over15: number | null;
  over25: number | null;
  over35: number | null;
  under15: number | null;
  under25: number | null;
  under35: number | null;
  btts: number | null;
  bttsNo: number | null;
  doubleChance1X: number | null;
  doubleChanceX2: number | null;
  doubleChance12: number | null;
} {
  return {
    home: null,
    draw: null,
    away: null,
    over15: null,
    over25: null,
    over35: null,
    under15: null,
    under25: null,
    under35: null,
    btts: null,
    bttsNo: null,
    doubleChance1X: null,
    doubleChanceX2: null,
    doubleChance12: null,
  };
}

export function eventOddsToMatchOdds(eo: EventOdds | undefined): ReturnType<typeof emptyMatchOdds> {
  const base = emptyMatchOdds();
  if (!eo) return base;
  return {
    home: eo.home ?? null,
    draw: eo.draw ?? null,
    away: eo.away ?? null,
    over15: eo.over15 ?? null,
    over25: eo.over25 ?? null,
    over35: eo.over35 ?? null,
    under15: eo.under15 ?? null,
    under25: eo.under25 ?? null,
    under35: eo.under35 ?? null,
    btts: eo.btts ?? null,
    bttsNo: eo.bttsNo ?? null,
    doubleChance1X: eo.doubleChance1X ?? null,
    doubleChanceX2: eo.doubleChanceX2 ?? null,
    doubleChance12: eo.doubleChance12 ?? null,
  };
}

export function hasAnyOdd(o: ReturnType<typeof emptyMatchOdds>): boolean {
  return Object.values(o).some((v) => v != null && v > 1);
}
