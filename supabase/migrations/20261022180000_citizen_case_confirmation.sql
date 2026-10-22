-- Citizen QR confirmation flow: the citizen links the current Zalo account to one case.
ALTER TABLE public.service_cases DROP CONSTRAINT IF EXISTS service_cases_status_check;
ALTER TABLE public.service_cases ADD CONSTRAINT service_cases_status_check
  CHECK (status IN ('draft', 'pending_confirmation', 'linked', 'sent', 'rated', 'archived'));

ALTER TABLE public.service_case_links DROP CONSTRAINT IF EXISTS service_case_links_link_method_check;
ALTER TABLE public.service_case_links ADD CONSTRAINT service_case_links_link_method_check
  CHECK (link_method IN ('auto', 'manual', 'citizen_qr'));

ALTER TABLE public.service_case_links
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_method text;

UPDATE public.service_cases
SET status = 'pending_confirmation', updated_at = now()
WHERE status = 'draft';

COMMENT ON COLUMN public.service_case_links.confirmed_at IS 'Time the citizen confirmed receiving this case result via Mini App';
COMMENT ON COLUMN public.service_case_links.confirmation_method IS 'citizen_qr for citizen self-linking through a case QR';
