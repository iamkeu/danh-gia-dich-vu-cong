alter table public.service_case_links add column if not exists oa_uid_ciphertext text;
alter table public.service_cases add column if not exists rating_template_id text;
alter table public.service_cases add column if not exists rating_template_data jsonb not null default '{}'::jsonb;
