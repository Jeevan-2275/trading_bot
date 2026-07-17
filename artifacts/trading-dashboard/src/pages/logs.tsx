import { AppLayout } from "@/components/layout/app-layout";
import { useGetLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogLevelBadge } from "@/components/ui/status-badges";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { TerminalSquare, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Logs() {
  const [level, setLevel] = useState<string>("ALL");
  const { data: logs, isLoading } = useGetLogs(
    { limit: 200, level: level === "ALL" ? undefined : level }, 
    { query: { refetchInterval: 5000 } }
  );

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6 h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex justify-between items-end shrink-0">
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight mb-1 text-primary">SYSTEM_LOGS</h1>
            <p className="text-sm text-muted-foreground">Live stream of trading bot backend logs.</p>
          </div>
          <div className="flex items-center gap-3">
            <Filter size={16} className="text-muted-foreground" />
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-32 font-mono rounded-none border-border bg-card">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent className="rounded-none font-mono">
                <SelectItem value="ALL">ALL LEVELS</SelectItem>
                <SelectItem value="INFO" className="text-cyan-500">INFO</SelectItem>
                <SelectItem value="WARNING" className="text-amber-500">WARNING</SelectItem>
                <SelectItem value="ERROR" className="text-red-500">ERROR</SelectItem>
                <SelectItem value="DEBUG" className="text-slate-500">DEBUG</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="bg-[#0A0D14] border-border shadow-none rounded-none flex-1 flex flex-col overflow-hidden">
          <CardHeader className="border-b border-border py-4 bg-card shrink-0">
            <CardTitle className="text-sm font-mono flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TerminalSquare size={16} className="text-primary" />
                bot.log
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                LIVE
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 font-mono text-xs overflow-auto flex-1 custom-scrollbar space-y-1.5 leading-relaxed">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-24 rounded-none bg-muted/20 shrink-0" />
                    <Skeleton className="h-4 w-16 rounded-none bg-muted/20 shrink-0" />
                    <Skeleton className={`h-4 rounded-none bg-muted/20 ${i % 3 === 0 ? 'w-3/4' : i % 2 === 0 ? 'w-1/2' : 'w-full'}`} />
                  </div>
                ))}
              </div>
            ) : logs?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground border border-dashed border-border/50">
                NO_LOGS_MATCHING_FILTER
              </div>
            ) : (
              logs?.map((log, i) => (
                <div key={i} className="flex gap-4 hover:bg-white/5 px-2 py-0.5 -mx-2 transition-colors rounded">
                  <span className="text-muted-foreground/50 shrink-0 w-24">
                    {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                  </span>
                  <div className="shrink-0 w-16">
                    <LogLevelBadge level={log.level} />
                  </div>
                  <span className="text-muted-foreground/40 shrink-0 w-24 truncate hidden md:block">
                    {log.filename || 'unknown'}
                  </span>
                  <span className={`break-all ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARNING' ? 'text-amber-400' : 'text-slate-300'}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
