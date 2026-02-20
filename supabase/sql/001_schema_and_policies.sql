-- 001_schema_and_policies.sql
-- Base de dados para inscricao + PAR-Q com RLS.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_date date not null,
  rg text,
  cpf text,
  phone text,
  email text,
  modality text not null,
  monthly_fee numeric(10,2),
  payment_day smallint check (payment_day between 1 and 31),
  is_minor boolean not null default false,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  full_name text not null,
  cpf text,
  rg text,
  phone text,
  relationship text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parq_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  q1 boolean not null,
  q2 boolean not null,
  q3 boolean not null,
  q4 boolean not null,
  q5 boolean not null,
  q6 boolean not null,
  q7 boolean not null,
  has_positive_answer boolean generated always as (
    q1 or q2 or q3 or q4 or q5 or q6 or q7
  ) stored,
  responsibility_term_accepted boolean not null default false,
  govbr_signature_requested boolean not null default false,
  pdf_url text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_guardians_student_id on public.guardians(student_id);
create index if not exists idx_parq_responses_student_id on public.parq_responses(student_id);
create index if not exists idx_students_full_name on public.students using gin (to_tsvector('simple', coalesce(full_name, '')));

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

drop trigger if exists trg_guardians_updated_at on public.guardians;
create trigger trg_guardians_updated_at
before update on public.guardians
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.parq_responses enable row level security;

drop policy if exists "admin_users_select_admin" on public.admin_users;
create policy "admin_users_select_admin"
on public.admin_users
for select
to authenticated
using (public.is_admin());

drop policy if exists "students_public_insert" on public.students;
create policy "students_public_insert"
on public.students
for insert
to anon, authenticated
with check (true);

drop policy if exists "students_admin_select" on public.students;
create policy "students_admin_select"
on public.students
for select
to authenticated
using (public.is_admin());

drop policy if exists "students_admin_update" on public.students;
create policy "students_admin_update"
on public.students
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "students_admin_delete" on public.students;
create policy "students_admin_delete"
on public.students
for delete
to authenticated
using (public.is_admin());

drop policy if exists "guardians_public_insert" on public.guardians;
create policy "guardians_public_insert"
on public.guardians
for insert
to anon, authenticated
with check (true);

drop policy if exists "guardians_admin_select" on public.guardians;
create policy "guardians_admin_select"
on public.guardians
for select
to authenticated
using (public.is_admin());

drop policy if exists "guardians_admin_update" on public.guardians;
create policy "guardians_admin_update"
on public.guardians
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "guardians_admin_delete" on public.guardians;
create policy "guardians_admin_delete"
on public.guardians
for delete
to authenticated
using (public.is_admin());

drop policy if exists "parq_public_insert" on public.parq_responses;
create policy "parq_public_insert"
on public.parq_responses
for insert
to anon, authenticated
with check (true);

drop policy if exists "parq_admin_select" on public.parq_responses;
create policy "parq_admin_select"
on public.parq_responses
for select
to authenticated
using (public.is_admin());

drop policy if exists "parq_admin_update" on public.parq_responses;
create policy "parq_admin_update"
on public.parq_responses
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant usage on schema public to anon, authenticated, service_role;
grant insert on public.students to anon, authenticated;
grant insert on public.guardians to anon, authenticated;
grant insert on public.parq_responses to anon, authenticated;
grant select, insert, update, delete on public.students to authenticated, service_role;
grant select, insert, update, delete on public.guardians to authenticated, service_role;
grant select, insert, update, delete on public.parq_responses to authenticated, service_role;
grant select on public.admin_users to authenticated, service_role;
