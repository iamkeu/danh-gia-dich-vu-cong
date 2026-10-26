drop index if exists public.service_case_tokens_active_case_uq;
create index if not exists service_case_tokens_active_case_idx
  on public.service_case_tokens(case_id, expires_at)
  where consumed_at is null;
