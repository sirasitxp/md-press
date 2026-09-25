# Decisions

Why md-press is the way it is. Newest first. Each entry records what was decided, why, and what was traded away, so later changes can revisit a choice on purpose instead of by accident.

## 2026-09-25: Publish as `@sirux/md-press`

**Decision.** The npm package is `@sirux/md-press`, under a Sirux npm organization. The command stays `md-press`.

**Why.** npm refused the plain name `md-press` as too similar to the existing `mdpress`. A scope avoids the clash, and the Sirux organization gives every future Sirux tool one home and one brand.

**Trade-off.** A longer install line (`npm install -g @sirux/md-press`). Nothing changes once it is installed.

## 2026-09-25: Ship `serve` in 0.1.0

**Decision.** Add `md-press serve <file.md>`, a live page on localhost that saves checkbox changes into the Markdown file and reloads when the file changes on disk. It ships in the first release instead of waiting.

**Why.** A static page saves progress only in one browser, so it cannot prove a change reached the file. Working on the file directly, with people, editors, and agents all touching it, is the main way md-press is meant to be used. Nothing was published yet, so there was no cost to including it.

**Trade-off.** A bigger first release, and md-press now includes a small server. It stays small: one file, Node's built-in `http`, no new dependencies.

## 2026-09-25: A served page writes only what it can place exactly

**Decision.** Checkboxes map to lines through a simple line scanner. The page is writable only when the scanner finds exactly as many tasks as the page renders. Otherwise it opens read-only and says so.

**Why.** Writing to the wrong line of someone's file is the worst possible bug for this tool. A count check turns every case the scanner misreads into a safe, visible read-only page.

**Trade-off.** Rare layouts, such as a task inside an indented code block, make the whole page read-only rather than only the affected item.

## 2026-09-25: Protect the file on every save

**Decision.** Each save sends the version (a hash) of the file the page was built from. The server refuses it with 409 if the file changed since, and the page reloads. Writes go to a temporary file that is renamed over the original. The read, check, and write run with no pause in between, so two saves cannot interleave. Only the one character between a task's brackets changes.

**Why.** The file is the source of truth and can change at any moment. Losing someone's edit, or leaving a half-written file, is not acceptable.

**Trade-off.** A save that races an outside edit is dropped, and the user clicks again on the reloaded page.

## 2026-09-25: The server trusts only localhost

**Decision.** Bind to `127.0.0.1`, answer only requests addressed to `localhost`, accept saves only as JSON, and serve files next to the Markdown file but never dotfiles or anything outside that folder.

**Why.** A local server can be reached by any website the user visits. The host check blocks DNS rebinding, JSON-only saves force a CORS preflight that is never granted, and the file rules keep `.env`, `.git`, and the rest of the disk private.

**Trade-off.** No phone or LAN access to a served page. That can come later behind an explicit flag.

## 2026-09-25: No reset button on served pages

**Decision.** Served pages show a live status instead of Reset.

**Why.** On a built page, Reset clears browser storage. On a served page, the same button would rewrite the file, which is too easy to press by mistake.

## 2026-09-25: Raw HTML in Markdown is kept

**Decision.** md-press follows the Markdown spec and keeps inline HTML, so `<kbd>` and `<details>` work. To show a tag as text, wrap it in backticks.

**Why.** Escaping HTML would break real uses, and users press their own files. The risk (a file with a script runs that script) is documented in the README and SECURITY.md.

**Trade-off.** Never press or serve files you do not trust.

## 2026-09-25: One package, subcommands per view

**Decision.** md-press is one command with modes (`build`, `serve`, and `board` next) rather than separate tools.

**Why.** Every mode is a different view of the same Markdown file. One install, one parser, one look, one name.

**Trade-off.** Modes must stay small and share code, or the package grows too broad. See the roadmap's "Not planned" list.

## 2026-09-25: Name, license, and home

**Decision.** Named `md-press`, MIT license, repository at `github.com/sirasitxp/md-press`, made by Sirux. (The npm package name was later scoped, see above.)

**Why.** The name says what it does. MIT is the norm for npm tools, and npm packages ship readable source anyway.

## 2026-09-24: Pure code, no AI

**Decision.** Converting Markdown uses a parser, never a model.

**Why.** Converting Markdown is a solved, deterministic problem. Code is instant, free, repeatable, and works offline.

## 2026-09-24: Inline everything, except Mermaid

**Decision.** Built pages inline their styles and scripts. Mermaid loads from jsDelivr only on pages with a diagram, and pages skip it quietly when offline.

**Why.** A page that depends on nothing breaks for no one. Bundling Mermaid would add megabytes to every install for a feature most pages never use.
