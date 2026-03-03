const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const XLSX = require('xlsx');
const { app } = require('electron');

const upload = multer({ storage: multer.memoryStorage() });

let dbPath;
let data = {
  machine_types: [],
  customers: [],
  payments: [],
  settings: null
};

function initDatabase() {
  // Store database in user's app data folder
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'wkbeast-data.json');
  
  // Load existing data or create new
  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, 'utf8');
      data = JSON.parse(raw);
    } catch (e) {
      console.log('Creating new database');
    }
  }

  // Initialize default machine types
  if (data.machine_types.length === 0) {
    const defaultMachines = [
      { name: 'L1', monthly_fee: 100 },
      { name: 'L7', monthly_fee: 300 },
      { name: 'L9', monthly_fee: 250 },
      { name: 'Ks5pro', monthly_fee: 250 },
      { name: 'Z15pro', monthly_fee: 250 }
    ];
    for (const machine of defaultMachines) {
      data.machine_types.push({
        id: uuidv4(),
        name: machine.name,
        monthly_fee: machine.monthly_fee,
        created_at: new Date().toISOString()
      });
    }
  }

  // Initialize default settings
  if (!data.settings) {
    data.settings = {
      id: 'settings',
      message_template: `📢 Dear Valued Customer,

This is a kind reminder to please settle your hosting fees before the 2nd of each month, as we have major financial obligations to cover by that date.

Unlike other farms, we don't request payments 6 months in advance — but we kindly ask for your cooperation in making the payment on time each month.

🔹 {month} Hosting Fee: \${amount}
🔹 Payment Options:
• Whish: {whish}
• USDT (BEP20 Network): {usdt}

Thank you for your continued trust and support. Your timely payment helps us keep everything running smoothly.

Warm regards,
{team} 🐺💼`,
      whish_number: '03022005',
      usdt_address: '0x4e44e18349c4531f4463Fc49056b182C28C54877',
      team_name: 'WKBeast Team'
    };
  }

  saveData();
}

function saveData() {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
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
      res.json(data.machine_types);
    });

    server.post('/api/machine-types', (req, res) => {
      const { name, monthly_fee } = req.body;
      const newType = {
        id: uuidv4(),
        name,
        monthly_fee,
        created_at: new Date().toISOString()
      };
      data.machine_types.push(newType);
      saveData();
      res.json(newType);
    });

    server.put('/api/machine-types/:id', (req, res) => {
      const { name, monthly_fee } = req.body;
      const idx = data.machine_types.findIndex(m => m.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      data.machine_types[idx] = { ...data.machine_types[idx], name, monthly_fee };
      saveData();
      res.json(data.machine_types[idx]);
    });

    server.delete('/api/machine-types/:id', (req, res) => {
      data.machine_types = data.machine_types.filter(m => m.id !== req.params.id);
      saveData();
      res.json({ message: 'Deleted' });
    });

    // Customers
    server.get('/api/customers', (req, res) => {
      res.json(data.customers);
    });

    server.get('/api/customers/:id', (req, res) => {
      const customer = data.customers.find(c => c.id === req.params.id);
      if (!customer) return res.status(404).json({ error: 'Not found' });
      res.json(customer);
    });

    server.post('/api/customers', (req, res) => {
      const { name, phone = '', machines = [], total_cost = 0, status = 'active', prepaid_months = 0, notes = '' } = req.body;
      
      // Calculate total fee
      const feeMap = Object.fromEntries(data.machine_types.map(m => [m.id, m.monthly_fee]));
      const nameMap = Object.fromEntries(data.machine_types.map(m => [m.id, m.name]));
      
      let total_fee = 0;
      const machinesWithNames = machines.map(m => {
        const fee = feeMap[m.machine_type_id] || 0;
        const machineName = nameMap[m.machine_type_id] || 'Unknown';
        total_fee += fee * (m.quantity || 1);
        return { ...m, machine_name: machineName };
      });

      const newCustomer = {
        id: uuidv4(),
        name,
        phone,
        machines: machinesWithNames,
        total_cost,
        total_fee,
        status,
        prepaid_months,
        notes,
        created_at: new Date().toISOString()
      };
      
      data.customers.push(newCustomer);
      saveData();
      res.json(newCustomer);
    });

    server.put('/api/customers/:id', (req, res) => {
      const idx = data.customers.findIndex(c => c.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      
      const updates = { ...data.customers[idx], ...req.body };
      
      // Recalculate fee if machines changed
      if (req.body.machines) {
        const feeMap = Object.fromEntries(data.machine_types.map(m => [m.id, m.monthly_fee]));
        const nameMap = Object.fromEntries(data.machine_types.map(m => [m.id, m.name]));
        
        let total_fee = 0;
        updates.machines = req.body.machines.map(m => {
          const fee = feeMap[m.machine_type_id] || 0;
          const machineName = nameMap[m.machine_type_id] || 'Unknown';
          total_fee += fee * (m.quantity || 1);
          return { ...m, machine_name: machineName };
        });
        updates.total_fee = total_fee;
      }

      data.customers[idx] = updates;
      saveData();
      res.json(updates);
    });

    server.delete('/api/customers/:id', (req, res) => {
      data.customers = data.customers.filter(c => c.id !== req.params.id);
      data.payments = data.payments.filter(p => p.customer_id !== req.params.id);
      saveData();
      res.json({ message: 'Deleted' });
    });

    // Payments
    server.get('/api/payments', (req, res) => {
      const { month } = req.query;
      if (month) {
        res.json(data.payments.filter(p => p.month === month));
      } else {
        res.json(data.payments);
      }
    });

    server.post('/api/payments/generate', (req, res) => {
      const month = req.query.month;
      const activeCustomers = data.customers.filter(c => c.status === 'active');
      
      let created = 0;
      for (const customer of activeCustomers) {
        const existing = data.payments.find(p => p.customer_id === customer.id && p.month === month);
        
        if (!existing) {
          const prepaid = customer.prepaid_months || 0;
          const status = prepaid > 0 ? 'paid' : 'unpaid';
          
          data.payments.push({
            id: uuidv4(),
            customer_id: customer.id,
            customer_name: customer.name,
            month,
            amount: customer.total_fee,
            status,
            paid_at: null,
            created_at: new Date().toISOString()
          });
          
          if (prepaid > 0) {
            const custIdx = data.customers.findIndex(c => c.id === customer.id);
            data.customers[custIdx].prepaid_months -= 1;
          }
          created++;
        }
      }
      
      saveData();
      res.json({ message: `Generated ${created} payment records for ${month}` });
    });

    server.put('/api/payments/:id', (req, res) => {
      const { status, amount } = req.body;
      const idx = data.payments.findIndex(p => p.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      
      data.payments[idx].status = status;
      data.payments[idx].paid_at = status === 'paid' ? new Date().toISOString() : null;
      if (amount !== undefined) data.payments[idx].amount = amount;
      
      saveData();
      res.json(data.payments[idx]);
    });

    // Statistics
    server.get('/api/stats', (req, res) => {
      const activeCustomers = data.customers.filter(c => c.status === 'active');
      const pausedCustomers = data.customers.filter(c => c.status === 'paused');
      
      const totalMonthlyRevenue = activeCustomers.reduce((sum, c) => sum + c.total_fee, 0);
      const totalMonthlyCost = activeCustomers.reduce((sum, c) => sum + c.total_cost, 0);
      const monthlyProfit = totalMonthlyRevenue - totalMonthlyCost;
      
      // Payment stats by month
      const monthlyStats = {};
      for (const p of data.payments) {
        if (!monthlyStats[p.month]) {
          monthlyStats[p.month] = { paid: 0, unpaid: 0, paused: 0, total: 0 };
        }
        monthlyStats[p.month][p.status] = (monthlyStats[p.month][p.status] || 0) + p.amount;
        monthlyStats[p.month].total += p.amount;
      }
      
      const totalCollected = data.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const totalPending = data.payments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0);
      
      // Machine breakdown
      const machineCounts = {};
      for (const c of data.customers) {
        for (const m of c.machines || []) {
          machineCounts[m.machine_name] = (machineCounts[m.machine_name] || 0) + m.quantity;
        }
      }
      
      res.json({
        total_customers: data.customers.length,
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
      res.json(data.settings);
    });

    server.put('/api/settings', (req, res) => {
      data.settings = { ...data.settings, ...req.body };
      saveData();
      res.json(data.settings);
    });

    // WhatsApp
    server.post('/api/whatsapp/generate-links', (req, res) => {
      const { month, include_paid } = req.query;
      
      let payments = data.payments.filter(p => p.month === month);
      if (include_paid !== 'true') {
        payments = payments.filter(p => p.status === 'unpaid');
      }
      
      const customerMap = Object.fromEntries(data.customers.map(c => [c.id, c]));
      
      const links = [];
      for (const payment of payments) {
        const customer = customerMap[payment.customer_id];
        if (!customer || !customer.phone || customer.status === 'paused') continue;
        
        const message = data.settings.message_template
          .replace('{month}', month)
          .replace('{amount}', payment.amount)
          .replace('{whish}', data.settings.whish_number)
          .replace('{usdt}', data.settings.usdt_address)
          .replace('{team}', data.settings.team_name);
        
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
      const exportData = data.customers.map(c => ({
        Name: c.name,
        Phone: c.phone,
        Machines: (c.machines || []).map(m => `${m.quantity}x ${m.machine_name}`).join(', '),
        'Your Cost': c.total_cost,
        'Customer Fee': c.total_fee,
        Status: c.status,
        'Prepaid Months': c.prepaid_months,
        Notes: c.notes
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
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
        const rows = XLSX.utils.sheet_to_json(ws);
        
        let imported = 0;
        const errors = [];
        
        for (let i = 0; i < rows.length; i++) {
          try {
            const row = rows[i];
            const name = String(row.Name || row.name || '').trim();
            if (!name) continue;
            
            const phone = String(row.Phone || row.phone || '').trim();
            const cost = parseFloat(row['Your Cost'] || row.cost || 0) || 0;
            const fee = parseFloat(row['Customer Fee'] || row.fee || 0) || 0;
            
            data.customers.push({
              id: uuidv4(),
              name,
              phone,
              machines: [],
              total_cost: cost,
              total_fee: fee,
              status: 'active',
              prepaid_months: 0,
              notes: '',
              created_at: new Date().toISOString()
            });
            
            imported++;
          } catch (e) {
            errors.push(`Row ${i + 2}: ${e.message}`);
          }
        }
        
        saveData();
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
