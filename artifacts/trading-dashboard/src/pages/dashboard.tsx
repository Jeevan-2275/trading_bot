import { AppLayout } from "@/components/layout/app-layout";
import {
  useGetStats,
  useListOrders,
  useGetLogs,
  useMarketPrices,
  useAccountBalance,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderSideBadge, OrderStatusBadge, LogLevelBadge } from "@/components/ui/status-badges";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStats({ query: { refetchInterval: 10000 } });
  const { data: orders, isLoading: ordersLoading } = useListOrders({ limit: 5 }, { query: { refetchInterval: 10000 } });
  const { data: logs, isLoading: logsLoading } = useGetLogs({ limit: 10 }, { query: { refetchInterval: 10000 } });
  const { data: prices, isLoading: pricesLoading } = useMarketPrices();
  const { data: balances } = useAccountBalance();

  const usdtBalance = balances?.find((b) => b.asset === "USDT");

  // Compute simple net P&L from all orders (SELL notional - BUY notional)
  const allOrders = useListOrders({ limit: 1000 }, { query: { refetchInterval: 30000 } }).data ?? [];
  const netPnl = allOrders.reduce((acc, o) => {
    const notional = (o.quantity || 0) * (Number(o.avgPrice) || Number(o.price) || 0);
    return o.side === "SELL" ? acc + notional : acc - notional;
  }, 0);

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight mb-1 text-primary">DASHBOARD</h1>
          <p className="text-sm text-muted-foreground">Overview of trading bot performance and recent activity.</p>
        </div>

        {/* Price Ticker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pricesLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-none" />
              ))
            : prices?.map((p) => (
                <div
                  key={p.symbol}
                  className="flex items-center justify-between px-5 py-3 bg-card border border-border font-mono"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">{p.symbol}</p>
                    <p className="text-lg font-bold">
                      ${p.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-bold ${p.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {p.changePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {p.changePercent >= 0 ? "+" : ""}{p.changePercent.toFixed(2)}%
                  </div>
                </div>
              ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Orders"
            value={statsLoading ? null : stats?.total}
            icon={Activity}
            color="text-primary"
          />
          <StatCard
            title="Successful"
            value={statsLoading ? null : stats?.successful}
            icon={CheckCircle2}
            color="text-green-500"
          />
          <StatCard
            title="Failed"
            value={statsLoading ? null : stats?.failed}
            icon={XCircle}
            color="text-red-500"
          />
          <StatCard
            title="Real vs Test"
            value={statsLoading ? null : `${stats?.realOrders} / ${stats?.testOrders}`}
            icon={ArrowRightLeft}
            color="text-amber-500"
          />
        </div>

        {/* Balance + P&L row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-card border-border shadow-none rounded-none">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-mono text-muted-foreground">USDT_BALANCE</p>
                {usdtBalance != null ? (
                  <>
                    <p className="text-2xl font-mono font-bold">
                      ${usdtBalance.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      Available: ${usdtBalance.available.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-mono text-muted-foreground">—</p>
                )}
              </div>
              <div className="p-3 bg-muted/30 rounded-full text-primary">
                <Wallet size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-none rounded-none">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-mono text-muted-foreground">EST_NET_PNL</p>
                <p className={`text-2xl font-mono font-bold ${netPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {netPnl >= 0 ? "+" : ""}${Math.abs(netPnl).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-mono text-muted-foreground">SELL notional − BUY notional</p>
              </div>
              <div className={`p-3 bg-muted/30 rounded-full ${netPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {netPnl >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders Table */}
          <Card className="lg:col-span-2 bg-card border-border shadow-none rounded-none">
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-primary" />
                RECENT_ORDERS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-mono text-xs">TIME</TableHead>
                    <TableHead className="font-mono text-xs">PAIR</TableHead>
                    <TableHead className="font-mono text-xs">SIDE</TableHead>
                    <TableHead className="font-mono text-xs text-right">QTY</TableHead>
                    <TableHead className="font-mono text-xs text-right">PRICE</TableHead>
                    <TableHead className="font-mono text-xs text-right">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell colSpan={6}><Skeleton className="h-6 w-full rounded-none" /></TableCell>
                      </TableRow>
                    ))
                  ) : orders?.length === 0 ? (
                    <TableRow className="border-border hover:bg-transparent">
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-xs">
                        NO_ORDERS_FOUND
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders?.map((order) => (
                      <TableRow key={order.id} className="border-border hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), "HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-mono font-medium text-xs">{order.symbol}</TableCell>
                        <TableCell><OrderSideBadge side={order.side} /></TableCell>
                        <TableCell className="font-mono text-xs text-right">{order.quantity}</TableCell>
                        <TableCell className="font-mono text-xs text-right">
                          {order.price ? order.price.toFixed(2) : "MKT"}
                        </TableCell>
                        <TableCell className="text-right">
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Live Logs Tail */}
          <Card className="bg-[#0A0D14] border-border shadow-none rounded-none flex flex-col h-[400px]">
            <CardHeader className="border-b border-border py-4 bg-card">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <AlertTriangle size={16} className="text-primary" />
                SYSTEM_LOGS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 font-mono text-xs overflow-auto flex-1 custom-scrollbar space-y-2">
              {logsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-none bg-muted/20" />
                  <Skeleton className="h-4 w-1/2 rounded-none bg-muted/20" />
                  <Skeleton className="h-4 w-full rounded-none bg-muted/20" />
                </div>
              ) : logs?.length === 0 ? (
                <div className="text-muted-foreground">No recent logs.</div>
              ) : (
                logs?.map((log, i) => (
                  <div key={i} className="flex gap-3 whitespace-nowrap">
                    <span className="text-muted-foreground/50 shrink-0">
                      {format(new Date(log.timestamp), "HH:mm:ss")}
                    </span>
                    <LogLevelBadge level={log.level} />
                    <span className="text-muted-foreground truncate" title={log.message}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string | null;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="bg-card border-border shadow-none rounded-none">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs font-mono text-muted-foreground">{title}</p>
          {value === null ? (
            <Skeleton className="h-8 w-16 rounded-none" />
          ) : (
            <p className="text-2xl font-mono font-bold">{value}</p>
          )}
        </div>
        <div className={`p-3 bg-muted/30 rounded-full ${color}`}>
          <Icon size={24} />
        </div>
      </CardContent>
    </Card>
  );
}
