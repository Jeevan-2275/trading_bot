import { useAccountBalance, useGetCredentialsStatus, useMarketPrices } from "@workspace/api-client-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { Wallet, AlertCircle } from "lucide-react";
import { Link } from "wouter";

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export default function Portfolio() {
  const { data: creds } = useGetCredentialsStatus();
  const { data: balance } = useAccountBalance({ query: { enabled: !!creds?.configured } });
  const { data: prices } = useMarketPrices();

  if (!creds?.configured) {
    return (
      <div className="glass p-12 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Wallet size={32} className="text-white/20" />
        </div>
        <h2 className="text-xl font-medium mb-2">API Credentials Required</h2>
        <p className="text-white/40 mb-6 max-w-md">
          To view your portfolio allocation and live balances, you need to configure your Binance API keys.
        </p>
        <Link href="/settings" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          Configure API Keys
        </Link>
      </div>
    );
  }

  // Calculate USD values for assets
  const enhancedBalance = balance?.map(b => {
    // If it's USDT, value is 1:1
    if (b.asset === 'USDT') return { ...b, usdValue: b.balance };
    
    // Find price for ASSETUSDT
    const price = prices?.find(p => p.symbol === `${b.asset}USDT`)?.price || 0;
    return { ...b, usdValue: b.balance * price };
  }).filter(b => b.usdValue > 1) || []; // Filter out dust

  const totalValue = enhancedBalance.reduce((sum, b) => sum + b.usdValue, 0);

  // Prepare chart data
  const chartData = enhancedBalance.map(b => ({
    name: b.asset,
    value: b.usdValue
  })).sort((a, b) => b.value - a.value);

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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Total Value Card */}
        <motion.div variants={itemVariants} className="glass p-8 relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="text-[10px] tracking-widest text-white/40 uppercase mb-2 font-mono">Total Portfolio Value</div>
          <div className="text-5xl font-mono tabular tracking-tighter">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs font-mono text-white/40">
            <span className="inline-block w-2 h-2 rounded-full bg-success shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            Live Sync Active
          </div>
        </motion.div>

        {/* Allocation Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass p-6 flex flex-col md:flex-row items-center gap-8">
          <div className="h-64 w-full md:w-1/2 relative">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(3,7,18,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(12px)' }}
                    itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/20 font-mono text-xs uppercase tracking-widest">
                No assets found
              </div>
            )}
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Assets</span>
              <span className="text-xl font-mono">{chartData.length}</span>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 space-y-3">
            {chartData.slice(0, 5).map((data, index) => (
              <div key={data.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="font-bold">{data.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular">${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-xs text-white/40 font-mono">{((data.value / totalValue) * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Asset List */}
      <motion.div variants={itemVariants} className="glass overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-xs tracking-widest text-white/40 uppercase font-mono">Asset Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-white/40 font-mono tracking-widest uppercase bg-black/20 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-normal">Asset</th>
                <th className="px-6 py-4 font-normal text-right">Total Balance</th>
                <th className="px-6 py-4 font-normal text-right">Available</th>
                <th className="px-6 py-4 font-normal text-right">USD Value</th>
                <th className="px-6 py-4 font-normal text-right">Unrealized PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {enhancedBalance.map((asset) => (
                <tr key={asset.asset} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs">
                        {asset.asset.substring(0, 3)}
                      </div>
                      <span className="font-bold text-base">{asset.asset}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right tabular text-lg">{asset.balance.toFixed(asset.asset === 'USDT' ? 2 : 6)}</td>
                  <td className="px-6 py-4 text-right tabular text-white/60">{asset.available.toFixed(asset.asset === 'USDT' ? 2 : 6)}</td>
                  <td className="px-6 py-4 text-right tabular text-lg">${asset.usdValue.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right tabular">
                    {asset.unrealizedPnl !== undefined ? (
                      <span className={asset.unrealizedPnl >= 0 ? "text-success" : "text-destructive"}>
                        {asset.unrealizedPnl >= 0 ? '+' : ''}{asset.unrealizedPnl.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-white/20">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {enhancedBalance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/30 font-mono text-xs uppercase tracking-widest">
                    No balances found
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
