// Web Push: config pública, inscrição/remoção e envio de avisos de value bets.
// Server-only (web-push precisa das chaves VAPID privadas).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ValueBetRow } from "./value-bets.functions";

export interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

/** Bets de alto valor ainda não avisadas (dedup por notified_at). Puro, testado. */
export function highValueBetsToNotify(rows: ValueBetRow[], minEv = 0.15): ValueBetRow[] {
  return rows.filter((r) => r.status === "pending" && r.ev >= minEv && r.notified_at == null);
}

export const getPushConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<PushConfig> => {
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? null;
    return { enabled: Boolean(publicKey && process.env.VAPID_PRIVATE_KEY), publicKey };
  },
);

const subscriptionInput = z.object({
  endpoint: z.string().url().min(10),
  p256dh: z.string().min(10),
  auth: z.string().min(5),
});

export const registerPushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => subscriptionInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inserted, error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: getRequest().headers.get("user-agent"),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      )
      .select("id")
      .single();

    if (error) throw error;
    return { ok: true, id: inserted?.id ?? null };
  });

export const unregisterPushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => subscriptionInput.pick({ endpoint: true }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint);
    if (error) throw error;
    return { ok: true };
  });

/**
 * Envia aviso de bets de alto valor ainda não avisados e marca notified_at.
 * Chamado pelo feed de value bets após o snapshot — dedup natural por bet.
 */
export async function notifyHighValueBets(rows: ValueBetRow[]): Promise<number> {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@localhost";
  if (!privateKey || !publicKey) return 0;

  const toNotify = highValueBetsToNotify(rows);
  if (toNotify.length === 0) return 0;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth");

  if (error) throw error;
  if (!subscriptions || subscriptions.length === 0) return 0;

  const webPush = (await import("web-push")).default;
  webPush.setVapidDetails(subject, publicKey, privateKey);

  const now = new Date().toISOString();
  const notifiedIds = new Set<number>();
  const deadEndpoints: string[] = [];

  const payload = (bet: ValueBetRow) =>
    JSON.stringify({
      title: "💎 Value bet encontrada",
      body: `${bet.home_team} × ${bet.away_team} — ${bet.market} ${bet.outcome} @ ${bet.odds.toFixed(2)} (EV ${(bet.ev * 100).toFixed(0)}%)`,
      url: `/valor?market=${bet.market}`,
    });

  for (const sub of subscriptions) {
    for (const bet of toNotify) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload(bet),
        );
        notifiedIds.add(bet.id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) deadEndpoints.push(sub.endpoint);
      }
    }
  }

  if (notifiedIds.size > 0) {
    await supabaseAdmin
      .from("value_bets")
      .update({ notified_at: now })
      .in("id", [...notifiedIds]);
  }
  if (deadEndpoints.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
  }

  return notifiedIds.size;
}
