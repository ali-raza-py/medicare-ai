-- MediCare AI — Phase 1: honest document processing states.
--
-- The documents table already has: id, user_id, file_name, document_type,
-- extracted_text, processing_status, storage_path, created_at.
--
-- processing_status now follows the honest state machine:
--   uploaded → processing → processed | failed
-- (the legacy value 'completed' is treated as 'processed' by the backend).
--
-- Run this in the Supabase SQL editor (or `supabase db push`). It is
-- idempotent: safe to re-run. The backend probes for these columns at
-- runtime and keeps working (without error details / page counts) if this
-- migration has not been applied yet.

alter table public.documents
  add column if not exists title text,
  add column if not exists error_message text,
  add column if not exists page_count integer,
  add column if not exists ocr_metadata jsonb;

-- Constrain processing_status to the real states. Drop any pre-existing
-- check constraint of the same name first (re-run safe).
alter table public.documents
  drop constraint if exists documents_processing_status_check;

alter table public.documents
  add constraint documents_processing_status_check
  check (processing_status in ('uploaded', 'processing', 'processed', 'failed', 'completed'));

-- Note: 'completed' is kept in the allowed list so historical rows written
-- by the previous backend version remain valid; the backend maps it to
-- 'processed' when reading.

-- Row Level Security must stay enabled — the backend uses the service role
-- (bypassing RLS) and enforces user ownership in code, while any client-side
-- access goes through per-user RLS policies.
alter table public.documents enable row level security;

-- Storage: files live in the private 'medical-documents' bucket under
-- {user_id}/{document_id}/{file_name}. No public bucket change needed.

insert into storage.buckets (id, name, public)
values ('medical-documents', 'medical-documents', false)
on conflict (id) do update set public = false;

-- Keep direct client access limited to objects under the authenticated user's
-- first path segment. The backend service role still bypasses these policies.
drop policy if exists "Users can read their medical documents" on storage.objects;
create policy "Users can read their medical documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can upload their medical documents" on storage.objects;
create policy "Users can upload their medical documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update their medical documents" on storage.objects;
create policy "Users can update their medical documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their medical documents" on storage.objects;
create policy "Users can delete their medical documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create index if not exists documents_user_created_at_idx
  on public.documents (user_id, created_at desc);
