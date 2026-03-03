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
          <h1 className="text-2xl font-bold text-white">WKBeast Farm Manager</h1>
          <p className="text-gray-500 mt-2">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter password"
              className={`w-full pl-12 pr-4 py-4 bg-[#0F0F0F] border ${
                error ? 'border-red-500' : 'border-[#27272A]'
              } rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder:tracking-normal placeholder:text-base focus:outline-none focus:border-[#00E054] transition-colors`}
              autoFocus
              data-testid="password-input"
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm text-center">Wrong password. Try again.</p>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-[#00E054] text-black font-bold rounded-xl hover:bg-[#00E054]/90 transition-all hover:shadow-[0_0_30px_rgba(0,224,84,0.5)] active:scale-95"
            data-testid="login-btn"
          >
            Unlock
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-8">
          Your device will be remembered
        </p>
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
