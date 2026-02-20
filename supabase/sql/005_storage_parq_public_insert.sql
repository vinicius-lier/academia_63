-- 005_storage_parq_public_insert.sql
-- Permite upload publico controlado de contratos no bucket parq-pdfs.
-- Leitura continua restrita ao admin.

drop policy if exists "parq_pdfs_public_insert" on storage.objects;
create policy "parq_pdfs_public_insert"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'parq-pdfs'
  and (storage.foldername(name))[1] = 'contracts'
);
