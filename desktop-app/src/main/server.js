const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const XLSX = require('xlsx');
const Database = require('better-sqlite3');
const { app } = require('electron');

const upload = multer({ storage: multer.memoryStorage() });

let db;

function initDatabase() {
  // Store database in user's app data folder
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'wkbeast.db');
  
  db = new Database(dbPath);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS machine_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      monthly_fee REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      machines TEXT DEFAULT '[]',
      total_cost REAL DEFAULT 0,
      total_fee REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      prepaid_months INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'unpaid',
      paid_at TEXT,
      created_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      message_template TEXT,
      whish_number TEXT DEFAULT '03022005',
      usdt_address TEXT DEFAULT '0x4e44e18349c4531f4463Fc49056b182C28C54877',
      team_name TEXT DEFAULT 'WKBeast Team'
    );
  `);

  // Initialize default machine types
  const defaultMachines = [
    { name: 'L1', monthly_fee: 100 },
    { name: 'L7', monthly_fee: 300 },
    { name: 'L9', monthly_fee: 250 },
    { name: 'Ks5pro', monthly_fee: 250 },
    { name: 'Z15pro', monthly_fee: 250 }
  ];

  const existingTypes = db.prepare('SELECT COUNT(*) as count FROM machine_types').get();
  if (existingTypes.count === 0) {
    const insert = db.prepare('INSERT INTO machine_types (id, name, monthly_fee, created_at) VALUES (?, ?, ?, ?)');
    for (const machine of defaultMachines) {
      insert.run(uuidv4(), machine.name, machine.monthly_fee, new Date().toISOString());
    }
  }

  // Initialize default settings
  const existingSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (existingSettings.count === 0) {
    const defaultTemplate = `📢 Dear Valued Customer,

This is a kind reminder to please settle your hosting fees before the 2nd of each month, as we have major financial obligations to cover by that date.

Unlike other farms, we don't request payments 6 months in advance — but we kindly ask for your cooperation in making the payment on time each month.

🔹 {month} Hosting Fee: \${amount}
🔹 Payment Options:
• Whish: {whish}
• USDT (BEP20 Network): {usdt}

Thank you for your continued trust and support. Your timely payment helps us keep everything running smoothly.

Warm regards,
{team} 🐺💼`;

    db.prepare('INSERT INTO settings (id, message_template, whish_number, usdt_address, team_name) VALUES (?, ?, ?, ?, ?)')
      .run('settings', defaultTemplate, '03022005', '0x4e44e18349c4531f4463Fc49056b182C28C54877', 'WKBeast Team');
  }
}

function startServer() {
  return new Promise((resolve) => {
    initDatabase();
    
    const server = express();
    server.use(cors());
    server.use(express.json());
    
    // Serve static files (React build)
    server.use(express.static(path.join(__dirname, '../renderer')));

    // ==================== API ROUTES ====================

    // Root
    server.get('/api/', (req, res) => {
      res.json({ message: 'WKBeast Crypto Farm Manager API' });
    });

    // Machine Types
    server.get('/api/machine-types', (req, res) => {
      const types = db.prepare('SELECT * FROM machine_types').all();
      res.json(types);
    });

    server.post('/api/machine-types', (req, res) => {
      const { name, monthly_fee } = req.body;
      const id = uuidv4();
      const created_at = new Date().toISOString();
      db.prepare('INSERT INTO machine_types (id, name, monthly_fee, created_at) VALUES (?, ?, ?, ?)')
        .run(id, name, monthly_fee, created_at);
      res.json({ id, name, monthly_fee, created_at });
    });

    server.put('/api/machine-types/:id', (req, res) => {
      const { name, monthly_fee } = req.body;
      db.prepare('UPDATE machine_types SET name = ?, monthly_fee = ? WHERE id = ?')
        .run(name, monthly_fee, req.params.id);
      const updated = db.prepare('SELECT * FROM machine_types WHERE id = ?').get(req.params.id);
      res.json(updated);
    });

    server.delete('/api/machine-types/:id', (req, res) => {
      db.prepare('DELETE FROM machine_types WHERE id = ?').run(req.params.id);
      res.json({ message: 'Deleted' });
    });

    // Customers
    server.get('/api/customers', (req, res) => {
      const customers = db.prepare('SELECT * FROM customers').all();
      customers.forEach(c => c.machines = JSON.parse(c.machines));
      res.json(customers);
    });

    server.get('/api/customers/:id', (req, res) => {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
      if (!customer) return res.status(404).json({ error: 'Not found' });
      customer.machines = JSON.parse(customer.machines);
      res.json(customer);
    });

    server.post('/api/customers', (req, res) => {
      const { name, phone = '', machines = [], total_cost = 0, status = 'active', prepaid_months = 0, notes = '' } = req.body;
      
      // Calculate total fee
      const machineTypes = db.prepare('SELECT * FROM machine_types').all();
      const feeMap = Object.fromEntries(machineTypes.map(m => [m.id, m.monthly_fee]));
      const nameMap = Object.fromEntries(machineTypes.map(m => [m.id, m.name]));
      
      let total_fee = 0;
      const machinesWithNames = machines.map(m => {
        const fee = feeMap[m.machine_type_id] || 0;
        const machineName = nameMap[m.machine_type_id] || 'Unknown';
        total_fee += fee * (m.quantity || 1);
        return { ...m, machine_name: machineName };
      });

      const id = uuidv4();
      const created_at = new Date().toISOString();
      
      db.prepare(`INSERT INTO customers (id, name, phone, machines, total_cost, total_fee, status, prepaid_months, notes, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, name, phone, JSON.stringify(machinesWithNames), total_cost, total_fee, status, prepaid_months, notes, created_at);
      
      res.json({ id, name, phone, machines: machinesWithNames, total_cost, total_fee, status, prepaid_months, notes, created_at });
    });

    server.put('/api/customers/:id', (req, res) => {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
      if (!customer) return res.status(404).json({ error: 'Not found' });
      
      const updates = { ...customer, ...req.body };
      
      // Recalculate fee if machines changed
      if (req.body.machines) {
        const machineTypes = db.prepare('SELECT * FROM machine_types').all();
        const feeMap = Object.fromEntries(machineTypes.map(m => [m.id, m.monthly_fee]));
        const nameMap = Object.fromEntries(machineTypes.map(m => [m.id, m.name]));
        
        let total_fee = 0;
        updates.machines = req.body.machines.map(m => {
          const fee = feeMap[m.machine_type_id] || 0;
          const machineName = nameMap[m.machine_type_id] || 'Unknown';
          total_fee += fee * (m.quantity || 1);
          return { ...m, machine_name: machineName };
        });
        updates.total_fee = total_fee;
      }

      const machinesStr = typeof updates.machines === 'string' ? updates.machines : JSON.stringify(updates.machines);
      
      db.prepare(`UPDATE customers SET name = ?, phone = ?, machines = ?, total_cost = ?, total_fee = ?, 
                  status = ?, prepaid_months = ?, notes = ? WHERE id = ?`)
        .run(updates.name, updates.phone, machinesStr, updates.total_cost, updates.total_fee,
             updates.status, updates.prepaid_months, updates.notes, req.params.id);
      
      const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
      updated.machines = JSON.parse(updated.machines);
      res.json(updated);
    });

    server.delete('/api/customers/:id', (req, res) => {
      db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
      db.prepare('DELETE FROM payments WHERE customer_id = ?').run(req.params.id);
      res.json({ message: 'Deleted' });
    });

    // Payments
    server.get('/api/payments', (req, res) => {
      const { month } = req.query;
      let payments;
      if (month) {
        payments = db.prepare('SELECT * FROM payments WHERE month = ?').all(month);
      } else {
        payments = db.prepare('SELECT * FROM payments').all();
      }
      res.json(payments);
    });

    server.post('/api/payments/generate', (req, res) => {
      const month = req.query.month;
      const customers = db.prepare("SELECT * FROM customers WHERE status = 'active'").all();
      
      let created = 0;
      for (const customer of customers) {
        const existing = db.prepare('SELECT * FROM payments WHERE customer_id = ? AND month = ?')
          .get(customer.id, month);
        
        if (!existing) {
          const prepaid = customer.prepaid_months || 0;
          const status = prepaid > 0 ? 'paid' : 'unpaid';
          
          db.prepare(`INSERT INTO payments (id, customer_id, customer_name, month, amount, status, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), customer.id, customer.name, month, customer.total_fee, status, new Date().toISOString());
          
          if (prepaid > 0) {
            db.prepare('UPDATE customers SET prepaid_months = prepaid_months - 1 WHERE id = ?')
              .run(customer.id);
          }
          created++;
        }
      }
      
      res.json({ message: `Generated ${created} payment records for ${month}` });
    });

    server.put('/api/payments/:id', (req, res) => {
      const { status, amount } = req.body;
      const paid_at = status === 'paid' ? new Date().toISOString() : null;
      
      if (amount !== undefined) {
        db.prepare('UPDATE payments SET status = ?, paid_at = ?, amount = ? WHERE id = ?')
          .run(status, paid_at, amount, req.params.id);
      } else {
        db.prepare('UPDATE payments SET status = ?, paid_at = ? WHERE id = ?')
          .run(status, paid_at, req.params.id);
      }
      
      const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
      res.json(updated);
    });

    // Statistics
    server.get('/api/stats', (req, res) => {
      const customers = db.prepare('SELECT * FROM customers').all();
      const payments = db.prepare('SELECT * FROM payments').all();
      
      customers.forEach(c => c.machines = JSON.parse(c.machines));
      
      const activeCustomers = customers.filter(c => c.status === 'active');
      const pausedCustomers = customers.filter(c => c.status === 'paused');
      
      const totalMonthlyRevenue = activeCustomers.reduce((sum, c) => sum + c.total_fee, 0);
      const totalMonthlyCost = activeCustomers.reduce((sum, c) => sum + c.total_cost, 0);
      const monthlyProfit = totalMonthlyRevenue - totalMonthlyCost;
      
      // Payment stats by month
      const monthlyStats = {};
      for (const p of payments) {
        if (!monthlyStats[p.month]) {
          monthlyStats[p.month] = { paid: 0, unpaid: 0, paused: 0, total: 0 };
        }
        monthlyStats[p.month][p.status] = (monthlyStats[p.month][p.status] || 0) + p.amount;
        monthlyStats[p.month].total += p.amount;
      }
      
      const totalCollected = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const totalPending = payments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0);
      
      // Machine breakdown
      const machineCounts = {};
      for (const c of customers) {
        for (const m of c.machines) {
          machineCounts[m.machine_name] = (machineCounts[m.machine_name] || 0) + m.quantity;
        }
      }
      
      res.json({
        total_customers: customers.length,
        active_customers: activeCustomers.length,
        paused_customers: pausedCustomers.length,
        total_monthly_revenue: totalMonthlyRevenue,
        total_monthly_cost: totalMonthlyCost,
        monthly_profit: monthlyProfit,
        profit_margin: totalMonthlyRevenue > 0 ? (monthlyProfit / totalMonthlyRevenue * 100) : 0,
        total_collected: totalCollected,
        total_pending: totalPending,
        monthly_stats: monthlyStats,
        machine_counts: machineCounts
      });
    });

    // Settings
    server.get('/api/settings', (req, res) => {
      const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('settings');
      res.json(settings);
    });

    server.put('/api/settings', (req, res) => {
      const { message_template, whish_number, usdt_address, team_name } = req.body;
      const current = db.prepare('SELECT * FROM settings WHERE id = ?').get('settings');
      
      db.prepare(`UPDATE settings SET message_template = ?, whish_number = ?, usdt_address = ?, team_name = ? WHERE id = ?`)
        .run(
          message_template ?? current.message_template,
          whish_number ?? current.whish_number,
          usdt_address ?? current.usdt_address,
          team_name ?? current.team_name,
          'settings'
        );
      
      const updated = db.prepare('SELECT * FROM settings WHERE id = ?').get('settings');
      res.json(updated);
    });

    // WhatsApp
    server.post('/api/whatsapp/generate-links', (req, res) => {
      const { month, include_paid } = req.query;
      const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('settings');
      
      let payments;
      if (include_paid === 'true') {
        payments = db.prepare('SELECT * FROM payments WHERE month = ?').all(month);
      } else {
        payments = db.prepare("SELECT * FROM payments WHERE month = ? AND status = 'unpaid'").all(month);
      }
      
      const customers = db.prepare('SELECT * FROM customers').all();
      const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
      
      const links = [];
      for (const payment of payments) {
        const customer = customerMap[payment.customer_id];
        if (!customer || !customer.phone || customer.status === 'paused') continue;
        
        const message = settings.message_template
          .replace('{month}', month)
          .replace('{amount}', payment.amount)
          .replace('{whish}', settings.whish_number)
          .replace('{usdt}', settings.usdt_address)
          .replace('{team}', settings.team_name);
        
        let phone = customer.phone.replace(/[\s\-\+]/g, '');
        if (!phone.startsWith('961')) {
          phone = '961' + phone.replace(/^0/, '');
        }
        
        const link = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        
        links.push({
          customer_id: customer.id,
          customer_name: customer.name,
          phone: customer.phone,
          amount: payment.amount,
          link,
          payment_id: payment.id
        });
      }
      
      res.json(links);
    });

    // Excel Export
    server.get('/api/export/excel', (req, res) => {
      const customers = db.prepare('SELECT * FROM customers').all();
      
      const data = customers.map(c => {
        const machines = JSON.parse(c.machines);
        return {
          Name: c.name,
          Phone: c.phone,
          Machines: machines.map(m => `${m.quantity}x ${m.machine_name}`).join(', '),
          'Your Cost': c.total_cost,
          'Customer Fee': c.total_fee,
          Status: c.status,
          'Prepaid Months': c.prepaid_months,
          Notes: c.notes
        };
      });
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=customers.xlsx');
      res.send(buffer);
    });

    // Excel Import
    server.post('/api/import/excel', upload.single('file'), (req, res) => {
      try {
        const wb = XLSX.read(req.file.buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const machineTypes = db.prepare('SELECT * FROM machine_types').all();
        const machineNameMap = Object.fromEntries(machineTypes.map(m => [m.name.toLowerCase(), m]));
        
        let imported = 0;
        const errors = [];
        
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i];
            const name = String(row.Name || row.name || '').trim();
            if (!name) continue;
            
            const phone = String(row.Phone || row.phone || '').trim();
            const cost = parseFloat(row['Your Cost'] || row.cost || 0) || 0;
            const fee = parseFloat(row['Customer Fee'] || row.fee || 0) || 0;
            
            const id = uuidv4();
            const created_at = new Date().toISOString();
            
            db.prepare(`INSERT INTO customers (id, name, phone, machines, total_cost, total_fee, status, prepaid_months, notes, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(id, name, phone, '[]', cost, fee, 'active', 0, '', created_at);
            
            imported++;
          } catch (e) {
            errors.push(`Row ${i + 2}: ${e.message}`);
          }
        }
        
        res.json({ imported, errors });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });

    // Init endpoint
    server.post('/api/init', (req, res) => {
      res.json({ message: 'Initialized' });
    });

    // Serve React app for all other routes
    server.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../renderer/index.html'));
    });

    // Start server
    const PORT = 3847;
    const instance = server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    resolve(instance);
  });
}

module.exports = { startServer };
