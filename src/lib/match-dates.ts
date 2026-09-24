// ─── Classificação de data America/Sao_Paulo ─────────────────────────────
// Função centralizada que decide se uma partida pertence a HOJE ou AMANHÃ.
// Nunca usar UTC direto: partidas próximas da meia-noite cairiam no dia errado.

export const SP_TIME_ZONE = "America/Sao_Paulo";

export type MatchDateBucket = "today" | "tomorrow" | "other";

function spDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Data ISO (YYYY-MM-DD) em America/Sao_Paulo, com offset opcional em dias. */
export function spDateISO(offsetDays = 0, now: Date = new Date()): string {
  return spDayKey(new Date(now.getTime() + offsetDays * 86_400_000));
}

/** Hoje em America/Sao_Paulo (YYYY-MM-DD). */
export function spTodayISO(now: Date = new Date()): string {
  return spDateISO(0, now);
}

/** Amanhã em America/Sao_Paulo (YYYY-MM-DD). */
export function spTomorrowISO(now: Date = new Date()): string {
  return spDateISO(1, now);
}

/**
 * Classifica o kickoff (ISO) em "today" | "tomorrow" | "other",
 * comparando dias-calendário em America/Sao_Paulo.
 */
export function getMatchDateBucket(kickoffISO: string, now: Date = new Date()): MatchDateBucket {
  const kickoff = new Date(kickoffISO);
  if (Number.isNaN(kickoff.getTime())) return "other";
  const key = spDayKey(kickoff);
  if (key === spDayKey(now)) return "today";
  if (key === spDayKey(new Date(now.getTime() + 86_400_000))) return "tomorrow";
  return "other";
}

/** Hora do kickoff (HH:MM) em America/Sao_Paulo. */
export function fmtTimeSP(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: SP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Data curta pt-BR a partir de YYYY-MM-DD (ex: "qua., 10 de set."). */
export function fmtDateSP(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
