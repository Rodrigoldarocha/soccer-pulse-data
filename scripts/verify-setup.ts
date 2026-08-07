#!/usr/bin/env bun
/**
 * Script de verificação da configuração do projeto.
 * Uso: bun scripts/verify-setup.ts
 */

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function ok(label: string, msg: string) {
  console.log(`  ${GREEN}✅${RESET} ${label}: ${msg}`);
}

function warn(label: string, msg: string) {
  console.log(`  ${YELLOW}⚠️${RESET} ${label}: ${msg}`);
}

function fail(label: string, msg: string) {
  console.log(`  ${RED}❌${RESET} ${label}: ${msg}`);
}

async function verifyBzzoiroToken(): Promise<boolean> {
  const token = process.env.BZZOIRO_TOKEN;
  if (!token) {
    fail("BZZOIRO_TOKEN", "Não configurado. Adicione ao .env ou secrets manager.");
    return false;
  }
  if (token.length < 10) {
    warn("BZZOIRO_TOKEN", "Configurado mas parece muito curto.");
  } else {
    ok("BZZOIRO_TOKEN", "Configurado (" + token.slice(0, 4) + "…" + token.slice(-4) + ")");
  }
  return true;
}

async function verifySupabaseConnection(): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    fail("SUPABASE_URL", "Não configurado.");
    return false;
  }
  if (!key) {
    warn(
      "SUPABASE_SERVICE_ROLE_KEY",
      "Não configurado. Cache e rate limit não funcionarão em produção.",
    );
  }

  ok("Supabase URL", url);

  if (key) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, key);
      const { error } = await supabase.from("bzzoiro_cache").select("cache_key").limit(1);
      if (error) {
        warn("Supabase conexão", "Tabela bzzoiro_cache pode não existir: " + error.message);
      } else {
        ok("Supabase conexão", "Conectado — tabela bzzoiro_cache acessível");
      }
    } catch (err) {
      warn(
        "Supabase conexão",
        "Erro ao conectar: " + (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  return true;
}

async function verifyBzzoiroApi(): Promise<boolean> {
  try {
    const { testBzzoiroConnection } = await import("../src/lib/bzzoiro/client.server");
    const result = await testBzzoiroConnection();
    if (result.ok) {
      ok("API Bzzoiro", "Conexão OK — /leagues/ respondeu");
      return true;
    }
    fail("API Bzzoiro", result.error ?? "Falha desconhecida");
    return false;
  } catch (err) {
    fail("API Bzzoiro", "Erro ao testar: " + (err instanceof Error ? err.message : String(err)));
    return false;
  }
}

async function verifyNodeEnv() {
  const env = process.env.NODE_ENV ?? "development";
  ok("NODE_ENV", env);
}

async function main() {
  console.log(`\n${BOLD}${CYAN}🔍 Verificando configuração do Zagueiro — Bzzoiro API${RESET}\n`);

  const results = await Promise.allSettled([
    verifyNodeEnv(),
    verifyBzzoiroToken(),
    verifySupabaseConnection(),
    verifyBzzoiroApi(),
  ]);

  const passed = results.filter((r) => r.status === "fulfilled").length;
  const total = results.length;

  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════${RESET}`);
  console.log(`${BOLD}Relatório: ${passed}/${total} verificações concluídas${RESET}`);

  const allOk = results.every((r) => r.status === "fulfilled");

  if (allOk) {
    console.log(`\n${GREEN}${BOLD}✅ Sistema pronto para uso!${RESET}\n`);
  } else {
    console.log(`\n${YELLOW}${BOLD}⚠️  Configure os itens pendentes antes de iniciar.${RESET}\n`);
  }
}

main().catch(console.error);
