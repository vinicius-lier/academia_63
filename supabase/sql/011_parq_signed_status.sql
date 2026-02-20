-- 011_parq_signed_status.sql
-- Status de assinatura gravado diretamente em parq_responses.

alter table public.parq_responses
  add column if not exists contract_signed_at timestamptz;

alter table public.parq_responses
  add column if not exists contract_signer_name text;

alter table public.parq_responses
  add column if not exists contract_signer_cpf text;

alter table public.parq_responses
  add column if not exists contract_signature_method text;

-- Atualiza funcao para gravar assinatura em contract_click_signatures e em parq_responses.
create or replace function public.sign_contract_by_prefix(
  p_student_id uuid,
  p_parq_response_id uuid,
  p_cpf_prefix text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb;
  v_signed_at timestamptz := now();
  v_signer_name text;
  v_signer_cpf text;
  v_existing public.contract_click_signatures%rowtype;
begin
  v_ctx := public.get_contract_sign_context(p_student_id, p_parq_response_id, p_cpf_prefix);
  v_signer_name := coalesce(v_ctx->>'expected_signer_name', '');
  v_signer_cpf := coalesce(v_ctx->>'expected_signer_cpf', '');

  select * into v_existing
  from public.contract_click_signatures
  where parq_response_id = p_parq_response_id
  limit 1;

  if found then
    update public.parq_responses
    set contract_signed_at = coalesce(contract_signed_at, v_existing.signed_at),
        contract_signer_name = coalesce(contract_signer_name, v_existing.signer_name),
        contract_signer_cpf = coalesce(contract_signer_cpf, v_existing.signer_cpf),
        contract_signature_method = coalesce(contract_signature_method, v_existing.signature_method)
    where id = p_parq_response_id;

    return jsonb_build_object(
      'already_signed', true,
      'signed_at', v_existing.signed_at,
      'signer_name', v_existing.signer_name,
      'signer_cpf', v_existing.signer_cpf
    );
  end if;

  insert into public.contract_click_signatures (
    id, student_id, parq_response_id, signer_name, signer_cpf, signature_method, signed_at
  ) values (
    gen_random_uuid(), p_student_id, p_parq_response_id, v_signer_name, v_signer_cpf, 'click_button', v_signed_at
  );

  update public.parq_responses
  set contract_signed_at = v_signed_at,
      contract_signer_name = v_signer_name,
      contract_signer_cpf = v_signer_cpf,
      contract_signature_method = 'click_button'
  where id = p_parq_response_id;

  return jsonb_build_object(
    'already_signed', false,
    'signed_at', v_signed_at,
    'signer_name', v_signer_name,
    'signer_cpf', v_signer_cpf
  );
end;
$$;
