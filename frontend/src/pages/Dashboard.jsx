import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { 
  DollarSign, TrendingUp, Users, Cpu, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Pause
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from "recharts";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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
    </div>
  );
};

export default Dashboard;
