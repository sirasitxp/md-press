/*
Finds task list items in Markdown source so a checkbox on the page can be
written back to the exact line it came from. It scans line by line in
document order, which is the order the page renders checkboxes, and skips
frontmatter and fenced code, where "- [ ]" is only text.

This scanner is deliberately simple, so it is paired with a safety check:
the server only allows writing when the number of tasks found here equals the
number of checkboxes the page rendered. Any layout the scanner misreads turns
into a read-only page instead of an edit to the wrong line.
*/

const { frontmatterLength } = require("./frontmatter.js");

const taskLinePattern = /^((?:[ \t]*>)*[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+\[)([ xX])(\](?:\s|$))/;
const fenceOpenPattern = /^(?:[ \t]*>)*[ \t]{0,3}(`{3,}|~{3,})/;

/*
Returns every task line as { lineIndex, checked }. Line indexes count from the
start of the whole file, frontmatter included, so they can be used to edit it.
*/
function findTaskLines(sourceText) {
  const lines = sourceText.split("\n");
  const firstBodyLine = sourceText.slice(0, frontmatterLength(sourceText)).split("\n").length - 1;
  const tasks = [];
  let openFence = null;

  for (let lineIndex = firstBodyLine; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const fenceMatch = line.match(fenceOpenPattern);
    if (openFence) {
      const closes = fenceMatch
        && fenceMatch[1][0] === openFence[0]
        && fenceMatch[1].length >= openFence.length
        && line.trim().replace(/^(>\s*)*/, "").replace(/[`~]/g, "") === "";
      if (closes) openFence = null;
      continue;
    }
    if (fenceMatch) {
      openFence = fenceMatch[1];
      continue;
    }
    const taskMatch = line.match(taskLinePattern);
    if (taskMatch) tasks.push({ lineIndex, checked: taskMatch[2] !== " " });
  }
  return tasks;
}

/*
Returns the source with one task set to checked or unchecked. Only the single
character between the brackets changes, so spacing, line endings, and every
other byte of the file stay exactly as they were.
*/
function setTaskState(sourceText, taskIndex, checked) {
  const tasks = findTaskLines(sourceText);
  const task = tasks[taskIndex];
  if (!task) throw new RangeError(`No task at index ${taskIndex}`);
  const lines = sourceText.split("\n");
  lines[task.lineIndex] = lines[task.lineIndex].replace(taskLinePattern, (_fullMatch, before, _state, after) => {
    return before + (checked ? "x" : " ") + after;
  });
  return lines.join("\n");
}

module.exports = { findTaskLines, setTaskState };
