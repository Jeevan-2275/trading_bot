import { useGetStrategySignals } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function Strategies() {
  const { data: signals } = useGetStrategySignals({ query: { refetchInterval: 30000 } });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight mb-1">Algorithm Intelligence</h2>
          <p className="text-sm text-white/40 font-mono">Live multi-factor signal aggregation. Auto-refreshes every 30s.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-panel">
          <Activity size={14} className="text-primary animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase">Engine Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {signals?.map((signal) => {
          const isBuy = signal.signal === 'BUY';
          const isSell = signal.signal === 'SELL';
          const isNeutral = signal.signal === 'NEUTRAL';

          return (
            <motion.div key={signal.symbol} variants={itemVariants} className="glass p-6 relative overflow-hidden group">
              {/* Background Glow */}
              <div className={cn(
                "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity",
                isBuy ? "bg-success" : isSell ? "bg-destructive" : "bg-white/20"
              )} />

              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{signal.symbol}</h3>
                  <div className="text-sm font-mono text-white/60">${signal.price.toFixed(2)}</div>
                </div>
                <div className={cn(
                  "px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase border",
                  isBuy ? "bg-success/10 text-success border-success/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : 
                  isSell ? "bg-destructive/10 text-destructive border-destructive/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : 
                  "bg-white/5 text-white/50 border-white/10"
                )}>
                  {isBuy ? <TrendingUp size={14} /> : isSell ? <TrendingDown size={14} /> : <Minus size={14} />}
                  {signal.signal}
                </div>
              </div>

              {/* Strategy Name & Reason */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center gap-2 text-white/40">
                  <Zap size={14} />
                  <span className="text-xs font-mono uppercase tracking-widest">{signal.strategy}</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed border-l-2 border-white/10 pl-3 py-1">
                  {signal.reason}
                </p>
              </div>

              {/* Indicators */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                {/* Strength Bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono tracking-widest text-white/40 uppercase mb-1.5">
                    <span>Conviction Strength</span>
                    <span>{signal.strength}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full",
                        isBuy ? "bg-success" : isSell ? "bg-destructive" : "bg-white/30"
                      )} 
                      style={{ width: `${signal.strength}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* RSI */}
                  {signal.rsi !== undefined && (
                    <div>
                      <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-1">RSI (14)</div>
                      <div className="font-mono text-lg flex items-center gap-2">
                        <span className={cn(
                          signal.rsi > 70 ? "text-destructive" : signal.rsi < 30 ? "text-success" : "text-white/80"
                        )}>{signal.rsi.toFixed(1)}</span>
                      </div>
                    </div>
                  )}

                  {/* MACD / SMA Context */}
                  {signal.sma20 !== undefined && signal.sma50 !== undefined && (
                    <div>
                      <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-1">Trend Context</div>
                      <div className="font-mono text-xs flex flex-col gap-0.5">
                        <span className="text-white/60">S20: ${signal.sma20.toFixed(0)}</span>
                        <span className="text-white/60">S50: ${signal.sma50.toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <button className={cn(
                  "w-full py-2.5 rounded-lg text-sm font-medium transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
                  isBuy ? "bg-success text-success-foreground hover:bg-success/90" : 
                  isSell ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : 
                  "bg-white/10 hover:bg-white/20 text-white"
                )}>
                  Trade {signal.symbol}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {!signals?.length && (
        <div className="glass p-12 text-center text-white/40 font-mono uppercase tracking-widest text-sm">
          No active signals generated at this time.
        </div>
      )}
    </motion.div>
  );
}
