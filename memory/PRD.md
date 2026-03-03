# WKBeast Crypto Farm Manager - PRD

## Original Problem Statement
Build a crypto farming customer management app to:
- Track customers and their mining machines
- Auto-calculate hosting fees based on machines
- Send WhatsApp payment reminders (bulk links)
- Track monthly payments (paid/unpaid/paused)
- Handle prepaid customers
- Calculate profits (revenue vs costs)
- Import/Export Excel data
- **Customer Portal**: Allow customers to log in and view their machine status, payment history, and farm statistics
- **Admin Panel**: Manage customer accounts and configure display statistics

## User Personas
- **Primary User**: Crypto farm owner managing customer payments
- **Secondary User**: Customers viewing their own data via portal
- **Use Case**: Monthly billing, payment tracking, and customer self-service for mining hosting services

## Core Requirements
- Customer management with multiple machines per customer
- Machine types with customizable fees (L1-$100, L7-$300, L9-$250, Ks5pro-$250, Z15pro-$250)
- Monthly payment tracking with status (paid/unpaid/paused)
- WhatsApp bulk message sender (opens tabs with pre-filled messages)
- Profit dashboard with charts
- Excel import/export
- Password protection (admin: 1122)
- Customer Portal with individual login
- Configurable "impressive" farm stats for customer confidence

## What's Been Implemented

### March 3, 2026 - Initial Build
- Machine types CRUD with default types initialized
- Customer CRUD with auto-calculated fees
- Payment generation and status management
- WhatsApp link generation with customizable template
- Excel import/export
- Statistics/profit calculation endpoint
- Settings management for message template
- Dashboard, Customers, Payments, WhatsApp, Settings pages

### March 3, 2026 - Customer Portal & Admin Panel (COMPLETED)

#### Backend Additions
- `/api/portal/login` - Customer authentication (username + last 4 digits of phone as password)
- `/api/portal/dashboard/{customer_id}` - Customer dashboard data (machines, payments, logs, farm stats)
- `/api/portal/crypto-prices` - Live crypto prices from CoinGecko (with fallback)
- `/api/farm-stats` - GET/PUT for configurable display statistics (supports per-coin hashrates)
- `/api/customer-accounts` - CRUD for customer portal accounts
- `/api/auto-create-accounts` - Bulk account generation
- `/api/maintenance-logs` - CRUD for maintenance records
- `/api/machine-statuses` - Manual machine status updates

#### Frontend Additions
- **CustomerPortal.jsx** - Portal container with session management
- **CustomerLogin.jsx** - Customer login page with branded UI
- **CustomerDashboard.jsx** - Customer view showing:
  - Farm Status (online/offline machines with fluctuation, **per-coin hashrates**)
  - Your Machines list with status indicators (coin badges, per-coin units)
  - Estimated Monthly Earnings (based on live crypto prices)
  - Payment History with status icons
  - Maintenance Log
  - Monthly hosting fee summary
- **AdminPanel.jsx** - Admin management page with:
  - Farm Stats configuration (display numbers for customers, **per-coin hashrate field**)
  - Customer Accounts table with CRUD
  - Auto-Create All accounts button
  - Machine Status update modal
  - Maintenance Log management

#### Database Collections Added
- `customer_accounts` - Portal login credentials
- `farm_stats` - Configurable display statistics (includes `total_hashrate_by_coin` field)
- `maintenance_logs` - Machine maintenance records
- `machine_statuses` - Individual machine status tracking

### March 3, 2026 - Per-Coin Hashrate Display Fix (COMPLETED)
- **Issue Fixed:** Farm Status was showing a single combined hashrate (incorrectly mixing GH/s + TH/s)
- **Solution:** Added `total_hashrate_by_coin` field to farm_stats (format: "LTC:500 GH/s, KAS:350 TH/s")
- **Backend:** Updated `FarmStats` and `FarmStatsUpdate` models to support per-coin hashrates
- **Frontend:** 
  - `CustomerDashboard.jsx`: Now displays separate hashrates per coin in Farm Status
  - `AdminPanel.jsx`: Added "Hashrate by Coin" input field for admin configuration
- **Customer hashrate display:** Fixed undefined `calculateCustomerHashrate()` function

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- [x] Customer CRUD with machines
- [x] Payment tracking
- [x] WhatsApp bulk sender
- [x] Profit dashboard
- [x] Customer Portal with login
- [x] Admin Panel for portal management
- [x] Per-coin hashrate display in Farm Status (LTC/KAS separated)

### P1 (Important) - DONE ✅
- [x] Excel import/export
- [x] Message template customization
- [x] Machine type management
- [x] Farm stats configuration (display numbers)
- [x] Live crypto prices for earnings estimate
- [x] ViaBTC API integration (auto-fetch worker status/hashrate)

### P2 (Upcoming)
- [ ] Live Earnings Calculator - Replace manual profit with CoinGecko API feed
- [ ] Maintenance Log Feature - Admin adds notes, customers view them in portal
- [ ] Auto-payment confirmation flow (customer marks paid → admin approves)
- [ ] In-app notifications for offline machines

### P3 (Future/Backlog)
- [ ] Payment history per customer (detailed view)
- [ ] Automated monthly reminders (cron job)
- [ ] Multi-month view/calendar
- [ ] Dark/Light theme toggle
- [ ] Mobile app (PWA)
- [ ] Monthly performance reports
- [ ] Custom domain setup
- [ ] Backend refactoring - Split server.py into modular routers
- [ ] Remove legacy desktop-app directory

## Next Tasks
1. **Live Earnings Calculator** - Replace manual profit entry with real-time CoinGecko prices
2. **Maintenance Log Feature** - Full CRUD for maintenance notes with customer visibility
3. **Refactoring** - Split server.py into modular routers

## Test Credentials
- **Admin Password**: 1122
- **Customer Portal**: Username is customer name (lowercase, no spaces), password is last 4 digits of phone
  - Example: hamid / 9323

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas (Cloud)
- **URL**: https://crypto-mine-manager.preview.emergentagent.com
