import { AppLayout } from "@/components/layout/app-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePlaceOrder, OrderResult } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const orderSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").toUpperCase(),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT", "STOP_MARKET"]),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  price: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  stopPrice: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  testMode: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.orderType === "LIMIT" && !data.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Price required for LIMIT orders", path: ["price"] });
  }
  if (data.orderType === "STOP_MARKET" && !data.stopPrice) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stop price required for STOP_MARKET orders", path: ["stopPrice"] });
  }
});

type FormValues = z.infer<typeof orderSchema>;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold tracking-widest text-[#71717a] uppercase">{label}</label>
      {children}
      {error && <p className="text-[11px] text-[#f87171] font-mono">{error}</p>}
    </div>
  );
}

const inputCls = "w-full h-9 px-3 text-[13px] font-mono bg-[#0a0a0a] border border-[#1a1a1a] rounded-md text-[#e4e4e7] outline-none focus:border-[#818cf8] transition-colors placeholder:text-[#3f3f46]";
const selectCls = `${inputCls} cursor-pointer`;

export default function PlaceOrder() {
  const { toast } = useToast();
  const placeOrder = usePlaceOrder();
  const [lastResult, setLastResult] = useState<OrderResult | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { symbol: "BTCUSDT", side: "BUY", orderType: "MARKET", quantity: 0.001, testMode: true },
  });

  const side = watch("side");
  const orderType = watch("orderType");
  const testMode = watch("testMode");

  const onSubmit = (data: FormValues) => {
    setLastResult(null);
    placeOrder.mutate(
      { data: { symbol: data.symbol, side: data.side, orderType: data.orderType, quantity: data.quantity, price: data.price || null, stopPrice: data.stopPrice || null, testMode: data.testMode } },
      {
        onSuccess: (result) => {
          setLastResult(result);
          if (result.success) {
            toast({ title: "Order Placed", description: `${data.symbol} ${data.side} submitted` });
            reset({ ...data, quantity: 0, price: undefined, stopPrice: undefined });
          } else {
            toast({ variant: "destructive", title: "Order Failed", description: result.message || "Unknown error" });
          }
        },
        onError: (error) => {
          const detail = (error as any)?.data?.error || (error as any)?.data?.message || (error as any)?.message || "Failed to connect";
          toast({ variant: "destructive", title: "API Error", description: detail });
        },
      }
    );
  };

  const buyActive = side === "BUY";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 h-[calc(100vh-48px)] overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-[#f4f4f5] tracking-tight">Place Order</h1>
          <p className="text-[13px] text-[#52525b] mt-0.5">Execute a new trade on Binance Futures Testnet</p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Form */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1a1a1a]">
              <h2 className="text-[13px] font-semibold text-[#a1a1aa] tracking-wide">Order Parameters</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {/* Side toggle */}
              <div className="flex rounded-md overflow-hidden border border-[#1a1a1a]">
                {(["BUY", "SELL"] as const).map((s) => (
                  <button
                    key={s} type="button"
                    onClick={() => setValue("side", s)}
                    className={`flex-1 h-9 text-[13px] font-bold tracking-widest transition-all cursor-pointer
                      ${side === s
                        ? s === "BUY"
                          ? "bg-[rgba(52,211,153,.15)] text-[#34d399] border-r border-[#1a1a1a]"
                          : "bg-[rgba(248,113,113,.15)] text-[#f87171]"
                        : "text-[#52525b] hover:text-[#a1a1aa]"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Symbol" error={errors.symbol?.message}>
                  <input {...register("symbol")} className={inputCls} placeholder="BTCUSDT" />
                </Field>
                <Field label="Order Type" error={errors.orderType?.message}>
                  <select {...register("orderType")} className={selectCls}
                    onChange={(e) => {
                      setValue("orderType", e.target.value as any);
                      setValue("price", undefined); setValue("stopPrice", undefined);
                    }}>
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                    <option value="STOP_MARKET">STOP_MARKET</option>
                  </select>
                </Field>
              </div>

              <Field label="Quantity" error={errors.quantity?.message}>
                <input {...register("quantity")} type="number" step="any" className={inputCls} placeholder="0.001" />
              </Field>

              {orderType === "LIMIT" && (
                <Field label="Limit Price" error={errors.price?.message}>
                  <input {...register("price")} type="number" step="any" className={inputCls} placeholder="0.00" />
                </Field>
              )}

              {orderType === "STOP_MARKET" && (
                <Field label="Stop Price" error={errors.stopPrice?.message}>
                  <input {...register("stopPrice")} type="number" step="any" className={inputCls} placeholder="0.00" />
                </Field>
              )}

              {/* Test mode */}
              <div className="flex items-center justify-between p-3 bg-[#111] border border-[#1a1a1a] rounded-md">
                <div>
                  <div className="text-[11px] font-semibold text-[#fbbf24] tracking-widest uppercase">Test Mode</div>
                  <div className="text-[11px] text-[#52525b] mt-0.5">Dry-run via Binance testnet endpoint</div>
                </div>
                <button
                  type="button"
                  onClick={() => setValue("testMode", !testMode)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${testMode ? "bg-[#fbbf24]" : "bg-[#27272a]"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${testMode ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              <button
                type="submit"
                disabled={placeOrder.isPending}
                className={`w-full h-10 rounded-md font-bold text-[13px] tracking-widest transition-all cursor-pointer disabled:opacity-50
                  ${buyActive
                    ? "bg-[rgba(52,211,153,.15)] text-[#34d399] border border-[rgba(52,211,153,.3)] hover:bg-[rgba(52,211,153,.25)]"
                    : "bg-[rgba(248,113,113,.15)] text-[#f87171] border border-[rgba(248,113,113,.3)] hover:bg-[rgba(248,113,113,.25)]"}`}
              >
                {placeOrder.isPending ? "EXECUTING…" : `EXECUTE ${side}`}
              </button>
            </form>
          </div>

          {/* Result */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg flex flex-col">
            <div className="px-5 py-4 border-b border-[#1a1a1a]">
              <h2 className="text-[13px] font-semibold text-[#a1a1aa] tracking-wide">Execution Result</h2>
            </div>
            <div className="flex-1 p-5 overflow-auto">
              {!lastResult ? (
                <div className="h-full flex items-center justify-center text-[#3f3f46] font-mono text-xs border border-dashed border-[#1a1a1a] rounded-md">
                  Awaiting execution…
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`flex items-center gap-2 p-3 rounded-md border text-[13px] font-semibold
                    ${lastResult.success
                      ? "bg-[rgba(52,211,153,.08)] border-[rgba(52,211,153,.2)] text-[#34d399]"
                      : "bg-[rgba(248,113,113,.08)] border-[rgba(248,113,113,.2)] text-[#f87171]"}`}>
                    <span>{lastResult.success ? "✓" : "✗"}</span>
                    <span>{lastResult.success ? "ORDER PLACED" : "ORDER FAILED"}</span>
                  </div>
                  {lastResult.message && (
                    <p className="text-[12px] text-[#71717a] font-mono">{lastResult.message}</p>
                  )}
                  {lastResult.order && (
                    <div className="bg-[#111] border border-[#1a1a1a] rounded-md overflow-hidden">
                      {[
                        ["ORDER ID",  lastResult.orderId || lastResult.order.id],
                        ["SYMBOL",    lastResult.order.symbol],
                        ["SIDE",      lastResult.order.side],
                        ["TYPE",      lastResult.order.orderType],
                        ["QTY",       lastResult.order.quantity],
                        ["STATUS",    lastResult.status || lastResult.order.status],
                        ["TEST MODE", lastResult.order.testMode ? "YES" : "NO"],
                      ].map(([k, v], i) => (
                        <div key={i} className="flex justify-between items-center px-4 py-2.5 border-b border-[#1a1a1a] last:border-0">
                          <span className="text-[10px] font-semibold tracking-widest text-[#52525b]">{k}</span>
                          <span className={`text-[12px] font-mono font-medium
                            ${k === "SIDE" && v === "BUY" ? "text-[#34d399]"
                              : k === "SIDE" && v === "SELL" ? "text-[#f87171]"
                              : k === "STATUS" && v === "FILLED" ? "text-[#34d399]"
                              : k === "TEST MODE" && v === "YES" ? "text-[#fbbf24]"
                              : "text-[#d4d4d8]"}`}>
                            {String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
