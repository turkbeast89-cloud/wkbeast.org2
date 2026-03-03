import { useState, useEffect } from "react";
import { 
  Cpu, Activity, Thermometer, Clock, DollarSign, 
  CheckCircle, XCircle, AlertCircle, LogOut, Wrench,
  TrendingUp, Zap, Server, RefreshCw, Wifi, WifiOff,
  AlertTriangle, Timer
} from "lucide-react";
import { Button } from "../components/ui/button";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Countdown timer component
const PaymentCountdown = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = deadline - now;
      
      if (diff <= 0) {
        setIsOverdue(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setIsOverdue(false);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (isOverdue) {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <AlertTriangle size={16} className="animate-pulse" />
        <span className="font-bold">OVERDUE - Machine may go offline!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Timer size={16} className="text-[#F59E0B]" />
      <div className="flex gap-2">
        <div className="bg-[#0A0A0A] px-2 py-1 rounded">
          <span className="text-xl font-bold text-white">{timeLeft.days}</span>
          <span className="text-xs text-gray-500 ml-1">d</span>
        </div>
        <div className="bg-[#0A0A0A] px-2 py-1 rounded">
          <span className="text-xl font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-xs text-gray-500 ml-1">h</span>
        </div>
        <div className="bg-[#0A0A0A] px-2 py-1 rounded">
          <span className="text-xl font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-xs text-gray-500 ml-1">m</span>
        </div>
        <div className="bg-[#0A0A0A] px-2 py-1 rounded">
          <span className="text-xl font-bold text-[#F59E0B]">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-xs text-gray-500 ml-1">s</span>
        </div>
      </div>
    </div>
  );
};

// Get next payment deadline (2nd of current/next month at 12:00)
const getPaymentDeadline = (hasPendingPayment) => {
  const now = new Date();
  const currentMonthDeadline = new Date(now.getFullYear(), now.getMonth(), 2, 12, 0, 0);
  
  // If payment is pending and we're past the 2nd, they're overdue
  if (hasPendingPayment && now > currentMonthDeadline) {
    return currentMonthDeadline; // Return past deadline to show OVERDUE
  }
  
  // If we're before the 2nd, deadline is this month
  if (now < currentMonthDeadline) {
    return currentMonthDeadline;
  }
  
  // Otherwise, deadline is next month's 2nd
  return new Date(now.getFullYear(), now.getMonth() + 1, 2, 12, 0, 0);
};

const CustomerDashboard = ({ session, onLogout }) => {
  const [dashboard, setDashboard] = useState(null);
  const [prices, setPrices] = useState({ ltc: 0, kas: 0, zec: 0 });
  const [workerData, setWorkerData] = useState(null);
  const [accountData, setAccountData] = useState(session.account);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // First, refresh account data to get latest API key
      const accountRes = await fetch(`${API}/customer-accounts`);
      const allAccounts = await accountRes.json();
      const freshAccount = allAccounts.find(a => a.id === session.account?.id);
      if (freshAccount) {
        setAccountData(freshAccount);
        // Update localStorage with fresh data
        const updatedSession = { ...session, account: freshAccount };
        localStorage.setItem("customer_session", JSON.stringify(updatedSession));
      }
      
      const [dashRes, pricesRes] = await Promise.all([
        fetch(`${API}/portal/dashboard/${session.customer.id}`),
        fetch(`${API}/portal/crypto-prices`)
      ]);
      
      const dashData = await dashRes.json();
      const pricesData = await pricesRes.json();
      
      setDashboard(dashData);
      setPrices(pricesData);
      
      // Fetch workers using customer's own API key (use fresh account data)
      const accountId = freshAccount?.id || session.account?.id;
      const hasApiKey = freshAccount?.viabtc_api_key || session.account?.viabtc_api_key;
      
      if (accountId && hasApiKey) {
        try {
          const workerRes = await fetch(`${API}/viabtc/customer-workers/${accountId}`);
          const workerInfo = await workerRes.json();
          
          if (workerInfo.success && workerInfo.workers?.length > 0) {
            setWorkerData({
              success: true,
              workers: workerInfo.workers,
              total: workerInfo.total,
              active: workerInfo.active
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

  // Check for pending payment this month
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g., "2026-03"
  const currentMonthPayment = payments?.find(p => p.month === currentMonth);
  const hasPendingPayment = currentMonthPayment?.status === "unpaid" || !currentMonthPayment;
  const isPaid = currentMonthPayment?.status === "paid";
  
  // Get payment deadline based on payment status
  const paymentDeadline = getPaymentDeadline(hasPendingPayment && !isPaid);

  // Calculate customer's machine stats from ViaBTC workers (excluding invalid)
  const validWorkers = workerData?.workers?.filter(w => w.worker_status !== "invalid") || [];
  const customerMachinesOnline = validWorkers.filter(w => w.worker_status === "active").length;
  const customerMachinesTotal = validWorkers.length;

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
          <div className="flex items-center gap-4">
            {/* Customer's machines status */}
            {workerData?.success && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#0A0A0A] rounded-lg border border-[#27272A]">
                <div className={`w-2 h-2 rounded-full ${customerMachinesOnline > 0 ? 'bg-[#00E054] animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm">
                  <span className="text-[#00E054] font-bold">{customerMachinesOnline}</span>
                  <span className="text-gray-500"> / {customerMachinesTotal} machines</span>
                </span>
              </div>
            )}
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
        
        {/* Pending Payment Alert */}
        {hasPendingPayment && !isPaid && (
          <div className="bg-gradient-to-r from-red-500/20 to-[#F59E0B]/20 rounded-xl border-2 border-red-500/50 p-6 animate-pulse-slow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-red-500/20">
                  <AlertTriangle className="text-red-500" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Payment Required</h3>
                  <p className="text-gray-400">
                    Your hosting fee of <span className="text-[#00E054] font-bold">${customer?.total_fee || 0}</span> is due for {currentMonth}
                  </p>
                  <p className="text-sm text-red-400 mt-1">
                    Pay before the deadline or your machines will go offline
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Deadline: 2nd at 12:00</p>
                <PaymentCountdown deadline={paymentDeadline} />
              </div>
            </div>
          </div>
        )}

        {/* Payment Confirmed */}
        {isPaid && (
          <div className="bg-gradient-to-r from-[#00E054]/10 to-[#00C2FF]/10 rounded-xl border border-[#00E054]/30 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-[#00E054]" size={24} />
              <div>
                <p className="text-white font-medium">Payment Confirmed for {currentMonth}</p>
                <p className="text-sm text-gray-500">Thank you! Your machines are secured.</p>
              </div>
            </div>
          </div>
        )}

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
                {workerData.active || 0} online / {workerData.workers.filter(w => w.worker_status !== "invalid").length} total
              </span>
            </div>
            
            <div className="space-y-3">
              {workerData.workers
                .filter(w => w.worker_status !== "invalid") // Hide invalid workers
                .map((worker, idx) => {
                const isOnline = worker.worker_status === "active";
                // Convert hashrate from H/s to appropriate unit based on coin
                const coin = worker.coin || "LTC";
                let hashrate1h, hashrate24h, unit;
                
                if (coin === "KAS") {
                  // Kaspa uses TH/s
                  hashrate1h = (parseInt(worker.hashrate_1hour || 0) / 1000000000000).toFixed(2);
                  hashrate24h = (parseInt(worker.hashrate_24hour || 0) / 1000000000000).toFixed(2);
                  unit = "TH/s";
                } else {
                  // LTC, DOGE use GH/s
                  hashrate1h = (parseInt(worker.hashrate_1hour || 0) / 1000000000).toFixed(2);
                  hashrate24h = (parseInt(worker.hashrate_24hour || 0) / 1000000000).toFixed(2);
                  unit = "GH/s";
                }
                
                const rejectRate = (parseFloat(worker.reject_rate || 0) * 100).toFixed(2);
                
                // Coin colors
                const coinColors = {
                  LTC: "bg-gray-500",
                  KAS: "bg-green-500",
                  ZEC: "bg-yellow-500",
                  BTC: "bg-orange-500",
                  DOGE: "bg-amber-400"
                };
                
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{worker.worker_name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${coinColors[coin] || "bg-gray-500"} text-white font-bold`}>
                              {coin}
                            </span>
                          </div>
                          <p className={`text-xs ${isOnline ? 'text-[#00E054]' : 'text-red-400'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-[#00C2FF] font-medium">{hashrate1h} {unit}</p>
                          <p className="text-xs text-gray-500">1h avg</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#00E054] font-medium">{hashrate24h} {unit}</p>
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
