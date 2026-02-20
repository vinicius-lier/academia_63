-- 008_students_public_insert_hard_reset.sql
-- Reset completo das policies da tabela students, mantendo leitura/edicao apenas admin
-- e insercao publica para inscricao.

alter table public.students enable row level security;
grant usage on schema public to anon, authenticated, service_role;
grant insert on public.students to anon, authenticated;

do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'students'
  loop
    execute format('drop policy if exists %I on public.students', p.policyname);
  end loop;
end $$;

create policy students_public_insert
on public.students
for insert
to anon, authenticated
with check (true);

create policy students_admin_select
on public.students
for select
to authenticated
using (public.is_admin());

create policy students_admin_update
on public.students
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy students_admin_delete
on public.students
for delete
to authenticated
using (public.is_admin());
