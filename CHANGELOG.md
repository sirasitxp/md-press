# Changelog

## 0.1.0

First release.

### Build

- `md-press <file.md>` builds one self-contained HTML page per file, next to the source or into `--out`
- Light and dark mode, print styles, readable on phones
- Code highlighting at build time
- Task lists become checkboxes that save progress in the browser, with a progress bar and reset
- Title from frontmatter, the first heading, or the file name
- Mermaid diagrams, loaded only on pages that have one and skipped quietly when offline

### Serve

- `md-press serve <file.md>` opens the file as a live page on localhost
- Checking a box writes `[x]` into the file, changing only that one character
- The page reloads when the file changes on disk and keeps its scroll position
- Saves are refused if the file changed since the page loaded, so outside edits are never overwritten
- Writes are atomic, and the page turns read-only if any checkbox cannot be matched to its line
- Files next to the Markdown file are served so relative images work; dotfiles and anything outside the folder are not
- Answers only requests addressed to localhost; `--port` and `--no-open` options
