# General Rules of Contribution

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding

State assumptions explicitly. If uncertain, ask rather than guess.
Present multiple interpretations when ambiguity exists.
Push back when a simpler approach exists.
Stop when confused. Name what's unclear.

## Rule 2 — Simplicity First

Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3 — Surgical Changes

Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.

## Rule 4 — Goal-Driven Execution

Define success criteria. Loop until verified.
Don't follow steps. Define success and iterate.
Strong success criteria let you loop independently.

## Rule 5 — Use the model only for judgment calls

Use me for: classification, drafting, summarization, extraction.
Do NOT use me for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Surface conflicts, don't average them

If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

## Rule 7 — Read before you write

Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

## Rule 8 — Tests verify intent, not just behavior

Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 9 — Checkpoint after every significant step

Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

## Rule 10 — Match the codebase's conventions, even if you disagree

Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Rule 11 — Fail loud

"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

## Rule 12 — Soft-wrap markdown-format prose

Do not hard-wrap lines in markdown-format text: markdown files, code comments, and commit/PR messages. Write each paragraph as a single soft-wrapped line and let the editor wrap it. Hard line breaks belong only where they are semantic (list items, headings, code blocks).

# First-Time Setup

This repo is a GitHub template. If `name` in `package.json` is still `library-template` and the repo is not `Saeris/library-template`, this is a fresh clone: offer to walk the user through these steps before starting other work. Delete this section once setup is finished.

## 1. Rename the project

Ask the user for the package name, a description, and the owner details, then replace the placeholders:

- `package.json`: `name`, `description`, `keywords`, `homepage`, `repository`, `author`
- `README.md`: title, tagline, install command, badge links, and the license line
- `LICENSE.md` (copyright holder) and `.github/FUNDING.yml`
- `.github/workflows/release.yml` and `.github/workflows/bumpy-check.yml`: change `github.repository != 'Saeris/library-template'` to `github.repository == '<owner>/<repo>'`. The `!=` form only stops the template itself from releasing; the `==` form also stops forks of the new library from running the release workflow.

Then search the repo for `library-template`, `Saeris`, and `Drake Costa` to confirm nothing was missed.

## 2. Claim the package on npm

npm can't configure trusted publishing until a package exists, and the `publish` job in `release.yml` has no `NPM_TOKEN` to fall back on, so this must happen before the first version PR is merged. [fledgling](https://github.com/dmno-dev/fledgling) publishes a `0.0.0` placeholder to claim the name, then configures the trusted publisher from the `fledgling` block in `package.json`. The repo is detected from the git `origin` remote, so push the renamed project first.

Claiming a name is public and effectively permanent, so show the user the plan and get their confirmation first. They must run `npm login` themselves (2FA is required) and approve the browser prompt when applying:

```bash
npx fledgling add <package> --dry-run  # show the plan, change nothing
npm login                              # the user runs this
npx fledgling add <package> --yes      # claim the name and configure trust
```

- Always name the package. Without a name, fledgling targets every public package in the workspace.
- Use `npx` here, not `vp dlx`: `vp dlx` parses some flags itself instead of passing them on, and a `--dry-run` that goes missing would claim the name for real.
- `workflow` and `environment` in the `fledgling` block must match `release.yml`. If either changes, update both and run `npx fledgling sync`.

## 3. Add the `BUMPY_GH_TOKEN` secret

Without this secret, the version PR that Bumpy opens won't trigger CI. The user creates a [fine-grained token](https://github.com/settings/personal-access-tokens) for this repo only, with read and write access to Contents and Pull requests, and adds it as a repository secret named `BUMPY_GH_TOKEN`.

## 4. Publish to JSR (optional)

Publishing to JSR as well as npm is a personal preference, so ask the user whether they want it and skip this step if not. It needs a JSR scope they belong to (created at [jsr.io/new](https://jsr.io/new)) and a full-access token from their JSR account, which is used once locally and never goes into CI.

1. Add a `jsr` entry to the `fledgling` block. `runtimeCompat` is part of the JSR score and isn't inferred, so ask which runtimes the library supports. `scope` is only needed when the npm name has no scope.

   ```json
   "jsr": {
     "scope": "<scope>",
     "runtimeCompat": { "node": true, "deno": true, "bun": true, "browser": true, "workerd": true }
   }
   ```

2. Show the plan, then have the user apply it with their token in `JSR_TOKEN`. This creates `jsr.json`, claims the package, and links the repo for tokenless publishing:

   ```bash
   npx fledgling jsr <package> --dry-run
   npx fledgling jsr <package> --yes
   ```

3. Add a `publish` entry to `jsr.json`. Without one, JSR uploads every file git doesn't ignore, including `yarn.lock` and the repo's config files:

   ```json
   "publish": {
     "include": ["src", "README.md", "LICENSE.md"],
     "exclude": ["src/__tests__"]
   }
   ```

4. Add these steps to the end of the `publish` job in `release.yml`, which already has the `id-token` permission JSR needs. `jsr.json` holds its own version, so it has to be set to the one Bumpy just released:

   ```yaml
   - run: node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('jsr.json','utf8'));j.version=require('./package.json').version;fs.writeFileSync('jsr.json',JSON.stringify(j,null,2))"

   - run: npx jsr publish --allow-dirty
   ```

JSR publishes the TypeScript source and rejects slow types, so public exports need explicit types: run `npx jsr publish --dry-run --allow-dirty` to check. Runtime dependencies must use real version ranges in `package.json`, because JSR can't read `catalog:` specifiers.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->

<!--WALLABY START-->

# Using Wallaby for Test Feedback

Wallaby runs continuously and gives near-instant test feedback. Prefer it over a fresh `vp test` run — results are already computed and streamed. There are two surfaces:

- **MCP tools** (`mcp__wallaby__*`) — use when Wallaby is alive in the editor. No process spawn, lowest latency.
- **Wallaby CLI** (`npx -y @wallabyjs/cli ...`) — May 2026 addition. Works headless, with no editor session and no MCP server. Use when MCP returns no data, when working in a worktree, or when you want a single Markdown report you can grep.

Docs: https://wallabyjs.com/docs/features/mcp/ (MCP tools) and https://wallabyjs.com/whatsnew/cli.html (CLI). The Wallaby `SKILL.md` is the canonical workflow.

## Workflow (in order)

1. **Get failures** — `mcp__wallaby__wallaby_failingTests`, or `npx -y @wallabyjs/cli run --skill` headless. The result includes test name, file, error, stack trace, and runtime logs.
2. **(Optional) Trace coverage** — `mcp__wallaby__wallaby_coveredLinesForTest` with the failing test's ID, only if step 1's stack trace doesn't make the cause obvious.
3. **(Optional) Inspect runtime values** — `mcp__wallaby__wallaby_runtimeValues` / `wallaby_runtimeValuesByTest`, or `npx -y @wallabyjs/cli inspect "{path:'src/x.ts',location:{fragment:'...'},expression:'...'}"` headless. Skip if the cause is already clear.
4. **Fix the code.**
5. **Verify** — re-run step 1 to confirm the fix and check for regressions. `wallaby_testById` works for a single targeted check.
6. **(Snapshots)** — `wallaby_updateTestSnapshots` / `wallaby_updateFileSnapshots` (preferred) or `--snapshots` on the CLI. Only when the change is intentional.

## CLI specifics

- Always pass `--skill` to `run` — it keeps the Wallaby instance alive between invocations so follow-up calls reuse cached results.
- `run` with no args reports the whole project; pass test file paths to scope to specific files.
- Reports are Markdown with named sections (`Failing Tests`, `All Tests`, `Coverage`, `Runtime Values`). For large reports, `grep -Pzo` for specific tests or files instead of reading the whole file.
- Non-zero exit code usually means failing tests, but can also mean CLI/Wallaby itself failed — check the report's `Fatal Error` / `Global Errors` sections.
- `npx -y @wallabyjs/cli run --update` updates Wallaby if the CLI reports a compatibility error.

## Rules

- Prefer Wallaby (MCP or CLI) over `vp test` for read-only inspection. Both produce correct results; Wallaby is faster.
- A clean Wallaby report ≡ a clean `vp test` run. Trust it.
- If MCP returns `<No data available>`, Wallaby is restarting; fall back to `npx -y @wallabyjs/cli run --skill` rather than `vp test` — same source of truth, headless.
- Never call `wallaby_updateProjectSnapshots`/`--snapshots` (without a path) casually — it rewrites every snapshot. Prefer file-scoped or test-scoped variants.

<!--WALLABY END-->
