import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { 
  DollarSign, TrendingUp, Users, Cpu, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Pause, RefreshCw, Wifi, WifiOff,
  AlertTriangle, Server, ChevronDown, ChevronUp, Thermometer, 
  Fan, Power, RotateCcw, Monitor, Zap, X
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from "recharts";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [machineMonitor, setMachineMonitor] = useState(null);
  const [monitorLoading, setMonitorLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnline, setShowOnline] = useState(false);  // Toggle for online machines
  const [expandedAccount, setExpandedAccount] = useState(null);  // Track which account is expanded
  const [monitorMode, setMonitorMode] = useState("api");  // "api" or "watcher" - default api
  const [overdueData, setOverdueData] = useState(null);
  const [liveMachines, setLiveMachines] = useState([]);
  const [liveMachinesLoading, setLiveMachinesLoading] = useState(false);
  const [liveFilter, setLiveFilter] = useState("customers");
  const [liveSearch, setLiveSearch] = useState("");
  const [walletSwitch, setWalletSwitch] = useState({ switched: false });
  const [newWallet, setNewWallet] = useState("");
  const [selectedMachines, setSelectedMachines] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [mismatch, setMismatch] = useState(null);
  const [mismatchLoading, setMismatchLoading] = useState(false);
  const [mismatchOpen, setMismatchOpen] = useState(false);

  // Helper to format hashrate
  const formatHashrate = (hashrate, coin) => {
    if (!hashrate) return "0 H/s";
    if (coin === "KAS") {
      // KAS uses TH/s scale
      if (hashrate >= 1e12) return (hashrate / 1e12).toFixed(2) + " TH/s";
      if (hashrate >= 1e9) return (hashrate / 1e9).toFixed(2) + " GH/s";
      if (hashrate >= 1e6) return (hashrate / 1e6).toFixed(2) + " MH/s";
      return hashrate.toFixed(0) + " H/s";
    } else {
      // LTC uses GH/s scale  
      if (hashrate >= 1e12) return (hashrate / 1e12).toFixed(2) + " TH/s";
      if (hashrate >= 1e9) return (hashrate / 1e9).toFixed(2) + " GH/s";
      if (hashrate >= 1e6) return (hashrate / 1e6).toFixed(2) + " MH/s";
      return hashrate.toFixed(0) + " H/s";
    }
  };

  useEffect(() => {
    fetchStats();
    fetchMachineMonitor();
    fetchOverdue();
    fetchLiveMachines();
    
    // Auto-refresh machine monitor every 60 seconds
    const interval = setInterval(fetchMachineMonitor, 60000);
    const interval2 = setInterval(fetchLiveMachines, 120000);
    return () => { clearInterval(interval); clearInterval(interval2); };
  }, [monitorMode, liveFilter]);

  const fetchOverdue = async () => {
    try {
      const res = await axios.get(`${API}/payments/overdue`);
      setOverdueData(res.data);
    } catch (e) {}
  };

  const fetchLiveMachines = async () => {
    try {
      const filter = liveFilter === "customers" ? "true" : "false";
      const [res, switchRes] = await Promise.all([
        axios.get(`${API}/machine-data/live?filter_customers=${filter}`),
        axios.get(`${API}/machine-data/switch-status`)
      ]);
      setLiveMachines(res.data);
      setWalletSwitch(switchRes.data);
    } catch (e) {}
  };

  const fetchSyncMismatch = async (forceRefresh = false) => {
    setMismatchLoading(true);
    try {
      const params = new URLSearchParams();
      if (forceRefresh) params.set("force_refresh", "true");
      if (monitorMode) params.set("mode", monitorMode);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await axios.get(`${API}/admin/sync-mismatch${qs}`);
      setMismatch(res.data);
      setMismatchOpen(true);
    } catch (e) {
      toast.error("Failed to load sync mismatch");
    } finally {
      setMismatchLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/stats`);
      setStats(res.data);
    } catch (e) {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchMachineMonitor = async (forceRefresh = false) => {
    try {
      const qs = forceRefresh ? '&force_refresh=true' : '';
      
      if (monitorMode === "api") {
        // Try API-based endpoint first
        try {
          const res = await axios.get(`${API}/admin/machine-monitor?mode=api${qs}`);
          if (res.data.success) {
            setMachineMonitor(res.data);
            return;
          }
        } catch (e) { /* fall through */ }
        
        // API failed — auto-fallback to watcher
        const res = await axios.get(`${API}/admin/machine-monitor?mode=watcher${qs}`);
        setMachineMonitor(res.data);
      } else {
        // Watcher mode directly
        const res = await axios.get(`${API}/admin/machine-monitor?mode=watcher${qs}`);
        setMachineMonitor(res.data);
      }
    } catch (e) {
      console.error("Failed to load machine monitor");
    } finally {
      setMonitorLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefreshMonitor = () => {
    setRefreshing(true);
    fetchMachineMonitor(true);  // Force refresh when clicking the button
  };

  const handleHideWorker = async (detail) => {
    const label = `${detail.machine_name || detail.worker} (${detail.coin})`;
    if (!window.confirm(`Hide stale worker "${label}" from the dashboard?\n\nThis only hides the entry — it does NOT touch the miner. ViaBTC auto-purges old workers after ~7 days.`)) {
      return;
    }
    try {
      await axios.post(`${API}/viabtc/hide-worker`, {
        account: detail.worker || "",
        machine_name: detail.machine_name || "",
        coin: detail.coin || ""
      });
      toast.success(`Hidden: ${label}`);
      fetchMachineMonitor(true);
    } catch (e) {
      toast.error(`Failed to hide worker: ${e?.response?.data?.detail || e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-80 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className={`stat-card ${color}`} data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${
          color === 'profit' ? 'bg-[#00E054]/10 text-[#00E054]' :
          color === 'cost' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
          color === 'revenue' ? 'bg-[#00C2FF]/10 text-[#00C2FF]' :
          'bg-[#7C3AED]/10 text-[#7C3AED]'
        }`}>
          <Icon size={24} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${
          trend >= 0 ? 'text-[#00E054]' : 'text-[#EF4444]'
        }`}>
          {trend >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          <span>{Math.abs(trend).toFixed(1)}% margin</span>
        </div>
      )}
    </div>
  );

  // Prepare chart data
  const monthlyData = Object.entries(stats?.monthly_stats || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month: month.split('-')[1] || month,
      paid: data.paid || 0,
      unpaid: data.unpaid || 0,
      paused: data.paused || 0,
    }));

  const machineData = Object.entries(stats?.machine_counts || {}).map(([name, count]) => ({
    name,
    value: count
  }));

  const COLORS = ['#00E054', '#7C3AED', '#00C2FF', '#EAB308', '#EF4444', '#F97316'];

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 mt-1">Your crypto farm overview</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Profit"
          value={`$${(stats?.monthly_profit || 0).toLocaleString()}`}
          subtitle="Revenue - Costs"
          icon={TrendingUp}
          color="profit"
          trend={stats?.profit_margin}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${(stats?.total_monthly_revenue || 0).toLocaleString()}`}
          subtitle="From active customers"
          icon={DollarSign}
          color="revenue"
        />
        <StatCard
          title="Monthly Cost"
          value={`$${(stats?.total_monthly_cost || 0).toLocaleString()}`}
          subtitle="Your expenses"
          icon={AlertCircle}
          color="cost"
        />
        <StatCard
          title="Active Customers"
          value={stats?.active_customers || 0}
          subtitle={`${stats?.paused_customers || 0} paused`}
          icon={Users}
          color="secondary"
        />
      </div>

      {/* Overdue Payments */}
      {overdueData && overdueData.total_customers > 0 && (
        <div className="bg-gradient-to-r from-red-500/5 to-[#0F0F0F] rounded-xl border border-red-500/30 p-6" data-testid="overdue-section">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="text-red-500" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Overdue Payments</h2>
                <p className="text-sm text-gray-500">{overdueData.total_customers} customer(s) with past-due balance</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-400">${overdueData.total_overdue.toLocaleString()}</p>
              <p className="text-xs text-gray-500">total overdue</p>
            </div>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {overdueData.overdue_customers.map((cust, idx) => (
              <div key={idx} className="bg-[#0A0A0A] rounded-lg border border-[#27272A] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-white">{cust.customer_name}</span>
                    {cust.status === 'paused' && <span className="text-xs text-yellow-500 ml-2">(paused)</span>}
                  </div>
                  <span className="text-lg font-bold text-red-400">${cust.total_owed.toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {cust.months.map((m, mi) => (
                    <span key={mi} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded">
                      {m.month}: ${m.amount.toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-Time Machine Monitor */}
      <div className="bg-gradient-to-r from-[#0F0F0F] to-[#1A1A1A] rounded-xl border border-[#27272A] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00E054]/10">
              <Server className="text-[#00E054]" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Real-Time Machine Monitor</h2>
              <p className="text-sm text-gray-500">
                {machineMonitor?.mode === "watcher" ? "Using watcher links" : machineMonitor?.mode === "api" ? "Using API keys" : "Live worker status from ViaBTC"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#1A1A1A] border border-[#27272A] rounded-lg overflow-hidden">
              <button
                onClick={() => { setMonitorMode("api"); setMonitorLoading(true); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  monitorMode === "api" 
                    ? "bg-[#00E054] text-black" 
                    : "text-gray-400 hover:text-white"
                }`}
                data-testid="monitor-mode-api"
              >
                API
              </button>
              <button
                onClick={() => { setMonitorMode("watcher"); setMonitorLoading(true); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  monitorMode === "watcher" 
                    ? "bg-[#00E054] text-black" 
                    : "text-gray-400 hover:text-white"
                }`}
                data-testid="monitor-mode-watcher"
              >
                Watcher
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshMonitor}
              disabled={refreshing}
              className="border-[#27272A] hover:bg-[#27272A]"
              data-testid="monitor-refresh-btn"
            >
              <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {monitorLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
          </div>
        ) : machineMonitor?.success ? (
          <>
            {/* Machine Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* LTC Miners */}
              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">💎</span>
                  <span className="font-bold text-gray-300">LTC Miners</span>
                  {machineMonitor.stats.ltc.not_synced > 0 && (
                    <span className="text-xs text-gray-500">({machineMonitor.stats.ltc.not_synced} not synced)</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-[#00E054]">
                      <Wifi size={16} />
                      <span className="text-2xl font-bold">{machineMonitor.stats.ltc.online}</span>
                    </div>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-[#EF4444]">
                      <WifiOff size={16} />
                      <span className="text-2xl font-bold">{machineMonitor.stats.ltc.offline}</span>
                    </div>
                    <p className="text-xs text-gray-500">Offline</p>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white">{machineMonitor.stats.ltc.total}</span>
                    <p className="text-xs text-gray-500">Synced</p>
                  </div>
                </div>
              </div>

              {/* KAS Miners */}
              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-teal-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🟢</span>
                  <span className="font-bold text-teal-300">KAS Miners</span>
                  {machineMonitor.stats.kas.not_synced > 0 && (
                    <span className="text-xs text-gray-500">({machineMonitor.stats.kas.not_synced} not synced)</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-[#00E054]">
                      <Wifi size={16} />
                      <span className="text-2xl font-bold">{machineMonitor.stats.kas.online}</span>
                    </div>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-[#EF4444]">
                      <WifiOff size={16} />
                      <span className="text-2xl font-bold">{machineMonitor.stats.kas.offline}</span>
                    </div>
                    <p className="text-xs text-gray-500">Offline</p>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white">{machineMonitor.stats.kas.total}</span>
                    <p className="text-xs text-gray-500">Synced</p>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#7C3AED]/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⚡</span>
                  <span className="font-bold text-[#7C3AED]">All Miners</span>
                  {machineMonitor.stats.total.not_synced > 0 && (
                    <span className="text-xs text-gray-500">({machineMonitor.stats.total.not_synced} not synced)</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div 
                    className="text-center cursor-pointer hover:bg-[#00E054]/10 rounded-lg p-2 transition-colors"
                    onClick={() => setShowOnline(!showOnline)}
                    title="Click to view online machines"
                  >
                    <div className="flex items-center gap-1 text-[#00E054]">
                      <Wifi size={16} />
                      <span className="text-2xl font-bold">{machineMonitor.stats.total.online}</span>
                      {showOnline ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-[#EF4444]">
                      <WifiOff size={16} />
                      <span className="text-2xl font-bold">{machineMonitor.stats.total.offline}</span>
                    </div>
                    <p className="text-xs text-gray-500">Offline</p>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white">{machineMonitor.stats.total.total}</span>
                    <p className="text-xs text-gray-500">Synced</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Online Workers Details (Expandable) */}
            {showOnline && machineMonitor.online_details?.length > 0 && (
              <div className="bg-[#00E054]/10 border border-[#00E054]/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wifi className="text-[#00E054]" size={20} />
                  <span className="font-bold text-[#00E054]">
                    Online Machines ({machineMonitor.online_details.reduce((sum, d) => sum + d.machines, 0)})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {machineMonitor.online_details.map((detail, idx) => {
                    const accountKey = `${detail.worker_name}-${detail.coin}`;
                    const isExpanded = expandedAccount === accountKey;
                    
                    return (
                      <div key={idx} className="bg-[#0A0A0A] rounded-lg overflow-hidden">
                        {/* Account Header - Clickable */}
                        <div 
                          className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#1A1A1A] transition-colors"
                          onClick={() => setExpandedAccount(isExpanded ? null : accountKey)}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Wifi size={14} className="text-[#00E054] flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm text-white font-medium truncate block">{detail.worker}</span>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-[#00E054]">({detail.machines})</span>
                                <span className="text-yellow-400">{formatHashrate(detail.hashrate, detail.coin)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              detail.coin === 'LTC' ? 'bg-gray-700 text-gray-300' : 'bg-teal-900 text-teal-300'
                            }`}>{detail.coin}</span>
                            {detail.workers?.length > 0 && (
                              isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        {/* Expanded Workers List */}
                        {isExpanded && detail.workers?.length > 0 && (
                          <div className="border-t border-gray-800 bg-[#050505] px-2 py-2 max-h-48 overflow-y-auto">
                            {detail.workers.map((w, wIdx) => (
                              <div key={wIdx} className="flex items-center justify-between py-1 px-2 text-xs hover:bg-[#0A0A0A] rounded">
                                <span className="text-gray-300 truncate">{w.name}</span>
                                <span className="text-yellow-400 ml-2 flex-shrink-0">{formatHashrate(w.hashrate, detail.coin)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Offline Workers Alert */}
            {machineMonitor.offline_details?.length > 0 && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="text-[#EF4444]" size={20} />
                  <span className="font-bold text-[#EF4444]">
                    Offline Machines ({machineMonitor.offline_details.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {machineMonitor.offline_details.map((detail, idx) => {
                    const offlineDuration = detail.last_active ? (() => {
                      const seconds = Math.floor(Date.now() / 1000) - detail.last_active;
                      if (seconds < 60) return `${seconds}s ago`;
                      const minutes = Math.floor(seconds / 60);
                      if (minutes < 60) return `${minutes}m ago`;
                      const hours = Math.floor(minutes / 60);
                      if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
                      const days = Math.floor(hours / 24);
                      return `${days}d ${hours % 24}h ago`;
                    })() : '';
                    return (
                    <div key={idx} className="bg-[#0A0A0A] rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <WifiOff size={14} className="text-[#EF4444] shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm text-white font-medium">{detail.machine_name || detail.worker}</span>
                          <span className="text-xs text-gray-500 ml-2">({detail.worker})</span>
                          {detail.ip && (
                            <span className="text-xs text-cyan-400 ml-2 font-mono">{detail.ip}</span>
                          )}
                          {(detail.model || detail.farm) && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {detail.model && <span>{detail.model}</span>}
                              {detail.model && detail.farm && <span className="mx-1">·</span>}
                              {detail.farm && <span className="text-purple-400">{detail.farm}</span>}
                            </div>
                          )}
                          {offlineDuration && (
                            <div className="text-xs text-[#EF4444]/80 mt-0.5">Offline since {offlineDuration}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          detail.coin === 'LTC' ? 'bg-gray-700 text-gray-300' : 'bg-teal-900 text-teal-300'
                        }`}>{detail.coin}</span>
                        <button
                          onClick={() => handleHideWorker(detail)}
                          title="Hide this stale worker entry"
                          aria-label="Hide stale worker"
                          className="p-1 rounded hover:bg-[#EF4444]/20 text-gray-500 hover:text-[#EF4444] transition-colors"
                          data-testid={`hide-offline-worker-${idx}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!machineMonitor.offline_details || machineMonitor.offline_details.length === 0) && (
              <div className="bg-[#00E054]/10 border border-[#00E054]/30 rounded-xl p-4 flex items-center gap-3">
                <Wifi className="text-[#00E054]" size={24} />
                <div>
                  <span className="font-bold text-[#00E054]">All Machines Online</span>
                  <p className="text-sm text-gray-500">No offline machines detected</p>
                </div>
              </div>
            )}

            {/* API Errors Warning */}
            {machineMonitor.api_errors?.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-yellow-500" size={20} />
                  <span className="font-bold text-yellow-500">
                    API Connection Issues ({machineMonitor.api_errors.length} accounts)
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  Some accounts couldn't be fetched. Whitelist IP: <code className="bg-gray-800 px-2 py-0.5 rounded">{machineMonitor.server_ip}</code>
                </p>
                <div className="flex flex-wrap gap-2">
                  {machineMonitor.api_errors.map((err, idx) => (
                    <span key={idx} className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded">
                      {err.account}: {err.reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <WifiOff size={48} className="mx-auto mb-4 opacity-50" />
            <p>Could not load machine status</p>
            <p className="text-sm mt-1">{machineMonitor?.error || "Check ViaBTC API settings"}</p>
          </div>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#00E054]/10">
              <DollarSign className="text-[#00E054]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Collected</p>
              <h3 className="text-xl font-bold text-white">
                ${(stats?.total_collected || 0).toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#EF4444]/10">
              <AlertCircle className="text-[#EF4444]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending Payments</p>
              <h3 className="text-xl font-bold text-white">
                ${(stats?.total_pending || 0).toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#7C3AED]/10">
              <Cpu className="text-[#7C3AED]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Machines</p>
              <h3 className="text-xl font-bold text-white">
                {Object.values(stats?.machine_counts || {}).reduce((a, b) => a + b, 0)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment History Chart */}
        <div className="chart-container">
          <h3 className="text-lg font-bold text-white mb-4">Payment History</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="month" stroke="#A1A1AA" fontSize={12} />
                <YAxis stroke="#A1A1AA" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F0F0F', 
                    border: '1px solid #27272A',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#FFFFFF' }}
                />
                <Bar dataKey="paid" name="Paid" fill="#00E054" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unpaid" name="Unpaid" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paused" name="Paused" fill="#EAB308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No payment data yet
            </div>
          )}
        </div>

        {/* Machine Distribution */}
        <div className="chart-container">
          <h3 className="text-lg font-bold text-white mb-4">Machine Distribution</h3>
          {machineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={machineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: '#A1A1AA' }}
                >
                  {machineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F0F0F', 
                    border: '1px solid #27272A',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No machines registered yet
            </div>
          )}
        </div>
      </div>

      {/* Live Machine Data (from PC Sync) */}
      {liveMachines.length > 0 && (
        <div className="bg-[#0F0F0F] rounded-xl border border-[#27272A] p-6" data-testid="live-machine-data">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Monitor className="text-cyan-400" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Live Machine Control Panel</h2>
                <p className="text-sm text-gray-500">
                  {liveMachines.length} machines synced from MineFleet
                  {liveMachines[0]?.updated_at && (
                    <span> &middot; Last sync: {new Date(liveMachines[0].updated_at).toLocaleTimeString()}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search name, IP, farm..."
                value={liveSearch}
                onChange={(e) => setLiveSearch(e.target.value)}
                className="bg-[#1A1A1A] border-[#27272A] text-sm w-48 h-8"
                data-testid="live-search"
              />
              <div className="flex items-center bg-[#1A1A1A] border border-[#27272A] rounded-lg overflow-hidden">
                <button
                  onClick={() => setLiveFilter("customers")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    liveFilter === "customers" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
                  }`}
                  data-testid="live-filter-customers"
                >
                  My Customers
                </button>
                <button
                  onClick={() => setLiveFilter("all")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    liveFilter === "all" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
                  }`}
                  data-testid="live-filter-all"
                >
                  All
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSyncMismatch(false)}
                className="border-[#27272A] hover:bg-[#27272A]"
                data-testid="check-sync-mismatch"
                title="Find machines visible in ViaBTC pool but not synced from your local PC"
              >
                <AlertCircle size={14} className={`mr-2 ${mismatchLoading ? 'animate-pulse' : ''}`} />
                Sync Check
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setLiveMachinesLoading(true); fetchLiveMachines().finally(() => setLiveMachinesLoading(false)); }}
                className="border-[#27272A] hover:bg-[#27272A]"
                data-testid="refresh-live-machines"
              >
                <RefreshCw size={14} className={`mr-2 ${liveMachinesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#27272A]">
              <p className="text-xs text-gray-500">Online</p>
              <p className="text-xl font-bold text-[#00E054]">{liveMachines.filter(m => m.status === 'online').length}</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#27272A]">
              <p className="text-xs text-gray-500">Offline / Crashed</p>
              <p className="text-xl font-bold text-red-400">{liveMachines.filter(m => m.status !== 'online').length}</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#27272A]">
              <p className="text-xs text-gray-500">Avg Temperature</p>
              <p className="text-xl font-bold text-orange-400">
                {liveMachines.filter(m => m.temperature > 0).length > 0 
                  ? Math.round(liveMachines.filter(m => m.temperature > 0).reduce((s, m) => s + m.temperature, 0) / liveMachines.filter(m => m.temperature > 0).length)
                  : 0}°C
              </p>
            </div>
            <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#27272A]">
              <p className="text-xs text-gray-500">Total Hashrate</p>
              <p className="text-xl font-bold text-cyan-400">
                {liveMachines.reduce((s, m) => s + (m.hashrate || 0), 0).toFixed(1)} GH/s
              </p>
            </div>
          </div>

          {/* Sync Mismatch Panel */}
          {mismatchOpen && mismatch && (
            <div className="bg-[#0A0A0A] rounded-lg border border-amber-500/30 p-4 mb-4" data-testid="sync-mismatch-panel">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-400" />
                  <span className="text-sm font-bold text-white">Sync Mismatch Report</span>
                  <span className="text-xs text-gray-500">
                    ViaBTC: {mismatch.viabtc_total} online workers · Local: {mismatch.pc_total} customer machines
                    {mismatch.mode && <span className="ml-1 opacity-60">({mismatch.mode})</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchSyncMismatch(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1"
                    data-testid="refresh-sync-mismatch"
                  >
                    <RefreshCw size={12} className={`inline mr-1 ${mismatchLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setMismatchOpen(false)}
                    className="text-gray-500 hover:text-white p-1"
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {!mismatch.success && (
                <p className="text-sm text-red-400">{mismatch.error || "Failed to compare"}</p>
              )}

              {mismatch.success && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* In ViaBTC pool but missing from PC sync */}
                  <div className="bg-[#1A1A1A] rounded-lg p-3 border border-amber-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-amber-400">
                        In Pool but NOT synced locally
                      </span>
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        {mismatch.viabtc_only?.length || 0}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-2">
                      These miners are hashing in ViaBTC but your PC sync can't see their IPs (offline LAN, blocked port, wrong subnet).
                    </p>
                    {(mismatch.viabtc_only?.length || 0) === 0 ? (
                      <p className="text-xs text-gray-500 italic">All ViaBTC workers are accounted for locally ✓</p>
                    ) : (
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {mismatch.viabtc_only.map((w, i) => (
                          <div key={`vbtc-${i}`} className="flex items-center justify-between bg-[#0A0A0A] rounded px-2 py-1.5">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-medium text-white">{w.worker_name}</span>
                              <span className="text-[10px] text-gray-500 ml-2">({w.account})</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                w.coin === 'LTC' ? 'bg-gray-700 text-gray-300' : 'bg-teal-900 text-teal-300'
                              }`}>{w.coin}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                w.status === 'online' ? 'bg-[#00E054]/10 text-[#00E054]' : 'bg-red-500/10 text-red-400'
                              }`}>{w.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* In PC sync but missing from ViaBTC */}
                  <div className="bg-[#1A1A1A] rounded-lg p-3 border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-cyan-400">
                        Synced locally but NOT in pool
                      </span>
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                        {mismatch.pc_only?.length || 0}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-2">
                      These miners are reachable on your LAN but ViaBTC sees no worker — likely on wrong pool or just rebooted.
                    </p>
                    {(mismatch.pc_only?.length || 0) === 0 ? (
                      <p className="text-xs text-gray-500 italic">All local machines are visible in the pool ✓</p>
                    ) : (
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {mismatch.pc_only.map((m, i) => (
                          <div key={`pc-${i}`} className="flex items-center justify-between bg-[#0A0A0A] rounded px-2 py-1.5">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-mono text-cyan-300">{m.ip}</span>
                              <span className="text-[10px] text-white ml-2">{m.worker_name || '—'}</span>
                              {m.farm && <span className="text-[10px] text-purple-400 ml-1">({m.farm})</span>}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              m.status === 'online' ? 'bg-[#00E054]/10 text-[#00E054]' : 'bg-red-500/10 text-red-400'
                            }`}>{m.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wallet Switch Controls */}
          <div className="bg-[#0A0A0A] rounded-lg border border-[#27272A] p-4 mb-4" data-testid="wallet-switch">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className={walletSwitch.switched ? "text-[#F59E0B]" : "text-gray-500"} />
                <span className="text-sm font-medium text-white">Worker Switch</span>
                {walletSwitch.switched && (
                  <span className="text-xs bg-[#F59E0B]/20 text-[#F59E0B] px-2 py-0.5 rounded-full">
                    Active → {walletSwitch.new_worker}
                  </span>
                )}
              </div>
              
              {!walletSwitch.switched ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setSelectMode(!selectMode); setSelectedMachines(new Set()); }}
                    className={`text-xs px-3 py-1.5 rounded transition-colors ${selectMode ? 'bg-cyan-500 text-black' : 'bg-[#1A1A1A] text-gray-400 border border-[#27272A]'}`}
                  >
                    {selectMode ? `${selectedMachines.size} selected` : "Select Machines"}
                  </button>
                  <Input
                    placeholder="New worker name..."
                    value={newWallet}
                    onChange={(e) => setNewWallet(e.target.value)}
                    className="bg-[#1A1A1A] border-[#27272A] text-sm w-48 h-8"
                  />
                  <Button
                    size="sm"
                    disabled={!newWallet.trim()}
                    className="bg-[#F59E0B] text-black text-xs"
                    onClick={async () => {
                      const ips = selectMode && selectedMachines.size > 0 ? Array.from(selectedMachines) : [];
                      const target = ips.length > 0 ? `${ips.length} selected machines` : "ALL customer machines";
                      if (!window.confirm(`Switch ${target} to worker "${newWallet}"?`)) return;
                      try {
                        const res = await axios.post(`${API}/machine-data/switch-workers`, { new_worker: newWallet, ips });
                        toast.success(`Switch queued for ${res.data.machines} machines. PC will execute in ~2 min.`);
                        setSelectMode(false);
                        setSelectedMachines(new Set());
                        fetchLiveMachines();
                      } catch (e) { toast.error("Failed"); }
                    }}
                    data-testid="switch-workers-btn"
                  >
                    Switch {selectMode && selectedMachines.size > 0 ? `(${selectedMachines.size})` : "All"}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="bg-[#00E054] text-black text-xs"
                  onClick={async () => {
                    if (!window.confirm("Restore all workers back to original?")) return;
                    try {
                      const res = await axios.post(`${API}/machine-data/restore-workers`);
                      toast.success(`Restore queued for ${res.data.restored} machines. PC will execute in ~2 min.`);
                      fetchLiveMachines();
                    } catch (e) { toast.error("Failed"); }
                  }}
                  data-testid="restore-workers-btn"
                >
                  Restore Original Workers
                </Button>
              )}
            </div>
          </div>

          {/* Machine table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272A]">
                  {selectMode && (
                    <th className="py-2 px-2 w-8">
                      <input
                        type="checkbox"
                        className="accent-cyan-500"
                        checked={selectedMachines.size === liveMachines.length && liveMachines.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMachines(new Set(liveMachines.map(m => m.ip)));
                          } else {
                            setSelectedMachines(new Set());
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">IP</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Worker</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Model</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Farm</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Hashrate</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Temp</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Fan</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Power</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Uptime</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveMachines
                  .filter(m => {
                    if (!liveSearch.trim()) return true;
                    const q = liveSearch.toLowerCase();
                    return (m.worker_name || '').toLowerCase().includes(q) ||
                           (m.ip || '').includes(q) ||
                           (m.farm || '').toLowerCase().includes(q) ||
                           (m.model || '').toLowerCase().includes(q);
                  })
                  .sort((a, b) => (a.status === 'online' ? 1 : -1) - (b.status === 'online' ? 1 : -1))
                  .map((m, idx) => {
                    const isOnline = m.status === 'online';
                    const isHot = m.temperature > 80;
                    return (
                      <tr key={m.ip || idx} className={`border-b border-[#27272A]/50 hover:bg-[#1A1A1A] transition-colors ${
                        m.is_customer ? 'bg-[#00E054]/5' : ''
                      } ${selectedMachines.has(m.ip) ? 'bg-cyan-500/10' : ''}`}>
                        {selectMode && (
                          <td className="py-2 px-2 w-8">
                            <input
                              type="checkbox"
                              className="accent-cyan-500"
                              checked={selectedMachines.has(m.ip)}
                              onChange={(e) => {
                                const next = new Set(selectedMachines);
                                if (e.target.checked) next.add(m.ip);
                                else next.delete(m.ip);
                                setSelectedMachines(next);
                              }}
                            />
                          </td>
                        )}
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            isOnline ? 'bg-[#00E054]/10 text-[#00E054]' : 
                            m.status === 'crashed' ? 'bg-red-500/10 text-red-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#00E054]' : m.status === 'crashed' ? 'bg-red-400' : 'bg-gray-400'}`} />
                            {m.status || 'unknown'}
                          </span>
                          {m.stale && m.seconds_since_update && (
                            <div className="text-[10px] text-amber-400 mt-0.5" title={`Last update ${m.seconds_since_update}s ago`}>
                              {m.seconds_since_update >= 86400
                                ? `${Math.floor(m.seconds_since_update / 86400)}d ${Math.floor((m.seconds_since_update % 86400) / 3600)}h ago`
                                : m.seconds_since_update >= 3600
                                  ? `${Math.floor(m.seconds_since_update / 3600)}h ${Math.floor((m.seconds_since_update % 3600) / 60)}m ago`
                                  : `${Math.floor(m.seconds_since_update / 60)}m ago`}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs text-gray-300">{m.ip}</td>
                        <td className="py-2 px-3 text-white font-medium text-xs">
                          <span
                            className="cursor-pointer hover:text-cyan-400 transition-colors"
                            onClick={() => {
                              const newName = window.prompt("Rename worker:", m.worker_name || "");
                              if (newName && newName !== m.worker_name) {
                                axios.post(`${API}/machine-data/rename`, { ip: m.ip, worker_name: newName })
                                  .then(() => { toast.success(`Renamed to ${newName}`); fetchLiveMachines(); })
                                  .catch(() => toast.error("Failed to rename"));
                              }
                            }}
                            title="Click to rename"
                          >{m.worker_name || '—'}</span>
                          {m.is_customer && <span className="ml-1 text-[10px] bg-[#00E054]/20 text-[#00E054] px-1 rounded">customer</span>}
                          {m.original_worker && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-amber-400/80">
                              <span title="Original worker before the temporary switch">was: {m.original_worker}</span>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!window.confirm(`Forget original worker "${m.original_worker}" for ${m.ip}?\n\nThis only clears the saved memory — it does NOT change the miner.`)) return;
                                  try {
                                    await axios.post(`${API}/machine-data/clear-original`, { ip: m.ip });
                                    toast.success("Original worker memory cleared");
                                    fetchLiveMachines();
                                  } catch (err) {
                                    toast.error("Failed to clear");
                                  }
                                }}
                                title="Forget original worker memory"
                                className="p-0.5 rounded hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
                                data-testid={`clear-original-${m.ip}`}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-400 text-xs">{m.model || '—'}</td>
                        <td className="py-2 px-3 text-purple-400 text-xs">{m.farm || '—'}</td>
                        <td className="py-2 px-3 text-cyan-400 font-mono text-xs">{m.hashrate ? `${m.hashrate.toFixed(1)} GH/s` : '—'}</td>
                        <td className={`py-2 px-3 font-mono text-xs ${isHot ? 'text-red-400' : m.temperature > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                          {m.temperature > 0 ? `${m.temperature}°C` : '—'}
                          {isHot && ' 🔥'}
                        </td>
                        <td className="py-2 px-3 text-gray-400 font-mono text-xs">{m.fan_speed > 0 ? `${m.fan_speed} RPM` : '—'}</td>
                        <td className="py-2 px-3 text-gray-400 font-mono text-xs">{m.power > 0 ? `${m.power}W` : '—'}</td>
                        <td className="py-2 px-3 text-gray-500 text-xs">{m.uptime || '—'}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {liveFilter === "all" && !m.is_customer && (
                              <>
                              <button
                                onClick={async () => {
                                  const name = m.worker_name || m.ip;
                                  if (!window.confirm(`Add "${name}" as a temporary customer?`)) return;
                                  try {
                                    const custRes = await axios.post(`${API}/customers`, { name: name, phone: "", machines: [], total_cost: 0, total_fee: 0, status: "active", notes: "Whitelisted from Live Panel" });
                                    const custId = custRes.data.id;
                                    await axios.post(`${API}/customer-accounts`, { customer_id: custId, username: name.toLowerCase().replace(/[^a-z0-9]/g, ''), password: "0000", worker_name: m.worker_name || "" });
                                    toast.success(`${name} added as customer!`);
                                    fetchLiveMachines();
                                  } catch (e) { toast.error("Failed to add"); }
                                }}
                                className="text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-2 py-1 rounded transition-colors"
                                data-testid={`whitelist-${m.ip}`}
                              >
                                + Whitelist
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`Remove ${m.worker_name || m.ip} from machine list?`)) return;
                                  try {
                                    await axios.delete(`${API}/machine-data/${encodeURIComponent(m.ip)}`);
                                    toast.success("Machine removed");
                                    fetchLiveMachines();
                                  } catch (e) { toast.error("Failed"); }
                                }}
                                className="text-xs bg-gray-500/10 text-gray-400 hover:bg-red-500/20 hover:text-red-400 px-2 py-1 rounded transition-colors"
                              >
                                Remove
                              </button>
                              </>
                            )}
                            {liveFilter === "all" && m.is_customer && (
                              <button
                                onClick={async () => {
                                  const name = m.worker_name || m.ip;
                                  if (!window.confirm(`Remove "${name}" from customers and machine list?`)) return;
                                  try {
                                    // Delete customer account and customer by worker name
                                    const accs = await axios.get(`${API}/customer-accounts`);
                                    const acc = accs.data.find(a => a.worker_name?.toLowerCase() === (m.worker_name || '').toLowerCase());
                                    if (acc) {
                                      await axios.delete(`${API}/customer-accounts/${acc.id}`);
                                      if (acc.customer_id) {
                                        try { await axios.delete(`${API}/customers/${acc.customer_id}`); } catch(e) {}
                                      }
                                    }
                                    await axios.delete(`${API}/machine-data/${encodeURIComponent(m.ip)}`);
                                    toast.success(`${name} removed`);
                                    fetchLiveMachines();
                                  } catch (e) { toast.error("Failed"); }
                                }}
                                className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                              >
                                Un-whitelist
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Reboot machine at ${m.ip}?`)) return;
                                try {
                                  const res = await axios.post(`${API}/machine-data/command`, { ip: m.ip, action: 'reboot' });
                                  if (res.data.success) toast.success(`Reboot command queued for ${m.ip}`);
                                  else toast.error('Failed to queue command');
                                } catch (e) { toast.error('Failed'); }
                              }}
                              className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                              data-testid={`reboot-${m.ip}`}
                            >
                              <RotateCcw size={12} className="inline mr-1" />
                              Reboot
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          
          {/* No data notice */}
          {liveMachines.length === 0 && (
            <p className="text-center text-gray-500 py-8">No machine data yet. Run wkbeast_sync.py on your PC to start syncing.</p>
          )}
        </div>
      )}

      {/* Machine Counter Breakdown */}
      {machineData.length > 0 && (
        <div className="chart-container">
          <h3 className="text-lg font-bold text-white mb-4">Machine Counter</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {machineData.map((machine, idx) => (
              <div 
                key={machine.name}
                className="p-4 rounded-lg border border-[#27272A] bg-[#0A0A0A] hover:border-[#00E054]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-gray-400 text-sm">{machine.name}</span>
                </div>
                <p className="text-2xl font-bold text-white mt-2">{machine.value}</p>
                <p className="text-xs text-gray-500">machines</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Database Backup */}
      <div className="mt-6 flex justify-end gap-2">
        <input
          type="file"
          id="backup-import"
          accept=".xlsx"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const mode = window.confirm(
              "Choose import mode:\n\nOK = MERGE (add to existing data, update duplicates)\nCancel = REPLACE (wipe everything and restore from backup)"
            ) ? "merge" : "replace";
            if (mode === "replace" && !window.confirm("WARNING: This will DELETE all existing data and replace with backup. Are you sure?")) {
              e.target.value = "";
              return;
            }
            const formData = new FormData();
            formData.append("file", file);
            toast.info("Importing backup...");
            try {
              const res = await axios.post(`${API}/import/full-backup?mode=${mode}`, formData);
              if (res.data.success) {
                const r = res.data.results;
                const summary = Object.entries(r).filter(([k]) => k !== "mode").map(([k, v]) => `${k}: ${v}`).join(", ");
                toast.success(`Import complete (${r.mode}): ${summary}`);
                fetchStats();
                fetchMachineMonitor(true);
              } else {
                toast.error(`Import failed: ${res.data.error}`);
              }
            } catch (err) {
              toast.error("Import failed: " + (err.response?.data?.detail || err.message));
            }
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("backup-import").click()}
          className="border-[#27272A] hover:bg-[#27272A] text-gray-400 hover:text-white text-xs"
          data-testid="import-backup-btn"
        >
          <ArrowUpRight size={14} className="mr-2" />
          Import Backup
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            toast.info("Generating backup...");
            window.open(`${API}/export/full-backup`, '_blank');
          }}
          className="border-[#27272A] hover:bg-[#27272A] text-gray-400 hover:text-white text-xs"
          data-testid="full-backup-btn"
        >
          <ArrowDownRight size={14} className="mr-2" />
          Export Full Backup
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
