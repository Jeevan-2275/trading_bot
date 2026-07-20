import { useEffect, useRef, useState } from "react";
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  CandlestickSeries, HistogramSeries,
  type IChartApi, type ISeriesApi, type CandlestickData, type HistogramData,
} from "lightweight-charts";
import { useGetKlines, useMarketPrices } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

const SYMBOLS = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT"];
const INTERVALS = [
  { label: "1m",  value: "1m"  },
  { label: "5m",  value: "5m"  },
  { label: "15m", value: "15m" },
  { label: "1h",  value: "1h"  },
  { label: "4h",  value: "4h"  },
  { label: "1d",  value: "1d"  },
];

interface Kline { openTime: number; open: number; high: number; low: number; close: number; volume: number }

export default function CandlestickChart({
  className, defaultSymbol = "BTCUSDT"
}: { className?: string; defaultSymbol?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef       = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [symbol,   setSymbol]   = useState(defaultSymbol);
  const [interval, setInterval] = useState("1h");
  const [hover, setHover] = useState<{ o: number; h: number; l: number; c: number } | null>(null);

  const { data: prices } = useMarketPrices({ query: { refetchInterval: 5_000 } });
  const livePrice = prices?.find(p => p.symbol === symbol);

  const { data: klines, isFetching } = useGetKlines(
    { symbol, interval, limit: 200 },
    { query: { refetchInterval: 30_000, staleTime: 20_000 } }
  );

  /* ── init chart exactly once ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.35)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)", style: LineStyle.Dotted },
        horzLines: { color: "rgba(255,255,255,0.04)", style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(168,85,247,0.6)", labelBackgroundColor: "#7c3aed", width: 1 },
        horzLine: { color: "rgba(168,85,247,0.6)", labelBackgroundColor: "#7c3aed", width: 1 },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
      width:  el.clientWidth,
      height: el.clientHeight || 360,
    });
    chartRef.current = chart;

    /* v5 API: chart.addSeries(SeriesDefinition, options) */
    const candle = chart.addSeries(CandlestickSeries, {
      upColor:        "#10b981",
      downColor:      "#ef4444",
      borderUpColor:  "#10b981",
      borderDownColor:"#ef4444",
      wickUpColor:    "rgba(16,185,129,0.8)",
      wickDownColor:  "rgba(239,68,68,0.8)",
    });
    candleRef.current = candle;

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      borderColor: "transparent",
    });
    volRef.current = vol;

    /* crosshair hover */
    chart.subscribeCrosshairMove(param => {
      if (!param.time) { setHover(null); return; }
      const bar = param.seriesData.get(candle) as CandlestickData | undefined;
      if (bar) setHover({ o: bar.open, h: bar.high, l: bar.low, c: bar.close });
    });

    /* resize */
    const onResize = () => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight || 360 });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      candleRef.current = null;
      volRef.current    = null;
    };
  }, []);

  /* ── feed data whenever klines change ── */
  useEffect(() => {
    if (!klines || !candleRef.current || !volRef.current) return;
    const raw = klines as unknown as Kline[];

    const cData: CandlestickData[] = raw.map(k => ({
      time:  Math.floor(k.openTime / 1000) as unknown as CandlestickData["time"],
      open:  k.open, high: k.high, low: k.low, close: k.close,
    }));
    const vData: HistogramData[] = raw.map(k => ({
      time:  Math.floor(k.openTime / 1000) as unknown as HistogramData["time"],
      value: k.volume,
      color: k.close >= k.open ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
    }));

    candleRef.current.setData(cData);
    volRef.current.setData(vData);
    chartRef.current?.timeScale().fitContent();
  }, [klines]);

  const displayPrice = hover?.c ?? livePrice?.price ?? 0;
  const pctChange    = livePrice?.changePercent ?? 0;
  const isUp         = hover ? hover.c >= hover.o : pctChange >= 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* ── toolbar ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3 flex-shrink-0">
        {/* price readout */}
        <div className="flex items-end gap-4">
          <div>
            <div className="text-[10px] tracking-widest text-white/40 uppercase font-mono mb-0.5">
              {symbol.replace("USDT","")} / USDT
            </div>
            <div className="text-3xl font-mono tabular font-bold leading-none">
              ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </div>
          </div>
          {hover ? (
            <div className="flex gap-3 text-[10px] font-mono pb-0.5 text-white/40">
              <span>O <span className="text-white/70">${hover.o.toFixed(2)}</span></span>
              <span>H <span className="text-emerald-400">${hover.h.toFixed(2)}</span></span>
              <span>L <span className="text-red-400">${hover.l.toFixed(2)}</span></span>
              <span>C <span className="text-white/70">${hover.c.toFixed(2)}</span></span>
            </div>
          ) : (
            <div className={cn("text-sm font-mono pb-0.5 font-bold", isUp ? "text-emerald-400" : "text-red-400")}>
              {isUp ? "▲" : "▼"} {Math.abs(pctChange).toFixed(2)}%
            </div>
          )}
          {isFetching && <RefreshCw size={11} className="animate-spin text-white/30 self-center" />}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* symbol pills */}
          <div className="flex gap-1 flex-wrap">
            {SYMBOLS.map(s => (
              <button key={s} onClick={() => setSymbol(s)}
                className={cn(
                  "text-[10px] font-mono px-2 py-1 rounded-md border transition-all",
                  s === symbol
                    ? "bg-primary/20 text-primary border-primary/40 shadow-[0_0_8px_rgba(168,85,247,0.25)]"
                    : "text-white/30 border-white/5 hover:text-white/60 hover:border-white/15"
                )}>
                {s.replace("USDT","")}
              </button>
            ))}
          </div>

          {/* interval tabs */}
          <div className="flex border border-white/10 rounded-lg p-0.5 bg-white/[0.02]">
            {INTERVALS.map(iv => (
              <button key={iv.value} onClick={() => setInterval(iv.value)}
                className={cn(
                  "text-[10px] font-mono px-2.5 py-1 rounded transition-all",
                  iv.value === interval
                    ? "bg-primary text-white shadow-[0_0_12px_rgba(168,85,247,0.45)]"
                    : "text-white/40 hover:text-white/70"
                )}>
                {iv.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── chart canvas ── */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full rounded-lg overflow-hidden" />
    </div>
  );
}
