/*
Tests for the page builder and the command line. Uses Node's built-in test
runner so the project needs no test dependencies.
*/

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fileSystem = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { renderPage, splitFrontmatter } = require("../src/build.js");

const commandPath = path.join(__dirname, "..", "bin", "md-press.js");

test("frontmatter title wins over the first heading", () => {
  const page = renderPage("---\ntitle: From Frontmatter\n---\n# From Heading\n", "notes.md");
  assert.match(page, /<title>From Frontmatter<\/title>/);
});

test("first heading is the title when there is no frontmatter", () => {
  const page = renderPage("# Weekly **Plan**\n\nText", "notes.md");
  assert.match(page, /<title>Weekly Plan<\/title>/);
});

test("file name is the title when there is no heading", () => {
  const page = renderPage("Just text", "folder/release-notes.md");
  assert.match(page, /<title>release-notes<\/title>/);
});

test("frontmatter reads quoted values and ignores lines without a colon", () => {
  const { metadata, body } = splitFrontmatter('---\ntitle: "Quoted"\nnot a pair\n---\nBody');
  assert.deepEqual(metadata, { title: "Quoted" });
  assert.equal(body, "Body");
});

test("task list items become live checkboxes with a progress bar", () => {
  const page = renderPage("- [ ] open\n- [x] done\n", "list.md");
  assert.equal((page.match(/class="task"/g) || []).length, 2);
  assert.match(page, /<input type="checkbox" class="task" checked>/);
  assert.doesNotMatch(page, /<input[^>]*disabled/);
  assert.match(page, /class="progress"/);
  assert.match(page, /"storageKey":"md-press:list"/);
  assert.match(page, /class="progress-reset"/);
});

test("pages without tasks get no progress bar or checklist script", () => {
  const page = renderPage("# Plain\n\n- item", "plain.md");
  assert.doesNotMatch(page, /class="progress"/);
  assert.doesNotMatch(page, /mdPress/);
});

test("code is highlighted and unknown languages fall back to plain text", () => {
  const page = renderPage("```js\nconst answer = 42;\n```\n\n```notalanguage\n<b>raw</b>\n```\n", "code.md");
  assert.match(page, /<span class="hljs-keyword">const<\/span>/);
  assert.match(page, /&lt;b&gt;raw&lt;\/b&gt;/);
});

test("mermaid loads only when a diagram exists and is guarded for offline use", () => {
  const withDiagram = renderPage("```mermaid\nflowchart LR\n  A --> B\n```\n", "diagram.md");
  assert.match(withDiagram, /<pre class="mermaid">/);
  assert.match(withDiagram, /if \(window\.mermaid\)/);
  assert.doesNotMatch(renderPage("# No diagram", "plain.md"), /mermaid\.min\.js/);
});

test("frontmatter keeps quotes that do not wrap the whole value", () => {
  const { metadata } = splitFrontmatter("---\ntitle: Say \"hi\"\nname: 'single'\n---\n");
  assert.equal(metadata.title, 'Say "hi"');
  assert.equal(metadata.name, "single");
});

test("titles and descriptions are escaped", () => {
  const page = renderPage('---\ntitle: A <b> & "C"\ndescription: x < y\n---\n', "escape.md");
  assert.match(page, /<title>A &lt;b&gt; &amp; &quot;C&quot;<\/title>/);
  assert.match(page, /content="x &lt; y"/);
});

test("command line builds files into an output folder", () => {
  const workFolder = fileSystem.mkdtempSync(path.join(os.tmpdir(), "md-press-"));
  const sourcePath = path.join(workFolder, "notes.md");
  fileSystem.writeFileSync(sourcePath, "# Notes\n");
  const outputFolder = path.join(workFolder, "pages");
  execFileSync(process.execPath, [commandPath, sourcePath, "--out", outputFolder]);
  assert.match(fileSystem.readFileSync(path.join(outputFolder, "notes.html"), "utf8"), /<title>Notes<\/title>/);
});

test("command line accepts the build subcommand", () => {
  const workFolder = fileSystem.mkdtempSync(path.join(os.tmpdir(), "md-press-"));
  const sourcePath = path.join(workFolder, "notes.md");
  fileSystem.writeFileSync(sourcePath, "# Notes\n");
  execFileSync(process.execPath, [commandPath, "build", sourcePath]);
  assert.ok(fileSystem.existsSync(path.join(workFolder, "notes.html")));
});

test("command line reports missing files and bad options", () => {
  const missing = spawnSync(process.execPath, [commandPath, "does-not-exist.md"], { encoding: "utf8" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /file not found/);

  const badOption = spawnSync(process.execPath, [commandPath, "notes.md", "--out"], { encoding: "utf8" });
  assert.equal(badOption.status, 1);
  assert.match(badOption.stderr, /--out needs a folder name/);
});

test("command line prints the version", () => {
  const { version } = require("../package.json");
  const output = execFileSync(process.execPath, [commandPath, "--version"], { encoding: "utf8" });
  assert.equal(output.trim(), version);
});

test("live pages show status instead of reset and are writable when tasks line up", () => {
  const page = renderPage("# Plan\n\n- [ ] one\n- [x] two\n", "plan.md", { live: { version: "abc" } });
  assert.match(page, /"live":\{"version":"abc","fileName":"plan.md","writable":true\}/);
  assert.match(page, /Live, saving to plan.md/);
  assert.doesNotMatch(page, /class="progress-reset"/);
});

test("live pages without tasks still get the page script for reloading", () => {
  const page = renderPage("# Notes\n", "notes.md", { live: { version: "abc" } });
  assert.match(page, /const mdPress = /);
  assert.match(page, /Serving notes.md with md-press/);
});

test("live pages turn read-only when tasks cannot be matched to lines", () => {
  const indentedCode = "Intro\n\n    - [ ] shown as code, not a checkbox\n\n- [ ] real task\n";
  const page = renderPage(indentedCode, "mismatch.md", { live: { version: "abc" } });
  assert.equal((page.match(/class="task"/g) || []).length, 1);
  assert.match(page, /"writable":false/);
});

test("file names cannot break out of the inline script", () => {
  const page = renderPage("- [ ] one\n", "a<b>.md", { live: { version: "abc" } });
  assert.doesNotMatch(page, /"fileName":"a<b>/);
  assert.match(page, /"fileName":"a\\u003cb>.md"/);
});
