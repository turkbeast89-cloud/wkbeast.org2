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

## User Personas
- **Primary User**: Crypto farm owner managing customer payments
- **Use Case**: Monthly billing and payment tracking for mining hosting services

## Core Requirements
- Customer management with multiple machines per customer
- Machine types with customizable fees (L1-$100, L7-$300, L9-$250, Ks5pro-$250, Z15pro-$250)
- Monthly payment tracking with status (paid/unpaid/paused)
- WhatsApp bulk message sender (opens tabs with pre-filled messages)
- Profit dashboard with charts
- Excel import/export
- No authentication (private use)

## What's Been Implemented (March 3, 2026)

### Backend (FastAPI + MongoDB)
- Machine types CRUD with default types initialized
- Customer CRUD with auto-calculated fees
- Payment generation and status management
- WhatsApp link generation with customizable template
- Excel import/export
- Statistics/profit calculation endpoint
- Settings management for message template

### Frontend (React + Tailwind + Shadcn)
- Dashboard with stats cards and charts (profit, revenue, cost, machines)
- Customers page with full CRUD, machine assignment, pause/active toggle
- Payments page with month navigation, status updates
- WhatsApp sender with bulk link opener
- Settings page with message template customization

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Customer CRUD with machines
- [x] Payment tracking
- [x] WhatsApp bulk sender
- [x] Profit dashboard

### P1 (Important) - DONE
- [x] Excel import/export
- [x] Message template customization
- [x] Machine type management

### P2 (Nice to Have)
- [ ] Payment history per customer
- [ ] Automated monthly reminders (cron job)
- [ ] Multi-month view/calendar
- [ ] Dark/Light theme toggle
- [ ] Mobile app (PWA)

## Next Tasks
1. Test Excel import with real customer data
2. Add more detailed profit reports (yearly breakdown)
3. Consider adding email reminders alongside WhatsApp
