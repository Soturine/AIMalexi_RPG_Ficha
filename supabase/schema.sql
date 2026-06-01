-- ═══════════════════════════════════════════════════════════════════════════
-- AIMalexi RPG · supabase/schema.sql
-- Fase M — Multiplayer durável grátis (projeto Supabase COMPARTILHADO).
-- Modelo de segurança aprovado: RLS ROBUSTO — auth anônimo + associação
-- (campaign_members) + RPC join_campaign(pin). Uma mesa NÃO vê/altera outra.
--
-- Pré-requisitos no projeto Supabase:
--   1. Authentication → habilitar "Anonymous sign-ins".
--   2. Rodar este arquivo no SQL editor (idempotente: usa IF NOT EXISTS / OR REPLACE).
-- A chave usada no cliente é a ANON (pública, segura sob RLS). NUNCA a service_role.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabelas ──────────────────────────────────────────────────────────────────

create table if not exists public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  pin           text not null unique check (pin ~ '^\d{6}$'),
  name          text not null,
  host_user_id  uuid not null,
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id     uuid not null,
  role        text not null default 'player' check (role in ('host','player')),
  joined_at   timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

-- Event Log durável (append-only). eventId lógico = peer_id:peer_seq.
create table if not exists public.campaign_events (
  id          bigserial primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  peer_id     text not null,
  peer_seq    bigint not null,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  sacred      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (campaign_id, peer_id, peer_seq)   -- idempotência (reenvio do outbox)
);

-- Checkpoint por investigador (late-join rápido: snapshot + eventos > last_seq).
create table if not exists public.investigator_snapshots (
  campaign_id    uuid not null references public.campaigns(id) on delete cascade,
  peer_id        text not null,
  player_name    text,
  character_name text,
  character_json jsonb not null default '{}'::jsonb,
  vitals         jsonb not null default '{}'::jsonb,
  last_seq       bigint not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (campaign_id, peer_id)
);

create index if not exists idx_events_campaign_seq
  on public.campaign_events (campaign_id, id);
create index if not exists idx_members_user
  on public.campaign_members (user_id);

-- ── Helpers de autorização (SECURITY DEFINER para uso em policies) ─────────────

create or replace function public.is_member(p_campaign uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.campaign_members m
    where m.campaign_id = p_campaign and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_host(p_campaign uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.campaign_members m
    where m.campaign_id = p_campaign and m.user_id = auth.uid() and m.role = 'host'
  );
$$;

-- Tipos sagrados (espelha SACRED em js/core/actions.js). Só o Mestre grava esses eventos.
create or replace function public.is_sacred_type(p_type text)
returns boolean language sql immutable as $$
  select p_type = any (array[
    'APPLY_DAMAGE','HEAL_DAMAGE','LOSE_SANITY','RECOVER_SANITY',
    'SPEND_MAGIC','RESTORE_MAGIC','RESOLVE_COMBAT','ADD_STATUS','REMOVE_STATUS'
  ]);
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.campaigns              enable row level security;
alter table public.campaign_members       enable row level security;
alter table public.campaign_events         enable row level security;
alter table public.investigator_snapshots enable row level security;

-- campaigns: membros leem; criação/alteração via RPC (SECURITY DEFINER).
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns
  for select using (public.is_member(id));

-- campaign_members: membros enxergam os co-membros (entrada é via RPC).
drop policy if exists members_select on public.campaign_members;
create policy members_select on public.campaign_members
  for select using (public.is_member(campaign_id));

-- campaign_events: membros leem; membros inserem — mas eventos SAGRADOS só o host.
drop policy if exists events_select on public.campaign_events;
create policy events_select on public.campaign_events
  for select using (public.is_member(campaign_id));

drop policy if exists events_insert on public.campaign_events;
create policy events_insert on public.campaign_events
  for insert with check (
    public.is_member(campaign_id)
    and (not public.is_sacred_type(type) or public.is_host(campaign_id))
  );

-- investigator_snapshots: membros leem e fazem upsert (do próprio peer no cliente).
drop policy if exists snap_select on public.investigator_snapshots;
create policy snap_select on public.investigator_snapshots
  for select using (public.is_member(campaign_id));

drop policy if exists snap_upsert on public.investigator_snapshots;
create policy snap_upsert on public.investigator_snapshots
  for insert with check (public.is_member(campaign_id));
drop policy if exists snap_update on public.investigator_snapshots;
create policy snap_update on public.investigator_snapshots
  for update using (public.is_member(campaign_id));

-- ── RPCs de entrada (validam PIN; criam associação; rodam como owner) ─────────

create or replace function public.create_campaign(p_name text, p_pin text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if p_pin !~ '^\d{6}$' then raise exception 'invalid pin'; end if;
  insert into public.campaigns (pin, name, host_user_id)
    values (p_pin, coalesce(nullif(p_name,''),'Campanha'), auth.uid())
    returning id into v_id;
  insert into public.campaign_members (campaign_id, user_id, role)
    values (v_id, auth.uid(), 'host');
  return v_id;
end; $$;

create or replace function public.join_campaign(p_pin text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select id into v_id from public.campaigns where pin = p_pin and status = 'active' limit 1;
  if v_id is null then raise exception 'campaign not found'; end if;
  insert into public.campaign_members (campaign_id, user_id, role)
    values (v_id, auth.uid(), 'player')
    on conflict (campaign_id, user_id) do nothing;
  update public.campaigns set last_active_at = now() where id = v_id;
  return v_id;
end; $$;

grant execute on function public.create_campaign(text, text) to anon, authenticated;
grant execute on function public.join_campaign(text)         to anon, authenticated;
