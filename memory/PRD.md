# WKBeast Mining Farm Manager - Product Requirements Document

## Original Problem Statement
Full-stack application to manage a crypto mining farm with:
- Customer management with WhatsApp contacts
- Machine types and monthly hosting fees
- Automatic payment tracking and reminders
- Customer portal with live machine status from ViaBTC
- Admin dashboard with real-time monitoring

## Core Features Implemented

### Admin Dashboard
- [x] Monthly profit/revenue/cost overview
- [x] Real-time machine monitor with ViaBTC integration
- [x] Per-account hashrate display with expandable worker details
- [x] Online/offline machine status
- [x] Paused customers excluded from offline alerts
- [x] Fast loading with caching (30s) and parallel API calls
- [x] Retry logic for reliable API connections

### Customer Management
- [x] Customer CRUD operations
- [x] Machine assignment per customer
- [x] WhatsApp integration for reminders
- [x] Prepaid/active/paused status

### Customer Portal
- [x] Separate login for customers
- [x] Live machine status from ViaBTC
- [x] Earnings display (Total Mined + Available Balance)
- [x] Dynamic farm statistics

### ViaBTC Integration
- [x] Main account + sub-account support
- [x] Worker status (online/offline/unactive)
- [x] Real-time hashrate per worker
- [x] Multi-coin support (LTC, KAS)
- [x] IP whitelist error handling with server IP display

### Payments
- [x] Monthly payment tracking
- [x] Filterable payment list (paid/unpaid/paused)
- [x] Automatic fee calculation

## Technical Architecture
```
Frontend: React + Tailwind CSS + shadcn/ui
Backend: FastAPI (Python)
Database: MongoDB
External APIs: ViaBTC Pool API
```

## API Endpoints
- `/api/admin/machine-monitor` - Real-time machine status
- `/api/customer/earnings` - Customer earnings from ViaBTC
- `/api/viabtc/sync-accounts` - Sync sub-account API keys
- `/api/admin/password` - Update admin password

## Deployment Notes
1. Whitelist production server IP in ViaBTC for all API keys
2. Run `/api/viabtc/sync-accounts` after deployment
3. Credentials: Admin password `127512`

## Prioritized Backlog

### P0 - Complete
- Real-time machine monitoring
- Hashrate display per account/worker
- Reliable API connections with retry

### P1 - Next
- Live Earnings Calculator (CoinGecko integration for $ values)
- Maintenance Log Feature (admin notes visible to customers)

### P2 - Future
- In-App Notifications (offline machine alerts)
- Auto-Payment Confirmation Flow
- Monthly performance reports via email

### P3 - Backlog
- Backend refactoring (split server.py into routers)
- Custom domain setup guidance
- Delete legacy desktop-app directory

## Changelog

### 2025-03-06
- Added total hashrate display per sub-account
- Added expandable worker list with individual hashrates
- Fixed "unactive" status detection for offline machines
- Added retry logic (3 attempts) for API reliability
- Added batch processing to avoid API rate limiting
- Added API error reporting with IP whitelist instructions

### Previous Sessions
- Implemented real-time machine monitor
- Added live earnings from ViaBTC
- Fixed paused customer handling
- Implemented parallel API calls with caching
- Added customer portal with merged account support
