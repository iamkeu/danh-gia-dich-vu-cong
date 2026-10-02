create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  display_name text not null default '',
  role text not null default 'operator' check (role in ('admin', 'leader', 'operator')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists admin_accounts_email_uq on public.admin_accounts (lower(email));

create table if not exists public.service_cases (
  id uuid primary key default gen_random_uuid(),
  case_code text not null,
  procedure_name text not null,
  department_name text not null default '',
  officer_name text not null default '',
  appointment_date date,
  citizen_display_name text,
  pdf_storage_path text,
  status text not null default 'draft' check (status in ('draft', 'linked', 'sent', 'rated', 'archived')),
  created_by uuid references public.admin_accounts(id),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists service_cases_case_code_uq on public.service_cases (case_code);
create index if not exists service_cases_status_idx on public.service_cases (status, created_at desc);

create table if not exists public.service_case_tokens (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.service_cases(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists service_case_tokens_active_case_uq
  on public.service_case_tokens(case_id) where consumed_at is null;

create table if not exists public.service_case_links (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.service_cases(id) on delete cascade,
  oa_account_id uuid references public.zalo_oa_accounts(id),
  oa_uid_hash text not null,
  link_method text not null check (link_method in ('auto', 'manual')),
  linked_by uuid references public.admin_accounts(id),
  linked_at timestamptz not null default now(),
  unique (case_id),
  unique (oa_account_id, oa_uid_hash)
);
create index if not exists service_case_links_uid_idx on public.service_case_links (oa_uid_hash);

create table if not exists public.service_ratings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.service_cases(id) on delete cascade,
  oa_uid_hash text not null,
  stars smallint not null check (stars between 1 and 5),
  comment text,
  comment_consent_at timestamptz,
  submitted_at timestamptz not null default now(),
  unique (case_id),
  unique (case_id, oa_uid_hash),
  check (comment is null or char_length(comment) <= 1000),
  check (comment is null or char_length(btrim(comment)) = 0 or comment_consent_at is not null)
);

create table if not exists public.service_notification_attempts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.service_cases(id) on delete cascade,
  part text not null check (part in ('appointment_file', 'rating_invitation')),
  idempotency_key text not null,
  message_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  retry_count integer not null default 0 check (retry_count >= 0),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, part, idempotency_key)
);
create index if not exists service_notification_case_idx
  on public.service_notification_attempts(case_id, created_at desc);

create table if not exists public.service_case_audit_logs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.service_cases(id) on delete set null,
  actor_account_id uuid references public.admin_accounts(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_accounts enable row level security;
alter table public.service_cases enable row level security;
alter table public.service_case_tokens enable row level security;
alter table public.service_case_links enable row level security;
alter table public.service_ratings enable row level security;
alter table public.service_notification_attempts enable row level security;
alter table public.service_case_audit_logs enable row level security;

comment on table public.service_cases is 'Administrative service cases for Zalo Mini App satisfaction rating';
comment on table public.service_case_links is 'Protected mapping between a service case and a Zalo OA UID hash';
comment on table public.service_ratings is 'One satisfaction rating per service case';
