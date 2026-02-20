# Supabase SQL - Ordem de execucao

Execute no SQL Editor do Supabase nesta ordem:

1. `001_schema_and_policies.sql`
2. `002_storage_parq.sql`
3. `003_admin_bootstrap.sql` (trocar UUID placeholder)
4. `004_student_documents.sql`
5. `005_storage_parq_public_insert.sql`
6. `006_contract_discount_fields.sql`
7. `007_fix_public_insert_rls.sql`
8. `008_students_public_insert_hard_reset.sql` (use se persistir erro de RLS em students)
9. `009_contract_click_signatures.sql`

## Observacoes

- O arquivo `003_admin_bootstrap.sql` usa um UUID de exemplo.
- Substitua pelo `id` real do usuario admin criado em `Authentication > Users`.
- As policies de leitura/edicao administrativa usam `public.is_admin()`.
