alter table public.service_notification_attempts drop constraint if exists service_notification_attempts_part_check;
alter table public.service_notification_attempts add constraint service_notification_attempts_part_check check (part in ('appointment_message', 'appointment_file', 'rating_invitation'));

create table if not exists public.service_notification_templates (
  id uuid primary key default gen_random_uuid(),
  oa_account_id uuid not null references public.zalo_oa_accounts(id) on delete cascade,
  template_key text not null check (template_key in ('post_rating', 'rating_invitation', 'resend_pdf')),
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  updated_by uuid references public.admin_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (oa_account_id, template_key)
);
create index if not exists service_notification_templates_oa_idx on public.service_notification_templates(oa_account_id, template_key);
