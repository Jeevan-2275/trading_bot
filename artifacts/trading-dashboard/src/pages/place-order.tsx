import { useState, useMemo } from "react";
import { usePlaceOrder, useMarketPrices, useAccountBalance } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ShieldAlert, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PAIRS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT"];

const orderSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT", "STOP_MARKET"]),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  price: z.coerce.number().positive().optional().nullable(),
  stopPrice: z.coerce.number().positive().optional().nullable(),
  testMode: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.orderType === "LIMIT" && !data.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Limit price required", path: ["price"] });
  }
  if (data.orderType === "STOP_MARKET" && !data.stopPrice) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stop price required", path: ["stopPrice"] });
  }
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function PlaceOrder() {
  const { toast } = useToast();
  const placeOrder = usePlaceOrder();
  const { data: prices } = useMarketPrices({ query: { refetchInterval: 2000 } });
  const { data: balances } = useAccountBalance();

  const [riskReward, setRiskReward] = useState<number>(2);

  const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      symbol: "BTCUSDT",
      side: "BUY",
      orderType: "MARKET",
      quantity: 0.01,
      testMode: true,
    },
    mode: "onChange"
  });

  const side = watch("side");
  const symbol = watch("symbol");
  const orderType = watch("orderType");
  const quantity = watch("quantity");
  const price = watch("price");
  const testMode = watch("testMode");

  const currentPriceObj = prices?.find(p => p.symbol === symbol);
  const currentPrice = currentPriceObj?.price || 0;
  
  // Calculate execution price depending on order type
  const executionPrice = orderType === 'MARKET' ? currentPrice : (price || currentPrice);
  const notionalValue = quantity && executionPrice ? quantity * executionPrice : 0;
  const estimatedFee = notionalValue * 0.0004; // 0.04% maker/taker avg

  // Find balances
  const baseAsset = symbol.replace('USDT', '');
  const usdtBalance = balances?.find(b => b.asset === 'USDT')?.available || 0;
  const baseBalance = balances?.find(b => b.asset === baseAsset)?.available || 0;

  const onSubmit = (data: OrderFormValues) => {
    placeOrder.mutate({ data }, {
      onSuccess: (res) => {
        toast({
          title: "Order Executed",
          description: res.message || `${data.side} ${data.quantity} ${data.symbol}`,
          variant: data.side === 'BUY' ? "default" : "destructive" // using destructive just for color in toast
        });
      },
      onError: (err) => {
        toast({
          title: "Execution Failed",
          description: err.error,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-6xl mx-auto">
      
      {/* Execution Terminal */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-7 glass relative overflow-hidden"
      >
        <div className={cn(
          "absolute top-0 inset-x-0 h-1 transition-colors duration-500",
          side === 'BUY' ? "bg-success" : "bg-destructive"
        )} />
        
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
          <h2 className="font-mono tracking-widest uppercase text-white/40 text-xs">Terminal Input</h2>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Mode</span>
            <button
              type="button"
              onClick={() => setValue("testMode", !testMode)}
              className={cn(
                "px-3 py-1 rounded text-xs font-mono tracking-widest font-bold border transition-all",
                testMode ? "bg-warning/20 border-warning/50 text-warning shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "bg-destructive/20 border-destructive/50 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              )}
            >
              {testMode ? "PAPER" : "LIVE"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
          
          {/* Symbol Select */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Market Pair</label>
              {currentPriceObj && (
                <div className="text-right">
                  <div className="font-mono text-lg tabular leading-none">${currentPrice.toFixed(2)}</div>
                  <div className={cn(
                    "text-[10px] font-mono tracking-wider",
                    currentPriceObj.changePercent >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {currentPriceObj.changePercent > 0 ? '+' : ''}{currentPriceObj.changePercent.toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PAIRS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue("symbol", p)}
                  className={cn(
                    "py-3 px-1 text-xs font-mono font-bold rounded-lg border transition-all",
                    symbol === p 
                      ? "bg-white/10 border-white/20 text-white shadow-inner" 
                      : "bg-black/20 border-white/5 text-white/40 hover:bg-white/5 hover:text-white/80"
                  )}
                >
                  {p.replace('USDT', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Side Toggle */}
          <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner">
            <button
              type="button"
              onClick={() => setValue("side", "BUY")}
              className={cn(
                "flex-1 py-4 rounded-lg font-bold tracking-widest transition-all",
                side === "BUY" ? "bg-success text-success-foreground shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "text-white/40 hover:text-white"
              )}
            >
              LONG / BUY
            </button>
            <button
              type="button"
              onClick={() => setValue("side", "SELL")}
              className={cn(
                "flex-1 py-4 rounded-lg font-bold tracking-widest transition-all",
                side === "SELL" ? "bg-destructive text-destructive-foreground shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "text-white/40 hover:text-white"
              )}
            >
              SHORT / SELL
            </button>
          </div>

          {/* Type Tabs */}
          <div className="space-y-3">
            <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Order Type</label>
            <div className="flex border-b border-white/10">
              {["MARKET", "LIMIT", "STOP_MARKET"].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue("orderType", type as any)}
                  className={cn(
                    "px-4 py-2 text-xs font-mono tracking-widest uppercase border-b-2 transition-colors",
                    orderType === type ? "border-primary text-white" : "border-transparent text-white/40 hover:text-white/80"
                  )}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Size ({baseAsset})</label>
                <span className="text-[10px] font-mono text-white/40">Avail: {baseBalance.toFixed(4)}</span>
              </div>
              <input 
                {...register("quantity")}
                type="number"
                step="any"
                className="w-full bg-black/40 border border-white/10 rounded-lg h-12 px-4 font-mono text-lg focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
              {errors.quantity && <span className="text-xs text-destructive">{errors.quantity.message}</span>}
            </div>

            <AnimatePresence mode="wait">
              {orderType === 'LIMIT' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-2"
                >
                  <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Limit Price (USDT)</label>
                  <input 
                    {...register("price")}
                    type="number"
                    step="any"
                    className="w-full bg-black/40 border border-white/10 rounded-lg h-12 px-4 font-mono text-lg focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder={currentPrice.toFixed(2)}
                  />
                  {errors.price && <span className="text-xs text-destructive">{errors.price.message}</span>}
                </motion.div>
              )}

              {orderType === 'STOP_MARKET' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-2"
                >
                  <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Stop Price (USDT)</label>
                  <input 
                    {...register("stopPrice")}
                    type="number"
                    step="any"
                    className="w-full bg-black/40 border border-white/10 rounded-lg h-12 px-4 font-mono text-lg focus:border-warning/50 focus:ring-1 focus:ring-warning/50 transition-all"
                  />
                  {errors.stopPrice && <span className="text-xs text-destructive">{errors.stopPrice.message}</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!testMode && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-destructive/90 leading-relaxed">
                <strong>LIVE TRADING ENABLED.</strong> This order will execute on the real network using your configured API keys. Ensure size and price are correct.
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={placeOrder.isPending || !isValid}
            className={cn(
              "w-full py-4 rounded-xl font-bold tracking-widest text-lg shadow-lg transition-all flex items-center justify-center gap-2",
              side === 'BUY' 
                ? "bg-success text-success-foreground hover:bg-success/90 shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:bg-success/50" 
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_30px_rgba(239,68,68,0.3)] disabled:bg-destructive/50"
            )}
          >
            {placeOrder.isPending ? (
              <span className="animate-pulse">TRANSMITTING...</span>
            ) : (
              <>
                <Zap size={20} />
                EXECUTE {side}
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Risk Calculator */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-5 space-y-6"
      >
        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-6 text-white/40">
            <Calculator size={16} />
            <h3 className="text-xs tracking-widest uppercase font-mono">Risk Projection</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/5 rounded-lg">
              <span className="text-sm text-white/60">Notional Value</span>
              <span className="font-mono tabular text-lg">${notionalValue.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/5 rounded-lg">
              <span className="text-sm text-white/60">Est. Exchange Fee</span>
              <span className="font-mono tabular text-warning">~${estimatedFee.toFixed(4)}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/5 rounded-lg">
              <span className="text-sm text-white/60">Margin Req (1x)</span>
              <div className="text-right">
                <div className="font-mono tabular">${notionalValue.toFixed(2)}</div>
                <div className={cn(
                  "text-[10px] font-mono",
                  usdtBalance >= notionalValue ? "text-success" : "text-destructive"
                )}>
                  Avail: ${usdtBalance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs tracking-widest text-white/40 uppercase font-mono">R:R Target</span>
              <span className="font-mono text-primary font-bold">1 : {riskReward}</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="5" 
              step="0.1"
              value={riskReward}
              onChange={(e) => setRiskReward(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
                <div className="text-[10px] text-destructive uppercase tracking-widest font-mono mb-1">Stop Loss (-1%)</div>
                <div className="font-mono text-sm">${(executionPrice * (side === 'BUY' ? 0.99 : 1.01)).toFixed(2)}</div>
              </div>
              <div className="p-3 border border-success/20 bg-success/5 rounded-lg">
                <div className="text-[10px] text-success uppercase tracking-widest font-mono mb-1">Take Profit (+{riskReward}%)</div>
                <div className="font-mono text-sm">${(executionPrice * (side === 'BUY' ? (1 + riskReward/100) : (1 - riskReward/100))).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-6 bg-black/40">
          <div className="flex items-start gap-3 text-white/40">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <div className="text-[10px] font-mono leading-relaxed uppercase tracking-widest">
              Execution is routed via direct API connection. Ensure API keys are properly permissioned for spot/margin trading depending on intent.
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
