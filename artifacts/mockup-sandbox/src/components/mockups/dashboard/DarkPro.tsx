import "./darkpro.css";

const stats = [
  { label: "Total Orders",  value: "6",       icon: "◈", color: "#60a5fa" },
  { label: "Successful",    value: "3",        icon: "◉", color: "#34d399" },
  { label: "Failed",        value: "2",        icon: "◌", color: "#f87171" },
  { label: "Net P&L",       value: "+$7.62",   icon: "▲", color: "#a78bfa", up: true },
];

const orders = [
  { id: "#131244", time: "20:16:54", pair: "BTC/USDT", side: "BUY",  qty: "0.001", price: "$63,901.00", status: "FILLED",    pnl: "+$2.34", up: true },
  { id: "#130988", time: "20:10:53", pair: "BTC/USDT", side: "BUY",  qty: "0.001", price: "—",          status: "FAILED",    pnl: "—",      up: null },
  { id: "#130500", time: "20:07:26", pair: "ETH/USDT", side: "SELL", qty: "0.050", price: "$1,842.00",  status: "CANCELLED", pnl: "—",      up: null },
  { id: "#129900", time: "19:58:11", pair: "BTC/USDT", side: "BUY",  qty: "0.002", price: "$63,600.00", status: "FILLED",    pnl: "+$6.48", up: true },
  { id: "#129400", time: "19:44:02", pair: "BNB/USDT", side: "SELL", qty: "0.500", price: "$568.10",    status: "FILLED",    pnl: "-$1.20", up: false },
  { id: "#128800", time: "19:31:55", pair: "ETH/USDT", side: "BUY",  qty: "0.100", price: "$1,836.50",  status: "FAILED",    pnl: "—",      up: null },
];

const tickers = [
  { sym: "BTC", full: "BTCUSDT", price: "63,922.40", chg: "+0.21%", high: "64,100", low: "63,200", vol: "12.4B", up: true },
  { sym: "ETH", full: "ETHUSDT", price: "1,840.85",  chg: "−1.23%", high: "1,870",  low: "1,820",  vol: "4.2B",  up: false },
  { sym: "BNB", full: "BNBUSDT", price: "568.49",    chg: "−0.76%", high: "575",    low: "563",    vol: "890M",  up: false },
];

const barData = [2, 1, 3, 1, 4, 2, 3];
const maxBar = Math.max(...barData);

const statusCls: Record<string, string> = { FILLED: "s-ok", FAILED: "s-err", CANCELLED: "s-cancel" };

export function DarkPro() {
  return (
    <div className="dp-root">
      {/* Top nav */}
      <header className="dp-header">
        <div className="dp-logo">
          <div className="dp-logo-gem">◈</div>
          <span className="dp-logo-name">QuantTerm</span>
          <span className="dp-logo-tag">PRO</span>
        </div>
        <nav className="dp-nav">
          {["Dashboard", "Place Order", "Orders", "Logs", "Settings"].map((n, i) => (
            <span key={n} className={`dp-nav-link ${i === 0 ? "active" : ""}`}>{n}</span>
          ))}
        </nav>
        <div className="dp-header-right">
          <span className="dp-status-pill">● TESTNET</span>
          <span className="dp-time">07:28:54 UTC</span>
        </div>
      </header>

      <div className="dp-body">
        {/* Ticker row */}
        <div className="dp-tickers">
          {tickers.map(t => (
            <div key={t.sym} className="dp-ticker-card">
              <div className="dp-ticker-top">
                <span className="dp-ticker-sym">{t.sym}<span className="dp-ticker-slash">/USDT</span></span>
                <span className={`dp-ticker-chg ${t.up ? "up" : "dn"}`}>{t.chg}</span>
              </div>
              <div className="dp-ticker-price">{t.price}</div>
              <div className="dp-ticker-meta">
                <span>H: {t.high}</span><span>L: {t.low}</span><span>Vol: {t.vol}</span>
              </div>
              <div className="dp-ticker-bar">
                <div className="dp-ticker-fill" style={{ width: t.up ? "62%" : "38%", background: t.up ? "#34d399" : "#f87171" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="dp-stats">
          {stats.map(s => (
            <div key={s.label} className="dp-stat">
              <div className="dp-stat-icon" style={{ color: s.color }}>{s.icon}</div>
              <div>
                <div className="dp-stat-label">{s.label}</div>
                <div className="dp-stat-val" style={{ color: s.up ? "#34d399" : undefined }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="dp-lower">
          {/* Table */}
          <div className="dp-table-section">
            <div className="dp-section-head">
              <h2 className="dp-section-title">Order History</h2>
              <div className="dp-section-actions">
                <button className="dp-pill-btn">Export CSV</button>
                <button className="dp-pill-btn">Refresh</button>
              </div>
            </div>
            <div className="dp-table-wrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Time</th><th>Pair</th><th>Side</th>
                    <th>Qty</th><th>Price</th><th>Status</th><th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td className="dp-id">{o.id}</td>
                      <td className="dp-dim">{o.time}</td>
                      <td className="dp-pair">{o.pair}</td>
                      <td><span className={`dp-side ${o.side === "BUY" ? "buy" : "sell"}`}>{o.side}</span></td>
                      <td className="dp-num">{o.qty}</td>
                      <td className="dp-num">{o.price}</td>
                      <td><span className={`dp-status ${statusCls[o.status]}`}>{o.status}</span></td>
                      <td className={`dp-num dp-pnl ${o.up === true ? "up" : o.up === false ? "dn" : "dp-dim"}`}>{o.pnl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel: chart + logs */}
          <div className="dp-right-panel">
            <div className="dp-panel-box">
              <div className="dp-panel-title">Orders / Day — 7d</div>
              <div className="dp-chart">
                {barData.map((v, i) => (
                  <div key={i} className="dp-col">
                    <div className="dp-bar-bg">
                      <div className="dp-bar" style={{ height: `${(v / maxBar) * 100}%` }} />
                    </div>
                    <span className="dp-bar-label">{["M","T","W","T","F","S","S"][i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dp-panel-box" style={{ flex: 1 }}>
              <div className="dp-panel-title">Live Logs</div>
              <div className="dp-logs">
                {[
                  { t: "20:16:52", l: "DBG", m: "Details → Symbol: BTCUSDT" },
                  { t: "20:16:53", l: "INF", m: "Synced server time +14ms" },
                  { t: "20:16:53", l: "INF", m: "Step 4: Submitting order..." },
                  { t: "20:16:54", l: "INF", m: "Fill received — BTCUSDT BUY" },
                  { t: "20:17:01", l: "WRN", m: "Rate limit at 85%" },
                ].map((e, i) => (
                  <div key={i} className="dp-log">
                    <span className="dp-log-t">{e.t}</span>
                    <span className={`dp-log-l l-${e.l.toLowerCase()}`}>{e.l}</span>
                    <span className="dp-log-m">{e.m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
