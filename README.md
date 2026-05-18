# AIChatExporter

A Chrome Extension that exports the currently open ChatGPT conversation to CSV, JSON, or a printable PDF.

## Features

- Extracts ChatGPT conversation messages from the current tab
- Auto-scrolls upward to load virtualized older messages before export, then restores your scroll position
- Captures both user questions and assistant answers
- Exports to CSV as `index, question, answer` rows
- Exports to JSON as question/answer pairs with `question.role`, `question.content`, `answer.role`, and `answer.content`
- Opens a styled printable export page for PDF saving with headings, lists, inline code, and code blocks preserved
- Includes a **Formatted export** checkbox to fix common UTF-8 mojibake and newline artifacts, or export raw extracted text
- Works on:
  - `https://chatgpt.com/*`
  - `https://chat.openai.com/*`

## Install locally

1. Unzip this folder.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the unzipped `AIChatExporter` folder.
6. Open a ChatGPT conversation.
7. Click the extension icon and export.

## Notes

The PDF export opens a print-friendly page and triggers Chrome's print dialog. Choose **Save as PDF**.

ChatGPT's web UI can change over time. If extraction stops working, update the selectors in `content.js`.

## Files

- `manifest.json` — Chrome extension manifest
- `popup.html` — Extension popup UI
- `popup.css` — Popup styles
- `popup.js` — Export and UI logic
- `content.js` — ChatGPT message extraction logic


## Troubleshooting

If you see `Could not establish connection. Receiving end does not exist`, update to version 0.1.2 or later. This version injects the ChatGPT page reader on demand. After loading the extension, refresh the ChatGPT tab once if Chrome still shows an old copy.




## Version 1.0.0

- Renames the extension to **AIChatExporter**.
- Adds the final extension icon pack.
- Keeps CSV, JSON, and styled PDF export support with fast verified loading.

## Version 0.1.12

- Improves PDF export styling to better match ChatGPT conversations.
- Preserves common rich formatting in the printable PDF page: paragraphs, headings, lists, inline code, links, tables, blockquotes, and code blocks.
- Code blocks now render in bordered panels with a header and monospace indentation instead of plain escaped text.

## Version 0.1.10

- Makes auto-scroll faster by default while keeping verification enabled.
- After the crawler thinks it reached the top, it runs repeated top probes, extra upward wheel bursts, and optional load-more button checks.
- If verification sees the oldest message, message count, or scroll height change, it keeps crawling instead of stopping early.
- Updates speed profiles to **Safe verified**, **Balanced verified**, **Fast verified**, and **Turbo verified**.

## Version 0.1.9

- Changes CSV export from flat message rows to question/answer rows: `index`, `question`, `answer`.
- Changes JSON export from a flat `messages` array to a `conversations` array. Each item has:

```json
{
  "index": 1,
  "question": {
    "role": "user",
    "content": "Actual user question"
  },
  "answer": {
    "role": "agent",
    "content": "Actual assistant answer"
  }
}
```

- Keeps project/chat metadata at the top level of JSON and in CSV metadata rows.

## Version 0.1.6

- Adds a **Formatted export** checkbox. When enabled, exports clean text by fixing common mojibake like `Iâ€™` and `â€“`, converting accidental literal `\n` artifacts into real line breaks, and trimming extra spacing.
- Keeps raw export available by unchecking **Formatted export**.
- Adds a UTF-8 BOM to CSV, JSON, and printable HTML output so Excel and other tools read smart punctuation more reliably.

## Version 0.1.4

- Adds auto-scroll collection for long ChatGPT conversations where older messages are not present in the DOM until you scroll up.
- Restores the original scroll position after collecting loaded messages.

## Version 0.1.3

- Adds JSON export with metadata and an ordered `messages` array.

## Version 0.1.2

- Fixes ChatGPT assistant turns that render as multiple consecutive assistant message blocks.
- Groups consecutive same-role blocks so the final assistant answer is included after a progress/update block.
- Uses direct `[data-message-author-role]` leaf nodes first to avoid extracting only the first markdown block from a parent turn.

## Chat title metadata

The exporter reads the browser page title from ChatGPT. If the title contains ` - `, it treats the text before the first dash as the project name and everything after the first dash as the chat name.

Example:

```text
Chrome Extension - Chrome Extension for Exporting
```

Exports as:

- Project name: `Chrome Extension`
- Chat name: `Chrome Extension for Exporting`

If there is no dash, the full title is exported as the chat name and the project name is left empty. CSV, JSON, and PDF exports all include this metadata.


## Auto-scroll speed

Use the **Load speed** dropdown before exporting:

- **Safe verified**: most conservative verification for extremely long chats.
- **Balanced verified**: default; fast crawl plus repeated top verification.
- **Fast verified**: faster crawl with verification for machines/pages that keep up well.
- **Turbo verified**: fastest; still probes the top, but with shorter waits.

If older messages are missing, retry with **Safe verified**. If exports are complete but too slow, try **Fast verified** or **Turbo verified**.


## v0.1.12

- Added dependency-free syntax highlighting for PDF code blocks.
- Highlights common keywords, function calls, strings, numbers, comments, literals, and JSON/YAML properties.
- Keeps code indentation and the ChatGPT-style code panel layout.


## Workspace Transfer Export Schema

AIChatExporter now uses a ChatGPT workspace-transfer friendly JSON archive. JSON is the canonical raw archive, Markdown is the most ChatGPT-friendly context file, PDF is a human-readable backup, and CSV is a lightweight conversation index.

The JSON export includes top-level placeholders for `transferContext` and `projectSummary`. These are intentionally left empty so you can manually fill in goals, decisions, current status, and next actions after export. The extension does not infer project context, auto-summarize, or call any AI API.

Main export files:

```text
project-context.md
conversations.json
conversation-messages.csv
project-archive.pdf
```

The `conversations.json` file uses flexible ordered messages instead of fixed question/answer pairs, with standard roles such as `user` and `assistant`, stable IDs like `chat-001` and `msg-001`, ISO timestamps where available, and `null` when a timestamp is unavailable.
