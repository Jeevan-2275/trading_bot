import "./institutional.css";

const metrics = [
  { label: "Total Orders",   value: "6",         sub: "all time",       accent: false },
  { label: "Fill Rate",      value: "50%",        sub: "3 of 6 filled",  accent: false },
  { label: "Net P&L (est.)", value: "+$7.62",     sub: "SELL − BUY",     accent: true, pos: true },
  { label: "USDT Balance",   value: "$10,000",    sub: "testnet",        accent: false },
];

const orders = [
  { id: "131244", time: "20:16:54", sym: "BTCUSDT", side: "BUY",  type: "MARKET", qty: "0.001", price: "$63,901.00", status: "FILLED",    pnl: "+$2.34" },
  { id: "130988", time: "20:10:53", sym: "BTCUSDT", side: "BUY",  type: "MARKET", qty: "0.001", price: "—",          status: "FAILED",    pnl: "—" },
  { id: "130500", time: "20:07:26", sym: "ETHUSDT", side: "SELL", type: "LIMIT",  qty: "0.050", price: "$1,842.00",  status: "CANCELLED", pnl: "—" },
  { id: "129900", time: "19:58:11", sym: "BTCUSDT", side: "BUY",  type: "MARKET", qty: "0.002", price: "$63,600.00", status: "FILLED",    pnl: "+$6.48" },
  { id: "129400", time: "19:44:02", sym: "BNBUSDT", side: "SELL", type: "MARKET", qty: "0.500", price: "$568.10",    status: "FILLED",    pnl: "-$1.20" },
  { id: "128800", time: "19:31:55", sym: "ETHUSDT", side: "BUY",  type: "LIMIT",  qty: "0.100", price: "$1,836.50",  status: "FAILED",    pnl: "—" },
];

const prices = [
  { sym: "BTC/USDT", price: "63,922.40", chg: "+0.21%", pos: true },
  { sym: "ETH/USDT", price: "1,840.85",  chg: "−1.23%", pos: false },
  { sym: "BNB/USDT", price: "568.49",    chg: "−0.76%", pos: false },
];

const badge: Record<string, string> = { FILLED: "filled", FAILED: "failed", CANCELLED: "cancelled" };

export function Institutional() {
  return (
    <div className="ins-root">
      {/* Sidebar */}
      <aside className="ins-sidebar">
        <div className="ins-brand">
          <div className="ins-brand-mark" />
          <span>QuantTerm</span>
        </div>
        <nav className="ins-nav">
          {[
            { label: "Dashboard",    active: true },
            { label: "Place Order",  active: false },
            { label: "Order History",active: false },
            { label: "Analytics",   active: false },
            { label: "Logs",        active: false },
            { label: "Settings",    active: false },
          ].map(n => (
            <div key={n.label} className={`ins-nav-item ${n.active ? "active" : ""}`}>{n.label}</div>
          ))}
        </nav>
        <div className="ins-sidebar-footer">
          <div className="ins-conn"><span className="ins-dot" />Binance Testnet</div>
          <div className="ins-conn-sub">Connected · 142ms</div>
        </div>
      </aside>

      {/* Main */}
      <main className="ins-main">
        {/* Header */}
        <header className="ins-header">
          <div>
            <h1 className="ins-h1">Dashboard</h1>
            <p className="ins-sub">Live overview · Auto-refreshes every 10s</p>
          </div>
          <div className="ins-prices">
            {prices.map(p => (
              <div key={p.sym} className="ins-price-chip">
                <span className="ins-price-sym">{p.sym}</span>
                <span className="ins-price-val">{p.price}</span>
                <span className={`ins-price-chg ${p.pos ? "up" : "dn"}`}>{p.chg}</span>
              </div>
            ))}
          </div>
        </header>

        {/* Metric cards */}
        <div className="ins-cards">
          {metrics.map(m => (
            <div key={m.label} className="ins-card">
              <div className="ins-card-label">{m.label}</div>
              <div className={`ins-card-val ${m.accent ? (m.pos ? "up" : "dn") : ""}`}>{m.value}</div>
              <div className="ins-card-sub">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="ins-table-wrap">
          <div className="ins-table-header">
            <h2 className="ins-h2">Recent Orders</h2>
            <button className="ins-btn-ghost">Export CSV</button>
          </div>
          <table className="ins-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Time</th><th>Instrument</th>
                <th>Side</th><th>Type</th><th>Qty</th>
                <th>Exec. Price</th><th>Status</th><th>P&L</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="id">{o.id}</td>
                  <td className="dim">{o.time}</td>
                  <td className="sym">{o.sym}</td>
                  <td><span className={`side ${o.side === "BUY" ? "buy" : "sell"}`}>{o.side}</span></td>
                  <td className="dim">{o.type}</td>
                  <td className="num">{o.qty}</td>
                  <td className="num">{o.price}</td>
                  <td><span className={`status ${badge[o.status]}`}>{o.status}</span></td>
                  <td className={`num ${o.pnl.startsWith("+") ? "up" : o.pnl.startsWith("-") ? "dn" : "dim"}`}>{o.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
