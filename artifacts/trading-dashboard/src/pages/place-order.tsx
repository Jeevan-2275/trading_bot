import { AppLayout } from "@/components/layout/app-layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePlaceOrder, OrderResult } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { TerminalSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const orderSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").toUpperCase(),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT", "STOP_MARKET"]),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  price: z.coerce.number().positive("Price must be positive").optional().or(z.literal("").transform(() => undefined)),
  stopPrice: z.coerce.number().positive("Stop Price must be positive").optional().or(z.literal("").transform(() => undefined)),
  testMode: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.orderType === "LIMIT" && !data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Price is required for LIMIT orders",
      path: ["price"],
    });
  }
  if (data.orderType === "STOP_MARKET" && !data.stopPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Stop Price is required for STOP_MARKET orders",
      path: ["stopPrice"],
    });
  }
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function PlaceOrder() {
  const { toast } = useToast();
  const placeOrder = usePlaceOrder();
  const [lastResult, setLastResult] = useState<OrderResult | null>(null);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      symbol: "BTCUSDT",
      side: "BUY",
      orderType: "MARKET",
      quantity: 0.001,
      testMode: true,
      price: undefined,
      stopPrice: undefined,
    },
  });

  const orderType = form.watch("orderType");

  const onSubmit = (data: OrderFormValues) => {
    setLastResult(null);
    placeOrder.mutate({
      data: {
        symbol: data.symbol,
        side: data.side,
        orderType: data.orderType,
        quantity: data.quantity,
        price: data.price || null,
        stopPrice: data.stopPrice || null,
        testMode: data.testMode,
      }
    }, {
      onSuccess: (result) => {
        setLastResult(result);
        if (result.success) {
          toast({
            title: "Order Placed",
            description: `Order successfully placed for ${data.symbol}`,
          });
          form.reset({
            ...data,
            quantity: 0,
            price: undefined,
            stopPrice: undefined,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Order Failed",
            description: result.message || "Unknown error occurred",
          });
        }
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "API Error",
          description: error?.error || "Failed to connect to API",
        });
      }
    });
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight mb-1 text-primary">PLACE_ORDER</h1>
          <p className="text-sm text-muted-foreground">Execute a new quantitative trade.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-card border-border shadow-none rounded-none">
            <CardHeader className="border-b border-border bg-card/50">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <TerminalSquare size={16} className="text-primary" />
                ORDER_PARAMETERS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs">SYMBOL</FormLabel>
                          <FormControl>
                            <Input className="font-mono rounded-none border-border focus-visible:ring-primary" placeholder="BTCUSDT" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="side"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs">SIDE</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="font-mono rounded-none border-border">
                                <SelectValue placeholder="Select side" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-none font-mono">
                              <SelectItem value="BUY" className="text-green-500">BUY</SelectItem>
                              <SelectItem value="SELL" className="text-red-500">SELL</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="orderType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs">TYPE</FormLabel>
                          <Select onValueChange={(val) => {
                            field.onChange(val);
                            if (val === "MARKET") {
                              form.setValue("price", undefined);
                              form.setValue("stopPrice", undefined);
                            }
                          }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="font-mono rounded-none border-border">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-none font-mono">
                              <SelectItem value="MARKET">MARKET</SelectItem>
                              <SelectItem value="LIMIT">LIMIT</SelectItem>
                              <SelectItem value="STOP_MARKET">STOP_MARKET</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs">QUANTITY</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" className="font-mono rounded-none border-border" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {orderType === "LIMIT" && (
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs">LIMIT PRICE</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" className="font-mono rounded-none border-border" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {orderType === "STOP_MARKET" && (
                    <FormField
                      control={form.control}
                      name="stopPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs">STOP PRICE</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" className="font-mono rounded-none border-border" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="p-4 border border-border bg-muted/20">
                    <FormField
                      control={form.control}
                      name="testMode"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="font-mono text-xs text-amber-500">TEST MODE (DRY RUN)</FormLabel>
                            <FormDescription className="text-xs">
                              Send order to Binance testnet endpoint
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-amber-500"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={placeOrder.isPending}
                    className="w-full rounded-none font-mono tracking-wider font-bold"
                    variant={form.watch("side") === "BUY" ? "default" : "destructive"}
                  >
                    {placeOrder.isPending ? "EXECUTING..." : `EXECUTE ${form.watch("side")}`}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-card border-border shadow-none rounded-none h-full max-h-[500px] flex flex-col">
              <CardHeader className="border-b border-border bg-card/50">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <TerminalSquare size={16} className="text-primary" />
                  EXECUTION_RESULT
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 overflow-auto custom-scrollbar">
                {!lastResult ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs text-center border border-dashed border-border p-8">
                    AWAITING_EXECUTION
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert variant={lastResult.success ? "default" : "destructive"} className="rounded-none border-border bg-card">
                      {lastResult.success ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                      <AlertTitle className="font-mono text-xs mb-2">
                        {lastResult.success ? "EXECUTION_SUCCESS" : "EXECUTION_FAILED"}
                      </AlertTitle>
                      <AlertDescription className="font-mono text-xs">
                        {lastResult.message || (lastResult.success ? "Order placed successfully" : "Failed to place order")}
                      </AlertDescription>
                    </Alert>

                    {lastResult.order && (
                      <div className="space-y-2 text-sm font-mono border border-border p-4 bg-muted/10">
                        <div className="flex justify-between border-b border-border/50 pb-1">
                          <span className="text-muted-foreground">ORDER_ID</span>
                          <span className="font-bold">{lastResult.orderId || lastResult.order.id}</span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-1">
                          <span className="text-muted-foreground">STATUS</span>
                          <span className={lastResult.status === "FILLED" ? "text-green-500" : ""}>
                            {lastResult.status || lastResult.order.status}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-1">
                          <span className="text-muted-foreground">SYMBOL</span>
                          <span>{lastResult.order.symbol}</span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-1">
                          <span className="text-muted-foreground">SIDE</span>
                          <span className={lastResult.order.side === "BUY" ? "text-green-500" : "text-red-500"}>
                            {lastResult.order.side}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-1">
                          <span className="text-muted-foreground">TYPE</span>
                          <span>{lastResult.order.orderType}</span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-1">
                          <span className="text-muted-foreground">QTY</span>
                          <span>{lastResult.order.quantity}</span>
                        </div>
                        {lastResult.order.price && (
                          <div className="flex justify-between border-b border-border/50 pb-1">
                            <span className="text-muted-foreground">PRICE</span>
                            <span>{lastResult.order.price}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1">
                          <span className="text-muted-foreground">TEST_MODE</span>
                          <span className={lastResult.order.testMode ? "text-amber-500" : "text-green-500"}>
                            {lastResult.order.testMode ? "TRUE" : "FALSE"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
