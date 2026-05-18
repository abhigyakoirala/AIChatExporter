if (!globalThis.__CHATGPT_EXPORTER_CONTENT_LOADED__) {
  globalThis.__CHATGPT_EXPORTER_CONTENT_LOADED__ = true;

const AUTO_SCROLL_DEFAULTS = {
  enabled: true,
  // Fast by default, but verified. ChatGPT virtualizes old turns, so the
  // exporter crawls upward quickly and then probes the top several times
  // before it trusts that there are no more messages to load.
  maxSteps: 520,
  delayMs: 180,
  stepRatio: 1.65,
  settleChecks: 2,
  settleDelayMs: 70,
  topStablePasses: 2,
  verifyPasses: 8,
  verifyDelayMs: 160,
  verifyWheelBursts: 4
};

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getChatTitleMetadata() {
  const rawTitle = normalizeText(document.title || "ChatGPT Conversation");
  const cleanedTitle = rawTitle
    .replace(/\s+\|\s+ChatGPT$/i, "")
    .replace(/\s+-\s+ChatGPT$/i, "")
    .replace(/^ChatGPT\s*-\s*/i, "")
    .trim() || "ChatGPT Conversation";

  const dashIndex = cleanedTitle.indexOf(" - ");
  if (dashIndex !== -1) {
    const projectName = cleanedTitle.slice(0, dashIndex).trim();
    const chatName = cleanedTitle.slice(dashIndex + 3).trim();
    if (projectName && chatName) {
      return {
        pageTitle: rawTitle,
        projectName,
        chatName,
        isProjectChat: true,
        sourceUrl: location.href || null
      };
    }
  }

  return {
    pageTitle: rawTitle,
    projectName: "",
    chatName: cleanedTitle,
    isProjectChat: false,
    sourceUrl: location.href || null
  };
}


function getRoleFromElement(element) {
  const directRole = element.getAttribute("data-message-author-role");
  if (directRole && ["user", "assistant"].includes(directRole)) return directRole;

  const testId = element.getAttribute("data-testid") || "";
  const ariaLabel = element.getAttribute("aria-label") || "";
  const combined = `${testId} ${ariaLabel}`.toLowerCase();

  if (combined.includes("user")) return "user";
  if (combined.includes("assistant")) return "assistant";
  return null;
}

function removeNoise(root) {
  root.querySelectorAll([
    "button",
    "svg",
    "style",
    "script",
    "noscript",
    '[aria-label="Response actions"]',
    '[data-testid$="turn-action-button"]',
    '[data-testid="copy-turn-action-button"]',
    '[data-testid="good-response-turn-action-button"]',
    '[data-testid="bad-response-turn-action-button"]'
  ].join(",")).forEach((node) => node.remove());
}

function getTextFromMessageElement(element) {
  const clone = element.cloneNode(true);
  removeNoise(clone);

  const contentNodes = [...clone.querySelectorAll(".markdown, [data-message-content], .whitespace-pre-wrap")]
    .filter((node) => normalizeText(node.innerText || node.textContent || ""));

  if (contentNodes.length) {
    return normalizeText(contentNodes.map((node) => node.innerText || node.textContent || "").join("\n\n"));
  }

  return normalizeText(clone.innerText || clone.textContent || "");
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textFromCodeElement(codeElement) {
  if (!codeElement) return "";
  let output = "";

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      output += node.textContent || "";
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      output += "\n";
      return;
    }

    for (const child of node.childNodes) walk(child);
  }

  walk(codeElement);
  return output.replace(/\n{3,}/g, "\n\n").trimEnd();
}

function getCodeLanguage(preElement) {
  const labels = [...preElement.querySelectorAll("div, span")]
    .map((node) => normalizeText(node.innerText || node.textContent || ""))
    .filter(Boolean)
    .filter((text) => text.length <= 30 && !/^copy$/i.test(text));

  const commonLanguages = [
    "bash", "shell", "sh", "javascript", "typescript", "python", "go", "java", "c", "c++", "c#",
    "rust", "ruby", "php", "html", "css", "json", "yaml", "xml", "sql", "dockerfile", "markdown"
  ];

  return labels.find((label) => commonLanguages.includes(label.toLowerCase())) || "Code";
}

function nodeToExportHtml(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const tag = node.tagName.toLowerCase();

  if (["script", "style", "noscript", "button", "svg"].includes(tag)) return "";

  if (tag === "br") return "<br>";

  if (tag === "pre") {
    const codeElement = node.querySelector("pre.cm-content code, .cm-content code, code") || node.querySelector("code");
    const codeText = textFromCodeElement(codeElement) || normalizeText(node.innerText || node.textContent || "");
    const language = getCodeLanguage(node);
    return `<div class="code-block"><div class="code-header">${escapeHtml(language)}</div><pre><code>${escapeHtml(codeText)}</code></pre></div>`;
  }

  if (tag === "code") {
    return `<code>${escapeHtml(node.textContent || "")}</code>`;
  }

  const children = [...node.childNodes].map(nodeToExportHtml).join("");

  if (["p", "ul", "ol", "li", "blockquote", "strong", "em", "b", "i", "table", "thead", "tbody", "tr", "th", "td"].includes(tag)) {
    return `<${tag}>${children}</${tag}>`;
  }

  if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
    return `<${tag}>${children}</${tag}>`;
  }

  if (tag === "a") {
    const href = node.getAttribute("href") || "";
    return `<a href="${escapeHtml(href)}">${children}</a>`;
  }

  return children;
}

function getHtmlFromMessageElement(element) {
  const clone = element.cloneNode(true);
  removeNoise(clone);

  const contentNodes = [...clone.querySelectorAll(".markdown, [data-message-content], .whitespace-pre-wrap")]
    .filter((node) => normalizeText(node.innerText || node.textContent || ""));
  const roots = contentNodes.length ? contentNodes : [clone];

  return roots
    .map((node) => [...node.childNodes].map(nodeToExportHtml).join(""))
    .join("\n")
    .trim();
}

function markdownEscape(value) {
  return String(value ?? "");
}

function getCodeLanguageForMarkdown(preElement) {
  const language = getCodeLanguage(preElement);
  return /^code$/i.test(language) ? "" : language.toLowerCase();
}

function nodeToMarkdown(node, context = {}) {
  if (node.nodeType === Node.TEXT_NODE) {
    return markdownEscape(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const tag = node.tagName.toLowerCase();
  if (["script", "style", "noscript", "button", "svg"].includes(tag)) return "";
  if (tag === "br") return "\n";

  if (tag === "pre") {
    const codeElement = node.querySelector("pre.cm-content code, .cm-content code, code") || node.querySelector("code");
    const codeText = textFromCodeElement(codeElement) || (node.innerText || node.textContent || "").trimEnd();
    const language = getCodeLanguageForMarkdown(node);
    return `\n\n\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
  }

  if (tag === "code") {
    return `\`${(node.textContent || "").replace(/`/g, "\\`")}\``;
  }

  const children = [...node.childNodes].map((child) => nodeToMarkdown(child, context)).join("");

  if (tag === "p") return `${children.trim()}\n\n`;
  if (["strong", "b"].includes(tag)) return `**${children}**`;
  if (["em", "i"].includes(tag)) return `*${children}*`;
  if (tag === "blockquote") return children.trim().split("\n").map((line) => `> ${line}`).join("\n") + "\n\n";
  if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) return `${"#".repeat(Number(tag[1]))} ${children.trim()}\n\n`;
  if (tag === "a") {
    const href = node.getAttribute("href") || "";
    const text = children.trim() || href;
    return href ? `[${text}](${href})` : text;
  }
  if (tag === "li") {
    const marker = context.ordered ? `${context.index || 1}.` : "-";
    return `${marker} ${children.trim()}\n`;
  }
  if (tag === "ul") return "\n" + [...node.children].map((child) => nodeToMarkdown(child, { ordered: false })).join("") + "\n";
  if (tag === "ol") return "\n" + [...node.children].map((child, index) => nodeToMarkdown(child, { ordered: true, index: index + 1 })).join("") + "\n";
  if (tag === "table") return `${normalizeText(node.innerText || node.textContent || "")}\n\n`;

  return children;
}

function getMarkdownFromMessageElement(element) {
  const clone = element.cloneNode(true);
  removeNoise(clone);

  const contentNodes = [...clone.querySelectorAll(".markdown, [data-message-content], .whitespace-pre-wrap")]
    .filter((node) => normalizeText(node.innerText || node.textContent || ""));
  const roots = contentNodes.length ? contentNodes : [clone];

  return normalizeText(roots
    .map((node) => [...node.childNodes].map((child) => nodeToMarkdown(child)).join(""))
    .join("\n\n"));
}

function getMessageId(element) {
  return element.getAttribute("data-message-id") || element.getAttribute("data-chat-bookmark-id") || "";
}

function isNestedMessageElement(element) {
  const parentMessage = element.parentElement?.closest('[data-message-author-role]');
  return Boolean(parentMessage);
}

function makeMessageKey(message) {
  return message.id || `${message.role}:${message.content}`;
}

function extractRawMessageBlocks() {
  // Prefer the leaf message nodes. ChatGPT can render an assistant turn as multiple
  // consecutive assistant blocks: for example a brief progress/update block followed
  // by the final answer. Reading only the parent turn can miss the later block.
  const directMessageNodes = [...document.querySelectorAll('[data-message-author-role]')]
    .filter((node) => !isNestedMessageElement(node));

  const rawMessages = [];
  const seenIds = new Set();

  for (const node of directMessageNodes) {
    const role = getRoleFromElement(node);
    if (!role) continue;

    const content = getTextFromMessageElement(node);
    if (!content) continue;

    const id = getMessageId(node);
    if (id && seenIds.has(id)) continue;
    if (id) seenIds.add(id);

    const html = getHtmlFromMessageElement(node);
    const markdown = getMarkdownFromMessageElement(node);
    rawMessages.push({ id, role, content, html, markdown });
  }

  return rawMessages;
}

function fallbackExtractByTurnSelectors() {
  const selectors = [
    'article[data-testid^="conversation-turn"]',
    '[data-testid^="conversation-turn"]'
  ];

  const nodes = [...document.querySelectorAll(selectors.join(","))];
  const messages = [];

  for (const node of nodes) {
    const role = getRoleFromElement(node) || getRoleFromElement(node.querySelector('[data-message-author-role]') || node);
    if (!role || !["user", "assistant"].includes(role)) continue;

    const content = getTextFromMessageElement(node);
    if (content) messages.push({ id: getMessageId(node), role, content, html: getHtmlFromMessageElement(node) });
  }

  return messages;
}

function extractVisibleChatGPTMessages() {
  const direct = extractRawMessageBlocks();
  return direct.length ? direct : fallbackExtractByTurnSelectors();
}

function findConversationScrollElement() {
  const candidates = [document.scrollingElement, document.documentElement, document.body]
    .filter(Boolean);

  for (const element of document.querySelectorAll("main, [role='main'], div")) {
    const style = getComputedStyle(element);
    const canScroll = /(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`);
    if (canScroll && element.scrollHeight > element.clientHeight + 300) {
      candidates.push(element);
    }
  }

  return candidates
    .filter((element) => element.scrollHeight > element.clientHeight + 300)
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0]
    || document.scrollingElement
    || document.documentElement;
}

function getScrollPosition(element) {
  if (element === document.scrollingElement || element === document.documentElement || element === document.body) {
    return window.scrollY || element.scrollTop || 0;
  }
  return element.scrollTop;
}

function setScrollPosition(element, top) {
  if (element === document.scrollingElement || element === document.documentElement || element === document.body) {
    window.scrollTo({ top, behavior: "instant" });
    element.scrollTop = top;
    return;
  }
  element.scrollTop = top;
}

function mergeSnapshotIntoOrdered(ordered, snapshot, preferPrepend = false) {
  const existingKeys = new Set(ordered.map(makeMessageKey));

  for (let index = 0; index < snapshot.length; index += 1) {
    const message = snapshot[index];
    const key = makeMessageKey(message);
    if (!message.content || existingKeys.has(key)) continue;

    let insertAt = preferPrepend ? 0 : ordered.length;

    for (let lookAhead = index + 1; lookAhead < snapshot.length; lookAhead += 1) {
      const nextKey = makeMessageKey(snapshot[lookAhead]);
      const existingIndex = ordered.findIndex((item) => makeMessageKey(item) === nextKey);
      if (existingIndex !== -1) {
        insertAt = existingIndex;
        break;
      }
    }

    if (insertAt === (preferPrepend ? 0 : ordered.length)) {
      for (let lookBack = index - 1; lookBack >= 0; lookBack -= 1) {
        const previousKey = makeMessageKey(snapshot[lookBack]);
        const existingIndex = ordered.findIndex((item) => makeMessageKey(item) === previousKey);
        if (existingIndex !== -1) {
          insertAt = existingIndex + 1;
          break;
        }
      }
    }

    ordered.splice(insertAt, 0, message);
    existingKeys.add(key);
  }

  return ordered;
}

function mergeConsecutiveMessagesByRole(messages) {
  const merged = [];

  for (const message of messages) {
    const content = normalizeText(message.content);
    if (!content) continue;

    const previous = merged[merged.length - 1];
    if (previous && previous.role === message.role) {
      // Consecutive assistant blocks belong to the same answer in current ChatGPT UI.
      // Keep both parts so a progress/update paragraph does not hide the final answer.
      if (!previous.content.includes(content)) {
        previous.content = normalizeText(`${previous.content}\n\n${content}`);
        if (message.html) {
          previous.html = [previous.html, message.html].filter(Boolean).join("\n");
        }
        if (message.markdown) {
          previous.markdown = [previous.markdown, message.markdown].filter(Boolean).join("\n\n");
        }
      }
    } else {
      merged.push({ role: message.role, content, html: message.html || "", markdown: message.markdown || content });
    }
  }

  return merged;
}

function dedupeExactMessages(messages) {
  const result = [];
  const seen = new Set();

  for (const message of messages) {
    const key = `${message.role}:${message.content}`;
    if (!message.content || seen.has(key)) continue;
    seen.add(key);
    result.push(message);
  }

  return result;
}

async function waitForMessageSnapshot(settings) {
  let bestSnapshot = extractVisibleChatGPTMessages();
  let bestCount = bestSnapshot.length;

  for (let check = 0; check < settings.settleChecks; check += 1) {
    await delay(settings.settleDelayMs);
    const snapshot = extractVisibleChatGPTMessages();
    if (snapshot.length >= bestCount) {
      bestSnapshot = snapshot;
      bestCount = snapshot.length;
    }
  }

  return bestSnapshot;
}

function getScrollableCandidates() {
  const candidates = [document.scrollingElement, document.documentElement, document.body]
    .filter(Boolean);

  for (const element of document.querySelectorAll("main, [role='main'], div")) {
    const style = getComputedStyle(element);
    const canScroll = /(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`);
    if (canScroll && element.scrollHeight > element.clientHeight + 120) {
      candidates.push(element);
    }
  }

  return [...new Set(candidates)]
    .filter((element) => element.scrollHeight > element.clientHeight + 120)
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
}

function getBestScrollElement(previousElement = null) {
  const candidates = getScrollableCandidates();
  if (previousElement && candidates.includes(previousElement)) return previousElement;
  return candidates[0] || document.scrollingElement || document.documentElement;
}

function forceScrollUp(element, amount) {
  const before = getScrollPosition(element);
  const nextTop = Math.max(0, before - amount);

  setScrollPosition(element, nextTop);

  // Some ChatGPT builds listen to wheel events on a nested virtual scroller rather
  // than only to scrollTop changes. Dispatching a wheel event makes the crawl more
  // reliable across UI updates.
  try {
    element.dispatchEvent(new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -Math.max(120, amount),
      deltaMode: 0
    }));
  } catch {
    // Ignore browsers that do not allow synthetic WheelEvent construction.
  }

  if (element !== document.scrollingElement && element !== document.documentElement && element !== document.body) {
    window.scrollBy({ top: -Math.max(120, amount), behavior: "instant" });
  }

  return before;
}

function findPossibleLoadMoreButtons() {
  const phrases = [
    "load more",
    "show more",
    "older messages",
    "previous messages",
    "continue loading"
  ];

  return [...document.querySelectorAll("button, [role='button']")].filter((node) => {
    const text = normalizeText(node.innerText || node.textContent || node.getAttribute("aria-label") || "").toLowerCase();
    return phrases.some((phrase) => text.includes(phrase));
  });
}

function pressLoadMoreIfPresent() {
  const button = findPossibleLoadMoreButtons()[0];
  if (!button) return false;
  try {
    button.click();
    return true;
  } catch {
    return false;
  }
}

async function verifiedTopProbe(scrollElement, orderedMessages, settings) {
  let verifiedStablePasses = 0;
  let lastCount = orderedMessages.length;
  let lastFirstKey = orderedMessages[0] ? makeMessageKey(orderedMessages[0]) : "";
  let lastScrollHeight = scrollElement.scrollHeight;

  for (let pass = 0; pass < settings.verifyPasses; pass += 1) {
    scrollElement = getBestScrollElement(scrollElement);
    setScrollPosition(scrollElement, 0);

    for (let burst = 0; burst < settings.verifyWheelBursts; burst += 1) {
      forceScrollUp(scrollElement, Math.max(900, scrollElement.clientHeight || window.innerHeight || 900));
    }

    const clickedLoadMore = pressLoadMoreIfPresent();
    await delay(settings.verifyDelayMs + (clickedLoadMore ? settings.verifyDelayMs : 0));

    const beforeCount = orderedMessages.length;
    orderedMessages = mergeSnapshotIntoOrdered(orderedMessages, await waitForMessageSnapshot(settings), true);

    const firstKey = orderedMessages[0] ? makeMessageKey(orderedMessages[0]) : "";
    const changed =
      orderedMessages.length !== beforeCount ||
      orderedMessages.length !== lastCount ||
      firstKey !== lastFirstKey ||
      scrollElement.scrollHeight !== lastScrollHeight ||
      clickedLoadMore;

    if (changed) {
      verifiedStablePasses = 0;
    } else {
      verifiedStablePasses += 1;
    }

    lastCount = orderedMessages.length;
    lastFirstKey = firstKey;
    lastScrollHeight = scrollElement.scrollHeight;

    if (verifiedStablePasses >= Math.max(2, Math.ceil(settings.verifyPasses / 2))) {
      return { orderedMessages, isComplete: true, scrollElement };
    }
  }

  return { orderedMessages, isComplete: false, scrollElement };
}

async function collectMessagesWithAutoScroll(options = {}) {
  const settings = { ...AUTO_SCROLL_DEFAULTS, ...options };
  let scrollElement = getBestScrollElement();
  const originalElement = scrollElement;
  const originalTop = getScrollPosition(scrollElement);

  let orderedMessages = [];
  orderedMessages = mergeSnapshotIntoOrdered(orderedMessages, await waitForMessageSnapshot(settings));

  if (!settings.enabled) {
    return mergeConsecutiveMessagesByRole(dedupeExactMessages(orderedMessages));
  }

  try {
    let topStablePasses = 0;
    let lastMessageCount = orderedMessages.length;
    let lastFirstKey = orderedMessages[0] ? makeMessageKey(orderedMessages[0]) : "";
    let lastScrollHeight = scrollElement.scrollHeight;
    let verificationWasComplete = false;

    for (let step = 0; step < settings.maxSteps; step += 1) {
      scrollElement = getBestScrollElement(scrollElement);
      const viewportHeight = scrollElement.clientHeight || window.innerHeight || 900;
      const stepSize = Math.max(600, Math.floor(viewportHeight * settings.stepRatio));
      const beforeTop = getScrollPosition(scrollElement);

      forceScrollUp(scrollElement, stepSize);
      await delay(settings.delayMs);

      const snapshot = await waitForMessageSnapshot(settings);
      orderedMessages = mergeSnapshotIntoOrdered(orderedMessages, snapshot, true);

      const afterTop = getScrollPosition(scrollElement);
      const atTop = afterTop <= 3;
      const firstKey = orderedMessages[0] ? makeMessageKey(orderedMessages[0]) : "";
      const messageCountChanged = orderedMessages.length !== lastMessageCount;
      const firstMessageChanged = firstKey !== lastFirstKey;
      const scrollHeightChanged = scrollElement.scrollHeight !== lastScrollHeight;
      const didNotMove = Math.abs(afterTop - beforeTop) < 3;

      if ((atTop || didNotMove) && !messageCountChanged && !firstMessageChanged && !scrollHeightChanged) {
        topStablePasses += 1;
      } else {
        topStablePasses = 0;
      }

      lastMessageCount = orderedMessages.length;
      lastFirstKey = firstKey;
      lastScrollHeight = scrollElement.scrollHeight;

      if (topStablePasses >= settings.topStablePasses) {
        const verified = await verifiedTopProbe(scrollElement, orderedMessages, settings);
        orderedMessages = verified.orderedMessages;
        scrollElement = verified.scrollElement;

        if (verified.isComplete) {
          verificationWasComplete = true;
          break;
        }

        // Verification found signs that more conversation may still be loading.
        // Continue the fast crawl instead of stopping in the middle.
        topStablePasses = 0;
        lastMessageCount = orderedMessages.length;
        lastFirstKey = orderedMessages[0] ? makeMessageKey(orderedMessages[0]) : "";
        lastScrollHeight = scrollElement.scrollHeight;
      }
    }

    if (!verificationWasComplete) {
      const verified = await verifiedTopProbe(scrollElement, orderedMessages, settings);
      orderedMessages = verified.orderedMessages;
      scrollElement = verified.scrollElement;
    }
  } finally {
    setScrollPosition(originalElement, originalTop);
    await delay(80);
  }

  return mergeConsecutiveMessagesByRole(dedupeExactMessages(orderedMessages));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "GET_CHATGPT_MESSAGES") return false;

  collectMessagesWithAutoScroll(message.options || {})
    .then((messages) => sendResponse({ ok: true, messages, metadata: getChatTitleMetadata() }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

}
