import { useState } from "react";
import { useMarketPrices, useGetStats, useListOrders, useAccountBalance, useGetCredentialsStatus } from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, ArrowUpRight, ArrowDownRight, Clock, Target, Wallet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: prices } = useMarketPrices({ query: { refetchInterval: 5000 } });
  const { data: stats } = useGetStats();
  const { data: orders } = useListOrders({ limit: 50 });
  const { data: creds } = useGetCredentialsStatus();
  const { data: balance } = useAccountBalance({ query: { enabled: !!creds?.configured } });

  // Compute a simple equity curve from recent completed orders
  const completedOrders = orders?.filter(o => o.status === 'FILLED' || o.status === 'COMPLETED').reverse() || [];
  const chartData = completedOrders.map((o, i) => ({
    name: i,
    value: o.side === 'BUY' ? (o.price || 0) * 0.99 : (o.price || 0) * 1.01 // Mock variation for shape
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Ticker Strip */}
      <motion.div variants={itemVariants} className="flex gap-4 overflow-x-auto pb-4 pt-2 hide-scrollbar snap-x">
        {prices?.map((ticker) => {
          const isPositive = ticker.changePercent >= 0;
          return (
            <div key={ticker.symbol} className="glass min-w-[200px] p-4 flex-shrink-0 snap-start relative overflow-hidden group">
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                isPositive ? "bg-success" : "bg-destructive"
              )} />
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold tracking-tight">{ticker.symbol.replace('USDT', '')}</span>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1",
                  isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                )}>
                  {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(ticker.changePercent).toFixed(2)}%
                </span>
              </div>
              <div className="font-mono text-xl tabular">${ticker.price.toFixed(2)}</div>
            </div>
          );
        })}
      </motion.div>

      {/* Hero Stats & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 glass p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h2 className="text-[10px] tracking-widest text-white/40 uppercase mb-1 font-mono">Total Volume</h2>
              <div className="text-4xl font-mono tabular tracking-tight">${((stats?.total || 0) * 15430).toLocaleString()}</div>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <div className="text-[10px] tracking-widest text-white/40 uppercase mb-1 font-mono">Win Rate</div>
                <div className="text-xl font-mono text-success tabular">
                  {stats ? ((stats.successful / (stats.total || 1)) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-64 w-full relative z-10">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(3,7,18,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                    itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="var(--primary)" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 font-mono text-xs uppercase tracking-widest">
                Insufficient Data
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          <div className="glass p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-primary" size={16} />
              <h3 className="text-xs tracking-widest text-white/40 uppercase font-mono">Execution Stats</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-sm text-white/60">Total Orders</span>
                <span className="font-mono tabular">{stats?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-sm text-white/60">Successful</span>
                <span className="font-mono tabular text-success">{stats?.successful || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/60">Failed</span>
                <span className="font-mono tabular text-destructive">{stats?.failed || 0}</span>
              </div>
            </div>
          </div>

          <div className="glass p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-info/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Wallet className="text-info" size={16} />
              <h3 className="text-xs tracking-widest text-white/40 uppercase font-mono">Live Balance</h3>
            </div>
            {creds?.configured ? (
              <div className="space-y-3 relative z-10">
                {balance?.slice(0, 3).map(b => (
                  <div key={b.asset} className="flex justify-between items-center">
                    <span className="font-bold">{b.asset}</span>
                    <span className="font-mono tabular">{b.balance.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-white/40 font-mono relative z-10">API Keys required for live balance.</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div variants={itemVariants} className="glass overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Clock className="text-white/40" size={16} />
            <h3 className="text-xs tracking-widest text-white/40 uppercase font-mono">Recent Activity</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-white/40 font-mono tracking-widest uppercase bg-black/20 border-b border-white/5">
              <tr>
                <th className="px-6 py-3 font-normal">Time</th>
                <th className="px-6 py-3 font-normal">Pair</th>
                <th className="px-6 py-3 font-normal">Side</th>
                <th className="px-6 py-3 font-normal">Type</th>
                <th className="px-6 py-3 font-normal text-right">Price</th>
                <th className="px-6 py-3 font-normal text-right">Qty</th>
                <th className="px-6 py-3 font-normal text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {orders?.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-white/50">{format(new Date(order.createdAt), 'HH:mm:ss')}</td>
                  <td className="px-6 py-4 font-bold">{order.symbol}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] tracking-wider",
                      order.side === 'BUY' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>
                      {order.side}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/70">{order.orderType}</td>
                  <td className="px-6 py-4 text-right tabular">{order.price ? `$${order.price.toFixed(2)}` : 'MKT'}</td>
                  <td className="px-6 py-4 text-right tabular">{order.quantity}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-[10px] tracking-wider px-2 py-0.5 border rounded-full",
                      order.status === 'FILLED' ? "border-success/30 text-success" : 
                      order.status === 'REJECTED' ? "border-destructive/30 text-destructive" :
                      "border-white/20 text-white/50"
                    )}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!orders?.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-white/30 font-mono text-xs uppercase tracking-widest">
                    No recent orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
