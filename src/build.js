/*
Turns Markdown text into one self-contained, styled HTML page. No network
calls and no AI. Markdown is parsed with marked, code blocks are highlighted
at build time with highlight.js, and the stylesheet and checklist script are
inlined so every page is a single file that opens anywhere. The only outside
request is Mermaid, loaded from a CDN only on pages that contain a diagram.

The same builder renders pages for md-press serve. There the page script
saves checkboxes to the Markdown file instead of the browser, and the toolbar
shows whether the page is live.
*/

const fileSystem = require("fs");
const path = require("path");
const { Marked } = require("marked");
const highlighter = require("highlight.js");
const { splitFrontmatter } = require("./frontmatter.js");
const { findTaskLines } = require("./tasks.js");

const templateFolder = path.join(__dirname, "template");
const pageStyles = fileSystem.readFileSync(path.join(templateFolder, "page.css"), "utf8");
const pageScript = fileSystem.readFileSync(path.join(templateFolder, "page.js"), "utf8");
const mermaidScriptUrl = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

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
live ones the inlined page script can save, and counts them so the page only
gets the progress bar and script when it needs them.
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
Builds the bar pinned to the top of the page. Static pages show it only when
they have tasks, with a progress track and a reset button. Served pages always
show it, with a status line and no reset, since reset would rewrite the file.
*/
function renderToolbar(taskCount, live) {
  if (taskCount === 0 && !live) return "";
  const progress = taskCount > 0
    ? `<div class="progress-track"><div class="progress-fill"></div></div><span class="progress-label"></span>`
    : "";
  const status = live
    ? `<span class="toolbar-status">${live.writable ? `Live, saving to ${escapeHtml(live.fileName)}` : ""}</span>`
    : "";
  const reset = taskCount > 0 && !live ? `<button type="button" class="progress-reset">Reset</button>` : "";
  return `<div class="progress" role="status" aria-live="polite">${progress}${status}${reset}</div>`;
}

/*
Assembles the final page from Markdown text. The source name sets the
fallback title, the footer, and the checklist storage key, which is based on
the file name so saved progress survives edits and rebuilds of the same file.

Passing options.live with the file's version renders a page for md-press
serve. It is only writable when the task scanner finds exactly as many tasks
as the page rendered, so a checkbox can never be saved to the wrong line.
*/
function renderPage(sourceText, sourceName = "document.md", options = {}) {
  const { metadata, body } = splitFrontmatter(sourceText);
  const documentState = { hasMermaid: false, taskCount: 0 };
  const markdownParser = createParser(documentState);
  const content = enableTaskCheckboxes(markdownParser.parse(body), documentState);
  const title = findTitle(metadata, body, sourceName);
  const baseName = path.basename(sourceName);
  const generatedDate = new Date().toISOString().slice(0, 10);

  const live = options.live
    ? {
        version: options.live.version,
        fileName: baseName,
        writable: findTaskLines(sourceText).length === documentState.taskCount,
      }
    : null;
  const pageSettings = {
    storageKey: "md-press:" + path.basename(sourceName, path.extname(sourceName)),
    live,
  };
  const needsPageScript = documentState.taskCount > 0 || live;
  const scripts = [
    needsPageScript ? `<script>const mdPress = ${JSON.stringify(pageSettings).replace(/</g, "\\u003c")};\n${pageScript}</script>` : "",
    documentState.hasMermaid ? `<script src="${mermaidScriptUrl}"></script><script>if (window.mermaid) mermaid.initialize({ startOnLoad: true, theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "neutral" });</script>` : "",
  ].filter(Boolean).join("\n");
  const footerText = live
    ? `Serving ${escapeHtml(baseName)} with md-press`
    : `Generated ${generatedDate} from ${escapeHtml(baseName)} with md-press`;

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
${renderToolbar(documentState.taskCount, live)}
<main>
${content}
</main>
<footer>${footerText}</footer>
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
