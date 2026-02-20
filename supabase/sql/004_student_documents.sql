-- 004_student_documents.sql
-- Modulo de anexos administrativos por aluno.

create table if not exists public.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  doc_type text not null check (
    doc_type in ('signed_pdf', 'rg', 'medical_certificate', 'other')
  ),
  file_name text not null,
  file_path text not null unique,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_documents_student_id
  on public.student_documents(student_id);

alter table public.student_documents enable row level security;

drop policy if exists "student_documents_admin_select" on public.student_documents;
create policy "student_documents_admin_select"
on public.student_documents
for select
to authenticated
using (public.is_admin());

drop policy if exists "student_documents_admin_insert" on public.student_documents;
create policy "student_documents_admin_insert"
on public.student_documents
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "student_documents_admin_update" on public.student_documents;
create policy "student_documents_admin_update"
on public.student_documents
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "student_documents_admin_delete" on public.student_documents;
create policy "student_documents_admin_delete"
on public.student_documents
for delete
to authenticated
using (public.is_admin());

grant select, insert, update, delete on public.student_documents to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-documents',
  'student-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do nothing;

drop policy if exists "student_documents_storage_admin_read" on storage.objects;
create policy "student_documents_storage_admin_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-documents'
  and public.is_admin()
);

drop policy if exists "student_documents_storage_admin_write" on storage.objects;
create policy "student_documents_storage_admin_write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-documents'
  and public.is_admin()
);

drop policy if exists "student_documents_storage_admin_update" on storage.objects;
create policy "student_documents_storage_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-documents'
  and public.is_admin()
)
with check (
  bucket_id = 'student-documents'
  and public.is_admin()
);

drop policy if exists "student_documents_storage_admin_delete" on storage.objects;
create policy "student_documents_storage_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-documents'
  and public.is_admin()
);
