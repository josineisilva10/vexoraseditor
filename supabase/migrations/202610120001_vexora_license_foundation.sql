-- VEXORA SAMPLER licensing foundation.
-- Raw license keys and raw device identifiers must never be stored in this database.
-- Activation endpoints must use a server-side service-role client; never expose that key in the app.

create table if not exists public.vexora_licenses (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  customer_email text not null,
  status text not null default 'issued'
    check (status in ('issued', 'active', 'blocked', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  last_validated_at timestamptz,
  admin_note text
);

create index if not exists vexora_licenses_customer_email_idx
  on public.vexora_licenses (lower(customer_email));

create table if not exists public.vexora_license_activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.vexora_licenses(id) on delete cascade,
  device_hash text not null,
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  released_at timestamptz,
  release_reason text
);

-- A license may have only one active device binding at a time.
create unique index if not exists vexora_one_active_device_per_license_idx
  on public.vexora_license_activations (license_id)
  where released_at is null;

create index if not exists vexora_activation_device_hash_idx
  on public.vexora_license_activations (device_hash);

alter table public.vexora_licenses enable row level security;
alter table public.vexora_license_activations enable row level security;

-- No browser/client role may read or change license records directly.
revoke all on table public.vexora_licenses from anon, authenticated;
revoke all on table public.vexora_license_activations from anon, authenticated;
grant all on table public.vexora_licenses to service_role;
grant all on table public.vexora_license_activations to service_role;

comment on table public.vexora_licenses is
  'Server-managed VEXORA SAMPLER licenses. key_hash is a one-way hash; never store raw keys.';
comment on table public.vexora_license_activations is
  'Server-managed device bindings. device_hash must be a one-way hash of an app/device identifier.';
