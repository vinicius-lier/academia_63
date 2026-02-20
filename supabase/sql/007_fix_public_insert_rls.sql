-- 007_fix_public_insert_rls.sql
-- Reparo de RLS para fluxo publico de inscricao.

alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.parq_responses enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant insert on public.students to anon, authenticated;
grant insert on public.guardians to anon, authenticated;
grant insert on public.parq_responses to anon, authenticated;

drop policy if exists "students_public_insert" on public.students;
create policy "students_public_insert"
on public.students
for insert
to anon, authenticated
with check (true);

drop policy if exists "guardians_public_insert" on public.guardians;
create policy "guardians_public_insert"
on public.guardians
for insert
to anon, authenticated
with check (true);

drop policy if exists "parq_public_insert" on public.parq_responses;
create policy "parq_public_insert"
on public.parq_responses
for insert
to anon, authenticated
with check (true);

-- Validacao rapida (opcional):
-- select schemaname, tablename, policyname, roles, cmd
-- from pg_policies
-- where schemaname='public'
--   and tablename in ('students','guardians','parq_responses')
-- order by tablename, policyname;
