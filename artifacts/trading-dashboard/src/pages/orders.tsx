import { AppLayout } from "@/components/layout/app-layout";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderSideBadge, OrderStatusBadge } from "@/components/ui/status-badges";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Orders() {
  const { data: orders, isLoading } = useListOrders({ limit: 100 }, { query: { refetchInterval: 10000 } });
  const [search, setSearch] = useState("");

  const filteredOrders = orders?.filter(order => 
    order.symbol.toLowerCase().includes(search.toLowerCase()) || 
    order.orderId?.toLowerCase().includes(search.toLowerCase()) ||
    order.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight mb-1 text-primary">ORDER_HISTORY</h1>
            <p className="text-sm text-muted-foreground">Complete record of all placed orders and their execution status.</p>
          </div>
          <div className="w-64">
            <Input 
              placeholder="SEARCH_ORDERS..." 
              className="font-mono rounded-none border-border bg-card focus-visible:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card className="bg-card border-border shadow-none rounded-none">
          <CardHeader className="border-b border-border py-4">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <List size={16} className="text-primary" />
              ALL_ORDERS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-xs">TIME</TableHead>
                  <TableHead className="font-mono text-xs">ID</TableHead>
                  <TableHead className="font-mono text-xs">PAIR</TableHead>
                  <TableHead className="font-mono text-xs">SIDE</TableHead>
                  <TableHead className="font-mono text-xs">TYPE</TableHead>
                  <TableHead className="font-mono text-xs text-right">QTY</TableHead>
                  <TableHead className="font-mono text-xs text-right">PRICE</TableHead>
                  <TableHead className="font-mono text-xs text-right">FILLED QTY</TableHead>
                  <TableHead className="font-mono text-xs text-center">TEST</TableHead>
                  <TableHead className="font-mono text-xs text-right">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell colSpan={10}><Skeleton className="h-6 w-full rounded-none" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders?.length === 0 ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground font-mono text-xs border-dashed border">
                      NO_ORDERS_FOUND
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders?.map((order) => (
                    <TableRow key={order.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.createdAt), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[100px] truncate" title={order.orderId || String(order.id)}>
                        {order.orderId || order.id}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-xs">{order.symbol}</TableCell>
                      <TableCell><OrderSideBadge side={order.side} /></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{order.orderType}</TableCell>
                      <TableCell className="font-mono text-xs text-right">{order.quantity}</TableCell>
                      <TableCell className="font-mono text-xs text-right">
                        {order.price ? order.price.toFixed(2) : order.orderType === 'MARKET' ? 'MKT' : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-muted-foreground">
                        {order.executedQty || '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {order.testMode ? <span className="text-amber-500">TEST</span> : <span className="text-primary">REAL</span>}
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
      </div>
    </AppLayout>
  );
}
