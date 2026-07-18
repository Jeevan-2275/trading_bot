import { AppLayout } from "@/components/layout/app-layout";
import { useGetLogs } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const LEVELS = ["ALL", "INFO", "WARNING", "ERROR", "DEBUG"];

function LogBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    INFO:    "text-[#60a5fa] bg-[rgba(96,165,250,.1)]",
    ERROR:   "text-[#f87171] bg-[rgba(248,113,113,.1)]",
    WARNING: "text-[#fbbf24] bg-[rgba(251,191,36,.1)]",
    WARN:    "text-[#fbbf24] bg-[rgba(251,191,36,.1)]",
    DEBUG:   "text-[#52525b] bg-[#111]",
  };
  const cls = map[level.toUpperCase()] ?? "text-[#71717a] bg-[#111]";
  const short = { WARNING: "WRN", WARN: "WRN", INFO: "INF", ERROR: "ERR", DEBUG: "DBG" }[level.toUpperCase()] ?? level.slice(0, 3).toUpperCase();
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap font-mono shrink-0 ${cls}`}>
      {short}
    </span>
  );
}

function msgColor(level: string) {
  switch (level.toUpperCase()) {
    case "ERROR":   return "text-[#f87171]";
    case "WARNING":
    case "WARN":    return "text-[#fbbf24]";
    default:        return "text-[#a1a1aa]";
  }
}

export default function Logs() {
  const [level, setLevel] = useState("ALL");
  const { data: logs, isLoading } = useGetLogs(
    { limit: 300, level: level === "ALL" ? undefined : level },
    { query: { refetchInterval: 5000 } }
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-48px)] p-5 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold text-[#f4f4f5] tracking-tight">System Logs</h1>
            <p className="text-[13px] text-[#52525b] mt-0.5">Live stream · auto-refresh 5s</p>
          </div>
          {/* Level filter */}
          <div className="flex items-center gap-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-3 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer font-mono tracking-wider
                  ${level === l
                    ? "bg-[#1a1a2e] text-[#818cf8]"
                    : "text-[#52525b] hover:text-[#a1a1aa]"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Log feed */}
        <div className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg flex flex-col overflow-hidden min-h-0">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a] shrink-0">
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#52525b]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#818cf8] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#818cf8]" />
              </span>
              bot.log
            </div>
            <span className="text-[10px] font-mono text-[#3f3f46]">
              {logs?.length ?? 0} entries
            </span>
          </div>

          {/* Entries */}
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {isLoading
              ? Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="flex gap-3 py-1 px-2">
                    <Skeleton className="h-3.5 w-20 rounded bg-[#111] shrink-0" />
                    <Skeleton className="h-3.5 w-10 rounded bg-[#111] shrink-0" />
                    <Skeleton className={`h-3.5 rounded bg-[#111] ${i % 3 === 0 ? "w-3/4" : i % 2 === 0 ? "w-1/2" : "w-full"}`} />
                  </div>
                ))
              : (logs ?? []).length === 0
              ? (
                <div className="h-full flex items-center justify-center text-[#3f3f46] font-mono text-sm">
                  No logs matching filter
                </div>
              )
              : (logs ?? []).map((log, i) => (
                  <div
                    key={i}
                    className="flex items-baseline gap-3 px-2 py-1 rounded hover:bg-white/[.03] transition-colors group"
                  >
                    <span className="text-[#52525b] font-mono text-[10px] shrink-0 w-20 tabular">
                      {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                    </span>
                    <LogBadge level={log.level} />
                    <span className="text-[#3f3f46] font-mono text-[10px] shrink-0 w-20 truncate hidden lg:block">
                      {log.filename || "server"}
                    </span>
                    <span className={`font-mono text-[11px] break-all leading-snug ${msgColor(log.level)}`}>
                      {log.message}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
