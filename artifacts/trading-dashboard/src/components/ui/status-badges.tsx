import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function OrderStatusBadge({ status }: { status: string }) {
  switch (status.toUpperCase()) {
    case "NEW":
      return <Badge variant="outline" className="text-cyan-500 border-cyan-500/30 bg-cyan-500/10 font-mono text-xs">NEW</Badge>;
    case "FILLED":
      return <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 font-mono text-xs">FILLED</Badge>;
    case "CANCELED":
      return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 bg-muted-foreground/10 font-mono text-xs">CANCELED</Badge>;
    case "REJECTED":
      return <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 font-mono text-xs">REJECTED</Badge>;
    case "EXPIRED":
      return <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 font-mono text-xs">EXPIRED</Badge>;
    default:
      return <Badge variant="outline" className="font-mono text-xs">{status}</Badge>;
  }
}

export function OrderSideBadge({ side }: { side: string }) {
  const isBuy = side.toUpperCase() === "BUY";
  return (
    <span className={cn(
      "font-mono font-bold text-xs tracking-wider",
      isBuy ? "text-green-500" : "text-red-500"
    )}>
      {side.toUpperCase()}
    </span>
  );
}

export function LogLevelBadge({ level }: { level: string }) {
  switch (level.toUpperCase()) {
    case "INFO":
      return <span className="text-cyan-500 font-mono text-xs w-16 inline-block">INFO</span>;
    case "ERROR":
      return <span className="text-red-500 font-mono text-xs w-16 inline-block">ERROR</span>;
    case "WARNING":
    case "WARN":
      return <span className="text-amber-500 font-mono text-xs w-16 inline-block">WARN</span>;
    case "DEBUG":
      return <span className="text-slate-500 font-mono text-xs w-16 inline-block">DEBUG</span>;
    default:
      return <span className="text-muted-foreground font-mono text-xs w-16 inline-block">{level}</span>;
  }
}
