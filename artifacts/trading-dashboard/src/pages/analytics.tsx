import { useGetAnalytics, useGetDailyPnl } from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const { data: analytics } = useGetAnalytics();
  const { data: dailyPnl } = useGetDailyPnl({ days: 90 });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Prepare heatmap data
  const today = new Date();
  const heatmapData = Array.from({ length: 90 }).map((_, i) => {
    const date = format(subDays(today, 89 - i), 'yyyy-MM-dd');
    const dayData = dailyPnl?.find(d => d.date === date);
    return {
      date,
      pnl: dayData?.pnl || 0,
      trades: dayData?.trades || 0
    };
  });

  // Prepare cumulative equity curve
  let cumulative = 0;
  const equityData = heatmapData.map(d => {
    cumulative += d.pnl;
    return { date: d.date, equity: cumulative };
  });

  const winRateData = [{ name: 'Win Rate', value: analytics?.winRate || 0, fill: 'var(--success)' }];

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} className="glass p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 opacity-20 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={winRateData} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-white/40 uppercase mb-2 font-mono">Win Rate</div>
            <div className="text-3xl font-mono tabular text-success">
              {analytics?.winRate.toFixed(1) || '0.0'}%
            </div>
            <div className="text-xs text-white/40 mt-1">{analytics?.totalTrades || 0} total trades</div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass p-6 relative">
          <div className="text-[10px] tracking-widest text-white/40 uppercase mb-2 font-mono">Profit Factor</div>
          <div className={cn(
            "text-3xl font-mono tabular",
            (analytics?.profitFactor || 0) >= 1.5 ? "text-success" : 
            (analytics?.profitFactor || 0) >= 1 ? "text-white" : "text-destructive"
          )}>
            {analytics?.profitFactor.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-white/40 mt-1">Gross Win / Gross Loss</div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass p-6 relative">
          <div className="text-[10px] tracking-widest text-white/40 uppercase mb-2 font-mono">Max Drawdown</div>
          <div className="text-3xl font-mono tabular text-destructive">
            {analytics?.maxDrawdown.toFixed(2) || '0.00'}%
          </div>
          <div className="text-xs text-white/40 mt-1">Peak to trough decline</div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass p-6 relative">
          <div className="text-[10px] tracking-widest text-white/40 uppercase mb-2 font-mono">Sharpe Ratio</div>
          <div className="text-3xl font-mono tabular text-info">
            {analytics?.sharpeRatio.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-white/40 mt-1">Risk-adjusted return</div>
        </motion.div>
      </div>

      {/* Heatmap */}
      <motion.div variants={itemVariants} className="glass p-6">
        <div className="text-[10px] tracking-widest text-white/40 uppercase mb-6 font-mono">90-Day P&L Heatmap</div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {heatmapData.map((day, i) => {
            let color = "bg-white/[0.03] border-white/5"; // Neutral/No trades
            if (day.trades > 0) {
              if (day.pnl > 0) {
                const intensity = Math.min(day.pnl / 100, 1);
                color = intensity > 0.5 ? "bg-success border-success shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-success/40 border-success/50";
              } else if (day.pnl < 0) {
                const intensity = Math.min(Math.abs(day.pnl) / 100, 1);
                color = intensity > 0.5 ? "bg-destructive border-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-destructive/40 border-destructive/50";
              } else {
                color = "bg-white/20 border-white/30"; // Breakeven
              }
            }

            return (
              <div 
                key={i} 
                title={`${day.date}: $${day.pnl.toFixed(2)} (${day.trades} trades)`}
                className={cn("w-4 h-4 rounded-sm border transition-all hover:scale-125 cursor-crosshair", color)}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-4 text-[10px] font-mono text-white/40">
          <span>{format(subDays(today, 89), 'MMM d, yyyy')}</span>
          <div className="flex items-center gap-2">
            <span>Loss</span>
            <div className="w-2 h-2 rounded-sm bg-destructive" />
            <div className="w-2 h-2 rounded-sm bg-white/[0.03]" />
            <div className="w-2 h-2 rounded-sm bg-success" />
            <span>Profit</span>
          </div>
          <span>Today</span>
        </div>
      </motion.div>

      {/* Equity Curve */}
      <motion.div variants={itemVariants} className="glass p-6">
        <div className="text-[10px] tracking-widest text-white/40 uppercase mb-6 font-mono">Cumulative Equity Curve</div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => format(new Date(val), 'MMM d')}
                stroke="rgba(255,255,255,0.1)"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.1)"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(3,7,18,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', marginBottom: '4px' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Equity']}
              />
              <Area 
                type="stepAfter" 
                dataKey="equity" 
                stroke="var(--primary)" 
                fillOpacity={1} 
                fill="url(#equityGradient)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

    </motion.div>
  );
}
