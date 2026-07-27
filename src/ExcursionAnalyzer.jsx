import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, BarChart, Bar,
} from "recharts";
import {
  Upload, FileText, AlertTriangle, CheckCircle2, TrendingUp,
  Sliders, RotateCcw, ArrowUpDown, Target, Scissors, Waves, Clock,
  Send, Sparkles, MessageSquare,
} from "lucide-react";

/* ============================================================
   EXCURSION — replay trade analyzer
   Separates entry quality (how far price runs your way = MFE)
   from exit quality (how much of it you keep = capture).
   ============================================================ */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.exc, .exc *{ box-sizing:border-box; }
.exc{
  --ink:#0E1115; --panel:#161A20; --panel2:#1C222A;
  --line:#272E38; --line-soft:#1E242C;
  --text:#E7EAEE; --muted:#8B94A0; --faint:#5A626D;
  --teal:#46C7B0; --teal-dim:rgba(70,199,176,.13);
  --amber:#E7A94C; --amber-dim:rgba(231,169,76,.14);
  --coral:#EB7A66; --coral-dim:rgba(235,122,102,.13);
  font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;
  background:var(--ink); color:var(--text);
  min-height:100vh; width:100%;
  -webkit-font-smoothing:antialiased;
}
.exc .mono{ font-family:'JetBrains Mono',ui-monospace,monospace; font-variant-numeric:tabular-nums; }
.exc .wrap{ max-width:1120px; margin:0 auto; padding:26px 22px 80px; }

/* header */
.exc .topbar{ display:flex; align-items:baseline; justify-content:space-between; gap:16px; flex-wrap:wrap; padding-bottom:18px; border-bottom:1px solid var(--line-soft); margin-bottom:22px; }
.exc .brand{ display:flex; align-items:baseline; gap:12px; }
.exc .mark{ font-weight:700; font-size:23px; letter-spacing:.16em; }
.exc .mark b{ color:var(--amber); }
.exc .tag{ color:var(--muted); font-size:12.5px; letter-spacing:.02em; }
.exc .filepill{ display:flex; align-items:center; gap:8px; color:var(--muted); font-size:12.5px; }
.exc .filepill svg{ color:var(--faint); }

/* buttons */
.exc button{ font-family:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.exc .btn{ display:inline-flex; align-items:center; gap:7px; padding:8px 13px; border:1px solid var(--line); border-radius:8px; background:var(--panel); color:var(--text); font-size:13px; font-weight:500; transition:border-color .15s, background .15s, transform .05s; }
.exc .btn:hover{ border-color:#3a434f; background:var(--panel2); }
.exc .btn:active{ transform:translateY(1px); }
.exc .btn.primary{ background:var(--amber); color:#20160a; border-color:var(--amber); font-weight:600; }
.exc .btn.primary:hover{ background:#f0b65e; }
.exc .btn.ghost{ background:transparent; }
.exc .btn:focus-visible{ outline:2px solid var(--amber); outline-offset:2px; }

/* empty state */
.exc .hero{ text-align:center; padding:70px 20px 40px; }
.exc .hero h1{ font-size:40px; line-height:1.08; font-weight:700; margin:0 0 14px; letter-spacing:-.01em; }
.exc .hero h1 .a{ color:var(--amber); } .exc .hero h1 .t{ color:var(--teal); }
.exc .hero p{ color:var(--muted); font-size:15.5px; max-width:560px; margin:0 auto 30px; line-height:1.55; }
.exc .drop{ max-width:560px; margin:0 auto; border:1.5px dashed var(--line); border-radius:14px; padding:40px 24px; background:linear-gradient(180deg,var(--panel),#13171d); transition:border-color .15s; }
.exc .drop.drag{ border-color:var(--amber); }
.exc .drop .ico{ width:46px; height:46px; border-radius:11px; background:var(--amber-dim); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
.exc .drop .ico svg{ color:var(--amber); }
.exc .drop .row{ display:flex; gap:10px; justify-content:center; margin-top:18px; flex-wrap:wrap; }
.exc .hint{ color:var(--faint); font-size:12px; margin-top:16px; }
.exc .concept{ max-width:620px; margin:44px auto 0; display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--line-soft); border:1px solid var(--line-soft); border-radius:12px; overflow:hidden; }
.exc .concept > div{ background:var(--panel); padding:18px 18px; text-align:left; }
.exc .concept h4{ margin:0 0 6px; font-size:13px; letter-spacing:.04em; text-transform:uppercase; }
.exc .concept p{ margin:0; font-size:13px; color:var(--muted); line-height:1.5; max-width:none; }

/* controls */
.exc .controls{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:20px; }
.exc .seg{ display:flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
.exc .seg button{ padding:7px 12px; font-size:12.5px; color:var(--muted); border-right:1px solid var(--line); }
.exc .seg button:last-child{ border-right:none; }
.exc .seg button.on{ background:var(--panel2); color:var(--text); font-weight:600; }
.exc .ctl-label{ font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--faint); margin-right:2px; }
.exc .spacer{ flex:1; }

/* verdict */
.exc .verdict{ display:flex; align-items:center; gap:22px; padding:20px 24px; border-radius:14px; margin-bottom:22px; border:1px solid var(--line); background:linear-gradient(180deg,var(--panel),#13171d); }
.exc .verdict .big{ font-size:44px; font-weight:700; line-height:1; letter-spacing:-.02em; }
.exc .verdict .big small{ font-size:16px; color:var(--muted); font-weight:500; margin-left:4px; letter-spacing:0; }
.exc .verdict .vtext{ flex:1; }
.exc .verdict .vtext .lead{ font-size:15px; font-weight:600; margin-bottom:3px; }
.exc .verdict .vtext .sub{ font-size:13px; color:var(--muted); line-height:1.5; }
.exc .pos{ color:var(--teal); } .exc .neg{ color:var(--coral); } .exc .amb{ color:var(--amber); }

/* kpi grid */
.exc .grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
.exc .card{ background:var(--panel); border:1px solid var(--line-soft); border-radius:12px; padding:15px 16px; }
.exc .card .k{ font-size:11px; text-transform:uppercase; letter-spacing:.07em; color:var(--faint); display:flex; align-items:center; gap:5px; }
.exc .card .k svg{ width:13px; height:13px; }
.exc .card .v{ font-size:27px; font-weight:600; margin-top:8px; letter-spacing:-.01em; }
.exc .card .v small{ font-size:13px; color:var(--muted); font-weight:400; margin-left:3px; }
.exc .card .note{ font-size:11.5px; color:var(--muted); margin-top:3px; }
/* offered vs kept bar */
.exc .ovk{ margin-top:11px; }
.exc .ovk .track{ height:9px; border-radius:5px; background:var(--amber-dim); position:relative; overflow:hidden; }
.exc .ovk .fill{ height:100%; border-radius:5px; background:var(--teal); transition:width .5s ease; }
.exc .ovk .lg{ display:flex; justify-content:space-between; font-size:10.5px; color:var(--faint); margin-top:5px; letter-spacing:.02em; }

/* sections */
.exc .section{ background:var(--panel); border:1px solid var(--line-soft); border-radius:14px; padding:20px 22px; margin-bottom:22px; }
.exc .section h3{ margin:0 0 3px; font-size:15px; font-weight:600; display:flex; align-items:center; gap:8px; }
.exc .section .desc{ color:var(--muted); font-size:12.5px; margin:0 0 16px; line-height:1.5; }
.exc .axnote{ display:flex; justify-content:space-between; font-size:11px; color:var(--faint); margin-top:2px; }

/* diagnosis */
.exc .diag{ display:flex; flex-direction:column; gap:10px; }
.exc .dcard{ display:flex; gap:13px; padding:14px 15px; border-radius:11px; border:1px solid var(--line-soft); background:var(--panel2); }
.exc .dcard .di{ flex-shrink:0; width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
.exc .dcard.high .di{ background:var(--coral-dim); color:var(--coral); }
.exc .dcard.med .di{ background:var(--amber-dim); color:var(--amber); }
.exc .dcard.good .di{ background:var(--teal-dim); color:var(--teal); }
.exc .dcard .dt{ font-size:13.5px; font-weight:600; margin-bottom:3px; }
.exc .dcard .dd{ font-size:12.5px; color:var(--muted); line-height:1.5; }
.exc .dcard .dd b{ color:var(--text); font-weight:600; }

/* table */
.exc .tblwrap{ overflow-x:auto; border:1px solid var(--line-soft); border-radius:11px; }
.exc table{ width:100%; border-collapse:collapse; font-size:12.5px; }
.exc thead th{ text-align:right; padding:10px 12px; color:var(--faint); font-weight:500; font-size:11px; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--line); white-space:nowrap; cursor:pointer; user-select:none; background:var(--panel2); position:sticky; top:0; }
.exc thead th:first-child, .exc tbody td:first-child{ text-align:left; }
.exc thead th .sic{ opacity:.4; margin-left:3px; vertical-align:middle; }
.exc thead th.act .sic{ opacity:1; color:var(--amber); }
.exc tbody td{ padding:9px 12px; text-align:right; border-bottom:1px solid var(--line-soft); white-space:nowrap; }
.exc tbody tr:hover{ background:var(--panel2); }
.exc tbody tr:last-child td{ border-bottom:none; }
.exc .chip{ display:inline-block; padding:2px 7px; border-radius:5px; font-size:10.5px; font-weight:600; letter-spacing:.02em; }
.exc .chip.long{ background:var(--teal-dim); color:var(--teal); }
.exc .chip.short{ background:var(--coral-dim); color:var(--coral); }
.exc .flag{ font-size:11px; font-weight:600; }
.exc .flag.leak{ color:var(--amber); } .exc .flag.stop{ color:var(--coral); }
.exc .flag.chop{ color:var(--faint); } .exc .flag.clean{ color:var(--teal); }

/* mapping panel */
.exc .mapgrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px 16px; }
.exc .mapf label{ display:block; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--faint); margin-bottom:5px; }
.exc select{ width:100%; padding:8px 10px; background:var(--ink); color:var(--text); border:1px solid var(--line); border-radius:8px; font-family:inherit; font-size:12.5px; }
.exc select:focus{ outline:none; border-color:var(--amber); }
.exc .maprow{ display:flex; gap:20px; flex-wrap:wrap; margin-top:16px; padding-top:16px; border-top:1px solid var(--line-soft); align-items:center; }
.exc .toggle{ display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--muted); }
.exc .num{ width:88px; padding:6px 9px; background:var(--ink); color:var(--text); border:1px solid var(--line); border-radius:7px; font-family:'JetBrains Mono',monospace; font-size:12.5px; }

.exc .rc-tt{ background:#0b0e12; border:1px solid var(--line); border-radius:9px; padding:9px 11px; font-size:12px; }
.exc .rc-tt .r{ display:flex; justify-content:space-between; gap:16px; }
.exc .rc-tt .r span:first-child{ color:var(--muted); }

/* chat / coach */
.exc .chatsec .desc{ margin-bottom:14px; }
.exc .chatlog{ display:flex; flex-direction:column; gap:13px; max-height:440px; overflow-y:auto; padding:2px; }
.exc .msg{ display:flex; gap:10px; max-width:90%; }
.exc .msg.user{ align-self:flex-end; flex-direction:row-reverse; }
.exc .msg .av{ flex-shrink:0; width:27px; height:27px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
.exc .msg.user .av{ background:var(--teal-dim); color:var(--teal); }
.exc .msg.coach .av{ background:var(--amber-dim); color:var(--amber); }
.exc .msg .bub{ padding:11px 14px; border-radius:12px; font-size:13.5px; line-height:1.58; white-space:pre-wrap; }
.exc .msg.user .bub{ background:var(--panel2); border:1px solid var(--line); }
.exc .msg.coach .bub{ background:#12171d; border:1px solid var(--line-soft); }
.exc .msg.coach .bub.err{ border-color:var(--coral); color:var(--coral); }
.exc .chatempty{ text-align:center; padding:8px 10px 2px; color:var(--muted); font-size:13.5px; }
.exc .chatempty .em-ico{ width:38px; height:38px; border-radius:10px; background:var(--amber-dim); color:var(--amber); display:flex; align-items:center; justify-content:center; margin:0 auto 12px; }
.exc .chips{ display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:14px; }
.exc .chip-btn{ padding:7px 13px; border:1px solid var(--line); border-radius:20px; background:var(--panel2); color:var(--text); font-size:12.5px; transition:border-color .15s, color .15s; }
.exc .chip-btn:hover{ border-color:var(--amber); color:var(--amber); }
.exc .chatin{ display:flex; gap:9px; margin-top:15px; }
.exc .chatin input{ flex:1; padding:11px 14px; background:var(--ink); border:1px solid var(--line); border-radius:10px; color:var(--text); font-family:inherit; font-size:13.5px; }
.exc .chatin input:focus{ outline:none; border-color:var(--amber); }
.exc .send{ padding:0 15px; border-radius:10px; background:var(--amber); color:#20160a; font-weight:600; border:1px solid var(--amber); display:flex; align-items:center; gap:6px; font-size:13px; }
.exc .send:hover{ background:#f0b65e; }
.exc .send:disabled{ opacity:.45; cursor:default; }
.exc .dots span{ display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--muted); margin-right:5px; animation:excb 1s infinite; }
.exc .dots span:nth-child(2){ animation-delay:.15s; } .exc .dots span:nth-child(3){ animation-delay:.3s; }
@keyframes excb{ 0%,60%,100%{ opacity:.25; transform:translateY(0);} 30%{ opacity:1; transform:translateY(-3px);} }
.exc tbody tr.clk{ cursor:pointer; }
.exc tbody tr.clk:hover td:first-child{ color:var(--amber); }

@media (max-width:820px){
  .exc .grid{ grid-template-columns:repeat(2,1fr); }
  .exc .mapgrid{ grid-template-columns:1fr 1fr; }
  .exc .concept{ grid-template-columns:1fr; }
  .exc .verdict{ flex-direction:column; align-items:flex-start; gap:12px; }
}
@media (prefers-reduced-motion:reduce){ .exc *{ transition:none !important; } }
`;

/* ---------- column detection ---------- */
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES = {
  direction: ["side", "direction", "type", "dir", "longshort", "position", "buysell"],
  entry: ["entryprice", "entry", "openprice", "entrypx", "avgentry", "priceentry", "open", "fillprice"],
  exit: ["exitprice", "exit", "closeprice", "exitpx", "avgexit", "priceexit", "close"],
  mfe: ["mfe", "maxfavorableexcursion", "runup", "maxrunup", "favorable", "peakprofit", "mpe", "maxprofit"],
  mae: ["mae", "maxadverseexcursion", "drawdown", "maxdrawdown", "adverse", "maxloss", "heat"],
  duration: ["duration", "timeintrade", "barsheld", "holdtime", "timeheld", "bars", "held", "minutes", "length"],
  pnl: ["pnl", "pandl", "profit", "netpl", "netprofit", "netpnl", "realized", "profitloss", "result", "gain", "pl"],
  risk: ["initialrisk", "risk", "riskamount", "stoploss", "stopprice", "stop", "rvalue", "1r"],
  symbol: ["symbol", "ticker", "instrument", "market", "pair", "asset", "contract"],
};
function detectColumns(headers) {
  const map = {};
  const used = new Set();
  const nheaders = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const field of Object.keys(ALIASES)) {
    // exact match first
    let hit = nheaders.find((h) => !used.has(h.raw) && ALIASES[field].includes(h.n));
    if (!hit) hit = nheaders.find((h) => !used.has(h.raw) && ALIASES[field].some((a) => h.n.includes(a) || a.includes(h.n)));
    if (hit) { map[field] = hit.raw; used.add(hit.raw); }
    else map[field] = "";
  }
  return map;
}

/* ---------- numeric parsing ---------- */
function num(v) {
  if (v == null) return NaN;
  let s = String(v).trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/[$,%\s]/g, "").replace(/[^0-9.\-+eE]/g, "");
  let n = parseFloat(s);
  if (isNaN(n)) return NaN;
  return neg ? -n : n;
}
function dirOf(v) {
  const s = String(v || "").toLowerCase();
  if (/short|sell|-1|\bs\b/.test(s)) return -1;
  return 1; // default long
}

/* ---------- build normalized trades ---------- */
function buildTrades(rows, map, cfg) {
  const raw = rows.map((r) => {
    const entry = map.entry ? num(r[map.entry]) : NaN;
    const exit = map.exit ? num(r[map.exit]) : NaN;
    const dir = map.direction ? dirOf(r[map.direction]) : 1;
    let pnl = map.pnl ? num(r[map.pnl]) : NaN;
    if (!isFinite(pnl) && isFinite(entry) && isFinite(exit)) pnl = (exit - entry) * dir;
    const mfeRaw = map.mfe ? num(r[map.mfe]) : NaN;
    const maeRaw = map.mae ? num(r[map.mae]) : NaN;
    const dur = map.duration ? num(r[map.duration]) : NaN;
    const riskRaw = map.risk ? num(r[map.risk]) : NaN;
    return { entry, exit, dir, pnl, mfeRaw, maeRaw, dur, riskRaw,
             symbol: map.symbol ? r[map.symbol] : "" };
  }).filter((t) => isFinite(t.pnl));

  // MFE / MAE as positive magnitudes
  for (const t of raw) {
    if (cfg.mfeIsPrice && isFinite(t.entry) && isFinite(t.mfeRaw)) {
      t.mfe = Math.max(0, (t.mfeRaw - t.entry) * t.dir);
    } else t.mfe = isFinite(t.mfeRaw) ? Math.abs(t.mfeRaw) : NaN;
    if (cfg.maeIsPrice && isFinite(t.entry) && isFinite(t.maeRaw)) {
      t.mae = Math.max(0, (t.entry - t.maeRaw) * t.dir);
    } else t.mae = isFinite(t.maeRaw) ? Math.abs(t.maeRaw) : NaN;
  }

  // resolve R (risk) per trade
  const losses = raw.filter((t) => t.pnl < 0).map((t) => Math.abs(t.pnl));
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : NaN;
  const fallbackR = isFinite(avgLoss) && avgLoss > 0 ? avgLoss
    : (raw.length ? raw.reduce((a, t) => a + Math.abs(t.pnl), 0) / raw.length : 1) || 1;

  for (const t of raw) {
    let R;
    if (cfg.riskBasis === "column") {
      R = cfg.riskIsStopPrice && isFinite(t.entry) ? Math.abs(t.entry - t.riskRaw) : Math.abs(t.riskRaw);
    } else if (cfg.riskBasis === "fixed") {
      R = cfg.fixedRisk;
    } else { // avgloss
      R = avgLoss;
    }
    if (!isFinite(R) || R <= 0) R = fallbackR;
    t.R = R;
    t.rMult = t.pnl / R;
    t.mfeR = isFinite(t.mfe) ? t.mfe / R : NaN;
    t.maeR = isFinite(t.mae) ? t.mae / R : NaN;
    t.capture = isFinite(t.mfe) && t.mfe > 0 ? t.pnl / t.mfe : null;
    t.win = t.pnl > 0;
  }
  return raw;
}

/* ---------- aggregate stats ---------- */
function computeStats(trades) {
  const n = trades.length;
  if (!n) return null;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const mean = (arr, f) => arr.length ? arr.reduce((a, t) => a + f(t), 0) / arr.length : NaN;
  const sum = (arr, f) => arr.reduce((a, t) => a + f(t), 0);

  const grossWin = sum(wins, (t) => t.pnl);
  const grossLoss = Math.abs(sum(losses, (t) => t.pnl));
  const winnersWithMfe = wins.filter((t) => isFinite(t.mfe) && t.mfe > 0);
  const captureAgg = winnersWithMfe.length
    ? sum(winnersWithMfe, (t) => t.pnl) / sum(winnersWithMfe, (t) => t.mfe) : NaN;
  const giveBack = winnersWithMfe.length
    ? mean(winnersWithMfe, (t) => (t.mfe - t.pnl) / t.mfe) : NaN;

  const hasDur = trades.some((t) => isFinite(t.dur));

  return {
    n, winCount: wins.length, lossCount: losses.length,
    winRate: wins.length / n,
    expectancyR: mean(trades, (t) => t.rMult),
    avgWinR: mean(wins, (t) => t.rMult),
    avgLossR: mean(losses, (t) => t.rMult),
    payoff: Math.abs(mean(wins, (t) => t.rMult) / mean(losses, (t) => t.rMult)),
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : Infinity,
    avgMfeR: mean(trades.filter((t) => isFinite(t.mfeR)), (t) => t.mfeR),
    avgMaeR: mean(trades.filter((t) => isFinite(t.maeR)), (t) => t.maeR),
    winnerMaeR: mean(wins.filter((t) => isFinite(t.maeR)), (t) => t.maeR),
    captureAgg, giveBack,
    hasDur,
    winDur: hasDur ? mean(wins.filter((t) => isFinite(t.dur)), (t) => t.dur) : NaN,
    lossDur: hasDur ? mean(losses.filter((t) => isFinite(t.dur)), (t) => t.dur) : NaN,
    totalR: sum(trades, (t) => t.rMult),
  };
}

/* ---------- diagnosis engine ---------- */
function diagnose(s) {
  const out = [];
  const pct = (x) => `${(x * 100).toFixed(0)}%`;
  const R = (x) => `${x >= 0 ? "" : ""}${x.toFixed(2)}R`;

  // headline: exit vs entry
  if (isFinite(s.avgMfeR) && isFinite(s.captureAgg)) {
    if (s.avgMfeR >= 1.2 && s.captureAgg <= 0.5) {
      out.push({ sev: "high", icon: Scissors, t: "Exit timing is your primary leak",
        d: `Your trades travel an average of <b>${s.avgMfeR.toFixed(2)}R</b> in your favor, but you keep only <b>${pct(s.captureAgg)}</b> of that. The entries are finding real moves — you're cutting them short. Focus on holding to a structured target or trailing stop rather than exiting on the first pullback.` });
    } else if (s.captureAgg >= 0.65 && s.avgMfeR >= 1) {
      out.push({ sev: "good", icon: CheckCircle2, t: "Exits are efficient",
        d: `You capture <b>${pct(s.captureAgg)}</b> of the favorable move on winners — you keep most of what the market offers. Any edge gains now come from entry selection, not exit timing.` });
    }
  }
  // entry quality
  if (isFinite(s.avgMfeR) && s.avgMfeR < 0.7) {
    out.push({ sev: "high", icon: Target, t: "Entries aren't catching moves",
      d: `Trades travel only <b>${s.avgMfeR.toFixed(2)}R</b> in your favor on average before reversing. That points to entry quality — late fills, fading momentum, or poor location. Even perfect exits can't fix a trade that never moves. Review where you're entering relative to the setup trigger.` });
  }
  // loss discipline
  if (isFinite(s.avgLossR) && s.avgLossR <= -1.12) {
    out.push({ sev: "high", icon: AlertTriangle, t: "Losers exceed your 1R risk",
      d: `Average loss is <b>${s.avgLossR.toFixed(2)}R</b> — larger than a single unit of risk. You're likely widening or moving stops, or taking slippage past them. Losses bigger than 1R quietly erase the edge from your winners.` });
  }
  // give-back
  if (isFinite(s.giveBack) && s.giveBack >= 0.5 && !(s.avgMfeR >= 1.2 && s.captureAgg <= 0.5)) {
    out.push({ sev: "med", icon: Waves, t: "You give back most of peak profit",
      d: `On winning trades you surrender <b>${pct(s.giveBack)}</b> of the peak unrealized gain before exiting. A partial-scale or trailing rule would lock in more of the excursion you've already earned.` });
  }
  // disposition effect
  if (s.hasDur && isFinite(s.winDur) && isFinite(s.lossDur) && s.lossDur > s.winDur * 1.35) {
    out.push({ sev: "med", icon: Clock, t: "You hold losers longer than winners",
      d: `Average winner is held <b>${s.winDur.toFixed(0)}</b> vs <b>${s.lossDur.toFixed(0)}</b> for losers — the classic disposition effect. Snapping profits fast while hoping losers recover inverts the math you want.` });
  }
  // winner heat
  if (isFinite(s.winnerMaeR) && s.winnerMaeR >= 0.6) {
    out.push({ sev: "med", icon: TrendingUp, t: "Winners take real heat first",
      d: `Your winning trades draw down an average of <b>${s.winnerMaeR.toFixed(2)}R</b> against you before working. They survive it, but earlier or better-located entries would raise the R on the same moves.` });
  }
  // expectancy verdict always last
  if (isFinite(s.expectancyR)) {
    if (s.expectancyR > 0) {
      out.push({ sev: "good", icon: CheckCircle2, t: `Positive edge: ${s.expectancyR.toFixed(3)}R per trade`,
        d: `Over ${s.n} trades this system expects to make <b>${s.expectancyR.toFixed(3)}R</b> each time — roughly <b>${s.totalR.toFixed(1)}R</b> banked across the sample. Win rate ${pct(s.winRate)} with a ${s.payoff.toFixed(2)}:1 payoff.` });
    } else {
      out.push({ sev: "high", icon: AlertTriangle, t: `Negative edge: ${s.expectancyR.toFixed(3)}R per trade`,
        d: `This system loses <b>${Math.abs(s.expectancyR).toFixed(3)}R</b> per trade on average. Fix the highest-severity item above first — it's the largest recoverable leak given a ${pct(s.winRate)} win rate and ${s.payoff.toFixed(2)}:1 payoff.` });
    }
  }
  if (s.n < 20) {
    out.push({ sev: "med", icon: AlertTriangle, t: "Small sample — read directionally",
      d: `Only <b>${s.n}</b> trades. These figures show tendencies, not settled statistics. Run more replay sessions before trusting the exact numbers.` });
  }
  return out;
}

function flagOf(t) {
  if (t.win && isFinite(t.mfeR) && t.mfeR >= 1.5 && t.capture != null && t.capture <= 0.4) return { k: "leak", label: "gave it back" };
  if (!t.win && isFinite(t.rMult) && t.rMult <= -1) return { k: "stop", label: "over-stop" };
  if (isFinite(t.mfeR) && t.mfeR < 0.6 && isFinite(t.maeR) && t.maeR < 0.8 && !t.win) return { k: "chop", label: "chop" };
  if (t.win && t.capture != null && t.capture >= 0.7) return { k: "clean", label: "clean" };
  return { k: "chop", label: "—" };
}

/* ---------- coach context ---------- */
function buildCoachContext(stats, trades, cfg) {
  const r2 = (x) => (isFinite(x) ? Math.round(x * 100) / 100 : null);
  const basis = cfg.riskBasis === "column" ? "the mapped risk/stop column"
    : cfg.riskBasis === "fixed" ? `a fixed ${cfg.fixedRisk} risked per trade`
    : "the average losing trade (no risk column present)";
  const t = trades.slice(0, 150).map((tr) => ({
    n: tr.idx, side: tr.dir === 1 ? "long" : "short", sym: tr.symbol || undefined,
    R: r2(tr.rMult), mfeR: r2(tr.mfeR), maeR: r2(tr.maeR),
    capturePct: tr.capture != null ? Math.round(tr.capture * 100) : null,
    durMin: isFinite(tr.dur) ? Math.round(tr.dur) : null, win: tr.win,
  }));
  return {
    rBasis: basis,
    summary: {
      trades: stats.n, winRatePct: Math.round(stats.winRate * 100),
      expectancyR: r2(stats.expectancyR), totalR: r2(stats.totalR),
      profitFactor: stats.profitFactor === Infinity ? "inf" : r2(stats.profitFactor),
      payoff: r2(stats.payoff), avgWinR: r2(stats.avgWinR), avgLossR: r2(stats.avgLossR),
      avgMfeR: r2(stats.avgMfeR), avgMaeR: r2(stats.avgMaeR),
      winnerCapturePct: isFinite(stats.captureAgg) ? Math.round(stats.captureAgg * 100) : null,
      giveBackPct: isFinite(stats.giveBack) ? Math.round(stats.giveBack * 100) : null,
      avgWinnerDurMin: isFinite(stats.winDur) ? Math.round(stats.winDur) : null,
      avgLoserDurMin: isFinite(stats.lossDur) ? Math.round(stats.lossDur) : null,
    },
    trades: t,
  };
}
function coachSystem(ctx) {
  return `You are a sharp, direct trading-performance coach built into a replay-trade analyzer. The trader practices in TradingView's bar-replay and wants to know whether their problems come from ENTRIES or EXITS.

You already have their full session data as JSON below — every figure is computed and correct. Trust it; don't recompute stats from scratch or ask them to paste anything.

The lens you think in:
- MFE (max favorable excursion, in R) = what the ENTRY earned — how far price ran in their favor while the trade was open.
- Capture % = realized R / MFE = the EXIT's job — how much of that favorable move they kept.
- HIGH mfeR + LOW capture = an EXIT problem (good setups, cut short). LOW mfeR = an ENTRY problem (trades never run). Losses beyond ~1R = stop-discipline problem.
- R is the risk unit; basis for R here is ${ctx.rBasis}. Always speak in R multiples.

How to answer:
- Be concise, concrete, and plain. Reference their actual numbers and specific trade numbers, e.g. "trade #12 offered 2.3R but you kept 0.6R."
- When asked what to fix, rank by impact and name the single biggest leak first.
- Short paragraphs. No bullet-point walls, no hype, no emoji, no filler openers.
- Stay on their process and this data. Don't predict markets or give investment advice.

SESSION DATA (JSON):
${JSON.stringify(ctx)}`;
}

/* ---------- sample data ---------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function sampleCSV() {
  const rnd = mulberry32(20240711), R = 100, pv = 10, base = 5000;
  const syms = ["ES", "NQ", "CL"];
  const rows = ["Symbol,Side,Entry,Exit,MFE,MAE,Duration (min),Initial Risk,P&L"];
  for (let i = 0; i < 46; i++) {
    const long = rnd() < 0.62, side = long ? "Long" : "Short";
    const sym = syms[Math.floor(rnd() * syms.length)];
    const win = rnd() < 0.55;
    let realR, mfeR, maeR, dur;
    if (win) { mfeR = 1.2 + rnd() * 2.0; realR = mfeR * (0.30 + rnd() * 0.25); maeR = 0.15 + rnd() * 0.7; dur = 4 + rnd() * 16; }
    else { realR = -(0.6 + rnd() * 0.7); mfeR = 0.1 + rnd() * 0.85; maeR = Math.abs(realR) + 0.05 + rnd() * 0.3; dur = 14 + rnd() * 44; }
    const pnl = realR * R, mfe = mfeR * R, mae = maeR * R;
    const entry = base + (rnd() * 400 - 200), move = pnl / pv;
    const exit = long ? entry + move : entry - move;
    rows.push([sym, side, entry.toFixed(2), exit.toFixed(2), mfe.toFixed(2), mae.toFixed(2), Math.round(dur), R.toFixed(2), pnl.toFixed(2)].join(","));
  }
  return rows.join("\n");
}

/* ---------- small components ---------- */
const FIELD_LABELS = { direction: "Direction", entry: "Entry price", exit: "Exit price", mfe: "MFE / Run-up", mae: "MAE / Drawdown", duration: "Duration", pnl: "P&L", risk: "Risk / Stop", symbol: "Symbol" };

function KPI({ label, value, unit, note, icon: Icon, tone }) {
  return (
    <div className="card">
      <div className="k">{Icon && <Icon />}{label}</div>
      <div className={`v mono ${tone || ""}`}>{value}{unit && <small>{unit}</small>}</div>
      {note && <div className="note">{note}</div>}
    </div>
  );
}

function ScatterTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const t = payload[0].payload;
  return (
    <div className="rc-tt mono">
      <div className="r"><span>#{t.idx}</span><span>{t.dir === 1 ? "Long" : "Short"} {t.symbol}</span></div>
      <div className="r"><span>Offered</span><span>{t.mfeR.toFixed(2)}R</span></div>
      <div className="r"><span>Kept</span><span style={{ color: t.win ? "var(--teal)" : "var(--coral)" }}>{t.rMult.toFixed(2)}R</span></div>
      {t.capture != null && <div className="r"><span>Capture</span><span>{(t.capture * 100).toFixed(0)}%</span></div>}
    </div>
  );
}

/* ============================================================ */
export default function ExcursionAnalyzer() {
  const [rows, setRows] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [map, setMap] = useState({});
  const [fileName, setFileName] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [drag, setDrag] = useState(false);
  const [sortKey, setSortKey] = useState("idx");
  const [sortDir, setSortDir] = useState(1);
  const [cfg, setCfg] = useState({ mfeIsPrice: false, maeIsPrice: false, riskBasis: "column", riskIsStopPrice: false, fixedRisk: 100 });
  const fileRef = useRef(null);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatRef = useRef(null);
  const logRef = useRef(null);

  const ingest = useCallback((text, name) => {
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    const data = parsed.data.filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));
    if (!data.length) return;
    const hdrs = parsed.meta.fields || Object.keys(data[0]);
    const detected = detectColumns(hdrs);
    // auto-guess mfe/mae unit: prices if ~ same magnitude as entry
    const med = (key) => { const xs = data.map((r) => Math.abs(num(r[key]))).filter(isFinite).sort((a, b) => a - b); return xs.length ? xs[Math.floor(xs.length / 2)] : NaN; };
    const entryMed = detected.entry ? med(detected.entry) : NaN;
    const guessPrice = (col) => { if (!col || !isFinite(entryMed) || entryMed === 0) return false; const m = med(col); return isFinite(m) && m > entryMed * 0.4; };
    const nextCfg = { ...cfg, mfeIsPrice: guessPrice(detected.mfe), maeIsPrice: guessPrice(detected.mae), riskBasis: detected.risk ? "column" : "avgloss" };
    setCfg(nextCfg);
    setRows(data); setHeaders(hdrs); setMap(detected); setFileName(name);
    const missing = !detected.pnl && !(detected.entry && detected.exit);
    const missingMfe = !detected.mfe;
    setShowMap(missing || missingMfe);
  }, [cfg]);

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => ingest(String(ev.target.result), f.name);
    reader.readAsText(f);
  };
  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => ingest(String(ev.target.result), f.name);
    reader.readAsText(f);
  };
  const loadSample = () => ingest(sampleCSV(), "sample-replay-session.csv");
  const reset = () => { setRows(null); setHeaders([]); setMap({}); setFileName(""); setChat([]); if (fileRef.current) fileRef.current.value = ""; };

  const trades = useMemo(() => (rows ? buildTrades(rows, map, cfg).map((t, i) => ({ ...t, idx: i + 1 })) : []), [rows, map, cfg]);
  const stats = useMemo(() => computeStats(trades), [trades]);
  const diags = useMemo(() => (stats ? diagnose(stats) : []), [stats]);

  const sorted = useMemo(() => {
    const arr = [...trades];
    arr.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av == null || isNaN(av)) av = -Infinity; if (bv == null || isNaN(bv)) bv = -Infinity;
      return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
    });
    return arr;
  }, [trades, sortKey, sortDir]);
  const setSort = (k) => { if (sortKey === k) setSortDir(-sortDir); else { setSortKey(k); setSortDir(1); } };

  const axisMax = useMemo(() => {
    if (!trades.length) return 3;
    const m = Math.max(...trades.map((t) => Math.max(isFinite(t.mfeR) ? t.mfeR : 0, Math.abs(t.rMult) || 0)));
    return Math.ceil(m * 1.05 * 2) / 2 || 3;
  }, [trades]);

  const distData = useMemo(() => {
    if (!trades.length) return [];
    const buckets = [
      { label: "≤-2R", lo: -Infinity, hi: -2 }, { label: "-2/-1", lo: -2, hi: -1 },
      { label: "-1/0", lo: -1, hi: 0 }, { label: "0/1", lo: 0, hi: 1 },
      { label: "1/2", lo: 1, hi: 2 }, { label: "2/3", lo: 2, hi: 3 }, { label: "≥3R", lo: 3, hi: Infinity },
    ];
    return buckets.map((b) => ({ label: b.label,
      count: trades.filter((t) => t.rMult > b.lo && t.rMult <= b.hi).length,
      win: b.lo >= 0 }));
  }, [trades]);

  const sendMessage = useCallback(async (text) => {
    const q = String(text || "").trim();
    if (!q || chatBusy || !stats) return;
    const next = [...chat, { role: "user", content: q }];
    setChat(next);
    setChatInput("");
    setChatBusy(true);
    try {
      const sys = coachSystem(buildCoachContext(stats, trades, cfg));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: sys,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const out = (data.content || [])
        .filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      setChat([...next, { role: "coach", content: out || "I couldn't read a response there — try asking again." }]);
    } catch (e) {
      setChat([...next, { role: "coach", error: true, content: "Couldn't reach the coach. If this just went live, check that ANTHROPIC_API_KEY is set in the app's environment variables on Hostinger, then redeploy. Otherwise try again in a moment." }]);
    } finally {
      setChatBusy(false);
    }
  }, [chat, chatBusy, stats, trades, cfg]);

  const askTrade = (t) => {
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    sendMessage(`Walk me through trade #${t.idx} (${t.dir === 1 ? "long" : "short"}${t.symbol ? " " + t.symbol : ""}): it offered ${isFinite(t.mfeR) ? t.mfeR.toFixed(2) + "R" : "?"} and I kept ${t.rMult.toFixed(2)}R. What happened and what's the lesson?`);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [chat, chatBusy]);

  const SUGGESTIONS = [
    "Are my exits or entries the problem?",
    "What should I fix first?",
    "Am I cutting winners short?",
    "Which trades did I fumble worst?",
  ];

  /* ---------- empty state ---------- */
  if (!rows) {
    return (
      <div className="exc"><style>{STYLES}</style>
        <div className="wrap">
          <div className="topbar">
            <div className="brand"><div className="mark">MICHELLE <b>ANALYZER</b></div><div className="tag">replay trade analyzer</div></div>
          </div>
          <div className="hero">
            <h1>Is it your <span className="t">entries</span> or your <span className="a">exits</span>?</h1>
            <p>Drop a TradingView replay export and get expectancy in R, win rate, and per-trade breakdown — built around one question most trade journals never answer.</p>
            <div className={`drop ${drag ? "drag" : ""}`}
                 onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                 onDragLeave={() => setDrag(false)} onDrop={onDrop}>
              <div className="ico"><Upload size={22} /></div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Drop your CSV here</div>
              <div className="hint">TradingView "List of Trades" export, or any CSV with entry / exit / MFE / MAE / duration columns</div>
              <div className="row">
                <button className="btn primary" onClick={() => fileRef.current?.click()}><FileText size={15} /> Choose file</button>
                <button className="btn" onClick={loadSample}>Load sample session</button>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }} />
            </div>
            <div className="concept">
              <div><h4 className="a">MFE — max favorable excursion</h4><p>How far price moved in your favor while the trade was open. This is what your <b style={{ color: "var(--text)" }}>entry</b> earned you — the opportunity the setup created.</p></div>
              <div><h4 className="t">Capture — what you kept</h4><p>Realized P&L ÷ MFE. High MFE with low capture means the entry was fine and the <b style={{ color: "var(--text)" }}>exit</b> is the problem. That's the leak this tool hunts.</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- dashboard ---------- */
  const s = stats;
  const fmtR = (x) => (isFinite(x) ? `${x >= 0 ? "+" : ""}${x.toFixed(2)}` : "—");
  const pf = s && (s.profitFactor === Infinity ? "∞" : s.profitFactor.toFixed(2));
  const captureP = s && isFinite(s.captureAgg) ? Math.max(0, Math.min(1, s.captureAgg)) : 0;

  return (
    <div className="exc"><style>{STYLES}</style>
      <div className="wrap">
        <div className="topbar">
          <div className="brand"><div className="mark">MICHELLE <b>ANALYZER</b></div><div className="tag">replay trade analyzer</div></div>
          <div className="filepill"><FileText size={14} /> {fileName} · {trades.length} trades</div>
        </div>

        {/* controls */}
        <div className="controls">
          <span className="ctl-label">R basis</span>
          <div className="seg">
            {["column", "avgloss", "fixed"].map((b) => (
              <button key={b} className={cfg.riskBasis === b ? "on" : ""}
                onClick={() => setCfg({ ...cfg, riskBasis: b })}
                disabled={b === "column" && !map.risk}
                title={b === "column" ? "Use the mapped risk/stop column" : b === "avgloss" ? "R = average losing trade" : "R = a fixed amount you enter"}>
                {b === "column" ? "Risk column" : b === "avgloss" ? "Avg loss" : "Fixed"}
              </button>
            ))}
          </div>
          {cfg.riskBasis === "fixed" && (
            <input className="num" type="number" value={cfg.fixedRisk}
              onChange={(e) => setCfg({ ...cfg, fixedRisk: num(e.target.value) || 1 })} />
          )}
          <div className="spacer" />
          <button className="btn ghost" onClick={() => setShowMap((v) => !v)}><Sliders size={14} /> Columns</button>
          <button className="btn ghost" onClick={loadSample}>Sample</button>
          <button className="btn ghost" onClick={reset}><RotateCcw size={14} /> New file</button>
        </div>

        {/* mapping */}
        {showMap && (
          <div className="section">
            <h3><Sliders size={16} /> Column mapping</h3>
            <p className="desc">We auto-matched your headers. Fix anything that's wrong — the analysis recomputes instantly.</p>
            <div className="mapgrid">
              {Object.keys(FIELD_LABELS).map((f) => (
                <div className="mapf" key={f}>
                  <label>{FIELD_LABELS[f]}</label>
                  <select value={map[f] || ""} onChange={(e) => setMap({ ...map, [f]: e.target.value })}>
                    <option value="">— none —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="maprow">
              <label className="toggle"><input type="checkbox" checked={cfg.mfeIsPrice} onChange={(e) => setCfg({ ...cfg, mfeIsPrice: e.target.checked })} /> MFE is a price level (not an amount)</label>
              <label className="toggle"><input type="checkbox" checked={cfg.maeIsPrice} onChange={(e) => setCfg({ ...cfg, maeIsPrice: e.target.checked })} /> MAE is a price level</label>
              {map.risk && <label className="toggle"><input type="checkbox" checked={cfg.riskIsStopPrice} onChange={(e) => setCfg({ ...cfg, riskIsStopPrice: e.target.checked })} /> Risk column is a stop price</label>}
            </div>
          </div>
        )}

        {s && <>
          {/* verdict */}
          <div className="verdict">
            <div className={`big mono ${s.expectancyR >= 0 ? "pos" : "neg"}`}>{fmtR(s.expectancyR)}<small>R / trade</small></div>
            <div className="vtext">
              <div className="lead">{s.expectancyR >= 0 ? "Positive expectancy" : "Negative expectancy"} · {(s.winRate * 100).toFixed(0)}% win rate · {s.payoff.toFixed(2)}:1 payoff</div>
              <div className="sub">{isFinite(s.avgMfeR) && isFinite(s.captureAgg)
                ? <>Trades offer <span className="amb">{s.avgMfeR.toFixed(2)}R</span> on average and you keep <span className="t">{(s.captureAgg * 100).toFixed(0)}%</span> of it. {s.avgMfeR >= 1.2 && s.captureAgg <= 0.5 ? "The setups work — the exits don't." : s.captureAgg >= 0.65 ? "Exits are tight; look to entries for more edge." : "See the diagnosis below for where the R is going."}</>
                : "Map an MFE column to unlock the entry-vs-exit breakdown."}</div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid">
            <KPI label="Expectancy" value={fmtR(s.expectancyR)} unit="R" tone={s.expectancyR >= 0 ? "pos" : "neg"} note={`${s.totalR >= 0 ? "+" : ""}${s.totalR.toFixed(1)}R over ${s.n} trades`} icon={TrendingUp} />
            <KPI label="Win rate" value={`${(s.winRate * 100).toFixed(0)}`} unit="%" note={`${s.winCount}W · ${s.lossCount}L`} />
            <KPI label="Profit factor" value={pf} note="gross win ÷ gross loss" />
            <KPI label="Payoff" value={`${s.payoff.toFixed(2)}`} unit=":1" note={`avg win ${fmtR(s.avgWinR)}R / loss ${fmtR(s.avgLossR)}R`} />
            <KPI label="Avg MFE" value={`${isFinite(s.avgMfeR) ? s.avgMfeR.toFixed(2) : "—"}`} unit="R" tone="amb" note="how far trades run for you" icon={Target} />
            <KPI label="Avg MAE" value={`${isFinite(s.avgMaeR) ? s.avgMaeR.toFixed(2) : "—"}`} unit="R" tone="neg" note="heat taken against you" />
            <div className="card">
              <div className="k"><Scissors />MFE capture · winners</div>
              <div className="v mono t">{isFinite(s.captureAgg) ? `${(s.captureAgg * 100).toFixed(0)}%` : "—"}</div>
              <div className="ovk">
                <div className="track"><div className="fill" style={{ width: `${captureP * 100}%` }} /></div>
                <div className="lg"><span>kept</span><span>offered (MFE)</span></div>
              </div>
            </div>
            <KPI label="Give-back" value={`${isFinite(s.giveBack) ? (s.giveBack * 100).toFixed(0) : "—"}`} unit="%" note="of peak profit surrendered" icon={Waves} />
          </div>

          {/* coach chat */}
          <div className="section chatsec" ref={chatRef}>
            <h3><MessageSquare size={16} /> Talk to your session</h3>
            <p className="desc">Ask about the numbers, a pattern, or a specific trade — the coach can see this whole session in R. Or click any row in the breakdown below to unpack that trade.</p>
            {chat.length === 0 && !chatBusy ? (
              <div className="chatempty">
                <div className="em-ico"><Sparkles size={19} /></div>
                What do you want to understand about this session?
                <div className="chips">
                  {SUGGESTIONS.map((sug) => (
                    <button key={sug} className="chip-btn" onClick={() => sendMessage(sug)}>{sug}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chatlog" ref={logRef}>
                {chat.map((m, i) => (
                  <div key={i} className={`msg ${m.role === "user" ? "user" : "coach"}`}>
                    <div className="av">{m.role === "user" ? <span style={{ fontSize: 11, fontWeight: 700 }}>YOU</span> : <Sparkles size={14} />}</div>
                    <div className={`bub ${m.error ? "err" : ""}`}>{m.content}</div>
                  </div>
                ))}
                {chatBusy && (
                  <div className="msg coach">
                    <div className="av"><Sparkles size={14} /></div>
                    <div className="bub"><span className="dots"><span /><span /><span /></span></div>
                  </div>
                )}
              </div>
            )}
            <div className="chatin">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(chatInput); }}
                placeholder="Ask about your entries, exits, a trade number…" disabled={chatBusy} />
              <button className="send" onClick={() => sendMessage(chatInput)} disabled={chatBusy || !chatInput.trim()}>
                <Send size={14} /> Ask
              </button>
            </div>
          </div>

          {/* signature scatter */}
          <div className="section">
            <h3><Target size={16} /> Offered vs kept</h3>
            <p className="desc">Every trade plotted by what it offered (MFE, horizontal) against what you kept (realized R, vertical). The amber line is perfect capture — exiting at the high. Distance <b style={{ color: "var(--text)" }}>right</b> = entry quality; distance <b style={{ color: "var(--text)" }}>below the line</b> = exit quality.</p>
            <ResponsiveContainer width="100%" height={340}>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
                <CartesianGrid stroke="var(--line-soft)" />
                <XAxis type="number" dataKey="mfeR" name="MFE" domain={[0, axisMax]}
                  tick={{ fill: "var(--faint)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  stroke="var(--line)" label={{ value: "MFE offered (R)", position: "insideBottom", offset: -12, fill: "var(--muted)", fontSize: 12 }} />
                <YAxis type="number" dataKey="rMult" name="Kept" domain={[-axisMax, axisMax]}
                  tick={{ fill: "var(--faint)", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  stroke="var(--line)" label={{ value: "Realized (R)", angle: -90, position: "insideLeft", offset: 12, fill: "var(--muted)", fontSize: 12 }} />
                <ReferenceLine y={0} stroke="var(--line)" />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: axisMax, y: axisMax }]} stroke="var(--amber)" strokeDasharray="5 4" strokeWidth={1.5} />
                <Tooltip content={<ScatterTip />} cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }} />
                <Scatter data={trades.filter((t) => isFinite(t.mfeR))} fill="var(--teal)">
                  {trades.filter((t) => isFinite(t.mfeR)).map((t, i) => (
                    <Cell key={i} fill={t.win ? "var(--teal)" : "var(--coral)"} fillOpacity={0.82} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="axnote"><span style={{ color: "var(--coral)" }}>● losers</span><span style={{ color: "var(--teal)" }}>● winners</span></div>
          </div>

          {/* diagnosis */}
          <div className="section">
            <h3><AlertTriangle size={16} /> What the data says</h3>
            <p className="desc">Ordered by severity — start at the top.</p>
            <div className="diag">
              {diags.map((d, i) => {
                const Icon = d.icon;
                return (
                  <div key={i} className={`dcard ${d.sev}`}>
                    <div className="di"><Icon size={16} /></div>
                    <div><div className="dt">{d.t}</div><div className="dd" dangerouslySetInnerHTML={{ __html: d.d }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* distribution */}
          <div className="section">
            <h3><ArrowUpDown size={16} /> R-multiple distribution</h3>
            <p className="desc">Where your outcomes land. A healthy edge has a right tail — big winners that pay for many small losers.</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distData} margin={{ top: 6, right: 8, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="var(--line-soft)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--faint)", fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="var(--line)" />
                <YAxis allowDecimals={false} tick={{ fill: "var(--faint)", fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="var(--line)" />
                <Tooltip cursor={{ fill: "var(--panel2)" }} contentStyle={{ background: "#0b0e12", border: "1px solid var(--line)", borderRadius: 9, fontSize: 12 }} labelStyle={{ color: "var(--muted)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map((d, i) => <Cell key={i} fill={d.win ? "var(--teal)" : "var(--coral)"} fillOpacity={0.82} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* table */}
          <div className="section">
            <h3><FileText size={16} /> Per-trade breakdown</h3>
            <p className="desc">Click a header to sort. Flags: <span style={{ color: "var(--amber)" }}>gave it back</span> (big MFE, small capture) · <span style={{ color: "var(--coral)" }}>over-stop</span> (loss beyond 1R) · <span style={{ color: "var(--teal)" }}>clean</span> (kept 70%+).</p>
            <div className="tblwrap" style={{ maxHeight: 460, overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    {[["idx", "#"], ["dir", "Side"], ["entry", "Entry"], ["exit", "Exit"], ["rMult", "R"], ["mfeR", "MFE R"], ["maeR", "MAE R"], ["capture", "Capture"], ["dur", "Dur"], ["flag", "Flag"]].map(([k, lbl]) => (
                      <th key={k} className={sortKey === k ? "act" : ""} onClick={() => setSort(k)}>
                        {lbl}<ArrowUpDown size={11} className="sic" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => {
                    const fl = flagOf(t);
                    return (
                      <tr key={t.idx} className="clk" onClick={() => askTrade(t)} title="Ask the coach about this trade">
                        <td className="mono">{t.idx}</td>
                        <td><span className={`chip ${t.dir === 1 ? "long" : "short"}`}>{t.dir === 1 ? "L" : "S"}</span> {t.symbol}</td>
                        <td className="mono">{isFinite(t.entry) ? t.entry.toFixed(2) : "—"}</td>
                        <td className="mono">{isFinite(t.exit) ? t.exit.toFixed(2) : "—"}</td>
                        <td className="mono" style={{ color: t.rMult >= 0 ? "var(--teal)" : "var(--coral)", fontWeight: 600 }}>{fmtR(t.rMult)}</td>
                        <td className="mono amb">{isFinite(t.mfeR) ? t.mfeR.toFixed(2) : "—"}</td>
                        <td className="mono" style={{ color: "var(--muted)" }}>{isFinite(t.maeR) ? t.maeR.toFixed(2) : "—"}</td>
                        <td className="mono">{t.capture != null ? `${(t.capture * 100).toFixed(0)}%` : "—"}</td>
                        <td className="mono" style={{ color: "var(--muted)" }}>{isFinite(t.dur) ? Math.round(t.dur) : "—"}</td>
                        <td><span className={`flag ${fl.k}`}>{fl.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
