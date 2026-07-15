# AGENTS.md

Conventions for anyone — human or AI — contributing documentation to this repo.

## Structure

Documentation samples live under `docs/`, organized by [Diátaxis](https://diataxis.fr/) type:

- `docs/tutorial/` — learning-oriented, step-by-step
- `docs/how-to/` — task-oriented, solves one specific problem
- `docs/reference/` — information-oriented, lookup material
- `docs/explanation/` — understanding-oriented, concepts and reasoning

Each category folder has a `_category_.json` with `label`, `position`, and a `link.slug` + `description` for the generated index page. New pages go in the folder matching their Diátaxis type — don't mix a how-to's task framing into a reference page or vice versa.

## Front matter

Every `.md`/`.mdx` page under `docs/` requires:

```yaml
---
title: <Page title>
sidebar_label: <Short sidebar text>
description: <One sentence, used for SEO and llms.txt>
sidebar_position: <Number>
---
```

## Content rules

- Content is real documentation written for Prove's public developer docs, adapted for this portfolio — don't invent product behavior that doesn't reflect the original source material.
- Code samples should be complete enough to run, not pseudocode.
- Links must be absolute URLs (`https://papadewald86.github.io/portfolio/...` for internal pages) so Doc Detective can verify them — no relative paths.

## Doc Detective tests

Links in `docs/` pages are validated by [Doc Detective](https://doc-detective.com) (see `.doc-detective.json` at the repo root):

- **Markdown links are checked automatically.** A custom `checkHyperlink` markup rule turns every `[text](https://…)` link into a `checkLink` — no manual test needed. This is why all links, including internal ones, must be written as **absolute URLs** (`https://papadewald86.github.io/portfolio/...`), never relative paths.
- **URLs inside code blocks need explicit tests.** Auto-detection can't see into code fences, so add an inline `{/* test */}` / `{/* step */}` block (JSX comments — HTML comments break MDX) with a `checkLink` step for any load-bearing URL that only appears in a code sample.
- The config restricts auto-detection markup to `checkHyperlink` only — bold text and headings do not generate test steps, so they can't produce false failures.

Confirm `npm run test:docs` passes before opening a PR.

## llms.txt

`static/llms.txt` is a hand-written index of every page on this site. Any PR that adds, removes, or renames a page under `docs/` or `src/pages/` must update `static/llms.txt` in the same PR.

## Review checklist

A docs PR is ready to merge when:

1. The page is in the folder matching its actual Diátaxis type.
2. Front matter is complete (title, sidebar_label, description, sidebar_position).
3. `static/llms.txt` reflects any added/removed/renamed pages.
4. Internal links resolve to real pages.
5. Code samples are complete and runnable, not placeholders.
6. New external links or API endpoints have a passing Doc Detective `checkLink` test.
