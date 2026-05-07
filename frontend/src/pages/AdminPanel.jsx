import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { 
  Users, Server, Key, Wrench, Plus, Trash2, Edit2, 
  RefreshCw, Save, Eye, EyeOff, Activity, MessageSquare
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
    total_hashrate_by_coin: "",
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
  const [accountForm, setAccountForm] = useState({ customer_id: "", username: "", password: "", worker_name: "", viabtc_api_key: "", watcher_url: "" });
  const [logForm, setLogForm] = useState({ customer_id: "", machine_info: "", description: "" });
  const [statusForm, setStatusForm] = useState({ customer_id: "", worker_name: "", status: "online", hashrate: "", temperature: "", uptime: "" });
  const [mainWatcherUrl, setMainWatcherUrl] = useState("");
  const [savingWatcher, setSavingWatcher] = useState(false);
  const [botSettings, setBotSettings] = useState({
    auto_reminders_enabled: false,
    offline_alerts_enabled: false,
    admin_phone: "+9613022005",
    reminder_day: 1,
    reminder_interval_days: 3
  });
  const [messageHistory, setMessageHistory] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [repairs, setRepairs] = useState([]);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairForm, setRepairForm] = useState({ customer_id: "", description: "", cost: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, customersRes, statsRes, logsRes, viaBtcRes, botRes, repairsRes] = await Promise.all([
        axios.get(`${API}/customer-accounts`),
        axios.get(`${API}/customers`),
        axios.get(`${API}/farm-stats`),
        axios.get(`${API}/maintenance-logs`),
        axios.get(`${API}/viabtc-settings`),
        axios.get(`${API}/bot-settings`),
        axios.get(`${API}/repairs`)
      ]);
      setAccounts(accountsRes.data);
      setCustomers(customersRes.data);
      setFarmStats(statsRes.data);
      setMaintenanceLogs(logsRes.data);
      setRepairs(repairsRes.data);
      setViaBtcSettings({
        access_key: viaBtcRes.data.access_key || "",
        secret_key: viaBtcRes.data.secret_key || "",
        enabled: viaBtcRes.data.enabled || false,
        watcher_key: viaBtcRes.data.watcher_key || ""
      });
      if (viaBtcRes.data.watcher_key) {
        setMainWatcherUrl(`https://www.viabtc.com/en/observer/worker?access_key=${viaBtcRes.data.watcher_key}&coin=LTC`);
      }
      setBotSettings(botRes.data);
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
        
        // If watcher URL provided, save it separately
        if (accountForm.watcher_url) {
          await axios.put(`${API}/customer-accounts/${editingAccount.id}/watcher`, null, { 
            params: { watcher_url: accountForm.watcher_url } 
          });
        }
        toast.success("Account updated");
      } else {
        const res = await axios.post(`${API}/customer-accounts`, accountForm);
        
        // If watcher URL provided, save it separately for new account
        if (accountForm.watcher_url && res.data.id) {
          await axios.put(`${API}/customer-accounts/${res.data.id}/watcher`, null, { 
            params: { watcher_url: accountForm.watcher_url } 
          });
        }
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
            <Label>Total Hashrate (Legacy - single value)</Label>
            <Input
              value={farmStats.total_hashrate}
              onChange={(e) => setFarmStats({ ...farmStats, total_hashrate: e.target.value })}
              className="bg-[#0A0A0A] border-[#27272A] mt-1"
              placeholder="850 TH/s"
              data-testid="hashrate-input"
            />
            <p className="text-xs text-gray-500 mt-1">Used only if per-coin field is empty</p>
          </div>
          <div className="md:col-span-2">
            <Label>Hashrate by Coin</Label>
            <Input
              value={farmStats.total_hashrate_by_coin || ""}
              onChange={(e) => setFarmStats({ ...farmStats, total_hashrate_by_coin: e.target.value })}
              className="bg-[#0A0A0A] border-[#27272A] mt-1"
              placeholder="LTC:500 GH/s, KAS:350 TH/s"
              data-testid="hashrate-by-coin-input"
            />
            <p className="text-xs text-gray-500 mt-1">Format: LTC:500 GH/s, KAS:350 TH/s (shows each coin separately on dashboard)</p>
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

        {/* Watcher Link (Alternative to API) */}
        <div className="mt-6 p-4 bg-[#1A1A1A] rounded-lg border border-[#00E054]/30">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="text-[#00E054]" size={18} />
            <h3 className="font-medium text-[#00E054]">Watcher Link (No IP Whitelist Needed)</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">Use watcher links instead of API keys - no IP whitelisting required!</p>
          
          <div className="space-y-2">
            <Label className="text-gray-400">Main Account Watcher URL</Label>
            <div className="flex gap-2">
              <Input
                value={mainWatcherUrl}
                onChange={e => setMainWatcherUrl(e.target.value)}
                placeholder="https://www.viabtc.com/en/observer/worker?access_key=xxx&coin=LTC"
                className="flex-1 bg-[#0A0A0A] border-[#27272A] text-gray-300"
              />
              <Button 
                onClick={async () => {
                  if (!mainWatcherUrl) {
                    toast.error("Enter a watcher URL");
                    return;
                  }
                  setSavingWatcher(true);
                  try {
                    await axios.put(`${API}/viabtc-watcher`, null, { params: { watcher_url: mainWatcherUrl } });
                    toast.success("Main account watcher saved!");
                    fetchData();
                  } catch (e) {
                    toast.error(e.response?.data?.detail || "Failed to save watcher");
                  } finally {
                    setSavingWatcher(false);
                  }
                }}
                disabled={savingWatcher}
                className="bg-[#00E054] text-black"
              >
                {savingWatcher ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              </Button>
            </div>
            <p className="text-xs text-gray-500">Get watcher link from ViaBTC → Observer → Copy Link</p>
          </div>
        </div>
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
                    {account.watcher_key ? (
                      <span className="text-[#00E054]" title="Watcher">👁 {account.watcher_key.substring(0, 8)}...</span>
                    ) : account.viabtc_api_key ? (
                      <span className="text-yellow-400" title="API Key">{account.viabtc_api_key.substring(0, 8)}...</span>
                    ) : (
                      <span className="text-red-400">Not configured</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={async () => {
                        const cust = customers.find(c => c.id === account.customer_id);
                        if (!cust) return;
                        try {
                          const res = await axios.put(`${API}/customers/${account.customer_id}/whatsapp-toggle`);
                          toast.success(`WhatsApp ${res.data.whatsapp_enabled ? 'ON' : 'OFF'} for ${res.data.name}`);
                          fetchData();
                        } catch (e) { toast.error("Failed"); }
                      }}
                      className={`w-8 h-4 rounded-full relative inline-block mr-2 transition-colors ${
                        (customers.find(c => c.id === account.customer_id)?.whatsapp_enabled !== false) ? 'bg-[#25D366]' : 'bg-[#27272A]'
                      }`}
                      title={`WhatsApp ${(customers.find(c => c.id === account.customer_id)?.whatsapp_enabled !== false) ? 'ON' : 'OFF'}`}
                      data-testid={`wa-toggle-${account.worker_name}`}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                        (customers.find(c => c.id === account.customer_id)?.whatsapp_enabled !== false) ? 'left-4' : 'left-0.5'
                      }`} />
                    </button>
                    <Button size="icon" variant="ghost" onClick={() => { 
                      setEditingAccount(account); 
                      setAccountForm({
                        customer_id: account.customer_id,
                        username: account.username,
                        password: account.password,
                        worker_name: account.worker_name || "",
                        viabtc_api_key: account.viabtc_api_key || "",
                        watcher_url: account.watcher_key ? `https://www.viabtc.com/en/observer/worker?access_key=${account.watcher_key}&coin=LTC` : ""
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

      {/* WhatsApp Bot Automation */}
      <div className="card p-6" data-testid="whatsapp-bot-settings">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="text-[#25D366]" size={20} />
          <h2 className="text-lg font-bold text-white">WhatsApp Bot Automation</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auto Payment Reminders */}
          <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#27272A]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Auto Payment Reminders</h3>
                <p className="text-xs text-gray-500 mt-1">Sends on 1st of month + every {botSettings.reminder_interval_days} days if unpaid</p>
              </div>
              <button
                onClick={async () => {
                  const newVal = !botSettings.auto_reminders_enabled;
                  try {
                    await axios.put(`${API}/bot-settings`, { auto_reminders_enabled: newVal });
                    setBotSettings({ ...botSettings, auto_reminders_enabled: newVal });
                    toast.success(newVal ? "Auto reminders ON" : "Auto reminders OFF");
                  } catch (e) { toast.error("Failed to update"); }
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${botSettings.auto_reminders_enabled ? 'bg-[#25D366]' : 'bg-[#27272A]'}`}
                data-testid="toggle-auto-reminders"
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${botSettings.auto_reminders_enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {botSettings.last_reminder_sent ? `Last sent: ${new Date(botSettings.last_reminder_sent).toLocaleDateString()}` : "Never sent yet"}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-[#27272A] text-xs"
              onClick={async () => {
                toast.info("Sending reminders...");
                try {
                  const res = await axios.post(`${API}/bot/run-reminder-check`);
                  if (res.data.success) toast.success(`Sent ${res.data.sent} reminders!`);
                  else toast.error(res.data.message || res.data.error);
                } catch (e) { toast.error("Failed"); }
              }}
              data-testid="manual-send-reminders"
            >
              Send Now
            </Button>
          </div>
          
          {/* Offline Machine Alerts */}
          <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#27272A]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Offline Machine Alerts</h3>
                <p className="text-xs text-gray-500 mt-1">WhatsApp alert when machine goes offline/online</p>
              </div>
              <button
                onClick={async () => {
                  const newVal = !botSettings.offline_alerts_enabled;
                  try {
                    await axios.put(`${API}/bot-settings`, { offline_alerts_enabled: newVal });
                    setBotSettings({ ...botSettings, offline_alerts_enabled: newVal });
                    toast.success(newVal ? "Offline alerts ON" : "Offline alerts OFF");
                  } catch (e) { toast.error("Failed to update"); }
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${botSettings.offline_alerts_enabled ? 'bg-[#25D366]' : 'bg-[#27272A]'}`}
                data-testid="toggle-offline-alerts"
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${botSettings.offline_alerts_enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {botSettings.last_offline_check ? `Last check: ${new Date(botSettings.last_offline_check).toLocaleTimeString()}` : "Never checked"}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-[#27272A] text-xs"
              onClick={async () => {
                toast.info("Checking machines...");
                try {
                  const res = await axios.post(`${API}/bot/run-offline-check`);
                  if (res.data.success) {
                    if (res.data.newly_offline > 0) toast.warning(`${res.data.newly_offline} machine(s) newly offline! Alert sent.`);
                    else if (res.data.back_online > 0) toast.success(`${res.data.back_online} machine(s) back online!`);
                    else toast.success(`All good! ${res.data.current_offline} offline total.`);
                  } else toast.error(res.data.message || res.data.error);
                } catch (e) { toast.error("Failed"); }
              }}
              data-testid="manual-check-offline"
            >
              Check Now
            </Button>
          </div>
        </div>
        
        {/* Admin Phone */}
        <div className="mt-4 flex items-center gap-3">
          <Label className="text-xs text-gray-400 whitespace-nowrap">Admin Phone:</Label>
          <Input
            value={botSettings.admin_phone || ""}
            onChange={(e) => setBotSettings({ ...botSettings, admin_phone: e.target.value })}
            className="bg-[#0A0A0A] border-[#27272A] text-sm max-w-[200px]"
            placeholder="+905464678877"
          />
          <Button
            size="sm"
            variant="outline"
            className="border-[#27272A] text-xs"
            onClick={async () => {
              try {
                await axios.put(`${API}/bot-settings`, { admin_phone: botSettings.admin_phone });
                toast.success("Admin phone updated");
              } catch (e) { toast.error("Failed"); }
            }}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#27272A] text-xs text-[#25D366]"
            onClick={async () => {
              toast.info("Sending test message...");
              try {
                const res = await axios.post(`${API}/whatsapp/test-send?to=${encodeURIComponent(botSettings.admin_phone)}`);
                if (res.data.success) toast.success("Test message sent! Check WhatsApp.");
                else toast.error(res.data.error);
              } catch (e) { toast.error("Failed to send test"); }
            }}
            data-testid="test-whatsapp-btn"
          >
            Test WhatsApp
          </Button>
        </div>
      </div>

      {/* Broadcast Message to All Customers */}
      <div className="card p-6" data-testid="whatsapp-broadcast">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="text-[#25D366]" size={20} />
          <h2 className="text-lg font-bold text-white">Broadcast Message</h2>
          <span className="text-xs text-gray-500 ml-2">Send to all active customers</span>
        </div>
        <textarea
          className="w-full bg-[#0A0A0A] border border-[#27272A] rounded-lg p-3 text-sm text-white resize-none focus:border-[#25D366] outline-none"
          rows={4}
          placeholder="Type your message here... It will be sent to all active customers via WhatsApp."
          value={broadcastMessage}
          onChange={(e) => setBroadcastMessage(e.target.value)}
          data-testid="broadcast-input"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">{broadcastMessage.length} characters</span>
          <Button
            size="sm"
            disabled={!broadcastMessage.trim() || broadcastSending}
            className="bg-[#25D366] hover:bg-[#25D366]/80 text-black font-medium"
            onClick={async () => {
              if (!window.confirm(`Send this message to ALL active customers?`)) return;
              setBroadcastSending(true);
              try {
                const res = await axios.post(`${API}/whatsapp/broadcast`, { message: broadcastMessage });
                if (res.data.success) {
                  toast.success(`Sent to ${res.data.sent} customers! (${res.data.failed} failed)`);
                  setBroadcastMessage("");
                } else {
                  toast.error(res.data.error);
                }
              } catch (e) {
                toast.error("Failed to send broadcast");
              }
              setBroadcastSending(false);
            }}
            data-testid="broadcast-send-btn"
          >
            {broadcastSending ? "Sending..." : "Send to All"}
          </Button>
        </div>
      </div>

      {/* WhatsApp Message History */}
      <div className="card p-6" data-testid="whatsapp-history">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-[#25D366]" size={20} />
            <h2 className="text-lg font-bold text-white">Message History</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#27272A] text-xs"
            onClick={async () => {
              try {
                const res = await axios.get(`${API}/whatsapp/history/all`);
                setMessageHistory(res.data);
              } catch (e) { toast.error("Failed to load history"); }
            }}
            data-testid="load-history-btn"
          >
            Load History
          </Button>
        </div>
        {messageHistory && messageHistory.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {messageHistory.map((cust, idx) => (
              <div key={idx} className="bg-[#0A0A0A] rounded-lg border border-[#27272A]">
                <button
                  onClick={() => setExpandedHistory(expandedHistory === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div>
                    <span className="text-sm font-medium text-white">{cust.customer_name}</span>
                    <span className="text-xs text-gray-500 ml-2">{cust.phone}</span>
                  </div>
                  <span className="text-xs text-gray-500">{cust.messages.length} messages</span>
                </button>
                {expandedHistory === idx && (
                  <div className="px-3 pb-3 space-y-2 border-t border-[#27272A] pt-2">
                    {cust.messages.slice(0, 10).map((msg, mi) => (
                      <div key={mi} className={`text-xs p-2 rounded ${msg.status === 'sent' ? 'bg-[#1A1A1A]' : 'bg-red-900/20'}`}>
                        <div className="flex justify-between mb-1">
                          <span className={`font-medium ${msg.status === 'sent' ? 'text-[#25D366]' : 'text-red-400'}`}>
                            {msg.type} • {msg.status}
                          </span>
                          <span className="text-gray-500">{new Date(msg.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-400 whitespace-pre-wrap line-clamp-3">{msg.message.substring(0, 150)}...</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No messages sent yet. Click "Load History" to view sent messages.</p>
        )}
      </div>

      {/* Repairs */}
      <div className="card p-6" data-testid="repairs-section">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="text-[#F59E0B]" size={20} />
            <h2 className="text-lg font-bold text-white">Repairs</h2>
            {repairs.filter(r => r.status === 'unpaid').length > 0 && (
              <span className="text-xs bg-[#F59E0B]/20 text-[#F59E0B] px-2 py-0.5 rounded-full">
                {repairs.filter(r => r.status === 'unpaid').length} unpaid
              </span>
            )}
          </div>
          <Button onClick={() => { setRepairForm({ customer_id: "", description: "", cost: "" }); setShowRepairModal(true); }} className="bg-[#F59E0B] text-black" data-testid="add-repair-btn">
            <Plus size={16} className="mr-2" /> Add Repair
          </Button>
        </div>
        
        {repairs.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {repairs.map(repair => (
              <div key={repair.id} className={`bg-[#0A0A0A] rounded-lg border p-3 flex items-center justify-between ${repair.status === 'unpaid' ? 'border-[#F59E0B]/30' : 'border-[#27272A]'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{repair.customer_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${repair.status === 'unpaid' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#00E054]/20 text-[#00E054]'}`}>
                      {repair.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{repair.description}</p>
                  <p className="text-xs text-gray-500">{new Date(repair.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">${repair.cost?.toLocaleString()}</span>
                  {repair.status === 'unpaid' && (
                    <Button size="sm" variant="outline" className="border-[#00E054] text-[#00E054] text-xs"
                      onClick={async () => {
                        try {
                          await axios.put(`${API}/repairs/${repair.id}`, { status: "paid" });
                          toast.success(`Repair marked as paid for ${repair.customer_name}`);
                          fetchData();
                        } catch (e) { toast.error("Failed"); }
                      }}
                    >Mark Paid</Button>
                  )}
                  <Button size="icon" variant="ghost" className="text-red-400"
                    onClick={async () => {
                      if (!window.confirm("Delete this repair?")) return;
                      try {
                        await axios.delete(`${API}/repairs/${repair.id}`);
                        toast.success("Repair deleted");
                        fetchData();
                      } catch (e) { toast.error("Failed"); }
                    }}
                  ><Trash2 size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No repairs recorded.</p>
        )}
      </div>

      {/* Repair Modal */}
      {showRepairModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#27272A] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Add Repair</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-400">Customer</Label>
                <select
                  className="w-full bg-[#0A0A0A] border border-[#27272A] rounded-lg p-2 text-sm text-white"
                  value={repairForm.customer_id}
                  onChange={(e) => setRepairForm({ ...repairForm, customer_id: e.target.value })}
                >
                  <option value="">Select customer...</option>
                  {customers.filter(c => c.status !== 'paused').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Description (what was repaired)</Label>
                <Input
                  className="bg-[#0A0A0A] border-[#27272A]"
                  placeholder="e.g., Fan replacement, PSU repair..."
                  value={repairForm.description}
                  onChange={(e) => setRepairForm({ ...repairForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Cost ($)</Label>
                <Input
                  type="number"
                  className="bg-[#0A0A0A] border-[#27272A]"
                  placeholder="0"
                  value={repairForm.cost}
                  onChange={(e) => setRepairForm({ ...repairForm, cost: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1 border-[#27272A]" onClick={() => setShowRepairModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-[#F59E0B] text-black" onClick={async () => {
                if (!repairForm.customer_id || !repairForm.description || !repairForm.cost) {
                  toast.error("Fill all fields"); return;
                }
                try {
                  await axios.post(`${API}/repairs`, repairForm);
                  toast.success("Repair added");
                  setShowRepairModal(false);
                  fetchData();
                } catch (e) { toast.error("Failed"); }
              }}>Add Repair</Button>
            </div>
          </div>
        </div>
      )}

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
            <div>
              <Label className="text-[#00E054]">Watcher Link URL (Recommended - No IP whitelist needed)</Label>
              <Input 
                value={accountForm.watcher_url || ""} 
                onChange={(e) => setAccountForm({ ...accountForm, watcher_url: e.target.value })} 
                className="bg-[#0A0A0A] border-[#00E054]/30 mt-1 text-xs" 
                placeholder="https://www.viabtc.com/en/observer/worker?access_key=xxx&coin=LTC" 
              />
              <p className="text-xs text-gray-500 mt-1">Get from ViaBTC → Observer → Copy watcher link</p>
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
