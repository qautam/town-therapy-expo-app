-- Severity for citizen reports (run once on existing projects).
alter table public.reports
  add column if not exists severity text not null default 'moderate';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_severity_check'
  ) then
    alter table public.reports
      add constraint reports_severity_check
      check (severity in ('minor', 'moderate', 'critical'));
  end if;
end $$;

-- Make sure the API sees the new column immediately.
notify pgrst, 'reload schema';
