import { useState, useEffect } from "react";
import CustomerLogin from "./CustomerLogin";
import CustomerDashboard from "./CustomerDashboard";

const CustomerPortal = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedSession = localStorage.getItem("customer_session");
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem("customer_session");
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00E054] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <CustomerLogin onLogin={setSession} />;
  }

  return <CustomerDashboard session={session} onLogout={() => setSession(null)} />;
};

export default CustomerPortal;
