-- VEXORA SAMPLER licensing foundation.
-- All access is intentionally server-only; public clients must use Edge Functions.
create extension if not exists pgcrypto;

create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  customer_email text not null,
  status text not null default 'issued'
    check (status in ('issued', 'active', 'revoked', 'support_hold')),
  license_type text not null default 'lifetime'
    check (license_type in ('lifetime')),
  device_binding_hash text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  admin_notes text,
  constraint license_keys_binding_state check (
    (status = 'active' and device_binding_hash is not null and activated_at is not null)
    or status <> 'active'
  )
);

create table if not exists public.license_activation_events (
  id bigint generated always as identity primary key,
  license_id uuid references public.license_keys(id) on delete set null,
  event_type text not null check (
    event_type in ('activation_succeeded', 'activation_rejected', 'revoked', 'admin_reactivation')
  ),
  device_binding_hash text,
  detail_code text,
  created_at timestamptz not null default now()
);

create index if not exists license_activation_events_license_id_created_at_idx
  on public.license_activation_events (license_id, created_at desc);

alter table public.license_keys enable row level security;
alter table public.license_activation_events enable row level security;

-- No public policies are created. Browser clients cannot read or change license records.
revoke all on table public.license_keys from anon, authenticated;
revoke all on table public.license_activation_events from anon, authenticated;
grant all on table public.license_keys to service_role;
grant all on table public.license_activation_events to service_role;
