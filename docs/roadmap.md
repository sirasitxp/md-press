# Roadmap

md-press grows by adding views of the same Markdown file, not by adding features to one view. Every mode keeps the file as the source of truth.

## Shipped

- [x] **0.1** `md-press <file>`: static, self-contained pages

## Next

- [ ] **0.2** `md-press board <BACKLOG.md>`: a live Kanban board on localhost that reads and writes the file
  - `##` headings are columns, top-level `- [ ]` items are cards, trailing `` `code` `` spans are tags
  - Saves check the file's version and refuse if it changed underneath, so people and agents can edit it at the same time
  - Writes are atomic: a temp file, then a rename
  - Answers only requests addressed to localhost
  - Round-trip tests prove the file comes back byte for byte
  - The last column counts as done, and tag colors come from the tag name, so it works with any backlog

## Later

- [ ] `md-press serve <file>`: the static page, but checking a box writes `[x]` back to the file
- [ ] Watch mode that rebuilds on save
- [ ] Table of contents for long pages
- [ ] Page themes chosen with a flag

## Not planned

Editors, accounts, plugin systems, hosted services. Each would trade the tool's simplicity for features other tools already do well.
