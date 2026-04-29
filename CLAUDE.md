# Brewo (بريو) / Brio Cafe

Arabic-first (RTL), bilingual (AR/EN) single-page web app for ordering coffee from a cafe and getting it delivered inside مجمع عمال (Ammal complex) in Amman, Jordan. Orders are placed by composing a WhatsApp message to the cafe — there is no backend.

## Architecture

- **One file does it all.** `index.html` (~2.5k lines) holds the markup, CSS in a `<style>` block, and all app logic in inline `<script>`. No bundler step is actually used — `vite` only serves the file in dev. There is no `src/` directory despite what `tsconfig.json` implies (that file is leftover AI Studio scaffolding).
- **Page model.** "Pages" are sibling `<div id="page-…">` elements (`page-login`, `page-home`, `page-drinks`, `page-checkout`, `page-confirmed`, `page-orders`, `page-settings`, `page-admin`) toggled by JS — not a router.
- **Order flow.** Cart → checkout → `buildOrderWhatsAppText` → `https://wa.me/<CAFE_WHATSAPP_E164>?text=…`. The constant `CAFE_WHATSAPP_E164 = '962798252856'` in `index.html` is the cafe's number; changing it re-targets every order.
- **i18n.** `TRANSLATIONS` keyed strings drive `data-i18n` attributes; `UI_TEXT_MAP` plus `translateLooseTextNodes` retrofits text nodes that aren't tagged. `<html dir>` and `lang` flip with `toggleLang()`. When adding UI strings, add both AR and EN to `TRANSLATIONS` rather than hardcoding.
- **External deps loaded via CDN:** Tajawal font (Google Fonts), `qrcodejs` for QR rendering. No npm runtime deps beyond `vite`.

## Running it

- `npm run dev` — Vite on port 3000, host `0.0.0.0`. Preferred.
- `node local-serve.mjs` — minimal static server on `127.0.0.1:3010`. Use when `npm install` isn't available.
- `npm run build` / `npm run preview` — Vite build, but since the app is a single static HTML file, the build is essentially a copy.
- `npm run lint` is a no-op stub.

## Env

`.env.example` declares `GEMINI_API_KEY` and `APP_URL`, both injected by AI Studio. The current `index.html` does not actually call Gemini — the keys are scaffolding from the AI Studio template (`metadata.json` references AI Studio app `e88a5451-1092-4779-a4d0-4cbcb541a992`). Don't wire new features to `GEMINI_API_KEY` without confirming the deployment target still injects it.

## Conventions when editing `index.html`

- Brand palette is in `:root` CSS vars at the top: `--em` (emerald `#0D4F3C`), `--gold` (`#D4A843`), plus light/soft variants. Reuse these instead of new hex values.
- Default font is Tajawal; primary direction is RTL. Test layout changes in both `dir="rtl"` and after `toggleLang()` to English (`dir="ltr"`).
- Money formatting goes through `fmtMoney` / `currencyUnit` — don't hardcode "JD" / "د.أ".
- WhatsApp text builder (`buildOrderWhatsAppText`) is the contract with the cafe; change carefully — the cafe staff reads these messages.
