import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Search, Bell } from "lucide-react";

export function TopNav() {
  const [location] = useLocation();

  const getPageTitle = (path: string) => {
    switch (path) {
      case "/": return "Command Center";
      case "/analytics": return "Performance Analytics";
      case "/portfolio": return "Asset Portfolio";
      case "/strategies": return "Strategy Signals";
      case "/place-order": return "Execution Terminal";
      case "/orders": return "Order Ledger";
      case "/alerts": return "Price Alerts";
      case "/journal": return "Trade Journal";
      case "/logs": return "System Logs";
      case "/settings": return "Configuration";
      default: return "Dashboard";
    }
  };

  return (
    <header className="fixed top-0 left-64 right-0 z-30 flex items-center justify-between h-14 px-6 glass-panel border-b border-white/5">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-white/90">
          {getPageTitle(location)}
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Global Search Mock */}
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search commands (⌘K)" 
            className="h-8 w-64 bg-white/5 border border-white/10 rounded-full pl-9 pr-4 text-xs text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:bg-white/10 transition-all font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/5">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_5px_rgba(168,85,247,0.8)]" />
          </button>
          <div className="w-px h-4 bg-white/10" />
          <LiveClock />
        </div>
      </div>
    </header>
  );
}

function LiveClock() {
  const [time, setTime] = useState("");
  
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB", { timeZone: "UTC", hour12: false }) + "." + now.getMilliseconds().toString().padStart(3, '0').slice(0,1) + " UTC");
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(59,130,246,0.8)] animate-pulse" />
      <span className="font-mono tabular-nums tracking-wider text-[11px] text-white/70 min-w-[90px] text-right">
        {time}
      </span>
    </div>
  );
}
