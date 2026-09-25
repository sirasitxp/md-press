/*
Tests for the task scanner that maps page checkboxes to lines in the file.
The rule these protect: a change touches exactly one character, on exactly the
right line, and leaves every other byte of the file alone.
*/

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { findTaskLines, setTaskState } = require("../src/tasks.js");
const { renderPage } = require("../src/build.js");

function renderedTaskCount(sourceText) {
  return (renderPage(sourceText, "count.md").match(/class="task"/g) || []).length;
}

test("finds tasks in bullet, ordered, nested, and quoted lists", () => {
  const source = [
    "- [ ] dash",
    "* [x] star",
    "+ [X] plus",
    "1. [ ] ordered",
    "2) [x] ordered with paren",
    "- parent",
    "  - [ ] nested",
    "> - [ ] quoted",
    "",
  ].join("\n");
  assert.deepEqual(findTaskLines(source).map((task) => [task.lineIndex, task.checked]), [
    [0, false], [1, true], [2, true], [3, false], [4, true], [6, false], [7, false],
  ]);
  assert.equal(findTaskLines(source).length, renderedTaskCount(source));
});

test("skips tasks inside fenced code and frontmatter", () => {
  const source = [
    "---",
    "title: Plan",
    "---",
    "- [ ] real one",
    "```md",
    "- [ ] example in code",
    "```",
    "~~~",
    "- [x] also code",
    "~~~",
    "- [x] real two",
    "",
  ].join("\n");
  assert.deepEqual(findTaskLines(source).map((task) => task.lineIndex), [3, 10]);
  assert.equal(findTaskLines(source).length, renderedTaskCount(source));
});

test("a shorter fence does not close a longer one", () => {
  const source = "````\n```\n- [ ] still code\n```\n````\n- [ ] real\n";
  assert.deepEqual(findTaskLines(source).map((task) => task.lineIndex), [5]);
});

test("ignores brackets that are not tasks", () => {
  const source = "- [link](https://example.com)\n- [ ]no space after\n-[ ] no space before\ntext - [ ] mid line\n";
  assert.equal(findTaskLines(source).length, 0);
  assert.equal(renderedTaskCount(source), 0);
});

test("setTaskState changes only the bracket character", () => {
  const source = "# Plan\n\n- [ ] first\n  - [ ] nested **bold**\n- [x] third\n";
  assert.equal(setTaskState(source, 1, true), "# Plan\n\n- [ ] first\n  - [x] nested **bold**\n- [x] third\n");
  assert.equal(setTaskState(source, 2, false), "# Plan\n\n- [ ] first\n  - [ ] nested **bold**\n- [ ] third\n");
});

test("setTaskState keeps Windows line endings and trailing text", () => {
  const source = "- [ ] one\r\n- [ ] two `tag`\r\n";
  assert.equal(setTaskState(source, 1, true), "- [ ] one\r\n- [x] two `tag`\r\n");
});

test("setTaskState refuses an index that does not exist", () => {
  assert.throws(() => setTaskState("- [ ] only\n", 3, true), RangeError);
});
