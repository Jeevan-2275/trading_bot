import { useState, useMemo } from "react";
import { useListOrders, useCancelOrder } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Search, Filter, Download, ArrowUpRight, ArrowDownRight, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PAIRS = ["ALL", "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT"];
const STATUSES = ["ALL", "NEW", "PARTIALLY_FILLED", "FILLED", "CANCELED", "REJECTED", "EXPIRED"];

export default function Orders() {
  const { toast } = useToast();
  const { data: orders, refetch, isFetching } = useListOrders({ limit: 1000 });
  const cancelOrder = useCancelOrder();

  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sideFilter, setSideFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      if (symbolFilter !== "ALL" && o.symbol !== symbolFilter) return false;
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (sideFilter !== "ALL" && o.side !== sideFilter) return false;
      if (searchQuery && !o.id.toString().includes(searchQuery) && !o.orderId?.includes(searchQuery)) return false;
      return true;
    });
  }, [orders, symbolFilter, statusFilter, sideFilter, searchQuery]);

  const handleCancel = (id: number) => {
    cancelOrder.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Cancel signal sent" });
        refetch();
      }
    });
  };

  const exportCSV = () => {
    if (!filteredOrders.length) return;
    
    const headers = ["ID", "Time", "Symbol", "Side", "Type", "Status", "Price", "Quantity", "Executed Qty", "Mode"];
    const csvContent = [
      headers.join(","),
      ...filteredOrders.map(o => [
        o.id,
        new Date(o.createdAt).toISOString(),
        o.symbol,
        o.side,
        o.orderType,
        o.status,
        o.price || "",
        o.quantity,
        o.executedQty || "0",
        o.testMode ? "PAPER" : "LIVE"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col">
      
      {/* Controls Bar */}
      <div className="glass p-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input h-9 rounded-lg pl-9 pr-4 text-sm font-mono w-48"
            />
          </div>

          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <Filter className="w-4 h-4 text-white/40" />
            <select 
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="bg-transparent text-sm font-mono border-none focus:ring-0 text-white cursor-pointer py-1"
            >
              {PAIRS.map(p => <option key={p} value={p} className="bg-black">{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm font-mono border-none focus:ring-0 text-white cursor-pointer py-1"
            >
              {STATUSES.map(s => <option key={s} value={s} className="bg-black">{s.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div className="flex bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            {["ALL", "BUY", "SELL"].map(s => (
              <button
                key={s}
                onClick={() => setSideFilter(s)}
                className={cn(
                  "px-3 py-1.5 text-xs font-mono font-bold tracking-widest transition-colors",
                  sideFilter === s ? (s === 'BUY' ? "bg-success text-success-foreground" : s === 'SELL' ? "bg-destructive text-destructive-foreground" : "bg-white/20 text-white") : "text-white/40 hover:text-white"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()} 
            className="p-2 text-white/40 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left relative">
            <thead className="text-[10px] text-white/40 font-mono tracking-widest uppercase bg-black/40 border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-normal">Internal ID</th>
                <th className="px-6 py-4 font-normal">Time (UTC)</th>
                <th className="px-6 py-4 font-normal">Pair</th>
                <th className="px-6 py-4 font-normal">Side</th>
                <th className="px-6 py-4 font-normal">Type</th>
                <th className="px-6 py-4 font-normal text-right">Price</th>
                <th className="px-6 py-4 font-normal text-right">Qty</th>
                <th className="px-6 py-4 font-normal text-right">Filled</th>
                <th className="px-6 py-4 font-normal text-right">Status</th>
                <th className="px-6 py-4 font-normal">Mode</th>
                <th className="px-6 py-4 font-normal text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredOrders.map((order) => {
                const isBuy = order.side === 'BUY';
                const isFilled = order.status === 'FILLED';
                const isCanceled = order.status === 'CANCELED' || order.status === 'REJECTED';
                const isPending = order.status === 'NEW' || order.status === 'PARTIALLY_FILLED';
                
                return (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-3 text-white/40">{order.id}</td>
                    <td className="px-6 py-3">{format(new Date(order.createdAt), 'MM/dd HH:mm:ss')}</td>
                    <td className="px-6 py-3 font-bold">{order.symbol}</td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "flex items-center gap-1 text-[10px] tracking-widest uppercase",
                        isBuy ? "text-success" : "text-destructive"
                      )}>
                        {isBuy ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {order.side}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-white/60">{order.orderType}</td>
                    <td className="px-6 py-3 text-right tabular">{order.price ? `$${order.price.toFixed(2)}` : 'MKT'}</td>
                    <td className="px-6 py-3 text-right tabular">{order.quantity}</td>
                    <td className="px-6 py-3 text-right tabular text-white/60">{order.executedQty || '0'}</td>
                    <td className="px-6 py-3 text-right">
                      <span className={cn(
                        "text-[10px] tracking-wider px-2 py-0.5 border rounded-sm inline-block",
                        isFilled ? "border-success/30 bg-success/10 text-success" : 
                        isCanceled ? "border-white/10 bg-white/5 text-white/40" :
                        "border-warning/30 bg-warning/10 text-warning"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {order.testMode ? (
                        <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-white/40">PAPER</span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20 text-primary">LIVE</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {isPending && (
                        <button 
                          onClick={() => handleCancel(order.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-destructive hover:bg-destructive/10 rounded transition-all inline-flex"
                          title="Cancel Order"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-white/30">
                      <Search size={32} className="mb-4 opacity-50" />
                      <div className="font-mono text-xs uppercase tracking-widest">No orders match criteria</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
