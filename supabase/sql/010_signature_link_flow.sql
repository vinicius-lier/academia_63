-- 010_signature_link_flow.sql
-- Fluxo de assinatura por link + validacao por 6 primeiros digitos do CPF.

create or replace function public.get_contract_sign_context(
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
  v_student public.students%rowtype;
  v_parq public.parq_responses%rowtype;
  v_guardian public.guardians%rowtype;
  v_signature public.contract_click_signatures%rowtype;
  v_expected_cpf text;
  v_expected_name text;
  v_input_prefix text;
begin
  select * into v_student
  from public.students
  where id = p_student_id;

  if not found then
    raise exception 'Aluno nao encontrado';
  end if;

  select * into v_parq
  from public.parq_responses
  where id = p_parq_response_id
    and student_id = p_student_id;

  if not found then
    raise exception 'Contrato/PAR-Q nao encontrado para este aluno';
  end if;

  select * into v_guardian
  from public.guardians
  where student_id = p_student_id
  order by created_at desc
  limit 1;

  if v_student.is_minor and v_guardian.id is not null then
    v_expected_name := v_guardian.full_name;
    v_expected_cpf := regexp_replace(coalesce(v_guardian.cpf, ''), '\D', '', 'g');
  else
    v_expected_name := v_student.full_name;
    v_expected_cpf := regexp_replace(coalesce(v_student.cpf, ''), '\D', '', 'g');
  end if;

  v_input_prefix := regexp_replace(coalesce(p_cpf_prefix, ''), '\D', '', 'g');

  if length(v_input_prefix) <> 6 then
    raise exception 'Informe exatamente os 6 primeiros digitos do CPF';
  end if;

  if left(v_expected_cpf, 6) <> v_input_prefix then
    raise exception 'Validacao de CPF nao confere';
  end if;

  select * into v_signature
  from public.contract_click_signatures
  where parq_response_id = p_parq_response_id
  limit 1;

  return jsonb_build_object(
    'student', jsonb_build_object(
      'id', v_student.id,
      'full_name', v_student.full_name,
      'birth_date', v_student.birth_date,
      'rg', v_student.rg,
      'cpf', v_student.cpf,
      'phone', v_student.phone,
      'email', v_student.email,
      'modality', v_student.modality,
      'monthly_fee', v_student.monthly_fee,
      'payment_day', v_student.payment_day,
      'is_minor', v_student.is_minor,
      'address', v_student.address,
      'contract_until_year_end_accepted', v_student.contract_until_year_end_accepted,
      'discount_eligible', v_student.discount_eligible
    ),
    'guardian', case
      when v_guardian.id is null then null
      else jsonb_build_object(
        'full_name', v_guardian.full_name,
        'cpf', v_guardian.cpf,
        'rg', v_guardian.rg,
        'phone', v_guardian.phone,
        'relationship', v_guardian.relationship
      )
    end,
    'parq', jsonb_build_object(
      'id', v_parq.id,
      'answers', jsonb_build_array(v_parq.q1, v_parq.q2, v_parq.q3, v_parq.q4, v_parq.q5, v_parq.q6, v_parq.q7),
      'has_positive_answer', v_parq.has_positive_answer
    ),
    'signature', case
      when v_signature.id is null then null
      else jsonb_build_object(
        'method', v_signature.signature_method,
        'signed_at', v_signature.signed_at,
        'signer_name', v_signature.signer_name,
        'signer_cpf', v_signature.signer_cpf
      )
    end,
    'expected_signer_name', v_expected_name,
    'expected_signer_cpf', v_expected_cpf
  );
end;
$$;

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

  return jsonb_build_object(
    'already_signed', false,
    'signed_at', v_signed_at,
    'signer_name', v_signer_name,
    'signer_cpf', v_signer_cpf
  );
end;
$$;

revoke all on function public.get_contract_sign_context(uuid, uuid, text) from public;
revoke all on function public.sign_contract_by_prefix(uuid, uuid, text) from public;
grant execute on function public.get_contract_sign_context(uuid, uuid, text) to anon, authenticated;
grant execute on function public.sign_contract_by_prefix(uuid, uuid, text) to anon, authenticated;
