-- 009_contract_click_signatures.sql
-- Registro de assinatura eletronica por clique (sem desenho).

create table if not exists public.contract_click_signatures (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  parq_response_id uuid not null references public.parq_responses(id) on delete cascade,
  signer_name text,
  signer_cpf text,
  signature_method text not null default 'click_button' check (signature_method in ('click_button')),
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (parq_response_id)
);

create index if not exists idx_contract_click_signatures_student_id
  on public.contract_click_signatures(student_id);

create index if not exists idx_contract_click_signatures_parq_response_id
  on public.contract_click_signatures(parq_response_id);

alter table public.contract_click_signatures enable row level security;

drop policy if exists "contract_click_signatures_public_insert" on public.contract_click_signatures;
create policy "contract_click_signatures_public_insert"
on public.contract_click_signatures
for insert
to anon, authenticated
with check (true);

drop policy if exists "contract_click_signatures_admin_select" on public.contract_click_signatures;
create policy "contract_click_signatures_admin_select"
on public.contract_click_signatures
for select
to authenticated
using (public.is_admin());

grant insert on public.contract_click_signatures to anon, authenticated;
grant select on public.contract_click_signatures to authenticated, service_role;
