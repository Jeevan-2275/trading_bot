import { AppLayout } from "@/components/layout/app-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetCredentialsStatus, useSaveCredentials, getGetCredentialsStatusQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const credentialsSchema = z.object({
  apiKey: z.string().min(10, "API Key must be at least 10 characters"),
  apiSecret: z.string().min(10, "API Secret must be at least 10 characters"),
});
type FormValues = z.infer<typeof credentialsSchema>;

const inputCls = "w-full h-9 px-3 text-[13px] font-mono bg-[#111] border border-[#1a1a1a] rounded-md text-[#e4e4e7] outline-none focus:border-[#818cf8] transition-colors placeholder:text-[#3f3f46] tracking-wider";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: status, isLoading } = useGetCredentialsStatus();
  const saveCredentials = useSaveCredentials();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { apiKey: "", apiSecret: "" },
  });

  const onSubmit = (data: FormValues) => {
    saveCredentials.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Credentials Saved", description: "Binance API credentials stored securely." });
        reset({ apiKey: "", apiSecret: "" });
        qc.invalidateQueries({ queryKey: getGetCredentialsStatusQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Save Failed", description: "An error occurred while saving credentials." });
      },
    });
  };

  const configured = status?.configured;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6 h-[calc(100vh-48px)] overflow-y-auto space-y-5">
        <div>
          <h1 className="text-lg font-bold text-[#f4f4f5] tracking-tight">Settings</h1>
          <p className="text-[13px] text-[#52525b] mt-0.5">Configure Binance Futures Testnet connection</p>
        </div>

        {/* Connection status */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a]">
            <h2 className="text-[13px] font-semibold text-[#a1a1aa] tracking-wide">Connection Status</h2>
          </div>
          <div className="p-5">
            {isLoading ? (
              <Skeleton className="h-16 w-full rounded-md bg-[#111]" />
            ) : configured ? (
              <div className="flex items-start gap-3 p-4 bg-[rgba(52,211,153,.06)] border border-[rgba(52,211,153,.2)] rounded-md">
                <span className="text-[#34d399] text-lg leading-none mt-0.5">✓</span>
                <div>
                  <div className="text-[13px] font-semibold text-[#34d399]">API Configured</div>
                  <div className="text-[12px] text-[#34d399]/70 mt-1 font-mono">
                    Key: {status.hasApiKey ? "present" : "missing"} · Secret: {status.hasApiSecret ? "present" : "missing"}
                  </div>
                  <div className="text-[11px] text-[#52525b] mt-2">Bot is connected and ready to trade on Binance Futures Testnet.</div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-[rgba(248,113,113,.06)] border border-[rgba(248,113,113,.2)] rounded-md">
                <span className="text-[#f87171] text-lg leading-none mt-0.5">✗</span>
                <div>
                  <div className="text-[13px] font-semibold text-[#f87171]">Not Configured</div>
                  <div className="text-[11px] text-[#52525b] mt-2">Binance API credentials are missing. Add them below to enable trading.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Credentials form */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a]">
            <h2 className="text-[13px] font-semibold text-[#a1a1aa] tracking-wide">API Credentials</h2>
            <p className="text-[11px] text-[#52525b] mt-1">Keys are stored server-side and never exposed to the browser.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold tracking-widest text-[#71717a] uppercase">Binance API Key</label>
              <input
                {...register("apiKey")}
                type="password"
                placeholder="Enter your API key"
                className={inputCls}
              />
              {errors.apiKey && <p className="text-[11px] text-[#f87171] font-mono">{errors.apiKey.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold tracking-widest text-[#71717a] uppercase">Binance API Secret</label>
              <input
                {...register("apiSecret")}
                type="password"
                placeholder="Enter your API secret"
                className={inputCls}
              />
              {errors.apiSecret && <p className="text-[11px] text-[#f87171] font-mono">{errors.apiSecret.message}</p>}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-[rgba(251,191,36,.06)] border border-[rgba(251,191,36,.2)] rounded-md">
              <span className="text-[#fbbf24] text-sm leading-none mt-0.5">⚠</span>
              <p className="text-[11px] text-[#71717a]">
                Use Binance <strong className="text-[#fbbf24]">Testnet</strong> API keys only. Real-account keys will not work and may trigger unintended trades.
              </p>
            </div>

            <button
              type="submit"
              disabled={saveCredentials.isPending}
              className="h-9 px-5 bg-[#1e1b4b] border border-[#818cf8]/30 text-[#818cf8] text-[13px] font-semibold rounded-md
                         hover:bg-[#2e2a6b] hover:border-[#818cf8]/60 transition-all cursor-pointer disabled:opacity-50 tracking-wide"
            >
              {saveCredentials.isPending ? "Saving…" : "Update Credentials"}
            </button>
          </form>
        </div>

        {/* About */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-5 space-y-3">
          <h2 className="text-[13px] font-semibold text-[#a1a1aa] tracking-wide">About</h2>
          <div className="space-y-2">
            {[
              ["Application", "QuantTerm PRO"],
              ["Network",     "Binance Futures Testnet"],
              ["Version",     "v1.4.0"],
              ["Runtime",     "Node.js · Express · React"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-[#111] last:border-0">
                <span className="text-[11px] font-semibold tracking-widest text-[#52525b] uppercase">{k}</span>
                <span className="text-[12px] font-mono text-[#71717a]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
