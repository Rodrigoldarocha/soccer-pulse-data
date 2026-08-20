// Contract: TeamLogo (spec 008) — contrato de props, sem implementação.
// Source: specs/008-design-system-team-logo/spec.md
// Version: 1.0.0

export interface TeamLogoContract {
  /** id do time Bzzoiro; null → fallback de iniciais (AC-002) */
  teamId: number | null;
  /** nome do time — usado em alt/aria-label e iniciais (AC-001/002) */
  teamName: string;
  /** diâmetro em px; controla img e fontSize do fallback (AC-004) */
  size?: number;
}

// Estados aceitos (spec §Estados):
// default | empty (teamId null) | error (onError) | loading (lazy nativo)
// Cor: SEMPRE tokens semânticos — bg-muted / text-muted-foreground (AC-005).
