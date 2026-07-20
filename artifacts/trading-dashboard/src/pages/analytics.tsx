import { useGetAnalytics, useGetDailyPnl, useListOrders } from "@workspace/api-client-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  CartesianGrid, Cell, ReferenceLine, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, BarChart2, Percent, ShieldAlert, Zap } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type:"spring", stiffness:280, damping:22 } } };

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-[11px] font-mono border border-white/10 shadow-xl min-w-[120px]">
      {label && <div className="text-white/40 mb-1.5 text-[10px]">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-3">
          <span style={{ color: p.fill ?? "rgba(255,255,255,0.6)" }}>{p.name}</span>
          <span className="text-white tabular">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* Big radial win-rate gauge */
function WinRateGauge({ rate }: { rate: number }) {
  const data = [{ value: rate, fill: rate >= 55 ? "#10b981" : rate >= 40 ? "#f59e0b" : "#ef4444" }];
  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="68%" outerRadius="100%"
          barSize={14} data={data} startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false}/>
          {/* Track */}
          <RadialBar background={{ fill:"rgba(255,255,255,0.04)" }} dataKey="value" cornerRadius={8} angleAxisId={0}/>
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-mono tabular font-bold" style={{ color: data[0].fill }}>{rate.toFixed(1)}</span>
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Win %</span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: analytics } = useGetAnalytics();
  const { data: dailyPnl }  = useGetDailyPnl({ days: 90 });
  const { data: orders }    = useListOrders({ limit: 500 });

  const today = new Date();

  /* ── 90-day heatmap grid ── */
  const heatmap = Array.from({ length: 90 }, (_, i) => {
    const date = format(subDays(today, 89 - i), "yyyy-MM-dd");
    const d = dailyPnl?.find(x => x.date === date);
    return { date, pnl: d?.pnl ?? 0, trades: d?.trades ?? 0 };
  });

  /* ── Cumulative equity curve ── */
  let cum = 0;
  const equityCurve = heatmap.map(d => { cum += d.pnl; return { date: d.date, equity: parseFloat(cum.toFixed(2)) }; });
  const equityFinal = equityCurve[equityCurve.length - 1]?.equity ?? 0;
  const equityUp    = equityFinal >= 0;

  /* ── Daily P&L bar chart (last 30 days) ── */
  const last30 = heatmap.slice(-30).map(d => ({
    date: format(new Date(d.date), "MMM d"),
    pnl: parseFloat(d.pnl.toFixed(2)),
    trades: d.trades,
  }));

  /* ── Per-symbol win/loss breakdown ── */
  const symbolStats: Record<string, { wins: number; losses: number }> = {};
  (orders ?? [])
    .filter(o => o.status === "FILLED")
    .forEach(o => {
      const sym = o.symbol.replace("USDT","");
      if (!symbolStats[sym]) symbolStats[sym] = { wins: 0, losses: 0 };
      const price = parseFloat(String(o.avgPrice ?? o.price ?? "0"));
      const qty   = parseFloat(String(o.quantity));
      const pnl   = o.side === "SELL" ? price * qty : -(price * qty);
      if (pnl > 0) symbolStats[sym].wins++;
      else symbolStats[sym].losses++;
    });
  const symbolData = Object.entries(symbolStats)
    .map(([sym, s]) => ({ sym, wins: s.wins, losses: s.losses, total: s.wins + s.losses }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const wr    = analytics?.winRate ?? 0;
  const pf    = analytics?.profitFactor ?? 0;
  const dd    = analytics?.maxDrawdown ?? 0;
  const sr    = analytics?.sharpeRatio ?? 0;
  const total = analytics?.totalTrades ?? 0;

  return (
    <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">

      {/* ── Hero row: gauge + 3 metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Win Rate gauge */}
        <motion.div variants={item} className="glass p-6 flex items-center justify-between gap-4 md:col-span-1 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-transparent pointer-events-none"/>
          <WinRateGauge rate={wr} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono mb-1">Win Rate</div>
            <div className="text-xs text-white/40 font-mono">{total} total</div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-emerald-400">Wins</span>
                <span className="tabular text-white/70">{analytics?.filledTrades ? Math.round(wr / 100 * analytics.filledTrades) : 0}</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-red-400">Losses</span>
                <span className="tabular text-white/70">{analytics?.filledTrades ? Math.round((1 - wr/100) * analytics.filledTrades) : 0}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profit Factor */}
        <motion.div variants={item} className="glass p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 bg-primary/[0.06] blur-[60px] rounded-full pointer-events-none"/>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-primary"/>
            <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono">Profit Factor</div>
          </div>
          <div className={cn("text-4xl font-mono tabular font-bold",
            pf >= 1.5 ? "text-emerald-400" : pf >= 1 ? "text-white" : "text-red-400")}>
            {pf.toFixed(2)}
          </div>
          <div className="text-[11px] text-white/30 font-mono mt-2">Gross Win / Gross Loss</div>
          {/* mini bar */}
          <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width:`${Math.min(pf/3*100,100)}%` }}/>
          </div>
        </motion.div>

        {/* Max Drawdown */}
        <motion.div variants={item} className="glass p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 bg-red-500/[0.05] blur-[60px] rounded-full pointer-events-none"/>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={14} className="text-red-400"/>
            <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono">Max Drawdown</div>
          </div>
          <div className="text-4xl font-mono tabular font-bold text-red-400">
            {dd.toFixed(1)}<span className="text-2xl">%</span>
          </div>
          <div className="text-[11px] text-white/30 font-mono mt-2">Peak-to-trough decline</div>
          <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-red-500 transition-all" style={{ width:`${Math.min(dd,100)}%` }}/>
          </div>
        </motion.div>

        {/* Sharpe Ratio */}
        <motion.div variants={item} className="glass p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 bg-blue-500/[0.05] blur-[60px] rounded-full pointer-events-none"/>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-blue-400"/>
            <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono">Sharpe Ratio</div>
          </div>
          <div className={cn("text-4xl font-mono tabular font-bold",
            sr >= 1 ? "text-blue-400" : sr >= 0 ? "text-white" : "text-amber-400")}>
            {sr.toFixed(2)}
          </div>
          <div className="text-[11px] text-white/30 font-mono mt-2">Risk-adjusted return (ann.)</div>
          <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width:`${Math.min(Math.abs(sr)/3*100,100)}%` }}/>
          </div>
        </motion.div>
      </div>

      {/* ── Middle row: daily PnL bars + symbol breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* 30-day daily P&L bars */}
        <motion.div variants={item} className="glass p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono">30-Day Daily P&L</div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block"/>Profit</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block"/>Loss</span>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last30} barSize={8} margin={{ left: -10 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="date" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9, fontFamily:"monospace" }} axisLine={false} tickLine={false} interval={4}/>
                <YAxis tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9, fontFamily:"monospace" }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                <Tooltip content={<GlassTooltip />} cursor={{ fill:"rgba(255,255,255,0.025)" }} formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4"/>
                <Bar dataKey="pnl" radius={[3,3,0,0]}>
                  {last30.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Per-symbol wins vs losses */}
        <motion.div variants={item} className="glass p-6 lg:col-span-2">
          <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono mb-5">Wins vs Losses by Symbol</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symbolData} layout="vertical" barSize={7} barGap={2} margin={{ left: -10, right: 10 }}>
                <XAxis type="number" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9, fontFamily:"monospace" }} axisLine={false} tickLine={false}/>
                <YAxis dataKey="sym" type="category" width={38} tick={{ fill:"rgba(255,255,255,0.5)", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<GlassTooltip />} cursor={{ fill:"rgba(255,255,255,0.025)" }}/>
                <Bar dataKey="wins"   name="Wins"   fill="#10b981" fillOpacity={0.85} radius={[0,3,3,0]}/>
                <Bar dataKey="losses" name="Losses" fill="#ef4444" fillOpacity={0.85} radius={[0,3,3,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── 90-day P&L heatmap ── */}
      <motion.div variants={item} className="glass p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono">90-Day P&L Heatmap</div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/30">
            <span>Loss</span>
            <div className="flex gap-0.5">
              {["bg-red-500","bg-red-400/50","bg-white/[0.04]","bg-emerald-500/50","bg-emerald-500"].map(c => (
                <div key={c} className={cn("w-3 h-3 rounded-sm", c)}/>
              ))}
            </div>
            <span>Profit</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {heatmap.map((d, i) => {
            let cls = "bg-white/[0.03] border-white/[0.04]";
            if (d.trades > 0) {
              if (d.pnl > 50)       cls = "bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]";
              else if (d.pnl > 0)   cls = "bg-emerald-500/40 border-emerald-500/30";
              else if (d.pnl < -50) cls = "bg-red-500 border-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]";
              else if (d.pnl < 0)   cls = "bg-red-500/40 border-red-500/30";
              else                   cls = "bg-white/20 border-white/20";
            }
            return (
              <div key={i} title={`${d.date}: $${d.pnl.toFixed(2)} (${d.trades} trades)`}
                className={cn("w-4 h-4 rounded-sm border transition-all hover:scale-150 hover:z-10 cursor-crosshair relative", cls)}/>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-white/25 mt-4">
          <span>{format(subDays(today, 89), "MMM d, yyyy")}</span>
          <span>Today</span>
        </div>
      </motion.div>

      {/* ── Cumulative equity curve ── */}
      <motion.div variants={item} className="glass p-6 relative overflow-hidden">
        <div className={cn("absolute top-0 left-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none opacity-20",
          equityUp ? "bg-emerald-500" : "bg-red-500")}/>
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono">Cumulative Equity Curve</div>
          <div className="flex items-center gap-2">
            {equityUp ? <TrendingUp size={14} className="text-emerald-400"/> : <TrendingDown size={14} className="text-red-400"/>}
            <span className={cn("text-sm font-mono tabular font-bold", equityUp ? "text-emerald-400" : "text-red-400")}>
              {equityUp ? "+" : ""}{equityFinal.toFixed(2)} USDT
            </span>
          </div>
        </div>
        <div className="h-64 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurve} margin={{ left: 0, right: 4 }}>
              <defs>
                <linearGradient id="eq-up"   x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="eq-down" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
              <XAxis dataKey="date" tickFormatter={v => format(new Date(v),"MMM d")}
                tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false} interval={14}/>
              <YAxis tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`}/>
              <Tooltip content={<GlassTooltip />} formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]}/>
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4"/>
              <Area type="monotone" dataKey="equity" name="Equity"
                stroke={equityUp ? "#10b981" : "#ef4444"} strokeWidth={2}
                fillOpacity={1} fill={equityUp ? "url(#eq-up)" : "url(#eq-down)"} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

    </motion.div>
  );
}
