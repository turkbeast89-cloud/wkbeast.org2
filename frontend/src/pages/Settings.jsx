import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { Save, RotateCcw, MessageSquare, CreditCard, Users, Cpu, DollarSign, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const SettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [machineTypes, setMachineTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchMachineTypes();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`);
      setSettings(res.data);
    } catch (e) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchMachineTypes = async () => {
    try {
      const res = await axios.get(`${API}/machine-types`);
      setMachineTypes(res.data);
    } catch (e) {
      console.error("Failed to load machine types", e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings);
      toast.success("Settings saved");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMachineType = async (mt) => {
    try {
      await axios.put(`${API}/machine-types/${mt.id}`, {
        name: mt.name,
        monthly_fee: mt.monthly_fee,
        daily_profit: mt.daily_profit || 0
      });
      toast.success(`Updated ${mt.name}`);
    } catch (e) {
      toast.error("Failed to update machine type");
    }
  };

  const updateMachineProfit = (id, value) => {
    setMachineTypes(machineTypes.map(mt => 
      mt.id === id ? { ...mt, daily_profit: parseFloat(value) || 0 } : mt
    ));
  };

  const handleReset = () => {
    setSettings({
      ...settings,
      message_template: `📢 Dear Valued Customer,

This is a kind reminder to please settle your hosting fees before the 2nd of each month, as we have major financial obligations to cover by that date.

Unlike other farms, we don't request payments 6 months in advance — but we kindly ask for your cooperation in making the payment on time each month.

🔹 {month} Hosting Fee: \${amount}
🔹 Payment Options:
• Whish: {whish}
• USDT (BEP20 Network): {usdt}

Thank you for your continued trust and support. Your timely payment helps us keep everything running smoothly.

Warm regards,
{team} 🐺💼`
    });
    toast.info("Message template reset to default");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="skeleton h-12 w-48 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your WhatsApp message template</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#00E054] text-black hover:bg-[#00E054]/90"
          data-testid="save-settings-btn"
        >
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Payment Options */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#00E054]/10">
            <CreditCard className="text-[#00E054]" size={20} />
          </div>
          <h2 className="text-lg font-bold text-white">Payment Options</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Whish Number</Label>
            <Input
              value={settings?.whish_number || ""}
              onChange={(e) => setSettings({ ...settings, whish_number: e.target.value })}
              className="bg-[#0A0A0A] border-[#27272A] mt-1"
              placeholder="03022005"
              data-testid="whish-input"
            />
          </div>
          <div>
            <Label>USDT Address (BEP20)</Label>
            <Input
              value={settings?.usdt_address || ""}
              onChange={(e) => setSettings({ ...settings, usdt_address: e.target.value })}
              className="bg-[#0A0A0A] border-[#27272A] mt-1 font-mono text-sm"
              placeholder="0x..."
              data-testid="usdt-input"
            />
          </div>
        </div>
      </div>

      {/* Team Info */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#7C3AED]/10">
            <Users className="text-[#7C3AED]" size={20} />
          </div>
          <h2 className="text-lg font-bold text-white">Team Info</h2>
        </div>
        
        <div>
          <Label>Team Name</Label>
          <Input
            value={settings?.team_name || ""}
            onChange={(e) => setSettings({ ...settings, team_name: e.target.value })}
            className="bg-[#0A0A0A] border-[#27272A] mt-1"
            placeholder="WKBeast Team"
            data-testid="team-name-input"
          />
        </div>
      </div>

      {/* Machine Types - Daily Profit */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/10">
              <Cpu className="text-[#F59E0B]" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Machine Profit Estimates</h2>
              <p className="text-xs text-gray-500">Daily profit per machine (from asicminervalue.com)</p>
            </div>
          </div>
          <a 
            href="https://www.asicminervalue.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-[#00C2FF] hover:underline flex items-center gap-1"
          >
            View Live Prices <ExternalLink size={12} />
          </a>
        </div>
        
        <div className="space-y-3">
          {machineTypes.map(mt => (
            <div key={mt.id} className="flex items-center gap-4 p-3 bg-[#0A0A0A] rounded-lg border border-[#27272A]">
              <div className="flex-1">
                <p className="text-white font-medium">{mt.name}</p>
                <p className="text-xs text-gray-500">Hosting: ${mt.monthly_fee}/mo</p>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-[#00E054]" />
                <Input
                  type="number"
                  step="0.01"
                  value={mt.daily_profit || 0}
                  onChange={(e) => updateMachineProfit(mt.id, e.target.value)}
                  className="w-24 bg-[#1A1A1A] border-[#27272A] text-right"
                  placeholder="0.00"
                />
                <span className="text-xs text-gray-500 w-12">/day</span>
                <Button 
                  size="sm" 
                  onClick={() => handleUpdateMachineType(mt)}
                  className="bg-[#00E054] text-black"
                >
                  Save
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-gray-500 mt-3">
          These values are shown to customers in their portal as "Estimated Monthly Earnings"
        </p>
      </div>

      {/* Message Template */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#25D366]/10">
              <MessageSquare className="text-[#25D366]" size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">Message Template</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="border-[#27272A] hover:bg-[#1A1A1A]"
            data-testid="reset-template-btn"
          >
            <RotateCcw size={14} className="mr-2" />
            Reset to Default
          </Button>
        </div>
        
        <div>
          <Label>WhatsApp Message</Label>
          <textarea
            value={settings?.message_template || ""}
            onChange={(e) => setSettings({ ...settings, message_template: e.target.value })}
            className="w-full mt-1 p-4 bg-[#0A0A0A] border border-[#27272A] rounded-lg text-white resize-none h-80 font-mono text-sm"
            placeholder="Enter your message template..."
            data-testid="message-template-input"
          />
          
          <div className="mt-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#27272A]">
            <p className="text-xs text-gray-400 mb-2">Available placeholders:</p>
            <div className="flex flex-wrap gap-2">
              {['{month}', '{amount}', '{whish}', '{usdt}', '{team}'].map(placeholder => (
                <code key={placeholder} className="px-2 py-1 bg-[#0A0A0A] rounded text-xs text-[#00E054]">
                  {placeholder}
                </code>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white mb-4">Message Preview</h2>
        <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#27272A] whitespace-pre-wrap text-sm">
          {settings?.message_template
            ?.replace('{month}', 'January 2026')
            .replace('{amount}', '300')
            .replace('{whish}', settings?.whish_number || '03022005')
            .replace('{usdt}', settings?.usdt_address || '0x...')
            .replace('{team}', settings?.team_name || 'WKBeast Team')
          }
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
