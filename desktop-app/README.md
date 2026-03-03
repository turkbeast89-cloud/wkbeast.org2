# WKBeast Farm Manager - Desktop App

A complete crypto farming customer management app for macOS.

## Features
- 📊 Dashboard with profit/revenue/cost analytics
- 👥 Customer management with machine assignments
- 💰 Monthly payment tracking (paid/unpaid/paused)
- 📱 WhatsApp bulk message sender
- 📥 Excel import/export
- 💾 All data stored locally on your Mac

## Installation

### Option 1: Quick Start (Run from Source)

1. **Install Node.js** (if not installed)
   - Download from: https://nodejs.org/ (LTS version)

2. **Open Terminal** and run:
   ```bash
   cd ~/Downloads/wkbeast-farm-manager
   npm install
   npm start
   ```

3. The app will open automatically!

### Option 2: Build as macOS App

1. **Install dependencies:**
   ```bash
   cd ~/Downloads/wkbeast-farm-manager
   npm install
   ```

2. **Build the .dmg installer:**
   ```bash
   npm run build
   ```

3. Find your app in `dist/` folder:
   - `WKBeast Farm Manager-1.0.0.dmg` - Installer
   - `WKBeast Farm Manager-1.0.0-mac.zip` - Portable version

4. **Install:**
   - Double-click the .dmg file
   - Drag the app to Applications folder
   - Launch from Applications or Spotlight

## First Time Setup

1. **Add Machine Types** (pre-configured: L1, L7, L9, Ks5pro, Z15pro)
   - Go to Customers → "Manage Machines" to add/edit types

2. **Add Customers**
   - Click "Add Customer"
   - Enter name, phone (for WhatsApp)
   - Select machines and quantities
   - Fee auto-calculates based on machines

3. **Generate Monthly Payments**
   - Go to Payments page
   - Select month → Click "Generate"

4. **Send WhatsApp Reminders**
   - Go to WhatsApp page
   - Select unpaid customers
   - Click "Send to X customers"
   - WhatsApp tabs open with pre-filled messages

5. **Configure Message Template**
   - Go to Settings
   - Edit your Whish number, USDT address, team name
   - Customize message template

## Data Location

Your data is stored locally at:
```
~/Library/Application Support/wkbeast-farm-manager/wkbeast.db
```

## Troubleshooting

**App won't start?**
- Make sure Node.js is installed: `node --version`
- Try: `npm install` then `npm start`

**WhatsApp not opening?**
- Check customer phone numbers include country code
- Allow browser popups for the app

**Need to reset data?**
- Delete the database file at the location above
- Restart the app

## Support

For issues, contact the developer.
