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
  const [viaBtcSettings, setViaBtcSettings] = useState({
    access_key: "",
    secret_key: "",
    enabled: false
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  
  // Forms
  const [accountForm, setAccountForm] = useState({ customer_id: "", username: "", password: "", worker_name: "", viabtc_api_key: "" });
  const [logForm, setLogForm] = useState({ customer_id: "", machine_info: "", description: "" });
  const [statusForm, setStatusForm] = useState({ customer_id: "", worker_name: "", status: "online", hashrate: "", temperature: "", uptime: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, customersRes, statsRes, logsRes, viaBtcRes] = await Promise.all([
        axios.get(`${API}/customer-accounts`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/farm-stats`),
        axios.get(`${API}/maintenance-logs`),
        axios.get(`${API}/viabtc-settings`)
      ]);
      setAccounts(accountsRes.data);
      setCustomers(customersRes.data);
      setFarmStats(statsRes.data);
      setMaintenanceLogs(logsRes.data);
      setViaBtcSettings({
        access_key: viaBtcRes.data.access_key || "",
        secret_key: viaBtcRes.data.secret_key || "",
        enabled: viaBtcRes.data.enabled || false
      });
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

  // Save ViaBTC settings
  const handleSaveViaBtcSettings = async () => {
    try {
      await axios.put(`${API}/viabtc-settings`, null, {
        params: {
          access_key: viaBtcSettings.access_key,
          secret_key: viaBtcSettings.secret_key,
          enabled: viaBtcSettings.enabled
        }
      });
      toast.success("ViaBTC API settings saved");
    } catch (e) {
      toast.error("Failed to save ViaBTC settings");
    }
  };

  // Test ViaBTC API connection
  const handleTestViaBtcApi = async () => {
    setTestingApi(true);
    setApiTestResult(null);
    try {
      // First save the settings
      await axios.put(`${API}/viabtc-settings`, null, {
        params: {
          access_key: viaBtcSettings.access_key,
          secret_key: viaBtcSettings.secret_key,
          enabled: viaBtcSettings.enabled
        }
      });
      
      // Then test the connection
      const res = await axios.post(`${API}/viabtc-test`);
      setApiTestResult(res.data);
      if (res.data.success) {
        toast.success("API connection successful!");
      } else {
        toast.error(res.data.message || "API test failed");
      }
    } catch (e) {
      setApiTestResult({
        success: false,
        message: e.response?.data?.message || "Failed to test API connection"
      });
      toast.error("Failed to test API connection");
    } finally {
      setTestingApi(false);
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

  // Sync ViaBTC API Keys
  const handleSyncViaBtcAccounts = async () => {
    try {
      toast.info("Syncing ViaBTC sub-accounts...");
      const res = await axios.post(`${API}/viabtc/sync-accounts`);
      if (res.data.success) {
        toast.success(`Synced ${res.data.updated.length} accounts`);
        if (res.data.not_found.length > 0) {
          toast.info(`${res.data.not_found.length} ViaBTC accounts not matched: ${res.data.not_found.slice(0, 5).join(", ")}...`);
        }
        fetchData();
      } else {
        toast.error(res.data.error || "Failed to sync");
      }
    } catch (e) {
      toast.error("Failed to sync ViaBTC accounts");
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

      {/* ViaBTC API Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="text-[#F59E0B]" size={20} />
          <h2 className="text-lg font-bold text-white">ViaBTC API Settings</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Connect to ViaBTC to fetch live worker status and hashrate for customers</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Access Key</Label>
            <Input
              value={viaBtcSettings.access_key}
              onChange={(e) => setViaBtcSettings({ ...viaBtcSettings, access_key: e.target.value })}
              className="bg-[#0A0A0A] border-[#27272A] mt-1"
              placeholder="Enter your ViaBTC Access Key"
              data-testid="viabtc-access-key"
            />
          </div>
          <div>
            <Label>Secret Key</Label>
            <div className="relative">
              <Input
                type={showSecretKey ? "text" : "password"}
                value={viaBtcSettings.secret_key}
                onChange={(e) => setViaBtcSettings({ ...viaBtcSettings, secret_key: e.target.value })}
                className="bg-[#0A0A0A] border-[#27272A] mt-1 pr-10"
                placeholder="Enter your ViaBTC Secret Key"
                data-testid="viabtc-secret-key"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={viaBtcSettings.enabled}
              onChange={(e) => setViaBtcSettings({ ...viaBtcSettings, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-[#27272A] bg-[#0A0A0A] text-[#00E054] focus:ring-[#00E054]"
            />
            <span className="text-sm text-gray-400">Enable ViaBTC Integration</span>
          </label>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button onClick={handleSaveViaBtcSettings} className="bg-[#F59E0B] text-black" data-testid="save-viabtc-btn">
            <Save size={16} className="mr-2" />
            Save API Settings
          </Button>
          <Button 
            onClick={handleTestViaBtcApi} 
            variant="outline" 
            className="border-[#27272A]"
            disabled={testingApi || !viaBtcSettings.access_key || !viaBtcSettings.secret_key}
            data-testid="test-viabtc-btn"
          >
            {testingApi ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Activity size={16} className="mr-2" />
                Test Connection
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500">Get your API keys from <a href="https://www.viabtc.com/tools/api" target="_blank" rel="noopener noreferrer" className="text-[#00C2FF] hover:underline">ViaBTC API Settings</a></p>
        </div>

        {/* API Test Result */}
        {apiTestResult && (
          <div className={`mt-4 p-4 rounded-lg border ${apiTestResult.success ? 'bg-[#00E054]/10 border-[#00E054]/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {apiTestResult.success ? (
                <div className="w-3 h-3 rounded-full bg-[#00E054] animate-pulse"></div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
              )}
              <span className={`font-medium ${apiTestResult.success ? 'text-[#00E054]' : 'text-red-400'}`}>
                {apiTestResult.success ? 'Connection Successful' : 'Connection Failed'}
              </span>
            </div>
            <p className="text-sm text-gray-400">{apiTestResult.message}</p>
            {apiTestResult.server_ip && (
              <div className="mt-2 p-2 bg-[#1A1A1A] rounded border border-[#27272A]">
                <p className="text-xs text-gray-400">Add this IP to your ViaBTC whitelist:</p>
                <p className="text-lg font-mono text-[#00C2FF] mt-1">{apiTestResult.server_ip}</p>
              </div>
            )}
            {apiTestResult.error && !apiTestResult.server_ip && (
              <p className="text-xs text-red-400 mt-1">Error: {apiTestResult.error}</p>
            )}
            {apiTestResult.success && apiTestResult.data && (
              <div className="mt-2 text-xs text-gray-500">
                <p>Hashrate data received successfully</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Accounts */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="text-[#00C2FF]" size={20} />
            <h2 className="text-lg font-bold text-white">Customer Accounts</h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSyncViaBtcAccounts} variant="outline" className="border-[#F59E0B] text-[#F59E0B]" data-testid="sync-viabtc-btn">
              <RefreshCw size={16} className="mr-2" />
              Sync ViaBTC API Keys
            </Button>
            <Button onClick={handleAutoCreateAccounts} variant="outline" className="border-[#27272A]" data-testid="auto-create-btn">
              <RefreshCw size={16} className="mr-2" />
              Auto-Create All
            </Button>
            <Button onClick={() => { setEditingAccount(null); setAccountForm({ customer_id: "", username: "", password: "", worker_name: "", viabtc_api_key: "" }); setShowAccountModal(true); }} className="bg-[#00E054] text-black" data-testid="add-account-btn">
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
                <th className="text-left py-3 px-4">Username / Worker Name</th>
                <th className="text-left py-3 px-4">Password</th>
                <th className="text-left py-3 px-4">API Key</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(account => (
                <tr key={account.id} className="table-row">
                  <td className="py-3 px-4 text-white">{getCustomerName(account.customer_id)}</td>
                  <td className="py-3 px-4 text-[#00C2FF] font-mono">{account.worker_name || account.username || <span className="text-red-400">Not set</span>}</td>
                  <td className="py-3 px-4 font-mono text-gray-400">{account.password}</td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {account.viabtc_api_key ? (
                      <span className="text-[#00E054]">{account.viabtc_api_key.substring(0, 8)}...</span>
                    ) : (
                      <span className="text-red-400">Not synced</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { 
                      setEditingAccount(account); 
                      setAccountForm({
                        customer_id: account.customer_id,
                        username: account.username,
                        password: account.password,
                        worker_name: account.worker_name || "",
                        viabtc_api_key: account.viabtc_api_key || ""
                      }); 
                      setShowAccountModal(true); 
                    }}>
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
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No accounts yet. Click "Auto-Create All" to generate accounts for all customers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Click <span className="text-[#F59E0B]">"Sync ViaBTC API Keys"</span> to auto-fetch API keys for accounts where Worker Name matches a ViaBTC sub-account
        </p>
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
                const workerName = customer?.name?.toLowerCase().replace(/\s/g, "") || "";
                setAccountForm({
                  ...accountForm,
                  customer_id: v,
                  username: workerName,
                  password: phone.slice(-4) || "0000",
                  worker_name: workerName
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
              <Label>Username / Worker Name (ViaBTC account name)</Label>
              <Input 
                value={accountForm.worker_name} 
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/\s/g, "");
                  setAccountForm({ ...accountForm, username: value, worker_name: value });
                }} 
                className="bg-[#0A0A0A] border-[#27272A] mt-1 font-mono" 
                placeholder="e.g., hamidwk"
              />
              <p className="text-xs text-gray-500 mt-1">This is both the login username AND the ViaBTC sub-account name</p>
            </div>
            <div>
              <Label>Password (last 4 digits of phone)</Label>
              <Input value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} className="bg-[#0A0A0A] border-[#27272A] mt-1" />
            </div>
            <div>
              <Label>ViaBTC API Key (auto-synced)</Label>
              <Input 
                value={accountForm.viabtc_api_key} 
                onChange={(e) => setAccountForm({ ...accountForm, viabtc_api_key: e.target.value })} 
                className="bg-[#0A0A0A] border-[#27272A] mt-1 font-mono text-xs" 
                placeholder="Click 'Sync ViaBTC API Keys' to auto-fill" 
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Auto-synced from ViaBTC. Click "Sync ViaBTC API Keys" button.</p>
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
