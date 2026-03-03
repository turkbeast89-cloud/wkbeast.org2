import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  LayoutDashboard, Users, CreditCard, MessageSquare, Settings, 
  ChevronRight, Plus, Edit2, Trash2, Download, Upload, Send,
  DollarSign, TrendingUp, Cpu, AlertCircle, Check, X, Menu,
  ExternalLink, RefreshCw, FileSpreadsheet, Shield, LogOut
} from "lucide-react";

// Import auth
import { useAuth, LoginScreen } from "./components/Auth";

// Import pages
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Payments from "./pages/Payments";
import WhatsAppSender from "./pages/WhatsAppSender";
import SettingsPage from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerPortal from "./pages/CustomerPortal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Sidebar Component
const Sidebar = ({ isOpen, setIsOpen, onLogout }) => {
  const location = useLocation();
  
  const links = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/customers", icon: Users, label: "Customers" },
    { path: "/payments", icon: CreditCard, label: "Payments" },
    { path: "/whatsapp", icon: MessageSquare, label: "WhatsApp" },
    { path: "/admin", icon: Shield, label: "Admin Panel" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      onLogout();
    }
  };

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
        
        <div className="absolute bottom-6 left-6 right-6 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
            data-testid="logout-btn"
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">Logout</span>
          </button>
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
  const { isAuthenticated, isLoading, login, logout } = useAuth();

  // Check if on customer portal route
  const isCustomerPortal = window.location.pathname === "/portal" || window.location.pathname.startsWith("/portal");

  // Initialize default data on first load
  useEffect(() => {
    if (isAuthenticated && !isCustomerPortal) {
      const initData = async () => {
        try {
          await axios.post(`${API}/init`);
        } catch (e) {
          console.error("Init error:", e);
        }
      };
      initData();
    }
  }, [isAuthenticated, isCustomerPortal]);

  // Customer portal - separate flow
  if (isCustomerPortal) {
    return <CustomerPortal />;
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00E054] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

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
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} onLogout={logout} />
        <MobileHeader setIsOpen={setSidebarOpen} />
        
        <main className="main-content pt-20 md:pt-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/whatsapp" element={<WhatsAppSender />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;
