# Roadmap

md-press grows by adding views of the same Markdown file, not by adding features to one view. Every mode keeps the file as the source of truth. Reasons behind these choices are in [Decisions](decisions.md).

## 0.1

- [x] `md-press <file>`: static, self-contained pages
- [x] `md-press serve <file>`: a live page on localhost that saves checkboxes into the file and reloads when the file changes

## Next: 0.2

- [ ] `md-press board <BACKLOG.md>`: a live Kanban board built on the same server
  - `##` headings are columns, top-level `- [ ]` items are cards, trailing `` `code` `` spans are tags
  - Drag cards between columns, edit and add cards, filter by tag
  - Reuses serve's version checks, atomic writes, and localhost-only rules
  - Round-trip tests prove the file comes back byte for byte
  - The last column counts as done, and tag colors come from the tag name, so it works with any backlog
- [ ] Publish from GitHub releases with npm trusted publishing, so no tokens are stored anywhere

## Later

- [ ] Watch mode for build that rebuilds on save
- [ ] Table of contents for long pages
- [ ] Page themes chosen with a flag
- [ ] Serving to phones on the same network, behind an explicit flag

## Not planned

Editors, accounts, plugin systems, hosted services. Each would trade the tool's simplicity for features other tools already do well.
