const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const previewEl = document.getElementById("preview");
const previewBtn = document.getElementById("previewBtn");
const csvBtn = document.getElementById("csvBtn");
const jsonBtn = document.getElementById("jsonBtn");
const mdBtn = document.getElementById("mdBtn");
const pdfBtn = document.getElementById("pdfBtn");
const formattedToggle = document.getElementById("formattedToggle");
const crawlSpeed = document.getElementById("crawlSpeed");

const CHATGPT_HOSTS = ["chatgpt.com", "chat.openai.com"];

const CRAWL_SPEED_PROFILES = {
  safe: {
    label: "Safe verified",
    maxSteps: 760,
    delayMs: 420,
    stepRatio: 1.1,
    settleChecks: 3,
    settleDelayMs: 120,
    topStablePasses: 2,
    verifyPasses: 12,
    verifyDelayMs: 240,
    verifyWheelBursts: 5
  },
  balanced: {
    label: "Balanced verified",
    maxSteps: 620,
    delayMs: 180,
    stepRatio: 1.65,
    settleChecks: 2,
    settleDelayMs: 70,
    topStablePasses: 2,
    verifyPasses: 8,
    verifyDelayMs: 160,
    verifyWheelBursts: 4
  },
  fast: {
    label: "Fast verified",
    maxSteps: 520,
    delayMs: 90,
    stepRatio: 2.4,
    settleChecks: 2,
    settleDelayMs: 45,
    topStablePasses: 2,
    verifyPasses: 7,
    verifyDelayMs: 110,
    verifyWheelBursts: 4
  },
  turbo: {
    label: "Turbo verified",
    maxSteps: 420,
    delayMs: 35,
    stepRatio: 3.2,
    settleChecks: 1,
    settleDelayMs: 25,
    topStablePasses: 2,
    verifyPasses: 5,
    verifyDelayMs: 80,
    verifyWheelBursts: 3
  }
};

function getCrawlOptions() {
  const selectedSpeed = crawlSpeed?.value || "balanced";
  return CRAWL_SPEED_PROFILES[selectedSpeed] || CRAWL_SPEED_PROFILES.balanced;
}


function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "#202123";
}

function setLoading(isLoading) {
  previewBtn.disabled = isLoading;
  csvBtn.disabled = isLoading;
  jsonBtn.disabled = isLoading;
  if (mdBtn) mdBtn.disabled = isLoading;
  pdfBtn.disabled = isLoading;
  if (crawlSpeed) crawlSpeed.disabled = isLoading;
  if (formattedToggle) formattedToggle.disabled = isLoading;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isChatGPTUrl(urlString = "") {
  try {
    const url = new URL(urlString);
    return CHATGPT_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

async function requestExportData() {
  const tab = await getActiveTab();
  const crawlOptions = getCrawlOptions();
  if (!tab?.id || !isChatGPTUrl(tab.url)) {
    throw new Error("Please open a ChatGPT conversation tab first.");
  }

  let response;

  try {
    response = await chrome.tabs.sendMessage(tab.id, { type: "GET_CHATGPT_MESSAGES", options: crawlOptions });
  } catch (error) {
    // Existing tabs often do not have the content script attached after installing/reloading
    // the extension. Inject it on demand, then try the message again.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    response = await chrome.tabs.sendMessage(tab.id, { type: "GET_CHATGPT_MESSAGES", options: crawlOptions });
  }

  if (!response?.ok) {
    throw new Error(response?.error || "Could not read messages from this page.");
  }

  return {
    messages: response.messages || [],
    metadata: response.metadata || getFallbackMetadata(tab.title)
  };
}

function getFallbackMetadata(title = "ChatGPT Conversation") {
  const pageTitle = formatContent(title || "ChatGPT Conversation");
  const cleanedTitle = pageTitle
    .replace(/\s+\|\s+ChatGPT$/i, "")
    .replace(/\s+-\s+ChatGPT$/i, "")
    .replace(/^ChatGPT\s*-\s*/i, "")
    .trim() || "ChatGPT Conversation";

  const dashIndex = cleanedTitle.indexOf(" - " );
  if (dashIndex !== -1) {
    const projectName = cleanedTitle.slice(0, dashIndex).trim();
    const chatName = cleanedTitle.slice(dashIndex + 3).trim();
    if (projectName && chatName) {
      return { pageTitle, projectName, chatName, isProjectChat: true };
    }
  }

  return { pageTitle, projectName: "", chatName: cleanedTitle, isProjectChat: false };
}

function downloadFile(filename, mimeType, content, { addBom = false } = {}) {
  // A UTF-8 BOM helps Excel and some spreadsheet tools read smart punctuation correctly.
  const blobParts = addBom ? ["\ufeff", content] : [content];
  const blob = new Blob(blobParts, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeFilenamePart(value) {
  return formatContent(value || "chatgpt-export")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "chatgpt-export";
}

function buildFilename(metadata, extension) {
  const nameParts = metadata?.projectName
    ? [metadata.projectName, metadata.chatName]
    : [metadata?.chatName || "ChatGPT Conversation"];
  const base = nameParts.map(safeFilenamePart).filter(Boolean).join(" - ");
  return `${base}-${getTimestamp()}.${extension}`;
}

function repairMojibake(value) {
  return String(value ?? "")
    // Smart punctuation that was UTF-8 but got decoded as Windows-1252/Latin-1.
    .replaceAll("â€™", "'")
    .replaceAll("â€˜", "'")
    .replaceAll("â€œ", '"')
    .replaceAll("â€�", '"')
    .replaceAll("â€“", "-")
    .replaceAll("â€”", "--")
    .replaceAll("â€¦", "...")
    .replaceAll("Â ", " ")
    .replaceAll("Â", "");
}

function formatContent(value) {
  return repairMojibake(value)
    // Convert accidental literal newline escapes from DOM extraction into real line breaks.
    .replace(/\\n\\/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getPreparedMessages(messages) {
  if (!formattedToggle?.checked) {
    return messages.map((message) => ({ ...message }));
  }

  return messages.map((message) => ({
    ...message,
    content: formatContent(message.content),
    markdown: message.markdown ? formatContent(message.markdown) : "",
    html: message.html ? repairMojibake(message.html).replace(/\\n\\/g, "\n").replace(/\\n/g, "\n") : ""
  }));
}

function escapeCsv(value) {
  const safeValue = String(value ?? "");
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function padNumber(value, width = 3) {
  return String(value).padStart(width, "0");
}

function getLocalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getMessageContentForArchive(message) {
  // Prefer Markdown reconstructed from the ChatGPT DOM so code blocks, links,
  // lists, and headings remain useful when imported into a new workspace.
  const markdown = message.markdown || "";
  return markdown.trim() ? markdown : (message.content || "");
}

function buildConversationArchive(messages, metadata) {
  const exportedAt = new Date().toISOString();
  const title = metadata?.chatName || "ChatGPT Conversation";
  const sourceUrl = metadata?.sourceUrl || null;
  const archiveMessages = messages.map((message, index) => ({
    id: `msg-${padNumber(index + 1)}`,
    index: index + 1,
    role: message.role === "assistant" ? "assistant" : message.role,
    createdAt: message.createdAt || null,
    content: getMessageContentForArchive(message)
  }));

  const conversation = {
    id: "chat-001",
    index: 1,
    title,
    createdAt: metadata?.createdAt || null,
    updatedAt: metadata?.updatedAt || null,
    sourceUrl,
    tags: ["chrome-extension", "export", "chatgpt"],
    summary: "",
    messages: archiveMessages
  };

  return {
    schemaVersion: "1.0",
    source: "ChatGPT",
    exportType: "workspace_project_transfer",
    projectName: metadata?.projectName || "",
    chatName: title,
    pageTitle: metadata?.pageTitle || "",
    isProjectChat: Boolean(metadata?.isProjectChat),
    exportedAt,
    timezone: getLocalTimezone(),
    conversationCount: 1,
    transferContext: {
      purpose: "Provide context from the old workspace so this project can continue in a new workspace.",
      howToUse: "Use projectSummary first. Refer to conversations only when detailed history is needed.",
      currentObjective: "",
      knownFacts: [],
      decisionsMade: [],
      nextActions: []
    },
    projectSummary: {
      goal: "",
      currentStatus: "",
      keyDecisions: [],
      openQuestions: [],
      importantConstraints: []
    },
    conversations: [conversation]
  };
}

function buildCsv(messages, metadata) {
  const archive = buildConversationArchive(messages, metadata);
  const header = [
    "conversationIndex",
    "conversationId",
    "conversationTitle",
    "projectName",
    "chatName",
    "messageIndex",
    "messageId",
    "role",
    "content",
    "createdAt",
    "updatedAt",
    "sourceUrl",
    "exportedAt"
  ].map(escapeCsv).join(",");

  const rows = [];

  archive.conversations.forEach((conversation) => {
    conversation.messages.forEach((message) => {
      rows.push([
        conversation.index,
        conversation.id,
        conversation.title,
        archive.projectName,
        archive.chatName,
        message.index,
        message.id,
        message.role,
        message.content,
        message.createdAt,
        conversation.updatedAt,
        conversation.sourceUrl,
        archive.exportedAt
      ].map(escapeCsv).join(","));
    });
  });

  return [header, ...rows].join("\n");
}

function buildJson(messages, metadata) {
  return JSON.stringify(buildConversationArchive(messages, metadata), null, 2);
}

function markdownValue(value, fallback = "null") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function buildProjectContextMarkdown(messages, metadata) {
  const archive = buildConversationArchive(messages, metadata);
  const projectName = archive.projectName || archive.chatName || "ChatGPT Project";
  const conversation = archive.conversations[0];
  const lines = [];

  lines.push(`# Project Context Archive: ${projectName}`);
  lines.push("");
  lines.push(`Exported: ${archive.exportedAt}  `);
  lines.push(`Source: ${archive.source}  `);
  lines.push("Workspace Transfer Purpose: Provide project context in a new ChatGPT workspace.");
  lines.push("");
  lines.push("## Project Summary");
  lines.push("");
  lines.push("The section below is intentionally left as a placeholder. The user can manually update it after export.");
  lines.push("");
  lines.push("### Goal");
  lines.push("[Manually add project goal here]");
  lines.push("");
  lines.push("### Current Status");
  lines.push("[Manually add current status here]");
  lines.push("");
  lines.push("### Key Decisions");
  lines.push("- [Manually add key decisions here]");
  lines.push("");
  lines.push("### Open Questions");
  lines.push("- [Manually add open questions here]");
  lines.push("");
  lines.push("### Important Constraints");
  lines.push("- [Manually add important constraints here]");
  lines.push("");
  lines.push("## Conversations");
  lines.push("");
  lines.push(`### Conversation ${conversation.index}: ${conversation.title}`);
  lines.push("");
  lines.push(`Created: ${markdownValue(conversation.createdAt)}  `);
  lines.push(`Updated: ${markdownValue(conversation.updatedAt)}  `);
  lines.push(`Source URL: ${markdownValue(conversation.sourceUrl)}`);
  lines.push("");

  for (const message of conversation.messages) {
    const label = message.role === "assistant" ? "Assistant" : message.role.charAt(0).toUpperCase() + message.role.slice(1);
    lines.push(`#### ${label}`);
    lines.push(markdownValue(message.content, ""));
    lines.push("");
  }

  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCodeLanguageFromBlock(block) {
  const header = block.querySelector(".code-header");
  return (header?.textContent || "").trim().toLowerCase();
}

function highlightCode(codeText, language = "") {
  const lang = String(language || "").toLowerCase();
  const keywordsByLanguage = {
    go: ["break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough", "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range", "return", "select", "struct", "switch", "type", "var"],
    javascript: ["async", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in", "instanceof", "let", "new", "return", "switch", "throw", "try", "typeof", "var", "void", "while", "yield"],
    typescript: ["abstract", "any", "as", "async", "await", "boolean", "break", "case", "catch", "class", "const", "continue", "default", "else", "enum", "export", "extends", "finally", "for", "function", "if", "implements", "import", "interface", "let", "new", "private", "protected", "public", "readonly", "return", "string", "switch", "throw", "try", "type", "typeof", "var", "void", "while"],
    python: ["and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "False", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "None", "nonlocal", "not", "or", "pass", "raise", "return", "True", "try", "while", "with", "yield"],
    java: ["abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float", "for", "if", "implements", "import", "instanceof", "int", "interface", "long", "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp", "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void", "volatile", "while"],
    rust: ["as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return", "Self", "self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while"],
    css: ["important", "media", "keyframes", "supports", "import", "font-face"],
    sql: ["select", "from", "where", "join", "inner", "left", "right", "full", "outer", "on", "group", "by", "order", "limit", "offset", "insert", "into", "values", "update", "set", "delete", "create", "alter", "drop", "table", "index", "view", "and", "or", "not", "null", "is", "in", "between", "like", "as", "distinct", "having"]
  };

  const aliases = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    golang: "go",
    shell: "bash",
    sh: "bash",
    zsh: "bash",
    csharp: "c#",
    cpp: "c++"
  };

  const normalizedLanguage = aliases[lang] || lang;
  const keywordList = keywordsByLanguage[normalizedLanguage] || keywordsByLanguage.javascript;
  const keywordSet = new Set(keywordList);
  const tokenPattern = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b|\s+|.)/g;

  if (["json", "yaml", "yml"].includes(normalizedLanguage)) {
    return codeText.replace(tokenPattern, (token) => {
      if (/^\s+$/.test(token)) return escapeHtml(token);
      if (/^"(?:\\.|[^"\\])*"(?=\s*:)/.test(token)) return `<span class="tok-property">${escapeHtml(token)}</span>`;
      if (/^"(?:\\.|[^"\\])*"$/.test(token) || /^'(?:\\.|[^'\\])*'$/.test(token)) return `<span class="tok-string">${escapeHtml(token)}</span>`;
      if (/^\b\d/.test(token)) return `<span class="tok-number">${escapeHtml(token)}</span>`;
      if (/^(true|false|null)$/i.test(token)) return `<span class="tok-literal">${escapeHtml(token)}</span>`;
      if (/^#/.test(token)) return `<span class="tok-comment">${escapeHtml(token)}</span>`;
      return escapeHtml(token);
    });
  }

  if (["html", "xml"].includes(normalizedLanguage)) {
    return codeText.replace(/(&lt;!--[\s\S]*?--&gt;|<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+)/g, (token) => {
      if (token.startsWith("<!--") || token.startsWith("&lt;!--")) return `<span class="tok-comment">${escapeHtml(token)}</span>`;
      if (token.startsWith("<")) {
        return escapeHtml(token)
          .replace(/(&lt;\/?)([\w:-]+)/, `$1<span class="tok-keyword">$2</span>`)
          .replace(/([\w:-]+)(=)/g, `<span class="tok-property">$1</span>$2`)
          .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, `<span class="tok-string">$1</span>`);
      }
      return escapeHtml(token);
    });
  }

  return codeText.replace(tokenPattern, (token, _match, offset, fullText) => {
    if (/^\s+$/.test(token)) return escapeHtml(token);
    if (/^(\/\/|#|\/\*)/.test(token)) return `<span class="tok-comment">${escapeHtml(token)}</span>`;
    if (/^("|'|`)/.test(token)) return `<span class="tok-string">${escapeHtml(token)}</span>`;
    if (/^\b\d/.test(token)) return `<span class="tok-number">${escapeHtml(token)}</span>`;
    if (/^(true|false|null|nil|None|undefined)$/i.test(token)) return `<span class="tok-literal">${escapeHtml(token)}</span>`;
    if (keywordSet.has(token) || keywordSet.has(token.toLowerCase())) return `<span class="tok-keyword">${escapeHtml(token)}</span>`;

    const after = fullText.slice(offset + token.length).match(/^\s*\(/);
    if (after && /^[A-Za-z_$][\w$]*$/.test(token)) return `<span class="tok-function">${escapeHtml(token)}</span>`;

    return escapeHtml(token);
  });
}

function applySyntaxHighlighting(html) {
  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll(".code-block").forEach((block) => {
    const code = block.querySelector("pre code");
    if (!code) return;

    const language = getCodeLanguageFromBlock(block);
    const codeText = code.textContent || "";
    code.innerHTML = highlightCode(codeText, language);
  });

  return template.innerHTML;
}

function richMessageHtml(message) {
  if (message.html && message.html.trim()) {
    return applySyntaxHighlighting(message.html);
  }

  // Fallback for older content-script data: preserve plain text line breaks.
  return `<p>${escapeHtml(message.content).replace(/\n/g, "<br>")}</p>`;
}

function buildPrintableHtml(messages, metadata) {
  const rows = messages.map((message, index) => `
    <article class="message ${message.role}">
      <div class="message-header">
        <span class="role-badge ${message.role}">${escapeHtml(message.role === "assistant" ? "ChatGPT" : "You")}</span>
        <span class="message-index">#${index + 1}</span>
      </div>
      <div class="content">${richMessageHtml(message)}</div>
    </article>
  `).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(metadata?.chatName || "ChatGPT Conversation")}</title>
  <style>
    :root {
      --page-bg: #ffffff;
      --text: #1f2328;
      --muted: #6b7280;
      --border: #d9d9e3;
      --soft: #f7f7f8;
      --code-bg: #f6f8fa;
      --code-header: #eef0f3;
      --accent: #10a37f;
      --syntax-keyword: #cf222e;
      --syntax-function: #8250df;
      --syntax-string: #0a3069;
      --syntax-number: #0550ae;
      --syntax-comment: #6e7781;
      --syntax-literal: #0550ae;
      --syntax-property: #953800;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--page-bg);
      color: var(--text);
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.65;
    }

    .page {
      max-width: 860px;
      margin: 0 auto;
      padding: 34px 28px 48px;
    }

    .export-header {
      border-bottom: 1px solid var(--border);
      margin-bottom: 26px;
      padding-bottom: 18px;
    }

    h1 {
      font-size: 26px;
      line-height: 1.2;
      margin: 0 0 10px;
      letter-spacing: -0.02em;
    }

    .subtitle {
      color: var(--muted);
      font-size: 12px;
      display: grid;
      gap: 3px;
    }

    .message {
      border: 1px solid var(--border);
      border-radius: 14px;
      margin: 0 0 18px;
      padding: 16px 18px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .message.user { background: var(--soft); }
    .message.assistant { background: #fff; }

    .message-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      color: var(--muted);
      font-size: 12px;
    }

    .role-badge {
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .role-badge.assistant { color: var(--accent); }
    .role-badge.user { color: #374151; }
    .message-index { color: var(--muted); }

    .content > :first-child { margin-top: 0; }
    .content > :last-child { margin-bottom: 0; }
    .content p { margin: 0 0 0.9em; }
    .content h1, .content h2, .content h3, .content h4 {
      margin: 1.2em 0 0.45em;
      line-height: 1.25;
      letter-spacing: -0.015em;
    }
    .content h1 { font-size: 22px; }
    .content h2 { font-size: 19px; }
    .content h3 { font-size: 17px; }
    .content h4 { font-size: 15px; }
    .content ul, .content ol { margin: 0.3em 0 1em 1.35em; padding: 0; }
    .content li { margin: 0.25em 0; }
    .content blockquote {
      margin: 1em 0;
      padding: 0.2em 0 0.2em 1em;
      border-left: 3px solid var(--border);
      color: #4b5563;
    }

    .content code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 0.92em;
      background: var(--code-bg);
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      padding: 0.12em 0.35em;
    }

    .code-block {
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      background: var(--code-bg);
      margin: 1em 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .code-header {
      background: var(--code-header);
      color: #374151;
      font-size: 12px;
      font-weight: 700;
      padding: 7px 12px;
      border-bottom: 1px solid var(--border);
    }

    .code-block pre {
      margin: 0;
      padding: 13px 14px;
      overflow-wrap: normal;
      white-space: pre-wrap;
      tab-size: 4;
    }

    .code-block code {
      display: block;
      background: transparent;
      border: 0;
      border-radius: 0;
      padding: 0;
      font-size: 12.5px;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .tok-keyword { color: var(--syntax-keyword); font-weight: 700; }
    .tok-function { color: var(--syntax-function); font-weight: 600; }
    .tok-string { color: var(--syntax-string); }
    .tok-number { color: var(--syntax-number); }
    .tok-comment { color: var(--syntax-comment); font-style: italic; }
    .tok-literal { color: var(--syntax-literal); font-weight: 600; }
    .tok-property { color: var(--syntax-property); }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 13px;
    }
    th, td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; }
    th { background: var(--soft); }
    a { color: #0969da; text-decoration: none; }

    @media print {
      body { font-size: 12.5px; }
      .page { max-width: none; padding: 18px; }
      .message { margin-bottom: 14px; }
      .code-block code { font-size: 11px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="export-header">
      <h1>${escapeHtml(metadata?.chatName || "ChatGPT Conversation")}</h1>
      <div class="subtitle">
        ${metadata?.projectName ? `<div><strong>Project:</strong> ${escapeHtml(metadata.projectName)}</div>` : ""}
        <div><strong>Chat:</strong> ${escapeHtml(metadata?.chatName || "ChatGPT Conversation")}</div>
        <div><strong>Exported:</strong> ${escapeHtml(new Date().toLocaleString())}</div>
        <div><strong>Messages:</strong> ${messages.length}</div>
      </div>
    </header>
    ${rows}
  </main>
  <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body>
</html>`;
}

function renderPreview(messages) {
  previewEl.hidden = false;
  previewEl.innerHTML = messages.slice(0, 20).map((message) => `
    <div class="message-row">
      <div class="role">${escapeHtml(message.role)}</div>
      <div class="text">${escapeHtml(message.content.slice(0, 500))}${message.content.length > 500 ? "…" : ""}</div>
    </div>
  `).join("");
}

async function withMessages(action) {
  try {
    setLoading(true);
    const speedLabel = getCrawlOptions().label;
    setStatus(`Reading messages from the current ChatGPT conversation... (${speedLabel} speed)`);
    const exportData = await requestExportData();
    const messages = exportData.messages;
    const metadata = exportData.metadata;

    if (!messages.length) {
      throw new Error("No messages found. Make sure a conversation is open and loaded.");
    }

    const preparedMessages = getPreparedMessages(messages);
    countEl.textContent = `${preparedMessages.length} messages found`;
    await action(preparedMessages, metadata);
  } catch (error) {
    countEl.textContent = "";
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

previewBtn.addEventListener("click", () => withMessages(async (messages) => {
  renderPreview(messages);
  setStatus("Preview loaded.");
}));

csvBtn.addEventListener("click", () => withMessages(async (messages, metadata) => {
  downloadFile("conversation-messages.csv", "text/csv;charset=utf-8", buildCsv(messages, metadata), { addBom: true });
  setStatus("CSV message export created.");
}));

jsonBtn.addEventListener("click", () => withMessages(async (messages, metadata) => {
  downloadFile("conversations.json", "application/json;charset=utf-8", buildJson(messages, metadata), { addBom: true });
  setStatus("JSON workspace-transfer archive created.");
}));

mdBtn?.addEventListener("click", () => withMessages(async (messages, metadata) => {
  downloadFile("project-context.md", "text/markdown;charset=utf-8", buildProjectContextMarkdown(messages, metadata), { addBom: true });
  setStatus("Markdown project context export created.");
}));

pdfBtn.addEventListener("click", () => withMessages(async (messages, metadata) => {
  const html = buildPrintableHtml(messages, metadata);
  const blob = new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  await chrome.tabs.create({ url });
  setStatus("A print page opened. Choose “Save as PDF” in the print dialog.");
}));
