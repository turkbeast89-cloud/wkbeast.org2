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

## Pending Items
- Add watcher keys for ALL sub-accounts (currently only hamidwk has one)
- Live earnings calculator (fiat value of mined coins)
- In-app notifications when machine goes offline
- Auto-payment confirmation flow
- Server.py modularization into routers

## Credentials
- Admin password: 127512
- Customer portal: turkbeast/2005, hamidwk/(last 4 of phone)
