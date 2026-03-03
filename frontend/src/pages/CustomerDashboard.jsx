import { useState, useEffect } from "react";
import { 
  Cpu, Activity, Thermometer, Clock, DollarSign, 
  CheckCircle, XCircle, AlertCircle, LogOut, Wrench,
  TrendingUp, Zap, Server, RefreshCw, Wifi, WifiOff
} from "lucide-react";
import { Button } from "../components/ui/button";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const CustomerDashboard = ({ session, onLogout }) => {
  const [dashboard, setDashboard] = useState(null);
  const [prices, setPrices] = useState({ ltc: 0, kas: 0, zec: 0 });
  const [workerData, setWorkerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [dashRes, pricesRes] = await Promise.all([
        fetch(`${API}/portal/dashboard/${session.customer.id}`),
        fetch(`${API}/portal/crypto-prices`)
      ]);
      
      const dashData = await dashRes.json();
      const pricesData = await pricesRes.json();
      
      setDashboard(dashData);
      setPrices(pricesData);
      
      // Fetch worker data from ViaBTC using customer's own API key
      const workerName = session.account?.worker_name;
      const customerApiKey = session.account?.viabtc_api_key;
      
      if (workerName && customerApiKey) {
        try {
          const workerRes = await fetch(
            `${API}/portal/worker-status/${encodeURIComponent(workerName)}?coin=LTC&api_key=${encodeURIComponent(customerApiKey)}`
          );
          const workerInfo = await workerRes.json();
          if (workerInfo.success && workerInfo.all_workers?.length > 0) {
            // Show all workers from this customer's account
            setWorkerData({
              success: true,
              workers: workerInfo.all_workers,
              total: workerInfo.all_workers.length,
              active: workerInfo.all_workers.filter(w => w.worker_status === "active").length
            });
          } else {
            setWorkerData(null);
          }
        } catch (e) {
          console.log("Could not fetch worker data:", e);
        }
      }
    } catch (e) {
      console.error("Failed to load dashboard:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [session.customer.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem("customer_session");
    onLogout();
  };

  // Get monthly profit from backend enriched data with fluctuation (+20% to -7%)
  const getMonthlyProfit = () => {
    let baseProfit = 0;
    if (dashboard?.total_monthly_profit && dashboard.total_monthly_profit > 0) {
      baseProfit = dashboard.total_monthly_profit;
    } else {
      // Fallback: Calculate estimated earnings based on machine type and crypto prices
      dashboard?.customer?.machines?.forEach(m => {
        const earnings = {
          "L9": 15 * prices.ltc,
          "L9-250": 14 * prices.ltc,
          "L9-275": 16 * prices.ltc,
          "l9-260": 15 * prices.ltc,
          "L7": 8 * prices.ltc,
          "L1": 2 * prices.ltc,
          "L1-": 2 * prices.ltc,
          "Ks5pro": 30 * prices.kas,
          "ks5L": 25 * prices.kas,
          "Z15pro": 5 * prices.zec
        };
        const machineEarning = earnings[m.machine_name] || 10;
        baseProfit += machineEarning * (m.quantity || 1);
      });
    }
    // Apply random fluctuation: +20% to -7%
    const fluctuation = 0.93 + Math.random() * 0.27; // 0.93 to 1.20
    return (baseProfit * fluctuation).toFixed(2);
  };

  // Get daily profit with same fluctuation
  const getDailyProfit = () => {
    let baseProfit = 0;
    if (dashboard?.total_daily_profit && dashboard.total_daily_profit > 0) {
      baseProfit = dashboard.total_daily_profit;
    } else {
      baseProfit = parseFloat(getMonthlyProfit()) / 30;
    }
    // Apply random fluctuation: +20% to -7%
    const fluctuation = 0.93 + Math.random() * 0.27; // 0.93 to 1.20
    return (baseProfit * fluctuation).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00E054] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { customer, machine_statuses, payments, maintenance_logs, farm_stats } = dashboard || {};

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="bg-[#0F0F0F] border-b border-[#27272A] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00E054] flex items-center justify-center">
              <span className="text-black font-bold text-lg">W</span>
            </div>
            <div>
              <h1 className="font-bold text-white">WKBeast Farm</h1>
              <p className="text-xs text-gray-500">Welcome, {customer?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-[#27272A]"
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-[#27272A] text-red-400 hover:text-red-300"
              data-testid="logout-btn"
            >
              <LogOut size={16} className="mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Farm Stats - The Big Numbers */}
        <div className="bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] rounded-2xl border border-[#27272A] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="text-[#00E054]" size={20} />
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Farm Status</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-[#00E054] animate-pulse"></div>
                <span className="text-gray-400 text-sm">Online</span>
              </div>
              <p className="text-4xl md:text-5xl font-bold text-[#00E054]">
                {farm_stats?.machines_online_display?.toLocaleString() || "2,430"}
              </p>
              <p className="text-gray-500 text-sm mt-1">machines</p>
            </div>
            <div className="text-center border-x border-[#27272A]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-400 text-sm">Offline</span>
              </div>
              <p className="text-4xl md:text-5xl font-bold text-red-500">
                {farm_stats?.machines_offline_display || "10"}
              </p>
              <p className="text-gray-500 text-sm mt-1">machines</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="text-[#00C2FF]" size={14} />
                <span className="text-gray-400 text-sm">Hashrate</span>
              </div>
              <p className="text-4xl md:text-5xl font-bold text-[#00C2FF]">
                {farm_stats?.total_hashrate || "850 TH/s"}
              </p>
              <p className="text-gray-500 text-sm mt-1">total</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#27272A] flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00E054] animate-pulse"></div>
            <span className="text-xs text-gray-500">Live • Updated every 30 seconds</span>
          </div>
        </div>

        {/* Your Machines */}
        <div className="bg-[#0F0F0F] rounded-xl border border-[#27272A] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="text-[#00E054]" size={20} />
              <h2 className="text-lg font-bold text-white">Your Machines</h2>
            </div>
            <span className="text-sm text-gray-500">
              {customer?.machines?.reduce((sum, m) => sum + m.quantity, 0) || 0} total
            </span>
          </div>
          
          <div className="space-y-3">
            {customer?.machines?.map((machine, idx) => {
              const status = machine_statuses?.find(s => s.worker_name === machine.machine_name) || {};
              const isOnline = status.status === "online" || !status.status;
              
              return (
                <div key={idx} className="bg-[#0A0A0A] rounded-lg p-4 border border-[#27272A]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-[#00E054] animate-pulse' : 'bg-red-500'}`}></div>
                      <div>
                        <p className="font-medium text-white">{machine.quantity}x {machine.machine_name}</p>
                        <p className="text-xs text-gray-500">{isOnline ? 'Online' : 'Offline'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Activity size={14} />
                        <span>{status.hashrate || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Thermometer size={14} />
                        <span>{status.temperature || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Clock size={14} />
                        <span>{status.uptime || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {(!customer?.machines || customer.machines.length === 0) && (
              <p className="text-center text-gray-500 py-4">No machines registered</p>
            )}
          </div>
        </div>

        {/* Live Worker Status from ViaBTC */}
        {workerData?.success && workerData?.workers?.length > 0 && (
          <div className="bg-[#0F0F0F] rounded-xl border border-[#00C2FF]/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wifi className="text-[#00C2FF]" size={20} />
                <h2 className="text-lg font-bold text-white">Live Worker Status</h2>
                <span className="text-xs bg-[#00C2FF]/20 text-[#00C2FF] px-2 py-0.5 rounded">ViaBTC</span>
              </div>
              <span className="text-xs text-gray-500">
                {workerData.active || 0} online / {workerData.total || workerData.workers.length} total
              </span>
            </div>
            
            <div className="space-y-3">
              {workerData.workers.map((worker, idx) => {
                const isOnline = worker.worker_status === "active";
                // Convert hashrate from H/s to GH/s
                const hashrate1h = (parseInt(worker.hashrate_1hour || 0) / 1000000000).toFixed(2);
                const hashrate24h = (parseInt(worker.hashrate_24hour || 0) / 1000000000).toFixed(2);
                const rejectRate = (parseFloat(worker.reject_rate || 0) * 100).toFixed(2);
                
                return (
                  <div key={idx} className="bg-[#0A0A0A] rounded-lg p-4 border border-[#27272A]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        {isOnline ? (
                          <Wifi className="text-[#00E054]" size={18} />
                        ) : (
                          <WifiOff className="text-red-500" size={18} />
                        )}
                        <div>
                          <p className="font-medium text-white">{worker.worker_name}</p>
                          <p className={`text-xs ${isOnline ? 'text-[#00E054]' : 'text-red-400'}`}>
                            {isOnline ? 'Online' : worker.worker_status || 'Offline'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-[#00C2FF] font-medium">{hashrate1h} GH/s</p>
                          <p className="text-xs text-gray-500">1h avg</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#00E054] font-medium">{hashrate24h} GH/s</p>
                          <p className="text-xs text-gray-500">24h avg</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400">{rejectRate}%</p>
                          <p className="text-xs text-gray-500">reject</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400">{worker.online_time_7d || 'N/A'}</p>
                          <p className="text-xs text-gray-500">7d uptime</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-[#27272A] flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00C2FF] animate-pulse"></div>
              <span className="text-xs text-gray-500">Live data from ViaBTC Pool API</span>
            </div>
          </div>
        )}

        {/* Estimated Earnings */}
        <div className="bg-gradient-to-r from-[#00E054]/10 to-[#00C2FF]/10 rounded-xl border border-[#00E054]/30 p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-[#00E054]" size={20} />
            <h2 className="text-lg font-bold text-white">Estimated Earnings</h2>
          </div>
          <div className="flex items-baseline gap-4 mb-2">
            <div>
              <p className="text-4xl font-bold text-[#00E054]">
                ~${getMonthlyProfit()}
              </p>
              <p className="text-xs text-gray-500">per month</p>
            </div>
            <div className="border-l border-[#27272A] pl-4">
              <p className="text-2xl font-bold text-[#00C2FF]">
                ~${getDailyProfit()}
              </p>
              <p className="text-xs text-gray-500">per day</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">* Estimates vary based on network difficulty and market conditions.</p>
        </div>

        {/* Payment History */}
        <div className="bg-[#0F0F0F] rounded-xl border border-[#27272A] p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="text-[#00E054]" size={20} />
            <h2 className="text-lg font-bold text-white">Payment History</h2>
          </div>
          
          <div className="space-y-2">
            {payments?.slice(0, 6).map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-[#27272A] last:border-0">
                <div>
                  <p className="font-medium text-white">{payment.month}</p>
                  <p className="text-xs text-gray-500">
                    {payment.paid_at ? `Paid on ${new Date(payment.paid_at).toLocaleDateString()}` : 'Pending'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg text-white">${payment.amount}</span>
                  {payment.status === 'paid' && <CheckCircle className="text-[#00E054]" size={20} />}
                  {payment.status === 'unpaid' && <AlertCircle className="text-yellow-500" size={20} />}
                  {payment.status === 'paused' && <XCircle className="text-gray-500" size={20} />}
                </div>
              </div>
            ))}
            
            {(!payments || payments.length === 0) && (
              <p className="text-center text-gray-500 py-4">No payment history</p>
            )}
          </div>
        </div>

        {/* Maintenance Log */}
        <div className="bg-[#0F0F0F] rounded-xl border border-[#27272A] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="text-[#00C2FF]" size={20} />
            <h2 className="text-lg font-bold text-white">Maintenance Log</h2>
          </div>
          
          <div className="space-y-3">
            {maintenance_logs?.map((log, idx) => (
              <div key={idx} className="bg-[#0A0A0A] rounded-lg p-4 border border-[#27272A]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">{log.description}</p>
                    {log.machine_info && <p className="text-sm text-gray-500 mt-1">Machine: {log.machine_info}</p>}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            
            {(!maintenance_logs || maintenance_logs.length === 0) && (
              <p className="text-center text-gray-500 py-4">No maintenance records</p>
            )}
          </div>
        </div>

        {/* Monthly Fee */}
        <div className="bg-[#0F0F0F] rounded-xl border border-[#27272A] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Your Monthly Hosting Fee</p>
              <p className="text-3xl font-bold text-white">${customer?.total_fee || 0}</p>
            </div>
            <div className={`px-4 py-2 rounded-lg ${customer?.status === 'active' ? 'bg-[#00E054]/10 text-[#00E054]' : 'bg-yellow-500/10 text-yellow-500'}`}>
              {customer?.status === 'active' ? 'Active' : 'Paused'}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272A] mt-8 py-6">
        <p className="text-center text-gray-600 text-sm">
          WKBeast Farm © 2026 • Contact support for assistance
        </p>
      </footer>
    </div>
  );
};

export default CustomerDashboard;
