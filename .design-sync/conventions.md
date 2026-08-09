# Quote Vault — how to build with this design system

**Read this before the generated sections below.** Quote Vault is a **styles-only** design
system: a stylesheet and a CSS-variable token set, with **no component library**. The
generated text below describes a React package because the converter assumes one — ignore
it. `window.QuoteVault` is an **empty object**; there is nothing to import from it, and
`components/`, `tokens/`, and `.prompt.md` files do not exist here.

You build with **your own markup** — plain HTML or JSX — styled with the class names and
tokens below. That markup is what ships into the real app, which renders every view by
returning HTML strings from vanilla-JS functions.

## Setup

Link the stylesheet once. Everything (tokens, fonts, component styles) is reachable
through it:

```html
<link rel="stylesheet" href="styles.css">
```

**Theming is an attribute on `<html>`, nothing else.** The dark palette is defined as
`:root[data-theme='dark']`, so it only applies on the document root — setting `data-theme`
on a wrapper `<div>` does nothing:

```js
document.documentElement.dataset.theme = 'dark';  // omit the attribute for light
```

Body text is **DM Sans**; headings, quotes, and other display text use **Cormorant
Garamond** (serif). Both ship as `@font-face` in `fonts/`. Code blocks fall back to system
monospace by design.

## The styling idiom

**Semantic, hyphenated class names — no utility classes, no CSS-in-JS.** There is no
`p-4`, no `flex`, no `bg-surface`. Each UI concept owns a class, and its parts are
suffixed: `quote-card` → `quote-header`, `quote-text`, `quote-meta`, `quote-author`,
`quote-tags`, `quote-actions`. Follow that pattern rather than inventing new vocabulary.

Main families (all present in the stylesheet):

| Family | Examples |
|---|---|
| Quotes | `quote-card`, `quote-reply`, `quote-text`, `quote-author`, `quote-notes`, `replies-toggle` |
| Stance | `stance` + `stance-favor` / `stance-against` / `stance-neutral` |
| Buttons | `btn` + `btn-primary` / `btn-secondary` / `btn-danger` / `btn-link` / `btn-icon` / `btn-small`, plus `action-btn`, `favorite-btn`, `view-btn`, `btn-close` |
| Cards | `insight-card`, `section-card`, `entry-item`, `card-color-0`…`card-color-7` |
| Layout | `app-layout`, `main-area`, `nav-sidebar`, `nav-item`, `sidebar-toc` |
| Overlays | `modal-content`, `modal-header`, `toast`, `toast-container`, `tooltip-bubble` |
| Forms | `form-group`, `form-row`, `filters-panel`, `filter-chip` |
| Tags/state | `tag`, `collection-tag`, `topic-tag`, `status-dot`, `empty-state` |

State is expressed with the bare modifiers `active`, `selected`, and `hidden` alongside the
base class (`<button class="view-btn active">`), not with separate variant classes.

## Tokens

For your own layout glue, use `var(--*)` — never hard-coded hex. Every token has a light
and dark value, so using them is what makes a design theme-correct for free:

- Surfaces: `--bg`, `--surface`, `--bg-light`, `--border`
- Text: `--text`, `--text-primary`, `--text-light`, `--text-muted`
- Accent: `--accent`, `--accent-strong`, `--accent-strong-hover`, `--tag-bg`
- Semantic: `--favor`, `--against`, `--neutral`
- Status: `--status-draft`, `--status-reviewed`, `--status-integrated`, `--status-discarded`
- Topic icons: `--icon-color`, `--icon-bg-start`, `--icon-bg-end`, `--icon-border`

Spacing, radii, and type scales are **not** tokenized — they are literal values inside each
rule. Read the stylesheet before styling anything new.

## Where the truth lives

`styles.css` `@import`s `fonts/fonts.css` and `_ds_bundle.css`. **`_ds_bundle.css` is the
whole design system** (~150 KB, the app's real `src/styles.css`). Grep it for a class before
inventing one — if a rule already exists, use its name.

## Idiomatic example

A quote card, matching the app's own markup:

```jsx
<article className="quote-card">
  <div className="quote-header">
    <button className="favorite-btn active" aria-label="Remove from favorites">★</button>
  </div>
  <p className="quote-text">The unexamined life is not worth living.</p>
  <div className="quote-meta">
    <div>
      <div className="quote-author">— Socrates</div>
      <div className="quote-source">Apology, 38a</div>
    </div>
    <div className="quote-tags">
      <span className="collection-tag">Philosophy</span>
      <span className="stance stance-favor">In favor</span>
      <span className="tag">ethics</span>
    </div>
  </div>
  <div className="quote-actions">
    <button className="action-btn">Reply</button>
    <button className="action-btn">Edit</button>
    <button className="action-btn delete">Delete</button>
  </div>
</article>
```
