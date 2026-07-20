import { useState, useEffect, useRef } from "react";
import { useGetLogs } from "@workspace/api-client-react";
import { Terminal, ShieldAlert, Info, AlertTriangle, Bug, Pause, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const LEVELS = ["ALL", "INFO", "WARNING", "ERROR", "DEBUG"];

export default function Logs() {
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Use lower limit initially to prevent huge payload, query handles the polling
  const { data: newLogs } = useGetLogs(
    { limit: 100, level: levelFilter === "ALL" ? undefined : levelFilter.toLowerCase() },
    { query: { refetchInterval: isPaused ? false : 2000 } }
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Append new logs without resetting entirely
  useEffect(() => {
    if (newLogs && !isPaused) {
      setLogs(newLogs); // The API returns the latest, so we just replace for simplicity in this demo
    }
  }, [newLogs, isPaused]);

  // Handle auto-scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If user scrolls up significantly, disable auto-scroll
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const getLevelIcon = (level: string) => {
    switch(level.toUpperCase()) {
      case 'ERROR': return <ShieldAlert size={14} className="text-destructive" />;
      case 'WARNING': return <AlertTriangle size={14} className="text-warning" />;
      case 'DEBUG': return <Bug size={14} className="text-primary" />;
      default: return <Info size={14} className="text-info" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch(level.toUpperCase()) {
      case 'ERROR': return "text-destructive bg-destructive/10 border-destructive/20";
      case 'WARNING': return "text-warning bg-warning/10 border-warning/20";
      case 'DEBUG': return "text-primary bg-primary/10 border-primary/20";
      default: return "text-info bg-info/10 border-info/20";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] glass overflow-hidden">
      
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-white/5 bg-black/40 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Terminal className="text-white/40" size={18} />
          <h2 className="font-mono text-sm tracking-widest uppercase">System Log Stream</h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest transition-colors",
                  levelFilter === l ? "bg-white/20 text-white" : "text-white/40 hover:text-white hover:bg-white/10"
                )}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-l border-white/10 pl-6">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-widest border transition-colors",
                isPaused ? "bg-warning/20 border-warning/50 text-warning" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={() => setLogs([])}
              className="p-1.5 text-white/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              title="Clear View"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Log Output Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-[#050505] p-4 font-mono text-xs custom-scrollbar relative"
      >
        {!autoScroll && (
          <button 
            onClick={() => setAutoScroll(true)}
            className="sticky top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-white/10 backdrop-blur border border-white/20 text-white rounded-full text-[10px] uppercase tracking-widest shadow-lg animate-bounce"
          >
            ↓ Scroll to Bottom
          </button>
        )}

        <div className="space-y-1.5 min-h-full flex flex-col justify-end">
          {logs.map((log, i) => (
            <div 
              key={`${log.timestamp}-${i}`} 
              className={cn(
                "flex items-start gap-3 px-2 py-1 rounded hover:bg-white/[0.02] transition-colors border-l-2 border-transparent",
                log.level.toUpperCase() === 'ERROR' && "border-destructive bg-destructive/[0.02]"
              )}
            >
              <span className="text-white/30 shrink-0 w-[140px]">
                {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
              </span>
              
              <div className="shrink-0 w-[90px] flex items-center gap-1.5">
                {getLevelIcon(log.level)}
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] tracking-widest border",
                  getLevelColor(log.level)
                )}>
                  {log.level.toUpperCase()}
                </span>
              </div>

              {log.filename && (
                <span className="text-white/40 shrink-0 w-[120px] truncate" title={log.filename}>
                  [{log.filename}]
                </span>
              )}
              
              <span className={cn(
                "break-all whitespace-pre-wrap",
                log.level.toUpperCase() === 'ERROR' ? "text-destructive/90" : 
                log.level.toUpperCase() === 'WARNING' ? "text-warning/90" : "text-white/70"
              )}>
                {log.message}
              </span>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="h-full flex items-center justify-center flex-col text-white/20 p-12">
              <Terminal size={32} className="mb-4 opacity-50" />
              <div className="uppercase tracking-widest text-xs">Waiting for stream data...</div>
            </div>
          )}
          
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
