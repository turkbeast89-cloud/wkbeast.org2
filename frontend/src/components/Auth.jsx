import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

const PASSWORD = "1122";
const AUTH_KEY = "wkbeast_auth_token";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const token = localStorage.getItem(AUTH_KEY);
    if (token === "authenticated_wkbeast_2024") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = (password) => {
    if (password === PASSWORD) {
      localStorage.setItem(AUTH_KEY, "authenticated_wkbeast_2024");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isLoading, login, logout };
};

export const LoginScreen = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin(password)) {
      // Success - will redirect automatically
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className={`w-full max-w-sm ${shake ? 'animate-shake' : ''}`}>
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[#00E054] flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(0,224,84,0.4)]">
            <span className="text-black font-bold text-3xl">W</span>
          </div>
          <h1 className="text-2xl font-bold text-white">WKBeast Farm</h1>
          <p className="text-gray-500 mt-2">Customer Portal</p>
        </div>

        {/* Customer Login - Primary/Prominent */}
        <a 
          href="/portal"
          className="block w-full py-4 text-center bg-[#00E054] text-black font-bold rounded-xl hover:bg-[#00E054]/90 transition-all hover:shadow-[0_0_30px_rgba(0,224,84,0.5)] mb-4"
          data-testid="customer-portal-btn"
        >
          Customer Login
        </a>
        
        <p className="text-center text-gray-500 text-sm mb-6">
          View your machines, payments & earnings
        </p>

        {/* Admin Login - Secondary/Smaller */}
        <div className="mt-8 pt-6 border-t border-[#27272A]">
          <p className="text-center text-gray-600 text-xs mb-3">Admin Access</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Admin password"
                className={`w-full pl-10 pr-4 py-3 bg-[#0F0F0F] border ${
                  error ? 'border-red-500' : 'border-[#27272A]'
                } rounded-lg text-white text-sm tracking-[0.3em] placeholder:tracking-normal placeholder:text-xs focus:outline-none focus:border-[#27272A] transition-colors`}
                data-testid="password-input"
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-xs text-center">Wrong password</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#1A1A1A] border border-[#27272A] text-gray-400 text-sm rounded-lg hover:bg-[#27272A] hover:text-white transition-colors"
              data-testid="login-btn"
            >
              Unlock Admin
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};
