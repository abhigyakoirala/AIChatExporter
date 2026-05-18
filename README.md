# AIChatExporter

AIChatExporter: ChatGPT conversation exporter for CSV, JSON, and PDF

AIChatExporter is a Chrome extension designed to help users export ChatGPT conversations into clean, structured, and shareable formats. It extracts user questions and assistant answers, organizes them into Q&A pairs, and saves them as CSV, JSON, or a polished PDF.

The extension is built to be simple, fast, readable, and easy for other developers to understand, customize, and extend.

---

## ✨ Features

- Export ChatGPT conversations to CSV
- Export ChatGPT conversations to JSON
- Export ChatGPT conversations to PDF
- Extract user questions and assistant answers as structured Q&A pairs
- Automatically load long ChatGPT conversations before export
- Adjustable loading speed for long conversations
- Save project name and chat name from the ChatGPT page title
- Support formatted or raw export mode
- Preserve headings, lists, tables, links, and inline code in PDF export
- Preserve code blocks with indentation and syntax highlighting in PDF export
- Lightweight Chrome Extension architecture using Manifest V3
- Modern AI-inspired icon and branding
- Easy-to-modify code structure

---

## Project Idea

ChatGPT conversations often contain useful explanations, code, research, plans, and decisions, but exporting them manually can be slow and messy.

AIChatExporter is designed to make ChatGPT conversations easier to save and reuse by combining:

- Conversation extraction
- Question and answer pairing
- CSV export for spreadsheets
- JSON export for structured data
- PDF export for clean reading and sharing
- Chat/project metadata detection
- Long conversation auto-loading

The goal is to turn ChatGPT conversations into organized, portable knowledge that can be stored, searched, shared, or processed later.

---

## Chrome Extension Overview

This project follows the standard Chrome Extension structure.

The main parts are:

- `manifest.json` — extension configuration
- `popup.html` — popup layout shown when the extension icon is clicked
- `popup.css` — popup design and styling
- `popup.js` — popup logic, export buttons, and user interactions
- `content.js` — ChatGPT page extraction logic
- `icons/` — extension icons used by Chrome
- `README.md` — documentation for users and developers

---

## Project Structure

```text
AIChatExporter/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## File Explanation

### `manifest.json`

This file tells Chrome how the extension works.

It includes:

- Extension name
- Extension version
- Description
- Required permissions
- Popup file location
- Content script permissions
- Icon paths

Example:

```json
{
  "manifest_version": 3,
  "name": "AIChatExporter",
  "version": "1.0.0",
  "description": "Export ChatGPT conversations to CSV, JSON, and PDF.",
  "permissions": ["activeTab", "scripting", "downloads"],
  "host_permissions": ["https://chatgpt.com/*", "https://chat.openai.com/*"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Modify this file when you want to:

- Change the extension name
- Change the description
- Add or remove permissions
- Change icons
- Add supported websites
- Update the version number

---

### `popup.html`

This file contains the popup layout.

The popup is what users see when they click the extension icon in Chrome.

It usually includes:

- App title
- Export buttons
- Format options
- Speed options
- Status message

Example:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AIChatExporter</title>
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <div class="app">
      <header class="app-header">
        <img src="icons/icon48.png" alt="AIChatExporter" class="logo" />
        <div>
          <h1>AIChatExporter</h1>
          <p>Export ChatGPT conversations</p>
        </div>
      </header>

      <label class="option-row">
        <input type="checkbox" id="formattedExport" checked />
        <span>Formatted export</span>
      </label>

      <label class="option-row">
        <span>Load speed</span>
        <select id="loadSpeed">
          <option value="safe">Safe verified</option>
          <option value="balanced" selected>Balanced verified</option>
          <option value="fast">Fast verified</option>
          <option value="turbo">Turbo verified</option>
        </select>
      </label>

      <section class="actions">
        <button id="exportCsv">Export CSV</button>
        <button id="exportJson">Export JSON</button>
        <button id="exportPdf">Export PDF</button>
      </section>

      <p id="status" class="status"></p>
    </div>

    <script src="popup.js"></script>
  </body>
</html>
```

Modify this file when you want to:

- Add new export formats
- Change popup layout
- Add settings
- Add progress indicators
- Add help text
- Update branding

---

### `popup.css`

This file controls the design of the popup.

It includes:

- Layout
- Colors
- Spacing
- Buttons
- Cards
- Typography
- Select menus
- Checkbox styling
- Hover effects

Example:

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  width: 360px;
  min-height: 420px;
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #11c5b3, #0967e8);
  color: #ffffff;
}

.app {
  padding: 18px;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
}

h1 {
  margin: 0;
  font-size: 20px;
}

p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.85);
}

button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #ffffff;
  color: #0f172a;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  opacity: 0.92;
}
```

Modify this file when you want to:

- Change colors
- Change popup size
- Update button styles
- Improve spacing
- Match your branding
- Add responsive styling

---

### `popup.js`

This file controls the main popup behavior.

It handles:

- Getting the active ChatGPT tab
- Injecting the content script when needed
- Reading export options
- Triggering CSV export
- Triggering JSON export
- Triggering PDF export
- Downloading generated files
- Showing status messages

Example:

```js
const exportCsvButton = document.getElementById("exportCsv");
const exportJsonButton = document.getElementById("exportJson");
const exportPdfButton = document.getElementById("exportPdf");
const formattedExportInput = document.getElementById("formattedExport");
const loadSpeedSelect = document.getElementById("loadSpeed");
const statusElement = document.getElementById("status");

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tabs[0];
}

function getExportOptions() {
  return {
    formatted: formattedExportInput.checked,
    loadSpeed: loadSpeedSelect.value,
  };
}
```

Modify this file when you want to:

- Add export formats
- Change download behavior
- Add validation
- Improve status messages
- Add progress updates
- Change filename generation

---

### `content.js`

This file runs inside the ChatGPT page and extracts conversation content.

It handles:

- Reading ChatGPT message blocks
- Detecting user and assistant roles
- Grouping consecutive assistant blocks
- Pairing questions with answers
- Loading long conversations by scrolling upward
- Verifying that older messages are fully loaded
- Extracting page title metadata
- Preserving formatted HTML for PDF export
- Preserving plain text for CSV and JSON export

Important metadata behavior:

```text
<title>Chrome Extension - Chrome Extension for Exporting</title>
```

This is exported as:

```text
Project name: Chrome Extension
Chat name: Chrome Extension for Exporting
```

If there is no `-` in the title, the full title is saved as the chat name.

Modify this file when you want to:

- Improve ChatGPT DOM extraction
- Support another AI chat website
- Change question/answer pairing logic
- Improve long conversation loading
- Add more PDF formatting support
- Improve syntax highlighting

---

## Export Formats

### CSV Export

CSV export is designed for spreadsheet tools.

Format:

```csv
index,question,answer
1,"Actual user question","Actual assistant answer"
2,"Another user question","Another assistant answer"
```

The CSV export also includes chat metadata such as project name and chat name.

---

### JSON Export

JSON export is designed for developers, automation, and structured storage.

Format:

```json
{
  "source": "ChatGPT",
  "projectName": "Chrome Extension",
  "chatName": "Chrome Extension for Exporting",
  "exportedAt": "2026-05-17T00:00:00.000Z",
  "conversationCount": 1,
  "conversations": [
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
  ]
}
```

Note: JSON displays real line breaks as `\n` when opened as plain text. This is normal JSON escaping.

---

### PDF Export

PDF export is designed for clean reading and sharing.

It supports:

- Chat title
- Project title
- Export timestamp
- User question sections
- Assistant answer sections
- Headings
- Paragraphs
- Bullet lists
- Numbered lists
- Tables
- Links
- Inline code
- Code blocks
- Syntax highlighting

Code blocks are displayed in a ChatGPT-like style with preserved indentation and monospace formatting.

---

## Formatted vs Raw Export

AIChatExporter includes a formatted export option.

### Formatted Export

Formatted export cleans common text issues and improves readability.

It can fix issues such as:

- Broken smart apostrophes
- Broken dashes
- Literal newline artifacts
- Extra spacing
- Repeated blank lines

### Raw Export

Raw export preserves extracted text as closely as possible from the ChatGPT page.

Use raw export when you want to inspect the original extracted content without cleanup.

---

## Long Conversation Loading

ChatGPT may virtualize long conversations, which means older messages are not always present in the page until the user scrolls upward.

AIChatExporter handles this by:

- Scrolling upward automatically
- Waiting for older messages to load
- Collecting messages as they appear
- Deduplicating collected messages
- Verifying that the top of the conversation has been reached
- Restoring the original scroll position before export

Available load speed modes:

- Safe verified
- Balanced verified
- Fast verified
- Turbo verified

Use Balanced verified first. If the export is complete, Fast verified or Turbo verified can reduce waiting time.

---

## How to Install Locally

1. Download or clone the project.
2. Open Chrome.
3. Go to `chrome://extensions`.
4. Enable Developer mode.
5. Click Load unpacked.
6. Select the `AIChatExporter` folder.
7. Open a ChatGPT conversation.
8. Click the AIChatExporter icon.
9. Choose CSV, JSON, or PDF export.

---

## How to Use

1. Open a conversation on ChatGPT.
2. Click the AIChatExporter icon in Chrome.
3. Choose whether to use formatted export.
4. Choose a loading speed.
5. Click one of the export buttons:
   - Export CSV
   - Export JSON
   - Export PDF
6. Wait for the extension to load the conversation and download the file.

---

## Permissions

AIChatExporter uses limited Chrome permissions.

Typical permissions include:

- `activeTab` — access the current ChatGPT tab after the user clicks the extension
- `scripting` — inject the extractor into the ChatGPT page
- `downloads` — save exported files
- Host permissions for ChatGPT pages

The extension is focused on ChatGPT export only.

---

## Customization Ideas

You can extend this project by adding:

- Markdown export
- HTML export
- Copy-to-clipboard export
- Export selected messages only
- Export date ranges
- Support for Claude, Gemini, Perplexity, or other AI chat tools
- More advanced syntax highlighting
- Better PDF themes
- Dark/light PDF export options
- Automatic file naming templates

---

## Troubleshooting

### The extension says it cannot connect to the page

Refresh the ChatGPT tab and try again.

This usually happens when the content script has not been injected into the current tab yet.

### The export misses older messages

Use Safe verified or Balanced verified mode and export again.

Very long conversations may need extra time because ChatGPT loads older messages only after scrolling upward.

### JSON still shows `\n`

This is normal.

JSON stores real line breaks as escaped newline characters when viewed as plain text.

### CSV has broken characters in Excel

The extension includes UTF-8 output support. If Excel still displays characters incorrectly, import the CSV as UTF-8 instead of opening it directly.

---

## Tech Stack

- HTML
- CSS
- JavaScript
- Chrome Extension Manifest V3
- ChatGPT DOM extraction
- Browser download APIs

---

## Version

Current version:

```text
1.0.1
```

---

## Technical project transfer prompt

I am preparing to transfer this technical project/chat into a new ChatGPT workspace.

Please review the full conversation above and fill the following JSON sections so they can be used as project transfer context.

```text
Important instructions:

- Use only information explicitly present in this conversation.
- Do not invent facts, decisions, implementation details, or next steps.
- Focus on what another ChatGPT instance needs to continue the work.
- Include relevant technical details such as:
  - project goal
  - architecture or implementation choices
  - file names
  - commands
  - schemas
  - APIs
  - bugs found
  - fixes applied
  - version changes
  - pending tasks
  - constraints or preferences
- Keep each array item short, specific, and useful.
- Use completed wording for decisionsMade and keyDecisions.
- Use action-oriented wording for nextActions.
- If something is unknown or not discussed, leave it as an empty string or empty array.
- Return valid JSON only.
- Do not wrap the response in markdown.
- Do not include explanations before or after the JSON.

Return exactly this shape:

{
"transferContext": {
"purpose": "Provide context from the old workspace so this project can continue in a new workspace.",
"howToUse": "Use projectSummary first. Refer to conversations only when detailed history is needed.",
"currentObjective": "",
"knownFacts": [],
"decisionsMade": [],
"nextActions": []
},
"projectSummary": {
"goal": "",
"currentStatus": "",
"keyDecisions": [],
"openQuestions": [],
"importantConstraints": []
}
}
```

---

## General conversation transfer prompt

I am preparing to transfer this conversation into a new ChatGPT workspace.

Please review the full conversation above and fill the following JSON sections so they can be used as conversation transfer context.

```text

Important instructions:

- Use only information explicitly present in this conversation.
- Do not invent facts, preferences, conclusions, or next steps.
- Focus on what another ChatGPT instance needs to continue the conversation naturally.
- Capture:
  - the main topic
  - the user’s objective
  - important facts already discussed
  - decisions or conclusions reached
  - user preferences or constraints mentioned in this chat
  - unresolved questions
  - useful next steps, if any
- Keep the output concise and easy to scan.
- Do not include private assumptions or unsupported interpretations.
- If something is unknown or not discussed, leave it as an empty string or empty array.
- Return valid JSON only.
- Do not wrap the response in markdown.
- Do not include explanations before or after the JSON.

Return exactly this shape:

{
"transferContext": {
"purpose": "Provide context from the old conversation so it can continue in a new workspace.",
"howToUse": "Use projectSummary first. Refer to conversations only when detailed history is needed.",
"currentObjective": "",
"knownFacts": [],
"decisionsMade": [],
"nextActions": []
},
"projectSummary": {
"goal": "",
"currentStatus": "",
"keyDecisions": [],
"openQuestions": [],
"importantConstraints": []
}
}
```

---

## Prompt to load the conversation to new ChatGpt worspace

```text
I am transferring a project from another ChatGPT workspace.

The attached JSON file is a structured archive of the previous workspace conversation. Please ingest it as context for this new workspace.

How to use the file:
1. Read schemaVersion, source, exportType, projectName, chatName, exportedAt, and timezone.
2. Read transferContext and projectSummary first. These sections contain the intended continuation context if they were filled.
3. Then review conversations[].messages in order using each message index.
4. Use message content as the detailed history of what happened in the previous workspace.

Important rules:
- Do not rewrite or summarize the full archive unless I ask.
- Do not hallucinate missing goals, decisions, constraints, or next steps.
- Treat null values as unavailable information.
- Treat empty strings and empty arrays as placeholders.
- Preserve all technical details, file names, implementation decisions, bugs, fixes, version changes, schemas, prompts, and commands found in the archive.
- Continue the project from the latest relevant state.
- When I ask follow-up questions, answer using this archive as background context.
- If the archive does not contain enough information, say what is missing and ask a specific question.
- If there are multiple conversations in the archive, prioritize projectSummary and transferContext first, then the most recent or most relevant conversation messages.

Once you have reviewed the JSON, reply only with:
“Context loaded. I’m ready to continue.”
```

---

## Prompt to verify the ChatGpts state after context is provided

```text
Great. Based on the loaded JSON context, please give me a short checkpoint before we continue:

1. What project or conversation are we continuing?
2. What is the current objective?
3. What decisions or constraints should you remember?
4. What are the next best actions?

Keep it concise. 1 line answer for above 4 questions
```

---

## License

MIT License

Copyright (c) 2026 Abhigya Koirala

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the &quot;Software&quot;), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Author

Created by Abhigya Koirala.
