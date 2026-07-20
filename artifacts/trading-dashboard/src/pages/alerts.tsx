import { useState } from "react";
import { useListAlerts, useCreateAlert, useDeleteAlert } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bell, Trash2, ArrowUp, ArrowDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PAIRS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT"];

const alertSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  targetPrice: z.coerce.number().positive("Must be a positive number"),
  direction: z.enum(["ABOVE", "BELOW"]),
  message: z.string().optional(),
});

type AlertFormValues = z.infer<typeof alertSchema>;

export default function Alerts() {
  const { toast } = useToast();
  const { data: alerts, refetch } = useListAlerts();
  const createAlert = useCreateAlert();
  const deleteAlert = useDeleteAlert();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      symbol: "BTCUSDT",
      direction: "ABOVE",
    }
  });

  const direction = watch("direction");
  const symbol = watch("symbol");

  const onSubmit = (data: AlertFormValues) => {
    createAlert.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Alert created successfully" });
        reset({ symbol: data.symbol, direction: "ABOVE", targetPrice: undefined, message: "" });
        refetch();
      },
      onError: (err) => {
        toast({ title: "Failed to create alert", description: err.error, variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteAlert.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Alert removed" });
        refetch();
      }
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Create Alert Form */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass p-6 h-fit"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-primary/20 rounded text-primary">
            <Bell size={18} />
          </div>
          <h2 className="text-lg font-medium">New Alert</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Pair</label>
            <div className="grid grid-cols-4 gap-2">
              {PAIRS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue("symbol", p)}
                  className={cn(
                    "py-2 px-1 text-[10px] font-mono rounded border transition-all",
                    symbol === p 
                      ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(168,85,247,0.2)]" 
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  )}
                >
                  {p.replace('USDT', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Trigger Condition</label>
            <div className="flex p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setValue("direction", "ABOVE")}
                className={cn(
                  "flex-1 py-2 text-xs font-mono tracking-widest rounded-md flex items-center justify-center gap-2 transition-all",
                  direction === "ABOVE" ? "bg-success text-success-foreground shadow-md" : "text-white/40 hover:text-white"
                )}
              >
                <ArrowUp size={14} /> ABOVE
              </button>
              <button
                type="button"
                onClick={() => setValue("direction", "BELOW")}
                className={cn(
                  "flex-1 py-2 text-xs font-mono tracking-widest rounded-md flex items-center justify-center gap-2 transition-all",
                  direction === "BELOW" ? "bg-destructive text-destructive-foreground shadow-md" : "text-white/40 hover:text-white"
                )}
              >
                <ArrowDown size={14} /> BELOW
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Target Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono">$</span>
              <input 
                {...register("targetPrice")}
                type="number"
                step="any"
                className="w-full glass-input rounded-lg h-10 pl-8 pr-4 font-mono text-sm"
                placeholder="0.00"
              />
            </div>
            {errors.targetPrice && <span className="text-xs text-destructive">{errors.targetPrice.message}</span>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Optional Message</label>
            <input 
              {...register("message")}
              type="text"
              className="w-full glass-input rounded-lg h-10 px-4 text-sm"
              placeholder="e.g. Take partial profit"
            />
          </div>

          <button 
            type="submit"
            disabled={createAlert.isPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium tracking-wide shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {createAlert.isPending ? "Deploying Alert..." : "Deploy Alert"}
          </button>
        </form>
      </motion.div>

      {/* Active Alerts List */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="lg:col-span-2 space-y-4"
      >
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-mono tracking-widest text-white/40 uppercase">Active Monitors</h2>
          <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">{alerts?.length || 0} Total</span>
        </div>

        <AnimatePresence>
          {alerts?.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={cn(
                "glass p-4 flex items-center justify-between group",
                alert.triggered && "border-white/5 bg-white/[0.01] opacity-60"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border",
                  alert.triggered ? "bg-white/5 border-white/10 text-white/40" :
                  alert.direction === 'ABOVE' ? "bg-success/10 border-success/30 text-success shadow-[0_0_10px_rgba(16,185,129,0.2)]" : 
                  "bg-destructive/10 border-destructive/30 text-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                )}>
                  {alert.triggered ? <CheckCircle2 size={18} /> : 
                   alert.direction === 'ABOVE' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg leading-none">{alert.symbol}</span>
                    {alert.triggered && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded font-mono uppercase tracking-widest text-white/50">Triggered</span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-white/60">
                    Crosses {alert.direction} <span className="text-white tabular">${alert.targetPrice}</span>
                  </div>
                  {alert.message && (
                    <div className="text-sm text-white/80 mt-1">"{alert.message}"</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(alert.id)}
                className="p-2 text-white/20 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                title="Remove Monitor"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {alerts?.length === 0 && (
          <div className="glass p-12 text-center text-white/30 font-mono text-xs uppercase tracking-widest border-dashed border-white/10">
            No active alerts configured
          </div>
        )}
      </motion.div>

    </div>
  );
}
