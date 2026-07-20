import { useState, useEffect } from "react";
import { useGetCredentialsStatus, useSaveCredentials } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { KeyRound, ShieldCheck, Server, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const credsSchema = z.object({
  apiKey: z.string().min(10, "API Key is too short"),
  apiSecret: z.string().min(10, "API Secret is too short"),
});

type CredsFormValues = z.infer<typeof credsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { data: status, refetch } = useGetCredentialsStatus();
  const saveCredentials = useSaveCredentials();

  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CredsFormValues>({
    resolver: zodResolver(credsSchema)
  });

  const onSubmit = (data: CredsFormValues) => {
    saveCredentials.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Credentials saved securely" });
        reset();
        refetch();
      },
      onError: (err: any) => {
        toast({ title: "Failed to save credentials", description: err.error, variant: "destructive" });
      }
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div className="max-w-4xl mx-auto space-y-6" variants={containerVariants} initial="hidden" animate="show">
      
      <motion.div variants={itemVariants} className="glass overflow-hidden relative">
        {/* Status Indicator Bar */}
        <div className={cn(
          "absolute top-0 inset-x-0 h-1",
          status?.configured ? "bg-success shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-warning shadow-[0_0_20px_rgba(245,158,11,0.5)]"
        )} />

        <div className="p-8 border-b border-white/5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <KeyRound className="text-primary" size={24} />
              <h2 className="text-xl font-medium tracking-tight">Exchange Connection</h2>
            </div>
            <p className="text-sm text-white/40 font-mono">Configure Binance Testnet API credentials for live execution and data streaming.</p>
          </div>
          
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
            status?.configured ? "bg-success/10 border-success/30 text-success" : "bg-warning/10 border-warning/30 text-warning"
          )}>
            <ShieldCheck size={16} />
            <span className="text-xs font-mono font-bold tracking-widest uppercase">
              {status?.configured ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
            
            {status?.configured && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 font-mono flex items-start gap-3 mb-8">
                <ShieldCheck className="text-success shrink-0 mt-0.5" size={16} />
                <p>Keys are currently configured and encrypted on the server. Submitting this form will overwrite the existing credentials.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">API Key</label>
              <div className="relative">
                <input 
                  {...register("apiKey")}
                  type={showKey ? "text" : "password"}
                  className="w-full glass-input rounded-lg h-12 px-4 font-mono pr-12"
                  placeholder="Enter Binance Testnet API Key"
                  autoComplete="off"
                />
                <button 
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.apiKey && <span className="text-xs text-destructive">{errors.apiKey.message}</span>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Secret Key</label>
              <div className="relative">
                <input 
                  {...register("apiSecret")}
                  type={showSecret ? "text" : "password"}
                  className="w-full glass-input rounded-lg h-12 px-4 font-mono pr-12"
                  placeholder="Enter Binance Testnet Secret Key"
                  autoComplete="off"
                />
                <button 
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.apiSecret && <span className="text-xs text-destructive">{errors.apiSecret.message}</span>}
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={saveCredentials.isPending}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-bold tracking-widest text-sm shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saveCredentials.isPending ? "ENCRYPTING..." : "SAVE CREDENTIALS"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-6">
            <Server className="text-white/40" size={20} />
            <h3 className="font-medium tracking-tight">System Environment</h3>
          </div>
          
          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/40">Network Target</span>
              <span className="text-success">Binance Testnet</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/40">Frontend Version</span>
              <span className="text-white/80">v1.2.0-glass</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/40">Backend Engine</span>
              <span className="text-white/80">FastAPI / Python 3.11</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-white/40">Strategy Aggregator</span>
              <span className="text-primary">Online</span>
            </div>
          </div>
        </div>

        <div className="glass p-6 bg-warning/5 border-warning/20">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-warning" size={20} />
            <h3 className="font-medium tracking-tight text-warning">Security Notice</h3>
          </div>
          <div className="text-sm text-warning/80 leading-relaxed space-y-4">
            <p>
              This application is hardcoded to connect to the Binance Testnet. Real funds are not at risk, but you must generate Testnet-specific API keys.
            </p>
            <p>
              API keys are encrypted at rest on the backend server. Never share your secret key or commit it to version control.
            </p>
            <a 
              href="https://testnet.binance.vision/" 
              target="_blank" 
              rel="noreferrer"
              className="inline-block mt-2 text-warning hover:text-warning/80 underline underline-offset-4 font-mono text-xs"
            >
              Generate Testnet Keys →
            </a>
          </div>
        </div>

      </motion.div>

    </motion.div>
  );
}
