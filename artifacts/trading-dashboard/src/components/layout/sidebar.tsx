import { Link, useLocation } from "wouter";
import { 
  BarChart2, 
  TerminalSquare, 
  List, 
  PlusCircle, 
  Settings,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHealthCheck } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { refetchInterval: 10000 } });

  const navItems = [
    { icon: BarChart2, label: "Dashboard", href: "/" },
    { icon: PlusCircle, label: "Place Order", href: "/place-order" },
    { icon: List, label: "Order History", href: "/orders" },
    { icon: TerminalSquare, label: "Logs", href: "/logs" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="w-64 border-r border-border bg-sidebar h-screen flex flex-col fixed top-0 left-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2 text-primary">
          <Activity size={20} />
          <span className="font-mono font-bold tracking-tight text-lg">QUANT_TERM</span>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <div className={cn(
            "w-2 h-2 rounded-full",
            health?.status === "ok" ? "bg-success" : "bg-destructive animate-pulse"
          )} />
          <span>API Status: {health?.status === "ok" ? "ONLINE" : "OFFLINE"}</span>
        </div>
      </div>
    </div>
  );
}
