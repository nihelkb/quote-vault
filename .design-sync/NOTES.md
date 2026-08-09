# design-sync notes — quote-vault

## What this repo is (read first)

- **Quote Vault is not a React design system.** It is a vanilla-JS Vite app: views are
  HTML-string functions (`src/components/QuoteCard.js`) and subclasses of a custom
  `src/core/Component.js`. There is no component library, no Storybook, no `*.stories.*`,
  and `dist/` is an app bundle, not a library build.
- This sync is therefore a **tokens/styles-only import** — the converter's supported
  `[ZERO_MATCH] → tokens-only DS` path (`lib/source-kit.mjs`). It ships `src/styles.css`
  plus the brand fonts, and nothing else. Expect `components: 0` on every run; that is
  correct, not a discovery failure.
- If the repo ever grows a real React component library, this config needs revisiting from
  scratch — the tokens-only path would then be actively hiding components.

## Build invocation

The converter must be run with explicit `--entry` and a non-default `--node-modules`:

```sh
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules ./.ds-sync/node_modules --entry ./.design-sync/ds-entry.js --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle --no-render-check
```

- **`--entry ./.design-sync/ds-entry.js`** is a committed, deliberately empty ES module.
  It exists only so the converter can resolve `PKG_DIR` by walking up to the repo-root
  `package.json`. Without it the build dies at `[NO_DIST]`. The resulting `_ds_bundle.js`
  is a ~1 KB IIFE assigning an empty `window.QuoteVault` — that is the intended output.
- **`--node-modules ./.ds-sync/node_modules`**, not the repo's own. The converter vendors
  React into `_vendor/` and hard-fails without it; `react`/`react-dom` are installed into
  the isolated `.ds-sync/` deps dir so the app's real dependencies stay untouched. Do not
  add react to the repo's `package.json` to satisfy this.
- No `buildCmd` — there is nothing to pre-build. `src/styles.css` is the source of truth
  and is copied verbatim into `_ds_bundle.css`.

## Fonts

- `index.html:16` loads **DM Sans** + **Cormorant Garamond** from a Google Fonts `<link>`.
  `src/styles.css` has no `@import`, so the converter could not see them and fired
  `[FONT_MISSING]` — designs would have silently rendered in fallback fonts.
- Resolved by self-hosting: latin + latin-ext woff2 subsets were downloaded and committed
  to `.design-sync/fonts/`, with a hand-written `fonts.css`, wired via `cfg.extraFonts`.
  Both families are SIL Open Font License, so redistribution is fine.
- **Regenerating them**: the fetch script is not committed (it was a one-off in scratch).
  It pulled the exact `<link>` URL from `index.html:16`, kept only the `/* latin */` and
  `/* latin-ext */` blocks, downloaded each `woff2`, and rewrote `url()` to a relative
  sibling path. Re-do that if the app's font `<link>` ever changes.

## Known warnings (both accepted — do not re-chase)

- `[FONT_MISSING] "JetBrains Mono", "Fira Code"` — `src/styles.css:4031` names them in a
  code-block stack that ends in `monospace`, but `index.html` never loads them either, so
  the live app already falls back to system monospace. **User explicitly accepted the
  substitute** (2026-08-09) because shipping them would make designs diverge from
  production. A future run that self-hosts them is a deliberate change, not a fix.
- `[RENDER_SKIPPED]` from `--no-render-check` — there are **zero** `<Name>.html` preview
  cards in a tokens-only bundle, so the render check has nothing to open. Playwright was
  deliberately not installed. **User explicitly accepted** (2026-08-09). This warn is
  expected on every run of this repo; it does not mean anything went unverified.

## Re-sync risks

- **`conventions.md` is the whole deliverable here.** With no components, no `.d.ts`, and
  no preview cards, the README header is the only thing teaching the design agent this
  system. It enumerates real class names and tokens — **re-validate every one against the
  fresh `ds-bundle/_ds_bundle.css` on each sync** (grep `\.<class>[^a-z0-9-]` and
  `--<token>:`). `src/styles.css` is app CSS under active development, so renamed or
  deleted classes are the most likely silent rot.
- The header explicitly tells the agent to **ignore the converter's generated sections**,
  which describe a React package that does not exist. If the generated README template
  ever changes, re-read the stitched output and make sure that contradiction is still
  handled.
- `conventions.md` documents theming as `<html data-theme="dark">` (from
  `:root[data-theme='dark']` in the stylesheet and
  `src/features/layout/ThemeToggle.js:55`). If theming moves to a wrapper element, the
  header's setup section becomes wrong.
- Spacing/radii/type are **not** tokenized — literal values live in each rule. If a token
  layer is ever introduced, the header's "Tokens" section needs the new families.
- `.ds-sync/` deps (`esbuild`, `ts-morph`, `@types/react`, `react`, `react-dom`) are
  gitignored and reinstalled per clone. `[DTS_REACT]` warns that `@types/react` is missing
  even when installed — harmless here, since there are 0 components to type.
