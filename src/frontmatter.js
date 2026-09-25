/*
Reads the optional frontmatter block at the top of a Markdown file. Only
simple "key: value" lines are supported, which covers title and description.
Values wrapped in matching quotes lose those quotes; quotes inside a value
are kept. Shared by the page builder and the task scanner so both agree on
where the Markdown body starts.
*/

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function frontmatterLength(sourceText) {
  const match = sourceText.match(frontmatterPattern);
  return match ? match[0].length : 0;
}

function splitFrontmatter(sourceText) {
  const match = sourceText.match(frontmatterPattern);
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

module.exports = { splitFrontmatter, frontmatterLength };
