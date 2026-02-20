const LOGO_URL = "assets/images/logo/logo-63.png";
const LOGO_WHITE_URL = "assets/images/logo/logo-63-white.png";
const LOGO_SVG_URL = "assets/images/logo/logo-63.svg";
let logoDataUrlPromise = null;
const THEME = {
  brand: [139, 26, 26], // #8B1A1A
  brandDark: [75, 14, 14],
  text: [30, 30, 30],
  textSoft: [95, 95, 95],
  line: [222, 222, 222],
  panel: [248, 246, 246],
  white: [255, 255, 255],
};

function sanitizeFileName(name) {
  return (name || "aluno")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function boolToLabel(value) {
  return value ? "SIM" : "NAO";
}

function makeContractFileName(fullName) {
  return `CONTRATO-${sanitizeFileName(fullName)}.pdf`;
}

async function loadLogoDataUrl() {
  if (logoDataUrlPromise) return logoDataUrlPromise;

  logoDataUrlPromise = (async () => {
    const pngCandidates = [LOGO_URL, LOGO_WHITE_URL];
    for (const url of pngCandidates) {
      const dataUrl = await readImageAsDataUrl(url);
      if (dataUrl) return dataUrl;
    }

    const svgAsPng = await rasterizeSvgToPngDataUrl(LOGO_SVG_URL, 600, 600);
    if (svgAsPng) return svgAsPng;

    return null;
  })();

  return logoDataUrlPromise;
}

async function readImageAsDataUrl(url) {
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob || blob.size < 32) return null;

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function rasterizeSvgToPngDataUrl(svgUrl, width, height) {
  try {
    const response = await fetch(svgUrl, { cache: "force-cache" });
    if (!response.ok) return null;
    const svgText = await response.text();
    if (!svgText || svgText.length < 32) return null;

    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(svgBlob);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = blobUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    return null;
  }
}

function drawWrappedText(doc, text, x, y, maxWidth = 182, lineHeight = 4.8) {
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function drawBoxTitle(doc, text, y) {
  doc.setFillColor(...THEME.panel);
  doc.roundedRect(12, y - 5.5, 186, 8, 1.5, 1.5, "F");
  doc.setDrawColor(...THEME.line);
  doc.roundedRect(12, y - 5.5, 186, 8, 1.5, 1.5, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...THEME.brandDark);
  doc.text(text, 14, y);
  return y + 6;
}

function drawHeader(doc, logoDataUrl) {
  doc.setFillColor(...THEME.brandDark);
  doc.rect(0, 0, 210, 34, "F");
  doc.setFillColor(...THEME.brand);
  doc.rect(0, 34, 210, 3, "F");

  if (logoDataUrl) {
    doc.setFillColor(...THEME.white);
    doc.roundedRect(12, 6, 24, 24, 1.5, 1.5, "F");
    try {
      doc.addImage(logoDataUrl, "PNG", 15, 9, 18, 18);
    } catch {
      // Se a imagem falhar, o contrato segue sem quebrar a geracao.
    }
  }

  doc.setTextColor(...THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ACADEMIA 63", 42, 14);
  doc.setFontSize(11);
  doc.text("CONTRATO DE PRESTACAO DE SERVICOS", 42, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Centro de Lutas | PAR-Q | Matricula", 42, 26);
}

function drawFooter(doc) {
  doc.setDrawColor(...THEME.line);
  doc.line(12, 284.5, 198, 284.5);
  doc.setFillColor(...THEME.brand);
  doc.rect(12, 285.2, 186, 1.1, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...THEME.textSoft);
  doc.text("Academia 63 - Documento gerado digitalmente", 14, 289.2);
}

async function generateContractPdf(payload) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error("jsPDF nao foi carregado.");
  }

  const logoDataUrl = await loadLogoDataUrl();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = new Date();
  const dateBr = now.toLocaleDateString("pt-BR");
  const fileName = makeContractFileName(payload.student.full_name);

  drawHeader(doc, logoDataUrl);

  let y = 43;
  doc.setTextColor(...THEME.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Data de emissao: ${dateBr}`, 14, y);
  doc.text("Unidade: Volta Redonda/RJ", 140, y);
  y += 6;

  const student = payload.student;

  y = drawBoxTitle(doc, "1. IDENTIFICACAO DO ALUNO", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  [
    `Nome: ${student.full_name || "-"}`,
    `Nascimento: ${student.birth_date || "-"} | Idade: ${student.age ?? "-"}`,
    `RG: ${student.rg || "-"} | CPF: ${student.cpf || "-"}`,
    `Telefone: ${student.phone || "-"} | E-mail: ${student.email || "-"}`,
    `Modalidade: ${student.modality || "-"} | Mensalidade base: R$ ${Number(student.monthly_fee || 0).toFixed(2)}`,
    `Dia de vencimento: ${student.payment_day ?? "-"}`,
    `Endereco: ${student.address || "-"}`,
  ].forEach((line) => {
    doc.text(line, 14, y);
    y += 4.8;
  });
  y += 2;

  if (student.is_minor && payload.guardian) {
    const guardian = payload.guardian;
    y = drawBoxTitle(doc, "2. RESPONSAVEL LEGAL (MENOR DE IDADE)", y);
    [
      `Nome: ${guardian.full_name || "-"}`,
      `CPF: ${guardian.cpf || "-"} | RG: ${guardian.rg || "-"}`,
      `Telefone: ${guardian.phone || "-"} | Parentesco: ${guardian.relationship || "-"}`,
    ].forEach((line) => {
      doc.text(line, 14, y);
      y += 4.8;
    });
    y += 2;
  }

  y = drawBoxTitle(doc, "3. DECLARACAO PAR-Q", y);
  const questions = [
    "Problema cardiaco com recomendacao de supervisao?",
    "Dores no peito durante atividade fisica?",
    "Dores no peito no ultimo mes ao praticar atividade?",
    "Tontura, desequilibrio ou perda de consciencia?",
    "Problema osseo/articular agravado por atividade?",
    "Medicacao para pressao/problema de coracao?",
    "Outra razao para nao praticar atividade fisica?",
  ];
  payload.parq.answers.forEach((answer, idx) => {
    doc.text(`${idx + 1}. ${questions[idx]} ${boolToLabel(answer)}`, 14, y);
    y += 4.8;
  });
  doc.setFont("helvetica", "bold");
  doc.text(
    payload.parq.has_positive_answer ? "Alerta medico: HA respostas SIM no PAR-Q." : "Sem alerta medico no PAR-Q.",
    14,
    y
  );
  doc.setFont("helvetica", "normal");
  y += 7;

  y = drawBoxTitle(doc, "4. CLAUSULAS FINANCEIRAS E CONTRATUAIS", y);
  y = drawWrappedText(
    doc,
    "4.1 A mensalidade base e de R$ 120,00 (cento e vinte reais).",
    14,
    y
  );
  y = drawWrappedText(
    doc,
    "4.2 Havendo aceite contratual ate o final do ano, o valor promocional para pagamento em dia sera de R$ 100,00 (cem reais).",
    14,
    y
  );
  y = drawWrappedText(
    doc,
    "4.3 Apos o vencimento, o desconto deixa de ser aplicado no periodo em atraso, retornando ao valor normal de R$ 120,00.",
    14,
    y
  );
  y = drawWrappedText(
    doc,
    "4.4 Em caso de quebra antecipada do contrato antes do prazo pactuado, o contratante devera restituir integralmente todos os descontos concedidos ate a data da ruptura.",
    14,
    y
  );
  y = drawWrappedText(
    doc,
    "4.5 Em situacao de inadimplencia, poderao ser adotadas medidas de cobranca extrajudicial e judicial, inclusive inclusao em orgaos de protecao ao credito, como SPC e SERASA, observada a legislacao vigente.",
    14,
    y
  );
  y = drawWrappedText(
    doc,
    "4.6 Fica eleito o foro da Comarca de Volta Redonda/RJ para dirimir quaisquer controversias oriundas deste contrato, com renuncia a qualquer outro, por mais privilegiado que seja.",
    14,
    y
  );
  doc.text(
    `Aceite contratual ate fim do ano: ${student.contract_until_year_end_accepted ? "SIM" : "NAO"}`,
    14,
    y
  );
  y += 4.8;
  doc.text(`Elegivel a desconto: ${student.discount_eligible ? "SIM" : "NAO"}`, 14, y);
  y += 7;

  y = drawBoxTitle(doc, "5. ASSINATURAS", y);
  y = drawWrappedText(
    doc,
    "Declaro que li, compreendi e concordo com todas as condicoes acima, assumindo responsabilidade pelas informacoes fornecidas.",
    14,
    y
  );
  doc.text(`Assinatura via GovBR solicitada: ${payload.parq.govbr_signature_requested ? "SIM" : "NAO"}`, 14, y);
  y += 12;

  doc.setDrawColor(30, 30, 30);
  doc.line(14, y, 94, y);
  doc.line(114, y, 196, y);
  doc.setFontSize(9);
  doc.text("Assinatura do Aluno/Responsavel", 14, y + 5);
  doc.text("Data", 114, y + 5);

  drawFooter(doc);

  return {
    fileName,
    blob: doc.output("blob"),
  };
}

async function downloadContractPdf(payload) {
  const { fileName, blob } = await generateContractPdf(payload);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return fileName;
}

window.pdfContract = {
  generateContractPdf,
  downloadContractPdf,
  makeContractFileName,
};
