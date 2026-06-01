/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/config.js
   Configuração de ambiente — credenciais e feature flags.

   SETUP PARA MULTIPLAYER REMOTO (Sprint 17):
   ─────────────────────────────────────────────────────────────────────
   1. Crie um projeto em https://supabase.com (plano Free é suficiente)
   2. Em Project Settings → API, copie:
        - Project URL  →  supabaseUrl
        - anon / public key  →  supabaseKey
   3. Defina useSupabase: true
   4. A chave anon é segura para expor no cliente — é controlada por RLS.
      Nunca coloque a service_role key aqui.

   ENQUANTO useSupabase: false (padrão):
   ─────────────────────────────────────────────────────────────────────
   O sistema usa BroadcastChannel (abas do mesmo browser).
   Multiplayer local funciona normalmente.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

window.CoC.config = Object.freeze({
  supabaseUrl:     'https://oveeqntgpusmemmybale.supabase.co',
  supabaseKey:     'sb_publishable_R30Kj1WQ93aQ7jwDefFYXA_31EFhe1G',  // anon/publishable — pública por design (RLS). NUNCA a secret/service_role aqui.
  useSupabase:     false,   // mantém DESLIGADO até vendar o SDK + fiação + teste no navegador (go-live)
  transportDebug:  false,   // Sprint 18: logs detalhados de transport (send/recv/dup/gap)
});
