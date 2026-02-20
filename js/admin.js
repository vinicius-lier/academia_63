const state = {
  client: null,
  user: null,
  students: [],
  selectedStudent: null,
  guardians: [],
  parq: [],
  documents: [],
};

function setAdminStatus(message, type = "info") {
  const el = document.getElementById("admin-status");
  if (!el) return;
  el.textContent = message;
  el.className = "text-sm";
  if (type === "error") {
    el.classList.add("text-red-700");
  } else if (type === "success") {
    el.classList.add("text-green-700");
  } else {
    el.classList.add("text-gray-600");
  }
}

function createAuthClient() {
  if (window.__adminClient) return window.__adminClient;
  window.__adminClient = window.supabase.createClient(window.APP_SUPABASE_URL, window.APP_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "sb-academia63-admin-auth",
    },
  });
  return window.__adminClient;
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderStudentsList() {
  const container = document.getElementById("students-list");
  if (!container) return;

  if (!state.students.length) {
    container.innerHTML = '<p class="p-3 text-sm text-gray-600">Nenhum aluno encontrado.</p>';
    return;
  }

  container.innerHTML = state.students
    .map((student) => {
      const selected = state.selectedStudent?.id === student.id;
      const rowClass = selected ? "bg-red-50" : "";
      return `
        <button data-student-id="${student.id}" class="w-full text-left p-3 hover:bg-gray-50 ${rowClass}">
          <div class="font-medium">${escapeHtml(student.full_name)}</div>
          <div class="text-xs text-gray-500">Cadastro: ${formatDate(student.created_at)}</div>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll("button[data-student-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-student-id");
      const student = state.students.find((s) => s.id === id);
      if (!student) return;
      state.selectedStudent = student;
      renderStudentsList();
      await loadStudentDetails(student.id);
    });
  });
}

function renderStudentDetails() {
  const container = document.getElementById("student-details");
  const notes = document.getElementById("admin-notes");
  if (!container || !notes) return;

  const student = state.selectedStudent;
  if (!student) {
    container.textContent = "Selecione um aluno.";
    notes.value = "";
    return;
  }

  const guardian = state.guardians[0];
  container.innerHTML = `
    <div class="grid md:grid-cols-2 gap-2">
      <div><strong>Nome:</strong> ${escapeHtml(student.full_name)}</div>
      <div><strong>Nascimento:</strong> ${formatDate(student.birth_date)}</div>
      <div><strong>RG:</strong> ${escapeHtml(student.rg || "-")}</div>
      <div><strong>CPF:</strong> ${escapeHtml(student.cpf || "-")}</div>
      <div><strong>Telefone:</strong> ${escapeHtml(student.phone || "-")}</div>
      <div><strong>E-mail:</strong> ${escapeHtml(student.email || "-")}</div>
      <div><strong>Modalidade:</strong> ${escapeHtml(student.modality || "-")}</div>
      <div><strong>Mensalidade:</strong> ${student.monthly_fee ?? "-"}</div>
      <div><strong>Dia pagamento:</strong> ${student.payment_day ?? "-"}</div>
      <div><strong>Contrato ate fim do ano:</strong> ${student.contract_until_year_end_accepted ? "Sim" : "Nao"}</div>
      <div><strong>Elegivel a desconto:</strong> ${student.discount_eligible ? "Sim" : "Nao"}</div>
      <div><strong>Menor de idade:</strong> ${student.is_minor ? "Sim" : "Nao"}</div>
      <div class="md:col-span-2"><strong>Endereco:</strong> ${escapeHtml(student.address || "-")}</div>
    </div>
    ${
      guardian
        ? `
      <div class="mt-3 pt-3 border-t border-gray-200">
        <p><strong>Responsavel:</strong> ${escapeHtml(guardian.full_name)}</p>
        <p><strong>CPF/RG:</strong> ${escapeHtml(guardian.cpf || "-")} / ${escapeHtml(guardian.rg || "-")}</p>
        <p><strong>Telefone:</strong> ${escapeHtml(guardian.phone || "-")}</p>
        <p><strong>Parentesco:</strong> ${escapeHtml(guardian.relationship || "-")}</p>
      </div>
    `
        : ""
    }
  `;

  notes.value = student.notes || "";
}

function renderParqHistory() {
  const container = document.getElementById("parq-history");
  if (!container) return;

  if (!state.parq.length) {
    container.textContent = "Nenhum PAR-Q para este aluno.";
    return;
  }

  container.innerHTML = state.parq
    .map((row, idx) => {
      const answers = [row.q1, row.q2, row.q3, row.q4, row.q5, row.q6, row.q7]
        .map((v, i) => `Q${i + 1}: ${v ? "SIM" : "NAO"}`)
        .join(" | ");
      return `
        <div class="border border-gray-200 rounded-sm p-3 ${idx ? "mt-2" : ""}">
          <div><strong>Data:</strong> ${formatDate(row.submitted_at)}</div>
          <div><strong>Alerta medico:</strong> ${row.has_positive_answer ? "SIM" : "NAO"}</div>
          <div class="text-xs mt-1">${answers}</div>
          <div class="text-xs mt-1"><strong>PDF:</strong> ${escapeHtml(row.pdf_url || "nao vinculado")}</div>
        </div>
      `;
    })
    .join("");
}

async function createSignedUrl(bucket, path) {
  const { data, error } = await state.client.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

function parseStoredPdfPath(pdfUrl) {
  if (!pdfUrl) return null;
  const parts = pdfUrl.split("/");
  if (parts.length < 2) return null;
  const bucket = parts.shift();
  const path = parts.join("/");
  return { bucket, path };
}

function buildFallbackPayload() {
  const student = state.selectedStudent;
  const latestParq = state.parq[0];
  if (!student || !latestParq) return null;
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
    guardian: state.guardians[0] || null,
    parq: {
      answers: [latestParq.q1, latestParq.q2, latestParq.q3, latestParq.q4, latestParq.q5, latestParq.q6, latestParq.q7],
      has_positive_answer: latestParq.has_positive_answer,
      govbr_signature_requested: latestParq.govbr_signature_requested,
    },
  };
}

async function viewOrPrintContract(printMode) {
  const latestParq = state.parq[0];
  if (!latestParq) {
    setAdminStatus("Sem registro PAR-Q para este aluno.", "error");
    return;
  }

  const parsed = parseStoredPdfPath(latestParq.pdf_url);
  if (!parsed) {
    setAdminStatus("Aluno sem pdf_url. Use o PDF fallback.", "error");
    return;
  }

  try {
    const signedUrl = await createSignedUrl(parsed.bucket, parsed.path);
    const win = window.open(signedUrl, "_blank");
    if (printMode && win) {
      win.addEventListener("load", () => win.print());
    }
    setAdminStatus("Contrato aberto com sucesso.", "success");
  } catch (error) {
    setAdminStatus(`Falha ao abrir contrato: ${error.message}`, "error");
  }
}

function renderDocuments() {
  const container = document.getElementById("docs-list");
  if (!container) return;

  if (!state.documents.length) {
    container.textContent = "Nenhum documento para este aluno.";
    return;
  }

  container.innerHTML = state.documents
    .map((doc, idx) => {
      const safeName = escapeHtml(doc.file_name);
      return `
        <div class="${idx ? "mt-2" : ""}">
          <button data-doc-id="${doc.id}" class="underline text-blue-700 hover:text-blue-900">
            ${safeName}
          </button>
          <span class="text-xs text-gray-500">(${doc.doc_type})</span>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("button[data-doc-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-doc-id");
      const doc = state.documents.find((d) => d.id === id);
      if (!doc) return;
      try {
        const signedUrl = await createSignedUrl("student-documents", doc.file_path);
        window.open(signedUrl, "_blank");
      } catch (error) {
        setAdminStatus(`Falha ao abrir documento: ${error.message}`, "error");
      }
    });
  });
}

async function loadStudentDetails(studentId) {
  setAdminStatus("Carregando dados do aluno...");
  const [guardiansRes, parqRes, docsRes] = await Promise.all([
    state.client.from("guardians").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
    state.client.from("parq_responses").select("*").eq("student_id", studentId).order("submitted_at", { ascending: false }),
    state.client.from("student_documents").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
  ]);

  if (guardiansRes.error || parqRes.error || docsRes.error) {
    const err = guardiansRes.error || parqRes.error || docsRes.error;
    setAdminStatus(`Falha ao carregar detalhes: ${err.message}`, "error");
    return;
  }

  state.guardians = guardiansRes.data || [];
  state.parq = parqRes.data || [];
  state.documents = docsRes.data || [];

  renderStudentDetails();
  renderParqHistory();
  renderDocuments();
  setAdminStatus("Dados carregados.", "success");
}

async function searchStudents() {
  const query = document.getElementById("search-input")?.value?.trim() || "";
  setAdminStatus("Buscando alunos...");

  let req = state.client.from("students").select("*").order("created_at", { ascending: false }).limit(100);
  if (query) {
    req = req.ilike("full_name", `%${query}%`);
  }

  const { data, error } = await req;
  if (error) {
    setAdminStatus(`Falha na busca: ${error.message}`, "error");
    return;
  }

  state.students = data || [];
  if (state.selectedStudent) {
    const refreshedSelected = state.students.find((s) => s.id === state.selectedStudent.id);
    state.selectedStudent = refreshedSelected || null;
  }
  renderStudentsList();
  setAdminStatus(`${state.students.length} aluno(s) encontrado(s).`, "success");
}

async function saveNotes() {
  if (!state.selectedStudent) {
    setAdminStatus("Selecione um aluno para editar observacoes.", "error");
    return;
  }

  const notesValue = document.getElementById("admin-notes")?.value || null;
  const { error } = await state.client
    .from("students")
    .update({ notes: notesValue })
    .eq("id", state.selectedStudent.id);

  if (error) {
    setAdminStatus(`Falha ao salvar observacoes: ${error.message}`, "error");
    return;
  }

  state.selectedStudent.notes = notesValue;
  setAdminStatus("Observacoes atualizadas.", "success");
}

function sanitizeNamePart(value) {
  return String(value || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function uploadDocument() {
  if (!state.selectedStudent) {
    setAdminStatus("Selecione um aluno para upload.", "error");
    return;
  }

  const typeEl = document.getElementById("doc-type");
  const fileEl = document.getElementById("doc-file");
  const file = fileEl?.files?.[0];
  if (!file || !typeEl?.value) {
    setAdminStatus("Selecione tipo e arquivo para upload.", "error");
    return;
  }

  const safeName = sanitizeNamePart(file.name);
  const filePath = `${state.selectedStudent.id}/${Date.now()}-${safeName}`;
  setAdminStatus("Enviando documento...");

  const { error: uploadError } = await state.client.storage.from("student-documents").upload(filePath, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) {
    setAdminStatus(`Falha no upload: ${uploadError.message}`, "error");
    return;
  }

  const { error: insertError } = await state.client.from("student_documents").insert({
    student_id: state.selectedStudent.id,
    doc_type: typeEl.value,
    file_name: file.name,
    file_path: filePath,
    mime_type: file.type || null,
    size_bytes: file.size || null,
    uploaded_by: state.user.id,
  });
  if (insertError) {
    setAdminStatus(`Upload feito, mas falhou no registro: ${insertError.message}`, "error");
    return;
  }

  fileEl.value = "";
  await loadStudentDetails(state.selectedStudent.id);
  setAdminStatus("Documento enviado com sucesso.", "success");
}

function bindActions() {
  document.getElementById("search-btn")?.addEventListener("click", searchStudents);
  document.getElementById("search-input")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchStudents();
    }
  });
  document.getElementById("save-notes-btn")?.addEventListener("click", saveNotes);
  document.getElementById("upload-doc-btn")?.addEventListener("click", uploadDocument);
  document.getElementById("view-contract-btn")?.addEventListener("click", () => viewOrPrintContract(false));
  document.getElementById("print-contract-btn")?.addEventListener("click", () => viewOrPrintContract(true));
  document.getElementById("fallback-pdf-btn")?.addEventListener("click", async () => {
    const payload = buildFallbackPayload();
    if (!payload) {
      setAdminStatus("Nao ha dados suficientes para gerar fallback.", "error");
      return;
    }
    try {
      await window.pdfContract.downloadContractPdf(payload);
      setAdminStatus("PDF fallback gerado com sucesso.", "success");
    } catch (error) {
      setAdminStatus(`Falha ao gerar fallback: ${error.message}`, "error");
    }
  });
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await state.client.auth.signOut();
    window.location.href = "login.html";
  });
}

async function enforceAdminSession() {
  state.client = createAuthClient();
  const { data, error } = await state.client.auth.getUser();
  if (error || !data.user) {
    window.location.href = "login.html";
    return false;
  }
  state.user = data.user;

  const { data: isAdmin, error: adminError } = await state.client.rpc("is_admin");
  if (adminError || !isAdmin) {
    await state.client.auth.signOut();
    window.location.href = "login.html";
    return false;
  }

  return true;
}

async function init() {
  const ok = await enforceAdminSession();
  if (!ok) return;
  bindActions();
  await searchStudents();
}

document.addEventListener("DOMContentLoaded", init);
