# AGENTS.md

Static site for **Xia's Projekt** — a catalog of custom Android ROM ports (Nothing OS, Oxygen OS, Color OS, Transsion OS, HelloUI, HyperOS, Origin OS) for Infinix and Tecno devices. Deployed via GitHub Pages. **No build system, no framework, no dependencies, no tests.** Everything is vanilla HTML/CSS/JS that GitHub Pages serves straight from the `main` branch. Deploying = committing and pushing to `main`.

## Commands

- **Run locally**: `python3 linux_local_test.py` (serves repo root at `http://localhost:8000`; has `allow_reuse_address` so restarts don't hit "address already in use"). The older `local_testing.py` does the same with less error handling.
- **"Build", test, lint**: none exist. Behavior is exercised by opening the site in a browser; `?os=<id>` deep links the detail page.
- The img `onerror` fallback is `assets/images/placeholder.svg` (a brand placeholder, committed).

## Architecture

Single-page app driven by `OS_DATA`, a global array of OS objects.

### Data flow

1. `index.html` loads scripts in this exact order (order matters):
   - `assets/js/init-data.js` — declares `const OS_DATA = []`
   - `assets/js/data/*.js` — seven files, each appends one OS via `OS_DATA.push({...})`
   - `assets/js/script.js` — all rendering and interaction logic
2. `script.js` immediately runs an **auto-publish filter** (top of file): any download item whose `date` is in the future is removed on the client, so releasing = simply committing an item with a future date. Empty download groups are dropped; if an OS ends up with zero downloads, `hide: true` is set on it. This runs client-side against the visitor's clock.
3. The home index renders the ROM catalog in one of two layouts (**view toggle**, persisted in `localStorage('view-mode')`; mobile defaults to `list`, desktop to `grid`):
   - **Grid** (`#cards-container`, class `cards-grid`): `article.os-card` cards with a 16:9 banner image, badges overlay, title/desc, and a footer with the download count + updated date.
   - **List** (container gets `view-list`, rows are `.os-card.list-row`): a compact 16:9 banner thumbnail (`.list-row-img`, 132px desktop / 108px mobile), inline status badges, download count + updated date in `.list-row-meta`, arrow on the right. Faster to scan on phones.
   Cards are filtered by device via a **custom CSS dropdown** (`.device-select` / `.filter-dropdown`, not a native `<select>` — see `deviceSelectHTML`/`bindDeviceSelects`).
4. The hero sits above the grid: an editorial header (eyebrow + H1 + sub) plus the `latest-strip`, an unboxed typographic rule (hairline top/bottom, no container box) that deep-links to the newest dated OS via `renderLatestDrop()`. It shows label + OS name + version (`#latest-drop-version`) + unboxed tag + added date + arrow.
4. Clicking a card does `history.pushState` + sets `?os=<id>` in the URL; the detail page renders all `downloads` groups for that OS.
5. Routing: `window.popstate` and the initial `?os=` query param re-render the matching view via `openDetail(id)` / `navigateHome()`. `openDetail` redirects to home if the OS id is unknown or hidden.

### Key functions in `assets/js/script.js`

- `filterFutureReleases()` (IIFE) — the auto-publish logic above.
- `populateHomeDeviceFilter()` / `buildCards(deviceFilter)` — home catalog rendering (grid **and** list variants); reads `os.hide`, `os.name`, `os.shortDesc`, `os.image`, computes "NEW"/STABLE/PRE-RELEASE/BETA badges from item tags. Stagger animation delay is scaled by `reducedMotion` (0 when `prefers-reduced-motion`).
- `currentView` / `setView(mode)` / `initViewToggle()` — grid-vs-list state; `setView` re-renders via `buildCards(currentDeviceFilter)`.
- `deviceSelectHTML(cb, arg, options, current)` / `bindDeviceSelects()` / `setDeviceSelectValue(wrap, value)` — the custom dropdown machinery. Options are stored in `deviceSelectStore` keyed by `data-key`; each wrapper is bound once (`data-bound`), chooses call `window[cb]` (e.g. `buildCards(value)` or `renderDownloads(osId, value)`), closes on outside click / Escape, keyboard-navigable (arrows + Enter/Space).
- `openDetail(id)` / `renderDownloads(id, filterValue)` — detail page; builds the device filter (same custom dropdown) + download list.
- `getLatestDate(os)` — newest `item.date` across all groups, used for sorting.
- `openModal(fileUrl)` — fetches a `guides/*.md` file and renders it with **marked.js** (loaded from jsDelivr CDN in `index.html`). 404s show an inline error, so a missing guide is not fatal.
- `renderLatestDrop()` — fills the hero `latest-strip` with the newest dated visible OS (name, version, date, optional tag chip) and links it to `?os=<id>`.
- `toggleTheme()` / `setDockContext()` — theme switching (shared by the desktop nav Theme button and the mobile dock Theme button) and the state-aware mobile dock Back button.
- `showDownloadWarning(url)` — every download/mirror button goes through this 5s-countdown modal before `window.open`.
- `openReaderModal(url)` / `parseTelegraphNodes(nodes)` — changelog viewer. If `os.changelog` is a `telegra.ph` URL it calls the Telegraph API (`https://api.telegra.ph/getPage/{slug}?return_content=true`) and converts the JSON node tree to HTML.

## Data format (`assets/js/data/*.js`)

One file per OS, each a single `OS_DATA.push({...})`. All data changes are plain edits to these files.

```js
OS_DATA.push({
  id: "nothing-os",            // URL slug, must match ?os=<id>, lowercase-hyphen
  name: "Nothing OS",          // display name, used in <title> too
  hide: false,                 // hard-hide the OS (see origin-os.js)
  image: "assets/images/banners/nothingos.jpg",
  shortDesc: "...",            // card subtitle
  fullDesc: "...",             // detail page description
  changelog: "https://telegra.ph/...", // if it contains "telegra.ph" → in-site reader; else an <a href> to it
  guideFile: "guides/nothing-os.md",
  downloads: [
    {
      group: "Stable Releases",   // arbitrary heading label, rendered as a section title
      items: [
        { name, version, tag, device, meta, date, url, url2? }
      ]
    }
  ]
});
```

Item fields:

- `name` — display name of the build.
- `version` — short version string. **Rendered as plain typographic accent, not a chip**: `.version-chip` has no border/background/padding (the boxed look was removed on purpose). The tag chip right before it carries the visual container instead.
- `tag` — one of `stable` / `pre` / `alpha` / `beta`. **Case is inconsistent across files** ("Stable", "PRE", "stable", "alpha"); code always lowercases before comparing, and the chip's CSS class is `item.tag.toLowerCase()`. Badges: stable → STABLE, pre/alpha → PRE-RELEASE, beta → BETA, anything else on a card shows as `PORT`.
- `device` — **must match other entries exactly** to appear under the same device filter (the site uses `===` equality, not fuzzy matching). Known devices: "Infinix GT 10 Pro", "Infinix Zero 30 5G", "Infinix GT 20 Pro", "Infinix Hot 50 Pro 4G", "Infinix Hot 50 Pro+ 4G", "Tecno Camon 20 Pro 5G", "Tecno Camon 20s Pro 5G" (and "Marnie" in the hidden origin-os entry).
- `meta` — freeform string; convention is `"Android 16 . 3.28 GB"` (spaces around a dot separator).
- `date` — `YYYY-MM-DD`. The newest date per OS drives card sorting and "Updated:" text. Future dates auto-hide (see data flow).
- `url` — primary download (currently sfl.gl shortlinks).
- `url2` — optional mirror; renders a second "Mirror" button. Omit the key entirely rather than leaving it empty.

## Gotchas and non-obvious details

- **`assets/js/data_old.js` is dead code.** It declares `const OS_DATA = [...]` with hardcoded, outdated data and is **not** loaded by `index.html`. It exists only as historical reference; never edit it or expect the live site to reflect it.
- **Missing files that matter only when un-hidden**:
  - `guides/origin-os.md` does not exist, but `origin-os.js` points `guideFile` at it. `origin-os` is `hide: true` and its only item has `url: "#"`, so this doesn't affect the live site. If anyone unhides it, the flash-guide modal will show the "Error loading guide" fallback.
- **Placeholders**: broken banner images fall back to `assets/images/placeholder.svg` (1600×900 brand placeholder, committed) via the `onerror` handler in `buildCards`.
- **The auto-publish filter runs on the visitor's machine**, so the site itself has no release-date gating you need to "publish". To schedule a release: commit an item with a future `date`; it appears automatically once that date passes. Conversely, backdated items always show.
- **Navigation is mobile-first, desktop-only for the top bar.** The **floating pill dock** (`nav.mobile-dock`) is the default on every viewport: fixed to `bottom` (full-width containing block + `margin: 0 auto` + `width: max-content` + `max-width: calc(100vw - 24px)` centering, `border-radius: 100px`, `z-index: 100` below modals, `env(safe-area-inset-bottom)` offset), with gradient brand mark (`.dock-brand`, clickable → home, hidden since the hero shows the brand) and pill buttons: Back (ghost, only visible inside `?os=` detail via `.mobile-dock.is-detail`), Donate (.dock-primary accent pill), Theme (ghost, `#dock-theme`). The top app bar (`nav`, height `--nav-h: 60px`, `z-index: 100`, blurred glass; `.nav-logo` gradient text → home, Donate + Theme in `.nav-controls`) is `display: none` by default and only appears on real desktops (`@media (min-width: 1025px) and (hover: hover) and (pointer: fine)`: `nav { display: flex }`, `.mobile-dock { display: none }`, `#page-home`/`#page-detail` get `padding-top: calc(var(--nav-h) + …)`). So a phone in any orientation, in-app browser, or desktop-site mode always gets the bottom dock and never a top bar. Both pages get ~120px bottom padding so content clears the dock. On ≤900px the dock tightens (smaller padding/buttons), `.back-btn` on the detail page is hidden (dock Back replaces it), and the catalog defaults to `list` view (`.cards-grid.view-list` = single column, tighter gap; choice persisted in `localStorage('view-mode')`; the JS default uses the same desktop-only matchMedia → `grid`, everything else → `list`).
- **Theme**: dark default; user choice stored in `localStorage('theme')` and applied via `data-theme` attribute on `<html>`. CSS uses custom properties (`--accent`, `--bg-color`, `--glass-*`, `--text`, etc.) defined in `assets/css/style.css` `:root` blocks. Theme is applied on page load from localStorage before painting, to avoid flash. `toggleTheme()` is shared by the desktop nav and the mobile dock.
- **Modals** are hidden via a `.active` class on `.modal` (not display toggling across elements); clicking the modal backdrop closes it.
- **Download links flow through a 5-second countdown warning modal** (disabled ad-blocker notice + "DO NOT MIRROR nor SHARE the DIRECT download link"). This is intentional protection for the shortlink URLs — don't bypass or remove it.
- **Fonts**: Syne (headings) and DM Sans (body) from Google Fonts; `marked.min.js` from jsDelivr. The site only works online (CDN deps + `fetch()` of guides + Telegraph API). Opening `index.html` via `file://` will break fetching; use the python server.
- **Guides** (`guides/*.md`) are fetched and rendered client-side, so any markdown file added there is reachable by setting `guideFile` on an OS. Each guide embeds its own DISCLAIMER block; `disclaimer.md` at the repo root is not referenced by the site.
- **Navigation uses `pushState`**, so browser back/forward works; there is no server-side routing (none needed — static). The `popstate` handler and initial `?os=` param route through `openDetail` / `navigateHome`, which also update the mobile dock's `is-detail` state via `setDockContext()`.

## Conventions

- Data entries are written compactly; newer files prefer one item per line (see `color-os.js`, `transsion-os.js`).
- Use `id` slugs as `lowercase-hyphen` (e.g. `origin-os`, `hello-ui`).
- Commit messages in the repo are terse (`update`, `nos`), with an occasional `feat:`/`fix:` prefix. No conventional-commit requirement.
- Repo remote is `https://github.com/Xia-s-Projekt/Xia-s-Projekt.github.io.git` (`origin`); pushing `main` deploys to GitHub Pages.