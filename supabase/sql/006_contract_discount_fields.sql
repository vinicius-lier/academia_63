-- 006_contract_discount_fields.sql
-- Campos para controle de aceite contratual e elegibilidade de desconto.

alter table public.students
  add column if not exists contract_until_year_end_accepted boolean not null default false;

alter table public.students
  add column if not exists discount_eligible boolean not null default false;
