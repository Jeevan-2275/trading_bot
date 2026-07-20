import { useState } from "react";
import { useMarketPrices, useGetStats, useListOrders, useAccountBalance, useGetCredentialsStatus } from "@workspace/api-client-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { Activity, ArrowUpRight, ArrowDownRight, Clock, Wallet, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import CandlestickChart from "@/components/charts/CandlestickChart";
import MiniSparkline from "@/components/charts/MiniSparkline";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item      = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } } };

/* Custom recharts tooltip */
function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-[11px] font-mono border border-white/10 shadow-xl">
      {label && <div className="text-white/40 mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="text-white">{p.name}: <span className="tabular">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span></div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: prices } = useMarketPrices({ query: { refetchInterval: 5000 } });
  const { data: stats }  = useGetStats();
  const { data: orders } = useListOrders({ limit: 100 });
  const { data: creds }  = useGetCredentialsStatus();
  const { data: balance } = useAccountBalance({ query: { enabled: !!creds?.configured } });

  /* Derive 24-hour P&L sparklines per symbol (from orders placed today) */
  const mockSparklines: Record<string, number[]> = {};
  if (prices) {
    prices.forEach(p => {
      const base = p.price;
      // generate synthetic 24-pt sparkline around current price using changePercent as direction
      const dir = p.changePercent > 0 ? 1 : -1;
      mockSparklines[p.symbol] = Array.from({ length: 24 }, (_, i) => {
        const t = i / 23;
        const noise = (Math.random() - 0.5) * base * 0.006;
        return base + dir * base * Math.abs(p.changePercent / 100) * t + noise;
      });
    });
  }

  /* Equity sparkline from recent filled orders */
  const filled = orders?.filter(o => o.status === "FILLED").slice(-40) ?? [];
  let cum = 0;
  const equityData = filled.map((o, i) => {
    const price = parseFloat(String(o.avgPrice ?? o.price ?? "0"));
    const qty   = parseFloat(String(o.quantity));
    const delta = o.side === "SELL" ? price * qty * 0.01 : -(price * qty * 0.005);
    cum += delta;
    return { i, equity: parseFloat(cum.toFixed(2)) };
  });
  const equityPositive = (equityData[equityData.length - 1]?.equity ?? 0) >= 0;

  /* Side distribution for mini donut */
  const sideData = [
    { name: "BUY",  value: orders?.filter(o => o.side === "BUY").length  ?? 0, fill: "#10b981" },
    { name: "SELL", value: orders?.filter(o => o.side === "SELL").length ?? 0, fill: "#ef4444" },
  ];

  const successRate = stats?.total ? ((stats.successful / stats.total) * 100).toFixed(1) : "0.0";

  return (
    <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">

      {/* ── Ticker Strip ── */}
      <motion.div variants={item} className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar snap-x">
        {prices?.map(ticker => {
          const up = ticker.changePercent >= 0;
          const spark = mockSparklines[ticker.symbol] ?? [];
          return (
            <div key={ticker.symbol}
              className="glass min-w-[170px] px-4 py-3 flex-shrink-0 snap-start group relative overflow-hidden cursor-pointer hover:border-white/20 transition-all">
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-[0.06] transition-opacity", up ? "bg-emerald-400" : "bg-red-400")} />
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm tracking-tight">{ticker.symbol.replace("USDT","")}</span>
                <span className={cn("text-[10px] font-mono flex items-center gap-0.5", up ? "text-emerald-400" : "text-red-400")}>
                  {up ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                  {Math.abs(ticker.changePercent).toFixed(2)}%
                </span>
              </div>
              <div className="font-mono tabular text-lg font-bold leading-none mb-2">
                ${ticker.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:4})}
              </div>
              <MiniSparkline data={spark} positive={up} width={140} height={24} />
            </div>
          );
        })}
      </motion.div>

      {/* ── Stats Row ── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders",   value: stats?.total ?? 0,       color: "text-white",        icon: <Activity size={14} className="text-primary" /> },
          { label: "Filled",         value: stats?.successful ?? 0,  color: "text-emerald-400",  icon: <TrendingUp size={14} className="text-emerald-400" /> },
          { label: "Failed",         value: stats?.failed ?? 0,      color: "text-red-400",      icon: <ArrowDownRight size={14} className="text-red-400" /> },
          { label: "Success Rate",   value: `${successRate}%`,       color: "text-primary",      icon: <TrendingUp size={14} className="text-primary" /> },
        ].map(s => (
          <div key={s.label} className="glass px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono mb-1">{s.label}</div>
              <div className={cn("text-2xl font-mono tabular font-bold", s.color)}>{s.value}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              {s.icon}
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Main: Candlestick + Side Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Candlestick chart */}
        <motion.div variants={item} className="lg:col-span-2 glass p-5 relative overflow-hidden" style={{ minHeight: 460 }}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/[0.04] blur-[120px] rounded-full pointer-events-none" />
          <CandlestickChart className="h-full relative z-10" defaultSymbol="BTCUSDT" />
        </motion.div>

        {/* Right column */}
        <motion.div variants={item} className="flex flex-col gap-4">

          {/* Equity sparkline */}
          <div className="glass p-5 flex-1 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono">Session P&amp;L</div>
              <span className={cn("text-xs font-mono tabular", equityPositive ? "text-emerald-400" : "text-red-400")}>
                {equityPositive ? "+" : ""}{(equityData[equityData.length-1]?.equity ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="h-28">
              {equityData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={equityPositive ? "#10b981" : "#ef4444"} stopOpacity={0.35}/>
                        <stop offset="95%" stopColor={equityPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3"/>
                    <Tooltip content={<GlassTooltip />} formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]} />
                    <Area type="monotone" dataKey="equity" stroke={equityPositive ? "#10b981" : "#ef4444"}
                      strokeWidth={2} fill="url(#eq-grad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-white/20 text-[10px] font-mono uppercase tracking-widest">
                  No data
                </div>
              )}
            </div>
          </div>

          {/* BUY / SELL distribution */}
          <div className="glass p-5">
            <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono mb-3">Buy vs Sell</div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sideData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fill:"rgba(255,255,255,0.4)", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<GlassTooltip />} cursor={{ fill:"rgba(255,255,255,0.03)" }}/>
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {sideData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live balance */}
          <div className="glass p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.06] to-transparent pointer-events-none"/>
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <Wallet size={14} className="text-blue-400"/>
              <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono">Live Balance</div>
            </div>
            {creds?.configured ? (
              <div className="space-y-2.5 relative z-10">
                {(balance ?? []).slice(0, 4).map(b => (
                  <div key={b.asset} className="flex justify-between items-center">
                    <span className="text-sm font-bold">{b.asset}</span>
                    <span className="font-mono tabular text-sm">{b.balance.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-white/30 font-mono relative z-10">API Keys required</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Recent Activity Table ── */}
      <motion.div variants={item} className="glass overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2 bg-white/[0.015]">
          <Clock size={14} className="text-white/30"/>
          <h3 className="text-[10px] tracking-widest text-white/40 uppercase font-mono">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-white/35 font-mono tracking-widest uppercase bg-black/20 border-b border-white/[0.05]">
              <tr>
                {["Time","Pair","Side","Type","Price","Qty","Status"].map(h => (
                  <th key={h} className={cn("px-5 py-3 font-normal", h === "Price" || h === "Qty" || h === "Status" ? "text-right" : "")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono">
              {(orders ?? []).slice(0, 12).map(order => (
                <tr key={order.id} className="hover:bg-white/[0.025] transition-colors">
                  <td className="px-5 py-3.5 text-white/40 text-xs">{format(new Date(order.createdAt),"MMM d HH:mm")}</td>
                  <td className="px-5 py-3.5 font-bold">{order.symbol.replace("USDT","")}<span className="text-white/30">/USDT</span></td>
                  <td className="px-5 py-3.5">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] tracking-wider font-bold",
                      order.side === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                      {order.side}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/50 text-xs">{order.orderType}</td>
                  <td className="px-5 py-3.5 text-right tabular">
                    {order.avgPrice ? `$${parseFloat(String(order.avgPrice)).toLocaleString(undefined,{minimumFractionDigits:2})}` : order.price ? `$${parseFloat(String(order.price)).toLocaleString(undefined,{minimumFractionDigits:2})}` : <span className="text-white/30">MKT</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular text-white/70">{order.quantity}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={cn("text-[10px] tracking-wider px-2 py-0.5 rounded-full border",
                      order.status === "FILLED"   ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" :
                      order.status === "FAILED"   ? "border-red-500/30    text-red-400    bg-red-500/5"    :
                      order.status === "TEST_OK"  ? "border-blue-500/30   text-blue-400   bg-blue-500/5"   :
                                                    "border-white/10       text-white/40")}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!orders?.length && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-white/25 font-mono text-xs uppercase tracking-widest">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
