/**
 * Gerador e Exportador de PDF para o Emanus Chat
 * Permite descarregar diretamente como PDF (.pdf) ou imprimir com layout A4 profissional.
 */

export interface ExportPdfOptions {
  title?: string;
  subject: string;
  messages: Array<{
    role: "user" | "model";
    parts: Array<{ text?: string }>;
  }>;
  studentName?: string;
  studentGrade?: string;
  studentCourse?: string;
}

/**
 * Converte Markdown simples para HTML limpo para o documento de impressão/PDF
 */
function markdownToHtml(text: string): string {
  if (!text) return "";

  // Escapar HTML básico
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Blocos de código ```codigo```
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre class="code-block"><code>${code.trim()}</code></pre>`;
  });

  // Código inline `codigo`
  html = html.replace(/`([^`]+)`/g, `<code class="inline-code">$1</code>`);

  // Títulos # ## ###
  html = html.replace(/^### (.*$)/gim, `<h3>$1</h3>`);
  html = html.replace(/^## (.*$)/gim, `<h2>$1</h2>`);
  html = html.replace(/^# (.*$)/gim, `<h1>$1</h1>`);

  // Negrito **texto**
  html = html.replace(/\*\*([^*]+)\*\*/g, `<strong>$1</strong>`);

  // Itálico *texto*
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, `<em>$1</em>`);

  // Listas não ordenadas
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, `<li>$1</li>`);
  html = html.replace(/(<li>.*<\/li>)/gim, `<ul>$1</ul>`);
  // Unir <ul> adjacentes
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Linhas horizontais
  html = html.replace(/^---$/gim, `<hr />`);

  // Parágrafos e quebras de linha
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h1") ||
        trimmed.startsWith("<h2") ||
        trimmed.startsWith("<h3") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<hr")
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}

/**
 * Cria e descarrega um ficheiro PDF usando a renderização nativa de alta fidelidade
 */
export function exportChatToPdf(options: ExportPdfOptions) {
  const {
    title = "Sessão de Estudo",
    subject = "Geral",
    messages = [],
    studentName = "Estudante",
    studentGrade = "",
    studentCourse = "",
  } = options;

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedMessages = messages
    .map((msg, index) => {
      const textPart = msg.parts.find((p) => p.text)?.text || "";
      if (!textPart.trim()) return "";

      const isUser = msg.role === "user";
      const senderName = isUser ? studentName || "Pergunta do Estudante" : "Emanus IA — Professor";
      const bubbleClass = isUser ? "user-bubble" : "ai-bubble";
      const iconBadge = isUser ? "👤" : "✨";

      return `
        <div class="message-wrapper ${isUser ? "msg-user" : "msg-ai"}">
          <div class="message-header">
            <span class="sender-badge">${iconBadge} ${senderName}</span>
            <span class="msg-num">#${index + 1}</span>
          </div>
          <div class="message-content ${bubbleClass}">
            ${markdownToHtml(textPart)}
          </div>
        </div>
      `;
    })
    .filter(Boolean)
    .join("\n");

  const printHtml = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>${title} — Emanus IA</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 15mm;
      @bottom-right {
        content: counter(page) "/" counter(pages);
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.6;
    }

    /* Cabeçalho Oficial Emanus IA */
    .doc-header {
      border-bottom: 2px solid #00C896;
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-badge {
      width: 44px;
      height: 44px;
      background: #00C896;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0b0f17;
      font-weight: 900;
      font-size: 20px;
    }

    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #0b0f17;
      margin: 0;
      line-height: 1.2;
    }

    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 0 0;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .doc-meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }

    .meta-subject {
      display: inline-block;
      background: #e6f9f4;
      color: #008765;
      font-weight: 700;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #a3ebd8;
      margin-bottom: 4px;
    }

    .meta-date {
      color: #94a3b8;
    }

    /* Banner do Caderno de Estudo */
    .study-title-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #00C896;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 25px;
    }

    .study-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .study-details {
      font-size: 11px;
      color: #64748b;
      margin: 0;
      display: flex;
      gap: 15px;
    }

    /* Mensagens */
    .messages-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .message-wrapper {
      page-break-inside: avoid;
      margin-bottom: 18px;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-size: 11px;
    }

    .sender-badge {
      font-weight: 700;
      color: #334155;
    }

    .msg-user .sender-badge {
      color: #0284c7;
    }

    .msg-ai .sender-badge {
      color: #008765;
    }

    .msg-num {
      color: #cbd5e1;
      font-weight: 600;
      font-size: 10px;
    }

    .message-content {
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 12.5px;
      line-height: 1.65;
    }

    .user-bubble {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #14532d;
      font-weight: 500;
    }

    .ai-bubble {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      color: #1e293b;
    }

    /* Estilos de Conteúdo Markdown */
    h1, h2, h3 {
      color: #0f172a;
      margin-top: 14px;
      margin-bottom: 6px;
      font-weight: 700;
    }
    h1 { font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    h2 { font-size: 14px; color: #008765; }
    h3 { font-size: 13px; }

    p { margin: 0 0 10px 0; }
    p:last-child { margin-bottom: 0; }

    ul {
      margin: 8px 0 12px 20px;
      padding: 0;
    }

    li {
      margin-bottom: 4px;
    }

    strong {
      color: #0f172a;
      font-weight: 700;
    }

    em {
      color: #475569;
    }

    .inline-code {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      font-family: Consolas, Monaco, monospace;
      font-size: 11px;
    }

    .code-block {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      font-family: Consolas, Monaco, monospace;
      font-size: 11px;
      overflow-x: auto;
      margin: 10px 0;
      line-height: 1.45;
    }

    hr {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 16px 0;
    }

    /* Rodapé */
    .doc-footer {
      margin-top: 35px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
      page-break-inside: avoid;
    }

    .footer-warning {
      font-size: 9.5px;
      color: #94a3b8;
      font-style: italic;
    }

    @media print {
      body {
        margin: 0;
        background: transparent;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Cabeçalho -->
  <div class="doc-header">
    <div class="brand-section">
      <div class="logo-badge">E</div>
      <div>
        <h1 class="brand-title">Emanus IA</h1>
        <p class="brand-subtitle">O teu professor particular inteligente</p>
      </div>
    </div>
    <div class="doc-meta">
      <div class="meta-subject">${subject}</div>
      <div class="meta-date">${dateStr}</div>
    </div>
  </div>

  <!-- Bloco com Título e Dados do Estudante -->
  <div class="study-title-box">
    <div class="study-title">${title}</div>
    <div class="study-details">
      <span><strong>Disciplina:</strong> ${subject}</span>
      ${studentGrade ? `<span><strong>Classe:</strong> ${studentGrade}</span>` : ""}
      ${studentCourse ? `<span><strong>Curso:</strong> ${studentCourse}</span>` : ""}
      <span><strong>Total de Interações:</strong> ${messages.length}</span>
    </div>
  </div>

  <!-- Lista de Mensagens / Respostas -->
  <div class="messages-container">
    ${formattedMessages}
  </div>

  <!-- Rodapé -->
  <div class="doc-footer">
    <div>
      <strong>Emanus IA</strong> — Plataforma Educacional de Inteligência Artificial para Angola | <em>emanus-ia.vercel.app</em>
    </div>
    <div class="footer-warning">
      Documento gerado para fins de estudo e revisão.
    </div>
  </div>

  <script>
    window.onload = function() {
      // Auto-disparar diálogo de impressão / salvar em PDF
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  // Abrir janela de impressão dedicada
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    // Fallback: usar iframe oculto caso popups estejam bloqueados
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 3000);
      }, 500);
    }
  }
}

/**
 * Exporta uma única resposta do Emanus IA como ficha de estudo em PDF
 */
export function exportSingleMessageToPdf(
  text: string,
  subject: string,
  studentGrade?: string
) {
  exportChatToPdf({
    title: `Ficha de Estudo — ${subject}`,
    subject,
    messages: [
      {
        role: "model",
        parts: [{ text }],
      },
    ],
    studentGrade,
  });
}
