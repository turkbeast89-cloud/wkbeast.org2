import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { 
  Users, Server, Key, Wrench, Plus, Trash2, Edit2, 
  RefreshCw, Save, Eye, EyeOff, Activity
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const AdminPanel = () => {
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [farmStats, setFarmStats] = useState({
    machines_online: 2430,
    machines_offline: 10,
    total_hashrate: "850 TH/s",
    fluctuation: 5
  });
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  
  // Forms
  const [accountForm, setAccountForm] = useState({ customer_id: "", username: "", password: "", worker_name: "" });
  const [logForm, setLogForm] = useState({ customer_id: "", machine_info: "", description: "" });
  const [statusForm, setStatusForm] = useState({ customer_id: "", worker_name: "", status: "online", hashrate: "", temperature: "", uptime: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, customersRes, statsRes, logsRes] = await Promise.all([
        axios.get(`${API}/customer-accounts`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/farm-stats`),
        axios.get(`${API}/maintenance-logs`)
      ]);
      setAccounts(accountsRes.data);
      setCustomers(customersRes.data);
      setFarmStats(statsRes.data);
      setMaintenanceLogs(logsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-create accounts for all customers
  const handleAutoCreateAccounts = async () => {
    try {
      const res = await axios.post(`${API}/auto-create-accounts`);
      toast.success(res.data.message);
      fetchData();
    } catch (e) {
      toast.error("Failed to create accounts");
    }
  };

  // Save farm stats
  const handleSaveFarmStats = async () => {
    try {
      await axios.put(`${API}/farm-stats`, farmStats);
      toast.success("Farm stats updated");
    } catch (e) {
      toast.error("Failed to update stats");
    }
  };

  // Account CRUD
  const handleSaveAccount = async () => {
    try {
      if (editingAccount) {
        await axios.put(`${API}/customer-accounts/${editingAccount.id}`, accountForm);
        toast.success("Account updated");
      } else {
        await axios.post(`${API}/customer-accounts`, accountForm);
        toast.success("Account created");
      }
      setShowAccountModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save account");
    }
  };

  const handleDeleteAccount = async (account) => {
    if (!window.confirm(`Delete account for ${account.username}?`)) return;
    try {
      await axios.delete(`${API}/customer-accounts/${account.id}`);
      toast.success("Account deleted");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete account");
    }
  };

  // Maintenance log CRUD
  const handleSaveLog = async () => {
    try {
      await axios.post(`${API}/maintenance-logs`, logForm);
      toast.success("Log added");
      setShowLogModal(false);
      setLogForm({ customer_id: "", machine_info: "", description: "" });
      fetchData();
    } catch (e) {
      toast.error("Failed to add log");
    }
  };

  const handleDeleteLog = async (log) => {
    try {
      await axios.delete(`${API}/maintenance-logs/${log.id}`);
      toast.success("Log deleted");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete log");
    }
  };

  // Machine status
  const handleSaveStatus = async () => {
    try {
      await axios.post(`${API}/machine-statuses`, null, { params: statusForm });
      toast.success("Status updated");
      setShowStatusModal(false);
      setStatusForm({ customer_id: "", worker_name: "", status: "online", hashrate: "", temperature: "", uptime: "" });
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Unknown";
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fadeIn">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="admin-panel">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-500 mt-1">Manage customer portal</p>
        </div>
      </div>

      {/* Farm Stats Control */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="text-[#00E054]" size={20} />
          <h2 className="text-lg font-bold text-white">Farm Stats (Display Numbers)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">These numbers are shown to customers on their dashboard</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Machines Online</Label>
            <Input
              type="number"
              value={farmStats.machines_online}
              onChange={(e) => setFarmStats({ ...farmStats, machines_online: parseInt(e.target.value) || 0 })}
              className="bg-[#0A0A0A] border-[#27272A] mt-1"
              data-testid="machines-online-input"
            />
          </div>
          <div>
            <Label>Machines Offline</Label>
            <Input
              type="number"
              value={farmStats.machines_offline}
              onChange={(e) => setFarmStats({ ...farmStats, machines_offline: parseInt(e.target.value) || 0 })}
              className="bg-[#0A0A0A] border-[#27272A] mt-1"
              data-testid="machines-offline-input"
            />
          </div>
          <div>
            <Label>Total Hashrate</Label>
            <Input
              value={farmStats.total_hashrate}
              onChange={(e) => setFarmStats({ ...farmStats, total_hashrate: e.target.value })}
              className="bg-[#0A0A0A] border-[#27272A] mt-1"
              placeholder="850 TH/s"
              data-testid="hashrate-input"
            />
          </div>
          <div>
            <Label>Fluctuation (±)</Label>
            <Input
              type="number"
              value={farmStats.fluctuation}
              onChange={(e) => setFarmStats({ ...farmStats, fluctuation: parseInt(e.target.value) || 0 })}
              className="bg-[#0A0A0A] border-[#27272A] mt-1"
              data-testid="fluctuation-input"
            />
          </div>
        </div>
        
        <Button onClick={handleSaveFarmStats} className="mt-4 bg-[#00E054] text-black" data-testid="save-farm-stats-btn">
          <Save size={16} className="mr-2" />
          Save Farm Stats
        </Button>
      </div>

      {/* Customer Accounts */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="text-[#00C2FF]" size={20} />
            <h2 className="text-lg font-bold text-white">Customer Accounts</h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAutoCreateAccounts} variant="outline" className="border-[#27272A]" data-testid="auto-create-btn">
              <RefreshCw size={16} className="mr-2" />
              Auto-Create All
            </Button>
            <Button onClick={() => { setEditingAccount(null); setAccountForm({ customer_id: "", username: "", password: "", worker_name: "" }); setShowAccountModal(true); }} className="bg-[#00E054] text-black" data-testid="add-account-btn">
              <Plus size={16} className="mr-2" />
              Add Account
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Username</th>
                <th className="text-left py-3 px-4">Password</th>
                <th className="text-left py-3 px-4">Worker Name</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(account => (
                <tr key={account.id} className="table-row">
                  <td className="py-3 px-4 text-white">{getCustomerName(account.customer_id)}</td>
                  <td className="py-3 px-4 text-gray-400">{account.username}</td>
                  <td className="py-3 px-4 font-mono text-gray-400">{account.password}</td>
                  <td className="py-3 px-4 text-gray-400">{account.worker_name || "-"}</td>
                  <td className="py-3 px-4 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingAccount(account); setAccountForm(account); setShowAccountModal(true); }}>
                      <Edit2 size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-400" onClick={() => handleDeleteAccount(account)}>
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No accounts yet. Click "Auto-Create All" to generate accounts for all customers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Machine Status Updates */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="text-[#7C3AED]" size={20} />
            <h2 className="text-lg font-bold text-white">Update Machine Status</h2>
          </div>
          <Button onClick={() => setShowStatusModal(true)} className="bg-[#7C3AED] text-white" data-testid="update-status-btn">
            <Plus size={16} className="mr-2" />
            Update Status
          </Button>
        </div>
        <p className="text-sm text-gray-500">Manually update hashrate, temperature, and status for customer machines</p>
      </div>

      {/* Maintenance Logs */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="text-[#EAB308]" size={20} />
            <h2 className="text-lg font-bold text-white">Maintenance Logs</h2>
          </div>
          <Button onClick={() => setShowLogModal(true)} className="bg-[#EAB308] text-black" data-testid="add-log-btn">
            <Plus size={16} className="mr-2" />
            Add Log
          </Button>
        </div>
        
        <div className="space-y-2">
          {maintenanceLogs.slice(0, 10).map(log => (
            <div key={log.id} className="flex items-center justify-between bg-[#0A0A0A] p-3 rounded-lg border border-[#27272A]">
              <div>
                <p className="text-white">{log.description}</p>
                <p className="text-sm text-gray-500">
                  {getCustomerName(log.customer_id)} • {log.machine_info || "All machines"} • {new Date(log.date).toLocaleDateString()}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="text-red-400" onClick={() => handleDeleteLog(log)}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          {maintenanceLogs.length === 0 && (
            <p className="text-center text-gray-500 py-4">No maintenance logs</p>
          )}
        </div>
      </div>

      {/* Account Modal */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="bg-[#0F0F0F] border-[#27272A] text-white">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "Create Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Customer</Label>
              <Select value={accountForm.customer_id} onValueChange={(v) => {
                const customer = customers.find(c => c.id === v);
                const phone = customer?.phone?.replace(/\D/g, "") || "";
                setAccountForm({
                  ...accountForm,
                  customer_id: v,
                  username: customer?.name?.toLowerCase().replace(/\s/g, "") || "",
                  password: phone.slice(-4) || "0000",
                  worker_name: customer?.name?.toLowerCase().replace(/\s/g, "") || ""
                });
              }}>
                <SelectTrigger className="bg-[#0A0A0A] border-[#27272A] mt-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F0F] border-[#27272A]">
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Username</Label>
              <Input value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" />
            </div>
            <div>
              <Label>Password (last 4 digits of phone)</Label>
              <Input value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" />
            </div>
            <div>
              <Label>Worker Name (ViaBTC)</Label>
              <Input value={accountForm.worker_name} onChange={(e) => setAccountForm({ ...accountForm, worker_name: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" placeholder="Same as username" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountModal(false)} className="border-[#27272A]">Cancel</Button>
            <Button onClick={handleSaveAccount} className="bg-[#00E054] text-black">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Log Modal */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="bg-[#0F0F0F] border-[#27272A] text-white">
          <DialogHeader>
            <DialogTitle>Add Maintenance Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Customer</Label>
              <Select value={logForm.customer_id} onValueChange={(v) => setLogForm({ ...logForm, customer_id: v })}>
                <SelectTrigger className="bg-[#0A0A0A] border-[#27272A] mt-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F0F] border-[#27272A]">
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Machine Info (optional)</Label>
              <Input value={logForm.machine_info} onChange={(e) => setLogForm({ ...logForm, machine_info: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" placeholder="e.g., L9 #1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" placeholder="e.g., Cleaned fans" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogModal(false)} className="border-[#27272A]">Cancel</Button>
            <Button onClick={handleSaveLog} className="bg-[#EAB308] text-black">Add Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Machine Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="bg-[#0F0F0F] border-[#27272A] text-white">
          <DialogHeader>
            <DialogTitle>Update Machine Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Customer</Label>
              <Select value={statusForm.customer_id} onValueChange={(v) => setStatusForm({ ...statusForm, customer_id: v })}>
                <SelectTrigger className="bg-[#0A0A0A] border-[#27272A] mt-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F0F] border-[#27272A]">
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Worker/Machine Name</Label>
              <Input value={statusForm.worker_name} onChange={(e) => setStatusForm({ ...statusForm, worker_name: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" placeholder="e.g., hamid_L9" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusForm.status} onValueChange={(v) => setStatusForm({ ...statusForm, status: v })}>
                <SelectTrigger className="bg-[#0A0A0A] border-[#27272A] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F0F] border-[#27272A]">
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Hashrate</Label>
                <Input value={statusForm.hashrate} onChange={(e) => setStatusForm({ ...statusForm, hashrate: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" placeholder="9.5 TH/s" />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input value={statusForm.temperature} onChange={(e) => setStatusForm({ ...statusForm, temperature: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" placeholder="65°C" />
              </div>
              <div>
                <Label>Uptime</Label>
                <Input value={statusForm.uptime} onChange={(e) => setStatusForm({ ...statusForm, uptime: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" placeholder="720h" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)} className="border-[#27272A]">Cancel</Button>
            <Button onClick={handleSaveStatus} className="bg-[#7C3AED] text-white">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
