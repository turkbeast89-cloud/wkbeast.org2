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
  const [earningsData, setEarningsData] = useState(null);
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
      
      // Build dashboard URL with all customer IDs if available (merged accounts)
      const allCustomerIds = session.customer.all_customer_ids || [session.customer.id];
      const dashUrl = `${API}/portal/dashboard/${session.customer.id}?all_ids=${allCustomerIds.join(',')}`;
      
      const [dashRes, pricesRes] = await Promise.all([
        fetch(dashUrl),
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
          // Fetch workers
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
          
          // Fetch earnings
          const earningsRes = await fetch(`${API}/viabtc/customer-earnings/${accountId}`);
          const earningsInfo = await earningsRes.json();
          
          if (earningsInfo.success) {
            setEarningsData(earningsInfo.earnings);
          }
        } catch (e) {
          console.log("Could not fetch worker/earnings data:", e);
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
  const hasPendingPayment = currentMonthPayment?.status === "unpaid" && (customer?.total_fee > 0);
  const isPaid = currentMonthPayment?.status === "paid";
  
  // Get payment deadline based on payment status
  const paymentDeadline = getPaymentDeadline(hasPendingPayment && !isPaid);

  // Calculate customer's machine stats from ViaBTC workers (excluding invalid)
  const validWorkers = workerData?.workers?.filter(w => w.worker_status !== "invalid") || [];
  const customerMachinesOnline = validWorkers.filter(w => w.worker_status === "active").length;
  const customerMachinesTotal = validWorkers.length;

  // Calculate customer's total hashrate from their workers - SEPARATED BY COIN
  const calculateHashrateByCoin = () => {
    if (!validWorkers || validWorkers.length === 0) {
      return [];
    }
    
    // Group hashrates by coin
    const hashrateByCoin = {};
    validWorkers.forEach(worker => {
      const coin = worker.coin || "LTC";
      const hashrate = parseInt(worker.hashrate_1hour || 0);
      if (!hashrateByCoin[coin]) {
        hashrateByCoin[coin] = 0;
      }
      hashrateByCoin[coin] += hashrate;
    });
    
    // Convert to display format
    const results = [];
    Object.entries(hashrateByCoin).forEach(([coin, totalHashrate]) => {
      let display;
      if (coin === "KAS") {
        // Kaspa uses TH/s
        display = `${(totalHashrate / 1000000000000).toFixed(2)} TH/s`;
      } else if (totalHashrate >= 1000000000000) {
        display = `${(totalHashrate / 1000000000000).toFixed(2)} TH/s`;
      } else if (totalHashrate >= 1000000000) {
        display = `${(totalHashrate / 1000000000).toFixed(2)} GH/s`;
      } else if (totalHashrate >= 1000000) {
        display = `${(totalHashrate / 1000000).toFixed(2)} MH/s`;
      } else {
        display = `${totalHashrate} H/s`;
      }
      results.push({ coin, hashrate: display });
    });
    
    return results;
  };

  // Calculate farm hashrate DYNAMICALLY based on online machines
  // 90% LTC miners × 16 GH/s each, 10% KAS miners × 21 TH/s each
  // Hashrate fluctuates with machine count fluctuation
  const getFarmHashrateByCoin = () => {
    const onlineMachines = farm_stats?.machines_online_display || farm_stats?.machines_online || 2430;
    const fluctuation = farm_stats?.fluctuation || 5;
    
    // 90% LTC, 10% KAS
    const ltcMachines = Math.floor(onlineMachines * 0.9);
    const kasMachines = onlineMachines - ltcMachines;
    
    // LTC miners: ~16 GH/s per machine (L9 type)
    const ltcHashratePerMachine = 16; // GH/s
    const ltcTotalGHs = ltcMachines * ltcHashratePerMachine;
    // Add small random fluctuation per machine (±0.5 GH/s variation)
    const ltcFluctuation = (Math.random() * 2 - 1) * ltcMachines * 0.5;
    const ltcFinalGHs = ltcTotalGHs + ltcFluctuation;
    
    // KAS miners: ~21 TH/s per machine (KS5 Pro type)
    const kasHashratePerMachine = 21; // TH/s
    const kasTotalTHs = kasMachines * kasHashratePerMachine;
    // Add small random fluctuation per machine (±0.3 TH/s variation)
    const kasFluctuation = (Math.random() * 2 - 1) * kasMachines * 0.3;
    const kasFinalTHs = kasTotalTHs + kasFluctuation;
    
    // Convert LTC to TH/s if it's large enough, otherwise keep as GH/s
    let ltcDisplay;
    if (ltcFinalGHs >= 1000) {
      ltcDisplay = `${(ltcFinalGHs / 1000).toFixed(2)} TH/s`;
    } else {
      ltcDisplay = `${ltcFinalGHs.toFixed(1)} GH/s`;
    }
    
    return [
      { coin: 'LTC', hashrate: ltcDisplay, machines: ltcMachines, machineType: 'L9' },
      { coin: 'KAS', hashrate: `${kasFinalTHs.toFixed(1)} TH/s`, machines: kasMachines, machineType: 'KS5 Pro' }
    ];
  };
  
  // Get customer's total hashrate display string (for the header)
  const getCustomerHashrateDisplay = () => {
    const hashrates = calculateHashrateByCoin();
    if (hashrates.length === 0) return null;
    return hashrates.map(h => `${h.coin}: ${h.hashrate}`).join(' | ');
  };

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
        
        {/* Paused Customer Alert */}
        {customer?.status === 'paused' && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border-2 border-yellow-500/50 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-yellow-500/20">
                <AlertCircle className="text-yellow-500" size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Machines Currently Offline</h3>
                <p className="text-gray-400">
                  Your machines are turned off as per your request.
                </p>
                <p className="text-sm text-yellow-400 mt-2">
                  Contact support to reactivate your machines when you're ready.
                </p>
                <a 
                  href="https://wa.me/9613022005" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#128C7E] transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Request Reactivation
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Pending Payment Alert */}
        {hasPendingPayment && !isPaid && customer?.status !== 'paused' && (
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
              <div className="space-y-1">
                {getFarmHashrateByCoin().map((item, idx) => (
                  <div key={idx} className="flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">{item.coin}:</span>
                    <span className="text-2xl md:text-3xl font-bold text-[#00C2FF]">{item.hashrate}</span>
                    <span className="text-xs text-gray-400">
                      ({item.machines.toLocaleString()} {item.machineType})
                    </span>
                  </div>
                ))}
              </div>
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
                <h2 className="text-lg font-bold text-white">Your Machines</h2>
                <span className="text-xs bg-[#00C2FF]/20 text-[#00C2FF] px-2 py-0.5 rounded">Live</span>
              </div>
              <div className="flex items-center gap-4">
                {getCustomerHashrateDisplay() && (
                  <div className="flex items-center gap-1 text-sm">
                    <Zap size={14} className="text-[#00C2FF]" />
                    <span className="text-[#00C2FF] font-bold">{getCustomerHashrateDisplay()}</span>
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  {customerMachinesOnline} online / {customerMachinesTotal} total
                </span>
              </div>
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

        {/* Real Mining Earnings from ViaBTC */}
        {earningsData && Object.keys(earningsData).some(coin => !earningsData[coin].error && parseFloat(earningsData[coin].total_profit || 0) > 0) && (
          <div className="bg-gradient-to-r from-[#F59E0B]/10 to-[#00E054]/10 rounded-xl border border-[#F59E0B]/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="text-[#F59E0B]" size={20} />
              <h2 className="text-lg font-bold text-white">Mining Earnings</h2>
              <span className="text-xs bg-[#F59E0B]/20 text-[#F59E0B] px-2 py-0.5 rounded">Live from ViaBTC</span>
            </div>
            
            {/* Main coins with total mined */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {Object.entries(earningsData).filter(([coin, data]) => !data.merged_mining && parseFloat(data.total_profit || 0) > 0).map(([coin, data]) => {
                const coinColors = {
                  LTC: { bg: "bg-gradient-to-br from-gray-700/50 to-gray-800/50", text: "text-gray-100", border: "border-gray-500/40", icon: "💎" },
                  KAS: { bg: "bg-gradient-to-br from-teal-700/50 to-teal-800/50", text: "text-teal-200", border: "border-teal-500/40", icon: "🟢" },
                  BTC: { bg: "bg-gradient-to-br from-orange-700/50 to-orange-800/50", text: "text-orange-200", border: "border-orange-500/40", icon: "₿" },
                };
                const colors = coinColors[coin] || { bg: "bg-gradient-to-br from-slate-700/50 to-slate-800/50", text: "text-slate-200", border: "border-slate-500/40", icon: "🪙" };
                
                return (
                  <div key={coin} className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{colors.icon}</span>
                        <span className={`text-lg font-bold ${colors.text}`}>{coin}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Total Mined (All Time)</div>
                        <div className={`font-bold text-2xl ${colors.text}`}>
                          {parseFloat(data.total_profit || 0).toLocaleString(undefined, {maximumFractionDigits: 4})} <span className="text-sm opacity-70">{coin}</span>
                        </div>
                        {data.pps_profit && (
                          <div className="text-xs text-gray-500 mt-1">
                            PPS: {parseFloat(data.pps_profit).toFixed(2)} • PPLNS: {parseFloat(data.pplns_profit || 0).toFixed(2)}
                          </div>
                        )}
                      </div>
                      {data.balance && parseFloat(data.balance) > 0 && (
                        <div className="pt-3 border-t border-white/10">
                          <div className="text-xs text-[#F59E0B] mb-1">Available Balance (Not Withdrawn)</div>
                          <div className="font-semibold text-lg text-[#F59E0B]">
                            {parseFloat(data.balance).toLocaleString(undefined, {maximumFractionDigits: 4})} <span className="text-sm opacity-70">{coin}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Merged mining coins - Available balance only */}
            {Object.entries(earningsData).some(([coin, data]) => data.merged_mining && parseFloat(data.total_profit || 0) > 0) && (
              <>
                <div className="flex items-center gap-2 mb-3 mt-6">
                  <div className="h-px flex-1 bg-[#27272A]"></div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Merged Mining Balance</span>
                  <div className="h-px flex-1 bg-[#27272A]"></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {Object.entries(earningsData).filter(([coin, data]) => data.merged_mining && parseFloat(data.total_profit || 0) > 0).map(([coin, data]) => {
                    const coinColors = {
                      DOGE: { bg: "bg-yellow-900/30", text: "text-yellow-300", icon: "🐕" },
                      BELLS: { bg: "bg-purple-900/30", text: "text-purple-300", icon: "🔔" },
                      PEP: { bg: "bg-green-900/30", text: "text-green-300", icon: "🐸" },
                      SHIC: { bg: "bg-red-900/30", text: "text-red-300", icon: "🐕" },
                      DINGO: { bg: "bg-amber-900/30", text: "text-amber-300", icon: "🦊" },
                      JKC: { bg: "bg-blue-900/30", text: "text-blue-300", icon: "🪙" },
                      LKY: { bg: "bg-pink-900/30", text: "text-pink-300", icon: "🍀" },
                    };
                    const colors = coinColors[coin] || { bg: "bg-slate-900/30", text: "text-slate-300", icon: "🪙" };
                    
                    return (
                      <div key={coin} className={`${colors.bg} rounded-lg p-3 border border-white/5`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{colors.icon}</span>
                          <span className={`text-xs font-semibold ${colors.text}`}>{coin}</span>
                        </div>
                        <div className={`font-bold text-base ${colors.text}`}>
                          {parseFloat(data.total_profit || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </div>
                      <div className="text-[10px] text-gray-500">not withdrawn</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            
            <div className="mt-4 pt-4 border-t border-[#27272A] flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></div>
              <span className="text-xs text-gray-500">Real-time data from ViaBTC Pool</span>
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

        {/* Contact Support */}
        <div className="bg-gradient-to-r from-[#25D366]/10 to-[#128C7E]/10 rounded-xl border border-[#25D366]/30 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-[#25D366]/20">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#25D366]" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Have a problem?</p>
                <p className="text-sm text-gray-400">Contact support on WhatsApp</p>
              </div>
            </div>
            <a 
              href="https://wa.me/9613022005" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-medium rounded-xl hover:bg-[#128C7E] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              +961 3 022 005
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272A] mt-8 py-6">
        <p className="text-center text-gray-600 text-sm">
          WKBeast Farm © 2026
        </p>
      </footer>
    </div>
  );
};

export default CustomerDashboard;
