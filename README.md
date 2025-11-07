# In-stock Tracker Bot

A Cloudflare Workers + Telegram bot that watches up to three product URLs per user and notifies when stock flips to AVAILABLE (after two confirmations). It stores state in D1, polls pages every minute via Cron, and sends alerts via Telegram messages.

## Features
- Telegram commands: `/start`, `/help`, `/list`, `/remove <#|url>`, `/variant <option#>` (or `/variant <#> <option#>` when multiple pending), `/end`
- Up to 3 active URLs per user with deduped hashes
- Cron-driven checker with per-host rate limiting and anti-flicker confirmations
- Lightweight HTML parsing + site profiles (generic + Nike + Amazon UK + Jellycat + Noodoll)
- D1 persistence with enforced uniqueness and exponential backoff on errors

## Setup
1. Install deps
   ```bash
   npm install
   ```
2. Create the D1 database (once)
   ```bash
   wrangler d1 create instock_db
   wrangler d1 execute instock_db --file=./src/db/schema.sql
   ```
3. Configure secrets
   ```bash
   wrangler secret put TELEGRAM_BOT_TOKEN
   ```
4. Deploy + set webhook
   ```bash
   # local development
   wrangler dev

   # deploy
   wrangler deploy

   # set Telegram webhook to your worker URL
   curl -X POST "https://api.telegram.org/bot<token>/setWebhook" \
     -d url="https://<your-worker>/telegram"
   ```

## Usage
- Send `/start` to get instructions
- Paste up to 3 product URLs (one per message). For items with multiple variants you will be shown a numbered list and must run `/variant <option#>` (or `/variant <slot> <option#>` if several are pending) before polling begins; otherwise you get an immediate tracking ack.
- `/list` shows tracked items, their status, selected variant (or a prompt to select one), last check timestamp, and warning flags (⚠ when manual review needed)
- `/variant <option#>` picks which variant (size/colour/etc.) your latest pending slot should monitor (use `/variant <#> <option#>` when multiple items await selection)
- `/remove <#|url>` stops tracking a single entry by list index or URL
- `/end` clears everything for your account

Alerts arrive only when two consecutive checks report `AVAILABLE` for the selected variant (or any available size when none were specified). After alerting, the URL is removed automatically so you can add a new one.

## Notes
- Cron scheduler hits every minute (`* * * * *`) and enforces max concurrency of 40 overall / 4 per host with ~1s host spacing
- Requests time out after 10s (configurable via `REQUEST_TIMEOUT_MS` env). A manual flag appears when captchas/geo walls are detected.
- Some JS-heavy sites may not render server-side; such entries can flip to `needs_manual` until inspected
- Repo ships with ESLint, Prettier, and Vitest tests (`npm run lint`, `npm run test`)
