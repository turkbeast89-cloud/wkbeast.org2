import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  LayoutDashboard, Users, CreditCard, MessageSquare, Settings, 
  ChevronRight, Plus, Edit2, Trash2, Download, Upload, Send,
  DollarSign, TrendingUp, Cpu, AlertCircle, Check, X, Menu,
  ExternalLink, RefreshCw, FileSpreadsheet
} from "lucide-react";

// Import pages
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Payments from "./pages/Payments";
import WhatsAppSender from "./pages/WhatsAppSender";
import SettingsPage from "./pages/Settings";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Sidebar Component
const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  
  const links = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/customers", icon: Users, label: "Customers" },
    { path: "/payments", icon: CreditCard, label: "Payments" },
    { path: "/whatsapp", icon: MessageSquare, label: "WhatsApp" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00E054] flex items-center justify-center">
              <span className="text-black font-bold text-lg">W</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">WKBeast</h1>
              <p className="text-xs text-gray-500">Farm Manager</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-4">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setIsOpen(false)}
              data-testid={`nav-${link.label.toLowerCase()}`}
            >
              <link.icon size={20} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-4 rounded-lg bg-[#1A1A1A] border border-[#27272A]">
            <p className="text-xs text-gray-500 mb-1">Need help?</p>
            <p className="text-sm text-white">Contact Support</p>
          </div>
        </div>
      </aside>
    </>
  );
};

// Mobile Header
const MobileHeader = ({ setIsOpen }) => (
  <header className="fixed top-0 left-0 right-0 h-16 bg-[#0F0F0F] border-b border-[#27272A] flex items-center px-4 z-20 md:hidden">
    <button 
      onClick={() => setIsOpen(true)}
      className="p-2 hover:bg-[#1A1A1A] rounded-lg"
      data-testid="mobile-menu-btn"
    >
      <Menu size={24} />
    </button>
    <div className="flex items-center gap-2 ml-4">
      <div className="w-8 h-8 rounded-lg bg-[#00E054] flex items-center justify-center">
        <span className="text-black font-bold">W</span>
      </div>
      <span className="font-bold">WKBeast</span>
    </div>
  </header>
);

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize default data on first load
  useEffect(() => {
    const initData = async () => {
      try {
        await axios.post(`${API}/init`);
      } catch (e) {
        console.error("Init error:", e);
      }
    };
    initData();
  }, []);

  return (
    <div className="app-container">
      <BrowserRouter>
        <Toaster 
          position="top-right" 
          richColors 
          theme="dark"
          toastOptions={{
            style: {
              background: '#0F0F0F',
              border: '1px solid #27272A',
              color: '#FFFFFF'
            }
          }}
        />
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <MobileHeader setIsOpen={setSidebarOpen} />
        
        <main className="main-content pt-20 md:pt-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/whatsapp" element={<WhatsAppSender />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;
