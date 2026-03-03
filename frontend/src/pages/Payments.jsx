import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { 
  Calendar, RefreshCw, Check, X, Pause, ChevronLeft, ChevronRight,
  DollarSign, Users, AlertCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      const [paymentsRes, customersRes] = await Promise.all([
        axios.get(`${API}/payments?month=${selectedMonth}`),
        axios.get(`${API}/customers`)
      ]);
      setPayments(paymentsRes.data);
      setCustomers(customersRes.data);
    } catch (e) {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayments = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/payments/generate?month=${selectedMonth}`);
      toast.success(res.data.message);
      fetchData();
    } catch (e) {
      toast.error("Failed to generate payments");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (paymentId, status) => {
    try {
      await axios.put(`${API}/payments/${paymentId}`, { status });
      toast.success(`Payment marked as ${status}`);
      fetchData();
    } catch (e) {
      toast.error("Failed to update payment");
    }
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const getMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Calculate stats
  const stats = {
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    paid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    unpaid: payments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0),
    paused: payments.filter(p => p.status === 'paused').reduce((sum, p) => sum + p.amount, 0),
    paidCount: payments.filter(p => p.status === 'paid').length,
    unpaidCount: payments.filter(p => p.status === 'unpaid').length,
    pausedCount: payments.filter(p => p.status === 'paused').length,
  };

  // Months for select
  const months = [];
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      value,
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="skeleton h-20 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="payments-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Payments</h1>
          <p className="text-gray-500 mt-1">Track monthly customer payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            className="border-[#27272A] hover:bg-[#1A1A1A]"
            data-testid="prev-month-btn"
          >
            <ChevronLeft size={20} />
          </Button>
          
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48 bg-[#0A0A0A] border-[#27272A]" data-testid="month-select">
              <Calendar size={16} className="mr-2" />
              <SelectValue>{getMonthName(selectedMonth)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#0F0F0F] border-[#27272A]">
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="border-[#27272A] hover:bg-[#1A1A1A]"
            data-testid="next-month-btn"
          >
            <ChevronRight size={20} />
          </Button>

          <Button
            onClick={handleGeneratePayments}
            disabled={generating}
            className="bg-[#00E054] text-black hover:bg-[#00E054]/90 ml-2"
            data-testid="generate-payments-btn"
          >
            <RefreshCw size={16} className={`mr-2 ${generating ? 'animate-spin' : ''}`} />
            Generate
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#7C3AED]/10">
              <DollarSign className="text-[#7C3AED]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Expected</p>
              <p className="text-xl font-bold text-white">${stats.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#00E054]/10">
              <Check className="text-[#00E054]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Paid ({stats.paidCount})</p>
              <p className="text-xl font-bold text-[#00E054]">${stats.paid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#EF4444]/10">
              <AlertCircle className="text-[#EF4444]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Unpaid ({stats.unpaidCount})</p>
              <p className="text-xl font-bold text-[#EF4444]">${stats.unpaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#EAB308]/10">
              <Pause className="text-[#EAB308]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Paused ({stats.pausedCount})</p>
              <p className="text-xl font-bold text-[#EAB308]">${stats.paused.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No payments for {getMonthName(selectedMonth)}</p>
                    <p className="text-sm mt-1">Click "Generate" to create payment records</p>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const customer = customers.find(c => c.id === payment.customer_id);
                  return (
                    <tr key={payment.id} className="table-row" data-testid={`payment-row-${payment.id}`}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-white">{payment.customer_name}</p>
                          {customer?.phone && (
                            <p className="text-xs text-gray-500">{customer.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-lg">${payment.amount}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'paid' ? 'status-paid' :
                          payment.status === 'unpaid' ? 'status-unpaid' :
                          'status-paused'
                        }`}>
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant={payment.status === 'paid' ? 'default' : 'outline'}
                            onClick={() => handleUpdateStatus(payment.id, 'paid')}
                            className={payment.status === 'paid' 
                              ? 'bg-[#00E054] text-black hover:bg-[#00E054]/90' 
                              : 'border-[#00E054] text-[#00E054] hover:bg-[#00E054]/10'
                            }
                            data-testid={`mark-paid-${payment.id}`}
                          >
                            <Check size={14} className="mr-1" />
                            Paid
                          </Button>
                          <Button
                            size="sm"
                            variant={payment.status === 'unpaid' ? 'default' : 'outline'}
                            onClick={() => handleUpdateStatus(payment.id, 'unpaid')}
                            className={payment.status === 'unpaid'
                              ? 'bg-[#EF4444] text-white hover:bg-[#EF4444]/90'
                              : 'border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10'
                            }
                            data-testid={`mark-unpaid-${payment.id}`}
                          >
                            <X size={14} className="mr-1" />
                            Unpaid
                          </Button>
                          <Button
                            size="sm"
                            variant={payment.status === 'paused' ? 'default' : 'outline'}
                            onClick={() => handleUpdateStatus(payment.id, 'paused')}
                            className={payment.status === 'paused'
                              ? 'bg-[#EAB308] text-black hover:bg-[#EAB308]/90'
                              : 'border-[#EAB308] text-[#EAB308] hover:bg-[#EAB308]/10'
                            }
                            data-testid={`mark-paused-${payment.id}`}
                          >
                            <Pause size={14} className="mr-1" />
                            Paused
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payments;
