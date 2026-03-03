import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";
import { 
  Plus, Edit2, Trash2, Search, Download, Upload, X, 
  Cpu, Phone, DollarSign, Pause, Play, ChevronDown, Users
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [machineTypes, setMachineTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingMachine, setEditingMachine] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    machines: [],
    total_cost: 0,
    status: "active",
    prepaid_months: 0,
    notes: ""
  });

  // Machine form state
  const [machineForm, setMachineForm] = useState({
    name: "",
    monthly_fee: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, machinesRes] = await Promise.all([
        axios.get(`${API}/customers`),
        axios.get(`${API}/machine-types`)
      ]);
      setCustomers(customersRes.data);
      setMachineTypes(machinesRes.data);
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setForm({
      name: "",
      phone: "",
      machines: [],
      total_cost: 0,
      status: "active",
      prepaid_months: 0,
      notes: ""
    });
    setShowModal(true);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || "",
      machines: customer.machines || [],
      total_cost: customer.total_cost || 0,
      status: customer.status || "active",
      prepaid_months: customer.prepaid_months || 0,
      notes: customer.notes || ""
    });
    setShowModal(true);
  };

  const handleSaveCustomer = async () => {
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      if (editingCustomer) {
        await axios.put(`${API}/customers/${editingCustomer.id}`, form);
        toast.success("Customer updated");
      } else {
        await axios.post(`${API}/customers`, form);
        toast.success("Customer added");
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      toast.error("Failed to save customer");
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}?`)) return;
    
    try {
      await axios.delete(`${API}/customers/${customer.id}`);
      toast.success("Customer deleted");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete customer");
    }
  };

  const handleToggleStatus = async (customer) => {
    const newStatus = customer.status === "active" ? "paused" : "active";
    try {
      await axios.put(`${API}/customers/${customer.id}`, { status: newStatus });
      toast.success(`Customer ${newStatus === "active" ? "activated" : "paused"}`);
      fetchData();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  // Machine management
  const handleAddMachine = (machine) => {
    const existing = form.machines.find(m => m.machine_type_id === machine.id);
    if (existing) {
      setForm({
        ...form,
        machines: form.machines.map(m => 
          m.machine_type_id === machine.id 
            ? { ...m, quantity: m.quantity + 1 }
            : m
        )
      });
    } else {
      setForm({
        ...form,
        machines: [...form.machines, {
          machine_type_id: machine.id,
          machine_name: machine.name,
          quantity: 1
        }]
      });
    }
  };

  const handleRemoveMachine = (machineTypeId) => {
    setForm({
      ...form,
      machines: form.machines.filter(m => m.machine_type_id !== machineTypeId)
    });
  };

  const handleUpdateMachineQty = (machineTypeId, qty) => {
    if (qty < 1) {
      handleRemoveMachine(machineTypeId);
      return;
    }
    setForm({
      ...form,
      machines: form.machines.map(m => 
        m.machine_type_id === machineTypeId 
          ? { ...m, quantity: qty }
          : m
      )
    });
  };

  // Machine type management
  const handleAddMachineType = () => {
    setEditingMachine(null);
    setMachineForm({ name: "", monthly_fee: 0 });
    setShowMachineModal(true);
  };

  const handleEditMachineType = (machine) => {
    setEditingMachine(machine);
    setMachineForm({ name: machine.name, monthly_fee: machine.monthly_fee });
    setShowMachineModal(true);
  };

  const handleSaveMachineType = async () => {
    if (!machineForm.name.trim()) {
      toast.error("Machine name is required");
      return;
    }

    try {
      if (editingMachine) {
        await axios.put(`${API}/machine-types/${editingMachine.id}`, machineForm);
        toast.success("Machine type updated");
      } else {
        await axios.post(`${API}/machine-types`, machineForm);
        toast.success("Machine type added");
      }
      setShowMachineModal(false);
      fetchData();
    } catch (e) {
      toast.error("Failed to save machine type");
    }
  };

  const handleDeleteMachineType = async (machine) => {
    if (!window.confirm(`Delete ${machine.name}?`)) return;
    
    try {
      await axios.delete(`${API}/machine-types/${machine.id}`);
      toast.success("Machine type deleted");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete machine type");
    }
  };

  // Export/Import
  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/export/excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customers.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export complete");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API}/import/excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Imported ${res.data.imported} customers`);
      if (res.data.errors?.length > 0) {
        toast.warning(`${res.data.errors.length} rows had errors`);
      }
      fetchData();
    } catch (e) {
      toast.error("Import failed");
    }
    
    e.target.value = '';
  };

  // Calculate total fee
  const calculateTotalFee = (machines) => {
    return machines.reduce((total, m) => {
      const machine = machineTypes.find(mt => mt.id === m.machine_type_id);
      return total + (machine?.monthly_fee || 0) * m.quantity;
    }, 0);
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-fadeIn">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="customers-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Customers</h1>
          <p className="text-gray-500 mt-1">{customers.length} customers registered</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleAddMachineType}
            variant="outline"
            className="border-[#27272A] hover:bg-[#1A1A1A]"
            data-testid="add-machine-type-btn"
          >
            <Cpu size={16} className="mr-2" />
            Manage Machines
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              data-testid="import-input"
            />
            <Button variant="outline" className="border-[#27272A] hover:bg-[#1A1A1A]" asChild>
              <span>
                <Upload size={16} className="mr-2" />
                Import
              </span>
            </Button>
          </label>
          <Button 
            onClick={handleExport}
            variant="outline"
            className="border-[#27272A] hover:bg-[#1A1A1A]"
            data-testid="export-btn"
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button 
            onClick={handleAddCustomer}
            className="bg-[#00E054] text-black hover:bg-[#00E054]/90"
            data-testid="add-customer-btn"
          >
            <Plus size={16} className="mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Machine Types Section */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Machine Types & Fees</h3>
        <div className="flex flex-wrap gap-2">
          {machineTypes.map((mt) => (
            <div 
              key={mt.id} 
              className="machine-badge group cursor-pointer hover:border-[#00E054]"
              onClick={() => handleEditMachineType(mt)}
            >
              <span className="text-white">{mt.name}</span>
              <span className="text-[#00E054]">${mt.monthly_fee}</span>
            </div>
          ))}
          <button 
            onClick={handleAddMachineType}
            className="machine-badge hover:border-[#00E054] hover:text-[#00E054]"
          >
            <Plus size={14} />
            <span>Add Type</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#0A0A0A] border-[#27272A] text-white"
          data-testid="search-input"
        />
      </div>

      {/* Customers List */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <Users size={64} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">No customers found</h3>
            <p className="text-gray-500">Add your first customer to get started</p>
          </div>
        ) : (
          filteredCustomers.map((customer, idx) => (
            <div 
              key={customer.id} 
              className={`card p-4 animate-fadeIn`}
              style={{ animationDelay: `${idx * 0.05}s` }}
              data-testid={`customer-card-${customer.id}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{customer.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      customer.status === 'active' ? 'status-paid' : 'status-paused'
                    }`}>
                      {customer.status}
                    </span>
                    {customer.prepaid_months > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/20">
                        {customer.prepaid_months}m prepaid
                      </span>
                    )}
                  </div>
                  {customer.phone && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Phone size={14} />
                      {customer.phone}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {customer.machines?.map((m, i) => (
                      <span key={i} className="machine-badge">
                        {m.quantity}x {m.machine_name}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Your Cost</p>
                    <p className="text-lg font-mono text-[#EF4444]">${customer.total_cost}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Customer Fee</p>
                    <p className="text-lg font-mono text-[#00E054]">${customer.total_fee}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleStatus(customer)}
                      className="hover:bg-[#1A1A1A]"
                      data-testid={`toggle-status-${customer.id}`}
                    >
                      {customer.status === 'active' ? (
                        <Pause size={18} className="text-[#EAB308]" />
                      ) : (
                        <Play size={18} className="text-[#00E054]" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditCustomer(customer)}
                      className="hover:bg-[#1A1A1A]"
                      data-testid={`edit-customer-${customer.id}`}
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteCustomer(customer)}
                      className="hover:bg-[#EF4444]/10 text-[#EF4444]"
                      data-testid={`delete-customer-${customer.id}`}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Customer Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-[#0F0F0F] border-[#27272A] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-[#0A0A0A] border-[#27272A] mt-1"
                  placeholder="Customer name"
                  data-testid="customer-name-input"
                />
              </div>
              <div>
                <Label>Phone (WhatsApp)</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-[#0A0A0A] border-[#27272A] mt-1"
                  placeholder="+961 XX XXX XXX"
                  data-testid="customer-phone-input"
                />
              </div>
              <div>
                <Label>Your Cost ($)</Label>
                <Input
                  type="number"
                  value={form.total_cost}
                  onChange={(e) => setForm({ ...form, total_cost: parseFloat(e.target.value) || 0 })}
                  className="bg-[#0A0A0A] border-[#27272A] mt-1"
                  data-testid="customer-cost-input"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={form.status} 
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="bg-[#0A0A0A] border-[#27272A] mt-1" data-testid="customer-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F0F0F] border-[#27272A]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prepaid Months</Label>
                <Input
                  type="number"
                  value={form.prepaid_months}
                  onChange={(e) => setForm({ ...form, prepaid_months: parseInt(e.target.value) || 0 })}
                  className="bg-[#0A0A0A] border-[#27272A] mt-1"
                  min={0}
                  data-testid="customer-prepaid-input"
                />
              </div>
            </div>

            {/* Machines */}
            <div>
              <Label>Machines</Label>
              <div className="mt-2 space-y-2">
                {form.machines.map((m) => (
                  <div key={m.machine_type_id} className="flex items-center gap-2 p-2 bg-[#0A0A0A] rounded-lg border border-[#27272A]">
                    <span className="flex-1 text-sm">{m.machine_name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleUpdateMachineQty(m.machine_type_id, m.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center font-mono">{m.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleUpdateMachineQty(m.machine_type_id, m.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-[#EF4444]"
                      onClick={() => handleRemoveMachine(m.machine_type_id)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full border-dashed border-[#27272A] hover:bg-[#1A1A1A]"
                      data-testid="add-machine-dropdown"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Machine
                      <ChevronDown size={16} className="ml-auto" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0F0F0F] border-[#27272A]">
                    {machineTypes.map((mt) => (
                      <DropdownMenuItem
                        key={mt.id}
                        onClick={() => handleAddMachine(mt)}
                        className="cursor-pointer hover:bg-[#1A1A1A]"
                      >
                        <span>{mt.name}</span>
                        <span className="ml-auto text-[#00E054]">${mt.monthly_fee}/mo</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {form.machines.length > 0 && (
                <div className="mt-3 p-3 bg-[#00E054]/10 rounded-lg border border-[#00E054]/20">
                  <p className="text-sm text-gray-400">Calculated Monthly Fee</p>
                  <p className="text-2xl font-bold text-[#00E054]">
                    ${calculateTotalFee(form.machines)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full mt-1 p-2 bg-[#0A0A0A] border border-[#27272A] rounded-lg text-white resize-none h-20"
                placeholder="Any notes..."
                data-testid="customer-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowModal(false)}
              className="border-[#27272A]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCustomer}
              className="bg-[#00E054] text-black hover:bg-[#00E054]/90"
              data-testid="save-customer-btn"
            >
              {editingCustomer ? "Update" : "Add"} Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Machine Type Modal */}
      <Dialog open={showMachineModal} onOpenChange={setShowMachineModal}>
        <DialogContent className="bg-[#0F0F0F] border-[#27272A] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMachine ? "Edit Machine Type" : "Add Machine Type"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Machine Name *</Label>
              <Input
                value={machineForm.name}
                onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
                className="bg-[#0A0A0A] border-[#27272A] mt-1"
                placeholder="e.g., L11, S19"
                data-testid="machine-name-input"
              />
            </div>
            <div>
              <Label>Monthly Hosting Fee ($)</Label>
              <Input
                type="number"
                value={machineForm.monthly_fee}
                onChange={(e) => setMachineForm({ ...machineForm, monthly_fee: parseFloat(e.target.value) || 0 })}
                className="bg-[#0A0A0A] border-[#27272A] mt-1"
                data-testid="machine-fee-input"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingMachine && (
              <Button 
                variant="destructive"
                onClick={() => {
                  handleDeleteMachineType(editingMachine);
                  setShowMachineModal(false);
                }}
                className="w-full sm:w-auto"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowMachineModal(false)}
                className="border-[#27272A] flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveMachineType}
                className="bg-[#00E054] text-black hover:bg-[#00E054]/90 flex-1"
                data-testid="save-machine-btn"
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
