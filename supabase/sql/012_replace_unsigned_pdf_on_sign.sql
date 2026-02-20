-- 012_replace_unsigned_pdf_on_sign.sql
-- Atualiza pdf_url do PAR-Q para o arquivo assinado, com validacao por prefixo de CPF.

create or replace function public.set_signed_contract_pdf_by_prefix(
  p_student_id uuid,
  p_parq_response_id uuid,
  p_cpf_prefix text,
  p_pdf_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb;
begin
  if p_pdf_url is null or length(trim(p_pdf_url)) = 0 then
    raise exception 'pdf_url invalido';
  end if;

  -- Reusa a mesma validacao de acesso por CPF.
  v_ctx := public.get_contract_sign_context(p_student_id, p_parq_response_id, p_cpf_prefix);

  update public.parq_responses
  set pdf_url = p_pdf_url
  where id = p_parq_response_id
    and student_id = p_student_id;

  return jsonb_build_object(
    'ok', true,
    'parq_response_id', p_parq_response_id,
    'pdf_url', p_pdf_url
  );
end;
$$;

revoke all on function public.set_signed_contract_pdf_by_prefix(uuid, uuid, text, text) from public;
grant execute on function public.set_signed_contract_pdf_by_prefix(uuid, uuid, text, text) to anon, authenticated;
