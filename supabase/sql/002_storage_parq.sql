-- 002_storage_parq.sql
-- Bucket para contratos/PAR-Q em PDF.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'parq-pdfs',
  'parq-pdfs',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "parq_pdfs_admin_read" on storage.objects;
create policy "parq_pdfs_admin_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'parq-pdfs'
  and public.is_admin()
);

drop policy if exists "parq_pdfs_admin_write" on storage.objects;
create policy "parq_pdfs_admin_write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'parq-pdfs'
  and public.is_admin()
);

drop policy if exists "parq_pdfs_admin_update" on storage.objects;
create policy "parq_pdfs_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'parq-pdfs'
  and public.is_admin()
)
with check (
  bucket_id = 'parq-pdfs'
  and public.is_admin()
);

drop policy if exists "parq_pdfs_admin_delete" on storage.objects;
create policy "parq_pdfs_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'parq-pdfs'
  and public.is_admin()
);
