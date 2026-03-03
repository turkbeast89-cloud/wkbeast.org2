import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { 
  Send, ExternalLink, RefreshCw, Check, X, MessageSquare,
  Users, DollarSign, AlertCircle, ChevronLeft, ChevronRight, Calendar
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const WhatsAppSender = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [includePaid, setIncludePaid] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [sending, setSending] = useState(false);
  const [sentLog, setSentLog] = useState([]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/whatsapp/generate-links?month=${selectedMonth}&include_paid=${includePaid}`);
      setLinks(res.data);
      setSelectedLinks(res.data.map(l => l.customer_id));
    } catch (e) {
      toast.error("Failed to generate links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [selectedMonth, includePaid]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedLinks(links.map(l => l.customer_id));
    } else {
      setSelectedLinks([]);
    }
  };

  const handleSelectLink = (customerId, checked) => {
    if (checked) {
      setSelectedLinks([...selectedLinks, customerId]);
    } else {
      setSelectedLinks(selectedLinks.filter(id => id !== customerId));
    }
  };

  const handleSendBulk = async () => {
    const linksToSend = links.filter(l => selectedLinks.includes(l.customer_id));
    if (linksToSend.length === 0) {
      toast.error("Select at least one customer");
      return;
    }

    setSending(true);
    setSentLog([]);
    
    // Add initial log entry
    setSentLog(prev => [...prev, { 
      type: 'info', 
      message: `Starting bulk send to ${linksToSend.length} customers...` 
    }]);

    // Open tabs with delay
    for (let i = 0; i < linksToSend.length; i++) {
      const link = linksToSend[i];
      
      // Wait 1.5 seconds between each to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : 1500));
      
      try {
        window.open(link.link, '_blank');
        setSentLog(prev => [...prev, { 
          type: 'success', 
          message: `Opened chat for ${link.customer_name} ($${link.amount})` 
        }]);
      } catch (e) {
        setSentLog(prev => [...prev, { 
          type: 'error', 
          message: `Failed to open chat for ${link.customer_name}` 
        }]);
      }
    }

    setSentLog(prev => [...prev, { 
      type: 'info', 
      message: `Completed! ${linksToSend.length} WhatsApp tabs opened.` 
    }]);
    
    toast.success(`Opened ${linksToSend.length} WhatsApp chats`);
    setSending(false);
  };

  const handleSendSingle = (link) => {
    window.open(link.link, '_blank');
    toast.success(`Opened chat for ${link.customer_name}`);
    setSentLog(prev => [...prev, { 
      type: 'success', 
      message: `Opened chat for ${link.customer_name}` 
    }]);
  };

  const getMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

  const totalAmount = links.reduce((sum, l) => sum + l.amount, 0);
  const selectedAmount = links
    .filter(l => selectedLinks.includes(l.customer_id))
    .reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="whatsapp-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">WhatsApp Sender</h1>
          <p className="text-gray-500 mt-1">Send bulk payment reminders</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              className="border-[#27272A] hover:bg-[#1A1A1A]"
            >
              <ChevronLeft size={20} />
            </Button>
            
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48 bg-[#0A0A0A] border-[#27272A]" data-testid="whatsapp-month-select">
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
            >
              <ChevronRight size={20} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="includePaid"
              checked={includePaid}
              onCheckedChange={setIncludePaid}
              data-testid="include-paid-checkbox"
            />
            <label htmlFor="includePaid" className="text-sm text-gray-400 cursor-pointer">
              Include paid customers
            </label>
          </div>

          <Button
            onClick={fetchLinks}
            variant="outline"
            className="border-[#27272A] hover:bg-[#1A1A1A]"
            disabled={loading}
            data-testid="refresh-links-btn"
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#00C2FF]/10">
              <Users className="text-[#00C2FF]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Customers to Contact</p>
              <p className="text-xl font-bold text-white">{links.length}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#EF4444]/10">
              <DollarSign className="text-[#EF4444]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Pending</p>
              <p className="text-xl font-bold text-[#EF4444]">${totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#00E054]/10">
              <Check className="text-[#00E054]" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Selected ({selectedLinks.length})</p>
              <p className="text-xl font-bold text-[#00E054]">${selectedAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Send All Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="selectAll"
            checked={selectedLinks.length === links.length && links.length > 0}
            onCheckedChange={handleSelectAll}
            data-testid="select-all-checkbox"
          />
          <label htmlFor="selectAll" className="text-sm text-gray-400 cursor-pointer">
            Select all ({links.length})
          </label>
        </div>
        
        <Button
          onClick={handleSendBulk}
          disabled={sending || selectedLinks.length === 0}
          className="bg-[#25D366] text-white hover:bg-[#25D366]/90 neon-glow"
          style={{ '--tw-shadow-color': 'rgba(37, 211, 102, 0.3)' }}
          data-testid="send-bulk-btn"
        >
          <Send size={16} className="mr-2" />
          {sending ? 'Opening chats...' : `Send to ${selectedLinks.length} customers`}
        </Button>
      </div>

      {/* Customer List */}
      <div className="space-y-3">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </>
        ) : links.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">No customers to contact</h3>
            <p className="text-gray-500">
              {includePaid 
                ? "All customers have phone numbers missing"
                : "All payments are already marked as paid, or no phone numbers registered"}
            </p>
          </div>
        ) : (
          links.map((link, idx) => (
            <div 
              key={link.customer_id}
              className={`whatsapp-card animate-fadeIn ${
                selectedLinks.includes(link.customer_id) ? 'border-[#25D366]/50' : ''
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
              data-testid={`whatsapp-card-${link.customer_id}`}
            >
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedLinks.includes(link.customer_id)}
                  onCheckedChange={(checked) => handleSelectLink(link.customer_id, checked)}
                />
                <div className="flex-1">
                  <h3 className="font-medium text-white">{link.customer_name}</h3>
                  <p className="text-sm text-gray-500">{link.phone}</p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-lg font-mono text-[#EF4444]">${link.amount}</p>
                </div>
                <Button
                  onClick={() => handleSendSingle(link)}
                  className="bg-[#25D366] text-white hover:bg-[#25D366]/90"
                  data-testid={`send-single-${link.customer_id}`}
                >
                  <ExternalLink size={16} className="mr-2" />
                  Open Chat
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Send Log */}
      {sentLog.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Activity Log</h3>
          <div className="terminal-log">
            {sentLog.map((log, idx) => (
              <div key={idx} className={`log-entry log-${log.type}`}>
                <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                {' '}{log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card p-4 border-[#27272A]">
        <h3 className="text-sm font-medium text-white mb-2">How it works</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>1. Select the month for payment reminders</li>
          <li>2. Choose which customers to contact (unpaid by default)</li>
          <li>3. Click "Send to X customers" to open WhatsApp chats in new tabs</li>
          <li>4. Each tab will have the message pre-filled - just hit Send!</li>
          <li className="text-[#EAB308]">Note: Paused customers are automatically skipped</li>
        </ul>
      </div>
    </div>
  );
};

export default WhatsAppSender;
