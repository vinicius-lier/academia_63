const BASE_MONTHLY_FEE = 120;
const DISCOUNT_MONTHLY_FEE = 100;

const contractState = {
  objectUrl: null,
  fileName: null,
  payload: null,
  client: null,
  studentId: null,
  parqResponseId: null,
  signerName: null,
  signerCpf: null,
  signedAt: null,
};

let publicClient = null;

function calculateAge(birthDateValue) {
  if (!birthDateValue) return null;
  const today = new Date();
  const birthDate = new Date(`${birthDateValue}T00:00:00`);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function getRadioBoolean(form, fieldName) {
  const value = form.querySelector(`input[name="${fieldName}"]:checked`)?.value;
  if (value === "sim") return true;
  if (value === "nao") return false;
  return null;
}

function setStatus(message, type) {
  const el = document.getElementById("status-message");
  if (!el) return;
  el.textContent = message;
  el.className = "mt-4 text-sm";
  if (type === "success") {
    el.classList.add("text-green-700");
    return;
  }
  if (type === "error") {
    el.classList.add("text-red-700");
    return;
  }
  el.classList.add("text-gray-600");
}

function toggleGuardianSection(isMinor) {
  const section = document.getElementById("guardian-section");
  if (!section) return;
  section.classList.toggle("hidden", !isMinor);
  const requiredFields = section.querySelectorAll("[data-required-when-minor='true']");
  requiredFields.forEach((field) => {
    field.required = isMinor;
  });
}

function clearContractObjectUrl() {
  if (contractState.objectUrl) {
    URL.revokeObjectURL(contractState.objectUrl);
  }
  contractState.objectUrl = null;
  contractState.fileName = null;
  contractState.payload = null;
  contractState.client = null;
  contractState.studentId = null;
  contractState.parqResponseId = null;
  contractState.signerName = null;
  contractState.signerCpf = null;
  contractState.signedAt = null;
}

function getPublicClient() {
  if (publicClient) return publicClient;
  publicClient = window.supabase.createClient(window.APP_SUPABASE_URL, window.APP_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "sb-academia63-public-anon",
    },
  });
  return publicClient;
}

function createUuid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function showContractActions(show) {
  const panel = document.getElementById("contract-actions");
  if (!panel) return;
  panel.classList.toggle("hidden", !show);
}

function resetSignButton() {
  const signBtn = document.getElementById("sign-contract-btn");
  if (!signBtn) return;
  signBtn.disabled = false;
  signBtn.textContent = "Assinar contrato";
}

function showSignedDownloadArea(show) {
  const area = document.getElementById("signed-download-area");
  if (!area) return;
  area.classList.toggle("hidden", !show);
}

function bindContractActions() {
  const readBtn = document.getElementById("read-contract-btn");
  const printBtn = document.getElementById("print-contract-btn");
  const downloadBtn = document.getElementById("download-contract-btn");
  const downloadSignedBtn = document.getElementById("download-signed-contract-btn");
  const signBtn = document.getElementById("sign-contract-btn");

  readBtn?.addEventListener("click", () => {
    if (!contractState.objectUrl) return;
    window.open(contractState.objectUrl, "_blank");
  });

  printBtn?.addEventListener("click", () => {
    if (!contractState.objectUrl) return;
    const win = window.open(contractState.objectUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  });

  downloadBtn?.addEventListener("click", () => {
    if (!contractState.objectUrl || !contractState.fileName) return;
    const anchor = document.createElement("a");
    anchor.href = contractState.objectUrl;
    anchor.download = contractState.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  });

  downloadSignedBtn?.addEventListener("click", () => {
    if (!contractState.objectUrl || !contractState.fileName) return;
    const anchor = document.createElement("a");
    anchor.href = contractState.objectUrl;
    anchor.download = contractState.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  });

  signBtn?.addEventListener("click", async () => {
    if (!contractState.client || !contractState.payload || !contractState.studentId || !contractState.parqResponseId) {
      setStatus("Nenhum contrato disponivel para assinatura.", "error");
      return;
    }

    signBtn.disabled = true;
    signBtn.textContent = "Assinando...";
    setStatus("Registrando assinatura por clique...", "info");

    try {
      const signedAt = new Date().toISOString();
      const signaturePayload = {
        id: createUuid(),
        student_id: contractState.studentId,
        parq_response_id: contractState.parqResponseId,
        signer_name: contractState.signerName,
        signer_cpf: contractState.signerCpf,
        signature_method: "click_button",
        signed_at: signedAt,
      };

      const { error: signError } = await contractState.client.from("contract_click_signatures").insert(signaturePayload);
      if (signError) throw signError;

      const { error: updateParqSignError } = await contractState.client
        .from("parq_responses")
        .update({
          contract_signed_at: signedAt,
          contract_signer_name: contractState.signerName,
          contract_signer_cpf: contractState.signerCpf,
          contract_signature_method: "click_button",
        })
        .eq("id", contractState.parqResponseId);
      if (updateParqSignError) throw updateParqSignError;

      contractState.signedAt = signedAt;
      const signedPayload = {
        ...contractState.payload,
        signature: {
          method: "click_button",
          signed_at: signedAt,
          signer_name: contractState.signerName,
          signer_cpf: contractState.signerCpf,
        },
      };
      const { fileName, blob } = await window.pdfContract.generateContractPdf(signedPayload);
      if (contractState.objectUrl) URL.revokeObjectURL(contractState.objectUrl);
      contractState.objectUrl = URL.createObjectURL(blob);
      contractState.fileName = fileName;
      contractState.payload = signedPayload;

      setStatus("Contrato assinado por clique com sucesso. PDF atualizado.", "success");
      signBtn.textContent = "Contrato assinado";
      showSignedDownloadArea(true);
    } catch (error) {
      setStatus(`Falha ao assinar contrato: ${error.message}`, "error");
      signBtn.textContent = "Assinar contrato";
      signBtn.disabled = false;
      showSignedDownloadArea(false);
    }
  });
}

async function uploadContractPdf({ client, studentId, fullName, pdfBlob }) {
  const fileName = window.pdfContract.makeContractFileName(fullName);
  const filePath = `contracts/${studentId}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await client.storage.from("parq-pdfs").upload(filePath, pdfBlob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const pdfUrlValue = `parq-pdfs/${filePath}`;
  return { filePath, pdfUrlValue };
}

async function insertStudentWithFallback(client, studentPayload) {
  let insertAttempt = await client.from("students").insert(studentPayload);
  if (!insertAttempt.error) return insertAttempt;

  const message = insertAttempt.error.message || "";
  const missingContractCols =
    message.includes("contract_until_year_end_accepted") || message.includes("discount_eligible");

  if (!missingContractCols) {
    return insertAttempt;
  }

  const payloadFallback = { ...studentPayload };
  delete payloadFallback.contract_until_year_end_accepted;
  delete payloadFallback.discount_eligible;

  insertAttempt = await client.from("students").insert(payloadFallback);
  return insertAttempt;
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  if (!window.supabase || !window.APP_SUPABASE_URL || !window.APP_SUPABASE_ANON_KEY) {
    setStatus("Cliente Supabase nao inicializado.", "error");
    return;
  }
  const client = getPublicClient();

  const birthDate = form.birth_date.value;
  const age = calculateAge(birthDate);
  const isMinor = age !== null && age < 18;
  const contractAccepted = getRadioBoolean(form, "contract_until_year_end_accepted");

  const questions = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];
  const answers = {};
  const answersArray = [];
  for (const q of questions) {
    const value = getRadioBoolean(form, q);
    if (value === null) {
      setStatus("Responda todas as perguntas do PAR-Q.", "error");
      return;
    }
    answers[q] = value;
    answersArray.push(value);
  }

  if (contractAccepted === null) {
    setStatus("Informe se aceita o contrato ate o fim do ano.", "error");
    return;
  }

  if (!form.reportValidity()) return;

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";
  setStatus("Salvando inscricao...", "info");
  showContractActions(false);
  showSignedDownloadArea(false);
  clearContractObjectUrl();
  resetSignButton();

  try {
    const currentYear = new Date().getFullYear();
    const contractPolicyText = contractAccepted
      ? `Contrato aceito ate 31/12/${currentYear}. Mensalidade promocional de R$ ${DISCOUNT_MONTHLY_FEE},00 para pagamento em dia; apos vencimento volta para R$ ${BASE_MONTHLY_FEE},00. Quebra antecipada exige devolucao de todos os descontos concedidos. Foro: Comarca de Volta Redonda/RJ. Possivel negativacao em SPC/SERASA em caso de inadimplencia, conforme lei.`
      : `Contrato nao aceito. Sem elegibilidade a desconto; mensalidade em R$ ${BASE_MONTHLY_FEE},00.`;

    const studentId = createUuid();
    const studentPayload = {
      id: studentId,
      full_name: form.full_name.value.trim(),
      birth_date: birthDate,
      rg: form.rg.value.trim() || null,
      cpf: form.cpf.value.trim() || null,
      phone: form.phone.value.trim() || null,
      email: form.email.value.trim() || null,
      modality: form.modality.value,
      monthly_fee: BASE_MONTHLY_FEE,
      payment_day: form.payment_day.value ? Number(form.payment_day.value) : null,
      is_minor: isMinor,
      address: form.address.value.trim() || null,
      notes: [form.notes.value.trim(), contractPolicyText].filter(Boolean).join(" | "),
      contract_until_year_end_accepted: contractAccepted,
      discount_eligible: contractAccepted,
    };

    const { error: studentError } = await insertStudentWithFallback(client, studentPayload);
    if (studentError) throw studentError;

    if (isMinor) {
      const guardianPayload = {
        student_id: studentId,
        full_name: form.guardian_full_name.value.trim(),
        cpf: form.guardian_cpf.value.trim() || null,
        rg: form.guardian_rg.value.trim() || null,
        phone: form.guardian_phone.value.trim() || null,
        relationship: form.guardian_relationship.value.trim() || null,
      };
      const { error: guardianError } = await client.from("guardians").insert(guardianPayload);
      if (guardianError) throw guardianError;
    }

    let uploadedPdfPath = null;
    let pdfUrlValue = null;
    if (contractAccepted && window.pdfContract?.generateContractPdf) {
      const contractPayload = {
        student: {
          full_name: studentPayload.full_name,
          birth_date: studentPayload.birth_date,
          age,
          rg: studentPayload.rg,
          cpf: studentPayload.cpf,
          phone: studentPayload.phone,
          email: studentPayload.email,
          modality: studentPayload.modality,
          monthly_fee: studentPayload.monthly_fee,
          payment_day: studentPayload.payment_day,
          is_minor: studentPayload.is_minor,
          address: studentPayload.address,
          contract_until_year_end_accepted: contractAccepted,
          discount_eligible: contractAccepted,
          contract_policy_text: contractPolicyText,
          discounted_monthly_fee: contractAccepted ? DISCOUNT_MONTHLY_FEE : null,
        },
        guardian: isMinor
          ? {
              full_name: form.guardian_full_name.value.trim(),
              cpf: form.guardian_cpf.value.trim() || null,
              rg: form.guardian_rg.value.trim() || null,
              phone: form.guardian_phone.value.trim() || null,
              relationship: form.guardian_relationship.value.trim() || null,
            }
          : null,
        parq: {
          answers: answersArray,
          has_positive_answer: answersArray.some(Boolean),
          govbr_signature_requested: false,
        },
      };

      const { fileName, blob } = await window.pdfContract.generateContractPdf(contractPayload);
      contractState.objectUrl = URL.createObjectURL(blob);
      contractState.fileName = fileName;
      contractState.payload = contractPayload;
      contractState.client = client;
      contractState.studentId = studentId;
      contractState.signerName = isMinor
        ? form.guardian_full_name.value.trim()
        : studentPayload.full_name;
      contractState.signerCpf = isMinor
        ? form.guardian_cpf.value.trim() || null
        : studentPayload.cpf;

      const uploadResult = await uploadContractPdf({
        client,
        studentId,
        fullName: studentPayload.full_name,
        pdfBlob: blob,
      });
      uploadedPdfPath = uploadResult.filePath;
      pdfUrlValue = uploadResult.pdfUrlValue;
      showContractActions(true);
      resetSignButton();
      showSignedDownloadArea(false);
    }

    const parqPayload = {
      id: createUuid(),
      student_id: studentId,
      ...answers,
      responsibility_term_accepted: form.responsibility_term_accepted.checked,
      govbr_signature_requested: false,
      pdf_url: pdfUrlValue,
    };
    const { error: parqError } = await client.from("parq_responses").insert(parqPayload);
    if (parqError) throw parqError;
    contractState.parqResponseId = parqPayload.id;

    form.reset();
    toggleGuardianSection(false);
    document.getElementById("age_display").value = "";
    form.monthly_fee.value = BASE_MONTHLY_FEE;

    if (contractAccepted) {
      let msg = "Inscricao enviada. Contrato gerado para leitura, assinatura por clique ou impressao.";
      if (uploadedPdfPath) msg += ` Arquivo salvo em: ${uploadedPdfPath}`;
      setStatus(msg, "success");
    } else {
      setStatus("Inscricao enviada sem contrato. Sem elegibilidade a desconto.", "success");
    }
  } catch (error) {
    clearContractObjectUrl();
    showContractActions(false);
    setStatus(`Erro ao enviar inscricao: ${error.message}`, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar inscricao";
  }
}

function setupForm() {
  const form = document.getElementById("inscricao-form");
  if (!form) return;

  const birthField = form.birth_date;
  const ageField = document.getElementById("age_display");
  form.monthly_fee.value = BASE_MONTHLY_FEE;

  birthField.addEventListener("change", () => {
    const age = calculateAge(birthField.value);
    ageField.value = age === null ? "" : String(age);
    toggleGuardianSection(age !== null && age < 18);
  });

  bindContractActions();
  showContractActions(false);
  showSignedDownloadArea(false);
  form.addEventListener("submit", handleSubmit);
}

document.addEventListener("DOMContentLoaded", setupForm);
