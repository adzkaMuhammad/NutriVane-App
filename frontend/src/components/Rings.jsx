import React from "react";

export function Ring({ value, max, size = 132, stroke = 14, color = "#22C55E", label, unit, warn }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const ringColor = warn ? "#F97316" : color;
  return (
    <div className="flex flex-col items-center" data-testid={`ring-${label}`}>
      <svg width={size} height={size} className="ring-anim">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EAEFE6" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={ringColor} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.34,1.56,.64,1)" }}
        />
        <text x="50%" y="46%" textAnchor="middle" className="fill-[#1A1A1A]" fontSize={size * 0.2} fontWeight="800">
          {Math.round(value)}
        </text>
        <text x="50%" y="62%" textAnchor="middle" fill="#5C5C5C" fontSize={size * 0.11} fontWeight="600">
          / {Math.round(max)}{unit}
        </text>
      </svg>
    </div>
  );
}

export function MacroBar({ label, value, max, color, unit = "g", warn }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = warn ? "#F97316" : color;
  return (
    <div className="bg-white rounded-3xl p-4 border border-green-900/5 shadow-[0_8px_32px_rgba(34,197,94,0.06)]" data-testid={`macro-${label}`}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs uppercase tracking-wider font-semibold text-[#5C5C5C]">{label}</span>
        <span className="text-sm font-bold" style={{ color: warn ? "#F97316" : "#1A1A1A" }}>
          {Math.round(value)}<span className="text-[#9aa39a] font-medium">/{Math.round(max)}{unit}</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[#EAEFE6] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor, transition: "width .8s cubic-bezier(.34,1.56,.64,1)" }} />
      </div>
    </div>
  );
}
