-- Patch: admin audit log. Every destructive or state-changing action an
-- admin performs through /api/admin/* writes one row here so the team
-- can trace who did what, when, and to which entity.
-- Run once in Supabase SQL Editor.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete set null,
  action text not null,              -- e.g. 'listing.delete', 'report.update', 'plan.edit'
  entity_type text not null,         -- 'property' | 'report' | 'review' | 'plan' | 'user'
  entity_id text,                    -- uuid or other id
  summary text,                      -- short human-readable line for the table
  before_data jsonb,                 -- snapshot before the change (optional)
  after_data  jsonb,                 -- snapshot after the change (optional)
  metadata    jsonb,                 -- extra context (reason, ip, etc.)
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_admin_idx
  on public.admin_audit_log(admin_id, created_at desc);
create index if not exists admin_audit_entity_idx
  on public.admin_audit_log(entity_type, entity_id);
create index if not exists admin_audit_created_idx
  on public.admin_audit_log(created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admins read audit log" on public.admin_audit_log;
create policy "admins read audit log"
  on public.admin_audit_log for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
-- Writes happen server-side with the service role key, so no insert policy
-- is exposed to end users.

-- Convenience view: audit log joined with admin name/email for display.
create or replace view public.admin_audit_log_view as
  select
    a.id, a.action, a.entity_type, a.entity_id, a.summary,
    a.before_data, a.after_data, a.metadata, a.created_at,
    a.admin_id,
    p.name  as admin_name,
    p.email as admin_email
  from public.admin_audit_log a
  left join public.profiles p on p.id = a.admin_id;

grant select on public.admin_audit_log_view to authenticated;
