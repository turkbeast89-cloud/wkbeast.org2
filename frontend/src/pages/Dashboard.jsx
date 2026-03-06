import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { 
  DollarSign, TrendingUp, Users, Cpu, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Pause, RefreshCw, Wifi, WifiOff,
  AlertTriangle, Server, ChevronDown, ChevronUp
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from "recharts";
import { Button } from "../components/ui/button";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [machineMonitor, setMachineMonitor] = useState(null);
  const [monitorLoading, setMonitorLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnline, setShowOnline] = useState(false);  // Toggle for online machines

  useEffect(() => {
    fetchStats();
    fetchMachineMonitor();
    
    // Auto-refresh machine monitor every 60 seconds
    const interval = setInterval(fetchMachineMonitor, 60000);
    return () => clearInterval(interval);
  }, []);

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
      const res = await axios.get(`${API}/admin/machine-monitor${forceRefresh ? '?force_refresh=true' : ''}`);
      if (res.data.success) {
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

      {/* Real-Time Machine Monitor */}
      <div className="bg-gradient-to-r from-[#0F0F0F] to-[#1A1A1A] rounded-xl border border-[#27272A] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00E054]/10">
              <Server className="text-[#00E054]" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Real-Time Machine Monitor</h2>
              <p className="text-sm text-gray-500">Live worker status from ViaBTC</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshMonitor}
            disabled={refreshing}
            className="border-[#27272A] hover:bg-[#27272A]"
          >
            <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
                  {machineMonitor.online_details.map((detail, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wifi size={14} className="text-[#00E054]" />
                        <div>
                          <span className="text-sm text-white font-medium">{detail.worker}</span>
                          <span className="text-xs text-[#00E054] ml-2">({detail.machines} machines)</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        detail.coin === 'LTC' ? 'bg-gray-700 text-gray-300' : 'bg-teal-900 text-teal-300'
                      }`}>{detail.coin}</span>
                    </div>
                  ))}
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
                  {machineMonitor.offline_details.map((detail, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <WifiOff size={14} className="text-[#EF4444]" />
                        <div>
                          <span className="text-sm text-white font-medium">{detail.machine_name || detail.worker}</span>
                          <span className="text-xs text-gray-500 ml-2">({detail.worker})</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        detail.coin === 'LTC' ? 'bg-gray-700 text-gray-300' : 'bg-teal-900 text-teal-300'
                      }`}>{detail.coin}</span>
                    </div>
                  ))}
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
    </div>
  );
};

export default Dashboard;
