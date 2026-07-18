import { AppLayout } from "@/components/layout/app-layout";
import { useListOrders } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

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

export default function Orders() {
  const { data: orders, isLoading } = useListOrders({ limit: 200 }, { query: { refetchInterval: 10000 } });
  const [search, setSearch] = useState("");

  const filtered = (orders ?? []).filter((o) =>
    o.symbol.toLowerCase().includes(search.toLowerCase()) ||
    (o.orderId ?? "").toLowerCase().includes(search.toLowerCase()) ||
    o.status.toLowerCase().includes(search.toLowerCase()) ||
    o.side.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    if (!orders?.length) return;
    const header = "ID,Time,Symbol,Side,Type,Qty,Price,FilledQty,Status,Test\n";
    const rows = orders.map((o) =>
      [o.orderId || o.id, format(new Date(o.createdAt), "yyyy-MM-dd HH:mm:ss"),
       o.symbol, o.side, o.orderType, o.quantity,
       o.price ?? "", o.executedQty ?? "", o.status, o.testMode ? "TEST" : "REAL"].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "orders.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-48px)] p-5 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold text-[#f4f4f5] tracking-tight">Order History</h1>
            <p className="text-[13px] text-[#52525b] mt-0.5">Complete record of all placed orders</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol, status, ID…"
              className="h-8 px-3 text-[13px] font-mono bg-[#0a0a0a] border border-[#1a1a1a] rounded-md
                         text-[#e4e4e7] placeholder:text-[#3f3f46] outline-none focus:border-[#818cf8] w-56 transition-colors"
            />
            <button
              onClick={handleExport}
              className="h-8 px-3 text-[11px] font-medium bg-[#0a0a0a] border border-[#1a1a1a] rounded-md
                         text-[#71717a] hover:border-[#818cf8] hover:text-[#a5b4fc] transition-all cursor-pointer"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-auto min-h-0">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 bg-[#0a0a0a]">
              <tr className="border-b border-[#1a1a1a]">
                {["Time","ID","Pair","Side","Type","Qty","Price","Filled Qty","Mode","Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#52525b] tracking-widest uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#111]">
                      <td colSpan={10} className="px-4 py-3">
                        <Skeleton className="h-4 w-full rounded bg-[#111]" />
                      </td>
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-[#52525b] font-mono text-xs">
                      {search ? "No orders match your search" : "No orders found"}
                    </td>
                  </tr>
                )
                : filtered.map((o) => (
                    <tr key={o.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-[#52525b] whitespace-nowrap">
                        {format(new Date(o.createdAt), "MMM dd, HH:mm:ss")}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-[#52525b] max-w-[100px] truncate">
                        {o.orderId || o.id}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-[#d4d4d8]">
                        {o.symbol.replace("USDT", "/USDT")}
                      </td>
                      <td className="px-4 py-2.5"><SideBadge side={o.side} /></td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-[#71717a]">{o.orderType}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#a1a1aa] tabular">{o.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#a1a1aa] tabular">
                        {o.price
                          ? `$${Number(o.price).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                          : o.orderType === "MARKET" ? "MKT" : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#71717a] tabular">
                        {o.executedQty || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`font-mono text-[10px] font-semibold ${o.testMode ? "text-[#fbbf24]" : "text-[#818cf8]"}`}>
                          {o.testMode ? "TEST" : "REAL"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!isLoading && (
          <div className="text-[11px] text-[#52525b] font-mono shrink-0">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            {search && ` (filtered from ${orders?.length ?? 0})`}
            {" "}· Auto-refresh 10s
          </div>
        )}
      </div>
    </AppLayout>
  );
}
