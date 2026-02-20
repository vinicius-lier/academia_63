const accessState = {
  client: null,
  studentId: null,
  parqId: null,
  cpfPrefix: null,
  context: null,
  objectUrl: null,
  fileName: null,
};

function setStatus(id, message, type = "info") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = "text-sm mt-3";
  if (type === "error") {
    el.classList.add("text-red-700");
  } else if (type === "success") {
    el.classList.add("text-green-700");
  } else {
    el.classList.add("text-gray-600");
  }
}

function getQueryParams() {
  const url = new URL(window.location.href);
  return {
    studentId: url.searchParams.get("s"),
    parqId: url.searchParams.get("p"),
  };
}

function clearObjectUrl() {
  if (accessState.objectUrl) {
    URL.revokeObjectURL(accessState.objectUrl);
  }
  accessState.objectUrl = null;
  accessState.fileName = null;
}

function buildPdfPayloadFromContext(ctx) {
  const student = ctx.student || {};
  const guardian = ctx.guardian || null;
  const parq = ctx.parq || {};
  return {
    student: {
      full_name: student.full_name,
      birth_date: student.birth_date,
      age: null,
      rg: student.rg,
      cpf: student.cpf,
      phone: student.phone,
      email: student.email,
      modality: student.modality,
      monthly_fee: student.monthly_fee,
      payment_day: student.payment_day,
      is_minor: student.is_minor,
      address: student.address,
      contract_until_year_end_accepted: student.contract_until_year_end_accepted,
      discount_eligible: student.discount_eligible,
    },
    guardian,
    parq: {
      answers: parq.answers || [],
      has_positive_answer: !!parq.has_positive_answer,
      govbr_signature_requested: false,
    },
    signature: ctx.signature || null,
  };
}

async function regenerateContractBlob() {
  if (!accessState.context) return;
  const payload = buildPdfPayloadFromContext(accessState.context);
  const { fileName, blob } = await window.pdfContract.generateContractPdf(payload);
  clearObjectUrl();
  accessState.objectUrl = URL.createObjectURL(blob);
  accessState.fileName = fileName;
}

async function uploadSignedPdfAndReplace() {
  if (!accessState.objectUrl || !accessState.fileName || !accessState.context) return;
  const response = await fetch(accessState.objectUrl);
  const blob = await response.blob();
  const filePath = `contracts/${accessState.studentId}/SIGNED-${Date.now()}-${accessState.fileName}`;

  const { error: uploadError } = await accessState.client.storage
    .from("parq-pdfs")
    .upload(filePath, blob, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const pdfUrl = `parq-pdfs/${filePath}`;
  const { error: replaceError } = await accessState.client.rpc("set_signed_contract_pdf_by_prefix", {
    p_student_id: accessState.studentId,
    p_parq_response_id: accessState.parqId,
    p_cpf_prefix: accessState.cpfPrefix,
    p_pdf_url: pdfUrl,
  });
  if (replaceError) throw replaceError;
}

function bindContractActions() {
  document.getElementById("open-contract-btn")?.addEventListener("click", () => {
    if (!accessState.objectUrl) return;
    window.open(accessState.objectUrl, "_blank");
  });

  document.getElementById("print-contract-btn")?.addEventListener("click", () => {
    if (!accessState.objectUrl) return;
    const win = window.open(accessState.objectUrl, "_blank");
    if (win) win.addEventListener("load", () => win.print());
  });

  document.getElementById("download-contract-btn")?.addEventListener("click", () => {
    if (!accessState.objectUrl || !accessState.fileName) return;
    const a = document.createElement("a");
    a.href = accessState.objectUrl;
    a.download = accessState.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  document.getElementById("confirm-sign-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("confirm-sign-btn");
    if (!accessState.client || !accessState.studentId || !accessState.parqId || !accessState.cpfPrefix) return;

    btn.disabled = true;
    btn.textContent = "Assinando...";
    setStatus("contract-sign-status", "Registrando assinatura...", "info");
    try {
      const { data, error } = await accessState.client.rpc("sign_contract_by_prefix", {
        p_student_id: accessState.studentId,
        p_parq_response_id: accessState.parqId,
        p_cpf_prefix: accessState.cpfPrefix,
      });
      if (error) throw error;

      accessState.context.signature = {
        method: "click_button",
        signed_at: data.signed_at,
        signer_name: data.signer_name,
        signer_cpf: data.signer_cpf,
      };
      await regenerateContractBlob();
      await uploadSignedPdfAndReplace();

      setStatus("contract-sign-status", "Contrato assinado e substituido no gerenciamento com sucesso.", "success");
      btn.textContent = "Contrato assinado";
      btn.disabled = true;
    } catch (err) {
      setStatus("contract-sign-status", `Falha ao assinar: ${err.message}`, "error");
      btn.textContent = "Assinar contrato";
      btn.disabled = false;
    }
  });
}

async function validateAccess() {
  const input = document.getElementById("cpf-prefix-input");
  const prefix = String(input?.value || "").replace(/\D/g, "");
  if (prefix.length !== 6) {
    setStatus("signature-access-status", "Informe exatamente 6 digitos.", "error");
    return;
  }

  setStatus("signature-access-status", "Validando acesso...", "info");
  try {
    const { data, error } = await accessState.client.rpc("get_contract_sign_context", {
      p_student_id: accessState.studentId,
      p_parq_response_id: accessState.parqId,
      p_cpf_prefix: prefix,
    });
    if (error) throw error;

    accessState.cpfPrefix = prefix;
    accessState.context = data;
    await regenerateContractBlob();

    const area = document.getElementById("contract-access-area");
    area?.classList.remove("hidden");

    const meta = document.getElementById("contract-access-meta");
    const signer = data.expected_signer_name || "-";
    const signed = !!data.signature;
    meta.textContent = `Assinante esperado: ${signer}. Status atual: ${signed ? "ASSINADO" : "NAO ASSINADO"}.`;

    const signBtn = document.getElementById("confirm-sign-btn");
    if (signBtn) {
      if (signed) {
        signBtn.textContent = "Contrato assinado";
        signBtn.disabled = true;
        setStatus("contract-sign-status", "Contrato ja consta como assinado.", "success");
      } else {
        signBtn.textContent = "Assinar contrato";
        signBtn.disabled = false;
        setStatus("contract-sign-status", "Aguardando assinatura.", "info");
      }
    }

    setStatus("signature-access-status", "Acesso validado com sucesso.", "success");
  } catch (err) {
    setStatus("signature-access-status", `Acesso negado: ${err.message}`, "error");
  }
}

function init() {
  const { studentId, parqId } = getQueryParams();
  if (!studentId || !parqId) {
    setStatus("signature-access-status", "Link invalido. Solicite um novo link de assinatura.", "error");
    return;
  }

  accessState.studentId = studentId;
  accessState.parqId = parqId;
  accessState.client = window.supabase.createClient(window.APP_SUPABASE_URL, window.APP_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "sb-academia63-sign-link",
    },
  });

  document.getElementById("validate-access-btn")?.addEventListener("click", validateAccess);
  bindContractActions();
}

document.addEventListener("DOMContentLoaded", init);
