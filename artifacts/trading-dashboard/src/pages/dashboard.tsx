import { AppLayout } from "@/components/layout/app-layout";
import {
  useGetStats,
  useListOrders,
  useGetLogs,
  useMarketPrices,
  useAccountBalance,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

/* ─── tiny helpers ─────────────────────────────────────── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg ${className}`}>
      {children}
    </div>
  );
}

function SideBadge({ side }: { side: string }) {
  const buy = side.toUpperCase() === "BUY";
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono tracking-wider
      ${buy
        ? "bg-[rgba(52,211,153,.12)] text-[#34d399] border-[rgba(52,211,153,.2)]"
        : "bg-[rgba(248,113,113,.12)] text-[#f87171] border-[rgba(248,113,113,.2)]"}`}>
      {side.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    FILLED:   "bg-[rgba(52,211,153,.1)]  text-[#34d399]",
    NEW:      "bg-[rgba(96,165,250,.1)]   text-[#60a5fa]",
    CANCELED: "bg-[rgba(113,113,122,.1)] text-[#52525b]",
    REJECTED: "bg-[rgba(248,113,113,.1)] text-[#f87171]",
    EXPIRED:  "bg-[rgba(251,191,36,.1)]  text-[#fbbf24]",
    FAILED:   "bg-[rgba(248,113,113,.1)] text-[#f87171]",
  };
  const cls = map[status.toUpperCase()] ?? "bg-[#111] text-[#71717a]";
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono tracking-wider ${cls}`}>
      {status.toUpperCase()}
    </span>
  );
}

function LogBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    INFO:    "text-[#60a5fa] bg-[rgba(96,165,250,.1)]",
    ERROR:   "text-[#f87171] bg-[rgba(248,113,113,.1)]",
    WARNING: "text-[#fbbf24] bg-[rgba(251,191,36,.1)]",
    WARN:    "text-[#fbbf24] bg-[rgba(251,191,36,.1)]",
    DEBUG:   "text-[#52525b] bg-[#111]",
  };
  const cls = map[level.toUpperCase()] ?? "text-[#71717a] bg-[#111]";
  return (
    <span className={`text-[9px] font-bold px-1 rounded whitespace-nowrap font-mono ${cls}`}>
      {level.slice(0,3).toUpperCase()}
    </span>
  );
}

/* ─── main component ────────────────────────────────────── */
export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStats({ query: { refetchInterval: 10000 } });
  const { data: orders, isLoading: ordersLoading } = useListOrders({ limit: 8 }, { query: { refetchInterval: 10000 } });
  const { data: logs, isLoading: logsLoading } = useGetLogs({ limit: 8 }, { query: { refetchInterval: 5000 } });
  const { data: prices, isLoading: pricesLoading } = useMarketPrices();
  const { data: balances } = useAccountBalance();
  const { data: allOrdersData } = useListOrders({ limit: 1000 }, { query: { refetchInterval: 30000 } });

  const usdtBalance = balances?.find((b) => b.asset === "USDT");
  const allOrders = allOrdersData ?? [];
  const netPnl = allOrders.reduce((acc, o) => {
    const notional = (o.quantity || 0) * (Number(o.avgPrice) || Number(o.price) || 0);
    return o.side === "SELL" ? acc + notional : acc - notional;
  }, 0);
  const pnlUp = netPnl >= 0;

  /* weekly bar chart from real order counts by day */
  const dayCounts = (() => {
    const bins = [0, 0, 0, 0, 0, 0, 0];
    allOrders.forEach((o) => {
      const d = new Date(o.createdAt).getDay(); // 0=Sun
      bins[d]++;
    });
    // Reorder Mon→Sun
    return [1,2,3,4,5,6,0].map((i) => bins[i]);
  })();
  const maxBar = Math.max(...dayCounts, 1);

  const statCards = [
    { label: "Total Orders", value: stats?.total,      icon: "◈", color: "#60a5fa" },
    { label: "Successful",   value: stats?.successful, icon: "◉", color: "#34d399" },
    { label: "Failed",       value: stats?.failed,     icon: "◌", color: "#f87171" },
    {
      label: "Net P&L",
      value: usdtBalance != null
        ? `${pnlUp ? "+" : ""}$${Math.abs(netPnl).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
        : "—",
      icon: "▲",
      color: "#a78bfa",
      valColor: pnlUp ? "#34d399" : "#f87171",
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 p-5 h-[calc(100vh-48px)] overflow-y-auto">

        {/* ── Ticker row ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {pricesLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg bg-[#0a0a0a]" />
              ))
            : (prices ?? []).slice(0, 3).map((p) => {
                const up = p.changePercent >= 0;
                return (
                  <Card key={p.symbol} className="p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-[#f4f4f5]">
                        {p.symbol.replace("USDT", "")}
                        <span className="font-normal text-[#52525b]">/USDT</span>
                      </span>
                      <span className={`text-xs font-bold ${up ? "text-[#34d399]" : "text-[#f87171]"}`}>
                        {up ? "+" : ""}{p.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="font-mono text-xl font-bold text-[#f4f4f5] tabular mb-2">
                      {p.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </div>
                    <div className="h-0.5 bg-[#1a1a1a] rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          width: up ? "62%" : "38%",
                          background: up ? "#34d399" : "#f87171",
                        }}
                      />
                    </div>
                  </Card>
                );
              })}
        </div>

        {/* ── Stats row ──────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          {statCards.map((s) => (
            <Card key={s.label} className="p-4 flex items-center gap-4">
              <span className="text-2xl leading-none shrink-0" style={{ color: s.color }}>{s.icon}</span>
              <div>
                <div className="text-[11px] font-medium text-[#71717a] mb-1">{s.label}</div>
                {statsLoading
                  ? <Skeleton className="h-7 w-14 rounded bg-[#111]" />
                  : <div className="text-2xl font-bold leading-none tabular" style={{ color: s.valColor ?? "#f4f4f5" }}>
                      {s.value ?? "—"}
                    </div>}
              </div>
            </Card>
          ))}
        </div>

        {/* ── Balance strip ─────────────────────────────── */}
        {usdtBalance && (
          <Card className="px-5 py-3 flex items-center gap-8">
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-[#52525b] mb-0.5">USDT BALANCE</div>
              <div className="font-mono text-lg font-bold text-[#f4f4f5] tabular">
                ${usdtBalance.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-px h-8 bg-[#1a1a1a]" />
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-[#52525b] mb-0.5">AVAILABLE</div>
              <div className="font-mono text-lg font-bold text-[#a1a1aa] tabular">
                ${usdtBalance.available.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-px h-8 bg-[#1a1a1a]" />
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-[#52525b] mb-0.5">UNREALIZED P&L</div>
              <div className={`font-mono text-lg font-bold tabular ${pnlUp ? "text-[#34d399]" : "text-[#f87171]"}`}>
                {pnlUp ? "+" : ""}${Math.abs(netPnl).toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </div>
            </div>
          </Card>
        )}

        {/* ── Table + Right panel ─────────────────────────── */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Order table */}
          <Card className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
              <h2 className="text-[13px] font-semibold text-[#a1a1aa] tracking-wide">Order History</h2>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    {["ID","Time","Pair","Side","Qty","Price","Status","P&L"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#52525b] tracking-widest uppercase whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordersLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-[#111]">
                          <td colSpan={8} className="px-4 py-2.5">
                            <Skeleton className="h-4 w-full rounded bg-[#111]" />
                          </td>
                        </tr>
                      ))
                    : (orders ?? []).length === 0
                    ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-[#52525b] font-mono text-xs">
                          No orders yet
                        </td>
                      </tr>
                    )
                    : (orders ?? []).map((o) => {
                        const notional = (o.quantity || 0) * (Number(o.avgPrice) || Number(o.price) || 0);
                        const pnl = o.side === "SELL" ? notional : -notional;
                        const hasPnl = o.status === "FILLED" && notional > 0;
                        return (
                          <tr key={o.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[#52525b]">
                              #{o.orderId || o.id}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[#52525b] whitespace-nowrap">
                              {format(new Date(o.createdAt), "HH:mm:ss")}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-[#d4d4d8]">
                              {o.symbol.replace("USDT", "/USDT")}
                            </td>
                            <td className="px-4 py-2.5"><SideBadge side={o.side} /></td>
                            <td className="px-4 py-2.5 text-right font-mono text-[#a1a1aa] tabular">{o.quantity}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-[#a1a1aa] tabular">
                              {o.price ? `$${Number(o.price).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "MKT"}
                            </td>
                            <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                            <td className={`px-4 py-2.5 text-right font-mono font-semibold tabular ${hasPnl ? (pnl >= 0 ? "text-[#34d399]" : "text-[#f87171]") : "text-[#52525b]"}`}>
                              {hasPnl ? `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Right panel */}
          <div className="w-52 flex flex-col gap-3 shrink-0">
            {/* Mini bar chart */}
            <Card className="p-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#52525b] mb-3">
                Orders / Day — 7d
              </div>
              <div className="flex gap-1.5 items-end h-14">
                {dayCounts.map((v, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full bg-[#111] rounded-sm flex items-end" style={{ height: 48 }}>
                      <div
                        className="w-full bg-[#818cf8] rounded-sm min-h-[3px] transition-all duration-500"
                        style={{ height: `${(v / maxBar) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-[#52525b]">
                      {["M","T","W","T","F","S","S"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Live logs */}
            <Card className="p-4 flex flex-col flex-1 min-h-0">
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#52525b] mb-3">
                Live Logs
              </div>
              <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
                {logsLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-3.5 w-full rounded bg-[#111]" />
                    ))
                  : (logs ?? []).slice(0, 8).map((log, i) => (
                      <div key={i} className="flex items-baseline gap-1.5 text-[10px]">
                        <span className="text-[#52525b] font-mono whitespace-nowrap shrink-0">
                          {format(new Date(log.timestamp), "HH:mm:ss")}
                        </span>
                        <LogBadge level={log.level} />
                        <span className="text-[#71717a] truncate leading-snug">{log.message}</span>
                      </div>
                    ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
