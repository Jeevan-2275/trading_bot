import "./bloomberg.css";

const prices = [
  { sym: "BTC/USDT", price: "63,922.40", chg: "+0.21%", pos: true },
  { sym: "ETH/USDT", price: "1,840.85",  chg: "-1.23%", pos: false },
  { sym: "BNB/USDT", price: "568.49",    chg: "-0.76%", pos: false },
  { sym: "SOL/USDT", price: "148.32",    chg: "+2.14%", pos: true },
];

const orders = [
  { id: "131244", time: "20:16:54", sym: "BTCUSDT", side: "BUY",  type: "MKT", qty: "0.001", price: "63,901.00", status: "FILLED",    pnl: "+$2.34" },
  { id: "130988", time: "20:10:53", sym: "BTCUSDT", side: "BUY",  type: "MKT", qty: "0.001", price: "63,744.20", status: "FAILED",    pnl: "—" },
  { id: "130500", time: "20:07:26", sym: "ETHUSDT", side: "SELL", type: "LMT", qty: "0.050", price: "1,842.00",  status: "CANCELLED", pnl: "—" },
  { id: "129900", time: "19:58:11", sym: "BTCUSDT", side: "BUY",  type: "MKT", qty: "0.002", price: "63,600.00", status: "FILLED",    pnl: "+$6.48" },
  { id: "129400", time: "19:44:02", sym: "BNBUSDT", side: "SELL", type: "MKT", qty: "0.500", price: "568.10",    status: "FILLED",    pnl: "-$1.20" },
  { id: "128800", time: "19:31:55", sym: "ETHUSDT", side: "BUY",  type: "LMT", qty: "0.100", price: "1,836.50",  status: "FAILED",    pnl: "—" },
];

const statusColor: Record<string, string> = {
  FILLED: "#00C076", FAILED: "#FF4D4D", CANCELLED: "#8B949E", PENDING: "#F0A500",
};

export function Bloomberg() {
  return (
    <div className="bb-root">
      {/* Top bar */}
      <div className="bb-topbar">
        <span className="bb-logo">QUANT_TERM <span className="bb-logo-sub">PRO</span></span>
        <div className="bb-ticker">
          {prices.map(p => (
            <span key={p.sym} className="bb-tick">
              <span className="bb-tick-sym">{p.sym}</span>
              <span className="bb-tick-price">{p.price}</span>
              <span className={`bb-tick-chg ${p.pos ? "up" : "dn"}`}>{p.chg}</span>
            </span>
          ))}
        </div>
        <div className="bb-time">07:28:54 UTC &nbsp;|&nbsp; TESTNET</div>
      </div>

      <div className="bb-body">
        {/* Left: metrics + chart stub */}
        <div className="bb-left">
          <div className="bb-section-label">PERFORMANCE OVERVIEW</div>
          <div className="bb-metrics">
            <div className="bb-metric">
              <div className="bb-metric-label">TOTAL ORDERS</div>
              <div className="bb-metric-val">6</div>
            </div>
            <div className="bb-metric">
              <div className="bb-metric-label">FILLED</div>
              <div className="bb-metric-val up">3</div>
            </div>
            <div className="bb-metric">
              <div className="bb-metric-label">FAILED</div>
              <div className="bb-metric-val dn">2</div>
            </div>
            <div className="bb-metric">
              <div className="bb-metric-label">CANCELLED</div>
              <div className="bb-metric-val mid">1</div>
            </div>
          </div>

          <div className="bb-divider" />

          <div className="bb-section-label">ACCOUNT</div>
          <div className="bb-kv"><span>USDT Balance</span><span className="bb-kv-val">10,000.00</span></div>
          <div className="bb-kv"><span>Available</span><span className="bb-kv-val">9,968.62</span></div>
          <div className="bb-kv"><span>Unrealized PnL</span><span className="bb-kv-val up">+$7.62</span></div>
          <div className="bb-kv"><span>Net PnL (est.)</span><span className="bb-kv-val up">+$7.62</span></div>

          <div className="bb-divider" />

          <div className="bb-section-label">ACTIVITY — 7D</div>
          <div className="bb-bars">
            {[1,2,3,1,4,2,3].map((v, i) => (
              <div key={i} className="bb-bar-wrap">
                <div className="bb-bar" style={{ height: `${v * 14}px` }} />
                <span className="bb-bar-label">{["M","T","W","T","F","S","S"][i]}</span>
              </div>
            ))}
          </div>

          <div className="bb-divider" />

          <div className="bb-section-label">SYSTEM</div>
          <div className="bb-log-entry"><span className="bb-log-time">20:16:52</span><span className="bb-log-lvl info">INFO</span><span>Server time synced</span></div>
          <div className="bb-log-entry"><span className="bb-log-time">20:16:53</span><span className="bb-log-lvl debug">DBG</span><span>Order submitted</span></div>
          <div className="bb-log-entry"><span className="bb-log-time">20:16:54</span><span className="bb-log-lvl info">INFO</span><span>Fill received: BTCUSDT</span></div>
          <div className="bb-log-entry"><span className="bb-log-time">20:17:01</span><span className="bb-log-lvl warn">WARN</span><span>Rate limit 85%</span></div>
        </div>

        {/* Right: order table */}
        <div className="bb-right">
          <div className="bb-section-label" style={{ marginBottom: 8 }}>
            ORDER HISTORY <span style={{ color: "#555", fontWeight: 400, marginLeft: 12 }}>LAST 50 RECORDS</span>
          </div>
          <table className="bb-table">
            <thead>
              <tr>
                <th>ORDER ID</th><th>TIME</th><th>INSTRUMENT</th><th>SIDE</th>
                <th>TYPE</th><th className="r">QTY</th><th className="r">EXEC PRICE</th>
                <th>STATUS</th><th className="r">P&L</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="dim">{o.id}</td>
                  <td className="dim">{o.time}</td>
                  <td><strong>{o.sym}</strong></td>
                  <td><span className={`bb-badge ${o.side === "BUY" ? "buy" : "sell"}`}>{o.side}</span></td>
                  <td className="dim">{o.type}</td>
                  <td className="r mono">{o.qty}</td>
                  <td className="r mono">{o.price}</td>
                  <td><span className="bb-status" style={{ color: statusColor[o.status] }}>{o.status}</span></td>
                  <td className={`r mono ${o.pnl.startsWith("+") ? "up" : o.pnl.startsWith("-") ? "dn" : "dim"}`}>{o.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bb-table-footer">6 records · Page 1 of 1 · Auto-refresh 10s</div>
        </div>
      </div>

      {/* Status bar */}
      <div className="bb-statusbar">
        <span className="bb-status-dot" /> <span>API: CONNECTED</span>
        <span className="bb-status-sep" />
        <span>BINANCE TESTNET</span>
        <span className="bb-status-sep" />
        <span>Latency: 142ms</span>
        <span className="bb-status-sep" />
        <span>Heartbeat: OK</span>
        <span style={{ marginLeft: "auto" }}>Build 971c492 · v1.4.0</span>
      </div>
    </div>
  );
}
