alter table public.service_notification_attempts
  add column if not exists reconciliation_status text not null default 'not_checked'
    check (reconciliation_status in ('not_checked', 'found', 'not_found', 'webhook_received', 'error')),
  add column if not exists reconciled_at timestamptz,
  add column if not exists reconciled_message_id text,
  add column if not exists reconciliation_error text;

create index if not exists service_notification_reconcile_idx
  on public.service_notification_attempts(reconciliation_status, reconciled_at desc);
