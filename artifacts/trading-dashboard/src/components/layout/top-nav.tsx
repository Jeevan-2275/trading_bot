import { Link, useLocation } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";

const NAV = [
  { label: "Dashboard",   href: "/" },
  { label: "Place Order", href: "/place-order" },
  { label: "Orders",      href: "/orders" },
  { label: "Logs",        href: "/logs" },
  { label: "Settings",    href: "/settings" },
];

export function TopNav() {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { refetchInterval: 10000 } });
  const isOnline = health?.status === "ok";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center h-12 px-6 bg-[#0a0a0a] border-b border-[#1a1a1a]">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-9 shrink-0">
        <span className="text-[#818cf8] text-lg leading-none">◈</span>
        <span className="font-bold text-sm text-[#f4f4f5] tracking-tight">QuantTerm</span>
        <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#1e1b4b] text-[#818cf8]">PRO</span>
      </div>

      {/* Nav links */}
      <nav className="flex h-full">
        {NAV.map(({ label, href }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center h-full px-4 text-[13px] font-medium border-b-2 transition-all duration-150
                ${active
                  ? "text-[#e4e4e7] border-[#818cf8]"
                  : "text-[#52525b] border-transparent hover:text-[#a1a1aa]"}
              `}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-4 ml-auto">
        <span
          className={`text-[10px] font-semibold tracking-widest px-2 py-1 rounded-full border ${
            isOnline
              ? "bg-[#052e16] text-[#4ade80] border-[#166534]"
              : "bg-[#1a0000] text-[#f87171] border-[#7f1d1d]"
          }`}
        >
          {isOnline ? "● TESTNET" : "● OFFLINE"}
        </span>
        <LiveClock />
      </div>
    </header>
  );
}

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("en-GB", { timeZone: "UTC", hour12: false }) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-[11px] text-[#52525b]">{time}</span>;
}

import { useState, useEffect } from "react";
