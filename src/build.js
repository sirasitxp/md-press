/*
Turns Markdown text into one self-contained, styled HTML page. No network
calls and no AI. Markdown is parsed with marked, code blocks are highlighted
at build time with highlight.js, and the stylesheet and checklist script are
inlined so every page is a single file that opens anywhere. The only outside
request is Mermaid, loaded from a CDN only on pages that contain a diagram.
*/

const fileSystem = require("fs");
const path = require("path");
const { Marked } = require("marked");
const highlighter = require("highlight.js");

const templateFolder = path.join(__dirname, "template");
const pageStyles = fileSystem.readFileSync(path.join(templateFolder, "page.css"), "utf8");
const checklistScript = fileSystem.readFileSync(path.join(templateFolder, "checklist.js"), "utf8");
const mermaidScriptUrl = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

/*
Reads an optional frontmatter block at the top of the file. Only simple
"key: value" lines are supported, which covers title and description.
*/
function splitFrontmatter(sourceText) {
  const match = sourceText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata: {}, body: sourceText };
  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    if (key) metadata[key] = value;
  }
  return { metadata, body: sourceText.slice(match[0].length) };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/*
Builds a marked instance with one change from the defaults: fenced code gets
highlighted, and mermaid fences are kept as diagram source for the browser.
*/
function createParser(documentState) {
  const markdownParser = new Marked();
  markdownParser.use({
    renderer: {
      code({ text, lang }) {
        const language = (lang || "").trim().split(/\s+/)[0];
        if (language === "mermaid") {
          documentState.hasMermaid = true;
          return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`;
        }
        const highlighted = language && highlighter.getLanguage(language)
          ? highlighter.highlight(text, { language }).value
          : escapeHtml(text);
        const languageLabel = language ? ` data-language="${escapeHtml(language)}"` : "";
        return `<pre${languageLabel}><code class="hljs">${highlighted}</code></pre>\n`;
      },
    },
  });
  return markdownParser;
}

/*
marked renders task list items as disabled checkboxes. This swaps them for
live ones the inlined checklist script can save, and counts them so the page
only gets the progress bar and script when it has a checklist.
*/
function enableTaskCheckboxes(html, documentState) {
  return html.replace(/<input (checked="" )?disabled="" type="checkbox">/g, (_fullMatch, checkedAttribute) => {
    documentState.taskCount += 1;
    return `<input type="checkbox" class="task"${checkedAttribute ? " checked" : ""}>`;
  });
}

function findTitle(metadata, body, sourceName) {
  if (metadata.title) return metadata.title;
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].replace(/[*_`]/g, "").trim();
  return path.basename(sourceName, path.extname(sourceName));
}

/*
Assembles the final page from Markdown text. The source name sets the
fallback title, the footer, and the checklist storage key, which is based on
the file name so saved progress survives edits and rebuilds of the same file.
*/
function renderPage(sourceText, sourceName = "document.md") {
  const { metadata, body } = splitFrontmatter(sourceText);
  const documentState = { hasMermaid: false, taskCount: 0 };
  const markdownParser = createParser(documentState);
  const content = enableTaskCheckboxes(markdownParser.parse(body), documentState);
  const title = findTitle(metadata, body, sourceName);
  const baseName = path.basename(sourceName);
  const storageKey = "md-press:" + path.basename(sourceName, path.extname(sourceName));
  const generatedDate = new Date().toISOString().slice(0, 10);

  const progressBar = documentState.taskCount > 0
    ? `<div class="progress" role="status" aria-live="polite"><div class="progress-track"><div class="progress-fill"></div></div><span class="progress-label"></span><button type="button" class="progress-reset">Reset</button></div>`
    : "";
  const scripts = [
    documentState.taskCount > 0 ? `<script>const storageKey = ${JSON.stringify(storageKey)};\n${checklistScript}</script>` : "",
    documentState.hasMermaid ? `<script src="${mermaidScriptUrl}"></script><script>if (window.mermaid) mermaid.initialize({ startOnLoad: true, theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "neutral" });</script>` : "",
  ].filter(Boolean).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
${metadata.description ? `<meta name="description" content="${escapeHtml(metadata.description)}">` : ""}
<style>${pageStyles}</style>
</head>
<body>
${progressBar}
<main>
${content}
</main>
<footer>Generated ${generatedDate} from ${escapeHtml(baseName)} with md-press</footer>
${scripts}
</body>
</html>
`;
}

/*
Reads one Markdown file and writes its page next to it, or into the output
folder when one is given. Returns the path of the page it wrote.
*/
function buildFile(sourcePath, outputFolder) {
  const sourceText = fileSystem.readFileSync(sourcePath, "utf8");
  const outputName = path.basename(sourcePath, path.extname(sourcePath)) + ".html";
  const outputPath = path.join(outputFolder || path.dirname(sourcePath), outputName);
  fileSystem.writeFileSync(outputPath, renderPage(sourceText, sourcePath));
  return outputPath;
}

module.exports = { renderPage, buildFile, splitFrontmatter, escapeHtml };
