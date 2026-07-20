import { Link, useLocation } from "wouter";
import { 
  BarChart2, 
  TerminalSquare, 
  List, 
  PlusCircle, 
  Settings,
  Activity,
  PieChart,
  Target,
  BellRing,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHealthCheck } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { refetchInterval: 10000 } });

  const navItems = [
    { icon: Activity, label: "Dashboard", href: "/" },
    { icon: BarChart2, label: "Analytics", href: "/analytics" },
    { icon: PieChart, label: "Portfolio", href: "/portfolio" },
    { icon: Target, label: "Strategies", href: "/strategies" },
    { icon: PlusCircle, label: "Place Order", href: "/place-order" },
    { icon: List, label: "Orders", href: "/orders" },
    { icon: BellRing, label: "Alerts", href: "/alerts" },
    { icon: BookOpen, label: "Journal", href: "/journal" },
    { icon: TerminalSquare, label: "Logs", href: "/logs" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="w-64 glass-panel border-r border-white/5 h-screen flex flex-col fixed top-0 left-0 z-40">
      <div className="h-14 flex items-center px-6 border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 text-primary relative z-10">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            <Activity size={14} className="text-primary-foreground" />
          </div>
          <span className="font-mono font-bold tracking-widest text-sm text-gradient-primary">QUANT_TERM</span>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
        <div className="text-[10px] font-mono tracking-widest text-white/30 px-3 mb-2 uppercase">Menu</div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "text-white bg-white/10 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              )}
              <item.icon size={16} className={cn("transition-colors", isActive ? "text-primary" : "group-hover:text-white/80")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3 p-3 rounded-xl glass border border-white/5">
          <div className="relative flex items-center justify-center">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full absolute",
              health?.status === "ok" ? "bg-success" : "bg-destructive animate-ping"
            )} />
            <div className={cn(
              "w-2.5 h-2.5 rounded-full blur-[2px]",
              health?.status === "ok" ? "bg-success/50" : "bg-destructive/50"
            )} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">System Status</span>
            <span className={cn(
              "text-xs font-mono font-bold tracking-wider",
              health?.status === "ok" ? "text-success" : "text-destructive"
            )}>
              {health?.status === "ok" ? "ONLINE_TESTNET" : "OFFLINE_ERR"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
