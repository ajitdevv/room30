-- Patch: separate "chatted with owner" from "phone explicitly unlocked".
-- Before this patch, any row in unlocked_contacts made the API leak the
-- owner's phone number. Chats auto-created that row, so renters saw phone
-- numbers they never paid to reveal. Now a row only exposes the phone
-- when phone_revealed_at is set (i.e. the user clicked "Show contact").
-- Run once in Supabase SQL Editor.

-- -------------------------------------------------------------------------
-- 1. phone_revealed_at column
-- -------------------------------------------------------------------------
alter table public.unlocked_contacts
  add column if not exists phone_revealed_at timestamptz;

create index if not exists unlocked_contacts_phone_idx
  on public.unlocked_contacts(user_id, owner_id)
  where phone_revealed_at is not null;

-- -------------------------------------------------------------------------
-- 2. Backfill: rows created before this patch had no explicit unlock
-- intent, so leave phone_revealed_at null. Users will need to re-click
-- "Show contact number" to reveal phones they had seen previously, which
-- is the correct behaviour.
-- -------------------------------------------------------------------------
-- (nothing to backfill; column defaults to null)
