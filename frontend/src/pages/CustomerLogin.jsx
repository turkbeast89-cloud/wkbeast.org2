import { useState } from "react";
import { Lock, User, Cpu } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const CustomerLogin = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/portal/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      
      if (!res.ok) {
        throw new Error("Invalid username or password");
      }
      
      const data = await res.json();
      localStorage.setItem("customer_session", JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#00E054] to-[#00C2FF] flex items-center justify-center mx-auto mb-6 shadow-[0_0_60px_rgba(0,224,84,0.3)]">
            <Cpu className="text-black" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">WKBeast Farm</h1>
          <p className="text-gray-500">Customer Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="pl-12 py-6 bg-[#0F0F0F] border-[#27272A] text-white text-lg"
              required
              data-testid="customer-username"
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="pl-12 py-6 bg-[#0F0F0F] border-[#27272A] text-white text-lg"
              required
              data-testid="customer-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-[#00E054] text-black font-bold text-lg hover:bg-[#00E054]/90 transition-all hover:shadow-[0_0_30px_rgba(0,224,84,0.5)]"
            data-testid="customer-login-btn"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-8">
          Contact admin if you forgot your password
        </p>
      </div>
    </div>
  );
};

export default CustomerLogin;
