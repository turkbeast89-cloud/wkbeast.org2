# WKBeast Mining Farm Manager - PRD

## Original Problem Statement
Full-stack application to manage a crypto mining farm. Core requirements include tracking customers, machine types, monthly hosting fees, WhatsApp reminders, and a customer portal for live stats. Critical feature is ViaBTC integration for live machine status, hashrates, and earnings.

## Architecture
- **Frontend:** React + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI (Python), asyncio for parallel requests
- **Database:** MongoDB Atlas
- **ViaBTC Integration:** Watcher/Observer API (bypasses Cloudflare)

## Key Technical Decision: ViaBTC API Access
- `pool.viabtc.com` API is behind Cloudflare managed challenge — blocks ALL server-side requests
- **Solution:** Use `https://www.viabtc.com/res/observer/worker` endpoint with watcher access_keys
- This endpoint bypasses Cloudflare and returns live worker data (status, hashrates, online/offline counts)
- No IP whitelisting needed — watcher keys are the only auth
- Proxy support (PROXY_URL env var) is still in the code but not needed for watcher approach

## Implemented Features
- Admin dashboard with revenue, costs, profit tracking
- Customer management (CRUD, machines, billing)
- Monthly payment generation and tracking
- WhatsApp payment reminder links
- Excel import/export for customer data
- Customer portal with login (username/password)
- ViaBTC watcher-based machine monitoring (live worker status, hashrates)
- Machine monitor with per-sub-account stats (LTC + KAS)
- Paused customer exclusion from monitoring
- 30-second cache for API responses
- Maintenance logs
- Farm stats display
- CoinGecko crypto price integration

## Recent Changes (Feb 2026)
- **Sync Mismatch Report** (`GET /api/admin/sync-mismatch`): Compares ViaBTC pool workers vs PC-sync local machines. Returns:
  - `viabtc_only`: workers in pool but missing from local PC sync (likely unreachable miners on LAN)
  - `pc_only`: machines synced locally but no matching pool worker (rebooted / wrong pool)
  - Smart matching: case-insensitive + tail-match (`account.001` matches `001` or `001.account`)
  - Reuses watcher monitor cache to avoid re-hitting ViaBTC.
- **Frontend**: New "Sync Check" button in Live Machine Control Panel header. Opens an amber-bordered side-by-side report panel.
- **Original-worker auto-deactivate**: When the last `original_worker` memory is cleared via ✕, `wallet_switch.switched` flips to `false` automatically — so the "Active → newworker" badge and "Restore Original Workers" button disappear.
- **Hide stale ViaBTC workers**: New endpoints `POST /api/viabtc/hide-worker`, `POST /api/viabtc/unhide-worker`, `GET /api/viabtc/hidden-workers`. New `db.hidden_workers` collection. Both `/admin/machine-monitor` and `/admin/machine-monitor-watcher` filter hidden entries from offline lists/counts.
- **Live machines now expose `original_worker`**: `/api/machine-data/live` enriches each row with the saved original (when a wallet switch is active). Frontend renders "was: <original>" with a ✕ to forget that memory per IP.
- **Frontend hide button**: ✕ on each card in "Offline Machines" red alert hides stale ViaBTC entries.
- **switch-workers originals overwrite bug**: Fixed `/api/machine-data/switch-workers` to preserve previously-saved originals when a switch is already active.
- **Pre-existing fix**: `worker_to_ip_map` was undefined in `/admin/machine-monitor` watcher mode (would NameError on offline workers). Now properly built from `machine_live_data`.
- **wkbeast_sync.py - Change Worker fix v2 (validated on user's L9)**:
  - Primary path: HTTP web UI (`get_miner_conf.cgi` → mutate pools[*].user → `set_miner_conf.cgi`) — persistent.
  - POST timeout bumped to 60s; if it still times out, wait 20s + verify by re-reading config (handles Antminer firmware that restarts cgminer synchronously and drops the response).
  - Fallback: CGMiner API with corrected protocol (separate `parameter` field).

## Pending Items
- L1 Farm (Fluminer) scan slowness — add `bypass_cgminer` config flag for HTTP-only farms (P1)
- Add watcher keys for ALL sub-accounts (currently only hamidwk has one)
- Live earnings calculator (fiat value of mined coins)
- In-app notifications when machine goes offline
- Auto-payment confirmation flow
- Server.py modularization into routers

## Credentials
- Admin password: 127512
- Customer portal: turkbeast/2005, hamidwk/(last 4 of phone)
